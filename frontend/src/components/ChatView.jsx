import { useState, useRef, useEffect } from "react";
import { Send, Loader2, RotateCcw, Bot, User, Sparkles, Info } from "lucide-react";
import { api } from "../api";

function Bubble({ msg, isUser }) {
  const pct = Math.round((msg.confidence ?? 0) * 100);
  const confColor = pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-red-400";

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 animate-slide-up">
        <div className="max-w-[75%] bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm">
          <p className="text-sm leading-relaxed">{msg.content}</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0 mt-auto">
          <User size={13} className="text-indigo-600 dark:text-indigo-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 animate-slide-up">
      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-auto">
        <Bot size={13} className="text-slate-500 dark:text-slate-400" />
      </div>
      <div className="max-w-[75%] space-y-1.5">
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={11} className="text-indigo-400" />
            <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-wide">Answer</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize leading-relaxed">
            {msg.content}
          </p>
        </div>
        {msg.confidence !== undefined && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400"
                }`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className={`text-[10px] font-semibold ${confColor}`}>{pct}%</span>
            {msg.elapsed && (
              <span className="text-[10px] text-slate-400">{msg.elapsed}s</span>
            )}
          </div>
        )}
        {msg.attention_map && (
          <div className="px-1">
            <img
              src={`data:image/png;base64,${msg.attention_map}`}
              alt="Attention heatmap"
              className="w-full max-h-28 object-contain rounded-lg border border-slate-100 dark:border-slate-700"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">GradCAM attention</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        <Bot size={13} className="text-slate-400" />
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "What is in this image?",
  "What color is the main subject?",
  "How many objects are visible?",
  "Where was this photo taken?",
  "What is the animal doing?",
  "Is this natural or man-made?",
  "What is the background?",
  "What time of day is shown?",
];

export default function ChatView({ image, preview }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [chatId, setChatId]       = useState(null);
  const [error, setError]         = useState(null);
  const [showSugg, setShowSugg]   = useState(true);
  const bottomRef                  = useRef(null);
  const inputRef                   = useRef(null);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Reset when image changes
  useEffect(() => {
    setMessages([]);
    setChatId(null);
    setError(null);
    setShowSugg(true);
    setInput("");
  }, [image]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || !image || loading) return;

    setInput("");
    setShowSugg(false);
    setError(null);

    const userMsg = { id: Date.now(), role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      let data;
      if (!chatId) {
        data = await api.chatFirst(image, q);
        setChatId(data.chat_id);
      } else {
        data = await api.chatFollowUp(chatId, q);
      }

      setMessages((prev) => [...prev, {
        id:           data.ai_msg.id,
        role:         "assistant",
        content:      data.ai_msg.content,
        confidence:   data.ai_msg.confidence,
        attention_map: data.ai_msg.attention_map,
        elapsed:      data.ai_msg.elapsed,
      }]);
    } catch (err) {
      setError(err?.response?.data?.detail ?? "Request failed. Is the backend running?");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const reset = async () => {
    if (chatId) await api.clearChat(chatId).catch(() => {});
    setMessages([]);
    setChatId(null);
    setError(null);
    setShowSugg(true);
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!image) {
    return (
      <div className="card p-10 flex flex-col items-center justify-center text-center space-y-3 min-h-[400px]">
        <div className="text-4xl">💬</div>
        <p className="font-semibold text-slate-700 dark:text-slate-300">Upload an image to start chatting</p>
        <p className="text-sm text-slate-400 max-w-xs">
          Chat mode lets you ask multiple follow-up questions about the same image in a natural conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col overflow-hidden" style={{ height: "640px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Visual Chat
          </span>
          {messages.length > 0 && (
            <span className="badge bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500">
              {Math.ceil(messages.length / 2)} turn{messages.length > 2 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Thumbnail */}
          {preview && (
            <img src={preview} alt="Current" className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
          )}
          {messages.length > 0 && (
            <button
              onClick={reset}
              className="btn-secondary py-1.5 px-2.5 text-xs"
              title="New conversation"
            >
              <RotateCcw size={12} /> New Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50 flex items-center justify-center text-2xl">
              🔍
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">Ask anything about the image</p>
              <p className="text-xs text-slate-400 mt-1">Ask multiple questions in a natural conversation flow</p>
            </div>
            <div className="flex items-start gap-2 text-left max-w-xs p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
              <Info size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-semibold">Tip:</span> Ask self-contained questions about what you see.
                <br/>✅ <em>"What color is the butterfly?"</em>
                <br/>❌ <em>"What color is it?"</em> (BLIP can't resolve pronouns)
              </p>
            </div>
          </div>
        )}

        {/* Conversation bubbles */}
        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} isUser={msg.role === "user"} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div className="text-xs text-red-500 dark:text-red-400 px-2 py-1 bg-red-50 dark:bg-red-950/30 rounded-lg">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {showSugg && messages.length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800
                         hover:bg-indigo-50 dark:hover:bg-indigo-950/40
                         text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400
                         border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
            maxLength={400}
            placeholder="Ask a follow-up question…"
            style={{ resize: "none", padding: "10px 14px" }}
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                       text-slate-900 dark:text-slate-100 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700
                       disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed
                       flex items-center justify-center transition-colors shadow-sm shrink-0 self-end"
          >
            {loading
              ? <Loader2 size={16} className="text-white animate-spin" />
              : <Send size={16} className={!input.trim() ? "text-slate-400" : "text-white"} />
            }
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
          Enter to send · Use full questions e.g. <em>"What color is the butterfly?"</em>
        </p>
      </div>
    </div>
  );
}
