export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-32 bg-slate-100 rounded-lg mt-2" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="h-10 w-10 bg-slate-100 rounded-xl mb-3" />
            <div className="h-6 w-16 bg-slate-200 rounded mb-1" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}
