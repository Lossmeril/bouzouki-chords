import { NOTES_SHARP, type NoteName } from "./constants";

export function noteToPc(note: NoteName): number {
  return NOTES_SHARP.indexOf(note);
}

export function pcToNote(pc: number): NoteName {
  const n = ((pc % 12) + 12) % 12;
  return NOTES_SHARP[n];
}

export function transpose(note: NoteName, semitones: number): NoteName {
  return pcToNote(noteToPc(note) + semitones);
}
