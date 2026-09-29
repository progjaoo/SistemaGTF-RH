// Vercel serverless: api/index.ts cobre só /api exato — este catch-all
// cobre /api/* (todas as rotas do Express). Mesmo app do Docker.
export { app as default } from "../../backend/src/server.js";
