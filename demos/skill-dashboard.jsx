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