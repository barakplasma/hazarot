export const ADMIN_STORAGE_KEY = "hazarot:admin-token";
export const adminToken = () => localStorage.getItem(ADMIN_STORAGE_KEY);
function consumeAdminLink() {
  const fragment = new URLSearchParams(location.hash.slice(1));
  if (!fragment.has("admin")) return;
  const token = fragment.get("admin");
  history.replaceState(null, "", location.pathname + location.search);
  if (/^[a-zA-Z0-9_-]{43}$/.test(token || "")) localStorage.setItem(ADMIN_STORAGE_KEY, token);
  window.dispatchEvent(new Event("admin-access-changed"));
}
// Imports run before analytics; hashchange also handles links opened in an existing tab.
consumeAdminLink();
window.addEventListener("hashchange", consumeAdminLink);
