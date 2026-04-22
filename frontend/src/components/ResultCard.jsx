import { Clock, Cpu, Sparkles, AlertTriangle } from "lucide-react";
import ConfidenceBar from "./ConfidenceBar";
import AttentionOverlay from "./AttentionOverlay";

export default function ResultCard({ result, loading }) {
  if (loading) {
    return (
      <div className="card p-6 animate-pulse space-y-4">
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (!result) return null;

  const isError = result.error && result.error !== "token_missing";
  const modelShort = result.model?.split("/").pop() ?? "unknown";

  return (
    <div className="card p-6 space-y-5 animate-slide-up">
      {/* Question */}
      <div>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Question</p>
        <p className="text-slate-800 dark:text-slate-100 font-medium">{result.question}</p>
      </div>

      {/* Answer */}
      <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-indigo-400 mb-1">Answer</p>
            {isError ? (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={14} />
                <span className="text-sm">{result.answer}</span>
              </div>
            ) : (
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 capitalize">
                {result.answer}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Confidence */}
      {!isError && <ConfidenceBar value={result.confidence} />}

      {/* Metadata */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <Cpu size={10} /> {modelShort}
        </span>
        <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <Clock size={10} /> {result.elapsed_seconds}s
        </span>
        {result.device && (
          <span className={`badge ${result.device === "cuda"
            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
            : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
            {result.device.toUpperCase()}
          </span>
        )}
      </div>

      {/* Attention map */}
      {result.image_b64 && (
        <div>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
            Visual Attention
          </p>
          <AttentionOverlay
            originalB64={result.image_b64}
            attentionB64={result.attention_map}
            answer={result.answer}
          />
        </div>
      )}
    </div>
  );
}
