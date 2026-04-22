import { Moon, Sun, Eye, Cpu } from "lucide-react";

export default function Header({ dark, toggleDark, status }) {
  const online = status?.status === "ok";

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <Eye size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">VQA</span>
            <span className="font-light text-lg text-indigo-500 ml-1">Insight</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Model status */}
          {status && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs">
              <Cpu size={13} className="text-slate-500 dark:text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {status.device?.toUpperCase() ?? "..."}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-red-400"}`} />
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleDark}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700
                       flex items-center justify-center transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-500" />}
          </button>
        </div>
      </div>
    </header>
  );
}
