// Vercel serverless: api/index.ts cobre só /api exato — este catch-all
// cobre /api/* (todas as rotas do Express). Importa o backend compilado
// (backend/dist): TS cru fora de api/ não entra no bundle da function.
export { app as default } from "../../backend/dist/src/server.js";
