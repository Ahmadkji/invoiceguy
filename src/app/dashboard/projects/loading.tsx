export default function ProjectsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-slate-200 rounded-lg" />
          <div className="h-4 w-44 bg-slate-100 rounded-lg mt-2" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-xl" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4">
          <div className="h-10 w-full bg-slate-100 rounded-lg mb-4" />
        </div>
        <div className="divide-y divide-slate-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
