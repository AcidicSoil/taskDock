import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Settings,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  Cpu,
  Database,
  ArrowRight,
  MessageSquare,
  Layers,
  Link as LinkIcon,
  X,
  Sparkles,
  Bot
} from 'lucide-react';

// ============================================================================
// CORE TYPES
// ============================================================================

type AgentId = string;
type TaskId = string;
type MessageId = string;
type LLMProvider = 'OpenAI' | 'Anthropic' | 'Google Gemini' | 'Meta Llama' | 'Mistral';

// ============================================================================
// PROTOCOL DEFINITIONS
// ============================================================================

enum AgentStatus {
  IDLE = 'idle',
  WORKING = 'working',
  COMPLETED = 'completed', // Used for task completion signal
  FAILED = 'failed'
}

enum MessageType {
  TASK_REQUEST = 'TASK_REQUEST',
  TASK_RESPONSE = 'TASK_RESPONSE',
  STATUS_QUERY = 'STATUS_QUERY',
  STATUS_RESPONSE = 'STATUS_RESPONSE'
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
  provider: LLMProvider;
  status: AgentStatus;
  currentTask: string | null;
  progress: number;
}

interface TaskDefinition {
  id: TaskId;
  name: string;
  agentId: AgentId;
  duration: number; // ms
  dependencies: TaskId[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
}

// ============================================================================
// MESSAGE BUS (Networking Simulation)
// ============================================================================

class MessageBus {
  private listeners: ((msg: Message) => void)[] = [];
  private agentInboxes: Map<string, (msg: Message) => void> = new Map();

  // Register an agent's inbox
  register(agentId: string, callback: (msg: Message) => void) {
    this.agentInboxes.set(agentId, callback);
  }

  // UI subscription to see all traffic
  subscribe(callback: (msg: Message) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  send(msg: Message) {
    // 1. Notify UI observers (Global Log)
    this.listeners.forEach(cb => cb(msg));

    // 2. Deliver to specific agent with simulated latency
    const recipientCallback = this.agentInboxes.get(msg.to);
    if (recipientCallback) {
      setTimeout(() => {
        recipientCallback(msg);
      }, Math.random() * 50 + 20); // 20-70ms latency
    }
  }
}

// ============================================================================
// AGENT CLASS (Autonomous Node)
// ============================================================================

class AgentNode {
  public id: AgentId;
  public name: string;
  public role: string;
  public provider: LLMProvider;

  private bus: MessageBus;
  private status: AgentStatus = AgentStatus.IDLE;
  private currentTask: string | null = null;
  private progress: number = 0;
  private workTimer: NodeJS.Timeout | null = null;

  // Callback to update React state
  private onUpdate: (data: AgentData) => void;

  constructor(
    id: string,
    name: string,
    role: string,
    provider: LLMProvider,
    bus: MessageBus,
    onUpdate: (data: AgentData) => void
  ) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.provider = provider;
    this.bus = bus;
    this.onUpdate = onUpdate;

    // Register networking
    this.bus.register(this.id, this.handleMessage.bind(this));
    this.pushState();
  }

  private handleMessage(msg: Message) {
    switch (msg.type) {
      case MessageType.STATUS_QUERY:
        this.respondToStatusQuery(msg.from);
        break;
      case MessageType.TASK_REQUEST:
        this.startTask(msg.payload.taskId, msg.payload.taskName, msg.payload.duration);
        break;
    }
  }

  private respondToStatusQuery(requesterId: string) {
    this.bus.send({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
      from: this.id,
      to: requesterId,
      type: MessageType.STATUS_RESPONSE,
      payload: {
        status: this.status,
        progress: this.progress,
        currentTask: this.currentTask
      },
      timestamp: Date.now()
    });
  }

  private startTask(taskId: string, taskName: string, duration: number) {
    if (this.status === AgentStatus.WORKING) return; // Busy

    this.status = AgentStatus.WORKING;
    this.currentTask = taskName;
    this.progress = 0;
    this.pushState();

    const startTime = Date.now();

    // Simulation Loop
    this.workTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.progress = Math.min(100, (elapsed / duration) * 100);

      this.pushState();

      if (elapsed >= duration) {
        this.completeTask(taskId);
      }
    }, 100);
  }

  private completeTask(taskId: string) {
    if (this.workTimer) clearInterval(this.workTimer);

    this.status = AgentStatus.COMPLETED; // Momentary status
    this.progress = 100;
    this.pushState();

    // After a brief moment, go back to IDLE so we can accept new tasks
    // But keeps the "completed" status reachable via poll for a moment if needed
    // In this robust design, the orchestrator sees 'COMPLETED' via poll and then we reset.
  }

  // Called by Orchestrator to force reset after acknowledgement
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
      provider: this.provider,
      status: this.status,
      currentTask: this.currentTask,
      progress: this.progress
    });
  }
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================

export default function AgentWorkflowApp() {
  // -- State: Configuration --
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);

  // -- State: Execution --
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // -- Refs for Engine --
  const messageBus = useRef(new MessageBus());
  const agentInstances = useRef<Map<string, AgentNode>>(new Map());
  const orchestratorInterval = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // -- Forms --
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentProvider, setNewAgentProvider] = useState<LLMProvider>('OpenAI');

  const [newTaskName, setNewTaskName] = useState('');
  const [selectedAgentForTask, setSelectedAgentForTask] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(2000);
  const [newTaskDependencies, setNewTaskDependencies] = useState<string[]>([]);

  const providers: LLMProvider[] = ['OpenAI', 'Anthropic', 'Google Gemini', 'Meta Llama', 'Mistral'];

  // ==========================================================================
  // INITIALIZATION & CLEANUP
  // ==========================================================================

  useEffect(() => {
    // Message Logger
    const unsubscribe = messageBus.current.subscribe((msg) => {
      setMessages(prev => [...prev.slice(-49), msg]);
    });
    return () => {
      unsubscribe();
      stopWorkflow();
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ==========================================================================
  // CONFIGURATION HANDLERS
  // ==========================================================================

  const addAgent = () => {
    if (!newAgentName.trim()) return;
    const id = `agent_${Date.now()}`;
    const newAgent: AgentData = {
      id,
      name: newAgentName,
      role: 'Worker',
      provider: newAgentProvider,
      status: AgentStatus.IDLE,
      currentTask: null,
      progress: 0
    };

    // Create actual instance
    const node = new AgentNode(
      id,
      newAgentName,
      'Worker',
      newAgentProvider,
      messageBus.current,
      (data) => {
        setAgents(prev => prev.map(a => a.id === data.id ? data : a));
      }
    );
    agentInstances.current.set(id, node);

    setAgents(prev => [...prev, newAgent]);
    setNewAgentName('');
    // Select this agent by default if it's the first
    if (agents.length === 0) setSelectedAgentForTask(id);
  };

  const removeAgent = (id: string) => {
    if (isRunning) return;
    const node = agentInstances.current.get(id);
    node?.cleanup();
    agentInstances.current.delete(id);
    setAgents(prev => prev.filter(a => a.id !== id));
    // Also remove tasks assigned to this agent
    setTasks(prev => prev.filter(t => t.agentId !== id));
  };

  const addTask = () => {
    if (!newTaskName.trim() || !selectedAgentForTask) return;
    const newTask: TaskDefinition = {
      id: `task_${Date.now()}`,
      name: newTaskName,
      agentId: selectedAgentForTask,
      duration: newTaskDuration,
      dependencies: [...newTaskDependencies],
      status: 'pending'
    };
    setTasks(prev => [...prev, newTask]);
    setNewTaskName('');
    setNewTaskDependencies([]);
  };

  const removeTask = (id: string) => {
    if (isRunning) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    // Remove this task from others' dependencies
    setTasks(prev => prev.map(t => ({
      ...t,
      dependencies: t.dependencies.filter(d => d !== id)
    })));
  };

  const toggleDependency = (targetTaskId: string) => {
    setNewTaskDependencies(prev =>
      prev.includes(targetTaskId)
        ? prev.filter(id => id !== targetTaskId)
        : [...prev, targetTaskId]
    );
  };

  const loadPreset = () => {
    stopWorkflow();
    // Clear existing
    agentInstances.current.forEach(a => a.cleanup());
    agentInstances.current.clear();
    setAgents([]);
    setTasks([]);

    // 1. Create Agents
    const bus = messageBus.current;
    const updateFn = (data: AgentData) => setAgents(prev => prev.map(a => a.id === data.id ? data : a));

    const a1 = new AgentNode('a1', 'Scraper Bot', 'Ingestion', 'Google Gemini', bus, updateFn);
    const a2 = new AgentNode('a2', 'Parser Bot', 'Processing', 'Mistral', bus, updateFn);
    const a3 = new AgentNode('a3', 'Analyst Bot', 'Analysis', 'OpenAI', bus, updateFn);
    const a4 = new AgentNode('a4', 'Writer Bot', 'Reporting', 'Anthropic', bus, updateFn);

    agentInstances.current.set('a1', a1);
    agentInstances.current.set('a2', a2);
    agentInstances.current.set('a3', a3);
    agentInstances.current.set('a4', a4);

    setAgents([
      { id: 'a1', name: 'Scraper Bot', role: 'Ingestion', provider: 'Google Gemini', status: AgentStatus.IDLE, currentTask: null, progress: 0 },
      { id: 'a2', name: 'Parser Bot', role: 'Processing', provider: 'Mistral', status: AgentStatus.IDLE, currentTask: null, progress: 0 },
      { id: 'a3', name: 'Analyst Bot', role: 'Analysis', provider: 'OpenAI', status: AgentStatus.IDLE, currentTask: null, progress: 0 },
      { id: 'a4', name: 'Writer Bot', role: 'Reporting', provider: 'Anthropic', status: AgentStatus.IDLE, currentTask: null, progress: 0 },
    ]);

    // 2. Create Tasks
    setTasks([
      { id: 't1', name: 'Fetch Google Results', agentId: 'a1', duration: 3000, dependencies: [], status: 'pending' },
      { id: 't2', name: 'Extract Metadata', agentId: 'a2', duration: 2000, dependencies: ['t1'], status: 'pending' },
      { id: 't3', name: 'Sentiment Analysis', agentId: 'a3', duration: 4000, dependencies: ['t2'], status: 'pending' },
      { id: 't4', name: 'Generate Summary PDF', agentId: 'a4', duration: 2500, dependencies: ['t3'], status: 'pending' },
    ]);
  };

  // ==========================================================================
  // ORCHESTRATION ENGINE
  // ==========================================================================

  const startWorkflow = () => {
    if (agents.length === 0 || tasks.length === 0) return;

    // Reset task statuses
    setTasks(prev => prev.map(t => ({ ...t, status: 'pending' })));
    setIsRunning(true);
    addLog("Workflow started. Initializing Orchestrator...");

    // Start the Engine Tick
    orchestratorInterval.current = setInterval(runEngineTick, 800);
  };

  const stopWorkflow = () => {
    setIsRunning(false);
    if (orchestratorInterval.current) {
      clearInterval(orchestratorInterval.current);
      orchestratorInterval.current = null;
    }
    // Reset agents to idle
    agentInstances.current.forEach(a => a.resetToIdle());
  };

  const runEngineTick = () => {
    // We use a functional update pattern inside the interval to access latest state
    // See useEffect below
  };

  // The Engine Logic
  useEffect(() => {
    if (!isRunning) return;

    const tick = setInterval(() => {
      // 1. POLL PHASE: Check status of running tasks
      tasks.forEach(task => {
        if (task.status === 'in_progress') {
          // Send poll request
          messageBus.current.send({
            id: `poll_${Date.now()}_${Math.random()}`,
            from: 'ORCHESTRATOR',
            to: task.agentId,
            type: MessageType.STATUS_QUERY,
            payload: {},
            timestamp: Date.now()
          });
        }
      });

      // 2. DISPATCH PHASE: Find tasks ready to start
      const newTasks = [...tasks];
      let changed = false;

      newTasks.forEach(task => {
        if (task.status === 'pending') {
          // Check dependencies
          const parents = newTasks.filter(t => task.dependencies.includes(t.id));
          const allParentsDone = parents.every(p => p.status === 'completed');

          if (allParentsDone) {
            // Check if agent is free
            const agent = agents.find(a => a.id === task.agentId);
            if (agent && agent.status === AgentStatus.IDLE) {
              // START TASK
              task.status = 'in_progress';
              changed = true;

              messageBus.current.send({
                id: `req_${Date.now()}`,
                from: 'ORCHESTRATOR',
                to: task.agentId,
                type: MessageType.TASK_REQUEST,
                payload: {
                  taskId: task.id,
                  taskName: task.name,
                  duration: task.duration
                },
                timestamp: Date.now()
              });
              addLog(`Orchestrator dispatched "${task.name}" to ${agent.name}`);
            }
          }
        }
      });

      if (changed) setTasks(newTasks);

      // 3. COMPLETION CHECK (Stop condition)
      if (tasks.every(t => t.status === 'completed')) {
        addLog("All tasks completed successfully.");
        stopWorkflow();
      }

    }, 800); // Tick every 800ms

    // Listener for POLL RESPONSES to update Task Status
    const responseListener = (msg: Message) => {
      if (msg.type === MessageType.STATUS_RESPONSE && isRunning) {
        const agentStatus = msg.payload.status;
        const fromAgentId = msg.from;

        if (agentStatus === AgentStatus.COMPLETED) {
          // Find the task assigned to this agent that is currently in progress
          setTasks(currentTasks => {
            const task = currentTasks.find(t => t.agentId === fromAgentId && t.status === 'in_progress');
            if (task) {
              // Mark task complete
              addLog(`Task "${task.name}" confirmed finished by ${fromAgentId}.`);

              // Tell agent to reset to IDLE so it can take next task
              const node = agentInstances.current.get(fromAgentId);
              node?.resetToIdle();

              return currentTasks.map(t =>
                t.id === task.id ? { ...t, status: 'completed' } : t
              );
            }
            return currentTasks;
          });
        }
      }
    };

    const unsub = messageBus.current.subscribe(responseListener);

    return () => {
      clearInterval(tick);
      unsub();
    };
  }, [isRunning, tasks, agents]);


  // ==========================================================================
  // HELPERS & UI
  // ==========================================================================

  const addLog = (text: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${text}`, ...prev.slice(0, 19)]);
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return 'border-slate-600 bg-slate-800/50';
      case AgentStatus.WORKING: return 'border-blue-500 bg-blue-900/20';
      case AgentStatus.COMPLETED: return 'border-emerald-500 bg-emerald-900/20';
      default: return 'border-slate-600';
    }
  };

  const getProviderColor = (provider: LLMProvider) => {
    switch (provider) {
      case 'OpenAI': return 'bg-emerald-900/50 text-emerald-300 border-emerald-700';
      case 'Anthropic': return 'bg-amber-900/50 text-amber-300 border-amber-700';
      case 'Google Gemini': return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case 'Meta Llama': return 'bg-indigo-900/50 text-indigo-300 border-indigo-700';
      case 'Mistral': return 'bg-purple-900/50 text-purple-300 border-purple-700';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  const getTaskStatusColor = (status: TaskDefinition['status']) => {
    switch (status) {
      case 'pending': return 'text-slate-500';
      case 'in_progress': return 'text-blue-400';
      case 'completed': return 'text-emerald-400 line-through opacity-70';
      case 'failed': return 'text-red-400';
    }
  };

  const getMessageColor = (type: MessageType) => {
    switch (type) {
      case MessageType.TASK_REQUEST: return 'text-blue-400 border-l-2 border-blue-400 bg-blue-900/10';
      case MessageType.STATUS_RESPONSE: return 'text-emerald-400 border-l-2 border-emerald-400 bg-emerald-900/10';
      case MessageType.STATUS_QUERY: return 'text-slate-500 border-l-2 border-slate-500 bg-slate-900/10 text-xs';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Agent Workflow Builder</h1>
              <p className="text-xs text-slate-400">Production Orchestration Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={startWorkflow}
                disabled={tasks.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
              >
                <Play className="w-4 h-4 fill-current" />
                Run Workflow
              </button>
            ) : (
              <button
                onClick={stopWorkflow}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-red-900/20 animate-pulse"
              >
                <RotateCcw className="w-4 h-4" />
                Stop Execution
              </button>
            )}

            <button
              onClick={loadPreset}
              disabled={isRunning}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors border border-slate-700"
            >
              Load Preset
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout - Modified to be stacked for better visibility */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

        {/* BUILDER & CONFIG - Full Width */}
        <div className="space-y-6">

          {/* Agent Configuration */}
          <section className={`bg-slate-900 rounded-xl border border-slate-800 overflow-hidden transition-opacity ${isRunning ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" /> Agents & Models
              </h2>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{agents.length} Defined</span>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Agent Name (e.g. Scraper)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                  onKeyDown={(e) => e.key === 'Enter' && addAgent()}
                />

                <div className="flex gap-2">
                  <select
                    value={newAgentProvider}
                    onChange={(e) => setNewAgentProvider(e.target.value as LLMProvider)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors text-slate-300"
                  >
                    {providers.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  <button
                    onClick={addAgent}
                    className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 font-medium text-sm"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {agents.map(agent => (
                  <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-800 group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        {agent.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{agent.name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> {agent.provider}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAgent(agent.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {agents.length === 0 && (
                  <div className="text-center py-4 text-slate-600 text-sm italic border-2 border-dashed border-slate-800 rounded-lg">
                    No agents defined. Add one above.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Task Configuration */}
          <section className={`bg-slate-900 rounded-xl border border-slate-800 overflow-hidden transition-opacity ${isRunning ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Tasks & Dependencies
              </h2>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{tasks.length} Queued</span>
            </div>

            <div className="p-4 space-y-4">
              {/* Add Task Form */}
              <div className="space-y-3 bg-slate-950/50 p-4 rounded-lg border border-slate-800/50">
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Task Name (e.g. Analyze Data)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                />

                <div className="flex gap-2">
                  <select
                    value={selectedAgentForTask}
                    onChange={(e) => setSelectedAgentForTask(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors text-slate-300"
                  >
                    <option value="" disabled>Assign Agent...</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>

                  <input
                    type="number"
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                    min={500}
                    step={500}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors text-right"
                    title="Duration (ms)"
                  />
                  <span className="self-center text-xs text-slate-500">ms</span>
                </div>

                {tasks.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Depends On:</label>
                    <div className="flex flex-wrap gap-2">
                      {tasks.map(t => (
                        <button
                          key={t.id}
                          onClick={() => toggleDependency(t.id)}
                          className={`px-2 py-1 rounded text-xs border transition-all ${
                            newTaskDependencies.includes(t.id)
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={addTask}
                  disabled={!newTaskName || !selectedAgentForTask}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> Add to Queue
                </button>
              </div>

              {/* Task List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {tasks.map(task => {
                  const assignedAgent = agents.find(a => a.id === task.agentId);
                  return (
                    <div key={task.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-800 relative group">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-medium ${getTaskStatusColor(task.status)}`}>
                          {task.name}
                        </span>
                        <button
                          onClick={() => removeTask(task.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3 h-3" />
                          <span>{assignedAgent?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>{task.duration}ms</span>
                        </div>
                      </div>

                      {task.dependencies.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800/50 flex flex-wrap gap-1">
                          {task.dependencies.map(depId => {
                            const depTask = tasks.find(t => t.id === depId);
                            return (
                              <span key={depId} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-400">
                                <LinkIcon className="w-2 h-2" />
                                {depTask?.name.substring(0, 10)}...
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Status Dot */}
                      <div className={`absolute top-3 right-8 w-2 h-2 rounded-full ${
                        task.status === 'completed' ? 'bg-emerald-500' :
                        task.status === 'in_progress' ? 'bg-blue-500 animate-pulse' :
                        'bg-slate-700'
                      }`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: LIVE MONITOR - Full Width */}
        <div className="space-y-6">

          {/* Agent Cards */}
          <section>
             <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Live Agent Status</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${getStatusColor(agent.status)}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-900/50 flex items-center justify-center">
                        {agent.status === AgentStatus.WORKING ? (
                          <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
                        ) : agent.status === AgentStatus.COMPLETED ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Cpu className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">{agent.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide font-semibold ${getProviderColor(agent.provider)}`}>
                            {agent.provider}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{agent.currentTask || "Waiting for dispatcher..."}</span>
                      <span>{Math.round(agent.progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-900/50 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ease-linear ${
                          agent.status === AgentStatus.COMPLETED ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {agents.length === 0 && (
                 <div className="col-span-full h-32 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-slate-600">
                    Add agents to monitor them
                 </div>
              )}
             </div>
          </section>

          {/* Visualization & Logs Split */}
          <div className="grid grid-cols-1 gap-6">

            {/* Message Bus Log */}
            <section className="bg-black/30 rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[500px]">
              <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-3 h-3" /> Network Traffic
                </h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                  {messages.length} pkts
                </span>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-700 italic">
                    Network idle. Start workflow to see traffic.
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`p-2 rounded mb-1 flex items-start gap-2 animate-in slide-in-from-left-2 duration-200 ${getMessageColor(msg.type)}`}>
                      <span className="opacity-50 min-w-[50px]">{new Date(msg.timestamp).toLocaleTimeString([], {fractionalSecondDigits: 3, hour12: false}).split(' ')[0]}</span>
                      <div className="flex-1">
                         <div className="flex items-center gap-1 font-bold opacity-90 mb-0.5">
                           <span>{msg.from === 'ORCHESTRATOR' ? 'ORCH' : agents.find(a => a.id === msg.from)?.name || 'SYS'}</span>
                           <ArrowRight className="w-3 h-3 opacity-50" />
                           <span>{msg.to === 'ORCHESTRATOR' ? 'ORCH' : agents.find(a => a.id === msg.to)?.name || 'SYS'}</span>
                           <span className="ml-auto opacity-70 text-[10px] px-1 border border-current rounded">{msg.type}</span>
                         </div>
                         {msg.payload.taskName && (
                           <div className="opacity-80 pl-2 border-l border-current/30">
                             Task: {msg.payload.taskName} ({msg.payload.duration}ms)
                           </div>
                         )}
                         {msg.type === MessageType.STATUS_RESPONSE && (
                           <div className="opacity-70 pl-2 border-l border-current/30 flex gap-2">
                             <span>St: {msg.payload.status}</span>
                             <span>Pr: {Math.round(msg.payload.progress)}%</span>
                           </div>
                         )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Global Event Overlay/Toast Log */}
      <div className="fixed bottom-6 right-6 w-80 pointer-events-none space-y-2 z-50">
        {logs.slice(0, 3).map((log, i) => (
           <div key={i} className="bg-slate-800/90 backdrop-blur border border-slate-700 text-slate-200 text-xs p-3 rounded-lg shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300">
             {log}
           </div>
        ))}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.8);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 1);
        }
      `}</style>
    </div>
  );
}