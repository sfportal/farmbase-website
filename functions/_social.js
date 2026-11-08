// Tiện ích cho extension lên lịch đăng Facebook: khóa API, thư mục Google Drive, gọi Facebook Graph API.
import { db, json, getSettings, requireRole, sameOrigin, CAN } from "./_lib.js";

const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
export const sha = async (s) => b64(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const same = (a, b) => {
  a = String(a || ""); b = String(b || "");
  let d = a.length ^ b.length;
  for (let i = 0; i < a.length && i < b.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

// Khóa extension có dạng fbk_ + 40 ký tự; máy chủ chỉ lưu mã băm.
export const newKey = () => "fbk_" + b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, "").slice(0, 40);
const KEY_RE = /^Bearer\s+(fbk_[A-Za-z0-9]{20,80})$/;

// Extension dùng khóa API; người đã đăng nhập trang quản lý (vai trò nội dung) cũng dùng được.
export async function socialAuth(request, env) {
  const m = KEY_RE.exec(request.headers.get("authorization") || "");
  if (m) {
    const s = await getSettings(await db(env));
    if (s.social_key_hash && same(await sha(m[1]), s.social_key_hash))
      return { id: 0, email: "extension", name: "Extension lịch đăng", role: "editor", viaKey: true };
    return json({ error: "bad_key" }, 401);
  }
  const u = await requireRole(request, env, CAN.content);
  if (u instanceof Response) return u;
  if (request.method !== "GET" && !sameOrigin(request)) return json({ error: "forbidden" }, 403);
  return u;
}

// CORS cho extension Chrome (trang chrome-extension://...)
export function corsHeaders(request) {
  const o = request.headers.get("origin") || "";
  if (!/^(chrome-extension|moz-extension):\/\/[a-z0-9-]+$/i.test(o)) return {};
  return {
    "access-control-allow-origin": o,
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

// ---------- Google Drive ----------
// Nhận link thư mục (drive.google.com/drive/folders/<id>), link ?id=<id> hoặc chính mã thư mục.
export function folderId(v) {
  const s = String(v || "").trim();
  const m = /\/folders\/([\w-]{10,100})/.exec(s) || /[?&]id=([\w-]{10,100})/.exec(s) || /^([\w-]{10,100})$/.exec(s);
  return m ? m[1] : "";
}
export const FILE_ID = /^[\w-]{10,100}$/;
const API = "https://www.googleapis.com/drive/v3/files";
const FOLDER = "application/vnd.google-apps.folder";
const kindOf = (mime, name = "") => {
  if (mime === FOLDER) return "folder";
  if (/^image\//.test(mime) || /\.(jpe?g|png|webp|gif|heic)$/i.test(name)) return "image";
  if (/^video\//.test(mime) || /\.(mp4|mov|webm|m4v|avi)$/i.test(name)) return "video";
  return "file";
};
const guessMime = (name) => {
  const e = (/\.(\w+)$/.exec(name) || [])[1];
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic",
    mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", m4v: "video/mp4" })[(e || "").toLowerCase()] || "";
};
const item = (f, origin, keyMode) => {
  const kind = kindOf(f.mimeType, f.name);
  return {
    id: f.id, name: f.name, mime: f.mimeType || "", kind,
    size: f.size ? +f.size : null, modified: f.modifiedTime || null,
    width: f.imageMediaMetadata?.width || null, height: f.imageMediaMetadata?.height || null,
    duration: f.videoMediaMetadata?.durationMillis ? Math.round(f.videoMediaMetadata.durationMillis / 1000) : null,
    thumb: kind === "folder" ? null : `https://drive.google.com/thumbnail?id=${f.id}&sz=w480`,
    view: kind === "folder" ? `https://drive.google.com/drive/folders/${f.id}` : `https://drive.google.com/file/d/${f.id}/view`,
    // Đường tải tệp gốc: qua website (khi có GOOGLE_API_KEY) hoặc thẳng từ Drive
    file: kind === "folder" ? null : keyMode ? `${origin}/api/social/file/${f.id}` : `https://drive.google.com/uc?export=download&id=${f.id}`,
  };
};

async function gfetch(url) {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    const e = new Error("drive_" + r.status);
    e.detail = t.slice(0, 300);
    throw e;
  }
  return r.json();
}
export async function driveMeta(env, id) {
  const p = new URLSearchParams({ fields: "id,name,mimeType,size,parents", supportsAllDrives: "true", key: env.GOOGLE_API_KEY });
  return gfetch(`${API}/${id}?${p}`);
}

// Tệp nằm trong thư mục gốc hoặc thư mục con (tối đa 3 tầng)
export async function insideRoot(env, root, id) {
  const file = await driveMeta(env, id);
  let m = file;
  for (let i = 0; i < 4; i++) {
    const parents = m.parents || [];
    if (parents.includes(root)) return file;
    if (!parents.length || i === 3) return null;
    m = await driveMeta(env, parents[0]);
  }
  return null;
}

export async function listDrive(env, folder, origin) {
  if (env.GOOGLE_API_KEY) {
    const out = [];
    let token = "";
    for (let i = 0; i < 5; i++) {
      const p = new URLSearchParams({
        q: `'${folder}' in parents and trashed=false`, pageSize: "200", orderBy: "folder,modifiedTime desc",
        fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,imageMediaMetadata(width,height),videoMediaMetadata(durationMillis))",
        supportsAllDrives: "true", includeItemsFromAllDrives: "true", key: env.GOOGLE_API_KEY,
      });
      if (token) p.set("pageToken", token);
      const d = await gfetch(`${API}?${p}`);
      out.push(...(d.files || []).map((f) => item(f, origin, true)));
      if (!(token = d.nextPageToken)) break;
    }
    return { mode: "api", items: out };
  }
  // Không có khóa Google: đọc trang xem thư mục công khai của Drive (thư mục phải chia sẻ "Bất kỳ ai có đường link")
  const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${folder}`, { headers: { "user-agent": "Mozilla/5.0 FarmBase" } });
  if (!r.ok) throw new Error("drive_" + r.status);
  const html = await r.text();
  const items = [];
  const re = /<div class="flip-entry" id="entry-([\w-]{10,100})"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(html)) && items.length < 500) {
    const name = m[3].replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    const isFolder = /\/folders\//.test(m[2]);
    items.push(item({ id: m[1], name, mimeType: isFolder ? FOLDER : guessMime(name) }, origin, false));
  }
  if (!items.length && !/flip-entry|flip-entries/.test(html)) throw new Error("drive_private");
  items.sort((a, b) => (a.kind === "folder" ? 0 : 1) - (b.kind === "folder" ? 0 : 1));
  return { mode: "public", items };
}

// ---------- Facebook Graph API ----------
export const fbReady = (env) => !!(env.FB_PAGE_ID && env.FB_PAGE_TOKEN);
const GV = (env) => (/^v\d+\.\d+$/.test(env.FB_GRAPH_VERSION || "") ? env.FB_GRAPH_VERSION : "v23.0");

async function graph(env, path, params, host = "graph.facebook.com", method = "POST") {
  const body = new URLSearchParams({ ...params, access_token: env.FB_PAGE_TOKEN });
  const url = `https://${host}/${GV(env)}/${path}`;
  const r = method === "DELETE" ? await fetch(`${url}?${body}`, { method }) : await fetch(url, { method, body });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) {
    const e = new Error((d.error && d.error.message) || "graph_" + r.status);
    e.graph = true;
    throw e;
  }
  return d;
}
export const fbDelete = (env, id) => graph(env, id, {}, "graph.facebook.com", "DELETE");

// Đăng hoặc hẹn giờ một bài trên Trang. media: [{kind, url}] (đường dẫn công khai để Facebook tự tải).
export async function fbPublish(env, { message, link, media, when }) {
  const page = env.FB_PAGE_ID;
  const sched = when ? { published: "false", scheduled_publish_time: String(Math.floor(when / 1000)) } : { published: "true" };
  const video = media.find((m) => m.kind === "video");
  if (video) {
    const d = await graph(env, `${page}/videos`, { file_url: video.url, description: message || "", ...sched }, "graph-video.facebook.com");
    return d.id;
  }
  const photos = media.filter((m) => m.kind === "image").slice(0, 10);
  const p = { message: message || "", ...sched };
  if (photos.length) {
    const ids = [];
    for (const ph of photos) {
      const d = await graph(env, `${page}/photos`, { url: ph.url, published: "false", ...(when ? { temporary: "true" } : {}) });
      ids.push(d.id);
    }
    ids.forEach((id, i) => { p[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
  } else if (link) p.link = link;
  const d = await graph(env, `${page}/feed`, p);
  return d.id;
}
