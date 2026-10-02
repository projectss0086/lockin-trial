"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
        <div className="lead">궁금한 점·불편한 점을 남겨주시면 최대한 빠른 시일 내에 검토 후 연락드리겠습니다.</div>

        <label className="fl">문의 내용</label>
        <textarea className="tf" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="예: 결제 영수증은 어디서 볼 수 있나요? / 문자 톤을 더 담백하게 바꾸고 싶어요." />
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
