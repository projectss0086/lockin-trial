"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { PACKS } from "@/lib/pricing";
import Footer from "../_components/Footer";
const PLANS = [
  { key: "bronze", nm: "브론즈", cap: "학생 50명 이하", m: 49000, y: 490000, list: 61000, per: "학생 1명당 최대 980원", allowance: 50 },
  { key: "silver", nm: "실버", cap: "학생 100명 이하", m: 89000, y: 890000, list: 111000, per: "학생 1명당 최대 890원", allowance: 100, best: true },
  { key: "gold", nm: "골드", cap: "학생 200명 이하", m: 149000, y: 1490000, list: 186000, per: "학생 1명당 최대 745원", allowance: 200 },
];
const won = (n) => n.toLocaleString("ko-KR") + "원";
export default function PricingPage() {
  const router = useRouter();
  const [mode, setMode] = useState("m"); // m | y
  const [credits, setCredits] = useState(null);
  const [aca, setAca] = useState(null);
  const [msg, setMsg] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoggedIn(false); setChecked(true); return; } // 비로그인도 상품·가격은 볼 수 있음(심사·홍보용)
      setLoggedIn(true);
      const { data: a } = await supabase.from("academies").select("*").eq("id", session.user.id).single();
      setAca(a);
      setCredits((a?.sub_credits ?? 0) + (a?.credits ?? 0));
      setChecked(true);
    })();
  }, [router]);
  const curPlan = PLANS.find((p) => p.key === aca?.plan);
  const subActive = !!aca?.plan && aca?.sub_status !== "canceled";
  const subCanceled = !!aca?.plan && aca?.sub_status === "canceled";
  function goSub(planKey) {
    const target = `/checkout?kind=sub&plan=${planKey}&cycle=${mode}`;
    if (!loggedIn) { router.push(`/login?next=${encodeURIComponent(target)}`); return; }
    router.push(target);
  }
  function goCredit(n) {
    const target = `/checkout?kind=credit&qty=${n}`;
    if (!loggedIn) { router.push(`/login?next=${encodeURIComponent(target)}`); return; }
    router.push(target);
  }
  return (
    <div className="phone">
      <div className="top">
        <Link href={loggedIn ? "/dashboard" : "/"} className="back">‹</Link>
        <h2>요금제 · 이용권</h2>
      </div>
      <div className="pad">
        {checked && !loggedIn && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", border: "1.5px solid var(--line)", background: "#F7F9F8", borderRadius: 12, padding: "11px 14px", marginBottom: 14, fontSize: 12.5, color: "#5a6763", lineHeight: 1.6 }}>
            <span style={{ fontSize: 15 }}>🔒</span>
            <span>결제는 <b>로그인 후</b>에 진행돼요. 요금을 확인하고 <b>‘시작하기’</b>를 누르면 먼저 로그인 화면으로 안내해 드립니다.</span>
          </div>
        )}
        {credits !== null && (
          <div className="credbar">
            <span style={{ fontSize: 18 }}>🎟️</span>
            <span className="cb-n">남은 이용 횟수 <b>{credits}</b>회</span>
          </div>
        )}
        {subActive && curPlan && (
          <div style={{ border: "1.5px solid var(--teal)", borderRadius: 14, padding: "13px 15px", marginBottom: 14, background: "var(--teal-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontWeight: 800, color: "var(--teal-d)", fontSize: 14 }}>{curPlan.nm} 구독 중</span>
              <button className="linkbtn" style={{ width: "auto", marginLeft: "auto", padding: 0, fontSize: 12.5, color: "#9aa6a1" }} onClick={() => router.push("/cancel")}>구독 해지</button>
            </div>
            {aca?.sub_next_billing && <div style={{ fontSize: 12, color: "#5a6763", marginTop: 5 }}>다음 결제일 {aca.sub_next_billing}</div>}
          </div>
        )}
        {subCanceled && curPlan && (
          <div style={{ border: "1.5px solid var(--line)", borderRadius: 14, padding: "13px 15px", marginBottom: 14, background: "#fff" }}>
            <div style={{ fontWeight: 800, color: "#9aa6a1", fontSize: 14 }}>구독 해지됨 · {curPlan.nm}</div>
            <div style={{ fontSize: 12, color: "#5a6763", marginTop: 5 }}>
              {aca?.sub_next_billing ? `${aca.sub_next_billing}까지 이용 가능` : "다음 결제부터 중단"} · 아래에서 다시 시작할 수 있어요
            </div>
          </div>
        )}
        <div className="ebbanner">
          <div className="t">🎉 2026 출시 기념 개시 프로모션</div>
          <div className="s">갓 시작한 지금이 가장 좋은 조건이에요. <b>정가에서 20% 할인</b>가로, 올해 가입하면 <b>인상 없이 평생 고정</b>. (2027년 정가로 인상 예정)</div>
        </div>
        <div className="ptoggle">
          <button className={mode === "m" ? "on" : ""} onClick={() => setMode("m")}>월 결제</button>
          <button className={mode === "y" ? "on" : ""} onClick={() => setMode("y")}>연 결제 <span className="save">2개월 무료</span></button>
        </div>
        {PLANS.map((p) => (
          <div key={p.key} className={"plan" + (p.best ? " best" : "")}>
            {p.best && <div className="ptag">인기</div>}
            <div className="pnm">{p.nm}</div>
            <div className="pcap">{p.cap}</div>
            <div style={{ fontSize: 13, color: "var(--teal-d)", fontWeight: 800, marginTop: 3 }}>매월 {p.allowance}회 이용권 제공</div>
            {mode === "m" ? (
              <>
                <div className="pold">정가 {won(p.list)}/월</div>
                <div className="pnow"><b>{won(p.m)}</b>/월<span className="pdisc">20% 할인</span></div>
                <div className="pmo">{p.per}</div>
                <div className="pfut">2027년부터 {won(p.list)}/월로 인상 · 올해 가입 시 인상 없이 고정</div>
              </>
            ) : (
              <>
                <div className="pold">월 결제 시 연 {won(p.m * 12)}</div>
                <div className="pnow"><b>{won(p.y)}</b>/년<span className="pdisc">2개월 무료</span></div>
                <div className="pmo">월 {won(Math.round(p.y / 12))} 꼴 · 1년 고정</div>
                <div className="pfut">가장 이득 · 1년간 가격·혜택 그대로 잠금</div>
              </>
            )}
            <button className="pbtn" onClick={() => goSub(p.key)}>{mode === "y" ? "연 결제로 시작 →" : "이 요금제로 시작 →"}</button>
          </div>
        ))}
        <div className="credit">
          <div className="ct">🎟️ 추가 이용권</div>
          <div className="cs">구독 없이 필요한 만큼만. 학생 <b>1명 피드백에 1회</b> 사용돼요.</div>
          <div className="cp">회당 1,300원</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {PACKS.map((pk) => (
              <button key={pk.n} className="pbtn" onClick={() => goCredit(pk.n)}>
                {pk.n}회 이용권 · {won(pk.price)}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: "#9aa6a1", marginTop: 10 }}>· 정해진 묶음(10 · 20 · 30회) 단위로 구매해요</div>
        </div>
        <div className="nudge">
          💡 <b>먼저 이용권으로 가볍게 써보고</b>, 마음에 들면 구독으로 갈아타셔도 좋아요.
        </div>
        {msg && (
          <div style={{ position: "sticky", bottom: 12, marginTop: 14, background: "#20302B", color: "#fff", borderRadius: 12, padding: "12px 14px", fontSize: 13, textAlign: "center" }}>
            {msg}
          </div>
        )}
        <div style={{ fontSize: 11.5, color: "#9aa6a1", marginTop: 14, textAlign: "center", lineHeight: 1.6 }}>
          표시 가격이 최종 결제 금액이에요 (부가세 포함) · 언제든 해지 가능<br />
          학생 200명 초과는 고객센터로 문의해 주세요.
        </div>
      </div>
      <Footer />
    </div>
  );
}
