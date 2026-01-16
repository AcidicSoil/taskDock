import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  SkipForward,
  Settings,
  FileText,
  Activity,
  Search,
  RefreshCw,
  ChevronRight,
  Hash,
  Command,
  SquareTerminal,
  Layout,
  Save,
  X,
} from "lucide-react";

// --- Mock Data derived from ticket-action-pack.md ---
const INITIAL_STEPS = [
  {
    id: "01",
    number: 1,
    roi: 5.0,
    code: 'echo "Build tickets index"',
    originalLine: "Build tickets index",
    tool: "oracle",
  },
  {
    id: "02",
    number: 2,
    roi: 3.5,
    code: 'echo "Generate actions json"',
    originalLine: "Generate actions json",
    tool: "oracle",
  },
  {
    id: "03",
    number: 3,
    roi: 8.0,
    code: 'echo "Generate tickets PRD"',
    originalLine: "Generate tickets PRD",
    tool: "oracle",
  },
  {
    id: "04",
    number: 4,
    roi: 2.0,
    code: 'echo "Prep taskmaster inputs"',
    originalLine: "Prep taskmaster inputs",
    tool: "oracle",
  },
  {
    id: "05",
    number: 5,
    roi: 4.2,
    code: "task-master parse-prd .taskmaster/docs/prd.md",
    originalLine: "Parse PRD via TaskMaster",
    tool: "task-master",
  },
  {
    id: "06",
    number: 6,
    roi: 6.0,
    code: "task-master analyze-complexity --research",
    originalLine: "Analyze complexity",
    tool: "task-master",
  },
  {
    id: "07",
    number: 7,
    roi: 5.5,
    code: "task-master expand --all --research",
    originalLine: "Expand tasks recursively",
    tool: "task-master",
  },
  {
    id: "08",
    number: 8,
    roi: 1.0,
    code: 'echo "Prepare headless automation"',
    originalLine: "Prepare headless automation",
    tool: "oracle",
  },
  {
    id: "09",
    number: 9,
    roi: 9.0,
    code: 'if command -v gemini >/dev/null 2>&1; then\n  gemini run "Select next tasks" --write-output ".oraclepack/ticketify/next.json"\nelse\n  echo "Skipped: gemini missing"\nfi',
    originalLine: "Select next tasks (Gemini)",
    tool: "gemini",
  },
  {
    id: "10",
    number: 10,
    roi: 7.5,
    code: 'if command -v codex >/dev/null 2>&1; then\n  codex exec "Implement tasks" --write-output ".oraclepack/ticketify/codex-implement.md"\nelse\n  echo "Skipped: codex missing"\nfi',
    originalLine: "Implement tasks (Codex)",
    tool: "codex",
  },
  {
    id: "11",
    number: 11,
    roi: 7.0,
    code: 'if command -v codex >/dev/null 2>&1; then\n  codex exec "Verify changes" --write-output ".oraclepack/ticketify/codex-verify.md"\nelse\n  echo "Skipped: codex missing"\nfi',
    originalLine: "Verify changes (Codex)",
    tool: "codex",
  },
  {
    id: "12",
    number: 12,
    roi: 4.0,
    code: 'gemini run "Review outputs" --write-output ".oraclepack/ticketify/gemini-review.json"',
    originalLine: "Review outputs",
    tool: "gemini",
  },
  {
    id: "13",
    number: 13,
    roi: 6.5,
    code: 'codex exec "Prepare fixes" --write-output ".oraclepack/ticketify/codex-fixes.md"',
    originalLine: "Prepare fixes",
    tool: "codex",
  },
  {
    id: "14",
    number: 14,
    roi: 1.5,
    code: 'echo "Summarize results"',
    originalLine: "Summarize results",
    tool: "oracle",
  },
  {
    id: "15",
    number: 15,
    roi: 2.0,
    code: 'echo "Prepare release notes"',
    originalLine: "Prepare release notes",
    tool: "oracle",
  },
  {
    id: "16",
    number: 16,
    roi: 8.5,
    code: 'codex exec "Draft PR description" --write-output ".oraclepack/ticketify/PR.md"',
    originalLine: "Draft PR description",
    tool: "codex",
  },
  {
    id: "17",
    number: 17,
    roi: 1.0,
    code: 'echo "Finalize checklist"',
    originalLine: "Finalize checklist",
    tool: "oracle",
  },
  {
    id: "18",
    number: 18,
    roi: 0.5,
    code: 'echo "Post-run cleanup"',
    originalLine: "Post-run cleanup",
    tool: "oracle",
  },
  {
    id: "19",
    number: 19,
    roi: 3.0,
    code: 'echo "Audit artifacts"',
    originalLine: "Audit artifacts",
    tool: "oracle",
  },
  {
    id: "20",
    number: 20,
    roi: 0.0,
    code: 'echo "Done"',
    originalLine: "Done",
    tool: "oracle",
  },
];

const COLORS = {
  bg: "bg-slate-950",
  card: "bg-slate-900",
  border: "border-slate-800",
  text: "text-slate-300",
  highlight: "text-sky-400",
  success: "text-emerald-400",
  error: "text-rose-400",
  warning: "text-amber-400",
  muted: "text-slate-500",
};

const STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
  SKIPPED: "skipped",
};

// --- Components ---

const StatusIcon = ({ status }) => {
  switch (status) {
    case STATUS.RUNNING:
      return <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />;
    case STATUS.SUCCESS:
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case STATUS.FAILED:
      return <XCircle className="w-4 h-4 text-rose-400" />;
    case STATUS.SKIPPED:
      return <SkipForward className="w-4 h-4 text-slate-500" />;
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-slate-700" />;
  }
};

const ToolBadge = ({ tool }) => {
  const colors = {
    oracle: "bg-slate-800 text-slate-400",
    gemini: "bg-sky-950 text-sky-400 border border-sky-900",
    codex: "bg-violet-950 text-violet-400 border border-violet-900",
    "task-master": "bg-amber-950 text-amber-400 border border-amber-900",
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-mono tracking-wider ${
        colors[tool] || colors.oracle
      }`}
    >
      {tool}
    </span>
  );
};

const CodeBlock = ({ code }) => (
  <div className="font-mono text-sm bg-slate-950 p-4 rounded-md border border-slate-800 overflow-x-auto">
    <pre>
      {code.split("\n").map((line, i) => (
        <div key={i} className="flex">
          <span className="text-slate-700 w-8 select-none text-right pr-3">
            {i + 1}
          </span>
          <span
            className={
              line.startsWith("#") ? "text-slate-500 italic" : "text-slate-300"
            }
          >
            {line
              .replace(
                /(echo|gemini|codex|task-master|if|else|fi|then)/g,
                (match) =>
                  `<span class="text-sky-400 font-bold">${match}</span>`
              )
              .split(/(<[^>]+>[^<]+<\/[^>]+>)/g)
              .map((part, j) => {
                if (part.startsWith("<"))
                  return (
                    <span key={j} dangerouslySetInnerHTML={{ __html: part }} />
                  );
                return part;
              })}
          </span>
        </div>
      ))}
    </pre>
  </div>
);

const OverridesModal = ({ isOpen, onClose, overrides, setOverrides }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 w-96 rounded-lg shadow-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Runtime Overrides
        </h2>
        <div className="space-y-3">
          {Object.keys(overrides).map((key) => (
            <label
              key={key}
              className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={overrides[key]}
                onChange={() =>
                  setOverrides((prev) => ({ ...prev, [key]: !prev[key] }))
                }
                className="w-4 h-4 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-900"
              />
              <span className="text-slate-300 capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // State
  const [steps, setSteps] = useState(
    INITIAL_STEPS.map((s) => ({ ...s, status: STATUS.PENDING }))
  );
  const [selectedStepId, setSelectedStepId] = useState("01");
  const [roiThreshold, setRoiThreshold] = useState(0);
  const [roiMode, setRoiMode] = useState("over"); // 'over' | 'under'
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([
    "Welcome to OraclePack TUI v1.0.0",
    "Loaded pack: ticket-action-pack.md",
  ]);
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrides, setOverrides] = useState({
    dryRun: false,
    verbose: true,
    stopOnFail: true,
    forceJson: false,
  });

  const logEndRef = useRef(null);

  // Computed
  const filteredSteps = steps.filter((step) => {
    if (roiMode === "over") return step.roi >= roiThreshold;
    return step.roi < roiThreshold;
  });

  const selectedStep = steps.find((s) => s.id === selectedStepId) || steps[0];

  // Effects
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Handlers
  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: STATUS.PENDING })));
    setLogs((prev) => [...prev, "--- RESET ---"]);
  };

  const runSimulation = async () => {
    if (isRunning) return;
    setIsRunning(true);
    addLog(`Starting execution (ROI ${roiMode} ${roiThreshold})...`);

    // Create a copy of current filtered IDs to execute
    const executionQueue = filteredSteps.map((s) => s.id);

    for (const stepId of executionQueue) {
      // Check if we should stop (simulated check)
      if (!isRunning && executionQueue.indexOf(stepId) > 0) break;

      // Update to running
      setSteps((prev) =>
        prev.map((s) =>
          s.id === stepId ? { ...s, status: STATUS.RUNNING } : s
        )
      );
      setSelectedStepId(stepId);

      const currentStep = steps.find((s) => s.id === stepId);
      addLog(
        `Step ${currentStep.id}: Running "${currentStep.originalLine}"...`
      );

      // Simulated delay based on "complexity"
      const delay = Math.random() * 1000 + 500;
      await new Promise((r) => setTimeout(r, delay));

      // Determine outcome (mostly success, some skips/fails for flavor)
      let outcome = STATUS.SUCCESS;
      if (currentStep.tool === "codex" && Math.random() > 0.8)
        outcome = STATUS.SKIPPED; // Simulate missing tool occasionally
      if (overrides.dryRun) outcome = STATUS.SUCCESS;

      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, status: outcome } : s))
      );

      if (outcome === STATUS.SKIPPED)
        addLog(
          `Step ${currentStep.id}: Skipped (Tool missing or condition met)`
        );
      else if (outcome === STATUS.FAILED) {
        addLog(`Step ${currentStep.id}: Failed!`);
        if (overrides.stopOnFail) {
          addLog("Execution stopped due to failure.");
          setIsRunning(false);
          return;
        }
      } else {
        addLog(`Step ${currentStep.id}: Success (Took ${Math.floor(delay)}ms)`);
      }
    }

    setIsRunning(false);
    addLog("Pack execution completed.");
  };

  return (
    <div
      className={`flex h-screen w-full ${COLORS.bg} ${COLORS.text} font-sans overflow-hidden selection:bg-sky-900 selection:text-white`}
    >
      {/* Sidebar - Step List */}
      <div className="w-80 flex flex-col border-r border-slate-800 bg-slate-950/50">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <SquareTerminal className="w-5 h-5 text-sky-500" />
            <h1 className="font-bold text-slate-100 tracking-tight">
              OraclePack
            </h1>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            ticket-action-pack.md
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 bg-slate-900/50 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              ROI Filter
            </span>
            <div className="flex gap-1 text-[10px] font-mono">
              <button
                onClick={() => setRoiMode("over")}
                className={`px-2 py-0.5 rounded ${
                  roiMode === "over"
                    ? "bg-sky-900 text-sky-300"
                    : "bg-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                OVER
              </button>
              <button
                onClick={() => setRoiMode("under")}
                className={`px-2 py-0.5 rounded ${
                  roiMode === "under"
                    ? "bg-sky-900 text-sky-300"
                    : "bg-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                UNDER
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={roiThreshold}
              onChange={(e) => setRoiThreshold(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <span className="text-xs font-mono w-8 text-right text-sky-400">
              {roiThreshold.toFixed(1)}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>
              Showing {filteredSteps.length}/{steps.length} steps
            </span>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredSteps.map((step) => (
            <button
              key={step.id}
              onClick={() => setSelectedStepId(step.id)}
              className={`w-full text-left p-3 border-b border-slate-800/50 flex items-start gap-3 transition-all hover:bg-slate-900/80 group ${
                selectedStepId === step.id
                  ? "bg-slate-900 border-l-2 border-l-sky-500"
                  : "border-l-2 border-l-transparent"
              }`}
            >
              <div className="mt-0.5">
                <StatusIcon status={step.status} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-mono font-bold ${
                      selectedStepId === step.id
                        ? "text-sky-400"
                        : "text-slate-500"
                    }`}
                  >
                    {step.id}
                  </span>
                  <div className="flex gap-1">
                    <span
                      className={`text-[10px] font-mono px-1 rounded ${
                        step.roi >= 5
                          ? "bg-emerald-950 text-emerald-500"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      ROI {step.roi}
                    </span>
                  </div>
                </div>
                <div
                  className={`text-sm truncate ${
                    selectedStepId === step.id
                      ? "text-slate-200"
                      : "text-slate-400 group-hover:text-slate-300"
                  }`}
                >
                  {step.originalLine}
                </div>
              </div>
            </button>
          ))}
          {filteredSteps.length === 0 && (
            <div className="p-8 text-center text-slate-600 text-sm italic">
              No steps match current filters.
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded font-bold text-sm transition-all ${
              isRunning
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/20"
            }`}
          >
            {isRunning ? (
              "Running..."
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Run Pack
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            disabled={isRunning}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            title="Reset State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-14 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Pack Viewer
            </h2>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex gap-4 text-xs font-mono text-slate-500">
              <span>
                Total: <span className="text-slate-300">{steps.length}</span>
              </span>
              <span>
                Success:{" "}
                <span className="text-emerald-400">
                  {steps.filter((s) => s.status === STATUS.SUCCESS).length}
                </span>
              </span>
              <span>
                Failed:{" "}
                <span className="text-rose-400">
                  {steps.filter((s) => s.status === STATUS.FAILED).length}
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOverrides(true)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-sky-400 transition-colors bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800"
            >
              <Settings className="w-3 h-3" />
              Overrides{" "}
              {Object.values(overrides).some(Boolean) && (
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Split View */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Step Details Pane */}
          <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto p-6 bg-slate-950">
            <div className="max-w-3xl w-full mx-auto space-y-6">
              {/* Step Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-white tracking-tight">
                      Step {selectedStep.id}
                    </span>
                    <StatusIcon status={selectedStep.status} />
                    <span
                      className={`text-sm uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 ${
                        selectedStep.status === STATUS.PENDING
                          ? "text-slate-500"
                          : selectedStep.status === STATUS.SUCCESS
                          ? "text-emerald-500 border-emerald-900/30"
                          : selectedStep.status === STATUS.FAILED
                          ? "text-rose-500 border-rose-900/30"
                          : selectedStep.status === STATUS.RUNNING
                          ? "text-amber-500 border-amber-900/30"
                          : "text-slate-500"
                      }`}
                    >
                      {selectedStep.status}
                    </span>
                  </div>
                  <h3 className="text-lg text-slate-300">
                    {selectedStep.originalLine}
                  </h3>
                </div>
                <div className="text-right space-y-2">
                  <ToolBadge tool={selectedStep.tool} />
                  <div className="text-xs font-mono text-slate-500">
                    ROI: {selectedStep.roi.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Code Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Hash className="w-3 h-3" /> Bash Source
                  </span>
                  <button className="text-xs text-sky-500 hover:text-sky-400 flex items-center gap-1">
                    <Command className="w-3 h-3" /> Copy
                  </button>
                </div>
                <CodeBlock code={selectedStep.code} />
              </div>

              {/* Artifacts / Expectations (Mock) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded p-4 border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Layout className="w-3 h-3" /> Expected Output
                  </h4>
                  <ul className="text-xs space-y-2 text-slate-400 font-mono">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                      Exit Code: 0
                    </li>
                    {selectedStep.code.includes("--write-output") && (
                      <li className="flex items-center gap-2 text-sky-400">
                        <Save className="w-3 h-3" />
                        Generates artifact
                      </li>
                    )}
                  </ul>
                </div>
                <div className="bg-slate-900/50 rounded p-4 border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-500">Est. Duration</div>
                    <div className="text-right text-slate-300">~1.2s</div>
                    <div className="text-slate-500">Retries</div>
                    <div className="text-right text-slate-300">0</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal / Logs Pane */}
          <div className="h-64 lg:h-auto lg:w-2/5 flex flex-col bg-[#0d1117]">
            <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 pl-2">
                <Terminal className="w-3 h-3" /> Output Log
              </span>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 px-2"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className="break-all whitespace-pre-wrap">
                  {log.startsWith("[") ? (
                    <>
                      <span className="text-slate-600">
                        {log.substring(0, log.indexOf("]") + 1)}
                      </span>
                      <span
                        className={
                          log.includes("Failed")
                            ? "text-rose-400"
                            : log.includes("Success")
                            ? "text-emerald-400"
                            : log.includes("Skipped")
                            ? "text-amber-400"
                            : log.includes("Running")
                            ? "text-sky-300"
                            : "text-slate-300"
                        }
                      >
                        {log.substring(log.indexOf("]") + 1)}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500">{log}</span>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
              {isRunning && (
                <div className="flex items-center gap-2 text-slate-500 mt-2">
                  <span className="w-2 h-4 bg-sky-500/50 animate-pulse block" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <OverridesModal
        isOpen={showOverrides}
        onClose={() => setShowOverrides(false)}
        overrides={overrides}
        setOverrides={setOverrides}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
