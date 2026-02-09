import { GoogleGenAI } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { setGlobalDispatcher, ProxyAgent } from 'undici';

// Dev proxy for local testing in CN
if (process.env.NODE_ENV !== 'production') {
  const proxyUrl = process.env.HTTPS_PROXY || 'http://127.0.0.1:10808';
  try {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  } catch {
    // ignore
  }
}

const stripBase64Header = (base64Str: string): string => {
  if (!base64Str.startsWith('data:')) return base64Str;
  return base64Str.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
};

const getMimeTypeFromBase64 = (base64Str: string): string => {
  const match = base64Str.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
  if (match && match[1]) return `image/${match[1]}`;
  return 'image/png';
};

const getExtensionFromMimeType = (mimeType: string): string => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/jpg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/png') return 'png';
  return 'png';
};

const ensureDataUrl = (base64Str: string): string => {
  if (base64Str.startsWith('data:')) return base64Str;
  const mimeType = getMimeTypeFromBase64(base64Str);
  return `data:${mimeType};base64,${base64Str}`;
};

const fetchImageAsDataUrl = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const contentType = res.headers.get('content-type') || 'image/png';
  const buffer = Buffer.from(await res.arrayBuffer());
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
};

const findFirstImageUrl = (input: any): string | null => {
  const isImageUrl = (value: string) => {
    if (value.startsWith('data:image/')) return true;
    if (!/^https?:\/\//i.test(value)) return false;
    if (/\.mp4($|\?)/i.test(value)) return false;
    return /(\.png|\.jpe?g|\.webp|\.gif|\.bmp|\.tiff)($|\?)/i.test(value);
  };

  const queue: any[] = [input];
  const seen = new Set<any>();
  while (queue.length) {
    const current = queue.shift();
    if (current == null) continue;
    if (typeof current === 'string' && isImageUrl(current)) return current;
    if (typeof current !== 'object') continue;
    if (seen.has(current)) continue;
    seen.add(current);
    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
    } else {
      for (const key of Object.keys(current)) queue.push(current[key]);
    }
  }
  return null;
};

const generateWithGemini = async (personBase64: string, clothesBase64: string) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return { status: 500, body: { error: "Server configuration error: API Key missing" } };
  }

  const ai = new GoogleGenAI({ apiKey });

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

  const GENERATE_TIMEOUT_MS = 70000;
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
    return { status: (lastError?.message || "").includes("GENERATION_TIMEOUT") ? 504 : 502, body: { error: msg } };
  }

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        const base64Image = `data:image/png;base64,${part.inlineData.data}`;
        return { status: 200, body: { output: base64Image } };
      }
    }
  }

  return { status: 502, body: { error: "No image generated." } };
};

const generateWithPiAPI = async (personBase64: string, clothesBase64: string) => {
  const apiKey = process.env.PIAPI_API_KEY;
  if (!apiKey) {
    return { status: 500, body: { error: "Server configuration error: PIAPI_API_KEY missing" } };
  }

  const baseUrl = process.env.PIAPI_BASE_URL || "https://api.piapi.ai";
  const uploadUrl = process.env.PIAPI_UPLOAD_URL || "https://upload.theapi.app";

  const uploadImage = async (dataUrl: string, prefix: string) => {
    const mimeType = getMimeTypeFromBase64(dataUrl);
    const ext = getExtensionFromMimeType(mimeType);
    const payload = {
      file_name: `${prefix}.${ext}`,
      file_data: dataUrl,
    };

    const res = await fetch(`${uploadUrl}/api/ephemeral_resource`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PiAPI upload failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    const url = data?.data?.url || data?.data?.resource || data?.url;
    if (!url) throw new Error("PiAPI upload did not return a URL");
    return url as string;
  };

  const personUrl = await uploadImage(ensureDataUrl(personBase64), "person");
  const clothesUrl = await uploadImage(ensureDataUrl(clothesBase64), "clothes");

  const createRes = await fetch(`${baseUrl}/api/v1/task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "kling",
      task_type: "ai_try_on",
      input: {
        model_input: personUrl,
        dress_input: clothesUrl,
        batch_size: 1,
      },
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => "");
    throw new Error(`PiAPI task create failed: ${createRes.status} ${text}`);
  }

  const createData = await createRes.json();
  const taskId = createData?.data?.task_id || createData?.data?.taskId || createData?.task_id;
  if (!taskId) throw new Error("PiAPI did not return task_id");

  const POLL_INTERVAL_MS = 2500;
  const POLL_TIMEOUT_MS = 90000;
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const statusRes = await fetch(`${baseUrl}/api/v1/task/${taskId}`, {
      headers: {
        "x-api-key": apiKey,
      },
    });
    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();
    const status = statusData?.data?.status || statusData?.status;
    if (status === "completed" || status === "succeeded") {
      const output = statusData?.data?.output ?? statusData?.output ?? statusData;
      const imageUrl = findFirstImageUrl(output);
      if (!imageUrl) throw new Error("PiAPI task completed but no image URL found");
      const base64Image = imageUrl.startsWith("data:image/")
        ? imageUrl
        : await fetchImageAsDataUrl(imageUrl);
      return { status: 200, body: { output: base64Image } };
    }
    if (status === "failed" || status === "error") {
      const errorMsg = statusData?.data?.error?.message || statusData?.error?.message || "生成失败，请重试";
      return { status: 502, body: { error: errorMsg } };
    }
  }

  return { status: 504, body: { error: "生成超时，请重试" } };
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { personBase64, clothesBase64 } = req.body || {};

    if (!personBase64 || !clothesBase64) {
      return res.status(400).json({ error: "Missing images" });
    }

    const MAX_IMAGE_BYTES = 3_000_000;
    const MAX_TOTAL_BYTES = 5_500_000;
    const estimateBytes = (base64: string) => {
      const raw = stripBase64Header(base64);
      return Math.floor(raw.length * 0.75);
    };

    const personBytes = estimateBytes(personBase64);
    const clothesBytes = estimateBytes(clothesBase64);
    if (personBytes > MAX_IMAGE_BYTES || clothesBytes > MAX_IMAGE_BYTES || (personBytes + clothesBytes) > MAX_TOTAL_BYTES) {
      return res.status(413).json({ error: "图片过大，请压缩后再试" });
    }

    const provider = (process.env.TRYON_PROVIDER || "gemini").toLowerCase();
    const result = provider === "piapi"
      ? await generateWithPiAPI(personBase64, clothesBase64)
      : await generateWithGemini(personBase64, clothesBase64);

    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error("Try-On Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
