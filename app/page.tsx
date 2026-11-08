import ChordFinder from "@/components/chordFinder";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Irish Bouzouki Chord Finder
          </h1>
          <p className="text-sm opacity-80">
            Add your song&apos;s chords, pick GDAE or GDAD tuning, then slide
            the capo to find the most comfortable position.
          </p>
        </header>

        <ChordFinder />
      </div>
    </main>
  );
}
