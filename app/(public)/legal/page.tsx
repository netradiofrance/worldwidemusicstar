export const metadata = {
  title: 'Legal & Terms',
  description: 'Terms of service, privacy policy and refund policy.',
};

export default function LegalPage() {
  return (
    <section className="border-b border-white/5">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="font-display uppercase text-5xl tracking-tightest mb-8">Legal &amp; Terms</h1>
        <div className="prose-wwms">
          <h2>Terms of Service</h2>
          <p>By submitting a song to WorldWide Music Star, you agree to the following terms…</p>
          <p><em>Full terms to be drafted with legal counsel before launch.</em></p>

          <h2>Privacy Policy</h2>
          <p>WorldWide Music Star collects only the email address of artists who submit a song, the IP and user-agent of voters (for anti-fraud purposes), and standard analytics. No personal data is sold or shared with third parties.</p>

          <h2>Refund Policy</h2>
          <p>The chart entry fee is non-refundable once the entry has been activated on the chart.</p>

          <h2>Contact</h2>
          <p>For any question, write to <a href="mailto:contact@worldwidemusicstar.com">contact@worldwidemusicstar.com</a>.</p>
        </div>
      </div>
    </section>
  );
}
