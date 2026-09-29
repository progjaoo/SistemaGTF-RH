// Vercel serverless: api/index.ts cobre só /api exato — este catch-all
// cobre /api/* (todas as rotas do Express). Importa o backend compilado
// copiado para ./_srv (scripts/prepare-vercel-api.mjs).
export { app as default } from "./_srv/src/server.js";
