import { createRoot } from "react-dom/client";
import { SiteV2 } from "./SiteV2";

// Same mount as the approved app (no StrictMode wrapper).
createRoot(document.getElementById("root")!).render(<SiteV2 />);
