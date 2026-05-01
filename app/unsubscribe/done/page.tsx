export default function UnsubscribeDonePage() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: 520, width: '100%', background: '#111', borderRadius: 16, padding: '40px 32px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h1 style={{ fontFamily: 'Anton, Impact, sans-serif', fontSize: 32, lineHeight: 1.05, margin: '0 0 16px', color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
          You're unsubscribed
        </h1>
        <p style={{ color: '#C9C9C9', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px' }}>
          You will not receive any more registration reminders from WorldWide Music Star.
        </p>
        <p style={{ color: '#9A9A9A', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Changed your mind? Just start a new registration and we'll be back in touch.
        </p>
      </div>
    </div>
  );
}
