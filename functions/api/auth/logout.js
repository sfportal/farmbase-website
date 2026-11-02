import { db, json, destroySession, clearCookie } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (env.DB) await destroySession(await db(env), request);
  return json({ ok: true }, 200, { "set-cookie": clearCookie() });
}
