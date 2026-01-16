import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Terminal,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  SkipForward,
  Settings,
  Edit3,
  FileText,
  Save,
  Download,
  Upload,
  RefreshCw,
  Box,
  Cpu,
  Layers,
  Search,
  Filter,
  Activity,
  Code,
  Command,
  Link as LinkIcon,
  Globe,
  Trash2,
  Plus,
  Eye,
  Copy,
  Minimize2,
  Maximize2,
  Zap,
  MessageSquare,
  ArrowRight,
  GitBranch,
  Network,
} from "lucide-react";

// ============================================================================
// AGENT SYSTEM
// ============================================================================

type AgentId = string;
type TaskId = string;
type MessageId = string;

enum AgentStatus {
  IDLE = "idle",
  WORKING = "working",
  COMPLETED = "completed",
  FAILED = "failed",
  WAITING = "waiting",
}

enum MessageType {
  TASK_REQUEST = "TASK_REQUEST",
  TASK_RESPONSE = "TASK_RESPONSE",
  STATUS_QUERY = "STATUS_QUERY",
  STATUS_RESPONSE = "STATUS_RESPONSE",
  CONTEXT_UPDATE = "CONTEXT_UPDATE",
}

interface Message {
  id: MessageId;
  from: string;
  to: string;
  type: MessageType;
  payload: any;
  timestamp: number;
}

interface AgentData {
  id: AgentId;
  name: string;
  role: string;
  status: AgentStatus;
  currentTask: string | null;
  progress: number;
  knowledgeUrls: string[]; // URLs this agent has access to
}

// Simple Message Bus
class MessageBus {
  private listeners: ((msg: Message) => void)[] = [];
  private agentInboxes: Map<string, (msg: Message) => void> = new Map();

  register(agentId: string, callback: (msg: Message) => void) {
    this.agentInboxes.set(agentId, callback);
  }

  subscribe(callback: (msg: Message) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  send(msg: Message) {
    this.listeners.forEach((cb) => cb(msg));
    const recipientCallback = this.agentInboxes.get(msg.to);
    if (recipientCallback) {
      setTimeout(() => recipientCallback(msg), Math.random() * 50 + 20);
    }
  }
}

// Agent Node Logic
class AgentNode {
  public id: AgentId;
  public name: string;
  public role: string;
  public knowledgeUrls: string[] = [];

  private bus: MessageBus;
  private status: AgentStatus = AgentStatus.IDLE;
  private currentTask: string | null = null;
  private progress: number = 0;
  private workTimer: NodeJS.Timeout | null = null;
  private onUpdate: (data: AgentData) => void;

  constructor(
    id: string,
    name: string,
    role: string,
    bus: MessageBus,
    onUpdate: (data: AgentData) => void
  ) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.bus = bus;
    this.onUpdate = onUpdate;
    this.bus.register(this.id, this.handleMessage.bind(this));
    this.pushState();
  }

  private handleMessage(msg: Message) {
    switch (msg.type) {
      case MessageType.STATUS_QUERY:
        this.respondToStatusQuery(msg.from);
        break;
      case MessageType.TASK_REQUEST:
        this.startTask(
          msg.payload.taskId,
          msg.payload.taskName,
          msg.payload.duration
        );
        break;
      case MessageType.CONTEXT_UPDATE:
        this.knowledgeUrls.push(msg.payload.url);
        this.pushState();
        break;
    }
  }

  private respondToStatusQuery(requesterId: string) {
    this.bus.send({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      from: this.id,
      to: requesterId,
      type: MessageType.STATUS_RESPONSE,
      payload: {
        status: this.status,
        progress: this.progress,
        currentTask: this.currentTask,
      },
      timestamp: Date.now(),
    });
  }

  private startTask(taskId: string, taskName: string, duration: number) {
    if (this.status === AgentStatus.WORKING) return;
    this.status = AgentStatus.WORKING;
    this.currentTask = taskName;
    this.progress = 0;
    this.pushState();

    // Adjust duration based on knowledge (simulated intelligence boost)
    const effectiveDuration =
      this.knowledgeUrls.length > 0 ? duration * 0.8 : duration;

    const startTime = Date.now();
    this.workTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.progress = Math.min(100, (elapsed / effectiveDuration) * 100);
      this.pushState();
      if (elapsed >= effectiveDuration) this.completeTask(taskId);
    }, 100);
  }

  private completeTask(taskId: string) {
    if (this.workTimer) clearInterval(this.workTimer);
    this.status = AgentStatus.COMPLETED;
    this.progress = 100;
    this.pushState();
  }

  public resetToIdle() {
    this.status = AgentStatus.IDLE;
    this.currentTask = null;
    this.progress = 0;
    this.pushState();
  }

  public cleanup() {
    if (this.workTimer) clearInterval(this.workTimer);
  }

  private pushState() {
    this.onUpdate({
      id: this.id,
      name: this.name,
      role: this.role,
      status: this.status,
      currentTask: this.currentTask,
      progress: this.progress,
      knowledgeUrls: this.knowledgeUrls,
    });
  }
}

// ============================================================================
// TYPES
// ============================================================================

type ToolKind =
  | "oracle"
  | "tm"
  | "task-master"
  | "codex"
  | "gemini"
  | "unknown";

interface Step {
  id: string;
  number: number;
  code: string;
  originalLine: string;
  roi: number;
  tool: ToolKind;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  log: string[];
}

interface Pack {
  source: string;
  prelude: string;
  steps: Step[];
  outDir: string;
  writeOutput: boolean;
}

interface ProjectURL {
  id: string;
  name: string;
  url: string;
  scope: "global" | "project";
  lastUsed?: string;
}

// ============================================================================
// PARSER & HELPERS
// ============================================================================

const STEP_HEADER_REGEX = /^#\s*(\d{2})(?:\)|[\s]+[—-])(.*)/;
const ROI_REGEX = /ROI=(\d+(\.\d+)?)/;
const OUT_DIR_REGEX = /out_dir=["']?([^"'\s]+)["']?/;
const WRITE_OUTPUT_REGEX = /--write-output/;

const classifyTool = (line: string): ToolKind => {
  const trimmed = line.trim();
  if (trimmed.startsWith("oracle")) return "oracle";
  if (trimmed.startsWith("tm")) return "tm";
  if (trimmed.startsWith("task-master")) return "task-master";
  if (trimmed.startsWith("codex")) return "codex";
  if (trimmed.startsWith("gemini")) return "gemini";
  return "unknown";
};

const parsePack = (markdown: string): Pack => {
  const lines = markdown.split("\n");
  const steps: Step[] = [];
  let prelude = "";
  let currentStep: Partial<Step> | null = null;
  let inCodeBlock = false;
  let codeBuffer = "";

  for (const line of lines) {
    if (line.trim().startsWith("```bash")) {
      inCodeBlock = true;
      continue;
    }
    if (line.trim().startsWith("```") && inCodeBlock) {
      inCodeBlock = false;
      continue;
    }
    if (!inCodeBlock) continue;

    const headerMatch = line.match(STEP_HEADER_REGEX);
    if (headerMatch) {
      if (currentStep) {
        currentStep.code = codeBuffer.trim();
        const firstLine = currentStep.code.split("\n")[0] || "";
        currentStep.tool = classifyTool(firstLine);
        steps.push(currentStep as Step);
      }
      codeBuffer = "";
      const id = headerMatch[1];
      let desc = headerMatch[2].trim();
      let roi = 0;
      const roiMatch = line.match(ROI_REGEX);
      if (roiMatch) {
        roi = parseFloat(roiMatch[1]);
        desc = desc.replace(roiMatch[0], "").trim();
      }
      currentStep = {
        id,
        number: parseInt(id, 10),
        originalLine: desc || `Step ${id}`,
        roi,
        status: "pending",
        log: [],
      };
    } else {
      if (currentStep) codeBuffer += line + "\n";
      else prelude += line + "\n";
    }
  }
  if (currentStep) {
    currentStep.code = codeBuffer.trim();
    const firstLine = currentStep.code.split("\n")[0] || "";
    currentStep.tool = classifyTool(firstLine);
    steps.push(currentStep as Step);
  }
  const outDirMatch = prelude.match(OUT_DIR_REGEX);
  const outDir = outDirMatch ? outDirMatch[1] : ".";
  const writeOutput = WRITE_OUTPUT_REGEX.test(prelude);
  return {
    source: "pasted-pack.md",
    prelude: prelude.trim(),
    steps,
    outDir,
    writeOutput,
  };
};

const DEFAULT_PACK_TEMPLATE = `# Project Setup Pack

\`\`\`bash
# Prelude
out_dir="dist"

# 01) Initialize Environment ROI=5.0
echo "Setting up workspace..."

# 02) Check Dependencies ROI=2.0
if ! command -v node; then echo "Missing node"; exit 1; fi

# 03) Run Oracle Analysis ROI=8.5
oracle query "Analyze project structure"

# 04) TaskMaster Parse
task-master parse-prd docs/PRD.md

# 05) Generate Code (Codex) ROI=4.0
codex exec "Scaffold main.go" --write-output "main.go"

# 06) Verify Output
ls -la main.go

# 07) Run Oracle Review
oracle query "Review code quality"

# 08) Gemini Summary
gemini run "Summarize changes"

# 09) Codex Test Gen
codex exec "Generate tests"

# 10) Run Tests
go test ./...

# 11) Step 11 placeholder
echo "Step 11"

# 12) Step 12 placeholder
echo "Step 12"

# 13) Step 13 placeholder
echo "Step 13"

# 14) Step 14 placeholder
echo "Step 14"

# 15) Step 15 placeholder
echo "Step 15"

# 16) Step 16 placeholder
echo "Step 16"

# 17) Step 17 placeholder
echo "Step 17"

# 18) Step 18 placeholder
echo "Step 18"

# 19) Step 19 placeholder
echo "Step 19"

# 20) Cleanup ROI=1.0
echo "Done"
\`\`\`
`;

// ============================================================================
// COMPONENTS
// ============================================================================

const Button = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
}) => {
  const baseStyle =
    "px-4 py-2 rounded-md font-medium text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20",
    secondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    danger:
      "bg-rose-900/50 hover:bg-rose-800 text-rose-200 border border-rose-800",
    ghost:
      "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, color = "slate" }) => {
  const colors = {
    slate: "bg-slate-800 text-slate-400 border-slate-700",
    indigo: "bg-indigo-950 text-indigo-400 border-indigo-800",
    emerald: "bg-emerald-950 text-emerald-400 border-emerald-800",
    amber: "bg-amber-950 text-amber-400 border-amber-800",
    rose: "bg-rose-950 text-rose-400 border-rose-800",
    sky: "bg-sky-950 text-sky-400 border-sky-800",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
        colors[color] || colors.slate
      }`}
    >
      {children}
    </span>
  );
};

const StatusIcon = ({ status }) => {
  switch (status) {
    case "running":
      return <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />;
    case "success":
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-rose-400" />;
    case "skipped":
      return <SkipForward className="w-4 h-4 text-slate-500" />;
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-slate-700" />;
  }
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <XCircle className="w-6 h-6" />
        </button>
      </div>
      <div className="overflow-y-auto p-4 flex-1">{children}</div>
    </div>
  </div>
);

// --- AGENT ORCHESTRATOR VIEW ---

const RunnerView = ({ packData, setPackData, urls }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [roiThreshold, setRoiThreshold] = useState(0);
  const [roiMode, setRoiMode] = useState<"over" | "under">("over");
  const [globalLog, setGlobalLog] = useState<Message[]>([]);
  const [previewStep, setPreviewStep] = useState<Step | null>(null);
  const [wrapPreview, setWrapPreview] = useState(true);
  const [agents, setAgents] = useState<Map<string, AgentData>>(new Map());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const messageBusRef = useRef(new MessageBus());
  const agentInstancesRef = useRef<AgentNode[]>([]);
  const orchestratorInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize Agents
  useEffect(() => {
    const bus = messageBusRef.current;

    // UI Logger
    const logUnsub = bus.subscribe((msg) => {
      setGlobalLog((prev) => [...prev.slice(-99), msg]);
    });

    // Create Agent Nodes
    const createAgent = (id: string, name: string, role: string) => {
      return new AgentNode(id, name, role, bus, (data) => {
        setAgents((prev) => {
          const next = new Map(prev);
          next.set(data.id, data);
          return next;
        });
      });
    };

    const newAgents = [
      createAgent("oracle", "Oracle Bot", "Analysis"),
      createAgent("codex", "Codex Dev", "Engineering"),
      createAgent("gemini", "Gemini AI", "Synthesis"),
      createAgent("task-master", "TaskMaster", "Planning"),
      createAgent("unknown", "Shell Exec", "System"),
    ];
    agentInstancesRef.current = newAgents;

    // Initial State Push
    newAgents.forEach((a) => {
      setAgents((prev) => {
        const next = new Map(prev);
        next.set(a.id, {
          id: a.id,
          name: a.name,
          role: a.role,
          status: AgentStatus.IDLE,
          currentTask: null,
          progress: 0,
          knowledgeUrls: [],
        });
        return next;
      });
    });

    return () => {
      logUnsub();
      stopOrchestration();
    };
  }, []);

  const injectUrl = (agentId: string, url: string) => {
    messageBusRef.current.send({
      id: `ctx_${Date.now()}`,
      from: "USER",
      to: agentId,
      type: MessageType.CONTEXT_UPDATE,
      payload: { url },
      timestamp: Date.now(),
    });
  };

  const filteredSteps = useMemo(() => {
    if (!packData) return [];
    return packData.steps.filter((step) => {
      if (roiThreshold <= 0) return true;
      if (roiMode === "under") return step.roi < roiThreshold;
      return step.roi >= roiThreshold;
    });
  }, [packData, roiThreshold, roiMode]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [globalLog]);

  const stopOrchestration = () => {
    if (orchestratorInterval.current)
      clearInterval(orchestratorInterval.current);
    agentInstancesRef.current.forEach((a) => a.cleanup());
    agentInstancesRef.current.forEach((a) => a.resetToIdle());
    setIsRunning(false);
  };

  const runSimulation = () => {
    if (!packData || isRunning) return;
    setIsRunning(true);
    setGlobalLog([]); // Clear logs

    // Reset steps
    const newSteps = packData.steps.map((s) => ({
      ...s,
      status: "pending",
      log: [],
    }));
    setPackData({ ...packData, steps: newSteps });

    const queue = filteredSteps.map((s) => s.id);
    let queueIndex = 0;

    orchestratorInterval.current = setInterval(() => {
      const currentStepID = queue[queueIndex];
      if (!currentStepID) {
        stopOrchestration();
        return;
      }

      const step = newSteps.find((s) => s.id === currentStepID);
      if (!step) return;

      let agentId = step.tool === "tm" ? "task-master" : step.tool;
      if (step.tool === "tm") agentId = "task-master";
      if (!["oracle", "codex", "gemini", "task-master"].includes(agentId)) {
        agentId = "unknown";
      }

      const agent = agents.get(agentId);

      if (step.status === "pending") {
        if (agent?.status === AgentStatus.IDLE) {
          step.status = "running";
          setPackData((prev) => ({ ...prev, steps: [...newSteps] }));

          messageBusRef.current.send({
            id: `req_${Date.now()}`,
            from: "ORCHESTRATOR",
            to: agentId,
            type: MessageType.TASK_REQUEST,
            payload: {
              taskId: step.id,
              taskName: step.originalLine,
              duration: 1500 + Math.random() * 1000,
            },
            timestamp: Date.now(),
          });
        }
      } else if (step.status === "running") {
        if (agent?.status === AgentStatus.COMPLETED) {
          step.status = "success";
          setPackData((prev) => ({ ...prev, steps: [...newSteps] }));
          const node = agentInstancesRef.current.find((a) => a.id === agentId);
          node?.resetToIdle();
          queueIndex++;
        }
      }
    }, 500);
  };

  const getMessageStyle = (type: MessageType) => {
    switch (type) {
      case MessageType.TASK_REQUEST:
        return "text-blue-400 border-l-2 border-blue-400 bg-blue-900/10";
      case MessageType.STATUS_RESPONSE:
        return "text-emerald-400 border-l-2 border-emerald-400 bg-emerald-900/10";
      case MessageType.STATUS_QUERY:
        return "text-slate-500 border-l-2 border-slate-500 bg-slate-900/10 text-xs";
      case MessageType.CONTEXT_UPDATE:
        return "text-amber-400 border-l-2 border-amber-400 bg-amber-900/10";
      default:
        return "text-slate-300";
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-500" />
            Orchestrator
          </h2>
          <div className="h-6 w-px bg-slate-800" />

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded border border-slate-800">
            <Activity className="w-4 h-4 text-slate-500 ml-2" />
            <span className="text-xs font-bold text-slate-500">ROI</span>
            <button
              onClick={() => setRoiMode(roiMode === "over" ? "under" : "over")}
              className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 font-mono text-indigo-400"
            >
              {roiMode.toUpperCase()}
            </button>
            <input
              type="number"
              className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-indigo-500"
              value={roiThreshold}
              onChange={(e) => setRoiThreshold(parseFloat(e.target.value) || 0)}
              step={0.5}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              stopOrchestration();
              setPackData({
                ...packData,
                steps: packData.steps.map((s) => ({ ...s, status: "pending" })),
              });
            }}
            variant="secondary"
            disabled={isRunning}
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </Button>
          <Button onClick={runSimulation} disabled={isRunning}>
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            {isRunning ? "Running..." : "Run Pack"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Step List */}
        <div className="w-1/3 overflow-y-auto border-r border-slate-800 bg-slate-900/50">
          <div className="p-4 space-y-2">
            {filteredSteps.length === 0 && (
              <div className="text-center py-10 text-slate-500 italic">
                No steps match current filters.
              </div>
            )}
            {filteredSteps.map((step) => (
              <div
                key={step.id}
                className={`
                  p-3 rounded-lg border flex items-center justify-between transition-all group
                  ${
                    step.status === "running"
                      ? "bg-indigo-900/10 border-indigo-500/50 shadow-md shadow-indigo-900/10"
                      : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800"
                  }
                `}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <StatusIcon status={step.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500 font-bold">
                        {step.id}
                      </span>
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {step.originalLine}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      {step.tool !== "unknown" && (
                        <Badge
                          color={
                            step.tool === "oracle"
                              ? "indigo"
                              : step.tool === "codex"
                              ? "rose"
                              : step.tool === "gemini"
                              ? "sky"
                              : "amber"
                          }
                        >
                          {step.tool}
                        </Badge>
                      )}
                      {step.roi > 0 && (
                        <span className="text-[10px] text-emerald-500 font-mono bg-emerald-950/30 px-1 rounded border border-emerald-900/50">
                          ROI {step.roi}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewStep(step)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-white transition-opacity"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Live Agents */}
        <div className="w-1/3 border-r border-slate-800 bg-slate-900 p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4" /> Active Agents
            </h3>
            <div className="space-y-4">
              {Array.from(agents.values()).map((agent) => (
                <div
                  key={agent.id}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 relative group cursor-pointer ${
                    selectedAgentId === agent.id ? "ring-2 ring-indigo-500" : ""
                  } ${
                    agent.status === AgentStatus.WORKING
                      ? "border-indigo-500 bg-indigo-900/10"
                      : agent.status === AgentStatus.COMPLETED
                      ? "border-emerald-500 bg-emerald-900/10"
                      : "border-slate-700 bg-slate-800/50"
                  }`}
                  onClick={() =>
                    setSelectedAgentId(
                      selectedAgentId === agent.id ? null : agent.id
                    )
                  }
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                        {agent.id === "oracle" && (
                          <Zap className="w-5 h-5 text-indigo-400" />
                        )}
                        {agent.id === "codex" && (
                          <Code className="w-5 h-5 text-rose-400" />
                        )}
                        {agent.id === "gemini" && (
                          <Box className="w-5 h-5 text-sky-400" />
                        )}
                        {agent.id === "task-master" && (
                          <Layers className="w-5 h-5 text-amber-400" />
                        )}
                        {agent.id === "unknown" && (
                          <Terminal className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 text-sm">
                          {agent.name}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">
                          {agent.role}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        agent.status === AgentStatus.WORKING
                          ? "bg-indigo-500 text-white animate-pulse"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>

                  {agent.knowledgeUrls.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {agent.knowledgeUrls.map((url, i) => (
                        <span
                          key={i}
                          className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded flex items-center gap-1 border border-slate-700 max-w-full truncate"
                        >
                          <LinkIcon className="w-2 h-2" />
                          {url}
                        </span>
                      ))}
                    </div>
                  )}

                  {agent.status === AgentStatus.WORKING && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[150px]">
                          {agent.currentTask}
                        </span>
                        <span>{Math.round(agent.progress)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-200"
                          style={{ width: `${agent.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Context Injection Overlay */}
                  {selectedAgentId === agent.id && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold">
                        Inject Context:
                      </p>
                      <div className="space-y-1">
                        {urls.map((u) => (
                          <button
                            key={u.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              injectUrl(agent.id, u.url);
                            }}
                            className="w-full text-left text-xs p-1.5 rounded hover:bg-slate-700 text-slate-300 flex items-center gap-2 truncate"
                          >
                            <LinkIcon className="w-3 h-3 text-sky-500" />
                            {u.name}
                          </button>
                        ))}
                        {urls.length === 0 && (
                          <span className="text-xs text-slate-600 italic">
                            No URLs available
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4" /> Available Context (URLs)
            </h3>
            <div className="space-y-2">
              {urls.map((url) => (
                <div
                  key={url.id}
                  className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center gap-3"
                >
                  <div className="p-2 bg-slate-800 rounded-md">
                    <LinkIcon className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200">
                      {url.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {url.url}
                    </div>
                  </div>
                </div>
              ))}
              {urls.length === 0 && (
                <div className="text-xs text-slate-500 italic p-2">
                  No URLs configured. Add in URLs tab.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Message Bus Log */}
        <div className="w-1/3 bg-slate-950 flex flex-col">
          <div className="p-2 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Message Bus
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 text-slate-300">
            {globalLog.map((msg, i) => (
              <div
                key={msg.id}
                className={`p-2 rounded mb-1 flex items-start gap-2 ${getMessageStyle(
                  msg.type
                )}`}
              >
                <span className="opacity-50 min-w-[40px]">
                  {
                    new Date(msg.timestamp)
                      .toLocaleTimeString([], {
                        fractionalSecondDigits: 1,
                        hour12: false,
                      })
                      .split(" ")[0]
                  }
                </span>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-1 font-bold opacity-90 mb-0.5">
                    <span>{msg.from}</span>
                    <ArrowRight className="w-3 h-3 opacity-50" />
                    <span>{msg.to}</span>
                  </div>
                  {msg.type === MessageType.TASK_REQUEST && (
                    <div className="opacity-80 truncate">
                      Task: {msg.payload.taskName}
                    </div>
                  )}
                  {msg.type === MessageType.STATUS_RESPONSE && (
                    <div className="opacity-70">
                      St: {msg.payload.status} | Pr:{" "}
                      {Math.round(msg.payload.progress)}%
                    </div>
                  )}
                  {msg.type === MessageType.CONTEXT_UPDATE && (
                    <div className="opacity-80 truncate text-amber-300">
                      New Knowledge: {msg.payload.url}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* Step Preview Modal */}
      {previewStep && (
        <Modal
          title={`Step ${previewStep.id}: ${previewStep.originalLine}`}
          onClose={() => setPreviewStep(null)}
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Badge color="slate">Line {previewStep.number * 3}</Badge>
              <Badge color="indigo">{previewStep.tool}</Badge>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setWrapPreview(!wrapPreview)}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                title={wrapPreview ? "Unwrap" : "Wrap"}
              >
                {wrapPreview ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(previewStep.code)}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Copy Code"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div
            className={`bg-slate-950 p-4 rounded border border-slate-800 font-mono text-sm text-slate-300 ${
              wrapPreview
                ? "whitespace-pre-wrap"
                : "whitespace-pre overflow-x-auto"
            }`}
          >
            {previewStep.code}
          </div>
        </Modal>
      )}
    </div>
  );
};

// --- WORKFLOW VIEW (NEW) ---

const WorkflowView = () => {
  const [workflowSteps, setWorkflowSteps] = useState([
    { id: "1", name: "Scrape Context", agent: "Oracle Bot", type: "task" },
    { id: "2", name: "Analyze Data", agent: "Gemini AI", type: "task" },
    { id: "3", name: "Generate Report", agent: "Codex Dev", type: "task" },
  ]);

  const [dragged, setDragged] = useState<any>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // In a real impl, we'd handle complex drag/drop reordering here
  };

  return (
    <div className="flex h-full bg-slate-900">
      {/* Sidebar - Tools */}
      <div className="w-64 bg-slate-950 border-r border-slate-800 p-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase mb-4">
          Workflow Nodes
        </h2>
        <div className="space-y-2">
          {["Task Node", "Conditional", "Parallel", "Delay"].map((type) => (
            <div
              key={type}
              draggable
              className="p-3 bg-slate-900 border border-slate-700 rounded cursor-grab hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <Box className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-slate-300">{type}</span>
            </div>
          ))}
        </div>

        <h2 className="text-sm font-bold text-slate-400 uppercase mb-4 mt-8">
          Agents
        </h2>
        <div className="space-y-2">
          {["Oracle Bot", "Gemini AI", "Codex Dev", "TaskMaster"].map(
            (agent) => (
              <div
                key={agent}
                draggable
                className="p-3 bg-slate-900 border border-slate-700 rounded cursor-grab hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300">{agent}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-slate-900/50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <GitBranch className="w-8 h-8 text-indigo-500" />
            Custom Workflow Builder
          </h1>
          <Button>
            <Save className="w-4 h-4" /> Save Workflow
          </Button>
        </div>

        <div className="grid gap-4 max-w-2xl mx-auto">
          {workflowSteps.map((step, idx) => (
            <div key={step.id} className="relative group">
              {idx > 0 && (
                <div className="absolute -top-4 left-8 w-0.5 h-4 bg-slate-700 mx-auto" />
              )}
              <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-lg flex items-center gap-4 hover:border-indigo-500/50 transition-colors">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-400">
                  <span className="font-mono font-bold">{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <input
                    className="bg-transparent text-white font-bold text-lg focus:outline-none w-full mb-1"
                    defaultValue={step.name}
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Cpu className="w-3 h-3" />
                    <span>Assigned to: {step.agent}</span>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-500 hover:bg-slate-800/30 transition-all flex items-center justify-center gap-2"
            onClick={() =>
              setWorkflowSteps([
                ...workflowSteps,
                {
                  id: Date.now().toString(),
                  name: "New Step",
                  agent: "Oracle Bot",
                  type: "task",
                },
              ])
            }
          >
            <Plus className="w-5 h-5" /> Add Workflow Step
          </button>
        </div>
      </div>
    </div>
  );
};

// ... (Existing BuilderView, URLManagerView remain the same as previous step, just updating main shell)

const BuilderView = ({ markdown, setMarkdown, onSave }) => {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e) => {
    setMarkdown(e.target.value);
    validate(e.target.value);
  };

  const validate = (code: string) => {
    try {
      const parsed = parsePack(code);
      if (parsed.steps.length !== 20) {
        setError(
          `Pack must have exactly 20 steps (Found ${parsed.steps.length})`
        );
      } else {
        setError(null);
      }
    } catch (e) {
      setError("Parsing error");
    }
  };

  useEffect(() => validate(markdown), []);

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-emerald-500" />
          Pack Builder
        </h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setMarkdown(DEFAULT_PACK_TEMPLATE)}
          >
            <RefreshCw className="w-4 h-4" /> Reset Template
          </Button>
          <Button onClick={() => onSave(markdown)} disabled={!!error}>
            <Save className="w-4 h-4" /> Save & Load
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 relative">
          <textarea
            className="w-full h-full bg-slate-900 text-slate-300 font-mono text-sm p-4 resize-none focus:outline-none"
            value={markdown}
            onChange={handleChange}
            spellCheck={false}
          />
          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-rose-950/90 border border-rose-800 text-rose-200 p-3 rounded-md flex items-center gap-3 backdrop-blur-sm">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* Help Sidebar */}
        <div className="w-64 border-l border-slate-800 bg-slate-950 p-4 hidden md:block">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">
            Pack Format Guide
          </h3>
          <div className="space-y-4 text-xs text-slate-500">
            <div>
              <strong className="text-slate-300 block mb-1">Structure</strong>
              Must contain exactly one <code>```bash</code> block.
            </div>
            <div>
              <strong className="text-slate-300 block mb-1">Steps</strong>
              Headers must follow <code># NN)</code> format.
              <br />
              Example: <code># 01) Setup</code>
            </div>
            <div>
              <strong className="text-slate-300 block mb-1">ROI Tagging</strong>
              Append <code>ROI=X.X</code> to step headers to enable filtering.
            </div>
            <div>
              <strong className="text-slate-300 block mb-1">Constraint</strong>
              Must have exactly 20 steps (01-20).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const URLManagerView = ({ urls, setUrls }) => {
  const [newUrl, setNewUrl] = useState({
    name: "",
    url: "",
    scope: "project" as "project" | "global",
  });

  const addUrl = () => {
    if (!newUrl.name || !newUrl.url) return;
    setUrls([...urls, { id: Date.now().toString(), ...newUrl }]);
    setNewUrl({ name: "", url: "", scope: "project" });
  };

  const removeUrl = (id: string) => {
    setUrls(urls.filter((u) => u.id !== id));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-slate-300">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <LinkIcon className="w-6 h-6 text-sky-500" />
        Project URL Manager
      </h2>

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-sm font-bold text-slate-100">Saved URLs</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {urls.map((url) => (
            <div
              key={url.id}
              className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <div className="font-medium text-slate-200 flex items-center gap-2">
                  {url.name}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      url.scope === "global"
                        ? "bg-indigo-950 text-indigo-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {url.scope}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {url.url}
                </div>
              </div>
              <button
                onClick={() => removeUrl(url.id)}
                className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="p-4 bg-slate-950/30 flex gap-3 border-t border-slate-800">
          <select
            value={newUrl.scope}
            onChange={(e) =>
              setNewUrl({
                ...newUrl,
                scope: e.target.value as "project" | "global",
              })
            }
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="project">Project</option>
            <option value="global">Global</option>
          </select>
          <input
            type="text"
            placeholder="Name"
            value={newUrl.name}
            onChange={(e) => setNewUrl({ ...newUrl, name: e.target.value })}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            placeholder="URL"
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

// ============================================================================
// MAIN APP SHELL
// ============================================================================

export default function OraclePackSPA() {
  const [view, setView] = useState<"runner" | "builder" | "urls" | "workflow">(
    "runner"
  );
  const [markdown, setMarkdown] = useState(DEFAULT_PACK_TEMPLATE);
  const [packData, setPackData] = useState<Pack | null>(null);

  // Shared URL State
  const [urls, setUrls] = useState<ProjectURL[]>([
    {
      id: "1",
      name: "Core Project",
      url: "[https://chatgpt.com/g/g-12345-core](https://chatgpt.com/g/g-12345-core)",
      scope: "project",
    },
    {
      id: "2",
      name: "Research Helper",
      url: "[https://chatgpt.com/g/g-67890-research](https://chatgpt.com/g/g-67890-research)",
      scope: "global",
    },
  ]);

  // Initialize pack from default template
  useEffect(() => {
    try {
      const parsed = parsePack(markdown);
      setPackData(parsed);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSavePack = (newMarkdown: string) => {
    setMarkdown(newMarkdown);
    const parsed = parsePack(newMarkdown);
    setPackData(parsed);
    setView("runner");
  };

  const NavItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setView(id)}
      className={`w-full p-4 flex flex-col items-center gap-1 transition-all border-l-2
        ${
          view === id
            ? "bg-slate-900 border-indigo-500 text-indigo-400"
            : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"
        }
      `}
    >
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-bold uppercase tracking-wider">
        {label}
      </span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <nav className="w-20 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-6 z-10">
        <div className="mb-8 p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-900/20">
          <Layers className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 w-full space-y-2">
          <NavItem id="runner" icon={Play} label="Run" />
          <NavItem id="workflow" icon={Network} label="Flow" />
          <NavItem id="builder" icon={Edit3} label="Build" />
          <NavItem id="urls" icon={LinkIcon} label="URLs" />
        </div>

        <div className="mt-auto">
          <a
            href="#"
            className="p-3 text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Box className="w-6 h-6" />
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {view === "runner" && (
          <RunnerView
            packData={packData}
            setPackData={setPackData}
            urls={urls}
          />
        )}
        {view === "workflow" && <WorkflowView />}
        {view === "builder" && (
          <BuilderView
            markdown={markdown}
            setMarkdown={setMarkdown}
            onSave={handleSavePack}
          />
        )}
        {view === "urls" && <URLManagerView urls={urls} setUrls={setUrls} />}
      </main>
    </div>
  );
}
