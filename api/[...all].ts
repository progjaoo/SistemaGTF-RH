// Vercel serverless: api/index.ts cobre só /api exato — este catch-all
// cobre /api/* (todas as rotas do Express). Importa o backend compilado
// copiado para ./_srv (scripts/prepare-vercel-api.mjs). Forma `import`
// (não re-export): o file-tracing só segue imports com binding local.
import { app } from "./_srv/src/server.js";

export default app;
