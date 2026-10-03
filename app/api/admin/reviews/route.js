import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const admins = (process.env.ADMIN_UIDS || "").split(",").map((s) => s.trim()).filter(Boolean);

    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let uid = null;
    if (url && anon && token) {
      const { data } = await createClient(url, anon).auth.getUser(token);
      uid = data?.user?.id || null;
    }
    if (!uid) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
    if (!admins.includes(uid)) return Response.json({ error: "권한이 없어요." }, { status: 403 });

    const svcClient = createClient(url, svc, { auth: { persistSession: false } });
    const { data: rows } = await svcClient.from("reviews").select("*").order("created_at", { ascending: false });
    return Response.json({ rows: rows || [] });
  } catch (e) {
    return Response.json({ error: e?.message || "오류" }, { status: 500 });
  }
}
