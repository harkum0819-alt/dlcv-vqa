import { Send, Loader2 } from "lucide-react";
import { useState } from "react";

const SUGGESTIONS = [
  "What is in this image?",
  "How many people are there?",
  "What color is the object?",
  "What is the person doing?",
  "Is there any text in the image?",
  "What animal is shown?",
];

export default function QuestionInput({ question, setQuestion, onSubmit, loading, disabled }) {
  const [showSugg, setShowSugg] = useState(false);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled && !loading && question.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          tabIndex={0}
          style={{ padding: "12px 56px 12px 16px", minHeight: "80px" }}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                     text-slate-900 dark:text-slate-100 rounded-xl text-sm resize-none leading-relaxed
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all
                     cursor-text"
          placeholder="Ask anything about the image… (Enter to submit)"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setShowSugg(true)}
          onBlur={() => setTimeout(() => setShowSugg(false), 150)}
          disabled={loading}
          maxLength={500}
        />
        <button
          onClick={onSubmit}
          disabled={disabled || loading || !question.trim()}
          className="absolute right-3 bottom-3 w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700
                     disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed
                     flex items-center justify-center transition-colors shadow-sm"
        >
          {loading
            ? <Loader2 size={15} className="text-white animate-spin" />
            : <Send size={15} className={disabled || !question.trim() ? "text-slate-400" : "text-white"} />
          }
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {showSugg && SUGGESTIONS.map((s) => (
            <button
              key={s}
              onMouseDown={() => setQuestion(s)}
              className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50
                         text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900
                         border border-indigo-100 dark:border-indigo-900 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 shrink-0 ml-2">{question.length}/500</span>
      </div>
    </div>
  );
}
