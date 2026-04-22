import { Zap, Cloud, GitCompare, MessageSquare } from "lucide-react";

const MODES = [
  { id: "local",    icon: Zap,           label: "Local",    sub: "BLIP · GPU",    color: "indigo" },
  { id: "advanced", icon: Cloud,         label: "Advanced", sub: "ViLT · API",    color: "purple" },
  { id: "compare",  icon: GitCompare,    label: "Compare",  sub: "Both models",   color: "rose"   },
  { id: "chat",     icon: MessageSquare, label: "Chat",     sub: "Multi-turn",    color: "emerald" },
];

const COLORS = {
  indigo:  { active: "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900",  inactive: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800", icon: "text-indigo-300"  },
  purple:  { active: "bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-purple-900",  inactive: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800", icon: "text-purple-300"  },
  rose:    { active: "bg-rose-500   text-white shadow-md shadow-rose-200   dark:shadow-rose-900",    inactive: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800", icon: "text-rose-300"    },
  emerald: { active: "bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900", inactive: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800", icon: "text-emerald-300" },
};

export default function ModeSelector({ mode, setMode }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
      {MODES.map(({ id, icon: Icon, label, sub, color }) => {
        const active = mode === id;
        const c = COLORS[color];
        return (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl text-center transition-all duration-200
                        ${active ? c.active : c.inactive}`}
          >
            <Icon size={15} className={active ? c.icon : ""} />
            <span className="text-xs font-semibold leading-none">{label}</span>
            <span className={`text-[10px] leading-none ${active ? "opacity-70" : "text-slate-400 dark:text-slate-500"}`}>
              {sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}
