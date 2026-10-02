import { createClient } from "@supabase/supabase-js";
import { CREDIT_UNIT, planByKey } from "@/lib/pricing";
import { tossReady, tossAuthHeader, TOSS_API } from "@/lib/toss";

export const runtime = "nodejs";

function currentPeriod() {
  const d = new Date(Date.now() + 9 * 3600 * 1000); // KST
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}
function nextBillingDate(cycle) {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  if (cycle === "y") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
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
    if (!tossReady()) return Response.json({ ok: false, pending: true, message: "결제 연동이 아직 준비 중이에요." });

    const svcClient = url && svc ? createClient(url, svc, { auth: { persistSession: false } }) : null;
    const b = await req.json();

    // ── 단건결제(크레딧 충전) ──
    if (b.kind === "credit") {
      const r = await fetch(`${TOSS_API}/v1/payments/confirm`, {
        method: "POST",
        headers: { Authorization: tossAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ paymentKey: b.paymentKey, orderId: b.orderId, amount: Number(b.amount) }),
      });
      const pay = await r.json();
      if (!r.ok) return Response.json({ error: pay?.message || "결제 승인 실패" }, { status: 400 });

      const add = Math.round(Number(pay.totalAmount || b.amount) / CREDIT_UNIT); // 승인된 금액 기준
      if (svcClient) {
        const { data: aca } = await svcClient.from("academies").select("credits").eq("id", uid).single();
        const newTop = (aca?.credits ?? 0) + add;
        await svcClient.from("academies").update({ credits: newTop }).eq("id", uid);
        return Response.json({ ok: true, kind: "credit", added: add, credits: newTop });
      }
      return Response.json({ ok: true, kind: "credit", added: add });
    }

    // ── 정기결제(구독): 빌링키 발급 → 첫 회차 즉시 결제 ──
    const plan = planByKey(b.plan);
    const cycle = b.cycle === "y" ? "y" : "m";
    if (!plan) return Response.json({ error: "요금제 정보가 올바르지 않아요." }, { status: 400 });

    // 1) authKey → billingKey 교환
    const issue = await fetch(`${TOSS_API}/v1/billing/authorizations/issue`, {
      method: "POST",
      headers: { Authorization: tossAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ authKey: b.authKey, customerKey: b.customerKey || uid }),
    });
    const issued = await issue.json();
    if (!issue.ok) return Response.json({ error: issued?.message || "구독 인증 실패" }, { status: 400 });
    const billingKey = issued.billingKey;

    // 2) 첫 회차 결제 (월 구독이면 쿠폰 코드로 첫 달 할인 적용)
    let coupon = 0, couponRow = null;
    const couponCode = (b.coupon || "").trim();
    if (cycle === "m" && couponCode && svcClient) {
      const { data: cp } = await svcClient.from("applicants").select("id,coupon_redeemed").eq("coupon_code", couponCode).maybeSingle();
      if (cp && !cp.coupon_redeemed) { coupon = 50; couponRow = cp; }
    }
    const fullAmount = cycle === "y" ? plan.y : plan.m;
    const amount = coupon > 0 ? Math.round(fullAmount * (100 - coupon) / 100) : fullAmount;
    const orderId = `sub_${uid.slice(0, 8)}_${Date.now()}`;
    const charge = await fetch(`${TOSS_API}/v1/billing/${billingKey}`, {
      method: "POST",
      headers: { Authorization: tossAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        customerKey: b.customerKey || uid,
        amount,
        orderId,
        orderName: `자물쇠 피드백 ${plan.nm} ${cycle === "y" ? "연" : "월"} 구독`,
      }),
    });
    const charged = await charge.json();
    if (!charge.ok) return Response.json({ error: charged?.message || "구독 첫 결제 실패" }, { status: 400 });

    // 3) 구독 상태 반영 (구독 크레딧 = 요금제 한도로 충전)
    if (svcClient) {
      await svcClient.from("academies").update({
        plan: plan.key,
        billing_cycle: cycle === "y" ? "yearly" : "monthly",
        sub_status: "active",
        sub_credits: plan.allowance,
        sub_period: currentPeriod(),
        sub_next_billing: nextBillingDate(cycle),
        toss_billing_key: billingKey,
        toss_customer_key: b.customerKey || uid,
      }).eq("id", uid);
      // 쿠폰 1회 사용 처리
      if (couponRow) await svcClient.from("applicants").update({ coupon_redeemed: true, redeemed_by: uid }).eq("id", couponRow.id);
    }
    return Response.json({ ok: true, kind: "sub", plan: plan.key });
  } catch (e) {
    console.error("confirm error:", e);
    return Response.json({ error: e?.message || "결제 확인 중 문제가 생겼어요." }, { status: 500 });
  }
}
