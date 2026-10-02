"use client";

import { useState } from "react";

export default function BetaForm() {
  const [form, setForm] = useState({ youtube_id: "", name: "", contact: "", student_count: "", region: "", motivation: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.youtube_id.trim()) { setErr("유튜브 닉네임을 입력해주세요."); return; }
    if (!form.contact.trim()) { setErr("연락처를 입력해주세요."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setBusy(false);
      if (data.ok) setDone(true);
      else setErr(data.error || "신청 실패");
    } catch (e) { setBusy(false); setErr("연결 오류가 났어요. 다시 시도해주세요."); }
  }

  if (done) {
    return (
      <div className="ebbanner" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🎉</div>
        <div className="t" style={{ fontSize: 15 }}>신청이 접수됐어요!</div>
        <div className="s" style={{ marginTop: 6 }}>
          유튜브 <b>구독·신청 댓글</b>과 대조해 선정 결과를 <b>남겨주신 연락처</b>로 안내드려요.<br />
          미선정되셔도 <b>첫 달 50% 할인 쿠폰</b>을 보내드리니 걱정 마세요. 💚
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="fl" style={{ marginTop: 0 }}>유튜브 닉네임 <span style={{ color: "#c0392b" }}>*</span></label>
      <input className="tf" value={form.youtube_id} onChange={set("youtube_id")} placeholder="댓글 남긴 유튜브 닉네임 그대로" />

      <label className="fl">연락처 <span style={{ color: "#c0392b" }}>*</span></label>
      <input className="tf" value={form.contact} onChange={set("contact")} placeholder="휴대폰 / 이메일 / 카톡 ID — 결과를 여기로 보내드려요" />

      <label className="fl">학원명 (또는 성함)</label>
      <input className="tf" value={form.name} onChange={set("name")} placeholder="예: 서울국어학원 / 김수학" />

      <label className="fl">학생 수</label>
      <input className="tf" value={form.student_count} onChange={set("student_count")} placeholder="예: 40명 / 20~30명" />

      <label className="fl">지역</label>
      <input className="tf" value={form.region} onChange={set("region")} placeholder="예: 경북 울릉 / 서울 강서구" />

      <label className="fl">신청 동기 <span style={{ color: "#b7c2bd" }}>(비워도 돼요)</span></label>
      <textarea className="tf" rows={3} value={form.motivation} onChange={set("motivation")} placeholder="어떤 점이 끌리셨는지, 어떻게 쓰고 싶으신지 알려주세요." />

      {err && <div className="err" style={{ marginTop: 10 }}>오류: {err}</div>}
      <button className="btn primary lg" style={{ marginTop: 14 }} disabled={busy || !form.youtube_id.trim() || !form.contact.trim()} onClick={submit}>
        {busy ? "신청 중…" : "🎬 체험단 신청하기"}
      </button>
    </div>
  );
}
