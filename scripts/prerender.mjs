// Writes the homepage's HTML into dist/index.html after `vite build`, so the commercial content
// (services, projects, FAQ, contact) is in the first response for search engines, link previews
// and slow connections. The same React tree hydrates it on the client: one homepage, no copies.
import { readFile, writeFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
let body;
try {
  const { SiteV2 } = await vite.ssrLoadModule("/src/home/SiteV2.tsx");
  body = renderToString(createElement(SiteV2));
} finally {
  await vite.close();
}

const file = process.argv[2] ?? new URL("../dist/index.html", import.meta.url); // optional: another build's index.html
const html = await readFile(file, "utf8");
const empty = '<div id="root"></div>';
if (!html.includes(empty)) throw new Error(`prerender: empty #root not found in ${file}`);
if (!body.includes("<h1")) throw new Error("prerender: rendered page has no <h1>");
await writeFile(file, html.replace(empty, `<div id="root">${body}</div>`));
console.log(`prerender: ${(body.length / 1024).toFixed(1)} kB of HTML written into ${file}`);
