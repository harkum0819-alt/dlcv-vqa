import { useState, useEffect, useCallback } from "react";
import { useTheme } from "./hooks/useTheme";
import { api } from "./api";
import Header from "./components/Header";
import ImageUpload from "./components/ImageUpload";
import QuestionInput from "./components/QuestionInput";
import ModeSelector from "./components/ModeSelector";
import ResultCard from "./components/ResultCard";
import CompareView from "./components/CompareView";
import HistoryPanel from "./components/HistoryPanel";
import ChatView from "./components/ChatView";

const SESSION_ID = `vqa-${Math.random().toString(36).slice(2, 9)}`;

export default function App() {
  const { dark, toggle } = useTheme();

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("local");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  // Poll backend status
  useEffect(() => {
    api.status()
      .then(setStatus)
      .catch(() => setStatus(null));
    const t = setInterval(() => {
      api.status().then(setStatus).catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  // Load history on mount
  useEffect(() => {
    api.history(SESSION_ID).then(setHistory).catch(() => {});
  }, []);

  const handleImage = useCallback((file) => {
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setCompareResult(null);
    setError(null);
  }, []);

  const handleClear = useCallback(() => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setCompareResult(null);
    setError(null);
    setQuestion("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!image || !question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCompareResult(null);

    try {
      if (mode === "local") {
        const res = await api.predict(image, question, SESSION_ID);
        setResult({ ...res, question });
      } else if (mode === "advanced") {
        const res = await api.predictAdvanced(image, question, SESSION_ID);
        setResult({ ...res, question });
      } else {
        const res = await api.compare(image, question, SESSION_ID);
        setCompareResult(res);
      }
      api.history(SESSION_ID).then(setHistory).catch(() => {});
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err.message ?? "Request failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [image, question, mode, loading]);

  const handleHistorySelect = useCallback((item) => {
    setQuestion(item.question);
    setResult(item);
    setCompareResult(null);
  }, []);

  const handleClearHistory = useCallback(async () => {
    await api.clearHistory(SESSION_ID);
    setHistory([]);
  }, []);

  const canSubmit = !!image && question.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header dark={dark} toggleDark={toggle} status={status} />

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500 text-white py-10 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Visual Question Answering
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Upload any image and ask a question in natural language.
            Powered by BLIP + GradCAM explainability.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {["Deep Learning", "Computer Vision", "Multimodal AI", "Explainable AI"].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-white/15 text-xs font-medium backdrop-blur-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Input panel ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card p-5 space-y-4">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Step 1 · Upload Image
              </h2>
              <ImageUpload image={image} preview={preview} onImage={handleImage} onClear={handleClear} />
            </div>

            <div className="card p-5 space-y-4">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Step 2 · Choose Model
              </h2>
              <ModeSelector mode={mode} setMode={setMode} />
            </div>

            {mode !== "chat" && (
              <div className="card p-5 space-y-4">
                <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Step 3 · Ask a Question
                </h2>
                <QuestionInput
                  question={question}
                  setQuestion={setQuestion}
                  onSubmit={handleSubmit}
                  loading={loading}
                  disabled={!canSubmit}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || loading}
                  className="btn-primary w-full justify-center"
                >
                  {loading ? "Analyzing…" : "Get Answer"}
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {!status && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <p className="font-semibold">Backend not reachable</p>
                <p>Start it: <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded font-mono">cd backend && python main.py</code></p>
              </div>
            )}
          </div>

          {/* ── Right: Results ── */}
          <div className="lg:col-span-2 space-y-6">
            {mode === "chat" ? (
              <ChatView image={image} preview={preview} />
            ) : mode === "compare" ? (
              <CompareView result={compareResult} loading={loading} />
            ) : (
              <ResultCard result={result} loading={loading} />
            )}

            {!result && !compareResult && !loading && (
              <div className="card p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50 flex items-center justify-center text-4xl">
                  🔍
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                    Ready to Answer
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                    Upload an image, pick a model, type a question, and hit "Get Answer".
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-xs text-center mt-2">
                  {[
                    { icon: "🖼️", label: "Upload any image" },
                    { icon: "❓", label: "Ask in plain English" },
                    { icon: "🧠", label: "See AI reasoning" },
                  ].map(({ icon, label }) => (
                    <div key={label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                      <div className="text-2xl">{icon}</div>
                      <div className="text-slate-500 dark:text-slate-400">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <HistoryPanel
              history={history}
              onSelect={handleHistorySelect}
              onClear={handleClearHistory}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-100 dark:border-slate-800 py-4 px-4 text-center">
        <p className="text-xs text-slate-400">
          VQA-Insight · Deep Learning with Computer Vision ·{" "}
          <span className="text-indigo-500 font-medium">BLIP + GradCAM</span>
        </p>
      </footer>
    </div>
  );
}
