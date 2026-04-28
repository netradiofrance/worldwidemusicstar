import { TrackEditForm } from '@/components/admin/TrackEditForm';

export const dynamic = 'force-dynamic';

export default function AdminTrackNewPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display uppercase text-3xl tracking-tightest mb-2">Add manual entry</h1>
      <p className="text-ink-300 mb-6">Use this to add an artist directly without going through PayPal.</p>
      <TrackEditForm track={null} />
    </div>
  );
}
