export default function Loading() {
  return (
    <main className="min-h-screen px-4 py-5">
      <div className="mx-auto grid max-w-[480px] gap-4 motion-page">
        <div className="loading-card p-4">
          <div className="loading-shimmer h-4 w-28 rounded-full" />
          <div className="loading-shimmer mt-4 h-8 w-64 max-w-full rounded-full" />
          <div className="loading-shimmer mt-3 h-4 w-96 max-w-full rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="loading-card h-24" />
          <div className="loading-card h-24" />
          <div className="loading-card h-24" />
        </div>
        <div className="loading-card h-64" />
      </div>
    </main>
  );
}
