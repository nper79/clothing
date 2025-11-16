<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1tX9pyJEodWZKfsHjZj_qZ75Vkt8xp9RB

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the API keys in your `.env`/`.env.local` file:
   - `GEMINI_API_KEY` for the Gemini features
   - `REPLICATE_API_TOKEN` (used by the GPT-5 -> Reve pipeline)
   - `SCRAPINGDOG_API_KEY` for Google Lens / Shopping lookups
   - Optionally `VITE_PERSONAL_STYLING_API_URL` if your backend runs on a custom host
   - Optionally `VITE_PERSONAL_LOOK_LIMIT` to control how many looks are generated per upload
3. Start developing with a single command:
   `npm run dev`
   The Vite dev server now mounts the `/api/personalized-looks` endpoint, so uploads work without launching a second process.
4. (Optional) If you need the standalone Express backend (for production-style testing or deployment), run:
   `npm run server`
