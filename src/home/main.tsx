import { createRoot, hydrateRoot } from "react-dom/client";
import { SiteV2 } from "./SiteV2";

// Optional build label shown by the `?perf=1` panel (set VITE_PP_BUILD when building a preview).
if (import.meta.env["VITE_PP_BUILD"])
  document.documentElement.dataset["build"] = import.meta.env["VITE_PP_BUILD"];

// Same mount as the approved app (no StrictMode wrapper). The production HTML already contains the
// page (prerendered at build time, see scripts/prerender.mjs), so React hydrates it in place.
const container = document.getElementById("root")!;
if (container.hasChildNodes()) hydrateRoot(container, <SiteV2 />);
else createRoot(container).render(<SiteV2 />);
