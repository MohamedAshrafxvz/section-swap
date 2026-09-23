// Remembers this browser's own request (id + secret token) so the student can come back.
const KEY = "section-swap:my-request";

export function loadMine() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
export function saveMine(request) {
  try { localStorage.setItem(KEY, JSON.stringify(request)); } catch { /* storage unavailable */ }
}
export function clearMine() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
