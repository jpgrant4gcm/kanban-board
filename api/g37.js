import { JWT } from "google-auth-library";
import { createClient } from "@supabase/supabase-js";

const SHEET_ID = process.env.G37_SHEET_ID;
const SHEET_RANGE = process.env.G37_SHEET_RANGE || "Sheet1!A:K";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Sheets reports unset/white background as (1,1,1) or an empty object.
// Treat that as "no highlight" so it doesn't clash with dark mode.
function toCssColor(color) {
  if (!color) return null;
  const r = color.red ?? 0;
  const g = color.green ?? 0;
  const b = color.blue ?? 0;
  if (r > 0.98 && g > 0.98 && b > 0.98) return null;
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing session token" });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  try {
    const client = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    // spreadsheets.get with a ranges filter + explicit fields pulls back grid
    // data (values + effectiveFormat, which reflects conditional formatting
    // results, not just manually-set colors) instead of plain values.
    const fields = "sheets.data.rowData.values(formattedValue,effectiveFormat.backgroundColor)";
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}` +
      `?ranges=${encodeURIComponent(SHEET_RANGE)}&fields=${encodeURIComponent(fields)}`;
    const sheetResp = await client.request({ url });
    const rowData = sheetResp.data.sheets?.[0]?.data?.[0]?.rowData || [];

    const grid = rowData.map((row) =>
      (row.values || []).map((cell) => ({
        value: cell.formattedValue || "",
        bg: toCssColor(cell.effectiveFormat?.backgroundColor),
      }))
    );

    const [headerRow, ...bodyRows] = grid;
    if (!headerRow) {
      res.status(200).json({ records: [] });
      return;
    }
    const header = headerRow.map((c) => c.value);

    const records = bodyRows.map((row) =>
      Object.fromEntries(
        header.map((col, i) => [col, row[i] || { value: "", bg: null }])
      )
    );

    res.status(200).json({ records });
  } catch (e) {
    console.error("G37 sheet fetch failed:", e.message);
    res.status(500).json({ error: "Failed to load G-37 data", detail: e.message });
  }
}
