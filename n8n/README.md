# ConsultFlow AI — n8n Workflows

This folder contains all 5 n8n workflow definitions exported as JSON.

## Workflows

| File | ID | Webhook | Description |
|------|----|---------|-------------|
| WF01_discovery_analyst.json | ZmOdB9SVls4boJtm | POST /webhook/consultflow-start | Discovery + Gate 1 |
| WF02_research_analyst.json | AjVC8FVd9RAmRyN0 | POST /webhook/research | Research + Gate 2 |
| WF03_storyline_agent.json | PQdUWJGUA9P7puSx | POST /webhook/storyline | Storyline + Gate 3 |
| WF04_qa_reviewer.json | 5cEIzgcFAXtdyG0e | POST /webhook/qa-review | QA + Gate 4 |
| WF05_google_slide.json | ig23NcKuSbS99jHW | POST /webhook/delivery | Slide Generation + Gate 5 |

## Local Setup (n8n)

### Prerequisites
- Node.js v18+ (you have v22.22.0)
- npm 10+ (you have 10.9.4)

### Run n8n locally
```bash
npx n8n
```

n8n will start at http://localhost:5678

### Import workflows
1. Open http://localhost:5678
2. Go to Workflows → Import from File
3. Import each JSON file in order (WF01 → WF05)
4. Add your credentials (Supabase, Google, Slack, Gemini, Pinecone)
5. Update webhook URLs from rochak01.app.n8n.cloud → localhost:5678

## Supabase
- Project: dajgvomfgiurpymfqzgd.supabase.co
- Anon key: in .env file (do not commit real .env to public repos)

## Pipeline Flow
```
Frontend Form
    → POST /webhook/consultflow-start (WF01)
    → Gate 1 Slack approval
    → POST /webhook/research (WF02)
    → Gate 2 Slack approval
    → POST /webhook/storyline (WF03)
    → Gate 3 Slack approval
    → POST /webhook/qa-review (WF04)
    → Gate 4 Slack approval
    → POST /webhook/delivery (WF05)
    → Gate 5 Slack approval
    → Google Slides deck delivered
```
