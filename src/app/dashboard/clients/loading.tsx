export default function ClientsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-slate-200 rounded-lg" />
          <div className="h-4 w-52 bg-slate-100 rounded-lg mt-2" />
        </div>
        <div className="h-10 w-28 bg-slate-200 rounded-xl" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-200 rounded-xl" />
              <div className="text-right">
                <div className="h-3 w-16 bg-slate-100 rounded mb-1" />
                <div className="h-4 w-20 bg-slate-200 rounded" />
              </div>
            </div>
            <div className="h-5 w-28 bg-slate-200 rounded mb-1" />
            <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
            <div className="border-t border-slate-50 pt-3 space-y-2">
              <div className="h-3 w-32 bg-slate-100 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
