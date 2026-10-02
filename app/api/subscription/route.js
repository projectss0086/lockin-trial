import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const RETENTION_CREDITS = 10; // 유지 시 추가 지급 크레딧

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

    const svcClient = url && svc ? createClient(url, svc, { auth: { persistSession: false } }) : null;
    if (!svcClient) return Response.json({ error: "서버 설정이 준비 중이에요." }, { status: 500 });

    const { data: aca } = await svcClient.from("academies").select("*").eq("id", uid).single();
    if (!aca) return Response.json({ error: "계정을 찾을 수 없어요." }, { status: 404 });

    const body = await req.json();
    const action = body.action;

    // ── 유지 혜택: 크레딧 10개 지급 (1회만) ──
    if (action === "offer_claim") {
      if (aca.retention_offer_used) {
        return Response.json({ ok: false, already: true, message: "이미 받으신 혜택이에요." });
      }
      const newTop = (aca.credits ?? 0) + RETENTION_CREDITS;
      await svcClient.from("academies").update({
        credits: newTop,
        retention_offer_used: true,
        sub_status: "active",
      }).eq("id", uid);
      return Response.json({ ok: true, added: RETENTION_CREDITS, credits: newTop });
    }

    // ── 최종 해지: 다음 결제일 이후 갱신 중단 (그때까진 이용 가능) ──
    if (action === "cancel") {
      await svcClient.from("academies").update({
        sub_status: "canceled",
        sub_next_billing: aca.sub_next_billing || null,
      }).eq("id", uid);

      // 해지 사유 기록 (테이블 없으면 조용히 넘어감)
      try {
        await svcClient.from("cancellations").insert({
          academy_id: uid,
          plan: aca.plan || null,
          reason: (body.reason || "").slice(0, 200),
          detail: (body.detail || "").slice(0, 1000),
        });
      } catch (e) {}

      return Response.json({ ok: true, until: aca.sub_next_billing || null });
    }

    return Response.json({ error: "알 수 없는 요청이에요." }, { status: 400 });
  } catch (e) {
    console.error("subscription error:", e);
    return Response.json({ error: e?.message || "처리 중 문제가 생겼어요." }, { status: 500 });
  }
}
