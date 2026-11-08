export const NOTES_SHARP = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type NoteName = (typeof NOTES_SHARP)[number];

export type ChordQualityId =
  | "maj"
  | "min"
  | "7"
  | "maj7"
  | "m7"
  | "sus2"
  | "sus4"
  | "dim"
  | "aug";

export const CHORD_QUALITIES: ReadonlyArray<{
  id: ChordQualityId;
  label: string;
  /** Short suffix used in chord symbols, e.g. "m" for minor. */
  symbol: string;
  intervals: readonly number[]; // semitones above root
}> = [
  { id: "maj", label: "Major", symbol: "", intervals: [0, 4, 7] },
  { id: "min", label: "Minor", symbol: "m", intervals: [0, 3, 7] },
  { id: "7", label: "Dominant 7", symbol: "7", intervals: [0, 4, 7, 10] },
  { id: "maj7", label: "Major 7", symbol: "maj7", intervals: [0, 4, 7, 11] },
  { id: "m7", label: "Minor 7", symbol: "m7", intervals: [0, 3, 7, 10] },
  { id: "sus2", label: "Sus2", symbol: "sus2", intervals: [0, 2, 7] },
  { id: "sus4", label: "Sus4", symbol: "sus4", intervals: [0, 5, 7] },
  { id: "dim", label: "Diminished", symbol: "dim", intervals: [0, 3, 6] },
  { id: "aug", label: "Augmented", symbol: "aug", intervals: [0, 4, 8] },
];

export type Tuning = readonly [NoteName, NoteName, NoteName, NoteName];

/** Irish bouzouki tunings, low→high. */
export const TUNINGS = {
  GDAE: ["G", "D", "A", "E"],
  GDAD: ["G", "D", "A", "D"],
} as const satisfies Record<string, Tuning>;

export type TuningId = keyof typeof TUNINGS;

export const MAX_CAPO = 12;
