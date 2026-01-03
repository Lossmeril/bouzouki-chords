import {
  CHORD_QUALITIES,
  GDAE_OPEN,
  type ChordQualityId,
  type NoteName,
} from "./constants";
import { noteToPc, pcToNote } from "./notes";

export type Fingering = {
  // Frets relative to capo: 0=open, 1..N, or "x"
  frets: Array<number | "x">; // [G, D, A, E]
  notes: Array<NoteName | "x">;
  metrics: {
    span: number; // max fret - min fret (ignoring 0 and x)
    mutedCount: number;
    openCount: number;
    maxFretUsed: number;
  };
};

type FindParams = {
  root: NoteName;
  quality: ChordQualityId;
  capo: number; // 0..12
  maxFret: number; // relative to capo
  maxSpan: number; // max spread among fretted notes
  maxResults: number;
};

// Heuristics: prefer fewer mutes, more chord tones, smaller span, lower max fret.
function score(f: Fingering, chordPcs: Set<number>): number {
  const mutedPenalty = f.metrics.mutedCount * 30;
  const spanPenalty = f.metrics.span * 6;
  const fretPenalty = f.metrics.maxFretUsed * 2;

  const uniquePcs = new Set<number>();
  f.notes.forEach((n) => {
    if (n !== "x") uniquePcs.add(noteToPc(n));
  });

  // Reward covering the chord set
  let coverage = 0;
  chordPcs.forEach((pc) => {
    if (uniquePcs.has(pc)) coverage += 1;
  });
  const missingPenalty = (chordPcs.size - coverage) * 40;

  // Reward root present
  const rootPc = [...chordPcs][0];
  const hasRoot = uniquePcs.has(rootPc);
  const rootBonus = hasRoot ? -20 : 25;

  // prefer not *too* many opens if they add non-chord tones (we already filter those out)
  const openPenalty = Math.max(0, f.metrics.openCount - 2) * 2;

  return (
    mutedPenalty +
    spanPenalty +
    fretPenalty +
    missingPenalty +
    openPenalty +
    rootBonus
  );
}

export function findChordFingeringsGDAE(params: FindParams): Fingering[] {
  const quality = CHORD_QUALITIES.find((q) => q.id === params.quality);
  if (!quality) return [];

  const rootPc = noteToPc(params.root);
  const chordPcs = new Set<number>(
    quality.intervals.map((i) => (rootPc + i) % 12)
  );

  // With capo, each open string is raised by capo semitones.
  const openPcs = GDAE_OPEN.map((n) => (noteToPc(n) + params.capo) % 12);

  // For each string, compute candidate frets (including x) that yield chord tones.
  // Limit candidates to keep search manageable.
  const candidatesPerString: Array<Array<number | "x">> = openPcs.map(
    (openPc) => {
      const c: Array<number | "x"> = ["x"];

      for (let fret = 0; fret <= params.maxFret; fret++) {
        const pc = (openPc + fret) % 12;
        if (chordPcs.has(pc)) c.push(fret);
      }

      // Keep it reasonable: if too many, keep lowest frets (most playable)
      // (x plus up to ~10 frets)
      return c.slice(0, 1 + 10);
    }
  );

  const results: Fingering[] = [];
  const seen = new Set<string>();

  // brute force 4 strings (manageable with candidate pruning)
  for (const g of candidatesPerString[0]) {
    for (const d of candidatesPerString[1]) {
      for (const a of candidatesPerString[2]) {
        for (const e of candidatesPerString[3]) {
          const frets: Array<number | "x"> = [g, d, a, e];

          // must have at least 3 sounding strings
          const sounded = frets.filter((x) => x !== "x").length;
          if (sounded < 3) continue;

          // compute notes; filter out anything not in chord (shouldn't happen)
          const notes: Array<NoteName | "x"> = frets.map((fret, i) => {
            if (fret === "x") return "x";
            const pc = (openPcs[i] + fret) % 12;
            return pcToNote(pc);
          });

          // must cover at least 3 distinct chord tones for triads, or 3 for 7ths too
          const pcsHere = new Set<number>();
          notes.forEach((n) => {
            if (n !== "x") pcsHere.add(noteToPc(n));
          });

          let covered = 0;
          chordPcs.forEach((pc) => {
            if (pcsHere.has(pc)) covered += 1;
          });

          const minCoverage = Math.min(3, chordPcs.size);
          if (covered < minCoverage) continue;

          // compute span among fretted notes (>0)
          const fretted = frets.filter((x): x is number => x !== "x" && x > 0);
          const maxFretUsed = frets.reduce<number>(
            (m, x) => (x === "x" ? m : Math.max(m, x)),
            0
          );

          let span = 0;
          if (fretted.length >= 2) {
            const minF = Math.min(...fretted);
            const maxF = Math.max(...fretted);
            span = maxF - minF;
          }

          if (span > params.maxSpan) continue;

          const metrics = {
            span,
            mutedCount: frets.filter((x) => x === "x").length,
            openCount: frets.filter((x) => x === 0).length,
            maxFretUsed,
          };

          const fingering: Fingering = { frets, notes, metrics };
          const key = frets.join(",");
          if (seen.has(key)) continue;
          seen.add(key);

          results.push(fingering);
        }
      }
    }
  }

  // sort by heuristics
  results.sort((a, b) => score(a, chordPcs) - score(b, chordPcs));

  return results.slice(0, params.maxResults);
}
