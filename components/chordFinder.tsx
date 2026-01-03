"use client";

import React, { useMemo, useState } from "react";
import {
  CHORD_QUALITIES,
  type ChordQualityId,
  type NoteName,
  NOTES_SHARP,
} from "@/lib/music/constants";
import { findChordFingeringsGDAE, type Fingering } from "@/lib/music/finder";
import { formatFingering } from "@/lib/music/format";
import SVGuitarDiagram from "@/components/SVGuitarDiagram";

const ROOTS: readonly NoteName[] = NOTES_SHARP;

type ChordEntry = {
  id: string;
  root: NoteName;
  quality: ChordQualityId;
  capo: number;

  // search params (kept per chord so each chord can be optimized differently if desired)
  maxFret: number;
  maxSpan: number;
  maxResults: number;

  // user-selected voicing index into generated results
  selectedIndex: number; // default 0
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function chordLabel(root: NoteName, quality: ChordQualityId) {
  const q = CHORD_QUALITIES.find((x) => x.id === quality)?.label ?? quality;
  return `${root} ${q}`;
}

export default function ChordFinder() {
  // “New chord” form state
  const [newRoot, setNewRoot] = useState<NoteName>("G");
  const [newQuality, setNewQuality] = useState<ChordQualityId>("maj");
  const [newCapo, setNewCapo] = useState<number>(0);

  const [newMaxFret, setNewMaxFret] = useState<number>(12);
  const [newMaxSpan, setNewMaxSpan] = useState<number>(4);
  const [newMaxResults, setNewMaxResults] = useState<number>(25);

  const [chords, setChords] = useState<ChordEntry[]>([
    {
      id: uid(),
      root: "G",
      quality: "maj",
      capo: 0,
      maxFret: 12,
      maxSpan: 4,
      maxResults: 25,
      selectedIndex: 0,
    },
  ]);

  const [activeId, setActiveId] = useState<string>(chords[0].id);

  const activeChord = chords.find((c) => c.id === activeId) ?? chords[0];

  const activeResults = useMemo(() => {
    if (!activeChord) return [];
    return findChordFingeringsGDAE({
      root: activeChord.root,
      quality: activeChord.quality,
      capo: clamp(activeChord.capo, 0, 12),
      maxFret: clamp(activeChord.maxFret, 3, 24),
      maxSpan: clamp(activeChord.maxSpan, 1, 8),
      maxResults: clamp(activeChord.maxResults, 5, 100),
    });
  }, [activeChord]);

  function addChord() {
    const entry: ChordEntry = {
      id: uid(),
      root: newRoot,
      quality: newQuality,
      capo: clamp(newCapo, 0, 12),
      maxFret: clamp(newMaxFret, 3, 24),
      maxSpan: clamp(newMaxSpan, 1, 8),
      maxResults: clamp(newMaxResults, 5, 100),
      selectedIndex: 0,
    };
    setChords((prev) => [...prev, entry]);
    setActiveId(entry.id);
  }

  function removeChord(id: string) {
    setChords((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh: ChordEntry = {
          id: uid(),
          root: "G",
          quality: "maj",
          capo: 0,
          maxFret: 12,
          maxSpan: 4,
          maxResults: 25,
          selectedIndex: 0,
        };
        setActiveId(fresh.id);
        return [fresh];
      }
      // if removing active, move active to first
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  function updateChord(id: string, patch: Partial<ChordEntry>) {
    setChords((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  // helper: compute selected fingering for each chord
  const selectedByChord = useMemo(() => {
    const map = new Map<string, Fingering | null>();
    for (const c of chords) {
      const res = findChordFingeringsGDAE({
        root: c.root,
        quality: c.quality,
        capo: clamp(c.capo, 0, 12),
        maxFret: clamp(c.maxFret, 3, 24),
        maxSpan: clamp(c.maxSpan, 1, 8),
        maxResults: clamp(c.maxResults, 5, 100),
      });
      const idx = clamp(c.selectedIndex, 0, Math.max(0, res.length - 1));
      map.set(c.id, res[idx] ?? null);
    }
    return map;
  }, [chords]);

  return (
    <div className="space-y-6">
      {/* Add chord */}
      <section className="rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Song chords</h2>
            <p className="text-sm opacity-70">
              Add chords, then pick a voicing for each one.
            </p>
          </div>
          <div
            onClick={addChord}
            className="rounded-xl border border-slate-200 px-4 py-2 shadow-sm hover:bg-black/5"
          >
            + Add chord
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Root</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={newRoot}
              onChange={(e) => setNewRoot(e.target.value as NoteName)}
            >
              {ROOTS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Quality</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={newQuality}
              onChange={(e) => setNewQuality(e.target.value as ChordQualityId)}
            >
              {CHORD_QUALITIES.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Capo (fret)</label>
            <input
              className="w-full"
              type="range"
              min={0}
              max={12}
              value={newCapo}
              onChange={(e) => setNewCapo(Number(e.target.value))}
            />
            <div className="text-sm opacity-80">Capo: {newCapo}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <NumberField
            label="Search up to fret"
            value={newMaxFret}
            setValue={setNewMaxFret}
            min={3}
            max={24}
          />
          <NumberField
            label="Max fret span"
            value={newMaxSpan}
            setValue={setNewMaxSpan}
            min={1}
            max={8}
          />
          <NumberField
            label="Max results"
            value={newMaxResults}
            setValue={setNewMaxResults}
            min={5}
            max={100}
          />
        </div>
      </section>

      {/* Overview: compact chord table / horizontal strip */}
      <section className="rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Chord overview</h3>
            <div className="text-sm opacity-70">{chords.length} total</div>
          </div>
        </div>

        <div className="overflow-x-auto relative">
          <div className="grid grid-cols-4 gap-2 w-full  pb-1">
            {chords.map((c, i) => {
              const selected = selectedByChord.get(c.id);
              const formatted = selected ? formatFingering(selected) : null;
              const isActive = c.id === activeId;

              return (
                <div
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={[
                    "rounded-2xl border border-slate-200 p-3 shadow-sm text-left relative",
                    "w-full hover:bg-red/5 ",
                    isActive ? "bg-red/50 " : "",
                  ].join(" ")}
                  title="Set active chord"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-semibold">
                      <span className="font-mono text-xs opacity-70">
                        #{i + 1}
                      </span>{" "}
                      {c.root}
                      <span className="ml-1 opacity-80">
                        {qualityShort(c.quality)}
                      </span>
                    </div>
                    <div className="font-mono text-xs opacity-70">
                      capo {c.capo}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    {formatted ? (
                      <SVGuitarDiagram
                        title=""
                        frets={selected!.frets}
                        orientation="vertical"
                        size="md"
                      />
                    ) : (
                      <div className="text-xs opacity-60">No voicing</div>
                    )}
                  </div>
                  <div
                    className="absolute bottom-3 right-3 p-3 w-3 h-3 aspect-square grid place-content-center border text-xs font-bold bg-red-200 border-red-300 text-red-400 rounded-md hover:bg-red-300 transition"
                    onClick={() => removeChord(c.id)}
                  >
                    X
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-xs opacity-60">
          Tip: click a chord to make it active, then pick its voicing below.
        </div>
      </section>

      {/* Active chord voicing picker */}
      <section className="rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              Voicings for:{" "}
              {activeChord
                ? `${chordLabel(activeChord.root, activeChord.quality)} (capo ${
                    activeChord.capo
                  })`
                : "—"}
            </h3>
            <p className="text-sm opacity-70">
              Click a voicing to set it as the one shown in the overview.
            </p>
          </div>
        </div>

        {!activeChord ? (
          <div className="opacity-70">No active chord.</div>
        ) : activeResults.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 p-6 opacity-80">
            No fingerings found. Increase search range/span for this chord
            (remove and re-add, or tell me and I’ll add per-chord editing).
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {activeResults.map((f, idx) => (
              <VoicingCard
                key={idx}
                fingering={f}
                index={idx}
                isSelected={activeChord.selectedIndex === idx}
                onSelect={() =>
                  updateChord(activeChord.id, { selectedIndex: idx })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function VoicingCard({
  fingering,
  index,
  isSelected,
  onSelect,
}: {
  fingering: Fingering;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const formatted = formatFingering(fingering);

  return (
    <div
      onClick={onSelect}
      className={[
        "w-full text-left rounded-2xl border border-slate-200 p-4 md:p-5 shadow-sm hover:bg-black/5",
        isSelected ? "ring-2 ring-black/20 bg-black/5" : "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          {/* <div className="text-sm opacity-70">#{index + 1}</div> */}
          {/* <div className="text-xs font-semibold tracking-tight">
            Frets (G–D–A–E):{" "}
          </div> */}
          {/* <p>
            {" "}
            <span className="font-mono">{formatted.frets.join(" ")}</span>
          </p> */}
          {/* <div className="text-xs opacity-80">
            Notes:{" "}
            <span className="font-mono">{formatted.notes.join(" ")}</span>
          </div> */}
        </div>

        {/* <div className="text-sm opacity-80">
          <div>Span: {fingering.metrics.span}</div>
          <div>Muted: {fingering.metrics.mutedCount}</div>
          <div>Open: {fingering.metrics.openCount}</div>
        </div> */}
      </div>

      <div>
        <SVGuitarDiagram
          title={formatted.frets.join(" ")} // (or show title here if you want)
          frets={fingering.frets}
          orientation="vertical" // nice for detailed selection
          size="md"
        />
      </div>
    </div>
  );
}

function MiniDiagram({ frets }: { frets: Array<string> }) {
  const strings = ["G", "D", "A", "E"] as const;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[320px] rounded-xl bg-black/5 p-3">
        <div className="grid grid-cols-4 gap-3 font-mono text-sm">
          {strings.map((s, i) => (
            <div key={s} className="space-y-1">
              <div className="text-xs opacity-70">{s}</div>
              <div className="rounded-lg bg-white/70 px-2 py-2 text-center">
                {frets[i]}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs opacity-60">
          x = mute, 0 = open (relative to capo)
        </div>
      </div>
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
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <div className="text-xs opacity-60">
        Range: {min}–{max}
      </div>
    </div>
  );
}

function qualityShort(q: ChordQualityId): string {
  switch (q) {
    case "maj":
      return "";
    case "min":
      return "m";
    case "7":
      return "7";
    case "maj7":
      return "maj7";
    case "m7":
      return "m7";
    case "sus2":
      return "sus2";
    case "sus4":
      return "sus4";
    case "dim":
      return "dim";
    case "aug":
      return "aug";
    default:
      return q;
  }
}

// Tiny, compact “shape” display that reads well in tables + horizontal chips
function CompactShape({ frets }: { frets: Array<string> }) {
  // frets are strings like ["x","0","2","3"]
  return (
    <div className="flex items-center gap-1 font-mono text-xs">
      {frets.map((f, idx) => (
        <span
          key={idx}
          className={[
            "inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white/70",
            f === "x" ? "opacity-60" : "",
          ].join(" ")}
        >
          {f}
        </span>
      ))}
    </div>
  );
}
