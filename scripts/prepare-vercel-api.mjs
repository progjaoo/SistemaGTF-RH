// Vercel: copia o backend compilado para dentro de api/_srv para que o
// file-tracing da function encontre JS real ao lado do handler
// (imports cruzados api/ -> backend/dist não são empacotados).
import { cpSync, rmSync } from "node:fs";

rmSync(new URL("../api/_srv", import.meta.url), { recursive: true, force: true });
cpSync(new URL("../backend/dist", import.meta.url), new URL("../api/_srv", import.meta.url), { recursive: true });
console.log("api/_srv pronto.");
