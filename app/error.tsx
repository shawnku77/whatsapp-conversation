'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="not-found"><h1>Unable to open the archive</h1><p>Please try again. If this continues, check server storage and configuration.</p><button className="primary" onClick={reset}>Try again</button></main>; }
