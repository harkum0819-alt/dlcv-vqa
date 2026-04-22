export default function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color =
    pct >= 70 ? "bg-emerald-500" :
    pct >= 40 ? "bg-amber-400" :
                "bg-red-400";

  const label =
    pct >= 70 ? "High confidence" :
    pct >= 40 ? "Medium confidence" :
                "Low confidence";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}
