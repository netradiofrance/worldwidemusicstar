import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { TrackEditForm } from '@/components/admin/TrackEditForm';

export const dynamic = 'force-dynamic';

export default async function AdminTrackEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createServerClient();
  const { data: track } = await sb.from('tracks').select('*').eq('id', id).maybeSingle();
  if (!track) notFound();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display uppercase text-3xl tracking-tightest mb-6">Edit track</h1>
      <TrackEditForm track={track} />
    </div>
  );
}
