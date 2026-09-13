import { isAdmin } from '@/lib/auth';
import { listArchives } from '@/lib/archive';
import Dashboard from '@/components/dashboard';
import Login from '@/components/login';
import { cloudStorage, storageReady } from '@/lib/storage';
export const dynamic = 'force-dynamic';
export default async function Home() {
  if (!await isAdmin()) return <Login />;
  if (!storageReady()) return <main className="not-found"><h1>Connect your private archive storage</h1><p>In your Vercel project, open Storage, create or connect a Blob store with Private access, and include the Production environment.</p><p>Make sure BLOB_READ_WRITE_TOKEN is added to this project, then redeploy. DATA_DIR is not needed on Vercel.</p><p>Your login is working. File uploads will be available once storage is connected.</p><a href="/">Check again</a></main>;
  return <Dashboard archives={await listArchives()} cloud={cloudStorage()} />;
}
