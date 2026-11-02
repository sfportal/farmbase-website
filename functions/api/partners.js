// Danh sách khách hàng, đối tác cho trang công khai. Rỗng thì trang dùng dữ liệu mẫu data/partners.json.
import { db, json } from "../_lib.js";

export async function onRequestGet({ env }) {
  try {
    const { results } = await (await db(env)).prepare("SELECT data FROM partners ORDER BY sort, slug").all();
    return json({ items: results.map((r) => JSON.parse(r.data)) }, 200, { "cache-control": "public, max-age=60" });
  } catch (e) {
    return json({ items: [] });
  }
}
