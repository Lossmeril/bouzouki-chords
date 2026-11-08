import type { ChordQualityId, NoteName } from "./constants";
import { pcToNote } from "./notes";

const NATURAL_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// Longest suffixes first so "maj7" wins over "m".
const SUFFIXES: Array<[string, ChordQualityId]> = [
  ["maj7", "maj7"],
  ["Maj7", "maj7"],
  ["M7", "maj7"],
  ["min7", "m7"],
  ["m7", "m7"],
  ["sus2", "sus2"],
  ["sus4", "sus4"],
  ["sus", "sus4"],
  ["dim", "dim"],
  ["°", "dim"],
  ["aug", "aug"],
  ["+", "aug"],
  ["min", "min"],
  ["m", "min"],
  ["7", "7"],
  ["maj", "maj"],
  ["M", "maj"],
  ["", "maj"],
];

export type ParsedChord = { root: NoteName; quality: ChordQualityId };

/** Parses a single chord symbol such as "G", "Em", "F#m7", "Bbmaj7", "Dsus4". */
export function parseChordSymbol(input: string): ParsedChord | null {
  const s = input.trim();
  const m = /^([A-Ga-g])([#♯b♭]?)(.*)$/.exec(s);
  if (!m) return null;

  let pc = NATURAL_PC[m[1].toUpperCase()];
  if (m[2] === "#" || m[2] === "♯") pc += 1;
  if (m[2] === "b" || m[2] === "♭") pc -= 1;

  const rest = m[3];
  for (const [suffix, quality] of SUFFIXES) {
    if (rest === suffix) {
      return { root: pcToNote(pc), quality };
    }
  }
  return null;
}

/**
 * Parses a list of chord symbols separated by spaces, commas, bars or dashes.
 * Returns the parsed chords plus any tokens that could not be understood.
 */
export function parseChordList(input: string): {
  chords: ParsedChord[];
  invalid: string[];
} {
  const chords: ParsedChord[] = [];
  const invalid: string[] = [];
  for (const token of input.split(/[\s,|]+/).filter(Boolean)) {
    const parsed = parseChordSymbol(token);
    if (parsed) chords.push(parsed);
    else invalid.push(token);
  }
  return { chords, invalid };
}
