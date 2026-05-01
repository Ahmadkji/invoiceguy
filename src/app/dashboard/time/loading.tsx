export default function TimeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-44 bg-slate-200 rounded-lg" />
          <div className="h-4 w-56 bg-slate-100 rounded-lg mt-2" />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-8">
        <div className="h-12 w-full bg-slate-100 rounded-xl mb-6" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-10 bg-slate-100 rounded-lg" />
          <div className="h-10 bg-slate-100 rounded-lg" />
          <div className="h-10 bg-slate-200 rounded-xl" />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-8 h-8 bg-slate-200 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-slate-200 rounded" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
