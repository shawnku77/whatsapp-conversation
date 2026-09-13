import { isAdmin } from '@/lib/auth';
import Login from '@/components/login';
import { loadArchive } from '@/lib/archive';
import { notFound } from 'next/navigation';
import Chat from '@/components/chat';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export default async function Conversation({ params }: { params: Promise<{ id: string }> }) { if (!await isAdmin()) return <Login />; const { id } = await params; const archive = await loadArchive(id).catch(() => null); if (!archive) notFound(); return <Chat info={archive.info} messages={archive.messages} participants={archive.participants} />; }
