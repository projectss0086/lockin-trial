"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { planByKey, CREDIT_UNIT, PACKS, packByQty, won } from "@/lib/pricing";
import Footer from "../_components/Footer";

function CheckoutInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const kind = sp.get("kind") === "credit" ? "credit" : "sub";
  const plan = sp.get("plan") || "silver";
  const cycle = sp.get("cycle") === "y" ? "y" : "m";

  // 이용권은 정해진 묶음(10/20/30회)만 — 임의 개수 조절 없음
  const [qty, setQty] = useState((packByQty(sp.get("qty")) || PACKS[0]).n);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [err, setErr] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponPct, setCouponPct] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
    })();
  }, [router]);

  const p = planByKey(plan);
  const pack = packByQty(qty) || PACKS[0];
  const baseAmount = kind === "credit" ? pack.price : (cycle === "y" ? p?.y : p?.m) || 0;
  const canCoupon = kind === "sub" && cycle === "m";
  const couponActive = canCoupon && couponPct > 0;
  const amount = couponActive ? Math.round(baseAmount * (100 - couponPct) / 100) : baseAmount;

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code) return;
    setCouponBusy(true); setCouponMsg("");
    try {
      const res = await fetch("/api/coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await res.json();
      if (data.valid) { setCouponPct(data.pct || 0); setCouponMsg("✓ 첫 달 " + (data.pct || 0) + "% 할인 쿠폰이 적용됐어요."); }
      else { setCouponPct(0); setCouponMsg(data.reason || "사용할 수 없는 쿠폰이에요."); }
    } catch (e) { setCouponPct(0); setCouponMsg("확인 중 문제가 생겼어요."); }
    setCouponBusy(false);
  }
  const title = kind === "credit"
    ? `${qty}회 이용권`
    : `${p?.nm || ""} ${cycle === "y" ? "연" : "월"} 구독`;

  async function startPay() {
    setErr(""); setPending(null); setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ kind, plan, cycle, qty, couponCode: couponActive ? couponCode.trim() : "", ts: Date.now() }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "결제 준비 실패"); setBusy(false); return; }

      if (!data.ready) {
        setPending({ amount: data.amount, orderName: data.orderName });
        setBusy(false);
        return;
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_26DlbXAaV0wlw42jdNRb3qY50Q9R";
      const sdkMod = await import("@tosspayments/tosspayments-sdk");
      const toss = await sdkMod.loadTossPayments(clientKey);
      const customerKey = session?.user?.id || data.customerKey || ("guest_" + Date.now());
      const payment = toss.payment({ customerKey });
      const origin = window.location.origin;
      if (data.kind === "credit") {
        await payment.requestPayment({
          method: "CARD",
          amount: { currency: "KRW", value: data.amount },
          orderId: data.orderId,
          orderName: data.orderName,
          successUrl: `${origin}/checkout/success`,
          failUrl: `${origin}/checkout/fail`,
        });
      } else {
        await payment.requestBillingAuth({
          method: "CARD",
          successUrl: `${origin}/checkout/success?sub=1&plan=${data.plan}&cycle=${data.cycle}&coupon=${encodeURIComponent(couponActive ? couponCode.trim() : "")}`,
          failUrl: `${origin}/checkout/fail`,
        });
      }
    } catch (e) {
      setErr("결제창 오류: " + (e?.message || String(e)));
      setBusy(false);
    }
  }

  return (
    <div className="phone">
      <div className="top">
        <button className="back" onClick={() => router.push("/pricing")}>‹</button>
        <h2>결제</h2>
      </div>
      <div className="pad">
        <div className="h1" style={{ marginBottom: 4 }}>{title}</div>
        <div className="lead" style={{ marginBottom: 16 }}>
          {kind === "credit" ? "필요한 만큼, 정해진 묶음으로 구매해요." : "매월 자동으로 이어지는 구독이에요. 언제든 해지할 수 있어요."}
        </div>

        {kind === "credit" && (
          <div style={{ border: "1.5px solid var(--line)", borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div className="fl" style={{ marginTop: 0 }}>이용권 선택</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {PACKS.map((pk) => {
                const on = pk.n === qty;
                return (
                  <button key={pk.n} type="button" onClick={() => setQty(pk.n)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "13px 15px", borderRadius: 12, cursor: "pointer", fontSize: 15, fontFamily: "inherit",
                      border: on ? "2px solid var(--teal)" : "1.5px solid var(--line)",
                      background: on ? "var(--teal-soft)" : "#fff",
                      color: "var(--ink)", fontWeight: on ? 800 : 600,
                    }}>
                    <span>{pk.n}회 이용권</span>
                    <span style={{ color: on ? "var(--teal-d)" : "#5a6763" }}>{won(pk.price)}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: "#9aa6a1", marginTop: 10 }}>· 회당 {won(CREDIT_UNIT)} · 학생 1명 피드백에 1회 사용</div>
          </div>
        )}

        {canCoupon && (
          <div style={{ marginBottom: 14 }}>
            <label className="fl" style={{ marginTop: 0 }}>🎟️ 쿠폰 코드 <span style={{ color: "#b7c2bd" }}>(있으면 입력)</span></label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="tf" style={{ flex: 1 }} value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="예: BETA50-XXXXXX" />
              <button className="btn primary" style={{ width: "auto", padding: "0 16px", fontSize: 13 }} disabled={couponBusy || !couponCode.trim()} onClick={applyCoupon}>{couponBusy ? "확인 중" : "적용"}</button>
            </div>
            {couponMsg && <div style={{ fontSize: 12, marginTop: 6, color: couponActive ? "var(--teal-d)" : "#c0392b", fontWeight: 600 }}>{couponMsg}</div>}
          </div>
        )}

        <div className="ordersum">
          <div className="orow"><span>상품</span><b>{title}</b></div>
          {kind === "sub" && <div className="orow"><span>정산 주기</span><b>{cycle === "y" ? "연 결제 (2개월 무료)" : "월 결제"}</b></div>}
          {kind === "sub" && cycle === "m" && (<>
            <div className="orow"><span>정가</span><b style={{ textDecoration: "line-through", color: "#b7c2bd", fontWeight: 600 }}>{won(p?.list)}/월</b></div>
            <div className="orow"><span>🎉 출시 기념 할인</span><b style={{ color: "#c0392b" }}>−20% (−{won((p?.list || 0) - (p?.m || 0))})</b></div>
          </>)}
          {kind === "sub" && cycle === "y" && (<>
            <div className="orow"><span>월 결제 시 연</span><b style={{ textDecoration: "line-through", color: "#b7c2bd", fontWeight: 600 }}>{won((p?.m || 0) * 12)}</b></div>
            <div className="orow"><span>🎉 연 결제 혜택</span><b style={{ color: "#1F6F5C" }}>2개월 무료</b></div>
          </>)}
          {kind === "credit" && <div className="orow"><span>구성</span><b>{qty}회 × {won(CREDIT_UNIT)}</b></div>}
          {couponActive && (
            <div className="orow"><span>🎟️ 첫 달 할인 쿠폰</span><b style={{ color: "#c0392b" }}>−{couponPct}% (−{won(baseAmount - amount)})</b></div>
          )}
          <div className="orow total"><span>{couponActive ? "첫 달 결제 금액" : "결제 금액"}</span><b>{won(amount)}</b></div>
          <div style={{ fontSize: 11.5, color: "#9aa6a1", marginTop: 8 }}>표시 금액이 최종 결제 금액이에요 (부가세 포함)</div>
          {couponActive && (
            <div style={{ fontSize: 11.5, color: "#1F6F5C", marginTop: 4, fontWeight: 600 }}>
              🎉 첫 달만 {couponPct}% 할인가 · 둘째 달부터는 {won(baseAmount)}/월
            </div>
          )}
          {kind === "sub" && cycle === "m" && (
            <div style={{ fontSize: 11.5, color: "#1F6F5C", marginTop: 4, fontWeight: 600 }}>
              올해 가입 시 이 금액으로 인상 없이 고정 (2027년 정가 인상 예정)
            </div>
          )}
        </div>

        {pending && (
          <div className="note" style={{ background: "#FFF7E6", border: "1px solid #f0dcae", color: "#8a6d2b", marginTop: 16 }}>
            🔔 <div>
              <b>{won(pending.amount)}</b> · {pending.orderName}<br />
              결제 연동이 <b>심사 승인 직후 열려요.</b> 승인되면 이 버튼에서 바로 결제가 진행됩니다. 지금은 화면·금액만 미리 확인하는 단계예요.
            </div>
          </div>
        )}
        {err && <div className="err" style={{ marginTop: 14 }}>오류: {err}</div>}
      </div>
      <div className="foot">
        <button className="btn primary lg" disabled={busy} onClick={startPay}>
          {busy ? "준비 중…" : `${won(amount)} 결제하기`}
        </button>
      </div>
      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="phone"><div className="spin">불러오는 중…</div></div>}>
      <CheckoutInner />
    </Suspense>
  );
}
