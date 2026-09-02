import React, { useState } from "react";
import App from "./App.jsx";
import G37Tracker from "./G37Tracker.jsx";

const TABS = ["Board", "G-37"];

export default function Shell() {
  const [tab, setTab] = useState("Board");
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="flex flex-col">
      <TabNav tab={tab} setTab={setTab} />
      <div style={{ display: tab === "Board" ? "contents" : "none" }}>
        <App />
      </div>
      {tab === "G-37" && (
        <div
          className="flex-1 font-sans"
          style={{ backgroundColor: darkMode ? "#000000" : "#f8fafc", height: "calc(100vh - 45px)" }}
        >
          <G37Tracker darkMode={darkMode} />
        </div>
      )}
    </div>
  );
}

function TabNav({ tab, setTab }) {
  return (
    <div className="flex items-center gap-1 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-4 pt-2">
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`px-3 py-1.5 text-sm font-medium rounded-t border-b-2 -mb-px ${
            tab === t
              ? "border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100"
              : "border-transparent text-slate-500 dark:text-slate-400"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
