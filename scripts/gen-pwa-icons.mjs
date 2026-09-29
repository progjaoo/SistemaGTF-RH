// Gera os ícones do PWA a partir do logo GTF.
// Uso (da raiz do repo): node scripts/gen-pwa-icons.mjs
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(root, "..", "frontend");
mkdirSync(path.join(frontendDir, "public"), { recursive: true });
const require = createRequire(path.join(frontendDir, "package.json"));
const sharp = require("sharp").default ?? require("sharp");

const logo = path.join(frontendDir, "src/images/logogtf.png");

async function icon(out, size, maskable = false) {
  const padding = maskable ? Math.round(size * 0.12) : 0;
  const inner = size - padding * 2;
  const resized = await sharp(logo).resize(inner, inner, { fit: "contain", background: "#1E8C86" }).toBuffer();
  const dest = path.join(frontendDir, "public", out);
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#1E8C86" }
  })
    .composite([{ input: resized, left: padding, top: padding }])
    .png()
    .toFile(dest);
  const meta = await sharp(dest).metadata();
  if (meta.width !== size || meta.height !== size) {
    throw new Error(`${out}: dimensão inesperada ${meta.width}x${meta.height}`);
  }
  console.log(`OK public/${out} ${size}x${size}`);
}

await icon("pwa-192.png", 192);
await icon("pwa-512.png", 512);
await icon("maskable-512.png", 512, true);
