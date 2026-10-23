import axios from "axios";

export const API = (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api";
const RESEND_KEY = import.meta.env.VITE_RESEND_KEY || "";
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";
const FROM_EMAIL = "onboarding@resend.dev";
const FROM_NAME = "CareWatch";

export const checkBackend = () =>
  axios.get(`${API}/health`, { timeout: 1500 }).then(() => true).catch(() => false);

export const startSession = (deviceType = "pc", fps = 30) =>
  axios.post(`${API}/session/start`, { device_type: deviceType, camera_fps: fps }, { timeout: 1500 })
    .then((r) => r.data.sessionId);

export const endSession = (sid) =>
  axios.post(`${API}/session/${sid}/end`).catch(() => {});

export const saveMetrics = (sid, metrics) =>
  axios.post(`${API}/metrics/save`, { sessionId: sid, metrics }).catch(() => {});

export const saveAlert = (sid, alert, notify) =>
  axios.post(`${API}/alerts/save`, { sessionId: sid, alert, notify }).catch(() => {});

export const novuStatus = () =>
  axios.get(`${API}/novu/status`).then((r) => r.data).catch(() => null);

export const novuTest = (to) =>
  axios.post(`${API}/novu/test`, to ? { to } : {})
    .then((r) => r.data)
    .catch((e) => ({ ok: false, error: e.message }));

export const saveSelfReport = (sid, report) =>
  axios.post(`${API}/selfreport/save`, { sessionId: sid, report }).catch(() => {});

export async function ai(systemPrompt, userMessage) {
  if (!ANTHROPIC_KEY) return "";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }]
      })
    });
    const data = await r.json();
    return data.content?.[0]?.text || "";
  } catch {
    return "";
  }
}

export async function mail(to, meds, times) {
  if (!RESEND_KEY) return false;
  const medList = meds.join(", ");
  const rows = times.map((time) => `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:#1b56ff;padding:10px 14px;border-bottom:1px solid #e2e9f5">${time}</td>
      <td style="color:#0e1b3d;padding:10px 14px;border-bottom:1px solid #e2e9f5">${medList}</td>
    </tr>`).join("");
  const html = `
    <div style="font-family:Arial,sans-serif;background:#fff;color:#0e1b3d;padding:32px;border-radius:16px;max-width:520px;margin:auto;border:1px solid #e2e9f5">
      <h2 style="color:#1b56ff">CareWatch</h2>
      <p>Medication reminders are active.</p>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
    </div>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject: `CareWatch — ${medList}`,
        html
      })
    });
    const data = await response.json();
    return response.ok && !!data.id;
  } catch {
    return false;
  }
}
