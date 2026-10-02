import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

async function authed(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  let uid = null;
  if (url && anon && token) {
    const { data } = await createClient(url, anon).auth.getUser(token);
    uid = data?.user?.id || null;
  }
  const svcClient = url && svc ? createClient(url, svc, { auth: { persistSession: false } }) : null;
  return { uid, svcClient };
}

// 고객: 내 문의 목록
export async function GET(req) {
  const { uid, svcClient } = await authed(req);
  if (!uid) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (!svcClient) return Response.json({ rows: [] });
  const { data, error } = await svcClient.from("inquiries").select("*").eq("academy_id", uid).order("created_at", { ascending: false }).limit(100);
  if (error) return Response.json({ rows: [], note: "문의 내역이 아직 없어요." });
  return Response.json({ rows: data || [] });
}

// 고객: 문의 보내기
export async function POST(req) {
  const { uid, svcClient } = await authed(req);
  if (!uid) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (!svcClient) return Response.json({ error: "서버 설정이 준비 중이에요." }, { status: 500 });
  const b = await req.json();
  const message = (b.message || "").trim();
  if (!message) return Response.json({ error: "문의 내용을 입력해주세요." }, { status: 400 });
  const { data, error } = await svcClient.from("inquiries").insert({ academy_id: uid, message: message.slice(0, 2000), status: "pending" }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, row: data });
}
