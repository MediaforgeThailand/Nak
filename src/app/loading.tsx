export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 py-5">
      <div className="mx-auto grid max-w-7xl gap-4">
        <div className="h-20 animate-pulse rounded-lg border border-border bg-surface" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-lg border border-border bg-surface" />
          <div className="h-24 animate-pulse rounded-lg border border-border bg-surface" />
          <div className="h-24 animate-pulse rounded-lg border border-border bg-surface" />
        </div>
        <div className="h-64 animate-pulse rounded-lg border border-border bg-surface" />
      </div>
    </main>
  );
}
