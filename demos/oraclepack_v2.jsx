import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal, Play, CheckCircle2, XCircle, AlertCircle, SkipForward,
  Settings, FileText, Activity, Search, RefreshCw, ChevronRight,
  Hash, Command, SquareTerminal, Layout, Save, X, Plus, Trash2,
  Move, Link as LinkIcon, Edit3, Box, Layers, Download
} from 'lucide-react';

// --- Constants & Mock Data ---

const INITIAL_STEPS = [
  { id: '01', number: 1, roi: 5.0, code: 'echo "Build tickets index"', originalLine: 'Build tickets index', tool: 'oracle' },
  { id: '02', number: 2, roi: 3.5, code: 'echo "Generate actions json"', originalLine: 'Generate actions json', tool: 'oracle' },
  { id: '03', number: 3, roi: 8.0, code: 'echo "Generate tickets PRD"', originalLine: 'Generate tickets PRD', tool: 'oracle' },
  { id: '04', number: 4, roi: 2.0, code: 'echo "Prep taskmaster inputs"', originalLine: 'Prep taskmaster inputs', tool: 'oracle' },
  { id: '05', number: 5, roi: 4.2, code: 'task-master parse-prd .taskmaster/docs/prd.md', originalLine: 'Parse PRD via TaskMaster', tool: 'task-master' },
  { id: '06', number: 6, roi: 6.0, code: 'task-master analyze-complexity --research', originalLine: 'Analyze complexity', tool: 'task-master' },
  { id: '07', number: 7, roi: 5.5, code: 'task-master expand --all --research', originalLine: 'Expand tasks recursively', tool: 'task-master' },
  { id: '08', number: 8, roi: 1.0, code: 'echo "Prepare headless automation"', originalLine: 'Prepare headless automation', tool: 'oracle' },
  { id: '09', number: 9, roi: 9.0, code: 'if command -v gemini >/dev/null 2>&1; then\n  gemini run "Select next tasks" --write-output ".oraclepack/ticketify/next.json"\nelse\n  echo "Skipped: gemini missing"\nfi', originalLine: 'Select next tasks (Gemini)', tool: 'gemini' },
  { id: '10', number: 10, roi: 7.5, code: 'if command -v codex >/dev/null 2>&1; then\n  codex exec "Implement tasks" --write-output ".oraclepack/ticketify/codex-implement.md"\nelse\n  echo "Skipped: codex missing"\nfi', originalLine: 'Implement tasks (Codex)', tool: 'codex' },
];

const COLORS = {
  bg: 'bg-slate-950',
  card: 'bg-slate-900',
  border: 'border-slate-800',
  text: 'text-slate-300',
  highlight: 'text-sky-400',
  success: 'text-emerald-400',
  error: 'text-rose-400',
  warning: 'text-amber-400',
  muted: 'text-slate-500',
};

const STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};

// --- Shared Components ---

const StatusIcon = ({ status }) => {
  switch (status) {
    case STATUS.RUNNING: return <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />;
    case STATUS.SUCCESS: return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case STATUS.FAILED: return <XCircle className="w-4 h-4 text-rose-400" />;
    case STATUS.SKIPPED: return <SkipForward className="w-4 h-4 text-slate-500" />;
    default: return <div className="w-4 h-4 rounded-full border-2 border-slate-700" />;
  }
};

const ToolBadge = ({ tool }) => {
  const colors = {
    oracle: 'bg-slate-800 text-slate-400',
    gemini: 'bg-sky-950 text-sky-400 border border-sky-900',
    codex: 'bg-violet-950 text-violet-400 border border-violet-900',
    'task-master': 'bg-amber-950 text-amber-400 border border-amber-900',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-mono tracking-wider ${colors[tool] || colors.oracle}`}>
      {tool}
    </span>
  );
};

const CodeBlock = ({ code }) => (
  <div className="font-mono text-sm bg-slate-950 p-4 rounded-md border border-slate-800 overflow-x-auto">
    <pre>
      {code.split('\n').map((line, i) => (
        <div key={i} className="flex">
          <span className="text-slate-700 w-8 select-none text-right pr-3">{i + 1}</span>
          <span className={line.startsWith('#') ? 'text-slate-500 italic' : 'text-slate-300'}>
            {line.replace(/(echo|gemini|codex|task-master|if|else|fi|then)/g, (match) =>
              `<span class="text-sky-400 font-bold">${match}</span>`
            ).split(/(<[^>]+>[^<]+<\/[^>]+>)/g).map((part, j) => {
              if (part.startsWith('<')) return <span key={j} dangerouslySetInnerHTML={{ __html: part }} />;
              return part;
            })}
          </span>
        </div>
      ))}
    </pre>
  </div>
);

// --- Sub-Views ---

const RunnerView = () => {
  // State from original App component
  const [steps, setSteps] = useState(INITIAL_STEPS.map(s => ({ ...s, status: STATUS.PENDING })));
  const [selectedStepId, setSelectedStepId] = useState('01');
  const [roiThreshold, setRoiThreshold] = useState(0);
  const [roiMode, setRoiMode] = useState('over');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState(['Welcome to OraclePack TUI v1.0.0', 'Loaded pack: ticket-action-pack.md']);

  const logEndRef = useRef(null);
  const filteredSteps = steps.filter(step => {
    if (roiMode === 'over') return step.roi >= roiThreshold;
    return step.roi < roiThreshold;
  });
  const selectedStep = steps.find(s => s.id === selectedStepId) || steps[0];

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: STATUS.PENDING })));
    setLogs(prev => [...prev, '--- RESET ---']);
  };

  const runSimulation = async () => {
    if (isRunning) return;
    setIsRunning(true);
    addLog(`Starting execution (ROI ${roiMode} ${roiThreshold})...`);

    const executionQueue = filteredSteps.map(s => s.id);

    for (const stepId of executionQueue) {
      if (!isRunning && executionQueue.indexOf(stepId) > 0) break; // Simple simulation break check

      setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: STATUS.RUNNING } : s));
      setSelectedStepId(stepId);

      const currentStep = steps.find(s => s.id === stepId);
      addLog(`Step ${currentStep.id}: Running "${currentStep.originalLine}"...`);

      const delay = Math.random() * 800 + 400;
      await new Promise(r => setTimeout(r, delay));

      let outcome = STATUS.SUCCESS;
      if (currentStep.tool === 'codex' && Math.random() > 0.8) outcome = STATUS.SKIPPED;

      setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: outcome } : s));

      if (outcome === STATUS.SKIPPED) addLog(`Step ${currentStep.id}: Skipped (Tool missing or condition met)`);
      else if (outcome === STATUS.FAILED) {
        addLog(`Step ${currentStep.id}: Failed!`);
      } else {
        addLog(`Step ${currentStep.id}: Success (Took ${Math.floor(delay)}ms)`);
      }
    }

    setIsRunning(false);
    addLog('Pack execution completed.');
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar - Step List */}
      <div className="w-80 flex flex-col border-r border-slate-800 bg-slate-950/50">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <SquareTerminal className="w-5 h-5 text-sky-500" />
            <h1 className="font-bold text-slate-100 tracking-tight">Runner</h1>
          </div>
          <div className="text-xs text-slate-500 font-mono">ticket-action-pack.md</div>
        </div>

        {/* Filters */}
        <div className="p-3 bg-slate-900/50 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ROI Filter</span>
             <div className="flex gap-1 text-[10px] font-mono">
               <button
                 onClick={() => setRoiMode('over')}
                 className={`px-2 py-0.5 rounded ${roiMode === 'over' ? 'bg-sky-900 text-sky-300' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
               >
                 OVER
               </button>
               <button
                 onClick={() => setRoiMode('under')}
                 className={`px-2 py-0.5 rounded ${roiMode === 'under' ? 'bg-sky-900 text-sky-300' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
               >
                 UNDER
               </button>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <input
              type="range"
              min="0" max="10" step="0.5"
              value={roiThreshold}
              onChange={(e) => setRoiThreshold(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <span className="text-xs font-mono w-8 text-right text-sky-400">{roiThreshold.toFixed(1)}</span>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>Showing {filteredSteps.length}/{steps.length} steps</span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredSteps.map((step) => (
            <button
              key={step.id}
              onClick={() => setSelectedStepId(step.id)}
              className={`w-full text-left p-3 border-b border-slate-800/50 flex items-start gap-3 transition-all hover:bg-slate-900/80 group ${
                selectedStepId === step.id ? 'bg-slate-900 border-l-2 border-l-sky-500' : 'border-l-2 border-l-transparent'
              }`}
            >
              <div className="mt-0.5"><StatusIcon status={step.status} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-mono font-bold ${selectedStepId === step.id ? 'text-sky-400' : 'text-slate-500'}`}>
                    {step.id}
                  </span>
                  <div className="flex gap-1">
                     <span className={`text-[10px] font-mono px-1 rounded ${step.roi >= 5 ? 'bg-emerald-950 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                       ROI {step.roi}
                     </span>
                  </div>
                </div>
                <div className={`text-sm truncate ${selectedStepId === step.id ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-300'}`}>
                  {step.originalLine}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
           <button
             onClick={runSimulation}
             disabled={isRunning}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded font-bold text-sm transition-all ${
               isRunning ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/20'
             }`}
           >
             {isRunning ? 'Running...' : <><Play className="w-4 h-4 fill-current" /> Run Pack</>}
           </button>
           <button onClick={handleReset} disabled={isRunning} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded">
             <RefreshCw className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Details */}
          <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto p-6 bg-slate-950">
            <div className="max-w-3xl w-full mx-auto space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-white tracking-tight">Step {selectedStep.id}</span>
                    <StatusIcon status={selectedStep.status} />
                  </div>
                  <h3 className="text-lg text-slate-300">{selectedStep.originalLine}</h3>
                </div>
                <div className="text-right space-y-2">
                  <ToolBadge tool={selectedStep.tool} />
                  <div className="text-xs font-mono text-slate-500">ROI: {selectedStep.roi.toFixed(1)}</div>
                </div>
              </div>
              <div className="space-y-2">
                <CodeBlock code={selectedStep.code} />
              </div>
            </div>
          </div>
          {/* Logs */}
          <div className="h-64 lg:h-auto lg:w-2/5 flex flex-col bg-[#0d1117]">
             <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
               <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 pl-2">
                 <Terminal className="w-3 h-3" /> Output Log
               </span>
               <button onClick={() => setLogs([])} className="text-[10px] text-slate-500 hover:text-slate-300 px-2">Clear</button>
             </div>
             <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 custom-scrollbar">
               {logs.map((log, i) => (
                 <div key={i} className="break-all whitespace-pre-wrap">
                   {log.startsWith('[') ? (
                     <>
                       <span className="text-slate-600">{log.substring(0, log.indexOf(']') + 1)}</span>
                       <span className={log.includes('Failed') ? 'text-rose-400' : log.includes('Success') ? 'text-emerald-400' : 'text-slate-300'}>
                         {log.substring(log.indexOf(']') + 1)}
                       </span>
                     </>
                   ) : <span className="text-slate-500">{log}</span>}
                 </div>
               ))}
               <div ref={logEndRef} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BuilderView = () => {
  const [packSteps, setPackSteps] = useState([]);
  const [draggedTool, setDraggedTool] = useState(null);

  const tools = [
    { id: 'oracle', name: 'Oracle Command', icon: Terminal, color: 'text-slate-400', template: 'echo "New Step"' },
    { id: 'gemini', name: 'Gemini Run', icon: Box, color: 'text-sky-400', template: 'gemini run "Prompt" --write-output "out.json"' },
    { id: 'codex', name: 'Codex Exec', icon: Layers, color: 'text-violet-400', template: 'codex exec "Task" --write-output "out.md"' },
    { id: 'tm', name: 'Task Master', icon: Activity, color: 'text-amber-400', template: 'task-master expand --all' },
  ];

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedTool) return;
    const newStep = {
      id: String(packSteps.length + 1).padStart(2, '0'),
      tool: draggedTool.id,
      originalLine: `New ${draggedTool.name} Step`,
      code: draggedTool.template,
      roi: 1.0,
    };
    setPackSteps([...packSteps, newStep]);
    setDraggedTool(null);
  };

  const handleDragOver = (e) => e.preventDefault();

  const generateMarkdown = () => {
    let md = '# Generated Pack\n\n```bash\n';
    packSteps.forEach(step => {
      md += `# ${step.id}) ROI=${step.roi}\n${step.code}\n\n`;
    });
    md += '```';

    // Create a blob and download (simulated)
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-pack.md';
    a.click();
  };

  return (
    <div className="flex h-full w-full">
      {/* Toolbox */}
      <div className="w-64 border-r border-slate-800 bg-slate-950 p-4 flex flex-col">
        <h2 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Box className="w-4 h-4" /> Toolbox
        </h2>
        <div className="space-y-2">
          {tools.map(tool => (
            <div
              key={tool.id}
              draggable
              onDragStart={() => setDraggedTool(tool)}
              className="p-3 bg-slate-900 border border-slate-800 rounded hover:border-slate-600 cursor-grab active:cursor-grabbing flex items-center gap-3"
            >
              <tool.icon className={`w-5 h-5 ${tool.color}`} />
              <div className="text-xs font-medium text-slate-300">{tool.name}</div>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-slate-800 text-xs text-slate-500">
          Drag items to the canvas to add steps.
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 bg-slate-900/30 p-8 overflow-y-auto"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Pack Builder</h1>
            <button
              onClick={generateMarkdown}
              disabled={packSteps.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Export Pack
            </button>
          </div>

          {packSteps.length === 0 ? (
            <div className="h-64 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500">
              <Move className="w-8 h-8 mb-2 opacity-50" />
              <p>Drag tools here to start building</p>
            </div>
          ) : (
            <div className="space-y-4">
              {packSteps.map((step, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-4 group relative hover:border-sky-900 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-mono font-bold text-slate-600">{step.id}</span>
                      <ToolBadge tool={step.tool} />
                      <input
                        type="text"
                        value={step.originalLine}
                        onChange={(e) => {
                          const newSteps = [...packSteps];
                          newSteps[idx].originalLine = e.target.value;
                          setPackSteps(newSteps);
                        }}
                        className="bg-transparent border-none text-slate-200 focus:ring-0 font-medium w-64"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                       <label className="text-xs text-slate-500 flex items-center gap-1">
                         ROI
                         <input
                           type="number"
                           value={step.roi}
                           step="0.1"
                           onChange={(e) => {
                             const newSteps = [...packSteps];
                             newSteps[idx].roi = parseFloat(e.target.value);
                             setPackSteps(newSteps);
                           }}
                           className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-right text-slate-300 text-xs"
                         />
                       </label>
                       <button
                         onClick={() => setPackSteps(packSteps.filter((_, i) => i !== idx))}
                         className="p-1 text-slate-600 hover:text-rose-500"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                  <textarea
                    value={step.code}
                    onChange={(e) => {
                      const newSteps = [...packSteps];
                      newSteps[idx].code = e.target.value;
                      setPackSteps(newSteps);
                    }}
                    className="w-full bg-slate-900 text-slate-300 font-mono text-xs p-3 rounded border border-slate-800 focus:border-sky-700 focus:ring-1 focus:ring-sky-900 outline-none resize-y min-h-[80px]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SettingsView = () => {
  const [urls, setUrls] = useState([
    { id: 1, name: 'Core Project', url: 'https://chatgpt.com/g/g-12345-core', scope: 'project' },
    { id: 2, name: 'Research Helper', url: 'https://chatgpt.com/g/g-67890-research', scope: 'global' },
  ]);
  const [newUrl, setNewUrl] = useState({ name: '', url: '' });

  const addUrl = () => {
    if (!newUrl.name || !newUrl.url) return;
    setUrls([...urls, { id: Date.now(), ...newUrl, scope: 'project' }]);
    setNewUrl({ name: '', url: '' });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <Settings className="w-6 h-6 text-slate-400" /> Settings
      </h1>

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-sky-500" /> Project URLs
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage ChatGPT project URLs for injecting context into tool runs.</p>
        </div>

        <div className="divide-y divide-slate-800">
          {urls.map(url => (
            <div key={url.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
              <div>
                <div className="font-medium text-slate-200 flex items-center gap-2">
                  {url.name}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${url.scope === 'global' ? 'bg-indigo-950 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                    {url.scope}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">{url.url}</div>
              </div>
              <button
                onClick={() => setUrls(urls.filter(u => u.id !== url.id))}
                className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-950/30 flex gap-3 border-t border-slate-800">
          <input
            type="text"
            placeholder="Name (e.g. My Project)"
            value={newUrl.name}
            onChange={(e) => setNewUrl({ ...newUrl, name: e.target.value })}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            placeholder="https://chatgpt.com/..."
            value={newUrl.url}
            onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })}
            className="flex-[2] bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={addUrl}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Layout ---

export default function App() {
  const [currentView, setCurrentView] = useState('runner'); // 'runner' | 'builder' | 'settings'

  const NavItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setCurrentView(id)}
      className={`w-full p-3 flex flex-col items-center gap-1 transition-colors relative ${
        currentView === id ? 'text-sky-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-medium">{label}</span>
      {currentView === id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500" />}
    </button>
  );

  return (
    <div className={`flex h-screen w-full ${COLORS.bg} ${COLORS.text} font-sans overflow-hidden selection:bg-sky-900 selection:text-white`}>
      {/* Activity Bar */}
      <div className="w-16 flex flex-col items-center bg-slate-950 border-r border-slate-800 pt-4 z-20">
        <div className="mb-6 p-2 bg-slate-900 rounded-lg">
          <SquareTerminal className="w-6 h-6 text-sky-500" />
        </div>
        <div className="flex-1 w-full space-y-2">
          <NavItem id="runner" icon={Play} label="Run" />
          <NavItem id="builder" icon={Edit3} label="Build" />
          <NavItem id="settings" icon={Settings} label="Settings" />
        </div>
        <div className="pb-4">
           {/* Bottom Activity Items if needed */}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden relative">
        {currentView === 'runner' && <RunnerView />}
        {currentView === 'builder' && <BuilderView />}
        {currentView === 'settings' && <SettingsView />}
      </div>

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