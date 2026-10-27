export const ADMIN_STORAGE_KEY = "hazarot:admin-token";
const fragment = new URLSearchParams(location.hash.slice(1));
if (fragment.has("admin")) {
  const token = fragment.get("admin");
  history.replaceState(null, "", location.pathname + location.search);
  if (/^[a-zA-Z0-9_-]{43}$/.test(token || "")) localStorage.setItem(ADMIN_STORAGE_KEY, token);
}
export const adminToken = () => localStorage.getItem(ADMIN_STORAGE_KEY);
