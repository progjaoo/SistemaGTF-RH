// Vercel serverless: importa o backend compilado COPIADO para ./_srv
// (scripts/prepare-vercel-api.mjs) — o handler e o código ficam juntos.
import { app } from "./_srv/src/server.js";

// O rewrite em vercel.json concentra /api/* nesta Function. Reconstitui o
// pathname original antes de entregar a requisição ao Express.
export default function handler(req: Parameters<typeof app>[0], res: Parameters<typeof app>[1]) {
  const query = req.query as Record<string, unknown>;
  const path = typeof query.path === "string" ? query.path.replace(/^\/+/, "") : "";

  if (path) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === "path") continue;
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, String(item)));
      } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        params.set(key, String(value));
      }
    }

    const suffix = params.toString();
    req.url = `/api/${path}${suffix ? `?${suffix}` : ""}`;
  }

  return app(req, res);
}
