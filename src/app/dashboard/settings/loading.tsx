export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-32 bg-slate-200 rounded-lg" />
        <div className="h-4 w-60 bg-slate-100 rounded-lg mt-1" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-slate-100 rounded-lg" />
              <div>
                <div className="h-5 w-28 bg-slate-200 rounded mb-1" />
                <div className="h-3 w-36 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j}>
                  <div className="h-3 w-24 bg-slate-100 rounded mb-1.5" />
                  <div className="h-10 w-full bg-slate-50 rounded-lg border border-slate-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
