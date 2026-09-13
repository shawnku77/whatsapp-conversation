import { loadArchive } from '@/lib/archive';
import { notFound } from 'next/navigation';
import Chat from '@/components/chat';
export const dynamic = 'force-dynamic';
export default async function Conversation({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const archive = await loadArchive(id).catch(() => null); if (!archive) notFound(); return <Chat info={archive.info} messages={archive.messages} participants={archive.participants} />; }
