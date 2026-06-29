import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, X, Settings, Trash2, GripVertical, Users, Filter, Pencil, Check, Clock, Moon, Sun } from "lucide-react";

const SUPABASE_URL = "https://lzpvctjxfxdkqxdnetzn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-eC77WM8jOhS0onlH7WK4g_0EvJJ4Ey";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const PRIORITIES = ["Critical", "High", "Medium", "Low"];

const PRIORITY_STYLE = {
  Critical: "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800",
  High: "bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-800",
  Medium: "bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-800",
  Low: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700",
};

const PRIORITY_DOT = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-sky-500",
  Low: "bg-slate-400",
};

const SCOPE_PALETTE = [
  "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800",
  "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800",
  "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800",
  "bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-700 dark:text-fuchsia-300 ring-1 ring-fuchsia-200 dark:ring-fuchsia-800",
  "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 ring-1 ring-teal-200 dark:ring-teal-800",
  "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800",
];

const daysOutstanding = (createdAt, completedAt) => {
  const endTime = completedAt || Date.now();
  return Math.max(0, Math.floor((endTime - (createdAt || Date.now())) / 86400000));
};

const ageStyle = (days) =>
  days >= 22
    ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800"
    : days >= 8
    ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800"
    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700";

function useEsc(onClose) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
}

const _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseClient = async () => _client;

export default function App() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [openCardId, setOpenCardId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [boardName, setBoardName] = useState("Team Task Board");
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [dragCardId, setDragCardId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const firstLoad = useRef(true);

  // Apply dark class to document so Tailwind dark: variants (badges) work
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [darkMode]);

  // Initialize Supabase and load data
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const client = await supabaseClient();

        // Load state
        const { data: stateData } = await client
          .from('kanban_state')
          .select('*')
          .single();

        if (active && stateData) {
          setState(JSON.parse(stateData.data));
          setLoading(false);
          return;
        }

        // Create initial state
        const stages = [
          { id: uid(), name: "In Queue" },
          { id: uid(), name: "Working On" },
          { id: uid(), name: "Need Assistance" },
          { id: uid(), name: "Completed" },
          { id: uid(), name: "Deprioritized" },
        ];
        
        const initialState = {
          stages,
          team: ["Derek Mitchell", "JP Grant III", "Four"],
          scopes: ["Muni", "Lighting", "Admin"],
          cards: [
            {
              id: uid(),
              stageId: stages[0].id,
              summary: "Example: New Orleans bond closing checklist",
              owner: "Four",
              scope: "Muni",
              priority: "High",
              detail: "Click any card to edit every field. Drag a card between columns to change its stage.",
              createdAt: Date.now(),
              completedAt: null,
            },
          ],
        };

        if (active) {
          await client.from('kanban_state').insert([
            { id: 1, data: JSON.stringify(initialState) }
          ]);
          setState(initialState);
          setLoading(false);
        }
      } catch (e) {
        console.error("Error initializing:", e);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Save to Supabase on change
  useEffect(() => {
    if (loading || !state || firstLoad.current) {
      if (!loading && state) firstLoad.current = false;
      return;
    }
    
    (async () => {
      try {
        const client = await supabaseClient();
        await client
          .from('kanban_state')
          .update({ data: JSON.stringify(state) })
          .eq('id', 1);
      } catch (e) {
        console.error("Error saving:", e);
      }
    })();
  }, [state, loading]);

  if (loading || !state) {
    return (
      <div style={{ backgroundColor: "#f8fafc", color: "#64748b" }} className="flex h-screen items-center justify-center text-center">
        <div>
          <div className="text-lg font-semibold mb-2">Loading board...</div>
          <div className="text-sm">If this takes more than a few seconds, check your Supabase connection</div>
        </div>
      </div>
    );
  }

  const scopeStyle = (scope) => {
    const i = state.scopes.indexOf(scope);
    return i >= 0 ? SCOPE_PALETTE[i % SCOPE_PALETTE.length] : "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  };

  const updateCard = (id, patch) =>
    setState((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  const createTask = (draft) => {
    const card = { id: uid(), createdAt: Date.now(), completedAt: null, detail: "", ...draft };
    setState((s) => ({ ...s, cards: [...s.cards, card] }));
    setShowNewTask(false);
  };

  const deleteCard = (id) => {
    setState((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== id) }));
    setOpenCardId(null);
  };

  const addStage = () => {
    const name = window.prompt("Name the new stage");
    if (!name) return;
    setState((s) => ({ ...s, stages: [...s.stages, { id: uid(), name: name.trim() }] }));
  };

  const renameStage = (id, name) =>
    setState((s) => ({ ...s, stages: s.stages.map((st) => (st.id === id ? { ...st, name } : st)) }));

  const deleteStage = (id) => {
    const others = state.stages.filter((st) => st.id !== id);
    if (others.length === 0) {
      window.alert("Keep at least one stage on the board.");
      return;
    }
    const count = state.cards.filter((c) => c.stageId === id).length;
    if (
      count > 0 &&
      !window.confirm(`This stage has ${count} task(s). They will move to "${others[0].name}". Continue?`)
    )
      return;
    setState((s) => ({
      ...s,
      stages: others,
      cards: s.cards.map((c) => (c.stageId === id ? { ...c, stageId: others[0].id } : c)),
    }));
  };

  const moveCard = (cardId, stageId) => {
    const stage = state.stages.find((s) => s.id === stageId);
    const isTerminal = stage && (stage.name === "Completed" || stage.name === "Deprioritized");
    updateCard(cardId, { 
      stageId,
      completedAt: isTerminal ? (Date.now()) : null 
    });
  };

  const onDrop = (stageId) => {
    if (dragCardId) moveCard(dragCardId, stageId);
    setDragCardId(null);
    setDragOverStage(null);
  };

  const visibleCards = (stageId) =>
    state.cards.filter((c) => c.stageId === stageId && (ownerFilter === "All" || c.owner === ownerFilter));

  const openCard = state.cards.find((c) => c.id === openCardId) || null;

  return (
    <div 
      style={{
        backgroundColor: darkMode ? "#000000" : "#f8fafc",
        color: darkMode ? "#f1f5f9" : "#1e293b",
      }}
      className="flex h-screen flex-col font-sans"
    >
      {/* Header */}
      <header 
        style={{
          backgroundColor: darkMode ? "#0f172a" : "#ffffff",
          borderBottomColor: darkMode ? "#334155" : "#e2e8f0",
        }}
        className="flex flex-wrap items-center gap-3 border-b px-5 py-3"
      >
        <div className="mr-2 flex items-center gap-2">
          <div style={{ backgroundColor: darkMode ? "#e0e7ff" : "#1e293b" }} className="h-6 w-1.5 rounded-full" />
          {editingBoardName ? (
            <input
              autoFocus
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              onBlur={() => setEditingBoardName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingBoardName(false);
                if (e.key === "Escape") setEditingBoardName(false);
              }}
              style={{
                color: darkMode ? "#f1f5f9" : "#1e293b",
                backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#e2e8f0",
              }}
              className="rounded border px-2 py-1 text-lg font-semibold tracking-tight focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          ) : (
            <h1 
              onClick={() => setEditingBoardName(true)}
              style={{ color: darkMode ? "#f1f5f9" : "#1e293b" }}
              className="cursor-pointer text-lg font-semibold tracking-tight hover:opacity-75"
            >
              {boardName}
            </h1>
          )}
        </div>

        <div 
          style={{
            backgroundColor: darkMode ? "#334155" : "#f1f5f9",
            borderColor: darkMode ? "#475569" : "#e2e8f0",
            color: darkMode ? "#f1f5f9" : "#64748b",
          }}
          className="flex items-center gap-2 rounded-lg border px-2 py-1"
        >
          <Filter className="h-4 w-4" />
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            style={{
              backgroundColor: "transparent",
              color: darkMode ? "#f1f5f9" : "#1e293b",
            }}
            className="text-sm font-medium focus:outline-none"
          >
            <option value="All">All owners</option>
            {state.team.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowNewTask(true)}
            style={{
              backgroundColor: darkMode ? "#334155" : "#1e293b",
              color: darkMode ? "#f1f5f9" : "#ffffff",
              borderColor: darkMode ? "#475569" : "transparent",
            }}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add task
          </button>
          <button
            onClick={addStage}
            style={{
              backgroundColor: darkMode ? "#334155" : "#ffffff",
              borderColor: darkMode ? "#475569" : "#e2e8f0",
              color: darkMode ? "#f1f5f9" : "#64748b",
            }}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add stage
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              backgroundColor: darkMode ? "#334155" : "#ffffff",
              borderColor: darkMode ? "#475569" : "#e2e8f0",
              color: darkMode ? "#f1f5f9" : "#64748b",
            }}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:opacity-90"
            title="Toggle dark mode"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              backgroundColor: darkMode ? "#334155" : "#ffffff",
              borderColor: darkMode ? "#475569" : "#e2e8f0",
              color: darkMode ? "#f1f5f9" : "#64748b",
            }}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:opacity-90"
          >
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>
      </header>

      {/* Board */}
      <div 
        style={{
          backgroundColor: darkMode ? "#000000" : undefined,
        }}
        className="flex flex-1 gap-4 overflow-x-auto p-5"
      >
        {state.stages.map((stage) => {
          const cards = visibleCards(stage.id);
          const isOver = dragOverStage === stage.id;
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage.id);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) setDragOverStage(null);
              }}
              onDrop={() => onDrop(stage.id)}
              style={{
                backgroundColor: darkMode ? "#0f172a" : isOver ? "#f1f5f9" : "#f8fafc",
                borderColor: darkMode ? "#475569" : isOver ? "#cbd5e1" : "#e2e8f0",
              }}
              className="flex w-80 flex-shrink-0 flex-col rounded-xl border"
            >
              <StageHeader
                stage={stage}
                count={cards.length}
                onRename={(name) => renameStage(stage.id, name)}
                onDelete={() => deleteStage(stage.id)}
                darkMode={darkMode}
              />

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5">
                {cards.length === 0 && (
                  <div style={{
                    borderColor: darkMode ? "#475569" : "#cbd5e1",
                    color: darkMode ? "#64748b" : "#a1acb8",
                  }} className="mt-2 rounded-lg border border-dashed py-6 text-center text-xs">
                    {ownerFilter === "All" ? "Drop tasks here" : "No tasks for this owner"}
                  </div>
                )}
                {cards.map((card) => (
                  <article
                    key={card.id}
                    draggable
                    onDragStart={() => setDragCardId(card.id)}
                    onDragEnd={() => {
                      setDragCardId(null);
                      setDragOverStage(null);
                    }}
                    onClick={() => setOpenCardId(card.id)}
                    className={`group relative cursor-pointer rounded-lg border p-3 shadow-sm transition hover:shadow ${
                      dragCardId === card.id ? "opacity-40" : ""
                    }`}
                    style={{ 
                      minHeight: "105px", 
                      display: "flex", 
                      flexDirection: "column",
                      backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                      borderColor: darkMode ? "#475569" : "#e2e8f0",
                      color: darkMode ? "#f1f5f9" : "#1e293b",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Delete this task?")) deleteCard(card.id);
                      }}
                      className="absolute right-2 top-2 hidden rounded-lg bg-red-100 dark:bg-red-900/30 p-1.5 text-red-500 dark:text-red-400 transition hover:bg-red-200 dark:hover:bg-red-800/50 group-hover:block"
                      title="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="flex items-start gap-1.5 pr-6 flex-1">
                      <GripVertical style={{ color: darkMode ? "#64748b" : "#cbd5e1" }} className="mt-0.5 h-4 w-4 flex-shrink-0 group-hover:text-slate-400" />
                      <p style={{ color: darkMode ? "#f1f5f9" : "#1e293b" }} className="text-sm font-medium leading-snug">{card.summary || "Untitled"}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pl-5">
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: darkMode ? "#94a3b8" : "#64748b" }} className="text-xs">{card.owner || "Unassigned"}</span>
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${ageStyle(
                            daysOutstanding(card.createdAt, card.completedAt)
                          )}`}
                          title={`Created ${new Date(card.createdAt).toLocaleDateString()}`}
                        >
                          <Clock className="h-3 w-3" />
                          {daysOutstanding(card.createdAt, card.completedAt)}d
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[card.priority]}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[card.priority]}`} />
                        {card.priority}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card detail editor */}
      {openCard && (
        <CardModal
          card={openCard}
          team={state.team}
          stages={state.stages}
          scopes={state.scopes}
          scopeStyle={scopeStyle}
          onChange={(patch) => updateCard(openCard.id, patch)}
          onDelete={() => deleteCard(openCard.id)}
          onClose={() => setOpenCardId(null)}
          darkMode={darkMode}
        />
      )}

      {/* New task */}
      {showNewTask && (
        <NewTaskModal
          team={state.team}
          stages={state.stages}
          scopes={state.scopes}
          onCreate={createTask}
          onClose={() => setShowNewTask(false)}
          darkMode={darkMode}
        />
      )}

      {/* Settings */}
      {showSettings && (
        <SettingsModal
          state={state}
          setState={setState}
          onClose={() => setShowSettings(false)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

function StageHeader({ stage, count, onRename, onDelete, darkMode }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(stage.name);
  useEffect(() => setVal(stage.name), [stage.name]);

  return (
    <div 
      style={{ 
        color: darkMode ? "#f1f5f9" : "#1e293b",
        backgroundColor: darkMode ? "#0f172a" : "#f1f5f9",
        borderBottomColor: darkMode ? "#334155" : "#e2e8f0",
      }}
      className="flex items-center gap-2 px-3 py-2.5 border-b"
    >
      {editing ? (
        <>
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(val.trim() || stage.name);
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
            style={{
              backgroundColor: darkMode ? "#1e293b" : "#ffffff",
              borderColor: darkMode ? "#475569" : "#cbd5e1",
              color: darkMode ? "#f1f5f9" : "#1e293b",
            }}
            className="min-w-0 flex-1 rounded border px-1.5 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          <button
            onClick={() => {
              onRename(val.trim() || stage.name);
              setEditing(false);
            }}
            style={{ color: darkMode ? "#94a3b8" : "#64748b" }}
            className="hover:text-slate-800"
          >
            <Check className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <h2 style={{ color: darkMode ? "#94a3b8" : "#4b5563" }} className="flex-1 truncate text-sm font-semibold uppercase tracking-wide">
            {stage.name}
          </h2>
          <span style={{
            backgroundColor: darkMode ? "#334155" : "#ffffff",
            borderColor: darkMode ? "#475569" : "#e2e8f0",
            color: darkMode ? "#94a3b8" : "#64748b",
          }} className="rounded-full px-2 py-0.5 text-xs font-medium ring-1">
            {count}
          </span>
          <button onClick={() => setEditing(true)} style={{ color: darkMode ? "#64748b" : "#cbd5e1" }} className="hover:text-slate-600">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} style={{ color: darkMode ? "#64748b" : "#cbd5e1" }} className="hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}

const selectCls =
  "w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";

function CardModal({ card, team, stages, scopes, scopeStyle, onChange, onDelete, onClose, darkMode }) {
  useEsc(onClose);
  return (
    <div style={{ backgroundColor: darkMode ? "rgba(0,0,0,0.6)" : "rgba(15,23,42,0.16)" }} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div style={{ backgroundColor: darkMode ? "#1e293b" : "#ffffff" }} className="w-full max-w-lg rounded-2xl shadow-xl">
        <div style={{ borderBottomColor: darkMode ? "#334155" : "#e2e8f0" }} className="flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scopeStyle(card.scope)}`}>
                {card.scope || "No scope"}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[card.priority]}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[card.priority]}`} />
                {card.priority}
              </span>
            </div>
            <span style={{ color: darkMode ? "#64748b" : "#64748b" }} className="text-xs">Created {new Date(card.createdAt).toLocaleDateString()}</span>
          </div>
          <button onClick={onClose} style={{ color: darkMode ? "#64748b" : "#a1acb8" }} className="hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <Field label="Summary description">
            <input
              value={card.summary}
              onChange={(e) => onChange({ summary: e.target.value })}
              placeholder="Short title for the board"
              style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }}
              className={selectCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner">
              <select value={card.owner} onChange={(e) => onChange({ owner: e.target.value })} style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }} className={selectCls}>
                {team.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stage">
              <select value={card.stageId} onChange={(e) => onChange({ stageId: e.target.value })} style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }} className={selectCls}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Scope">
              <select value={card.scope} onChange={(e) => onChange({ scope: e.target.value })} style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }} className={selectCls}>
                {scopes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select value={card.priority} onChange={(e) => onChange({ priority: e.target.value })} style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }} className={selectCls}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Detailed description">
            <textarea
              value={card.detail}
              onChange={(e) => onChange({ detail: e.target.value })}
              rows={6}
              placeholder="Notes, context, links, next steps..."
              style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }}
              className={`${selectCls} resize-y`}
            />
          </Field>
        </div>

        <div style={{ borderTopColor: darkMode ? "#334155" : "#e2e8f0" }} className="flex items-center justify-between border-t px-5 py-3">
          <button
            onClick={onDelete}
            style={{ color: darkMode ? "#f87171" : "#dc2626" }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90"
          >
            <Trash2 className="h-4 w-4" /> Delete task
          </button>
          <button
            onClick={onClose}
            style={{
              backgroundColor: darkMode ? "#334155" : "#1e293b",
              color: darkMode ? "#f1f5f9" : "#ffffff",
            }}
            className="rounded-lg px-4 py-1.5 text-sm font-medium hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function NewTaskModal({ team, stages, scopes, onCreate, onClose, darkMode }) {
  useEsc(onClose);
  const [d, setD] = useState({
    summary: "",
    owner: "",
    stageId: "",
    scope: "",
    priority: "",
    detail: "",
  });
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const valid = d.summary.trim() && d.owner && d.stageId && d.scope && d.priority;

  const submit = () => {
    if (!valid) return;
    onCreate({ ...d, summary: d.summary.trim() });
  };

  const req = <span className="text-red-500">*</span>;

  return (
    <div style={{ backgroundColor: darkMode ? "rgba(0,0,0,0.6)" : "rgba(15,23,42,0.16)" }} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div style={{ backgroundColor: darkMode ? "#1e293b" : "#ffffff" }} className="w-full max-w-lg rounded-2xl shadow-xl">
        <div style={{ borderBottomColor: darkMode ? "#334155" : "#e2e8f0" }} className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 style={{ color: darkMode ? "#f1f5f9" : "#1e293b" }} className="text-base font-semibold">New task</h2>
          <button onClick={onClose} style={{ color: darkMode ? "#64748b" : "#a1acb8" }} className="hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <Field label={<>Summary description {req}</>}>
            <input
              autoFocus
              value={d.summary}
              onChange={(e) => set({ summary: e.target.value })}
              placeholder="Short title for the board"
              style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }}
              className={selectCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={<>Owner {req}</>}>
              <select value={d.owner} onChange={(e) => set({ owner: e.target.value })} style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }} className={selectCls}>
                <option value="" disabled>
                  Select owner
                </option>
                {team.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={<>Stage {req}</>}>
              <select value={d.stageId} onChange={(e) => set({ stageId: e.target.value })} style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }} className={selectCls}>
                <option value="" disabled>
                  Select stage
                </option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={<>Scope {req}</>}>
              <select value={d.scope} onChange={(e) => set({ scope: e.target.value })} style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }} className={selectCls}>
                <option value="" disabled>
                  Select scope
                </option>
                {scopes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={<>Priority {req}</>}>
              <select value={d.priority} onChange={(e) => set({ priority: e.target.value })} style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }} className={selectCls}>
                <option value="" disabled>
                  Select priority
                </option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Detailed description (optional)">
            <textarea
              value={d.detail}
              onChange={(e) => set({ detail: e.target.value })}
              rows={5}
              placeholder="Notes, context, links, next steps..."
              style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#cbd5e1",
                color: darkMode ? "#f1f5f9" : "#1e293b",
              }}
              className={`${selectCls} resize-y`}
            />
          </Field>
        </div>

        <div style={{ borderTopColor: darkMode ? "#334155" : "#e2e8f0" }} className="flex items-center justify-between border-t px-5 py-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">{req} Required</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              style={{
                backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                borderColor: darkMode ? "#475569" : "#e2e8f0",
                color: darkMode ? "#f1f5f9" : "#64748b",
              }}
              className="rounded-lg border px-4 py-1.5 text-sm font-medium hover:opacity-90"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!valid}
              style={{
                backgroundColor: valid ? (darkMode ? "#334155" : "#1e293b") : (darkMode ? "#475569" : "#cbd5e1"),
                color: valid ? (darkMode ? "#f1f5f9" : "#ffffff") : (darkMode ? "#94a3b8" : "#64748b"),
              }}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium ${!valid ? "cursor-not-allowed" : ""}`}
            >
              Create task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableList({ icon, title, items, onAdd, onRemove, note, darkMode }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        {icon}
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <span
            key={it}
            style={{
              backgroundColor: darkMode ? "#334155" : "#f1f5f9",
              borderColor: darkMode ? "#475569" : "#e2e8f0",
              color: darkMode ? "#f1f5f9" : "#64748b",
            }}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ring-1"
          >
            {it}
            <button onClick={() => onRemove(it)} style={{ color: darkMode ? "#94a3b8" : "#a1acb8" }} className="hover:text-red-500 dark:hover:text-red-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && val.trim()) {
              onAdd(val.trim());
              setVal("");
            }
          }}
          placeholder={`Add ${title.toLowerCase()}`}
          style={{
            backgroundColor: darkMode ? "#0f172a" : "#ffffff",
            borderColor: darkMode ? "#475569" : "#cbd5e1",
            color: darkMode ? "#f1f5f9" : "#1e293b",
          }}
          className="flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <button
          onClick={() => {
            if (val.trim()) {
              onAdd(val.trim());
              setVal("");
            }
          }}
          style={{
            backgroundColor: darkMode ? "#334155" : "#1e293b",
            color: darkMode ? "#f1f5f9" : "#ffffff",
          }}
          className="rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90"
        >
          Add
        </button>
      </div>
      {note && <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{note}</p>}
    </div>
  );
}

function SettingsModal({ state, setState, onClose, darkMode }) {
  useEsc(onClose);
  const addTeam = (name) =>
    !state.team.includes(name) && setState((s) => ({ ...s, team: [...s.team, name] }));
  const removeTeam = (name) =>
    setState((s) => ({ ...s, team: s.team.filter((m) => m !== name) }));
  const addScope = (name) =>
    !state.scopes.includes(name) && setState((s) => ({ ...s, scopes: [...s.scopes, name] }));
  const removeScope = (name) =>
    setState((s) => ({ ...s, scopes: s.scopes.filter((sc) => sc !== name) }));

  return (
    <div style={{ backgroundColor: darkMode ? "rgba(0,0,0,0.6)" : "rgba(15,23,42,0.16)" }} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div style={{ backgroundColor: darkMode ? "#1e293b" : "#ffffff" }} className="w-full max-w-md rounded-2xl shadow-xl">
        <div style={{ borderBottomColor: darkMode ? "#334155" : "#e2e8f0" }} className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 style={{ color: darkMode ? "#f1f5f9" : "#1e293b" }} className="text-base font-semibold">Board settings</h2>
          <button onClick={onClose} style={{ color: darkMode ? "#64748b" : "#a1acb8" }} className="hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-6 px-5 py-5">
          <EditableList
            icon={<Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
            title="Team members"
            items={state.team}
            onAdd={addTeam}
            onRemove={removeTeam}
            note="Owners come from this list. Removing a member leaves their tasks assigned to the old name until reassigned."
            darkMode={darkMode}
          />
          <EditableList
            icon={<div className="h-3 w-3 rounded-sm bg-indigo-400" />}
            title="Scopes"
            items={state.scopes}
            onAdd={addScope}
            onRemove={removeScope}
            darkMode={darkMode}
          />
        </div>
        <div style={{ borderTopColor: darkMode ? "#334155" : "#e2e8f0" }} className="flex justify-end border-t px-5 py-3">
          <button
            onClick={onClose}
            style={{
              backgroundColor: darkMode ? "#334155" : "#1e293b",
              color: darkMode ? "#f1f5f9" : "#ffffff",
            }}
            className="rounded-lg px-4 py-1.5 text-sm font-medium hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
