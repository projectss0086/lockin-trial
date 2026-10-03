import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function genCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return "VLOCK-" + s;
}

export async function POST(req) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let uid = null;
    if (url && anon && token) {
      const { data } = await createClient(url, anon).auth.getUser(token);
      uid = data?.user?.id || null;
    }
    if (!uid) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

    const body = await req.json();
    const kind = body?.kind === "parent" ? "parent" : "trial";
    const content = (body?.content || "").toString().trim();
    const imageUrl = (body?.imageUrl || "").toString();
    const consent = !!body?.consent;
    if (!content) return Response.json({ error: "후기 내용을 적어주세요." }, { status: 400 });
    if (!consent) return Response.json({ error: "홍보 활용 동의가 필요해요." }, { status: 400 });
    if (kind === "parent" && !imageUrl) return Response.json({ error: "학부모 답장 캡처가 필요해요." }, { status: 400 });

    const svcClient = url && svc ? createClient(url, svc, { auth: { persistSession: false } }) : null;
    if (!svcClient) return Response.json({ error: "서버 설정 오류" }, { status: 500 });

    const { data: aca } = await svcClient.from("academies").select("name").eq("id", uid).single();
    const discount = kind === "parent" ? 30 : 20;

    let code = null;
    for (let i = 0; i < 5; i++) {
      const c = genCode();
      const { error } = await svcClient.from("codes").insert({ code: c, discount, academy_id: uid });
      if (!error) { code = c; break; }
    }
    if (!code) return Response.json({ error: "코드 생성 실패, 다시 시도해주세요." }, { status: 500 });

    const { data: rev } = await svcClient.from("reviews").insert({
      academy_id: uid, author_name: aca?.name || null, kind, content,
      image_url: imageUrl || null, consent, code, discount,
    }).select("id").single();

    if (rev?.id) await svcClient.from("codes").update({ review_id: rev.id }).eq("code", code);

    return Response.json({ code, discount });
  } catch (e) {
    console.error("review error:", e);
    return Response.json({ error: e?.message || "문제가 생겼어요." }, { status: 500 });
  }
}
