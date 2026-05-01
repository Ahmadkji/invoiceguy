export default function InvoicesLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-9 w-36 bg-slate-200 rounded-lg" />
          <div className="h-4 w-48 bg-slate-100 rounded-lg mt-1" />
        </div>
        <div className="h-10 w-32 bg-slate-900 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl" />
              <div className="h-5 w-12 bg-slate-100 rounded-full" />
            </div>
            <div className="h-7 w-20 bg-slate-200 rounded mb-0.5" />
            <div className="h-3 w-28 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="h-10 w-full bg-slate-50 border-b border-slate-100" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-slate-50 py-4 px-5 flex items-center gap-5">
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
            <div className="flex-1" />
            <div className="h-5 w-14 bg-slate-100 rounded-full" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
