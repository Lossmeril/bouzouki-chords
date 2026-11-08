import {
  CHORD_QUALITIES,
  type ChordQualityId,
  type NoteName,
  type Tuning,
} from "./constants";
import { noteToPc, pcToNote } from "./notes";

export type Fret = number | "x";

export type Fingering = {
  // Frets relative to capo: 0=open, 1..N, or "x"
  frets: Fret[]; // low→high, one per course
  notes: Array<NoteName | "x">;
  score: number; // lower = easier / better
  metrics: {
    span: number; // max fret - min fret (ignoring 0 and x)
    mutedCount: number;
    openCount: number;
    maxFretUsed: number;
  };
};

export type SearchSettings = {
  maxFret: number; // relative to capo
  maxSpan: number; // max spread among fretted notes
  maxResults: number;
};

export type FindParams = SearchSettings & {
  root: NoteName;
  quality: ChordQualityId;
  capo: number;
  tuning: Tuning;
};

/** Score given to a chord that has no playable voicing at all. */
export const NO_VOICING_SCORE = 200;

// Heuristics: prefer fewer mutes, more chord tones, smaller span, lower max fret.
function score(
  notes: Array<NoteName | "x">,
  metrics: Fingering["metrics"],
  chordPcs: Set<number>,
  rootPc: number
): number {
  const mutedPenalty = metrics.mutedCount * 30;
  const spanPenalty = metrics.span * 6;
  const fretPenalty = metrics.maxFretUsed * 2;

  const uniquePcs = new Set<number>();
  for (const n of notes) if (n !== "x") uniquePcs.add(noteToPc(n));

  let coverage = 0;
  chordPcs.forEach((pc) => {
    if (uniquePcs.has(pc)) coverage += 1;
  });
  const missingPenalty = (chordPcs.size - coverage) * 40;

  // Root in the bass sounds most like the named chord.
  const bass = notes.find((n): n is NoteName => n !== "x");
  const rootBonus = !uniquePcs.has(rootPc)
    ? 25
    : bass && noteToPc(bass) === rootPc
      ? -25
      : -15;

  return mutedPenalty + spanPenalty + fretPenalty + missingPenalty + rootBonus;
}

export function findChordFingerings(params: FindParams): Fingering[] {
  const quality = CHORD_QUALITIES.find((q) => q.id === params.quality);
  if (!quality) return [];

  const rootPc = noteToPc(params.root);
  const chordPcs = new Set<number>(
    quality.intervals.map((i) => (rootPc + i) % 12)
  );

  // With capo, each open string is raised by capo semitones.
  const openPcs = params.tuning.map((n) => (noteToPc(n) + params.capo) % 12);

  // For each string, candidate frets (including x) that yield chord tones.
  const candidatesPerString: Fret[][] = openPcs.map((openPc) => {
    const c: Fret[] = ["x"];
    for (let fret = 0; fret <= params.maxFret; fret++) {
      if (chordPcs.has((openPc + fret) % 12)) c.push(fret);
    }
    return c;
  });

  const results: Fingering[] = [];
  const minCoverage = Math.min(3, chordPcs.size);

  for (const g of candidatesPerString[0]) {
    for (const d of candidatesPerString[1]) {
      for (const a of candidatesPerString[2]) {
        for (const e of candidatesPerString[3]) {
          const frets: Fret[] = [g, d, a, e];

          // must have at least 3 sounding strings
          const sounded = frets.filter((x) => x !== "x").length;
          if (sounded < 3) continue;

          const fretted = frets.filter((x): x is number => x !== "x" && x > 0);
          const span =
            fretted.length >= 2
              ? Math.max(...fretted) - Math.min(...fretted)
              : 0;
          if (span > params.maxSpan) continue;

          const notes: Array<NoteName | "x"> = frets.map((fret, i) =>
            fret === "x" ? "x" : pcToNote(openPcs[i] + fret)
          );

          const pcsHere = new Set<number>();
          for (const n of notes) if (n !== "x") pcsHere.add(noteToPc(n));
          let covered = 0;
          chordPcs.forEach((pc) => {
            if (pcsHere.has(pc)) covered += 1;
          });
          if (covered < minCoverage) continue;

          const metrics = {
            span,
            mutedCount: 4 - sounded,
            openCount: frets.filter((x) => x === 0).length,
            maxFretUsed: fretted.length ? Math.max(...fretted) : 0,
          };

          results.push({
            frets,
            notes,
            metrics,
            score: score(notes, metrics, chordPcs, rootPc),
          });
        }
      }
    }
  }

  results.sort((a, b) => a.score - b.score);
  return results.slice(0, params.maxResults);
}

export type CapoRating = {
  capo: number;
  /** Sum of the best voicing score of every chord at this capo (lower = easier). */
  total: number;
  /** Number of chords that have no voicing at this capo. */
  missing: number;
};

/** Rates every capo position by how easy the whole chord list is to play there. */
export function rateCapos(
  chords: ReadonlyArray<{ root: NoteName; quality: ChordQualityId }>,
  tuning: Tuning,
  settings: SearchSettings,
  maxCapo: number
): CapoRating[] {
  const ratings: CapoRating[] = [];
  for (let capo = 0; capo <= maxCapo; capo++) {
    let total = 0;
    let missing = 0;
    for (const c of chords) {
      const [best] = findChordFingerings({
        ...settings,
        maxResults: 1,
        root: c.root,
        quality: c.quality,
        capo,
        tuning,
      });
      if (best) total += best.score;
      else {
        total += NO_VOICING_SCORE;
        missing += 1;
      }
    }
    ratings.push({ capo, total, missing });
  }
  return ratings;
}
