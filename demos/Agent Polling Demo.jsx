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