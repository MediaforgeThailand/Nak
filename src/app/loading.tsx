export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 py-5">
      <div className="mx-auto grid max-w-7xl gap-4 motion-page">
        <div className="overflow-hidden rounded-lg border border-white/70 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_46px_rgba(31,65,58,0.11)] backdrop-blur-2xl">
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
