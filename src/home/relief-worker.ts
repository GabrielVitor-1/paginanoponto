// Builds the relief pixels off the main thread (≈ 0.2–1 s of CPU on phones).
import { buildReliefData } from "./relief-data";

const data = buildReliefData();
(self as unknown as Worker).postMessage(data, [data.packed.buffer, data.albedo.buffer]);
