<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key. Optional: switch try-on provider to PiAPI by setting `TRYON_PROVIDER=piapi`, `PIAPI_API_KEY=your_key`, and optionally `PIAPI_BASE_URL=https://api.piapi.ai`, `PIAPI_UPLOAD_URL=https://upload.theapi.app`.
   - Vercel deploy: the app now calls `/api/generate-try-on` and `/api/generate-clothes`.
3. Run the app:
   `npm run dev`
