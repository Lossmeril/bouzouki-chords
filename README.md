# Bouzouki Chord Finder

Find comfortable Irish bouzouki chord voicings for a whole song.

1. Type the song's chords (e.g. `G Em C D7 Bbmaj7 F#m`) or pick them from the dropdowns.
2. Choose the tuning: **GDAE** or **GDAD**.
3. Slide the capo. Every chord is re-voiced for that capo, and the bar chart above the slider shows how easy the whole song is at each capo position (taller = easier).
4. Click a chord in the sheet to choose a different voicing. Choices are remembered per tuning and capo.

Frets in diagrams are relative to the capo.

## Development

Requires Node 24 (see `.nvmrc`) and Yarn 1 (pinned via `packageManager`, works with corepack).

```bash
nvm use
yarn install
yarn dev     # http://localhost:3000
yarn lint
yarn build
```
