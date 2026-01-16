<filetree>
Project Structure:
└── demos
    ├── Agent Polling Demo.jsx
    ├── oraclepack_v1.jsx
    ├── oraclepack_v2.jsx
    ├── skill-dashboard.jsx
    └── taskDock.tsx

</filetree>

<source_code>
demos/Agent Polling Demo.jsx
```
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Radio,
  Users,
  Zap,
  Database,
  ArrowRight,
  MessageSquare,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  Cpu
} from 'lucide-react';

// ============================================================================
// CORE TYPES
// ============================================================================

type AgentId = string & { __brand: 'AgentId' };
type TaskId = string & { __brand: 'TaskId' };
type MessageId = string & { __brand: 'MessageId' };

const makeAgentId = (name: string): AgentId => `agent_${name}` as AgentId;
const makeTaskId = (): TaskId => `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` as TaskId;
const makeMessageId = (): MessageId => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` as MessageId;

// ============================================================================
// AGENT STATE & MESSAGE PROTOCOL
// ============================================================================

enum AgentStatus {
  IDLE = 'idle',
  WORKING = 'working',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  ERROR = 'error'
}

enum MessageType {
  TASK_REQUEST = 'task_request',
  TASK_RESPONSE = 'task_response',
  STATUS_QUERY = 'status_query',
  STATUS_RESPONSE = 'status_response',
  HANDOFF = 'handoff'
}

interface Message {
  id: MessageId;
  from: AgentId;
  to: AgentId;
  type: MessageType;
  payload: any;
  timestamp: number;
}

interface AgentState {
  id: AgentId;
  name: string;
  status: AgentStatus;
  currentTask?: TaskId;
  output?: string;
  progress: number;
  lastPolled?: number;
}

// ============================================================================
// SHARED MESSAGE BUS (Simulates network/queue)
// ============================================================================

class MessageBus {
  private messages: Message[] = [];
  private listeners: Map<AgentId, (msg: Message) => void> = new Map();
  private globalListeners: ((msg: Message) => void)[] = [];

  send(message: Message): void {
    this.messages.push(message);

    // Notify targeted agent
    const listener = this.listeners.get(message.to);
    if (listener) {
      setTimeout(() => listener(message), 50); // Simulate network latency
    }

    // Notify global observers (UI)
    this.globalListeners.forEach(cb => cb(message));
  }

  subscribe(agentId: AgentId, callback: (msg: Message) => void): void {
    this.listeners.set(agentId, callback);
  }

  subscribeGlobal(callback: (msg: Message) => void): void {
    this.globalListeners.push(callback);
  }

  unsubscribeGlobal(callback: (msg: Message) => void): void {
    this.globalListeners = this.globalListeners.filter(cb => cb !== callback);
  }

  clear(): void {
    this.messages = [];
  }
}

// ============================================================================
// POLLING COORDINATOR
// ============================================================================

class PollingCoordinator {
  private pollInterval = 800; // Slower for visual clarity
  private activePolls = new Map<string, NodeJS.Timeout>();

  startPolling(
    sourceAgentId: AgentId,
    targetAgentId: AgentId,
    messageBus: MessageBus,
    onStatusReceived: (status: AgentState) => void
  ): void {
    const pollKey = `${sourceAgentId}->${targetAgentId}`;
    this.stopPolling(sourceAgentId, targetAgentId);

    const poll = () => {
      const queryMsg: Message = {
        id: makeMessageId(),
        from: sourceAgentId,
        to: targetAgentId,
        type: MessageType.STATUS_QUERY,
        payload: {},
        timestamp: Date.now()
      };
      messageBus.send(queryMsg);
    };

    // Initial poll
    poll();

    // Set up interval
    const interval = setInterval(poll, this.pollInterval);
    this.activePolls.set(pollKey, interval);
  }

  stopPolling(sourceId: AgentId, targetId: AgentId): void {
    const pollKey = `${sourceId}->${targetId}`;
    const interval = this.activePolls.get(pollKey);
    if (interval) {
      clearInterval(interval);
      this.activePolls.delete(pollKey);
    }
  }

  stopAllForAgent(agentId: AgentId): void {
    // Stop any polls initiated by this agent
    for (const [key, interval] of this.activePolls.entries()) {
      if (key.startsWith(`${agentId}->`)) {
        clearInterval(interval);
        this.activePolls.delete(key);
      }
    }
  }

  stopAll(): void {
    this.activePolls.forEach((interval) => clearInterval(interval));
    this.activePolls.clear();
  }
}

// ============================================================================
// AGENT IMPLEMENTATION
// ============================================================================

class Agent {
  private state: AgentState;
  private messageBus: MessageBus;
  private pollingCoordinator: PollingCoordinator;
  private workSimulation?: NodeJS.Timeout;
  private onStateChange: (state: AgentState) => void;

  constructor(
    name: string,
    messageBus: MessageBus,
    pollingCoordinator: PollingCoordinator,
    onStateChange: (state: AgentState) => void
  ) {
    this.state = {
      id: makeAgentId(name),
      name,
      status: AgentStatus.IDLE,
      progress: 0
    };
    this.messageBus = messageBus;
    this.pollingCoordinator = pollingCoordinator;
    this.onStateChange = onStateChange;

    // Subscribe to messages
    this.messageBus.subscribe(this.state.id, this.handleMessage.bind(this));
    // Initial state push
    this.notifyStateChange();
  }

  private handleMessage(msg: Message): void {
    switch (msg.type) {
      case MessageType.TASK_REQUEST:
        this.handleTaskRequest(msg);
        break;
      case MessageType.STATUS_QUERY:
        this.handleStatusQuery(msg);
        break;
      case MessageType.STATUS_RESPONSE:
        this.handleStatusResponse(msg);
        break;
      case MessageType.HANDOFF:
        this.handleHandoff(msg);
        break;
    }
  }

  private handleTaskRequest(msg: Message): void {
    const { taskId, description, duration = 3000 } = msg.payload;

    this.state.status = AgentStatus.WORKING;
    this.state.currentTask = taskId;
    this.state.output = `Working on: ${description}`;
    this.state.progress = 0;
    this.notifyStateChange();

    // Simulate work with progress updates
    const steps = 20;
    const stepDuration = duration / steps;
    let currentStep = 0;

    this.workSimulation = setInterval(() => {
      currentStep++;
      this.state.progress = (currentStep / steps) * 100;
      this.notifyStateChange();

      if (currentStep >= steps) {
        this.completeTask(msg.from, description);
      }
    }, stepDuration);
  }

  private completeTask(requesterId: AgentId, description: string): void {
    if (this.workSimulation) {
      clearInterval(this.workSimulation);
    }

    this.state.status = AgentStatus.COMPLETED;
    this.state.output = `Completed: ${description}`;
    this.state.progress = 100;
    this.notifyStateChange();

    // Send response back
    const response: Message = {
      id: makeMessageId(),
      from: this.state.id,
      to: requesterId,
      type: MessageType.TASK_RESPONSE,
      payload: {
        taskId: this.state.currentTask,
        result: this.state.output
      },
      timestamp: Date.now()
    };
    this.messageBus.send(response);
  }

  private handleStatusQuery(msg: Message): void {
    this.state.lastPolled = Date.now();
    // We don't notify state change on every poll receive to avoid React render spam,
    // but we send the response immediately.

    const response: Message = {
      id: makeMessageId(),
      from: this.state.id,
      to: msg.from,
      type: MessageType.STATUS_RESPONSE,
      payload: { ...this.state },
      timestamp: Date.now()
    };
    this.messageBus.send(response);
  }

  private handleStatusResponse(msg: Message): void {
    // Received status from an agent we are polling
    const remoteState = msg.payload as AgentState;

    // If we are waiting for this specific agent
    if (this.state.status === AgentStatus.WAITING) {
       // Logic: Check if the agent we are polling is completed
       if (remoteState.status === AgentStatus.COMPLETED) {
          this.state.status = AgentStatus.IDLE;
          this.state.output = `Target ${remoteState.name} finished. Resuming...`;
          this.pollingCoordinator.stopPolling(this.state.id, remoteState.id);
          this.notifyStateChange();
       }
    }
  }

  private handleHandoff(msg: Message): void {
    const { nextAgentId, description } = msg.payload;

    // Start polling the next agent
    this.state.status = AgentStatus.WAITING;
    this.state.output = `Handed off to ${nextAgentId.split('_')[1]}. Waiting...`;
    this.notifyStateChange();

    this.pollingCoordinator.startPolling(
      this.state.id,
      nextAgentId,
      this.messageBus,
      this.handleStatusResponse.bind(this)
    );
  }

  requestTask(targetId: AgentId, taskId: TaskId, description: string, duration?: number): void {
    const msg: Message = {
      id: makeMessageId(),
      from: this.state.id,
      to: targetId,
      type: MessageType.TASK_REQUEST,
      payload: { taskId, description, duration },
      timestamp: Date.now()
    };
    this.messageBus.send(msg);
  }

  handoffTo(nextAgentId: AgentId, taskId: TaskId, description: string): void {
    const handoffMsg: Message = {
      id: makeMessageId(),
      from: this.state.id,
      to: this.state.id, // Self-message to trigger internal state change
      type: MessageType.HANDOFF,
      payload: { nextAgentId, taskId, description },
      timestamp: Date.now()
    };
    this.messageBus.send(handoffMsg);
  }

  getState(): AgentState {
    return { ...this.state };
  }

  private notifyStateChange(): void {
    this.onStateChange({ ...this.state });
  }

  cleanup(): void {
    if (this.workSimulation) {
      clearInterval(this.workSimulation);
    }
    this.pollingCoordinator.stopAllForAgent(this.state.id);
  }
}

// ============================================================================
// REACT UI COMPONENT
// ============================================================================

export default function AgentPollingDemo() {
  const [agents, setAgents] = useState<Map<AgentId, AgentState>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [scenario, setScenario] = useState<'sequential' | 'parallel' | 'handoff' | 'none'>('none');

  const messageBusRef = useRef(new MessageBus());
  const pollingCoordinatorRef = useRef(new PollingCoordinator());
  const agentInstancesRef = useRef<Agent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize System
  useEffect(() => {
    // Setup message listener for UI
    const handleGlobalMessage = (msg: Message) => {
      setMessages(prev => [...prev.slice(-49), msg]); // Keep last 50
    };
    messageBusRef.current.subscribeGlobal(handleGlobalMessage);

    // Initial agents setup (IDLE)
    createAgents();

    return () => {
      cleanup();
      messageBusRef.current.unsubscribeGlobal(handleGlobalMessage);
    };
  }, []);

  // Auto scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const updateAgentState = (state: AgentState) => {
    setAgents(prev => {
      const next = new Map(prev);
      next.set(state.id, state);
      return next;
    });
  };

  const createAgents = () => {
    // Clear old
    agentInstancesRef.current.forEach(a => a.cleanup());
    agentInstancesRef.current = [];
    setAgents(new Map());

    const messageBus = messageBusRef.current;
    const pollingCoordinator = pollingCoordinatorRef.current;

    const names = ['Coordinator', 'Worker-A', 'Worker-B', 'Analyst'];
    const instances = names.map(name =>
      new Agent(name, messageBus, pollingCoordinator, updateAgentState)
    );

    agentInstancesRef.current = instances;
  };

  const runScenario = async (type: 'sequential' | 'parallel' | 'handoff') => {
    if (isRunning) return;

    setIsRunning(true);
    setScenario(type);
    setMessages([]); // Clear log for clean run

    // Re-create fresh agents
    createAgents();

    // Allow React state to settle
    await new Promise(r => setTimeout(r, 100));

    const [coordinator, workerA, workerB, analyst] = agentInstancesRef.current;
    const messageBus = messageBusRef.current;
    const coordinatorId = coordinator.getState().id;
    const workerAId = workerA.getState().id;
    const workerBId = workerB.getState().id;
    const analystId = analyst.getState().id;
    const coordinatorPolling = pollingCoordinatorRef.current;

    if (type === 'sequential') {
      // 1. Coord -> Worker A
      const task1 = makeTaskId();
      const task2 = makeTaskId();

      coordinator.requestTask(workerAId, task1, 'Process Raw Data', 2500);

      // Coord polls Worker A
      coordinatorPolling.startPolling(
        coordinatorId,
        workerAId,
        messageBus,
        (status) => { /* handled by agent internally mostly */ }
      );

      // Wait for Worker A completion via UI observation logic (simulated in this block for orchestration)
      // In a real app, the Coordinator Agent would have this logic. We simulate the Coordinator's "brain" here.
      const checkPhase1 = setInterval(() => {
        if (workerA.getState().status === AgentStatus.COMPLETED) {
          clearInterval(checkPhase1);
          coordinatorPolling.stopPolling(coordinatorId, workerAId);

          // 2. Coord -> Worker B
          setTimeout(() => {
            coordinator.requestTask(workerBId, task2, 'Format Output', 2500);
            coordinatorPolling.startPolling(coordinatorId, workerBId, messageBus, () => {});

            const checkPhase2 = setInterval(() => {
              if (workerB.getState().status === AgentStatus.COMPLETED) {
                clearInterval(checkPhase2);
                coordinatorPolling.stopPolling(coordinatorId, workerBId);
                setIsRunning(false);
              }
            }, 500);
          }, 500);
        }
      }, 500);

    } else if (type === 'parallel') {
      const task1 = makeTaskId();
      const task2 = makeTaskId();

      coordinator.requestTask(workerAId, task1, 'Parallel Analysis A', 3000);
      coordinator.requestTask(workerBId, task2, 'Parallel Analysis B', 3000);

      coordinatorPolling.startPolling(coordinatorId, workerAId, messageBus, () => {});
      coordinatorPolling.startPolling(coordinatorId, workerBId, messageBus, () => {});

      const checkAll = setInterval(() => {
        const aDone = workerA.getState().status === AgentStatus.COMPLETED;
        const bDone = workerB.getState().status === AgentStatus.COMPLETED;

        if (aDone) coordinatorPolling.stopPolling(coordinatorId, workerAId);
        if (bDone) coordinatorPolling.stopPolling(coordinatorId, workerBId);

        if (aDone && bDone) {
          clearInterval(checkAll);
          // Aggregate
          setTimeout(() => {
            analyst.requestTask(coordinatorId, makeTaskId(), 'Merge Results', 1500);
            setTimeout(() => setIsRunning(false), 2000);
          }, 500);
        }
      }, 500);

    } else if (type === 'handoff') {
      // Chain: Coord -> A -> B -> Analyst
      coordinator.requestTask(workerAId, makeTaskId(), 'Step 1: Ingest', 2000);

      const check1 = setInterval(() => {
        if (workerA.getState().status === AgentStatus.COMPLETED) {
          clearInterval(check1);

          // A tells itself to handoff to B
          workerA.handoffTo(workerBId, makeTaskId(), 'Step 2: Transform');
          // Actually trigger B
          workerB.requestTask(workerBId, makeTaskId(), 'Step 2: Transform', 2000);

          const check2 = setInterval(() => {
            if (workerB.getState().status === AgentStatus.COMPLETED) {
              clearInterval(check2);

              workerB.handoffTo(analystId, makeTaskId(), 'Step 3: Finalize');
              analyst.requestTask(analystId, makeTaskId(), 'Step 3: Finalize', 2000);

              const check3 = setInterval(() => {
                if (analyst.getState().status === AgentStatus.COMPLETED) {
                  clearInterval(check3);
                  setIsRunning(false);
                }
              }, 500);
            }
          }, 500);
        }
      }, 500);
    }
  };

  const cleanup = () => {
    agentInstancesRef.current.forEach(agent => agent.cleanup());
    pollingCoordinatorRef.current.stopAll();
    setIsRunning(false);
  };

  const reset = () => {
    cleanup();
    setScenario('none');
    setMessages([]);
    createAgents();
  };

  // Helper styles
  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return 'bg-slate-50 border-slate-200 text-slate-500';
      case AgentStatus.WORKING: return 'bg-blue-50 border-blue-200 text-blue-700';
      case AgentStatus.WAITING: return 'bg-amber-50 border-amber-200 text-amber-700';
      case AgentStatus.COMPLETED: return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case AgentStatus.ERROR: return 'bg-red-50 border-red-200 text-red-700';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return <Clock className="w-5 h-5" />;
      case AgentStatus.WORKING: return <Cpu className="w-5 h-5 animate-pulse" />;
      case AgentStatus.WAITING: return <Activity className="w-5 h-5" />;
      case AgentStatus.COMPLETED: return <CheckCircle className="w-5 h-5" />;
      case AgentStatus.ERROR: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getMessageStyle = (type: MessageType) => {
    switch (type) {
      case MessageType.TASK_REQUEST: return 'border-l-4 border-blue-500 bg-blue-50';
      case MessageType.TASK_RESPONSE: return 'border-l-4 border-emerald-500 bg-emerald-50';
      case MessageType.STATUS_QUERY: return 'border-l-4 border-slate-300 bg-slate-50 opacity-60'; // Dimmed
      case MessageType.STATUS_RESPONSE: return 'border-l-4 border-amber-300 bg-amber-50 opacity-60'; // Dimmed
      case MessageType.HANDOFF: return 'border-l-4 border-purple-500 bg-purple-50';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Header Section */}
        <div className="lg:col-span-12 flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-500" />
              Agent Swarm Orchestrator
            </h1>
            <p className="text-slate-400 mt-2">
              Visualizing async message passing and status polling between autonomous agents.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runScenario('sequential')}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                scenario === 'sequential' ? 'ring-2 ring-blue-500 bg-blue-600/20 text-blue-400' : 'bg-slate-700 hover:bg-slate-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ArrowRight className="w-4 h-4" /> Sequential
            </button>
            <button
              onClick={() => runScenario('parallel')}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                scenario === 'parallel' ? 'ring-2 ring-purple-500 bg-purple-600/20 text-purple-400' : 'bg-slate-700 hover:bg-slate-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Zap className="w-4 h-4" /> Parallel
            </button>
            <button
              onClick={() => runScenario('handoff')}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                scenario === 'handoff' ? 'ring-2 ring-emerald-500 bg-emerald-600/20 text-emerald-400' : 'bg-slate-700 hover:bg-slate-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Radio className="w-4 h-4" /> Handoff
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-red-900/50 text-white rounded-lg transition-colors ml-2 border border-slate-600"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* Left Column: Agents */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Agent Nodes
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500"></span> Idle</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Working</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Polling</span>
            </div>
          </div>

          <div className="grid gap-4">
            {Array.from(agents.values()).map(agent => (
              <div
                key={agent.id}
                className={`relative overflow-hidden rounded-xl border-2 p-5 transition-all duration-300 ${getStatusColor(agent.status)}`}
              >
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg bg-white/50 shadow-sm`}>
                      {getStatusIcon(agent.status)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-none">{agent.name}</h3>
                      <div className="text-xs font-mono uppercase tracking-wider opacity-70 mt-1">
                        ID: {agent.id.split('_')[1]}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wide bg-white/50 backdrop-blur-sm">
                      {agent.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 relative z-10">
                   <div className="text-sm font-medium mb-1 truncate opacity-90">
                     {agent.output || "Ready for tasks..."}
                   </div>
                   {agent.status === AgentStatus.WORKING && (
                     <div className="w-full bg-black/10 rounded-full h-1.5 mt-2 overflow-hidden">
                       <div
                         className="bg-current h-full transition-all duration-300 ease-out"
                         style={{ width: `${agent.progress}%` }}
                       />
                     </div>
                   )}
                </div>
              </div>
            ))}

            {agents.size === 0 && (
              <div className="text-center py-12 text-slate-500 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                System Offline. Select a scenario to initialize agents.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Message Log */}
        <div className="lg:col-span-5 flex flex-col h-[600px] bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" /> Event Bus
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {messages.length} events
            </span>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 py-10 italic">
                Waiting for network traffic...
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded border-l-4 text-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${getMessageStyle(msg.type)}`}
                >
                  <div className="flex justify-between items-center text-xs opacity-70 mb-1 border-b border-black/5 pb-1">
                    <span className="font-bold">{msg.type.toUpperCase()}</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 font-semibold text-xs">
                     <span className="px-1.5 py-0.5 bg-white/50 rounded">{msg.from.split('_')[1]}</span>
                     <ArrowRight className="w-3 h-3 opacity-50" />
                     <span className="px-1.5 py-0.5 bg-white/50 rounded">{msg.to.split('_')[1]}</span>
                  </div>
                  {msg.payload.description && (
                    <div className="mt-1.5 text-xs opacity-90 truncate">
                      "{msg.payload.description}"
                    </div>
                  )}
                  {msg.payload.result && (
                    <div className="mt-1.5 text-xs opacity-90 truncate font-bold">
                      {msg.payload.result}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
```

demos/oraclepack_v1.jsx
```
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
```

demos/oraclepack_v2.jsx
```
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
```

demos/skill-dashboard.jsx
```
import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  BookOpen,
  GitMerge,
  Layout,
  Award,
  ArrowRight,
  CheckCircle,
  Filter,
  BarChart,
  Terminal,
  FileText,
  Code,
  Zap,
  Layers,
  Wrench,
  Palette,
  Star,
  Moon,
  Sun,
  List,
  Grid,
  Plus,
  Trash2,
  Copy,
  Download,
  Sparkles,
  Bot,
  Activity,
  Cpu,
  X,
  UploadCloud,
  Database,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// --- INITIAL DATA (Full 78 Skills) ---
const DEMO_SKILLS = [
  // Delivery Automation
  {
    rank: 1,
    name: "oraclepack-ticketify",
    group: "Delivery automation",
    desc: "Tickets → deterministic action pack",
  },
  {
    rank: 2,
    name: "oraclepack-taskify",
    group: "Delivery automation",
    desc: "Oracle outputs → Stage-3 action pack",
  },
  {
    rank: 3,
    name: "tm-autopilot-rails",
    group: "Delivery automation",
    desc: "Task Master autopilot with rails",
  },
  {
    rank: 4,
    name: "taskmaster-dev-workflow",
    group: "Delivery automation",
    desc: "Task-driven dev loop (tm)",
  },
  {
    rank: 5,
    name: "tm-generate-pipelines_v2",
    group: "Delivery automation",
    desc: "Evidence-gated tm pipelines (v2)",
  },
  {
    rank: 6,
    name: "tm-generate-pipelines",
    group: "Delivery automation",
    desc: "Evidence-gated tm pipelines",
  },
  {
    rank: 7,
    name: "pipeline-executor",
    group: "Delivery automation",
    desc: "Execute pipelines with guardrails",
  },
  {
    rank: 8,
    name: "oraclepack-tickets-pack-grouped",
    group: "Delivery automation",
    desc: "Tickets → grouped Stage-1 packs",
  },
  {
    rank: 9,
    name: "oraclepack-tickets-pack",
    group: "Delivery automation",
    desc: "Tickets → Stage-1 pack",
  },
  {
    rank: 10,
    name: "oraclepack-tickets-pack-direct",
    group: "Delivery automation",
    desc: "Tickets attached directly → Stage-1",
  },
  {
    rank: 11,
    name: "oraclepack-gold-pack",
    group: "Delivery automation",
    desc: "Minimal attachments → Stage-1 pack",
  },
  {
    rank: 12,
    name: "oraclepack-codebase-pack-grouped",
    group: "Delivery automation",
    desc: "Grouped Stage-1 packs from repo",
  },
  {
    rank: 13,
    name: "oraclepack-pipeline-improver",
    group: "Delivery automation",
    desc: "Improve pipeline contracts/manifests",
  },
  {
    rank: 14,
    name: "oraclepack-usecase-rpg",
    group: "Delivery automation",
    desc: "Scenario-driven pack generation",
  },

  // Progress & Auditing
  {
    rank: 15,
    name: "work-progress-auditor",
    group: "Progress & parity auditing",
    desc: "Plans vs code completion report",
  },
  {
    rank: 16,
    name: "progress-audit-tickets-todos",
    group: "Progress & parity auditing",
    desc: "Tickets/TODOs vs code evidence",
  },
  {
    rank: 17,
    name: "code-parity-auditor_v2",
    group: "Progress & parity auditing",
    desc: "Parity audit (v2)",
  },
  {
    rank: 18,
    name: "code-parity-auditor",
    group: "Progress & parity auditing",
    desc: "Parity audit",
  },
  {
    rank: 19,
    name: "skill-dependency-sync",
    group: "Progress & parity auditing",
    desc: "Detect/repair skill drift",
  },
  {
    rank: 20,
    name: "cross-skill-optimization-analyzer",
    group: "Progress & parity auditing",
    desc: "Overlap/conflict analysis",
  },
  {
    rank: 21,
    name: "rule-improvement",
    group: "Progress & parity auditing",
    desc: "Clarify/enforce rules/guardrails",
  },

  // Codebase Understanding
  {
    rank: 22,
    name: "universal-codebase-analyzer_v2",
    group: "Codebase understanding & architecture",
    desc: "Repo-agnostic architecture analysis (v2)",
  },
  {
    rank: 23,
    name: "universal-codebase-analyzer",
    group: "Codebase understanding & architecture",
    desc: "Repo-agnostic architecture analysis",
  },
  {
    rank: 24,
    name: "repo-architecture-infer_v2",
    group: "Codebase understanding & architecture",
    desc: "Infer boundaries/flows fast (v2)",
  },
  {
    rank: 25,
    name: "codebase-domain-architecture-deconstructor",
    group: "Codebase understanding & architecture",
    desc: "Domains/modules + contracts map",
  },
  {
    rank: 26,
    name: "repo-codebase-deconstruct",
    group: "Codebase understanding & architecture",
    desc: "Deep deconstruction + risk map",
  },
  {
    rank: 27,
    name: "repo-socratic-interrogation-plan_v2",
    group: "Codebase understanding & architecture",
    desc: "Unknown-reduction question plan (v2)",
  },
  {
    rank: 28,
    name: "repo-socratic-interrogation-plan",
    group: "Codebase understanding & architecture",
    desc: "Unknown-reduction question plan",
  },
  {
    rank: 29,
    name: "tool-repo-matchmaker",
    group: "Codebase understanding & architecture",
    desc: "Tooling/integration recommendations",
  },
  {
    rank: 30,
    name: "problem-triage",
    group: "Codebase understanding & architecture",
    desc: "Hypotheses + diagnostics plan",
  },
  {
    rank: 31,
    name: "component-cleanup",
    group: "Codebase understanding & architecture",
    desc: "Refactor/cleanup candidates + safety",
  },

  // Planning
  {
    rank: 32,
    name: "strategist-questions_v2",
    group: "Planning, triage, decomposition",
    desc: "High-ROI strategist questions (v2)",
  },
  {
    rank: 33,
    name: "strategist-questions-oracle-pack_v2",
    group: "Planning, triage, decomposition",
    desc: "Strategist questions → oraclepack (v2)",
  },
  {
    rank: 34,
    name: "strategist-questions",
    group: "Planning, triage, decomposition",
    desc: "High-ROI strategist questions",
  },
  {
    rank: 35,
    name: "ticket-decomposer",
    group: "Planning, triage, decomposition",
    desc: "Ticket → atomic tasks + AC",
  },
  {
    rank: 36,
    name: "prd-gen-from-tickets-and-oracle",
    group: "Planning, triage, decomposition",
    desc: "PRD from tickets + oracle outputs",
  },
  {
    rank: 37,
    name: "prd-gen",
    group: "Planning, triage, decomposition",
    desc: "PRD from problem statement",
  },
  {
    rank: 38,
    name: "open-aware-devflow",
    group: "Planning, triage, decomposition",
    desc: "Evidence-grounded minimal diffs",
  },

  // RAG & Search
  {
    rank: 39,
    name: "rag-implementation",
    group: "RAG, embeddings, search",
    desc: "End-to-end RAG design/implementation",
  },
  {
    rank: 40,
    name: "hybrid-search-implementation",
    group: "RAG, embeddings, search",
    desc: "Hybrid (vector + keyword) retrieval",
  },
  {
    rank: 41,
    name: "embedding-strategies",
    group: "RAG, embeddings, search",
    desc: "Embeddings/chunking/index strategy",
  },
  {
    rank: 42,
    name: "vector-index-tuning",
    group: "RAG, embeddings, search",
    desc: "Index tuning for latency/recall",
  },
  {
    rank: 43,
    name: "similarity-search-patterns",
    group: "RAG, embeddings, search",
    desc: "Similarity search best practices",
  },
  {
    rank: 44,
    name: "langchain-architecture",
    group: "RAG, embeddings, search",
    desc: "LangChain/LangGraph agent flows",
  },
  {
    rank: 45,
    name: "llm-evaluation",
    group: "RAG, embeddings, search",
    desc: "LLM eval metrics + harness",
  },
  {
    rank: 46,
    name: "prompt-engineering-patterns",
    group: "RAG, embeddings, search",
    desc: "Reusable prompting patterns",
  },

  // Testing
  {
    rank: 47,
    name: "webapp-testing",
    group: "Testing, QA, debugging",
    desc: "Webapp test plan + outputs",
  },
  {
    rank: 48,
    name: "e2e-targeting",
    group: "Testing, QA, debugging",
    desc: "High-value E2E targets + plan",
  },
  {
    rank: 49,
    name: "web-artifacts-builder",
    group: "Testing, QA, debugging",
    desc: "Deterministic repro/report bundles",
  },
  {
    rank: 50,
    name: "debug-lldb",
    group: "Testing, QA, debugging",
    desc: "LLDB debugging workflows",
  },

  // Authoring
  {
    rank: 51,
    name: ".system/skill-installer",
    group: "Skill & plugin authoring",
    desc: "Install curated/experimental skills",
  },
  {
    rank: 52,
    name: ".system/skill-creator",
    group: "Skill & plugin authoring",
    desc: "Generate skills with conventions",
  },
  {
    rank: 53,
    name: "skill-creator",
    group: "Skill & plugin authoring",
    desc: "Create skill folder + structure",
  },
  {
    rank: 54,
    name: "mcp-builder",
    group: "Skill & plugin authoring",
    desc: "Build/wrap MCP server layer",
  },
  {
    rank: 55,
    name: "plugins/plugin-dev/skills/mcp-integration",
    group: "Skill & plugin authoring",
    desc: "MCP integration patterns",
  },
  {
    rank: 56,
    name: "plugins/plugin-dev/skills/hook-development",
    group: "Skill & plugin authoring",
    desc: "Implement plugin hooks",
  },
  {
    rank: 57,
    name: "plugins/plugin-dev/skills/command-development",
    group: "Skill & plugin authoring",
    desc: "Author slash commands",
  },
  {
    rank: 58,
    name: "plugins/plugin-dev/skills/agent-development",
    group: "Skill & plugin authoring",
    desc: "Develop plugin agents",
  },
  {
    rank: 59,
    name: "plugins/plugin-dev/skills/skill-development",
    group: "Skill & plugin authoring",
    desc: "Develop plugin skills",
  },
  {
    rank: 60,
    name: "plugins/plugin-dev/skills/plugin-structure",
    group: "Skill & plugin authoring",
    desc: "Plugin structure/layout rules",
  },
  {
    rank: 61,
    name: "plugins/plugin-dev/skills/plugin-settings",
    group: "Skill & plugin authoring",
    desc: "Per-project plugin settings/state",
  },
  {
    rank: 62,
    name: "plugins/hookify/skills/writing-rules",
    group: "Skill & plugin authoring",
    desc: "Enforce writing/rules via hooks",
  },
  {
    rank: 63,
    name: "template-skill",
    group: "Skill & plugin authoring",
    desc: "Minimal skill starter template",
  },

  // Docs
  {
    rank: 64,
    name: "docs-sync-generic",
    group: "Docs, comms, and artifacts",
    desc: "Docs/examples synced to code",
  },
  {
    rank: 65,
    name: "internal-comms",
    group: "Docs, comms, and artifacts",
    desc: "Internal comms drafting",
  },
  {
    rank: 66,
    name: "transcript-cleaner",
    group: "Docs, comms, and artifacts",
    desc: "Notes/transcripts → structured docs",
  },
  {
    rank: 67,
    name: "plugins/document-skills/docx",
    group: "Docs, comms, and artifacts",
    desc: "DOCX generate/edit",
  },
  {
    rank: 68,
    name: "plugins/document-skills/pptx",
    group: "Docs, comms, and artifacts",
    desc: "PPTX generate/edit",
  },
  {
    rank: 69,
    name: "plugins/document-skills/xlsx",
    group: "Docs, comms, and artifacts",
    desc: "XLSX generate/edit",
  },
  {
    rank: 70,
    name: "plugins/document-skills/pdf",
    group: "Docs, comms, and artifacts",
    desc: "PDF generate/edit/extract",
  },
  {
    rank: 71,
    name: "slack-gif-creator",
    group: "Docs, comms, and artifacts",
    desc: "Slack-ready GIF creation",
  },
  {
    rank: 72,
    name: "brand-guidelines",
    group: "Docs, comms, and artifacts",
    desc: "Create/enforce brand guidelines",
  },

  // Design
  {
    rank: 73,
    name: "frontend-design",
    group: "Design & creative",
    desc: "UI design guidance",
  },
  {
    rank: 74,
    name: "plugins/frontend-design/skills/frontend-design",
    group: "Design & creative",
    desc: "Packaged frontend design skill",
  },
  {
    rank: 75,
    name: "plugins/frontend-design",
    group: "Design & creative",
    desc: "Frontend design plugin wrapper",
  },
  {
    rank: 76,
    name: "canvas-design",
    group: "Design & creative",
    desc: "Layout/visual structure design",
  },
  {
    rank: 77,
    name: "theme-factory",
    group: "Design & creative",
    desc: "Consistent themes/tokens",
  },
  {
    rank: 78,
    name: "algorithmic-art",
    group: "Design & creative",
    desc: "Generative/algorithmic art",
  },
];

const WORKFLOW_STEPS = [
  {
    step: 1,
    title: "Map the Repo",
    skill: "universal-codebase-analyzer_v2",
    desc: "Run on core directories to get an evidence-anchored module map and boundaries.",
    icon: Layers,
  },
  {
    step: 2,
    title: "Identify Unknowns",
    skill: "strategist-questions_v2",
    desc: "Generate next questions and smallest experiments using the repo map plus constraints.",
    icon: BookOpen,
  },
  {
    step: 3,
    title: "Plan Execution",
    skill: "oraclepack-ticketify",
    desc: "Convert tickets into a deterministic runner-ingestible pack/action structure.",
    icon: Terminal,
  },
  {
    step: 4,
    title: "Generate Pipeline",
    skill: "tm-generate-pipelines_v2",
    desc: "Produce evidence-gated pipeline variants for implementation.",
    icon: GitMerge,
  },
  {
    step: 5,
    title: "Audit Progress",
    skill: "work-progress-auditor",
    desc: "Compute completion % and generate a reviewable diff for ticket updates.",
    icon: BarChart,
  },
  {
    step: 6,
    title: "Verify Flows",
    skill: "webapp-testing",
    desc: "Add/verify Playwright checks for the most important UI/API paths.",
    icon: CheckCircle,
  },
];

const VERSION_COMPARISONS = [
  {
    rank: 1,
    family: "universal-codebase-analyzer",
    best: "v2",
    note: "v2 tightens deterministic workflow and evidence rules.",
  },
  {
    rank: 2,
    family: "strategist-questions",
    best: "v2",
    note: "v2 output template is ROI-ranked and more structured.",
  },
  {
    rank: 3,
    family: "tm-generate-pipelines",
    best: "v2",
    note: "v2 generalizes beyond Task Master-only generation.",
  },
  {
    rank: 4,
    family: "code-parity-auditor",
    best: "v2",
    note: "v2 adds stronger evidence-anchored constraints.",
  },
  {
    rank: 5,
    family: "repo-socratic-interrogation-plan",
    best: "v2",
    note: "v2 is QA-ready and adds ranked top leaves.",
  },
];

// --- COMPONENTS ---

function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
  badgeCount,
  special,
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium ${
        active
          ? special
            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
            : "bg-blue-600 text-white shadow-md"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
      {badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
          {badgeCount}
        </span>
      )}
    </button>
  );
}

function AddSkillModal({ isOpen, onClose, onAdd, categories, nextRank }) {
  const [formData, setFormData] = useState({
    name: "",
    group: categories[0] || "Uncategorized",
    desc: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      ...formData,
      rank: nextRank,
    });
    setFormData({
      name: "",
      group: categories[0] || "Uncategorized",
      desc: "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Add New Skill
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Skill Name
            </label>
            <input
              required
              type="text"
              placeholder="e.g. redis-cache-optimizer"
              className="w-full rounded-lg border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <div className="relative">
              <input
                list="category-options"
                required
                className="w-full rounded-lg border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                value={formData.group}
                onChange={(e) =>
                  setFormData({ ...formData, group: e.target.value })
                }
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select existing or type new
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe what this skill does..."
              className="w-full rounded-lg border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white resize-none"
              value={formData.desc}
              onChange={(e) =>
                setFormData({ ...formData, desc: e.target.value })
              }
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              Add Skill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportModal({ isOpen, onClose, onImport }) {
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // --- PARSING LOGIC ---
  const handleParse = () => {
    setError(null);
    let parsedData = [];

    try {
      const trimmed = inputText.trim();

      // 1. JSON Parsing
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const json = JSON.parse(trimmed);
        parsedData = Array.isArray(json) ? json : [json];
      }
      // 2. File Tree + Source Code Parsing (skills.md format)
      else if (
        trimmed.includes("<filetree>") ||
        trimmed.includes("<source_code>")
      ) {
        parsedData = parseMergedMarkdown(trimmed);
      }
      // 3. Simple Markdown Table Parsing
      else if (trimmed.includes("|") && !trimmed.includes("└──")) {
        const lines = trimmed.split("\n");
        parsedData = lines
          .filter((line) => line.includes("|") && !line.includes("---"))
          .map((line) => {
            const parts = line
              .split("|")
              .map((p) => p.trim())
              .filter((p) => p !== "");
            // Format: Rank | Use case group | Skill | Primary outcome
            if (parts.length >= 3) {
              const rank = parseInt(parts[0]) || 0;
              const group = parts.length > 3 ? parts[1] : "Imported";
              const name = parts.length > 3 ? parts[2] : parts[1];
              const desc = parts.length > 3 ? parts[3] : parts[2];
              // Header skipping check
              if (
                name.toLowerCase() === "skill" ||
                group.toLowerCase() === "use case group"
              )
                return null;
              return { rank, group, name, desc };
            }
            return null;
          })
          .filter(Boolean);
      }
      // 4. Fallback: Pure File Tree (visual only)
      else if (trimmed.includes("└──") || trimmed.includes("├──")) {
        parsedData = parseVisualTree(trimmed);
      } else {
        throw new Error(
          "Format not recognized. Supported: JSON, skills.md (Tree+Source), Markdown Table, or Visual Tree."
        );
      }

      if (parsedData.length === 0) {
        throw new Error("No valid skills identified.");
      }

      // Final validation
      const valid = parsedData.every((s) => s.name);
      if (!valid) throw new Error("Some items are missing 'name' fields.");

      onImport(parsedData);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Parsing failed.");
    }
  };

  /**
   * Helper: Parses the combined <filetree> ... <source_code> format.
   * Merges tree structure (groups) with content from source blocks (descriptions).
   */
  const parseMergedMarkdown = (text) => {
    // A. Extract sections using robust state-machine or careful splits
    // Using RegExp with 's' flag (dotAll) for section extraction
    const treeMatch = new RegExp(
      "<filetree>([\\s\\S]*?)</filetree>",
      "i"
    ).exec(text);
    const sourceMatch = new RegExp(
      "<source_code>([\\s\\S]*)",
      "i"
    ).exec(text);

    const treeText = treeMatch ? treeMatch[1] : "";
    const sourceText = sourceMatch ? sourceMatch[1] : "";

    // B. Parse the Tree to Identify Skills and Groups
    const skillsMap = new Map(); // Key: FileName (or Path), Value: PartialSkill
    if (treeText) {
      const treeSkills = parseVisualTree(treeText);
      treeSkills.forEach((s) => {
        // Use name as key, but also store partial path if available could be better
        // For now, rely on name matching
        skillsMap.set(s.name, s);
      });
    }

    // C. Parse Source Code Blocks to enrich descriptions
    // Format:
    // path/to/file.md
    // ```
    // content
    // ```
    if (sourceText) {
      const lines = sourceText.split("\n");
      let currentFile = null;
      let inFence = false;
      let buffer = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (inFence) {
          // Check for closing fence. Standard is ```.
          // Note: If content has nested fences, this simple parser breaks.
          // Assumption: Top-level source blocks use standard ``` and user content is inside.
          if (trimmed === "```") {
            inFence = false;
            // Process buffer for currentFile
            if (currentFile) {
              const content = buffer.join("\n");
              const enriched = extractMetadataFromContent(content);
              const nameFromPath = currentFile.split("/").pop().replace(".md", ""); // e.g. SKILL.md -> SKILL

              // Key matching strategy:
              // 1. If name is SKILL, use parent folder name?
              //    Actually, our tree parser handles the naming.
              //    We need to match `currentFile` path to the tree entries.
              //    Tree entries usually come from folder names if it was SKILL.md.

              // Let's refine matching:
              // Find a skill in skillsMap whose name matches the filename or parent folder.

              let skillKey = nameFromPath;
              if (nameFromPath === "SKILL") {
                 // get parent folder
                 const parts = currentFile.split("/");
                 if (parts.length > 1) skillKey = parts[parts.length - 2];
              }

              // Update the skill if found, or create new if we trust source_code more
              if (skillsMap.has(skillKey)) {
                const existing = skillsMap.get(skillKey);
                skillsMap.set(skillKey, { ...existing, desc: enriched.desc || existing.desc });
              } else {
                // If not in tree, maybe add it?
                skillsMap.set(skillKey, {
                  name: skillKey,
                  group: "Imported Source",
                  rank: 99,
                  desc: enriched.desc || "No description found."
                });
              }
            }
            buffer = [];
            currentFile = null;
          } else {
            buffer.push(line);
          }
        } else {
          // Look for file path followed by fence
          // Heuristic: Line ending in .md or .js etc, AND next line is ```
          const nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
          if (nextLine.startsWith("```")) {
             // Validate it looks like a path
             if (trimmed.length > 0 && !trimmed.startsWith("```")) {
               currentFile = trimmed;
               inFence = true;
               i++; // Skip the fence line
             }
          }
        }
      }
    }

    return Array.from(skillsMap.values());
  };

  /**
   * Helper: Parses strictly the visual tree format to find skills.
   */
  const parseVisualTree = (text) => {
    const lines = text.split("\n");
    let lastFolder = "";
    let items = [];

    lines.forEach((line) => {
      // Clean tree chars
      const cleanLine = line.replace(/[│├└─\s]/g, "");
      if (!cleanLine) return;

      // Detect Folder (simple heuristic: no dot, or ends in /)
      // Note: This assumes folder structure implies groupings.
      if (!cleanLine.includes(".")) {
        lastFolder = cleanLine;
        return;
      }

      // Logic A: Folder containing SKILL.md -> Skill Name = Folder Name
      if (cleanLine === "SKILL.md" && lastFolder) {
        items.push({
          rank: 99,
          name: lastFolder,
          group: "Imported Tree",
          desc: `Imported skill from ${lastFolder}`,
        });
      }
      // Logic B: Standalone .md file -> Skill Name = Filename
      else if (
        cleanLine.endsWith(".md") &&
        !["README.md", "LICENSE.md", "sources.md", "template.md"].includes(cleanLine)
      ) {
        const name = cleanLine.replace(".md", "");
        items.push({
          rank: 99,
          name: name,
          group: "Imported Tree",
          desc: `Imported standalone skill`,
        });
      }
    });

    // Deduplicate
    const unique = new Map();
    items.forEach((i) => unique.set(i.name, i));
    return Array.from(unique.values());
  };

  /**
   * Helper: Extracts description/metadata from raw markdown content.
   */
  const extractMetadataFromContent = (content) => {
    // 1. Try Frontmatter
    // Regex matches --- (newline) content (newline) ---
    const fmRegex = /^---\n([\s\S]*?)\n---/;
    const match = fmRegex.exec(content);

    let desc = "";

    if (match) {
      const fmBlock = match[1];
      // Look for description: or desc:
      const descLine = fmBlock.split("\n").find(l => l.startsWith("description:") || l.startsWith("desc:"));
      if (descLine) {
        desc = descLine.split(":")[1].trim();
      }
    }

    // 2. Fallback: First non-heading paragraph
    if (!desc) {
      const body = content.replace(fmRegex, "").trim();
      const lines = body.split("\n");
      for (let l of lines) {
        l = l.trim();
        if (l && !l.startsWith("#") && !l.startsWith("```")) {
          desc = l;
          break;
        }
      }
    }

    // Truncate if too long
    if (desc.length > 150) desc = desc.substring(0, 147) + "...";

    return { desc };
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <Database className="text-purple-600" size={20} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Import Skills
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
            <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">
              Supported Formats
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <strong className="block text-slate-700 dark:text-slate-300">
                  Skills.md (Tree + Source):
                </strong>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Paste the full content of a skills.md file containing &lt;filetree&gt; and &lt;source_code&gt; tags.
                </p>
              </div>
              <div>
                <strong className="block text-slate-700 dark:text-slate-300">
                  Standard Lists:
                </strong>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Markdown Tables, pure File Trees, or JSON arrays.
                </p>
              </div>
            </div>
          </div>

          <textarea
            className="w-full h-64 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-slate-100 resize-none"
            placeholder="Paste your skills.md, JSON, or Table here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          {error && (
            <div className="mt-3 flex items-center text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={16} className="mr-2" />
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleParse}
            className="px-4 py-2 text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 rounded-lg shadow-sm transition-colors flex items-center"
          >
            <UploadCloud size={16} className="mr-2" />
            Parse & Import
          </button>
        </div>
      </div>
    </div>
  );
}

function SkillCard({ skill, isFavorite, onToggleFavorite, matchScore }) {
  const isV2 = skill.name.includes("_v2");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = skill.name;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div
      className={`
      relative group flex flex-col h-full
      bg-white dark:bg-slate-800
      rounded-lg p-4
      shadow-sm border border-slate-200 dark:border-slate-700
      hover:shadow-md transition-all duration-200
      ${isFavorite ? "ring-2 ring-amber-400 dark:ring-amber-500/50" : ""}
    `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Rank #{skill.rank || "?"}
          </span>
          {matchScore > 0 && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center mt-1">
              <Sparkles size={10} className="mr-1" />
              {matchScore}% Match
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isV2 && (
            <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full font-semibold">
              v2
            </span>
          )}
          <button
            onClick={() => onToggleFavorite(skill)}
            className={`p-1 rounded-full transition-colors ${
              isFavorite
                ? "text-amber-400 hover:text-amber-500"
                : "text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400"
            }`}
          >
            <Star size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 break-words leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {skill.name}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug">
          {skill.desc}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center text-xs text-slate-500 dark:text-slate-500 truncate mr-2">
          <Layers size={12} className="mr-1 flex-shrink-0" />
          <span className="truncate">
            {skill.group ? skill.group.split("(")[0] : "General"}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          title="Copy skill name"
        >
          {copied ? (
            <CheckCircle size={14} className="text-green-500" />
          ) : (
            <Copy size={14} />
          )}
        </button>
      </div>
    </div>
  );
}

function BestSkillCard({ item, allSkills, isFavorite, onToggleFavorite }) {
  // If we have data, try to find the actual skill object. If simple object from initial, use it.
  const skillObj = allSkills.find((s) => s.name === item.skill) || {
    name: item.skill,
    desc: item.outcome,
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <Award size={64} className="text-blue-500" />
      </div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <div className="text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wide">
            Best in {item.group.split("(")[0].trim()}
          </div>
          <button
            onClick={() => onToggleFavorite(skillObj)}
            className={`p-1 rounded-full transition-colors z-20 ${
              isFavorite
                ? "text-amber-400 hover:text-amber-500"
                : "text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400"
            }`}
          >
            <Star size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {item.skill}
        </h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm">
          {item.outcome}
        </p>
      </div>
    </div>
  );
}

function ToolkitView({
  favorites,
  allSkills,
  onToggleFavorite,
  clearFavorites,
}) {
  const favoriteSkills = favorites.map((favName) => {
    return (
      allSkills.find((s) => s.name === favName) || {
        name: favName,
        group: "Unknown",
        desc: "Skill not found in current catalog",
        rank: 0,
      }
    );
  });

  const handleExport = () => {
    const text = `# My Skill Toolkit\n\nGenerated on ${new Date().toLocaleDateString()}\n\n${favoriteSkills
      .map((s) => `## ${s.name}\n- Group: ${s.group}\n- Description: ${s.desc}`)
      .join("\n\n")}`;
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-toolkit.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (favoriteSkills.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center animate-fade-in">
        <div className="bg-slate-100 dark:bg-slate-800/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <Star size={48} className="text-slate-300 dark:text-slate-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Your Toolkit is Empty
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
          Start building your custom workflow by clicking the star icon on any
          skill card in the catalog.
        </p>
        <button
          onClick={() => document.getElementById("nav-catalog")?.click()}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Search size={18} className="mr-2" />
          Browse Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            My Toolkit
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Your selection of {favoriteSkills.length} skills for your custom
            workflow.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={clearFavorites}
            className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
          >
            <Trash2 size={16} className="mr-2" />
            Clear All
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-sm text-sm font-medium"
          >
            <Download size={16} className="mr-2" />
            Export List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {favoriteSkills.map((skill) => (
          <SkillCard
            key={skill.name}
            skill={skill}
            isFavorite={true}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}

function WorkflowView({ onAddToToolkit }) {
  return (
    <div className="max-w-4xl mx-auto py-6 animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Recommended Workflow
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-6">
          An end-to-end engineering loop (plan → generate → execute → verify)
          using the highest leverage skills.
        </p>
        <button
          onClick={onAddToToolkit}
          className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
        >
          <Plus size={16} className="mr-2" />
          Add Entire Workflow to Toolkit
        </button>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700" />

        <div className="space-y-8">
          {WORKFLOW_STEPS.map((step, idx) => (
            <div key={idx} className="relative flex items-start group">
              <div className="absolute left-6 w-4 h-4 -ml-2 rounded-full bg-white dark:bg-slate-900 border-4 border-blue-500 dark:border-blue-400 z-10" />

              <div className="ml-16 w-full">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group-hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <step.icon size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {step.step}. {step.title}
                      </h3>
                    </div>
                    <div className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                      {step.skill}
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VersionCompareView() {
  return (
    <div className="max-w-4xl mx-auto py-6 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Version Comparison (v1 vs v2)
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Why you should almost always prefer v2 skills.
        </p>
      </div>

      <div className="overflow-hidden bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <th className="p-4 font-semibold">Skill Family</th>
              <th className="p-4 font-semibold">Best Version</th>
              <th className="p-4 font-semibold">Why Upgrade?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {VERSION_COMPARISONS.map((item, i) => (
              <tr
                key={i}
                className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <td className="p-4 font-mono text-sm font-medium text-slate-700 dark:text-slate-200">
                  {item.family}
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    {item.best}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                  {item.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AISearchView({ allSkills, toggleFavorite, favorites }) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [inferredIntent, setInferredIntent] = useState("");

  const handleAISearch = () => {
    if (!query.trim()) return;

    setIsSearching(true);

    setTimeout(() => {
      const terms = query
        .toLowerCase()
        .split(" ")
        .filter((t) => t.length > 2);

      const ranked = allSkills
        .map((skill) => {
          let score = 0;
          const text =
            `${skill.name} ${skill.desc} ${skill.group}`.toLowerCase();

        terms.forEach((term) => {
            if (text.includes(term)) score += 10;
            if (skill.name.toLowerCase().includes(term)) score += 15;
            if (term === "plan" && text.includes("strategist")) score += 8;
            if (term === "test" && text.includes("audit")) score += 5;
            if (term === "fix" && text.includes("cleanup")) score += 5;
            if (term === "debt" && text.includes("refactor")) score += 8;
          });

          score += Math.random() * 2;

        return { ...skill, score };
        })
        .filter((s) => s.score > 5)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setResults(ranked);
      setInferredIntent(
        `Analyzing request for "${query}"... prioritizing skills related to ${
          terms[0] || "your query"
        }.`
      );
      setIsSearching(false);
    }, 1200);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAISearch();
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
          <Bot className="text-white h-8 w-8" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
          AI Skill Matcher
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Describe your engineering task in natural language. We'll simulate an
          LLM inference step to re-rank the catalog for you.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-2 mb-8 relative overflow-hidden">
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., I need to pay down technical debt and refactor legacy code..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 pl-4 pr-32 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-24 text-slate-900 dark:text-slate-100"
          />
          <button
            onClick={handleAISearch}
            disabled={isSearching || !query.trim()}
            className={`absolute right-3 bottom-3 px-4 py-2 rounded-lg font-medium flex items-center transition-all ${
              isSearching
                ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
            }`}
          >
            {isSearching ? (
              <>
                <Sparkles size={16} className="animate-spin mr-2" />
                Thinking...
              </>
            ) : (
              <>
                <Zap size={16} className="mr-2" />
                Rank Skills
              </>
            )}
          </button>
        </div>
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <Cpu size={12} />
            <span>Model: Simulated (Frontend-only)</span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity
              size={12}
              className={
                isSearching ? "text-green-500 animate-pulse" : "text-slate-400"
              }
            />
            <span>Inference Status: {isSearching ? "Processing" : "Idle"}</span>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="animate-fade-in">
          <div className="flex items-center space-x-2 mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
            <Sparkles size={14} className="text-purple-500" />
            <span>{inferredIntent}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((skill, idx) => (
              <SkillCard
                key={skill.name}
                skill={skill}
                isFavorite={favorites.includes(skill.name)}
                onToggleFavorite={toggleFavorite}
                matchScore={Math.min(99, Math.round(skill.score * 5))}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- MAIN APP COMPONENT ---

export default function App() {
  const [view, setView] = useState("catalog");
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");
  const [favorites, setFavorites] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isGroupedView, setIsGroupedView] = useState(false);

  // New state for dynamic skills
  const [skills, setSkills] = useState(DEMO_SKILLS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Derived categories from current skills
  const categories = useMemo(() => {
    const groups = new Set(skills.map((s) => s.group).filter(Boolean));
    return Array.from(groups).sort();
  }, [skills]);

  // Derive "Best Skills" dynamically based on current data
  // Logic: For each group, find the skill with rank 1 (or lowest rank number)
  const bestSkills = useMemo(() => {
    return categories
      .map((cat) => {
        const skillsInGroup = skills.filter((s) => s.group === cat);
        if (skillsInGroup.length === 0) return null;
        // Sort by rank ascending (1 is best)
        const topSkill = skillsInGroup.sort(
          (a, b) => (a.rank || 999) - (b.rank || 999)
        )[0];
        return {
         group: cat,
         skill: topSkill.name,
         outcome: topSkill.desc,
       };
      })
      .filter(Boolean)
      .slice(0, 6); // Take top 6 for layout
  }, [categories, skills]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleFavorite = (skill) => {
    if (!skill) return;
    setFavorites((prev) =>
      prev.includes(skill.name)
        ? prev.filter((n) => n !== skill.name)
        : [...prev, skill.name]
    );
  };

  const addWorkflowToToolkit = () => {
    const workflowSkillNames = WORKFLOW_STEPS.map((s) => s.skill);
    setFavorites((prev) => [...new Set([...prev, ...workflowSkillNames])]);
    setView("toolkit");
  };

  const handleAddSkill = (newSkill) => {
    setSkills((prev) => [newSkill, ...prev]);
  };

  const handleImportSkills = (importedSkills) => {
    // Overwrite or Append? Let's overwrite for clean state, or maybe just replace.
    // For this demo, we'll append but remove duplicates based on name
    setSkills((prev) => {
      const existingNames = new Set(prev.map((s) => s.name));
      const newSkills = importedSkills.filter(
        (s) => !existingNames.has(s.name)
      );
      return [...newSkills, ...prev];
    });
  };

  const handleClearSkills = () => {
    if (window.confirm("Are you sure you want to clear all skills?")) {
      setSkills([]);
      setFavorites([]);
    }
  };

  const handleResetSkills = () => {
    if (window.confirm("Reset to default demo data?")) {
      setSkills(DEMO_SKILLS);
    }
  };

  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      const matchesSearch =
        skill.name.toLowerCase().includes(search.toLowerCase()) ||
        skill.desc.toLowerCase().includes(search.toLowerCase());
      const matchesGroup =
        activeGroup === "All" || skill.group.includes(activeGroup);
      return matchesSearch && matchesGroup;
    });
  }, [search, activeGroup, skills]);

  const skillsDisplay = useMemo(() => {
    if (!isGroupedView || activeGroup !== "All") return null;

    return categories
      .map((cat) => {
        const catSkills = filteredSkills.filter((s) => s.group.includes(cat));
        if (catSkills.length === 0) return null;
        return { category: cat, skills: catSkills };
      })
      .filter(Boolean);
  }, [filteredSkills, isGroupedView, activeGroup, categories]);

  return (
    <div className="h-full">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
                  <Wrench className="text-white h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight hidden md:block">
                  Skill Matrix
                </h1>
</div>

              <nav className="flex space-x-1">
                <NavButton
                  id="nav-catalog"
                  active={view === "catalog"}
                  onClick={() => setView("catalog")}
                  icon={Layout}
                  label="Catalog"
                />
                <NavButton
                  active={view === "workflow"}
                  onClick={() => setView("workflow")}
                  icon={GitMerge}
                  label="Workflow"
                />
                <NavButton
                  active={view === "ai-search"}
                  onClick={() => setView("ai-search")}
                  icon={Sparkles}
                  label="AI Match"
                  special={true}
                />
                <NavButton
                  active={view === "toolkit"}
                  onClick={() => setView("toolkit")}
                  icon={Star}
                  label="Toolkit"
                  badgeCount={favorites.length}
                />
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-2 self-center" />
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {view === "catalog" && (
            <div className="animate-fade-in">
              {/* Best Skills Section (Hero) - Only show if we have skills */}
              {bestSkills.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center space-x-2 mb-6">
                    <Award className="text-amber-500" size={24} />
                    <h2 className="text-2xl font-bold">Best in Class</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bestSkills.map((item, idx) => (
                      <BestSkillCard
                        key={idx}
                        item={item}
                        allSkills={skills}
                        isFavorite={favorites.includes(item.skill)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Controls Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-200">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search skills..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 border-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors text-slate-900 dark:text-slate-100"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2 md:space-x-4 overflow-x-auto">
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                      title="Add Single Skill"
                    >
                      <Plus size={18} />
                    </button>
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="p-2 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
                      title="Import Data"
                    >
                      <UploadCloud size={18} />
                    </button>
                    <button
                      onClick={handleResetSkills}
                      className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                      title="Reset to Demo Data"
                    >
                      <RefreshCw size={18} />
                    </button>
                    <button
                      onClick={handleClearSkills}
                      className="p-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                      title="Clear All"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden md:block" />

                  {/* View Toggle */}
                  <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                    <button
                      onClick={() => setIsGroupedView(false)}
                      className={`p-1.5 rounded-md transition-all ${
                        !isGroupedView
                          ? "bg-white dark:bg-slate-600 shadow-sm"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                      title="Grid View"
                    >
                      <Grid size={16} />
                    </button>
                    <button
                      onClick={() => setIsGroupedView(true)}
                      className={`p-1.5 rounded-md transition-all ${
                        isGroupedView
                          ? "bg-white dark:bg-slate-600 shadow-sm"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                      title="Grouped List View"
                    >
                      <List size={16} />
                    </button>
                  </div>

                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden md:block" />

                  <div className="flex items-center space-x-2 pb-2 md:pb-0">
                    <Filter
                      size={18}
                      className="text-slate-400 flex-shrink-0"
                    />
                    <button
                      onClick={() => setActiveGroup("All")}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                        activeGroup === "All"
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      All
                    </button>
                    {categories.slice(0, 3).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveGroup(cat)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                          activeGroup === cat
                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {cat.split("(")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Skills Grid/List */}
              {isGroupedView ? (
                <div className="space-y-8">
                  {skillsDisplay &&
                    skillsDisplay.map((group) => (
                      <div key={group.category}>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 pl-1">
                          {group.category}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {group.skills.map((skill) => (
                            <SkillCard
                              key={skill.name}
                              skill={skill}
                              isFavorite={favorites.includes(skill.name)}
                              onToggleFavorite={toggleFavorite}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredSkills.map((skill) => (
                    <SkillCard
                      key={skill.name}
                      skill={skill}
                      isFavorite={favorites.includes(skill.name)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              )}

              {filteredSkills.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-slate-500 dark:text-slate-400">
                    No skills found matching your criteria.
                  </p>
                  <button
                    onClick={() => {
                      setSearch("");
                      setActiveGroup("All");
                    }}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {view === "workflow" && (
            <WorkflowView onAddToToolkit={addWorkflowToToolkit} />
          )}

          {view === "ai-search" && (
            <AISearchView
              allSkills={skills}
              toggleFavorite={toggleFavorite}
              favorites={favorites}
            />
          )}

          {view === "toolkit" && (
            <ToolkitView
              favorites={favorites}
              allSkills={skills}
              onToggleFavorite={toggleFavorite}
              clearFavorites={() => setFavorites([])}
            />
          )}

          {view === "compare" && <VersionCompareView />}
        </main>

        <AddSkillModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddSkill}
          categories={categories}
          nextRank={skills.length + 1}
        />

        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportSkills}
        />
      </div>
    </div>
  );
}
```

demos/taskDock.tsx
```
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
```

</source_code>