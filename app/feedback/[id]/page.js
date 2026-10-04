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
        <span
