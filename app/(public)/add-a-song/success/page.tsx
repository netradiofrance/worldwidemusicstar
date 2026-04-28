import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Payment Received',
};

export default function AddSongSuccessPage() {
  return (
    <section className="min-h-[60vh] flex items-center">
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400 mb-6" size={56} />
        <h1 className="font-display uppercase text-4xl sm:text-5xl tracking-tightest mb-4">
          Payment received.
        </h1>
        <p className="text-ink-200 text-lg leading-relaxed mb-8">
          Thanks! Your chart entry is being processed. You will receive a confirmation email
          within a few minutes once the payment is fully confirmed by PayPal.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link href="/charts/all" className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3">
            View charts
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold px-6 py-3">
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}
