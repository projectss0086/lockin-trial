import { createClient } from "@supabase/supabase-js";
import { orderAmount, planByKey } from "@/lib/pricing";
import { tossReady } from "@/lib/toss";

export const runtime = "nodejs";

// 결제 연동이 켜졌는지 클라이언트가 미리 확인 (비밀 없음)
export async function GET() {
  return Response.json({ ready: tossReady() });
}

function orderName({ kind, plan, cycle, qty }) {
  if (kind === "credit") return `자물쇠 피드백 ${qty}회 이용권`;
  const p = planByKey(plan);
  return `자물쇠 피드백 ${p?.nm || ""} ${cycle === "y" ? "연" : "월"} 구독`;
}

export async function POST(req) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // 인증
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let uid = null;
    if (url && anon && token) {
      const { data } = await createClient(url, anon).auth.getUser(token);
      uid = data?.user?.id || null;
    }
    if (!uid) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

    const body = await req.json();
    const kind = body.kind === "credit" ? "credit" : "sub";

    // 금액은 서버가 다시 계산 (클라이언트가 보낸 금액은 절대 안 믿음)
    const calc = orderAmount({ kind, plan: body.plan, cycle: body.cycle, qty: body.qty });
    if (!calc.amount || calc.amount <= 0) {
      return Response.json({ error: "주문 정보가 올바르지 않아요." }, { status: 400 });
    }

    // 첫 달 쿠폰(미선정 체험단 등) — 월 구독 첫 결제에만 적용. 코드로 검증.
    let coupon = 0, baseAmount = calc.amount;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const couponCode = (body.couponCode || "").trim();
    if (kind === "sub" && calc.cycle === "m" && couponCode && url && svc) {
      const s = createClient(url, svc, { auth: { persistSession: false } });
      const { data: cp } = await s.from("applicants").select("id,coupon_redeemed").eq("coupon_code", couponCode).maybeSingle();
      if (cp && !cp.coupon_redeemed) coupon = 50;
    }
    const chargeAmount = coupon > 0 ? Math.round(baseAmount * (100 - coupon) / 100) : baseAmount;

    const nameArgs = { kind, plan: body.plan, cycle: calc.cycle, qty: calc.qty };
    const oName = orderName(nameArgs);
    // orderId: 결제마다 고유해야 함. uid 앞자리 + kind + 요청 타임스탬프(클라 전달) 조합.
    const stamp = String(body.ts || "").replace(/[^0-9]/g, "").slice(-13) || "0";
    const orderId = `${kind}_${uid.slice(0, 8)}_${stamp}`;

    if (!tossReady()) {
      // 아직 토스 키 전. 화면엔 정확한 금액을 보여주고 "결제 준비 중"으로 안내.
      return Response.json({ ready: false, amount: chargeAmount, baseAmount, coupon, orderName: oName });
    }

    // ── 토스 키가 오면 여기가 살아납니다 ──
    // 단건(이용권): 클라이언트가 이 값들로 결제창을 엽니다.
    // 구독(정기결제): 빌링키 발급 플로우로 분기 (successUrl에서 authKey→billingKey 교환).
    return Response.json({
      ready: true,
      kind,
      orderId,
      amount: chargeAmount,
      baseAmount,
      coupon,
      orderName: oName,
      customerKey: uid,
      plan: calc.plan || null,
      cycle: calc.cycle || null,
      qty: calc.qty || null,
    });
  } catch (e) {
    console.error("pay error:", e);
    return Response.json({ error: e?.message || "결제 준비 중 문제가 생겼어요." }, { status: 500 });
  }
}
