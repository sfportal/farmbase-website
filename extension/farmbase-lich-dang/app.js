// Trang lịch đăng: xem lịch tháng, chọn nội dung website, chọn tư liệu Drive, soạn và lên lịch bài Facebook.
import { api, getConf, setConf, DEFAULTS } from "./lib.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const cssUrl = (u) => (u ? `url("${String(u).replace(/["\\\n]/g, "")}")` : "none");
const STATUS = { draft: "Nháp", scheduled: "Đã lên lịch", published: "Đã đăng" };
const ERR = {
  no_key: "Chưa nhập khóa API ở tab Cài đặt.", bad_key: "Khóa API không đúng hoặc đã bị thu hồi.", unauthorized: "Khóa API không đúng.",
  no_drive: "Website chưa gắn thư mục Google Drive (trang quản lý → Cài đặt).", drive_private: "Không đọc được thư mục Drive. Kiểm tra chia sẻ \"Bất kỳ ai có đường liên kết\".",
  drive_error: "Lỗi khi đọc Google Drive, thử lại sau.", empty: "Bài chưa có nội dung.",
  no_time: "Chọn thời gian đăng trước khi lên lịch.", not_found: "Không tìm thấy bài.", forbidden: "Không có quyền.",
};
const em = (e) => ERR[e.code] || ERR[e.message] || (e.message && !/^http_/.test(e.message) ? e.message : "Có lỗi, thử lại sau.");
const pad = (n) => String(n).padStart(2, "0");
const toLocal = (ms) => { if (!ms) return ""; const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmt = (ms) => (ms ? new Date(ms).toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Chưa đặt giờ");
const thumbOf = (m) => (m.type === "drive" ? `https://drive.google.com/thumbnail?id=${m.id}&sz=w240` : m.url);

let CONF = { ...DEFAULTS }, STAT = null, PLANS = [], FEED = null, DRIVE = { stack: [], items: [] };
let MONTH = new Date(); MONTH.setDate(1);
let ED = blank();
function blank() { return { id: null, title: "", message: "", link: "", media: [], source: null, scheduled_at: null, status: "draft" }; }

// ---------- Điều hướng ----------
function show() {
  const [v, arg] = (location.hash.slice(1) || "lich").split("/");
  const view = ["lich", "noidung", "drive", "caidat", "dang"].includes(v) ? v : "lich";
  document.querySelectorAll(".view").forEach((s) => (s.hidden = s.id !== "v-" + view));
  document.querySelectorAll("#tabs a").forEach((a) => a.classList.toggle("on", a.dataset.v === view));
  if (view === "noidung" && !FEED) loadFeed();
  if (view === "drive" && !DRIVE.stack.length) loadDrive();
  if (view === "caidat") fillConf();
  if (view === "dang") showPost(+arg);
}
window.addEventListener("hashchange", show);

// ---------- Kết nối ----------
async function connect() {
  CONF = await getConf();
  const c = $("conn");
  if (!CONF.key) { c.textContent = "Chưa có khóa API"; c.className = "conn bad"; return false; }
  try {
    STAT = await api("/api/social/status");
    c.textContent = "Đã kết nối " + new URL(STAT.site).host; c.className = "conn ok";
    return true;
  } catch (e) { c.textContent = em(e); c.className = "conn bad"; STAT = null; return false; }
}

// ---------- Lịch ----------
async function loadPlans() {
  try { PLANS = (await api("/api/social/plans")).items; } catch (e) { PLANS = []; }
  drawCal(); drawLists();
}
function drawCal() {
  const y = MONTH.getFullYear(), m = MONTH.getMonth();
  $("mtitle").textContent = `Tháng ${m + 1}/${y}`;
  const start = new Date(y, m, 1); start.setDate(1 - ((start.getDay() + 6) % 7));
  const today = new Date().toDateString();
  let h = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => `<div class="dh">${d}</div>`).join("");
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = d.toDateString();
    const ps = PLANS.filter((p) => p.scheduled_at && new Date(p.scheduled_at).toDateString() === key).sort((a, b) => a.scheduled_at - b.scheduled_at);
    h += `<div class="d${d.getMonth() !== m ? " out" : ""}${key === today ? " today" : ""}" data-day="${d.getTime()}"><span class="n">${d.getDate()}</span>` +
      ps.map((p) => `<span class="pill s-${esc(p.status)}" data-id="${p.id}" title="${esc(STATUS[p.status] + " · " + (p.title || p.message))}">${pad(new Date(p.scheduled_at).getHours())}:${pad(new Date(p.scheduled_at).getMinutes())} ${esc(p.title || p.message.slice(0, 40))}</span>`).join("") + "</div>";
    if (i === 34 && d.getMonth() !== m) break;
  }
  $("cal").innerHTML = h;
}
const itemRow = (p) => `<div class="it" data-id="${p.id}"><span class="dot s-${esc(p.status)}"></span><b>${esc(p.title || p.message.slice(0, 80) || "(không tên)")}</b><span class="muted">${esc(STATUS[p.status])} · ${esc(fmt(p.scheduled_at))}</span></div>`;
function drawLists() {
  const now = Date.now();
  const todo = PLANS.filter((p) => p.status === "scheduled" && p.scheduled_at && p.scheduled_at < now + 86400000).sort((a, b) => a.scheduled_at - b.scheduled_at);
  $("todo").innerHTML = todo.map(itemRow).join("") || '<div class="empty">Không có bài cần đăng trong 24 giờ tới.</div>';
  $("drafts").innerHTML = PLANS.filter((p) => !p.scheduled_at).map(itemRow).join("") || '<div class="empty">Không có nháp.</div>';
}
$("cal").addEventListener("click", (e) => {
  const pill = e.target.closest(".pill");
  if (pill) return openPlan(+pill.dataset.id);
  const d = e.target.closest(".d");
  if (!d) return;
  const day = new Date(+d.dataset.day); day.setHours(8, 0, 0, 0);
  if (ED.id || ED.message) ED = blank();
  ED.scheduled_at = day.getTime(); paintEditor();
});
["todo", "drafts"].forEach((id) => $(id).addEventListener("click", (e) => { const it = e.target.closest(".it"); if (it) openPlan(+it.dataset.id); }));
$("mprev").onclick = () => { MONTH.setMonth(MONTH.getMonth() - 1); drawCal(); };
$("mnext").onclick = () => { MONTH.setMonth(MONTH.getMonth() + 1); drawCal(); };
$("mtoday").onclick = () => { MONTH = new Date(); MONTH.setDate(1); drawCal(); };

function openPlan(id) {
  const p = PLANS.find((x) => x.id === id);
  if (!p) return;
  if (p.status === "scheduled" && p.scheduled_at && p.scheduled_at <= Date.now() + 3600000) { location.hash = "dang/" + id; return; }
  ED = JSON.parse(JSON.stringify(p)); paintEditor();
}

// ---------- Nội dung website ----------
let FTYPE = "";
async function loadFeed() {
  $("feed").innerHTML = '<div class="empty">Đang tải…</div>';
  try { FEED = await api("/api/social/feed"); drawFeed(); } catch (e) { FEED = null; $("feed").innerHTML = `<div class="empty">${esc(em(e))}</div>`; }
}
function drawFeed() {
  if (!FEED) return;
  const q = $("q").value.trim().toLowerCase();
  const all = [...FEED.posts, ...FEED.partners, ...FEED.pages].filter((x) => (!FTYPE || x.type === FTYPE) && (!q || (x.title + " " + x.excerpt).toLowerCase().includes(q)));
  const used = {};
  for (const p of PLANS) if (p.source && p.source.id) used[p.source.id] = (used[p.source.id] || 0) + 1;
  const TAG = { post: "Bài viết", partner: "Đối tác", page: "Trang" };
  $("feed").innerHTML = all.map((x, i) => `<div class="card"><div class="im" style="background-image:${esc(cssUrl(x.image))}"></div><div class="bd">
    <span class="tg">${esc(x.cat_name || TAG[x.type])}${x.upcoming ? "<em>sắp đăng web</em>" : ""}${used[x.id] ? `<em>đã lên lịch ${used[x.id]} lần</em>` : ""}${x.published_at ? `<em>${esc(new Date(x.published_at).toLocaleDateString("vi-VN"))}</em>` : ""}</span>
    <b>${esc(x.title)}</b><p>${esc(x.excerpt)}</p></div>
    <div class="ac"><button class="btn dark" data-use="${i}">Soạn bài từ đây</button><a class="btn" href="${esc(x.url)}" target="_blank" rel="noopener">Xem</a></div></div>`).join("") || '<div class="empty">Không có nội dung phù hợp.</div>';
  $("feed")._items = all;
}
$("q").addEventListener("input", drawFeed);
$("ftype").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; FTYPE = b.dataset.t; $("ftype").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); drawFeed(); });
$("freload").onclick = loadFeed;
$("feed").addEventListener("click", (e) => {
  const b = e.target.closest("[data-use]");
  if (!b) return;
  const x = $("feed")._items[+b.dataset.use];
  const keepTime = !ED.id ? ED.scheduled_at : null;
  ED = blank();
  ED.scheduled_at = keepTime;
  ED.title = x.title.slice(0, 200);
  ED.message = [x.title, x.excerpt, "Xem chi tiết: " + x.url, CONF.hashtags].filter(Boolean).join("\n\n");
  ED.link = x.url;
  if (x.image && /^https:\/\//.test(x.image)) ED.media = [{ type: "url", url: x.image, name: "Ảnh bìa", kind: "image" }];
  ED.source = { type: x.type, id: x.id, title: x.title, url: x.url };
  paintEditor(); msg("Đã đưa nội dung vào khung soạn. Sửa lời văn, chọn thêm tư liệu ở Kho Drive rồi lên lịch.");
});

// ---------- Kho Drive ----------
let DKIND = "";
async function loadDrive(folder) {
  $("dgrid").innerHTML = '<div class="empty">Đang tải…</div>';
  try {
    const d = await api("/api/social/drive" + (folder ? "?folder=" + encodeURIComponent(folder.id) : ""));
    if (!folder) DRIVE.stack = [{ id: d.root, name: "Thư mục tư liệu" }];
    DRIVE.items = d.items;
    $("dopen").href = d.link;
    drawDrive();
  } catch (e) { $("dgrid").innerHTML = `<div class="empty">${esc(em(e))}</div>`; }
}
function drawDrive() {
  $("crumb").innerHTML = DRIVE.stack.map((f, i) => (i < DRIVE.stack.length - 1 ? `<a data-i="${i}">${esc(f.name)}</a><span>›</span>` : `<b>${esc(f.name)}</b>`)).join("");
  const sel = new Set(ED.media.filter((m) => m.type === "drive").map((m) => m.id));
  const list = DRIVE.items.filter((x) => x.kind === "folder" || (!DKIND ? x.kind !== "file" : x.kind === DKIND));
  $("dgrid").innerHTML = list.map((x) => `<div class="tile${sel.has(x.id) ? " on" : ""}" data-id="${esc(x.id)}">
    <div class="im" style="background-image:${x.kind === "folder" ? "none" : esc(cssUrl(x.thumb))}">${x.kind === "folder" ? "📁" : ""}</div>
    ${x.kind === "video" ? `<span class="badge">Video${x.duration ? " · " + Math.floor(x.duration / 60) + ":" + pad(x.duration % 60) : ""}</span>` : ""}
    <div class="nm" title="${esc(x.name)}">${esc(x.name)}</div></div>`).join("") || '<div class="empty">Thư mục trống. Bấm "Mở thư mục" để tải ảnh, video lên Drive.</div>';
}
$("dgrid").addEventListener("click", (e) => {
  const t = e.target.closest(".tile");
  if (!t) return;
  const x = DRIVE.items.find((i) => i.id === t.dataset.id);
  if (x.kind === "folder") { DRIVE.stack.push({ id: x.id, name: x.name }); return loadDrive(x); }
  const i = ED.media.findIndex((m) => m.type === "drive" && m.id === x.id);
  if (i >= 0) ED.media.splice(i, 1);
  else {
    if (x.kind === "video") ED.media = ED.media.filter((m) => m.kind !== "video");
    if (ED.media.length >= 10) return msg("Tối đa 10 tư liệu một bài.");
    ED.media.push({ type: "drive", id: x.id, name: x.name, mime: x.mime, kind: x.kind });
  }
  paintMedia(); drawDrive();
});
$("crumb").addEventListener("click", (e) => {
  const a = e.target.closest("a[data-i]");
  if (!a) return;
  DRIVE.stack = DRIVE.stack.slice(0, +a.dataset.i + 1);
  const f = DRIVE.stack[DRIVE.stack.length - 1];
  DRIVE.stack.length === 1 ? (DRIVE.stack = [], loadDrive()) : loadDrive(f);
});
$("dkind").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; DKIND = b.dataset.k; $("dkind").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); drawDrive(); });
$("dreload").onclick = () => { const f = DRIVE.stack[DRIVE.stack.length - 1]; DRIVE.stack.length > 1 ? loadDrive(f) : (DRIVE.stack = [], loadDrive()); };

// ---------- Khung soạn bài ----------
function msg(t) { $("cmsg").textContent = t || ""; }
function paintMedia() {
  $("fmedia").innerHTML = ED.media.map((m, i) => `<div class="m" style="background-image:${esc(cssUrl(thumbOf(m)))}" title="${esc(m.name)}">${m.kind === "video" ? "▶" : ""}<button data-rm="${i}" title="Bỏ">×</button></div>`).join("");
}
$("fmedia").addEventListener("click", (e) => { const b = e.target.closest("[data-rm]"); if (!b) return; ED.media.splice(+b.dataset.rm, 1); paintMedia(); if (!$("v-drive").hidden) drawDrive(); });
function paintEditor() {
  const locked = ED.status === "published";
  $("ctitle").textContent = ED.id ? "Bài #" + ED.id : "Bài mới";
  $("cstate").textContent = ED.id ? STATUS[ED.status] + (ED.author ? " · sửa bởi " + ED.author : "") : "";
  $("ftitle").value = ED.title || ""; $("fmsg").value = ED.message || ""; $("flink").value = ED.link || "";
  $("fwhen").value = toLocal(ED.scheduled_at);
  $("fsrc").textContent = ED.source ? "Nguồn: " + ED.source.title : "";
  ["ftitle", "fmsg", "flink", "fwhen", "bdraft", "bsched"].forEach((id) => ($(id).disabled = locked));
  $("bdel").hidden = !ED.id;
  count(); paintMedia(); msg("");
}
function count() { $("fcount").textContent = $("fmsg").value.length + " ký tự"; }
$("fmsg").addEventListener("input", count);
function readEditor() {
  ED.title = $("ftitle").value.trim(); ED.message = $("fmsg").value; ED.link = $("flink").value.trim();
  ED.scheduled_at = $("fwhen").value ? new Date($("fwhen").value).getTime() : null;
}
async function save(status) {
  readEditor();
  const body = { title: ED.title, message: ED.message, link: ED.link, media: ED.media, source: ED.source, scheduled_at: ED.scheduled_at, status };
  const r = ED.id ? await api("/api/social/plans", { method: "PUT", body: JSON.stringify({ id: ED.id, ...body }) }) : await api("/api/social/plans", { method: "POST", body: JSON.stringify(body) });
  ED = r.item;
  return r.item;
}
async function after(text) {
  await loadPlans(); paintEditor(); msg(text);
  chrome.runtime.sendMessage({ type: "sync" }).catch(() => {});
}
const busy = async (btn, fn) => { btn.disabled = true; try { await fn(); } catch (e) { msg(em(e)); if (ED.id) loadPlans(); } finally { btn.disabled = false; } };
$("bdraft").onclick = () => busy($("bdraft"), async () => { await save("draft"); await after("✓ Đã lưu nháp."); });
$("bsched").onclick = () => busy($("bsched"), async () => {
  readEditor();
  if (!ED.scheduled_at) return msg(ERR.no_time);
  if (ED.scheduled_at < Date.now()) return msg("Thời gian đã qua. Chọn giờ khác.");
  await save("scheduled");
  await after("✓ Đã lên lịch. Extension sẽ nhắc lúc " + fmt(ED.scheduled_at - (+CONF.remindBefore || 0) * 60000) + " (cần mở Chrome).");
});
$("bdel").onclick = () => busy($("bdel"), async () => {
  if (!confirm("Xóa bài này khỏi lịch?")) return;
  await api("/api/social/plans?id=" + ED.id, { method: "DELETE" });
  ED = blank(); await after("✓ Đã xóa.");
});
$("cnew").onclick = () => { ED = blank(); paintEditor(); };

// ---------- Đăng tay ----------
let CUR = null;
function showPost(id) {
  CUR = PLANS.find((p) => p.id === id);
  if (!CUR) { $("dtitle").textContent = "Không tìm thấy bài"; return; }
  $("dtitle").textContent = CUR.title || "Bài #" + CUR.id;
  $("dwhen").textContent = STATUS[CUR.status] + " · " + fmt(CUR.scheduled_at);
  $("dmsg").textContent = CUR.message + (CUR.link && !CUR.message.includes(CUR.link) ? "\n\n" + CUR.link : "");
  $("dmedia").innerHTML = CUR.media.map((m) => `<div class="tile"><div class="im" style="background-image:${esc(cssUrl(thumbOf(m)))}">${m.kind === "video" ? "▶" : ""}</div><div class="nm">${esc(m.name)}</div></div>`).join("");
  $("ddown").hidden = !CUR.media.length; $("dst").textContent = "";
}
const fileUrl = (m) => (m.type === "url" ? m.url : `https://drive.google.com/uc?export=download&id=${m.id}`);
$("dcopy").onclick = async () => { await navigator.clipboard.writeText($("dmsg").textContent); $("dst").textContent = "✓ Đã sao chép nội dung. Dán vào ô viết bài trên Facebook."; };
$("ddown").onclick = async () => {
  for (const [i, m] of CUR.media.entries()) {
    const name = (m.name || `tu-lieu-${i + 1}`).replace(/[\\/:*?"<>|]/g, "-");
    await chrome.downloads.download({ url: fileUrl(m), filename: `FarmBase-lich-dang/${CUR.id}/${name}`, conflictAction: "uniquify" });
  }
  $("dst").textContent = `✓ Đang tải ${CUR.media.length} tệp vào thư mục Tải xuống/FarmBase-lich-dang/${CUR.id}.`;
};
$("dfb").onclick = () => chrome.tabs.create({ url: CONF.fbPage || DEFAULTS.fbPage });
$("ddone").onclick = async () => {
  try {
    await api("/api/social/plans", { method: "PUT", body: JSON.stringify({ id: CUR.id, status: "published" }) });
    await loadPlans(); chrome.runtime.sendMessage({ type: "sync" }).catch(() => {});
    $("dst").textContent = "✓ Đã đánh dấu đã đăng."; showPost(CUR.id);
  } catch (e) { $("dst").textContent = em(e); }
};
$("dedit").onclick = () => { ED = JSON.parse(JSON.stringify(CUR)); paintEditor(); location.hash = "lich"; };

// ---------- Cài đặt ----------
function fillConf() {
  const f = $("conf");
  for (const k of Object.keys(DEFAULTS)) if (f[k]) f[k].value = CONF[k] ?? "";
  info();
}
function info() {
  const s = STAT;
  $("confinfo").innerHTML = !s ? "" : `<p class="ok">✓ Kết nối ${esc(s.site)} (${esc(s.user)})</p>
    <p class="${s.drive ? "ok" : "bad"}">${s.drive ? `✓ Thư mục Drive: <a href="${esc(s.drive.link)}" target="_blank" rel="noopener">mở</a>` : "✗ Website chưa gắn thư mục Google Drive"}</p>`;
}
$("conf").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, c = {};
  for (const k of Object.keys(DEFAULTS)) c[k] = f[k] ? f[k].value.trim() : DEFAULTS[k];
  c.site = c.site.replace(/\/+$/, "");
  if (!/^https?:\/\/[\w.-]+(:\d+)?$/.test(c.site)) { $("confst").textContent = "Địa chỉ website chưa đúng (VD: https://farmbase.vn)."; return; }
  // Xin quyền truy cập tên miền nếu không phải farmbase.vn hoặc workers.dev
  try { await chrome.permissions.request({ origins: [c.site + "/*"] }); } catch (err) { /* đã có quyền hoặc không cần */ }
  await setConf(c);
  $("confst").textContent = "Đang kiểm tra…";
  const ok = await connect();
  $("confst").textContent = ok ? "✓ Đã lưu, kết nối tốt." : $("conn").textContent;
  info();
  if (ok) { FEED = null; DRIVE.stack = []; loadPlans(); chrome.runtime.sendMessage({ type: "sync" }).catch(() => {}); }
});

// ---------- Khởi động ----------
(async () => {
  const ok = await connect();
  paintEditor();
  if (!ok && !location.hash) location.hash = "caidat";
  if (ok) await loadPlans();
  show();
})();
