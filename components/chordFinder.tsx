"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  CHORD_QUALITIES,
  MAX_CAPO,
  NOTES_SHARP,
  TUNINGS,
  type ChordQualityId,
  type NoteName,
  type TuningId,
} from "@/lib/music/constants";
import {
  findChordFingerings,
  rateCapos,
  type Fingering,
  type SearchSettings,
} from "@/lib/music/finder";
import { formatFingering } from "@/lib/music/format";
import { transpose } from "@/lib/music/notes";
import { parseChordList } from "@/lib/music/parse";
import SVGuitarDiagram from "@/components/SVGuitarDiagram";

type ChordEntry = {
  id: string;
  root: NoteName;
  quality: ChordQualityId;
};

const DEFAULT_SEARCH: SearchSettings = {
  maxFret: 12,
  maxSpan: 4,
  maxResults: 24,
};

function uid() {
  return crypto.randomUUID();
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function chordSymbol(root: NoteName, quality: ChordQualityId) {
  const q = CHORD_QUALITIES.find((x) => x.id === quality);
  return `${root}${q?.symbol ?? quality}`;
}

const card = "rounded-2xl border border-slate-200 dark:border-slate-700";
const control =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900";
const primaryButton =
  "rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300";

export default function ChordFinder() {
  const [chords, setChords] = useState<ChordEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [tuningId, setTuningId] = useState<TuningId>("GDAE");
  const [capo, setCapo] = useState(0);
  const [search, setSearch] = useState<SearchSettings>(DEFAULT_SEARCH);

  // Chosen voicing per chord, remembered separately for every tuning+capo.
  const [selections, setSelections] = useState<Record<string, number>>({});

  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);
  const [pickRoot, setPickRoot] = useState<NoteName>("G");
  const [pickQuality, setPickQuality] = useState<ChordQualityId>("maj");

  const tuning = TUNINGS[tuningId];
  const settings: SearchSettings = {
    maxFret: clamp(search.maxFret, 3, 24),
    maxSpan: clamp(search.maxSpan, 1, 8),
    maxResults: clamp(search.maxResults, 4, 100),
  };
  const { maxFret, maxSpan, maxResults } = settings;

  const selectionKey = (id: string) => `${id}|${tuningId}|${capo}`;

  // All voicings for every chord at the current capo/tuning.
  const voicings = useMemo(() => {
    const map = new Map<string, Fingering[]>();
    for (const c of chords) {
      map.set(
        c.id,
        findChordFingerings({
          root: c.root,
          quality: c.quality,
          capo,
          tuning,
          maxFret,
          maxSpan,
          maxResults,
        })
      );
    }
    return map;
  }, [chords, capo, tuning, maxFret, maxSpan, maxResults]);

  // How easy the whole song is at each capo position.
  const ratings = useMemo(() => {
    const unique = new Map<string, ChordEntry>();
    for (const c of chords) unique.set(`${c.root}${c.quality}`, c);
    if (unique.size === 0) return null;
    return rateCapos(
      [...unique.values()],
      tuning,
      { maxFret, maxSpan, maxResults: 1 },
      MAX_CAPO
    );
  }, [chords, tuning, maxFret, maxSpan]);

  const bestCapo = ratings
    ? ratings.reduce((best, r) =>
        r.missing < best.missing ||
        (r.missing === best.missing && r.total < best.total)
          ? r
          : best
      ).capo
    : null;

  const activeChord = chords.find((c) => c.id === activeId) ?? null;
  const activeVoicings = activeChord ? (voicings.get(activeChord.id) ?? []) : [];

  function selectedIndex(id: string) {
    const list = voicings.get(id) ?? [];
    return clamp(selections[selectionKey(id)] ?? 0, 0, Math.max(0, list.length - 1));
  }

  function addChords(list: Array<{ root: NoteName; quality: ChordQualityId }>) {
    if (list.length === 0) return;
    const entries = list.map((c) => ({ ...c, id: uid() }));
    setChords((prev) => [...prev, ...entries]);
    setActiveId((prev) => prev ?? entries[0].id);
  }

  function onSubmitText(e: FormEvent) {
    e.preventDefault();
    const { chords: parsed, invalid: bad } = parseChordList(text);
    addChords(parsed);
    setInvalid(bad);
    setText(bad.join(" "));
  }

  function removeChord(id: string) {
    const next = chords.filter((c) => c.id !== id);
    setChords(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  }

  function clearChords() {
    setChords([]);
    setActiveId(null);
    setSelections({});
  }

  return (
    <div className="space-y-6">
      {/* 1. Chords */}
      <section className={`${card} space-y-4 p-4 md:p-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">1. Song chords</h2>
            <p className="text-sm opacity-70">
              Enter the chords as written in the song (concert pitch).
            </p>
          </div>
          {chords.length > 0 && (
            <button
              type="button"
              onClick={clearChords}
              className="text-sm underline opacity-70 hover:opacity-100"
            >
              Clear all
            </button>
          )}
        </div>

        <form onSubmit={onSubmitText} className="flex flex-wrap gap-2">
          <input
            className={`${control} min-w-0 flex-1`}
            placeholder="e.g. G Em C D7 Bm F#m"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Chord symbols"
          />
          <button type="submit" className={primaryButton} disabled={!text.trim()}>
            Add
          </button>
        </form>
        {invalid.length > 0 && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Didn&apos;t recognise: {invalid.join(", ")}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="opacity-70">or pick:</span>
          <select
            className={control}
            value={pickRoot}
            onChange={(e) => setPickRoot(e.target.value as NoteName)}
            aria-label="Root"
          >
            {NOTES_SHARP.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            className={control}
            value={pickQuality}
            onChange={(e) => setPickQuality(e.target.value as ChordQualityId)}
            aria-label="Quality"
          >
            {CHORD_QUALITIES.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${control} hover:bg-slate-100 dark:hover:bg-slate-800`}
            onClick={() => addChords([{ root: pickRoot, quality: pickQuality }])}
          >
            + Add {chordSymbol(pickRoot, pickQuality)}
          </button>
        </div>

        {chords.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {chords.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-1 rounded-full border border-slate-300 py-1 pr-1 pl-3 text-sm dark:border-slate-600"
              >
                <span className="font-medium">{chordSymbol(c.root, c.quality)}</span>
                <button
                  type="button"
                  onClick={() => removeChord(c.id)}
                  className="grid h-6 w-6 place-content-center rounded-full hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-300"
                  aria-label={`Remove ${chordSymbol(c.root, c.quality)}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-60">No chords yet.</p>
        )}
      </section>

      {/* 2. Tuning + capo */}
      <section className={`${card} space-y-4 p-4 md:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">2. Tuning &amp; capo</h2>
          <div
            className="inline-flex rounded-xl border border-slate-300 p-1 dark:border-slate-600"
            role="radiogroup"
            aria-label="Tuning"
          >
            {(Object.keys(TUNINGS) as TuningId[]).map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={tuningId === id}
                onClick={() => setTuningId(id)}
                className={[
                  "rounded-lg px-3 py-1 font-mono text-sm",
                  tuningId === id
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        <CapoPicker
          capo={capo}
          setCapo={setCapo}
          ratings={ratings}
          bestCapo={bestCapo}
        />

        <details className="text-sm">
          <summary className="cursor-pointer opacity-70">Search settings</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Search up to fret (above capo)"
              value={search.maxFret}
              setValue={(n) => setSearch((s) => ({ ...s, maxFret: n }))}
              min={3}
              max={24}
            />
            <NumberField
              label="Max fret span"
              value={search.maxSpan}
              setValue={(n) => setSearch((s) => ({ ...s, maxSpan: n }))}
              min={1}
              max={8}
            />
            <NumberField
              label="Voicings to show"
              value={search.maxResults}
              setValue={(n) => setSearch((s) => ({ ...s, maxResults: n }))}
              min={4}
              max={100}
            />
          </div>
        </details>
      </section>

      {/* 3. Overview */}
      {chords.length > 0 && (
        <section className={`${card} space-y-4 p-4 md:p-6`}>
          <div>
            <h2 className="text-xl font-semibold">
              3. Chord sheet{" "}
              <span className="text-base font-normal opacity-70">
                ({tuningId}, capo {capo})
              </span>
            </h2>
            <p className="text-sm opacity-70">
              Click a chord to choose a different voicing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {chords.map((c) => {
              const list = voicings.get(c.id) ?? [];
              const selected = list[selectedIndex(c.id)];
              const isActive = c.id === activeId;
              const shape = chordSymbol(transpose(c.root, -capo), c.quality);

              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  aria-pressed={isActive}
                  className={[
                    card,
                    "flex flex-col items-center p-3 text-left",
                    isActive
                      ? "bg-amber-50 ring-2 ring-amber-400 dark:bg-amber-950/40"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  ].join(" ")}
                >
                  <div className="flex w-full items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold">
                      {chordSymbol(c.root, c.quality)}
                    </span>
                    {capo > 0 && (
                      <span className="text-xs opacity-60">{shape} shape</span>
                    )}
                  </div>
                  {selected ? (
                    <SVGuitarDiagram
                      frets={selected.frets}
                      tuning={tuning}
                      title={formatFingering(selected).frets.join(" ")}
                    />
                  ) : (
                    <div className="grid h-40 place-content-center text-xs opacity-60">
                      No voicing
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Voicing picker */}
      {activeChord && (
        <section className={`${card} space-y-4 p-4 md:p-6`}>
          <div>
            <h2 className="text-xl font-semibold">
              Voicings for {chordSymbol(activeChord.root, activeChord.quality)}
            </h2>
            <p className="text-sm opacity-70">
              Easiest first. Frets are relative to the capo.
            </p>
          </div>

          {activeVoicings.length === 0 ? (
            <div className={`${card} p-6 opacity-80`}>
              No fingerings found at capo {capo}. Try another capo, or widen the
              search settings.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {activeVoicings.map((f, idx) => {
                const isSelected = selectedIndex(activeChord.id) === idx;
                return (
                  <button
                    type="button"
                    key={f.frets.join(",")}
                    onClick={() =>
                      setSelections((s) => ({
                        ...s,
                        [selectionKey(activeChord.id)]: idx,
                      }))
                    }
                    aria-pressed={isSelected}
                    className={[
                      card,
                      "flex flex-col items-center p-3",
                      isSelected
                        ? "bg-amber-50 ring-2 ring-amber-400 dark:bg-amber-950/40"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    ].join(" ")}
                  >
                    <SVGuitarDiagram
                      frets={f.frets}
                      tuning={tuning}
                      title={formatFingering(f).frets.join(" ")}
                    />
                    <div className="mt-1 font-mono text-xs opacity-60">
                      {formatFingering(f).notes.join(" ")}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function CapoPicker({
  capo,
  setCapo,
  ratings,
  bestCapo,
}: {
  capo: number;
  setCapo: (n: number) => void;
  ratings: ReturnType<typeof rateCapos> | null;
  bestCapo: number | null;
}) {
  const totals = ratings?.map((r) => r.total) ?? [];
  const min = Math.min(...totals);
  const max = Math.max(...totals);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <label htmlFor="capo" className="font-medium">
          Capo: <span className="font-mono">{capo === 0 ? "none" : `fret ${capo}`}</span>
        </label>
        {bestCapo !== null && (
          <button
            type="button"
            className="text-sm underline opacity-80 hover:opacity-100"
            onClick={() => setCapo(bestCapo)}
          >
            Easiest: {bestCapo === 0 ? "no capo" : `capo ${bestCapo}`}
          </button>
        )}
      </div>

      {ratings && (
        <div
          className="grid h-16 items-end gap-1"
          style={{ gridTemplateColumns: `repeat(${ratings.length}, minmax(0, 1fr))` }}
          aria-hidden
        >
          {ratings.map((r) => {
            const ease = max === min ? 1 : (max - r.total) / (max - min);
            return (
              <button
                type="button"
                tabIndex={-1}
                key={r.capo}
                onClick={() => setCapo(r.capo)}
                title={
                  r.missing
                    ? `Capo ${r.capo}: ${r.missing} chord(s) unplayable`
                    : `Capo ${r.capo}`
                }
                className={[
                  "rounded-t",
                  r.capo === capo
                    ? "bg-amber-500"
                    : r.missing
                      ? "bg-red-300 dark:bg-red-900"
                      : "bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500",
                ].join(" ")}
                style={{ height: `${10 + ease * 90}%` }}
              />
            );
          })}
        </div>
      )}

      <input
        id="capo"
        className="w-full accent-amber-500"
        type="range"
        min={0}
        max={MAX_CAPO}
        value={capo}
        onChange={(e) => setCapo(Number(e.target.value))}
      />
      <div className="flex justify-between font-mono text-xs opacity-60">
        {Array.from({ length: MAX_CAPO + 1 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </div>
      {ratings && (
        <p className="text-xs opacity-60">
          Taller bar = easier to play the whole song at that capo.
        </p>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  setValue,
  min,
  max,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="space-y-1">
      <span className="block font-medium">{label}</span>
      <input
        className={`${control} w-full`}
        type="number"
        min={min}
        max={max}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => setValue(e.target.valueAsNumber)}
      />
      <span className="block text-xs opacity-60">
        Range: {min}–{max}
      </span>
    </label>
  );
}
