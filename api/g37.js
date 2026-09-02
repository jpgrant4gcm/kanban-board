import { JWT } from "google-auth-library";
import { createClient } from "@supabase/supabase-js";

const SHEET_ID = process.env.G37_SHEET_ID;
const SHEET_RANGE = process.env.G37_SHEET_RANGE || "Sheet1!A:K";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

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

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(
      SHEET_RANGE
    )}`;
    const sheetResp = await client.request({ url });
    const rows = sheetResp.data.values || [];
    const [header, ...body] = rows;

    if (!header) {
      res.status(200).json({ records: [] });
      return;
    }

    const records = body.map((row) =>
      Object.fromEntries(header.map((col, i) => [col, row[i] ?? ""]))
    );

    res.status(200).json({ records });
  } catch (e) {
    console.error("G37 sheet fetch failed:", e.message);
    res.status(500).json({ error: "Failed to load G-37 data" });
  }
}
