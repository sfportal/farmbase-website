// Nền: đồng bộ lịch đăng với website mỗi 15 phút, đặt báo thức cho bài "nhắc đăng tay", hiện thông báo khi đến giờ.
import { api, getConf } from "./lib.js";

const APP = chrome.runtime.getURL("app.html");

async function openApp(hash = "") {
  const tabs = await chrome.tabs.query({ url: APP + "*" });
  const url = APP + (hash ? "#" + hash : "");
  if (tabs[0]) {
    await chrome.tabs.update(tabs[0].id, { url, active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else await chrome.tabs.create({ url });
}

export async function sync() {
  const c = await getConf();
  if (!c.key) return;
  let items;
  try { items = (await api("/api/social/plans")).items; } catch (e) { console.warn("sync", e.message); return; }
  const now = Date.now(), before = (+c.remindBefore || 0) * 60000;
  const want = new Map();
  for (const p of items) if (p.status === "scheduled" && p.scheduled_at && p.scheduled_at - before > now - 60000) want.set("plan:" + p.id, p);
  const have = await chrome.alarms.getAll();
  for (const a of have) if (a.name.startsWith("plan:") && !want.has(a.name)) await chrome.alarms.clear(a.name);
  const cache = {};
  for (const [name, p] of want) {
    const when = Math.max(now + 1000, p.scheduled_at - before);
    const old = have.find((a) => a.name === name);
    if (!old || Math.abs(old.scheduledTime - when) > 30000) await chrome.alarms.create(name, { when });
    cache[p.id] = { title: p.title, message: p.message, scheduled_at: p.scheduled_at };
  }
  await chrome.storage.local.set({ planCache: cache, lastSync: now });
  const due = items.filter((p) => p.status === "scheduled" && p.scheduled_at && p.scheduled_at < now).length;
  await chrome.action.setBadgeBackgroundColor({ color: "#C7432F" });
  await chrome.action.setBadgeText({ text: due ? String(due) : "" });
}

chrome.runtime.onInstalled.addListener(() => { chrome.alarms.create("sync", { periodInMinutes: 15 }); sync(); });
chrome.runtime.onStartup.addListener(() => { chrome.alarms.create("sync", { periodInMinutes: 15 }); sync(); });
chrome.action.onClicked.addListener(() => openApp());

chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name === "sync") return sync();
  if (!a.name.startsWith("plan:")) return;
  const id = a.name.slice(5);
  const { planCache = {} } = await chrome.storage.local.get("planCache");
  const p = planCache[id] || {};
  chrome.notifications.create(a.name, {
    type: "basic", iconUrl: "icons/128.png", requireInteraction: true, priority: 2,
    title: "Đến giờ đăng bài Facebook",
    message: (p.title || p.message || "Bài #" + id).slice(0, 120),
    buttons: [{ title: "Mở để đăng" }],
  });
  sync();
});

const openPlan = (nid) => { if (nid.startsWith("plan:")) { openApp("dang/" + nid.slice(5)); chrome.notifications.clear(nid); } };
chrome.notifications.onClicked.addListener(openPlan);
chrome.notifications.onButtonClicked.addListener(openPlan);

chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m && m.type === "sync") { sync().then(() => reply({ ok: true })); return true; }
});
