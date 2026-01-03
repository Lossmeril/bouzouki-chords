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

export const CHORD_QUALITIES: Array<{
  id: ChordQualityId;
  label: string;
  intervals: number[]; // semitones above root
}> = [
  { id: "maj", label: "Major", intervals: [0, 4, 7] },
  { id: "min", label: "Minor", intervals: [0, 3, 7] },
  { id: "7", label: "Dominant 7", intervals: [0, 4, 7, 10] },
  { id: "maj7", label: "Major 7", intervals: [0, 4, 7, 11] },
  { id: "m7", label: "Minor 7", intervals: [0, 3, 7, 10] },
  { id: "sus2", label: "Sus2", intervals: [0, 2, 7] },
  { id: "sus4", label: "Sus4", intervals: [0, 5, 7] },
  { id: "dim", label: "Diminished", intervals: [0, 3, 6] },
  { id: "aug", label: "Augmented", intervals: [0, 4, 8] },
];

// Irish bouzouki tuning, low→high
export const GDAE_OPEN: NoteName[] = ["G", "D", "A", "E"];
