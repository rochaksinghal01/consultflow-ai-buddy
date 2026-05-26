// Central webhook config — update N8N_BASE_URL when switching hosts
// Options:
//   n8n Cloud:   https://rochak01.app.n8n.cloud
//   Railway:     https://<your-app>.railway.app
//   Local dev:   http://localhost:5678

const N8N_BASE_URL =
  import.meta.env.VITE_N8N_BASE_URL ?? "https://rochak01.app.n8n.cloud";

export const WEBHOOKS = {
  discovery:  `${N8N_BASE_URL}/webhook/consultflow-start`,
  research:   `${N8N_BASE_URL}/webhook/research`,
  storyline:  `${N8N_BASE_URL}/webhook/storyline`,
  qa:         `${N8N_BASE_URL}/webhook/qa-review`,
  delivery:   `${N8N_BASE_URL}/webhook/delivery`,
} as const;
