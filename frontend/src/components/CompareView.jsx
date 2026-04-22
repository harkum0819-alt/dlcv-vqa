import { Zap, Cloud, Loader2 } from "lucide-react";
import ConfidenceBar from "./ConfidenceBar";
import AttentionOverlay from "./AttentionOverlay";

function ModelPanel({ label, icon: Icon, color, data, loading }) {
  if (loading) {
    return (
      <div className="card p-5 space-y-3 animate-pulse">
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
      </div>
    );
  }

  if (!data) return null;

  const modelShort = data.model?.split("/").pop() ?? "unknown";
  return (
    <div className="card p-5 space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={14} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{modelShort}</p>
        </div>
      </div>

      {/* Answer */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <p className="text-xs text-slate-400 mb-1">Answer</p>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize">
          {data.answer ?? "—"}
        </p>
      </div>

      {/* Confidence */}
      <ConfidenceBar value={data.confidence} />

      {/* Attention */}
      {data.attention_map && (
        <AttentionOverlay
          originalB64={null}
          attentionB64={data.attention_map}
          answer={data.answer}
        />
      )}
    </div>
  );
}

export default function CompareView({ result, loading }) {
  if (!result && !loading) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Model Comparison</h3>
        {loading && <Loader2 size={14} className="animate-spin text-indigo-500" />}
      </div>

      {result?.question && (
        <div className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300">
          <span className="text-slate-400 mr-2">Q:</span>{result.question}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ModelPanel
          label="Local — BLIP"
          icon={Zap}
          color="bg-indigo-500"
          data={result?.local}
          loading={loading}
        />
        <ModelPanel
          label="Advanced — API"
          icon={Cloud}
          color="bg-purple-500"
          data={result?.advanced}
          loading={loading}
        />
      </div>

      {result && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Total time: <span className="font-medium">{result.elapsed_seconds}s</span> · Both models ran in parallel
        </p>
      )}
    </div>
  );
}
