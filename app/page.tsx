import { isAdmin } from '@/lib/auth';
import { listArchives } from '@/lib/archive';
import Dashboard from '@/components/dashboard';
import Login from '@/components/login';
export const dynamic = 'force-dynamic';
export default async function Home() { return await isAdmin() ? <Dashboard archives={await listArchives()} /> : <Login />; }
