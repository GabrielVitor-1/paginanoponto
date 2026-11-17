import { createRoot } from "react-dom/client";
import { SiteV2 } from "./SiteV2";

// Optional build label shown by the `?perf=1` panel (set VITE_PP_BUILD when building a preview).
if (import.meta.env["VITE_PP_BUILD"])
  document.documentElement.dataset["build"] = import.meta.env["VITE_PP_BUILD"];

// Same mount as the approved app (no StrictMode wrapper).
createRoot(document.getElementById("root")!).render(<SiteV2 />);
