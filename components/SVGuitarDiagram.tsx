"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Chord, ChordSettings, Finger } from "svguitar";
import type { Tuning } from "@/lib/music/constants";
import type { Fret } from "@/lib/music/finder";

/**
 * Renders a 4-course bouzouki chord diagram with SVGuitar.
 *
 * The app stores strings low→high (e.g. [G, D, A, E]); SVGuitar numbers
 * strings 1..N from high→low, so index 0 (low G) maps to string 4.
 */
export type SVGuitarDiagramProps = {
  title?: string;
  frets: Fret[]; // low→high, capo-relative
  tuning: Tuning;
  size?: "sm" | "md";
  className?: string;
};

const SIZE = {
  sm: {
    frets: 4,
    titleFontSize: 28,
    tuningsFontSize: 26,
    fingerTextSize: 16,
    nutWidth: 10,
    className: "w-24 h-28",
  },
  md: {
    frets: 5,
    titleFontSize: 45,
    tuningsFontSize: 36,
    fingerTextSize: 30,
    nutWidth: 20,
    className: "w-32 h-40",
  },
} as const;

export default function SVGuitarDiagram({
  title,
  frets,
  tuning,
  size = "md",
  className,
}: SVGuitarDiagramProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cfg = SIZE[size];

  const chord = useMemo<Chord>(() => {
    const fretted = frets.filter((f): f is number => f !== "x" && f > 0);
    const highest = fretted.length ? Math.max(...fretted) : 0;
    // Shift the window up the neck when the shape doesn't fit from the nut.
    const position =
      highest > cfg.frets ? Math.min(...fretted) : 1;

    const fingers: Finger[] = frets.map((f, i) => {
      const string = frets.length - i;
      if (f === "x" || f === 0) return [string, f];
      return [string, f - position + 1];
    });

    return { fingers, barres: [], position, title: title ?? "" };
  }, [frets, title, cfg.frets]);

  const settings = useMemo<ChordSettings>(
    () => ({
      strings: tuning.length,
      frets: cfg.frets,
      tuning: [...tuning],
      titleFontSize: cfg.titleFontSize,
      tuningsFontSize: cfg.tuningsFontSize,
      fingerTextSize: cfg.fingerTextSize,
      nutWidth: cfg.nutWidth,
      strokeWidth: 2,
      backgroundColor: "none",
      color: "currentColor",
      titleBottomMargin: 0,
      sidePadding: 0.2,
      fretSize: 1.35,
      fingerSize: 0.68,
      emptyStringIndicatorSize: 0.55,
      showFretMarkers: false,
      fixedDiagramPosition: true,
    }),
    [tuning, cfg]
  );

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;

    // Dynamic import keeps SVGuitar (which needs the DOM) out of SSR.
    import("svguitar").then(({ SVGuitarChord }) => {
      if (cancelled || !host) return;
      host.innerHTML = "";
      new SVGuitarChord(host).configure(settings).chord(chord).draw();
      const svg = host.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.display = "block";
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chord, settings]);

  return (
    <div
      ref={hostRef}
      className={["shrink-0", cfg.className, className ?? ""].join(" ")}
      role="img"
      aria-label={`Frets ${frets.join(" ")}`}
    />
  );
}
