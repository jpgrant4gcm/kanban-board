import React, { useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "./AuthGate.jsx";

const SHEET_EDIT_URL =
  "https://docs.google.com/spreadsheets/d/1J1l92CuxuFfkoys43GPGrTQYtewVuzfDgIza1qtzpgo/edit";

const COLUMNS = [
  "Date",
  "Candidate / Committee",
  "Office",
  "Jurisdiction",
  "Amount",
  "Contribution Method",
  "Paid By",
  "Receipt Link",
  "Reportable (G-37)",
  "Notes",
];

export default function G37Tracker({ darkMode }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }
      const resp = await fetch("/api/g37", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body.detail || body.error || "Failed to load");
      setRecords(body.records || []);
    } catch (e) {
      setError(e.message || "Failed to load G-37 data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: darkMode ? "#f1f5f9" : "#1e293b" }}>
            G-37 Contribution Tracker
          </h2>
          <p className="text-sm" style={{ color: darkMode ? "#94a3b8" : "#64748b" }}>
            Read-only mirror. The Google Sheet is the system of record — edit there.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm"
            style={{
              borderColor: darkMode ? "#334155" : "#e2e8f0",
              color: darkMode ? "#e2e8f0" : "#334155",
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <a
            href={SHEET_EDIT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded bg-slate-900 dark:bg-slate-100 px-3 py-1.5 text-sm text-white dark:text-slate-900 font-medium"
          >
            View / edit in Google Sheets
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-500">Loading G-37 data…</div>}

      {!loading && error && (
        <div className="rounded border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div
          className="overflow-x-auto rounded-lg border"
          style={{ borderColor: darkMode ? "#334155" : "#e2e8f0" }}
        >
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: darkMode ? "#0f172a" : "#f8fafc" }}>
                {COLUMNS.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left font-medium whitespace-nowrap"
                    style={{ color: darkMode ? "#94a3b8" : "#64748b" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-slate-500">
                    No records found.
                  </td>
                </tr>
              )}
              {records.map((row, i) => (
                <tr
                  key={i}
                  className="border-t"
                  style={{ borderColor: darkMode ? "#1e293b" : "#f1f5f9" }}
                >
                  {COLUMNS.map((col) => (
                    <td key={col} className="px-3 py-2 whitespace-nowrap" style={{ color: darkMode ? "#e2e8f0" : "#1e293b" }}>
                      {col === "Receipt Link" && row[col] ? (
                        <a
                          href={row[col]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 dark:text-sky-400 underline"
                        >
                          Receipt
                        </a>
                      ) : (
                        row[col] || ""
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
