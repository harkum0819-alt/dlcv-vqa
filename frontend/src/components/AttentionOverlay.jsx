import { useState } from "react";
import { Eye, EyeOff, Info } from "lucide-react";

export default function AttentionOverlay({ originalB64, attentionB64, answer }) {
  const [showAttention, setShowAttention] = useState(true);

  if (!attentionB64) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <Info size={13} />
          <span>Attention map not available for API model (local model only)</span>
        </div>
        {originalB64 && (
          <img
            src={`data:image/jpeg;base64,${originalB64}`}
            alt="Input"
            className="w-full rounded-xl object-contain max-h-52 bg-slate-100 dark:bg-slate-800"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          GradCAM Attention Map
        </span>
        <button
          onClick={() => setShowAttention((v) => !v)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg
                     bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700
                     text-slate-600 dark:text-slate-300 transition-colors"
        >
          {showAttention ? <EyeOff size={12} /> : <Eye size={12} />}
          {showAttention ? "Hide" : "Show"} heatmap
        </button>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
        {/* Original image always underneath */}
        <img
          src={`data:image/jpeg;base64,${originalB64}`}
          alt="Original"
          className="w-full object-contain max-h-52 bg-slate-100 dark:bg-slate-800"
        />
        {/* Attention overlay */}
        {showAttention && (
          <img
            src={`data:image/png;base64,${attentionB64}`}
            alt="Attention heatmap"
            className="absolute inset-0 w-full h-full object-contain opacity-80 animate-fade-in"
          />
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
        Red/warm regions show where the model focused to answer:{" "}
        <span className="font-medium text-slate-600 dark:text-slate-300">"{answer}"</span>
      </p>
    </div>
  );
}
