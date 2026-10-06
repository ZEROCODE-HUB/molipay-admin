import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const genPath = resolve(root, "src/routeTree.gen.ts");
const outDir = resolve(root, "docs");
const outPath = resolve(outDir, "comportamiento-plataforma.md");

if (!existsSync(genPath)) {
  console.error("[gen:docs] routeTree.gen.ts no encontrado");
  process.exit(1);
}

const gen = readFileSync(genPath, "utf8");
const pathRe = /'\/admin[^']*'/g;
const rawPaths = new Set();
let m;
while ((m = pathRe.exec(gen))) {
  rawPaths.add(m[0].slice(1, -1));
}
const routes = [...new Set([...rawPaths].map((p) => p.replace(/\/+$/, "")))].filter(Boolean).sort();

function fileForPath(path) {
  const seg = path.split("/").filter(Boolean);
  return resolve(root, "src/routes", seg.join(".") + ".tsx");
}

function titleFor(path) {
  const file = fileForPath(path);
  if (existsSync(file)) {
    const c = readFileSync(file, "utf8");
    const tm = c.match(/title:\s*["']([^"']+)["']/);
    if (tm) return tm[1];
  }
  const seg = path.split("/").filter(Boolean);
  const last = seg[seg.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\{([^}]*)\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function analyze(path) {
  const file = fileForPath(path);
  if (!existsSync(file)) return null;
  const c = readFileSync(file, "utf8");

  const metaTitle = (c.match(/title:\s*["']([^"']+)["']/) || [])[1] || "";

  const phTitle = (c.match(/PageHeader[\s\S]{0,800}?title:\s*"([^"]*)"/) || [])[1] || "";
  const phDesc = (c.match(/PageHeader[\s\S]{0,1000}?description:\s*"([^"]*)"/) || [])[1] || "";

  const columns = new Map();
  const colRe = /key:\s*"([^"]+)"[\s\S]{0,200}?label:\s*"([^"]+)"/g;
  let cm;
  while ((cm = colRe.exec(c))) columns.set(cm[1], cm[2]);

  const enumFilters = new Set();
  const fRe = /filterable:\s*"enum"[\s\S]{0,200}?filterOptions:\s*\[([^\]]*)\]/g;
  let fm;
  while ((fm = fRe.exec(c))) {
    const opts = fm[1].match(/"([^"]+)"/g) || [];
    opts.forEach((o) => enumFilters.add(o.replace(/"/g, "")));
  }

  const buttonTexts = new Set();
  const btnRe = /<(BtnPrimary|BtnOutline|button)[^>]*>([\s\S]*?)<\/\1>/g;
  let bm;
  while ((bm = btnRe.exec(c))) {
    const t = stripTags(bm[2]);
    if (
      t &&
      t.length >= 2 &&
      t.length <= 60 &&
      !/[{}]|=>|className|onClick|set[A-Z]/.test(t) &&
      !/^(Download|Plus|Search|Edit3|XCircle|CheckCircle|FileText|Trash2|Eye|Banknote|X)$/.test(t)
    ) {
      buttonTexts.add(t);
    }
  }

  const labelTexts = new Set();
  const labRe = /<Label[^>]*>([\s\S]*?)<\/Label>/g;
  let lm;
  while ((lm = labRe.exec(c))) {
    const t = stripTags(lm[1]);
    if (t && t.length <= 50) labelTexts.add(t);
  }

  const caps = [];
  if (/<DataTable|<DataTable\s/.test(c) || c.includes("DataTable"))
    caps.push("Tabla de datos (DataTable)");
  if (/filterable:/.test(c)) caps.push("Filtros de columna");
  if (/FormDialog/.test(c)) caps.push("Modales de alta/edición (FormDialog)");
  if (/ConfirmDialog/.test(c)) caps.push("Confirmación (ConfirmDialog)");
  if (/FileDropzone/.test(c)) caps.push("Carga de archivos (FileDropzone)");
  if (/downloadFile|downloadExcel|downloadCSV/.test(c))
    caps.push("Descargas (CSV / Excel / TXT / ZIP)");
  if (/ActionsDropdown/.test(c)) caps.push("Acciones por fila (ActionsDropdown)");
  if (/useState/.test(c)) caps.push("Estado interactivo (useState)");

  return {
    metaTitle,
    phTitle,
    phDesc,
    columns: [...columns.values()],
    enumFilters: [...enumFilters],
    buttons: [...buttonTexts],
    labels: [...labelTexts],
    caps,
  };
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

const groups = {};
for (const p of routes) {
  const seg = p.split("/").filter(Boolean);
  const section = seg.length >= 2 ? seg[1] : "root";
  (groups[section] ??= []).push(p);
}

let md = "";
md += "# Comportamiento de la plataforma Moli (Panel Admin)\n\n";
md += `_Documento generado automáticamente por \`scripts/gen-docs.mjs\` a partir del código fuente (${new Date().toISOString().slice(0, 10)})._\n\n`;
md +=
  "> Fuente de verdad: el código de este repositorio. Refleja el comportamiento implementado, no una captura en vivo del navegador.\n\n";

md += "## Mapa de secciones\n\n";
for (const [section, items] of Object.entries(groups)) {
  const label = sectionLabels[section] ?? section.charAt(0).toUpperCase() + section.slice(1);
  md += `### ${label}\n`;
  for (const it of items) {
    const t = titleFor(it);
    md += `- **${t}** — \`${it}\`\n`;
  }
  md += "\n";
}

md += "## Detalle por ruta\n\n";
for (const p of routes) {
  const info = analyze(p);
  const title = titleFor(p);
  md += `### ${title}\n`;
  md += `- **Ruta:** \`${p}\`\n`;
  if (info) {
    if (info.phDesc) md += `- **Descripción:** ${info.phDesc}\n`;
    if (info.caps.length) {
      md += "- **Capacidades detectadas:**\n";
      info.caps.forEach((c) => (md += `  - ${c}\n`));
    }
    if (info.columns.length) {
      md += `- **Columnas / campos detectados:** ${info.columns.join(", ")}\n`;
    }
    if (info.enumFilters.length) {
      md += `- **Filtros por lista (enum):** ${info.enumFilters.join(", ")}\n`;
    }
    if (info.buttons.length) {
      md += `- **Acciones / botones detectados:** ${info.buttons.slice(0, 25).join(", ")}\n`;
    }
  } else {
    md += "- _No se encontró el archivo de ruta para analizar._\n";
  }
  md += "\n";
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, md, "utf8");
console.log(`[gen:docs] ${outPath} generado (${routes.length} rutas).`);
