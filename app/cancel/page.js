"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { planByKey, won } from "@/lib/pricing";

const REASONS = [
  "가격이 부담돼요",
  "생각보다 잘 안 쓰게 돼요",
  "원하는 기능이 없어요",
  "문자 품질이 아쉬워요",
  "학원 운영을 정리해요",
  "기타",
];

export default function CancelPage() {
  const router = useRouter();
  const [academy, setAcademy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1 사유 · 2 유지제안 · 3 할인경고 · 4 완료
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [claimed, setClaimed] = useState(null); // 유지 혜택 받은 결과

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: aca } = await supabase.from("academies").select("*").eq("id", session.user.id).single();
      setAcademy(aca);
      setLoading(false);
    })();
  }, [router]);

  const plan = planByKey(academy?.plan);
  const isSubscribed = !!academy?.plan && academy?.sub_status !== "canceled";
  const offerAvailable = !academy?.retention_offer_used;

  async function api(action, extra = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify({ action, ...extra }),
    });
    return res.json();
  }

  async function claimOffer() {
    setBusy(true); setErr("");
    const data = await api("offer_claim");
    setBusy(false);
    if (data.ok) { setClaimed(data); setStep(5); }
    else if (data.already) { setStep(3); } // 이미 받았으면 경고 단계로
    else setErr(data.error || "처리 실패");
  }

  async function doCancel() {
    setBusy(true); setErr("");
    const data = await api("cancel", { reason, detail });
    setBusy(false);
    if (data.ok) { setAcademy((a) => ({ ...a, sub_status: "canceled" })); setStep(4); }
    else setErr(data.error || "해지 실패");
  }

  if (loading) return <div className="phone"><div className="spin">불러오는 중…</div></div>;

  if (!isSubscribed && step < 4) {
    return (
      <div className="phone">
        <div className="top"><button className="back" onClick={() => router.push("/pricing")}>‹</button><h2>구독 관리</h2></div>
        <div className="pad center" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44 }}>🎟️</div>
          <div className="h1" style={{ textAlign: "center" }}>구독 중이 아니에요</div>
          <div className="lead" style={{ textAlign: "center" }}>해지할 구독이 없어요. 요금제에서 구독을 시작할 수 있어요.</div>
          <button className="btn primary" style={{ marginTop: 16 }} onClick={() => router.push("/pricing")}>요금제 보기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="top">
        <button className="back" onClick={() => step > 1 && step <= 3 ? setStep(step - 1) : router.push("/pricing")}>‹</button>
        <h2>구독 해지</h2>
      </div>

      {/* 1단계: 해지 사유 */}
      {step === 1 && (<>
        <div className="pad">
          <div className="h1">떠나시는 이유를 알려주세요</div>
          <div className="lead">더 나은 서비스를 위해 딱 하나만 골라주세요. (다음 개선에 꼭 반영할게요.)</div>
          {REASONS.map((r) => (
            <div key={r} className={"fork" + (reason === r ? " sel" : "")} style={{ padding: "14px 16px", marginBottom: 8 }} onClick={() => setReason(r)}>
              <h3 style={{ margin: 0 }}>{r}</h3>
            </div>
          ))}
          <label className="fl" style={{ marginTop: 12 }}>더 하고 싶은 말씀 <span style={{ color: "#b7c2bd" }}>(비워도 돼요)</span></label>
          <textarea className="tf" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="어떤 점이 아쉬우셨는지 적어주시면 큰 도움이 돼요." />
        </div>
        <div className="foot">
          <button className="btn primary lg" disabled={!reason} onClick={() => setStep(offerAvailable ? 2 : 3)}>다음</button>
        </div>
      </>)}

      {/* 2단계: 유지 제안 (크레딧 10개) */}
      {step === 2 && (<>
        <div className="pad center" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52 }}>🎁</div>
          <div className="h1" style={{ textAlign: "center", marginTop: 8 }}>잠깐만요, 선물이 있어요</div>
          <div className="lead" style={{ textAlign: "center" }}>
            지금 구독을 유지하시면 <b style={{ color: "var(--teal-d)" }}>크레딧 10개</b>를 바로 더 드릴게요.<br />
            부담 없이 조금 더 써보시는 건 어떠세요?
          </div>
          <div className="ebbanner" style={{ marginTop: 16, textAlign: "left" }}>
            <div className="t">🎟️ 크레딧 10개 = 학생 10명분 문자</div>
            <div className="s">유지하시면 지금 계정에 바로 쌓여요. 마음이 바뀌면 언제든 다시 해지할 수 있어요.</div>
          </div>
          {err && <div className="err" style={{ marginTop: 12 }}>오류: {err}</div>}
        </div>
        <div className="foot">
          <button className="btn primary lg" disabled={busy} onClick={claimOffer}>{busy ? "처리 중…" : "🎁 크레딧 받고 계속 이용하기"}</button>
          <div style={{ height: 8 }} />
          <button className="btn" style={{ background: "none", color: "#9aa6a1", border: "1.5px solid var(--line)" }} onClick={() => setStep(3)}>그래도 해지할게요</button>
        </div>
      </>)}

      {/* 3단계: 할인 사라짐 경고 */}
      {step === 3 && (<>
        <div className="pad center" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52 }}>⚠️</div>
          <div className="h1" style={{ textAlign: "center", marginTop: 8 }}>이 할인, 다시 못 받아요</div>
          <div className="lead" style={{ textAlign: "center" }}>
            지금은 <b>출시 기념 20% 할인가</b>로 이용 중이세요.
            {plan && <> (<b>{plan.nm} {won(plan.m)}/월</b>, 정가 {won(plan.list)})</>}
          </div>
          <div className="note" style={{ background: "#FDECEA", border: "1px solid #eab4ae", color: "#c0392b", marginTop: 16, textAlign: "left" }}>
            🔒 <div><b>해지하면 이 고정 할인가가 사라져요.</b> 나중에 다시 구독하면 그때의 <b>정가</b>로 시작하게 돼요. 지금 잠근 가격은 유지하는 동안에만 지켜져요.</div>
          </div>
          <div style={{ fontSize: 12.5, color: "#8b9a94", marginTop: 12 }}>
            해지해도 <b>다음 결제일까지는</b> 그대로 이용하실 수 있어요{academy?.sub_next_billing ? ` (${academy.sub_next_billing}까지)` : ""}.
          </div>
          {err && <div className="err" style={{ marginTop: 12 }}>오류: {err}</div>}
        </div>
        <div className="foot">
          <button className="btn primary lg" onClick={() => router.push("/dashboard")}>🔒 할인 지키고 계속 이용</button>
          <div style={{ height: 8 }} />
          <button className="btn" style={{ background: "#fff", color: "#c0392b", border: "1.5px solid #eab4ae" }} disabled={busy} onClick={doCancel}>
            {busy ? "해지 처리 중…" : "할인을 포기하고 해지하기"}
          </button>
        </div>
      </>)}

      {/* 4단계: 해지 완료 */}
      {step === 4 && (<>
        <div className="pad center" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52 }}>👋</div>
          <div className="h1" style={{ textAlign: "center", marginTop: 8 }}>구독이 해지됐어요</div>
          <div className="lead" style={{ textAlign: "center" }}>
            {academy?.sub_next_billing
              ? <>{academy.sub_next_billing}까지는 그대로 이용하실 수 있고, 이후 자동 결제가 멈춰요.</>
              : <>다음 결제부터 자동 결제가 멈춰요.</>}
            <br />그동안 함께해 주셔서 감사했어요. 언제든 다시 돌아오실 수 있어요.
          </div>
        </div>
        <div className="foot">
          <button className="btn primary lg" onClick={() => router.push("/dashboard")}>대시보드로</button>
        </div>
      </>)}

      {/* 유지 혜택 받음 */}
      {step === 5 && (<>
        <div className="pad center" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52 }}>🎉</div>
          <div className="h1" style={{ textAlign: "center", marginTop: 8 }}>크레딧 10개를 드렸어요!</div>
          <div className="lead" style={{ textAlign: "center" }}>
            계정에 바로 쌓였어요{claimed?.credits != null ? ` (충전 크레딧 ${claimed.credits}개)` : ""}. 계속 함께해 주셔서 감사해요. 💚
          </div>
        </div>
        <div className="foot">
          <button className="btn primary lg" onClick={() => router.push("/dashboard")}>대시보드로</button>
        </div>
      </>)}
    </div>
  );
}
