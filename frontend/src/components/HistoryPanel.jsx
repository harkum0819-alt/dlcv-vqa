import { History, Trash2, MessageSquare, Clock } from "lucide-react";

function HistoryItem({ item, onSelect }) {
  const time = new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const modelShort = item.model?.split("/").pop()?.slice(0, 20) ?? "model";

  return (
    <button
      onClick={() => onSelect(item)}
      className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60
                 border border-transparent hover:border-slate-100 dark:hover:border-slate-700
                 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0 mt-0.5">
          <MessageSquare size={12} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {item.question}
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 truncate capitalize">
            → {item.answer}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={9} />{time}
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600">{modelShort}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function HistoryPanel({ history, onSelect, onClear }) {
  if (!history?.length) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[200px]">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <History size={20} className="text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No history yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Your Q&A pairs will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <History size={15} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">History</span>
          <span className="badge bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500">{history.length}</span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* List */}
      <div className="p-2 max-h-[400px] overflow-y-auto space-y-1">
        {history.map((item) => (
          <HistoryItem key={item.id} item={item} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
