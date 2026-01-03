import type { Fingering } from "./finder";

export function formatFingering(f: Fingering): {
  frets: Array<string>;
  notes: Array<string>;
} {
  return {
    frets: f.frets.map((x) => (x === "x" ? "x" : String(x))),
    notes: f.notes.map((n) => (n === "x" ? "x" : n)),
  };
}
