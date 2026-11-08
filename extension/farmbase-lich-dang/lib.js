// Dùng chung cho trang lịch đăng và nền: đọc cài đặt, gọi API của website FarmBase.
export const DEFAULTS = { site: "https://farmbase.vn", key: "", fbPage: "https://business.facebook.com/latest/composer", hashtags: "#FarmBase #BVI #NongSanVietNam", remindBefore: 0 };

export async function getConf() {
  const s = await chrome.storage.local.get("conf");
  return { ...DEFAULTS, ...(s.conf || {}) };
}
export const setConf = (c) => chrome.storage.local.set({ conf: c });

export async function api(path, opt = {}) {
  const c = await getConf();
  if (!c.key) throw Object.assign(new Error("no_key"), { code: "no_key" });
  const r = await fetch(c.site.replace(/\/+$/, "") + path, {
    ...opt,
    headers: { authorization: "Bearer " + c.key, ...(opt.body ? { "content-type": "application/json" } : {}), ...(opt.headers || {}) },
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) {
    const e = new Error((j && (j.detail || j.error)) || "http_" + r.status);
    e.code = (j && j.error) || "http_" + r.status;
    e.status = r.status;
    throw e;
  }
  return j;
}
