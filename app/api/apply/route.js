import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function svcClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && svc ? createClient(url, svc, { auth: { persistSession: false } }) : null;
}

// 체험단 신청 — 가입/로그인 없이 공개로 접수
export async function POST(req) {
  const s = svcClient();
  if (!s) return Response.json({ error: "서버 설정이 준비 중이에요." }, { status: 500 });
  const b = await req.json();
  const row = {
    academy_id: null,
    name: (b.name || "").trim().slice(0, 100),
    contact: (b.contact || "").trim().slice(0, 100),
    youtube_id: (b.youtube_id || "").trim().slice(0, 100),
    student_count: (b.student_count || "").trim().slice(0, 40),
    region: (b.region || "").trim().slice(0, 80),
    motivation: (b.motivation || "").trim().slice(0, 1000),
    status: "applied",
  };
  if (!row.youtube_id) return Response.json({ error: "유튜브 닉네임을 입력해주세요." }, { status: 400 });
  if (!row.contact) return Response.json({ error: "연락처를 입력해주세요." }, { status: 400 });
  const { error } = await s.from("applicants").insert(row);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
