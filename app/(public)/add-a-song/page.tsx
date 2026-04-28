import { AddSongForm } from '@/components/AddSongForm';

export const metadata = {
  title: 'Add a Song',
  description: 'Submit your song to the WorldWide Music Star charts. One flat fee — $99.99.',
};

export default function AddASongPage() {
  return (
    <section className="bg-ambient-red border-b border-white/5">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-[11px] font-bold uppercase tracking-widest text-brand mb-3">
          Get Charted
        </div>
        <h1 className="font-display uppercase text-5xl sm:text-6xl tracking-tightest leading-[0.95] mb-3">
          Add a song.
        </h1>
        <p className="text-ink-200 text-lg max-w-xl mb-10">
          Submit your track to the chart of your genre. One flat fee — $99.99.
          Your song competes for the monthly WorldWide Music Star award.
        </p>
        <AddSongForm />
      </div>
    </section>
  );
}
