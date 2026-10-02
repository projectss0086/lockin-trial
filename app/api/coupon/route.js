import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export const COUPON_PCT = 50;

// 쿠폰 코드 유효성 확인 (첫 달 50% 할인)
export async function POST(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const s = url && svc ? createClient(url, svc, { auth: { persistSession: false } }) : null;
  if (!s) return Response.json({ valid: false });
  const code = ((await req.json())?.code || "").trim();
  if (!code) return Response.json({ valid: false });
  const { data } = await s.from("applicants").select("id,coupon_redeemed").eq("coupon_code", code).maybeSingle();
  if (!data) return Response.json({ valid: false, reason: "존재하지 않는 코드예요." });
  if (data.coupon_redeemed) return Response.json({ valid: false, reason: "이미 사용된 쿠폰이에요." });
  return Response.json({ valid: true, pct: COUPON_PCT });
}
