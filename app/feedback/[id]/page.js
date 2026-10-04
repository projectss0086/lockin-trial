"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const POS = ["기특함", "귀여움", "대견함", "자랑스러움", "뭉클함", "흐뭇함", "든든함", "반가움"];
const NEG = ["안쓰러움", "안타까움", "속상함", "미안함", "걱정스러움", "짠함", "아쉬움"];

// 생성 중 로딩 화면에 자동으로 순서대로 바뀌며 뜨는 문구 (인지-감정-관계)
const GEN_MSGS = [
  "수업이 잘 진행되고 있다고 인지하게 할 메세지를 쓰고 있어요",
  "학원에 대한 좋은 감정을 느끼게 할 메세지를 쓰고 있어요",
  "학부모와 좋은 관계를 만들 메세지를 쓰고 있어요",
  "이제 거의 다 되었어요..!",
];

function GenLoading() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setI((v) => (v < GEN_MSGS.length - 1 ? v + 1 : v));
    }, 1900);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "center", padding: "48px 18px 30px" }}>
      <div className="genspinner" />
      <div key={i} className="genmsg">{GEN_MSGS[i]}</div>
      <div className="gendots">
        {GEN_MSGS.map((_, k) => (
          <span key={k} className={"gendot" + (k <= i ? " on" : "")} />
        ))}
      </div>
      <style>{`
        .genspinner{width:40px;height:40px;margin:0 auto 22px;border-radius:50%;
          border:3.5px solid #e3ede9;border-top-color:var(--teal-d,#0f766e);
          animation:genspin .8s linear infinite;}
        @keyframes genspin{to{transform:rotate(360deg);}}
        .genmsg{font-size:15.5px;line-height:1.6;color:#3a4744;font-weight:600;
          word-break:keep-all;max-width:280px;margin:0 auto;min-height:48px;
          animation:genfade .5s ease;}
        @keyframes genfade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        .gendots{display:flex;gap:6px;justify-content:center;margin-top:20px;}
        .gendot{width:6px;height:6px;border-radius:50%;background:#dbe6e1;transition:all .3s;}
        .gendot.on{background:var(--teal-d,#0f766e);}
      `}</style>
    </div>
  );
}

export default function FeedbackPage() {
  const router = useRouter();
  const { id } = useParams();

  const [academy, setAcademy] = useState(null);
  const [student, setStudent] = useState(null);
  const [step, setStep] = useState(1); // 1 학습 2 갈림길 3 장면·감정 4 생성/미리보기
  const [learn, setLearn] = useState({ what: "", react: "", opinion: "" });
  const [fork, setFork] = useState(null); // growth | episode
  const [scene, setScene] = useState("");
  const [emotion, setEmotion] = useState(""); // 주관식 우선, 칩은 보조로 채워줌
  const [plan, setPlan] = useState(""); // 이 부분 앞으로의 계획 (생략 가능)

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [feedback, setFeedback] = useState("");
  const [editing, setEditing] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creditErr, setCreditErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: aca } = await supabase.from("academies").select("*").eq("id", session.user.id).single();
      setAcademy(aca);
      const { data: stu } = await supabase.from("students").select("*").eq("id", id).single();
      if (!stu) { router.replace("/dashboard"); return; }
      setStudent(stu);
    })();
  }, [id, router]);

  const firstName = student?.name ? student.name.slice(1) || student.name : "";
  const totalCredits = (academy?.sub_credits ?? 0) + (academy?.credits ?? 0);

  // 칩을 누르면 주관식 칸에 감정 단어를 채워줌 (이미 있으면 이어붙임)
  function addEmo(word) {
    setEmotion((prev) => {
      const t = prev.trim();
      if (!t) return word;
      if (t.includes(word)) return t;
      return t + ", " + word;
    });
  }

  async function copyMsg() {
    try { await navigator.clipboard.writeText(feedback); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch (e) {}
  }

  async function generate() {
    if (totalCredits <= 0) {
      setStep(4); setErr(""); setFeedback("");
      setCreditErr("이용 횟수가 부족해요. 이용권을 구매하면 바로 만들 수 있어요.");
      return;
    }
    setErr(""); setCreditErr(""); setBusy(true); setStep(4); setFeedback("");
    const emo = emotion.trim();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ academy, student, learn, fork, scene, emotion: emo, plan: plan.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "no_credit") { setCreditErr("이용 횟수가 부족해요. 이용권을 구매하면 바로 만들 수 있어요."); setBusy(false); return; }
        setErr(data.error || "생성 실패"); setBusy(false); return;
      }
      setFeedback(data.feedback);
      // 차감된 잔액 반영 (구독 이용권·추가 이용권 각각)
      setAcademy((a) => ({
        ...a,
        ...(typeof data.credits === "number" ? { credits: data.credits } : {}),
        ...(typeof data.subCredits === "number" ? { sub_credits: data.subCredits } : {}),
      }));
    } catch (e) {
      setErr("연결 오류가 났어요. 다시 시도해주세요.");
    }
    setBusy(false);
  }

  async function saveAndFinish() {
    // 이용권은 생성 시 서버에서 이미 차감됨. 여기선 이력 저장만.
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("feedbacks").insert({
      academy_id: session.user.id,
      student_id: student.id,
      content: feedback,
      fork_type: fork,
      emotion: emotion.trim(),
    });
    await supabase.from("students").update({ last_sent_at: new Date().toISOString() }).eq("id", student.id);
    setBusy(false);
    setDone(true);
  }

  if (!student) return <div className="phone"><div className="spin">불러오는 중…</div></div>;

  if (done) {
    return (
      <div className="phone">
        <div className="pad center" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 54 }}>🎉</div>
          <div className="h1" style={{ textAlign: "center", marginTop: 8 }}>발송 완료로 저장됐어요</div>
          <div className="lead" style={{ textAlign: "center" }}>
            {firstName} 학생 피드백이 이력에 남았어요. 남은 이용 횟수 {totalCredits}회.
          </div>
        </div>
        <div className="foot">
          <button className="btn primary lg" onClick={() => router.push("/dashboard")}>대시보드로</button>
        </div>
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="top">
        <button className="back" onClick={() => step > 1 && step < 4 ? setStep(step - 1) : router.push("/dashboard")}>‹</button>
        <h2>{student.name}</h2>
        <span className="spacer" />
        <span className="pill">{["학습", "선택", "장면", "완성"][step - 1]}</span>
      </div>
      <div className="steps">
        {[1, 2, 3, 4].map((n) => <i key={n} className={step >= n ? "on" : ""} />)}
      </div>

      {step === 1 && (
        <>
          <div className="pad">
            <div className="h1">학습 이야기</div>
            <div className="lead">이번 달 학습을 짧게 답해주세요. 단어·구절이면 충분해요.</div>
            <label className="fl">무엇을 배웠나요?</label>
            <input className="tf" value={learn.what} onChange={(e) => setLearn({ ...learn, what: e.target.value })} placeholder="예: 분수의 나눗셈" />
            <label className="fl">아이가 어떻게 반응했나요?</label>
            <input className="tf" value={learn.react} onChange={(e) => setLearn({ ...learn, react: e.target.value })} placeholder="예: 처음엔 헷갈리다 감을 잡음" />
            <label className="fl">선생님 소감 또는 앞으로의 학습계획 <span style={{ color: "#b7c2bd" }}>(비워도 돼요)</span></label>
            <input className="tf" value={learn.opinion} onChange={(e) => setLearn({ ...learn, opinion: e.target.value })} placeholder="예: 다음 달부터 응용문제 비중을 늘릴 예정 / 비워두면 AI가 채웁니다" />
          </div>
          <div className="foot">
            <button className="btn primary lg" disabled={!learn.what.trim() || !learn.react.trim()} onClick={() => setStep(2)}>다음</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="pad">
            <div className="lead" style={{ marginBottom: 16 }}>둘 중 <b>하나만</b> 고르세요. 이번 달에 어울리는 쪽이면 됩니다.</div>
            <div className={"fork" + (fork === "growth" ? " sel" : "")} onClick={() => setFork("growth")}>
              <div className="ic">🌱</div><h3>성장한 순간</h3>
              <p>아이의 마음이 자란 순간이 있었어요. (끈기·자신감·스스로 하려는 태도 등)</p>
            </div>
            <div className={"fork" + (fork === "episode" ? " sel" : "")} onClick={() => setFork("episode")}>
              <div className="ic">💛</div><h3>귀여운 에피소드</h3>
              <p>공부와 상관없이, 그냥 귀엽거나 인상적인 순간이 있었어요.</p>
            </div>
          </div>
          <div className="foot">
            <button className="btn primary lg" disabled={!fork} onClick={() => setStep(3)}>다음</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="pad">
            <div className="h1">{fork === "growth" ? "🌱 성장한 순간" : "💛 귀여운 에피소드"}</div>
            <label className="fl">{fork === "growth" ? "성장을 느낀 장면은?" : "귀여웠거나 인상적인 장면은?"}</label>
            <input className="tf" value={scene} onChange={(e) => setScene(e.target.value)}
              placeholder={fork === "growth" ? "예: 지루한 연산도 끝까지 붙잡고 풀어냄" : "예: 속상해하는 친구를 토닥이며 달래줌"} />

            <label className="fl" style={{ marginTop: 18 }}>선생님은 이때 아이에 대해 어떤 감정을 느꼈나요?</label>
            <textarea className="tf" rows={2} value={emotion} onChange={(e) => setEmotion(e.target.value)}
              placeholder="예: 속상해하면서도 다음을 다짐하는 모습이 짠하면서도 대견했어요" />
            <div className="note" style={{ background: "#F4F8F6", border: "1px solid #dbe6e1", color: "#5a6763" }}>
              💡 <div>딱 떠오르지 않으면, 아래에서 눌러 담아도 돼요. (여러 개 골라도 되고, 골라서 문장으로 다듬어도 좋아요.)</div>
            </div>
            <div className="emogrp"><div className="emohead">😊 긍정</div>
              <div className="chips">
                {POS.map((em) => (
                  <div key={em} className="chip" onClick={() => addEmo(em)}>{em}</div>
                ))}
              </div>
            </div>
            <div className="emogrp"><div className="emohead">🥺 부정</div>
              <div className="chips">
                {NEG.map((em) => (
                  <div key={em} className="chip neg" onClick={() => addEmo(em)}>{em}</div>
                ))}
              </div>
            </div>

            <label className="fl" style={{ marginTop: 20 }}>앞으로의 계획 <span style={{ color: "#b7c2bd" }}>(생략 가능)</span></label>
            <input className="tf" value={plan} onChange={(e) => setPlan(e.target.value)}
              placeholder={fork === "growth" ? "예: 발표 기회를 더 주며 자신감을 키워줄 계획" : "예: 이런 다정함을 칭찬하며 계속 북돋아줄 계획"} />
            <div style={{ fontSize: 12, color: "#9aa6a1", marginTop: 5 }}>
              적어두면 그 방향으로, 비우면 AI가 알아서 미래 비전을 담아요.
            </div>
          </div>
          <div className="foot">
            <button className="btn primary lg"
              disabled={!scene.trim() || !emotion.trim()}
              onClick={generate}>✨ 자물쇠 피드백 만들기</button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className="pad">
            {busy && !feedback && <GenLoading />}
            {err && <div className="err" style={{ marginTop: 20 }}>오류: {err}</div>}
            {creditErr && !feedback && (
              <div style={{ textAlign: "center", marginTop: 30 }}>
                <div style={{ fontSize: 40 }}>🎟️</div>
                <div className="err" style={{ marginTop: 8 }}>{creditErr}</div>
                <button className="btn primary" style={{ marginTop: 14 }} onClick={() => router.push("/pricing")}>이용권 구매하러 가기</button>
              </div>
            )}
            {feedback && !editing && (
              <>
                <div className="kakao">💬 완성된 문자</div>
                <div className="msg">{feedback}</div>
                <div className="note">🔒 <div><b>보내기 전 확인</b> — 복사해서 <b>원장님 카톡이나 문자</b>로 학부모님께 붙여넣어 보내세요. 직접 고칠 수도 있어요.</div></div>
                {student.parent_phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#5a6763", margin: "10px 2px" }}>
                    👪 학부모 번호 <b style={{ color: "var(--ink)" }}>{student.parent_phone}</b>
                    <button className="linkbtn" style={{ width: "auto", padding: 0, fontSize: 12.5 }}
                      onClick={() => navigator.clipboard?.writeText(student.parent_phone)}>번호 복사</button>
                  </div>
                )}
                <button className="btn ghost" onClick={() => setEditing(true)}>✏️ 직접 수정</button>
              </>
            )}
            {feedback && editing && (
              <>
                <div className="kakao">✏️ 직접 수정</div>
                <textarea className="editbox" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setEditing(false)}>수정 완료</button>
              </>
            )}
          </div>
          {feedback && !editing && (
            <div className="foot">
              <button className="btn primary lg" onClick={copyMsg}>
                {copied ? "✓ 복사됐어요 — 카톡·문자에 붙여넣으세요" : "📋 문자 복사하기"}
              </button>
              <div style={{ height: 10 }} />
              <button className="btn" style={{ background: "none", color: "var(--teal-d)", border: "1.5px solid var(--teal)" }} disabled={busy} onClick={saveAndFinish}>
                {busy ? "저장 중…" : "붙여넣어 보냈어요 · 발송 완료 →"}
              </button>
              <div style={{ fontSize: 11.5, color: "#9aa6a1", textAlign: "center", marginTop: 8 }}>
                이용권은 문자를 만들 때 이미 1회 차감됐어요 · 발송 완료는 이력 저장용이에요
              </div>
            </div>
          )}
          {err && !feedback && (
            <div className="foot">
              <button className="btn primary lg" onClick={() => setStep(3)}>← 돌아가서 다시</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
