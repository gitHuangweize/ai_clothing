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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server configuration error: API Key missing" });
    }

    const ai = new GoogleGenAI({ apiKey });

    const enhancedPrompt = `A high-quality, flat-lay or mannequin style product photography of a piece of clothing: ${prompt}. White background, studio lighting, clear details.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: enhancedPrompt }],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64Image = `data:image/png;base64,${part.inlineData.data}`;
          return res.status(200).json({ output: base64Image });
        }
      }
    }

    throw new Error("No clothes image generated.");
  } catch (error: any) {
    console.error("Gemini Clothes Gen Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
