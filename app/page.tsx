import ChordFinder from "@/components/chordFinder";

export default function Home() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Irish Bouzouki (GDAE) Chord Finder (with Capo)
          </h1>
          <p className="text-sm text-muted-foreground opacity-80">
            Pick a chord + capo fret. Results are fingerings on G–D–A–E
            (low→high).
          </p>
        </header>

        <ChordFinder />
      </div>
    </main>
  );
}
