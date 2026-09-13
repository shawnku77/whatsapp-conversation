import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'PropertyLab · Conversation Archive', description: 'Your conversations, kept in context.', robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
