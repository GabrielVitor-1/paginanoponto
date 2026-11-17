// Approved journey waypoints (unchanged from the prototype): [section, position in section, x, y, scale, material].
type Waypoint = [string, number, number, number, number, number];
export const WP: Waypoint[] = [
  ["hero", 0, 0.72, 0.5, 1, 0],
  ["hero", 0.8, 0.77, 0.7, 1.05, 0],
  ["svc", 0.2, 0.27, 0.42, 1.25, 1],
  ["svc", 0.75, 0.2, 0.8, 0.8, 1],
  ["proj", 0.02, 0.66, 0.28, 0.7, 2],
  ["proj", 0.35, 0.2, 0.55, 0.6, 2],
  ["proj", 0.68, 0.82, 0.5, 0.6, 2],
  ["proj", 0.98, 0.45, 0.8, 0.7, 2],
  ["auto", 0.12, 0.1, 0.2, 0.5, 3],
  ["auto", 0.55, 0.5, 0.5, 0.45, 3],
  ["auto", 0.95, 0.9, 0.85, 0.5, 3],
  ["sys", 0.2, 0.5, 0.3, 0.95, 4],
  ["sys", 0.75, 0.16, 0.72, 0.7, 4],
  ["trust", 0.3, 0.88, 0.3, 0.45, 5],
  ["trust", 0.85, 0.5, 0.5, 0.3, 5],
  ["conv", 0, 0.5, 0.5, 0.3, 5],
];
