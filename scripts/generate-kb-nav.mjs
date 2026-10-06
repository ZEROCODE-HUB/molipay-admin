import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const genPath = resolve(root, "src/routeTree.gen.ts");
const outPath = resolve(root, "src/data/kb-navigation.ts");

if (!existsSync(genPath)) {
  console.error("[gen:kb] routeTree.gen.ts no encontrado");
  process.exit(0);
}

const gen = readFileSync(genPath, "utf8");
const pathRe = /'\/admin[^']*'/g;
const paths = new Set();
let m;
while ((m = pathRe.exec(gen))) {
  const p = m[0].slice(1, -1);
  if (p && p.startsWith("/admin")) paths.add(p);
}
const routes = [...paths].map((p) => p.replace(/\/+$/, "")).filter(Boolean);
const uniqueRoutes = [...new Set(routes)].sort();

function titleFor(path) {
  if (!path) return "Desconocido";
  const seg = path.split("/").filter(Boolean);
  const file = resolve(root, "src/routes", seg.join(".") + ".tsx");
  if (existsSync(file)) {
    const content = readFileSync(file, "utf8");
    const tm = content.match(/title:\s*["']([^"']+)["']/);
    if (tm) return tm[1];
  }
  const last = seg[seg.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1);
}

const entries = uniqueRoutes.map((p) => ({ path: p, title: titleFor(p) }));

const groups = {};
for (const e of entries) {
  const seg = e.path.split("/").filter(Boolean);
  const section = seg.length >= 2 ? seg[1] : "root";
  (groups[section] ??= []).push(e);
}

const sectionLabels = {
  general: "General",
  comercios: "Comercios",
  administracion: "Administración",
  configuracion: "Configuración",
  modulos: "Sistema",
  notificaciones: "Sistema",
  incidentes: "Comunicación",
};

let nav =
  "Estructura actual del panel administrativo (se genera automáticamente en cada cambio):\n\n";
for (const [section, items] of Object.entries(groups)) {
  const label = sectionLabels[section] ?? section.charAt(0).toUpperCase() + section.slice(1);
  nav += `• ${label}:\n`;
  for (const it of items) {
    nav += `   - ${it.title}  (${it.path})\n`;
  }
  nav += "\n";
}

const escaped = nav.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const out = `/* eslint-disable */
// Archivo generado automáticamente por scripts/generate-kb-nav.mjs (disparado por el hook git post-commit).
// No editar manualmente: se regenera en cada commit a partir de src/routeTree.gen.ts.

export const KB_NAVIGATION = \`${escaped}\`;

export const KB_ROUTES: { path: string; title: string }[] = ${JSON.stringify(entries, null, 2)};
`;

writeFileSync(outPath, out, "utf8");
console.log(`[gen:kb] kb-navigation.ts generado: ${entries.length} rutas de /admin.`);
