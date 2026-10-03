"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const FAQ = [
  {
    q: "무료 체험은 정말 공짜인가요?",
    a: "네! 창립 멤버 원장님께는 무료 이용권 30회를 드려요. 체험 기간에는 결제가 전혀 없으니 부담 없이 써보세요.",
  },
  {
    q: "이용 횟수는 어떻게 차감되나요?",
    a: "학생 한 명의 피드백 문자를 만들 때 1회 차감돼요. 만들기를 누르는 순간 차감되니, 내용을 충분히 입력한 뒤 만들어 주세요.",
  },
  {
    q: "할인 코드는 어떻게 받나요?",
    a: "대시보드의 ‘후기 남기고 할인코드 받기’에서 후기를 남기면 바로 발급돼요.\n· 체험 후기 → 평생 20% 코드\n· 학부모님께 받은 답장 인증 → 평생 30% 코드\n이 코드는 정식 오픈 때 결제 화면에 입력하면 적용돼요.",
  },
  {
    q: "학생·학부모 개인정보는 안전한가요?",
    a: "입력하신 정보는 피드백 문자를 만드는 데에만 쓰여요. 후기에 사진을 올리실 때는 학생·학부모 이름이나 전화번호 같은 개인정보를 꼭 가리고 올려주세요.",
  },
  {
    q: "완성된 문자는 어떻게 보내나요?",
    a: "완성 화면에서 ‘문자 복사하기’를 누른 뒤, 원장님 카카오톡이나 문자 앱에 붙여넣어 학부모님께 보내시면 돼요.",
  },
  {
    q: "문의하면 언제 답변받나요?",
    a: "아래 문의 폼으로 남겨주시면 검토 후 연락드려요. 급하신 경우 010-4012-0086 으로 문자 주셔도 됩니다.",
  },
];

export default function SupportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function loadMine() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const res = await fetch("/api/support", { headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await res.json();
    setRows(data.rows || []);
    setLoading(false);
  }

  useEffect(() => { loadMine(); }, []); // eslint-disable-line

  async function send() {
    if (!msg.trim()) return;
    setBusy(true); setErr("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ message: msg.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) { setMsg(""); setSent(true); setTimeout(() => setSent(false), 3000); loadMine(); }
    else setErr(data.error || "전송 실패");
  }

  function fmt(s) { return s ? String(s).slice(0, 16).replace("T", " ") : ""; }

  return (
    <div className="phone">
      <div className="top">
        <button className="back" onClick={() => router.push("/dashboard")}>‹</button>
        <h2>고객센터</h2>
      </div>
      <div className="pad">
        <div className="h1">무엇을 도와드릴까요?</div>
        <div className="lead">자주 묻는 질문을 먼저 확인해 보시고, 더 궁금한 점은 아래로 문의해 주세요.</div>

        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)", margin: "20px 2px 10px" }}>자주 묻는 질문</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQ.map((it, i) => (
            <details key={i} style={{ border: "1.5px solid var(--line)", borderRadius: 12, background: "#fff", padding: "0 14px" }}>
              <summary style={{ cursor: "pointer", listStyle: "none", padding: "13px 0", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                Q. {it.q}
              </summary>
              <div style={{ fontSize: 13.5, color: "#3f4a46", lineHeight: 1.7, padding: "0 0 14px", whiteSpace: "pre-line" }}>{it.a}</div>
            </details>
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)", margin: "26px 2px 10px" }}>문의하기</div>
        <label className="fl" style={{ marginTop: 0 }}>문의 내용</label>
        <textarea className="tf" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="예: 문자 톤을 더 담백하게 바꾸고 싶어요. / 가입이 잘 안 돼요." />
        {err && <div className="err" style={{ marginTop: 10 }}>오류: {err}</div>}
        <button className="btn primary lg" style={{ marginTop: 12 }} disabled={busy || !msg.trim()} onClick={send}>
          {busy ? "보내는 중…" : sent ? "✓ 접수됐어요" : "문의 보내기"}
        </button>

        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--muted)", margin: "24px 2px 10px" }}>내 문의 내역</div>
        {loading ? (
          <div className="spin">불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div className="stu" style={{ justifyContent: "center", color: "var(--muted)" }}>아직 보낸 문의가 없어요.</div>
        ) : rows.map((r) => (
          <div className="stu" key={r.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 8px", color: r.status === "answered" ? "var(--teal-d)" : "#8a6d2b", background: r.status === "answered" ? "var(--teal-soft)" : "#FFF7E6" }}>
                {r.status === "answered" ? "답변 완료" : "답변 대기"}
              </span>
              <span style={{ fontSize: 11.5, color: "#9aa6a1", marginLeft: "auto" }}>{fmt(r.created_at)}</span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55 }}>{r.message}</div>
            {r.answer && (
              <div style={{ background: "var(--teal-soft)", borderRadius: 12, padding: "11px 13px" }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--teal-d)", marginBottom: 4 }}>💬 운영자 답변</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.answer}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
