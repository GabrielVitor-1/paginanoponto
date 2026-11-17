export const STATES = [
  { key: "tinta", name: "Tinta", sub: "Sólido fosco" },
  { key: "vidro", name: "Vidro", sub: "Refração iridescente" },
  { key: "mercurio", name: "Mercúrio", sub: "Metal líquido" },
  { key: "plasma", name: "Plasma", sub: "Fogo energético" },
  { key: "modulo", name: "Módulo", sub: "Estrutura modular" },
] as const;

/** Weight (0..1) of state i at progress p in [0,1]. Neighbouring weights sum to 1. */
export function stateWeight(p: number, i: number) {
  const x = p * (STATES.length - 1);
  const w = Math.max(0, 1 - Math.abs(x - i));
  return w * w * (3 - 2 * w); // smoothstep for softer hand-off
}
