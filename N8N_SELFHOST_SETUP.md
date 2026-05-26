# Self-Hosting n8n on Railway

All 6 workflow JSONs are in `/n8n-workflows/`. This guide gets you back up in ~15 minutes.

---

## Step 1 — Deploy to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select `rochaksinghal01/consultflow-ai-buddy`
3. Railway will detect `docker-compose.yml` automatically
4. Add these environment variables in Railway → Variables:

| Variable | Value |
|---|---|
| `N8N_PUBLIC_URL` | `https://<your-app>.railway.app` (Railway gives you this after deploy) |
| `N8N_USER` | `admin` (or your choice) |
| `N8N_PASSWORD` | something strong |

5. Deploy. n8n will be live at `https://<your-app>.railway.app`

---

## Step 2 — Import All 6 Workflows

1. Open your Railway n8n URL and log in
2. For each file in `/n8n-workflows/`, go to **Workflows → Import from File**:
   - `wf00-rag.json` → RAG Documents
   - `wf01-discovery.json` → Discovery Analyst
   - `wf02-research.json` → Research Analyst
   - `wf03-storyline.json` → Storyline Agent
   - `wf04-qa.json` → QA Reviewer
   - `wf05-google-slide.json` → Google Slide

3. After importing each one, **Activate** it (toggle top-right)

---

## Step 3 — Re-add Credentials

Go to **Credentials → New** and add:

| Credential | Used by |
|---|---|
| **Supabase** (URL + service role key) | WF01–WF05 |
| **Google Gemini** (API key) | WF01–WF05 |
| **Google Slides OAuth2** | WF05 |
| **Slack** (Bot token) | WF02, WF04 |
| **Pinecone** (API key) | WF00 (RAG) |

After adding each credential, open every workflow and reassign it to the nodes that need it (n8n will show a red warning on any node with a missing credential).

---

## Step 4 — Update Frontend Webhook URLs

The webhook base URL changes from `rochak01.app.n8n.cloud` to your Railway URL.

In your frontend repo, find where webhooks are called and update:

```
OLD: https://rochak01.app.n8n.cloud/webhook/consultflow-start
NEW: https://<your-app>.railway.app/webhook/consultflow-start
```

Webhook paths (unchanged):
- WF01: `/webhook/consultflow-start`
- WF02: `/webhook/research`
- WF03: `/webhook/storyline`
- WF04: `/webhook/qa-review`
- WF05: `/webhook/delivery`

---

## Railway Free Tier Notes

- 500 hours/month free (enough for demo + testing)
- Sleeps after inactivity — first webhook call may take ~10s to wake
- Upgrade to $5/month Hobby plan to keep it always-on for LinkedIn launch
