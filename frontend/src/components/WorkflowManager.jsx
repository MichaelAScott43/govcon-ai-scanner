import React, { useState, useEffect } from "react";
import { workflowsApi } from "../utils/api.js";

const STATUS_COLORS = {
  pending: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-400"
};

const PRIORITY_COLORS = {
  low: "text-slate-400",
  medium: "text-amber-500",
  high: "text-orange-600",
  critical: "text-red-600"
};

function TaskRow({ task, workflowId, onUpdate }) {
  const [updating, setUpdating] = useState(false);

  const nextStatus = { pending: "in_progress", in_progress: "completed", blocked: "completed" };

  const advance = async () => {
    if (!nextStatus[task.status]) return;
    setUpdating(true);
    try {
      await onUpdate(workflowId, task._id, { status: nextStatus[task.status] });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <button
        onClick={advance}
        disabled={updating || task.status === "completed" || task.status === "cancelled"}
        className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 transition-colors ${
          task.status === "completed"
            ? "bg-emerald-500 border-emerald-500"
            : "border-slate-300 hover:border-blue-400"
        }`}
        aria-label="Advance task status"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.status === "completed" ? "line-through text-slate-400" : "text-slate-700"}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-slate-400 truncate">{task.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority] ?? ""}`}>
          {task.priority}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] ?? ""}`}>
          {task.status.replace("_", " ")}
        </span>
      </div>
    </div>
  );
}

function WorkflowCard({ workflow, onSelect }) {
  const completedTasks = workflow.tasks?.filter((t) => t.status === "completed").length ?? 0;
  const totalTasks = workflow.tasks?.length ?? 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
      onClick={() => onSelect(workflow)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{workflow.title}</p>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{workflow.type} · {workflow.status}</p>
        </div>
        {workflow.dueDate && (
          <p className="text-xs text-slate-400 shrink-0">
            Due {new Date(workflow.dueDate).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{completedTasks}/{totalTasks} tasks</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function WorkflowDetail({ workflow, onBack, onTaskUpdate }) {
  const [newTask, setNewTask] = useState({ title: "", priority: "medium" });
  const [addingTask, setAddingTask] = useState(false);
  const [comment, setComment] = useState("");

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    setAddingTask(true);
    try {
      await workflowsApi.addTask(workflow._id, newTask);
      setNewTask({ title: "", priority: "medium" });
      onBack(); // Refresh by going back
    } finally {
      setAddingTask(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        ← Back to workflows
      </button>
      <div>
        <h2 className="text-lg font-bold text-slate-800">{workflow.title}</h2>
        <p className="text-sm text-slate-500 capitalize mt-0.5">{workflow.type} · {workflow.status}</p>
        {workflow.description && <p className="text-sm text-slate-600 mt-2">{workflow.description}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Tasks ({workflow.tasks?.length ?? 0})</h3>
        {workflow.tasks?.length === 0 ? (
          <p className="text-sm text-slate-400">No tasks yet.</p>
        ) : (
          <div>
            {workflow.tasks?.map((task) => (
              <TaskRow
                key={task._id}
                task={task}
                workflowId={workflow._id}
                onUpdate={async (wfId, taskId, data) => {
                  await workflowsApi.updateTask(wfId, taskId, data);
                  onTaskUpdate();
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
          <input
            value={newTask.title}
            onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
            placeholder="Add a task…"
            className="input flex-1 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          />
          <select
            value={newTask.priority}
            onChange={(e) => setNewTask((t) => ({ ...t, priority: e.target.value }))}
            className="input text-sm w-28"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button onClick={handleAddTask} disabled={addingTask} className="btn-primary text-sm">
            {addingTask ? "…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowManager() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newWf, setNewWf] = useState({ title: "", type: "general", description: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    workflowsApi.list({ limit: 50 })
      .then((res) => setWorkflows(res.data.workflows || []))
      .catch(() => setError("Failed to load workflows."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newWf.title.trim()) return;
    setCreating(true);
    try {
      const res = await workflowsApi.create(newWf);
      setWorkflows((w) => [res.data.workflow, ...w]);
      setNewWf({ title: "", type: "general", description: "" });
      setShowCreate(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create workflow.");
    } finally {
      setCreating(false);
    }
  };

  if (selected) {
    return (
      <WorkflowDetail
        workflow={selected}
        onBack={() => { setSelected(null); load(); }}
        onTaskUpdate={load}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Workflows</h2>
          <p className="text-sm text-slate-500">Track capture, procurement, and proposal tasks</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          + New Workflow
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showCreate && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="font-semibold text-slate-800">New Workflow</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
              <input
                value={newWf.title}
                onChange={(e) => setNewWf((w) => ({ ...w, title: e.target.value }))}
                className="input w-full"
                placeholder="e.g. DoD RFP Response Q4"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={newWf.type}
                onChange={(e) => setNewWf((w) => ({ ...w, type: e.target.value }))}
                className="input w-full"
              >
                {["capture", "procurement", "proposal", "contract", "general"].map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <textarea
                value={newWf.description}
                onChange={(e) => setNewWf((w) => ({ ...w, description: e.target.value }))}
                className="input w-full"
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm">
              {creating ? "Creating…" : "Create Workflow"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
      ) : workflows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-slate-500 text-sm">No workflows yet.</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 btn-secondary text-sm">
            Create your first workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {workflows.map((wf) => (
            <WorkflowCard key={wf._id} workflow={wf} onSelect={setSelected} />
          ))}
        </div>
      )}
    </div>
  );
}
