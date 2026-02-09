import { GoogleGenAI } from "@google/genai";
import { MODEL_NAME } from "../../constants";
import { setGlobalDispatcher, ProxyAgent } from 'undici';

// 在文件顶部执行，确保开发环境能连上 Google
if (process.env.NODE_ENV !== 'production') {
    const proxyUrl = process.env.HTTPS_PROXY || 'http://127.0.0.1:10808';
    try {
        // 只有当没有设置 dispatcher 时才设置，避免重复日志 (虽然重复设置也没大碍)
        setGlobalDispatcher(new ProxyAgent(proxyUrl));
    } catch (e) {
        // 忽略错误
    }
}



const stripBase64Header = (base64Str: string): string => {
  if (!base64Str.startsWith('data:')) return base64Str;
  return base64Str.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
};

const getMimeTypeFromBase64 = (base64Str: string): string => {
  const match = base64Str.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
  if (match && match[1]) {
    return `image/${match[1]}`;
  }
  return 'image/png'; // Default
};

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { personBase64, clothesBase64 } = await req.json();

    if (!personBase64 || !clothesBase64) {
      return new Response(JSON.stringify({ error: "Missing images" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: API Key missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const MAX_IMAGE_BYTES = 3_000_000; // ~3MB per image (base64 decoded)
    const MAX_TOTAL_BYTES = 5_500_000; // ~5.5MB combined
    const estimateBytes = (base64: string) => {
      const raw = stripBase64Header(base64);
      return Math.floor(raw.length * 0.75);
    };

    const personBytes = estimateBytes(personBase64);
    const clothesBytes = estimateBytes(clothesBase64);
    if (personBytes > MAX_IMAGE_BYTES || clothesBytes > MAX_IMAGE_BYTES || (personBytes + clothesBytes) > MAX_TOTAL_BYTES) {
      return new Response(JSON.stringify({ error: "图片过大，请压缩后再试" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const personPart = {
      inlineData: {
        data: stripBase64Header(personBase64),
        mimeType: getMimeTypeFromBase64(personBase64),
      },
    };

    const clothesPart = {
      inlineData: {
        data: stripBase64Header(clothesBase64),
        mimeType: getMimeTypeFromBase64(clothesBase64),
      },
    };

    const textPart = {
      text: "Generate a realistic, high-quality full-body photo of the person in the first image wearing the clothing shown in the second image. Maintain the person's identity, facial features, pose, and body shape exactly. Replace their original outfit with the new clothing naturally. The background should be simple and clean."
    };

    const GENERATE_TIMEOUT_MS = 70000; // speed-first
    const MAX_RETRIES = 2;

    const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error("GENERATION_TIMEOUT")), timeoutMs)
        ),
      ]);
    };

    const shouldRetry = (error: any) => {
      const status = error?.status;
      if (status === 429) return true;
      if (typeof status === "number" && status >= 500) return true;
      const msg = (error?.message || "").toLowerCase();
      return msg.includes("timeout") || msg.includes("econn") || msg.includes("enotfound") || msg.includes("etimedout");
    };

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    let response: any = null;
    let lastError: any = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
              parts: [personPart, clothesPart, textPart],
            },
          }),
          GENERATE_TIMEOUT_MS
        );
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        if (attempt >= MAX_RETRIES || !shouldRetry(err)) break;
        const backoff = 700 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        await sleep(backoff);
      }
    }

    if (lastError) {
      const msg = (lastError?.message || "").includes("GENERATION_TIMEOUT")
        ? "生成超时，请重试"
        : "生成失败，请重试";
      return new Response(JSON.stringify({ error: msg }), {
        status: (lastError?.message || "").includes("GENERATION_TIMEOUT") ? 504 : 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64Image = `data:image/png;base64,${part.inlineData.data}`;
          return new Response(JSON.stringify({ output: base64Image }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    throw new Error("No image generated.");

  } catch (error: any) {
    console.error("Gemini Try-On Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
