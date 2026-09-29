// Vercel serverless: importa o backend compilado COPIADO para ./_srv
// (scripts/prepare-vercel-api.mjs) — o handler e o código ficam juntos.
import { app } from "./_srv/src/server.js";

export default app;
