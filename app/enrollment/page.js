"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// '같이 들여다보기' 선택지
const TENURE = ["3개월 미만", "3~6개월", "6~12개월", "1년 이상"];
const REASON = ["이사", "비용", "성적불만", "강사불만", "친구관계", "경쟁학원", "흥미상실", "기타"];
const PREVENT = ["막을 수 있었다", "어쩔 수 없었다", "모르겠다"];
const PTYPE = ["열성·고관여", "우호·신뢰", "무관심·연락난", "불만·비교", "가격민감"];

function currentYM() {
  const d = new Date(Date.now() + 9 * 3600 * 1000); // KST
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}
function newWd() {
  return { name: "", tenure: "", reason: "", detail: "", prevent: "", signal: "", ptype: "" };
}

export default function EnrollmentPage() {
  const router = useRouter();
  const [uid, setUid] = useState(null);
  const [academy, setAcademy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const [total, setTotal] = useState(""); // 이번 달 현재 재원생 수
  const [nnew, setNnew] = useState("");   // 신입
  const [nleft, setNleft] = useState(""); // 퇴원
  const [wds, setWds] = useState([]);     // 퇴원 '같이 들여다보기' 블록들

  const ym = currentYM();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      setUid(session.user.id);
      const { data: aca } = await supabase.from("academies").select("*").eq("id", session.user.id).single();
      setAcademy(aca);
      // 이번 달 기록이 이미 있으면 불러와 채워줌
      const { data: log } = await supabase.from("enrollment_logs").select("*").eq("academy_id", session.user.id).eq("year_month", ym).maybeSingle();
      if (log) {
        if (log.total_count != null) setTotal(String(log.total_count));
        if (log.new_count != null) setNnew(String(log.new_count));
        if (log.left_count != null) { setNleft(String(log.left_count)); setWds(Array.from({ length: log.left_count }, newWd)); }
      } else if (aca?.current_students != null) {
        setTotal(String(aca.current_students)); // 처음이면 가입 때 넣은 현재 재원수로 시작
      }
      setLoading(false);
    })();
  }, [router, ym]);

  // 퇴원 수를 바꾸면 '같이 들여다보기' 블록 개수를 맞춰줌
  function changeLeft(v) {
    setNleft(v);
    const n = v === "" ? 0 : Math.max(0, Math.min(50, parseInt(v, 10) || 0));
    setWds((prev) => {
      const arr = prev.slice(0, n);
      while (arr.length < n) arr.push(newWd());
      return arr;
    });
  }
  function setWd(i, k, val) {
    setWds((prev) => prev.map((w, idx) => (idx === i ? { ...w, [k]: val } : w)));
  }

  async function save() {
    if (!uid) return;
    setBusy(true);
    const t = total.trim() === "" ? null : Number(total);
    const a = nnew.trim() === "" ? 0 : Number(nnew);
    const l = nleft.trim() === "" ? 0 : Number(nleft);

    // 1) 월별 기록 저장(있으면 갱신)
    const { data: log } = await supabase
      .from("enrollment_logs")
      .upsert({ academy_id: uid, year_month: ym, total_count: t, new_count: a, left_count: l }, { onConflict: "academy_id,year_month" })
      .select()
      .single();

    // 2) 현재 재원수 갱신
    if (t != null) await supabase.from("academies").update({ current_students: t }).eq("id", uid);

    // 3) 퇴원 사유 저장 (이번 달 것은 지우고 다시 넣어 중복 방지)
    await supabase.from("withdrawals").delete().eq("academy_id", uid).eq("year_month", ym);
    const rows = wds
      .map((w) => ({
        academy_id: uid,
        enrollment_log_id: log?.id || null,
        year_month: ym,
        student_name: w.name.trim() || null,
        tenure_bucket: w.tenure || null,
        reason_category: w.reason || null,
        reason_detail: w.detail.trim() || null,
        preventable: w.prevent || null,
        signal: w.signal.trim() || null,
        parent_type: w.ptype || null,
      }))
      .filter((r) => r.student_name || r.tenure_bucket || r.reason_category || r.reason_detail || r.preventable || r.signal || r.parent_type);
    if (rows.length) await supabase.from("withdrawals").insert(rows);

    setBusy(false);
    setDone(true);
  }

  // 작은 선택 버튼 그룹
  function Chips({ options, value, onPick }) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onPick(value === o ? "" : o)}
            style={{
              fontSize: 12.5, padding: "7px 11px", borderRadius: 18, cursor: "pointer", fontFamily: "inherit",
              border: value === o ? "1.5px solid var(--teal)" : "1.5px solid var(--line)",
              background: value === o ? "var(--teal-soft)" : "#fff",
              color: value === o ? "var(--teal-d)" : "var(--ink)",
              fontWeight: value === o ? 800 : 500,
            }}
          >
            {o}
          </button>
        ))}
      </div>
    );
  }

  if (loading) return <div className="phone"><div className="spin">불러오는 중…</div></div>;

  if (done) {
    return (
      <div className="phone">
        <div className="pad center" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 54 }}>📊</div>
          <div className="h1" style={{ textAlign: "center", marginTop: 8 }}>{ym.replace("-", "년 ")}월 기록 저장됐어요</div>
          <div className="lead" style={{ textAlign: "center" }}>
            매달 이렇게 남겨두시면, 분기마다 제가 리포트로 정리해 돌려드릴게요.
          </div>
        </div>
        <div className="foot">
          <button className="btn primary lg" onClick={() => router.push("/dashboard")}>대시보드로</button>
        </div>
      </div>
    );
  }

  const target = academy?.target_capacity;

  return (
    <div className="phone">
      <div className="top">
        <Link href="/dashboard" className="back">‹</Link>
        <h2>이번 달 정원 기록</h2>
        <span className="spacer" />
        <span className="pill">{ym.replace("-", ".")}</span>
      </div>
      <div className="pad">
        <div className="h1">이번 달 숫자를 알려주세요</div>
        <div className="lead" style={{ marginBottom: 14 }}>
          30초면 돼요. {target ? `목표 정원은 ${target}명이에요.` : ""}
        </div>

        <label className="fl">이번 달 현재 재원생 수</label>
        <input className="tf" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="예: 42" inputMode="numeric" />

        <div className="row2" style={{ marginTop: 8 }}>
          <div>
            <label className="fl">이번 달 신입</label>
            <input className="tf" value={nnew} onChange={(e) => setNnew(e.target.value)} placeholder="예: 3" inputMode="numeric" />
          </div>
          <div>
            <label className="fl">이번 달 퇴원</label>
            <input className="tf" value={nleft} onChange={(e) => changeLeft(e.target.value)} placeholder="예: 1" inputMode="numeric" />
          </div>
        </div>

        {wds.length > 0 && (
          <div className="note" style={{ background: "#F4F8F6", border: "1px solid #dbe6e1", color: "#5a6763", marginTop: 16 }}>
            🧭 <div>그만둔 학생이 있네요. 속상하셨죠. 왜 떠났는지 같이 들여다보면, 다음엔 한 명이라도 더 지킬 수 있어요. <b>아는 만큼만</b> 눌러주시면 돼요.</div>
          </div>
        )}

        {wds.map((w, i) => (
          <div key={i} style={{ border: "1.5px solid var(--line)", borderRadius: 14, padding: 14, marginTop: 12 }}>
            <div style={{ fontWeight: 800, color: "var(--teal-d)", fontSize: 13.5, marginBottom: 8 }}>퇴원 학생 {i + 1}</div>

            <input className="tf" value={w.name} onChange={(e) => setWd(i, "name", e.target.value)} placeholder="이름 또는 이니셜 (선택)" />

            <div style={{ fontSize: 12.5, color: "#5a6763", fontWeight: 700, marginTop: 12 }}>얼마나 다녔나요?</div>
            <Chips options={TENURE} value={w.tenure} onPick={(v) => setWd(i, "tenure", v)} />

            <div style={{ fontSize: 12.5, color: "#5a6763", fontWeight: 700, marginTop: 12 }}>가장 큰 이유는?</div>
            <Chips options={REASON} value={w.reason} onPick={(v) => setWd(i, "reason", v)} />

            <div style={{ fontSize: 12.5, color: "#5a6763", fontWeight: 700, marginTop: 12 }}>막을 수 있었을까요?</div>
            <Chips options={PREVENT} value={w.prevent} onPick={(v) => setWd(i, "prevent", v)} />

            <div style={{ fontSize: 12.5, color: "#5a6763", fontWeight: 700, marginTop: 12 }}>어떤 학부모였나요?</div>
            <Chips options={PTYPE} value={w.ptype} onPick={(v) => setWd(i, "ptype", v)} />

            <div style={{ fontSize: 12.5, color: "#5a6763", fontWeight: 700, marginTop: 12 }}>떠나기 전, 어떤 신호가 있었나요? <span style={{ color: "#b7c2bd", fontWeight: 400 }}>(선택)</span></div>
            <input className="tf" value={w.signal} onChange={(e) => setWd(i, "signal", e.target.value)} placeholder="예: 마지막 3주 결석이 늘었다" style={{ marginTop: 6 }} />

            <input className="tf" value={w.detail} onChange={(e) => setWd(i, "detail", e.target.value)} placeholder="더 남기고 싶은 말 (선택)" style={{ marginTop: 8 }} />
          </div>
        ))}
      </div>
      <div className="foot">
        <button className="btn primary lg" onClick={save} disabled={busy}>
          {busy ? "저장 중…" : "이번 달 기록 저장"}
        </button>
      </div>
    </div>
  );
}
