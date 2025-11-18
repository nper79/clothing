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

### Auth + Credits

- Supabase Auth powers the login & registration flow. Populate `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
- Credits are stored in Supabase via the new `user_credits` and `credit_transactions` tables defined at the bottom of `supabase-schema.sql`. Apply those migrations and enable row level security.
- Configure credit behavior with:
  - `DEFAULT_STARTING_CREDITS` – free credits granted on first login (default `10`)
  - `PERSONAL_LOOK_CREDIT_COST` – credits consumed per personal look request (default `2`)
  - `REMIX_LOOK_CREDIT_COST` – credits consumed per explore remix (default `1`)
- Users can top up through the Credits page (`/credits`). Each generation/remix automatically debits their balance on the server.
