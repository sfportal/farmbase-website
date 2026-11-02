// Mã đo lường gắn lên website: Google Analytics 4 và Facebook Pixel.
import { db, json, requireRole, CAN, sameOrigin, getSettings, clearSettingsCache } from "../../_lib.js";

const RULES = {
  ga_id: /^G-[A-Z0-9]{4,15}$/,
  fb_pixel_id: /^\d{8,20}$/,
};

export async function onRequestGet({ request, env }) {
  const me = await requireRole(request, env, CAN.settings);
  if (me instanceof Response) return me;
  const s = await getSettings(await db(env));
  return json({ ga_id: s.ga_id || "", fb_pixel_id: s.fb_pixel_id || "" });
}

export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, CAN.settings);
  if (me instanceof Response) return me;
  const b = await request.json().catch(() => ({}));
  const D = await db(env);
  for (const k of Object.keys(RULES)) {
    if (b[k] === undefined) continue;
    const v = String(b[k]).trim().toUpperCase();
    if (v && !RULES[k].test(v)) return json({ error: "bad_" + k }, 400);
    await D.prepare("INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(k, v).run();
  }
  clearSettingsCache();
  return json({ ok: true });
}
