import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded bg-white p-8 shadow">
        <h2 className="text-2xl font-bold">MapleMind</h2>
        <p className="mt-2 text-slate-600">A personalized AI study companion with live competition and rankings.</p>
        <div className="mt-4">
          <Link href="/auth" className="rounded bg-sky-600 px-4 py-2 text-white">Get Started</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded bg-white p-6 shadow">Simple tutor demo</div>
        <div className="rounded bg-white p-6 shadow">Leaderboard / Competition</div>
      </section>
    </div>
  );
}
