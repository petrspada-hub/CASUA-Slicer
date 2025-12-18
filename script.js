
(() => {
  const SUPABASE_URL = "https://wqjfwcsrugopmottwmtl.supabase.co";
  const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxamZ3Y3NydWdvcG1vdHR3bXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTMyMjIsImV4cCI6MjA4MTQyOTIyMn0.OztHP1F8II2zSKJb1biDqKs1xvO6Z8rWYsI2WSK8St8";

  async function sbGet(path) {
    const r = await fetch(SUPABASE_URL + path, { headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON } });
    let body = null; try { body = await r.json(); } catch(_) {}
    if (!r.ok) throw body ?? { error: `HTTP ${r.status}` };
    return body;
  }

  async function sbUpsert(row) {
    const r = await fetch(SUPABASE_URL + "/rest/v1/scores?on_conflict=device_id,difficulty", {
      method: "POST",
      headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(row)
    });
    let body = null; try { body = await r.json(); } catch(_) {}
    if (!r.ok) throw body ?? { error: `HTTP ${r.status}` };
  }

  async function renameScoresForThisDevice(newNick) {
    const r = await fetch(SUPABASE_URL + `/rest/v1/scores?device_id=eq.${DEVICE_ID}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ nick: newNick })
    });
    if (!r.ok) { let body=null; try{body=await r.json();}catch(_){} console.error("Rename failed:", r.status, body); }
  }

  async function sbDeleteDeviceScores() {
    const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/delete_scores_for_device", {
      method: "POST",
      headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ p_device_id: DEVICE_ID })
