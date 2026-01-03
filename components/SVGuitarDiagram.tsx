"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { NoteName } from "@/lib/music/constants";

/**
 * We feed SVGuitar a 4-string “guitar” diagram for bouzouki GDAE.
 * Important mapping choice:
 * - Your app stores strings low→high as [G, D, A, E]
 * - SVGuitar string numbers are typically 1..N from high→low (common chord-diagram convention)
 * So we map:
 *   index 0 (low G) -> string 4
 *   index 1 (D)     -> string 3
 *   index 2 (A)     -> string 2
 *   index 3 (high E)-> string 1
 */
export type SVGuitarDiagramProps = {
  title?: string;
  frets: Array<number | "x">; // [G, D, A, E] capo-relative
  tuning?: [NoteName, NoteName, NoteName, NoteName]; // default ["G","D","A","E"]
  orientation?: "vertical" | "horizontal";
  size?: "xs" | "sm" | "md";
  className?: string;
};

const DEFAULT_TUNING: [NoteName, NoteName, NoteName, NoteName] = [
  "G",
  "D",
  "A",
  "E",
];

function sizeConfig(size: SVGuitarDiagramProps["size"]) {
  // Keep it compact for tables/strips; tweak as you like
  switch (size) {
    case "xs":
      return {
        frets: 4,
        titleFontSize: 22,
        tuningsFontSize: 16,
        fingerTextSize: 14,
        strokeWidth: 2,
        nutWidth: 8,
      };
    case "sm":
      return {
        frets: 4,
        titleFontSize: 28,
        tuningsFontSize: 18,
        fingerTextSize: 16,
        strokeWidth: 2,
        nutWidth: 10,
      };
    default:
      return {
        frets: 5,
        titleFontSize: 45,
        tuningsFontSize: 40,
        fingerTextSize: 30,
        strokeWidth: 2,
        nutWidth: 20,
      };
  }
}

export default function SVGuitarDiagram({
  title,
  frets,
  tuning = DEFAULT_TUNING,
  orientation = "vertical",
  size = "sm",
  className,
}: SVGuitarDiagramProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  const chordSpec = useMemo(() => {
    const fingers: any[] = [];

    frets.forEach((f, idxLowToHigh) => {
      const svguitarString = 4 - idxLowToHigh; // G(0)->4 ... E(3)->1

      if (f === "x") {
        fingers.push([svguitarString, "x"]);
      } else {
        fingers.push([svguitarString, f]); // 0=open, 1..N fretted
      }
    });

    return {
      fingers,
      barres: [], // ✅ IMPORTANT: prevent undefined.forEach crash
      title: title ?? "",
      position: 1,
    };
  }, [frets, title]);

  const config = useMemo(() => {
    const base = sizeConfig(size);

    return {
      orientation, // SVGuitar supports 'vertical'/'horizontal' :contentReference[oaicite:2]{index=2}
      style: "normal",
      strings: 4, // bouzouki: 4 courses
      frets: base.frets,
      tuning: [...tuning], // labels under strings :contentReference[oaicite:3]{index=3}
      title: title ?? "",
      titleFontSize: base.titleFontSize,
      tuningsFontSize: base.tuningsFontSize,
      fingerTextSize: base.fingerTextSize,
      strokeWidth: base.strokeWidth,
      nutWidth: base.nutWidth,
      backgroundColor: "none",
      // helpful compactness tweaks:
      titleBottomMargin: 0,
      sidePadding: 0.18,
      fretSize: 1.35,
      fingerSize: 0.68,
      emptyStringIndicatorSize: 0.55,
      showFretMarkers: false,
    } as const;
  }, [orientation, size, title, tuning]);

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      if (!hostRef.current) return;

      // Clear previous SVG
      hostRef.current.innerHTML = "";

      // Dynamic import to avoid SSR issues (SVGuitar uses DOM APIs)
      const mod = await import("svguitar");
      if (cancelled) return;

      const { SVGuitarChord } = mod as any;

      const chart = new SVGuitarChord(hostRef.current);
      chart.configure(config).chord(chordSpec).draw();

      // Make the produced SVG responsive inside our container
      const svg = hostRef.current.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.display = "block";
      }
    }

    draw();

    return () => {
      cancelled = true;
    };
  }, [chordSpec, config]);

  // Use aspect-friendly sizing; SVG itself becomes responsive via width/height 100%
  const sizeClass =
    size === "xs" ? "w-24 h-20" : size === "sm" ? "w-32 h-24" : "w-44 h-32";

  return (
    <div className={["shrink-0", sizeClass, className ?? ""].join(" ")}>
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
