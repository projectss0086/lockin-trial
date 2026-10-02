"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const SECTIONS = ["첫인사", "학습-경험", "학습-반응", "학습-의견", "성장-경험", "성장-반응", "성장-의견", "에피소드", "마무리"];
const SEASONS = ["봄", "여름", "가을", "겨울"];
const EMPTY_E = { section: "학습-경험", situation: "평상시", emotion: "", value_tag: "", expression: "" };
const EMPTY_S = { season: "봄", text: "" };
const TABS = [
  { key: "expr", label: "표현 DB" },
  { key: "season", label: "계절 인사" },
  { key: "customers", label: "고객" },
  { key: "applicants", label: "신청자" },
  { key: "inquiry", label: "문의함" },
  { key: "cancel", label: "해지 사유" },
];
const APP_STATUS = {
  applied: { t: "대기", c: "#8a6d2b", b: "#FFF7E6" },
  selected: { t: "선정", c: "var(--teal-d)", b: "var(--teal-soft)" },
  rejected: { t: "미선정 · 쿠폰지급", c: "#c0392b", b: "#FDECEA" },
};
const PLAN_NM = { bronze: "브론즈", silver: "실버", gold: "골드" };

export default function AdminPage() {
  const router = useRouter();
  const [state, setState] = useState("loading"); // loading | ok | denied
  const [tab, setTab] = useState("expr");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [busy, setBusy] = useState(false);

  const [fSection, setFSection] = useState("");
  const [q, setQ] = useState("");
  const [fSeason, setFSeason] = useState("");

  const [ef, setEf] = useState(EMPTY_E);
  const [sf, setSf] = useState(EMPTY_S);
  const [editId, setEditId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [ansDraft, setAnsDraft] = useState({}); // {inquiryId: 답변 텍스트}

  const isDB = tab === "expr" || tab === "season";

  const tokenHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` };
  }, []);

  const load = useCallback(async () => {
    const headers = await tokenHeader();
    let params;
    if (tab === "expr") params = `type=expressions${fSection ? `&section=${encodeURIComponent(fSection)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
    else if (tab === "season") params = `type=seasons${fSeason ? `&season=${encodeURIComponent(fSeason)}` : ""}`;
    else if (tab === "customers") params = `type=customers${q ? `&q=${encodeURIComponent(q)}` : ""}`;
    else if (tab === "applicants") params = `type=applicants`;
    else if (tab === "inquiry") params = `type=inquiries`;
    else params = `type=cancellations`;
    const res = await fetch(`/api/admin?${params}`, { headers });
    if (res.status === 403) { setState("denied"); return; }
    const data = await res.json();
    setRows(data.rows || []);
    setTotal(data.total ?? null);
    setState("ok");
  }, [tab, fSection, q, fSeason, tokenHeader]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      load();
    })();
  }, [load, router]);

  async function saveExpr() {
    if (!ef.expression.trim()) return;
    setBusy(true);
    const headers = await tokenHeader();
    const method = editId ? "PATCH" : "POST";
    await fetch("/api/admin", { method, headers, body: JSON.stringify({ type: "expressions", id: editId, ...ef }) });
    setEf(EMPTY_E); setEditId(null); setShowAdd(false); setBusy(false); load();
  }
  async function saveSeason() {
    if (!sf.text.trim()) return;
    setBusy(true);
    const headers = await tokenHeader();
    const method = editId ? "PATCH" : "POST";
    await fetch("/api/admin", { method, headers, body: JSON.stringify({ type: "seasons", id: editId, ...sf }) });
    setSf(EMPTY_S); setEditId(null); setShowAdd(false); setBusy(false); load();
  }
  async function del(type, id) {
    setBusy(true);
    const headers = await tokenHeader();
    await fetch(`/api/admin?type=${type}&id=${id}`, { method: "DELETE", headers });
    setBusy(false); load();
  }
  async function decideApplicant(id, decision) {
    setBusy(true);
    const headers = await tokenHeader();
    await fetch("/api/admin", { method: "PATCH", headers, body: JSON.stringify({ type: "applicants", id, decision }) });
    setBusy(false); load();
  }

  async function saveAnswer(id) {
    const answer = (ansDraft[id] || "").trim();
    if (!answer) return;
    setBusy(true);
    const headers = await tokenHeader();
    await fetch("/api/admin", { method: "PATCH", headers, body: JSON.stringify({ type: "inquiries", id, answer }) });
    setBusy(false);
    setAnsDraft((d) => { const n = { ...d }; delete n[id]; return n; });
    load();
  }

  function startEditE(r) { setEf({ section: r.section || "학습-경험", situation: r.situation || "", emotion: r.emotion || "", value_tag: r.value_tag || "", expression: r.expression || "" }); setEditId(r.id); setShowAdd(true); window.scrollTo(0, 0); }
  function startEditS(r) { setSf({ season: r.season || "봄", text: r.text || "" }); setEditId(r.id); setShowAdd(true); window.scrollTo(0, 0); }
  function switchTab(t) { setTab(t); setRows([]); setTotal(null); setEditId(null); setShowAdd(false); setEf(EMPTY_E); setSf(EMPTY_S); setQ(""); }

  const sel = { border: "1.5px solid var(--line)", borderRadius: 10, padding: "9px 11px", fontSize: 13, fontFamily: "inherit", background: "#fff", color: "var(--ink)" };
  const tabStyle = (on) => ({ border: "1.5px solid " + (on ? "var(--teal)" : "var(--line)"), background: on ? "var(--teal-d)" : "#fff", color: on ? "#fff" : "var(--muted)", fontWeight: 700, fontSize: 12.5, borderRadius: 20, padding: "7px 13px", fontFamily: "inherit", cursor: "pointer" });

  function fmtDate(s) { return s ? String(s).slice(0, 10) : ""; }

  if (state === "loading") return <div className="phone"><div className="spin">불러오는 중…</div></div>;
  if (state === "denied") return (
    <div className="phone"><div className="pad center" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div className="h1" style={{ textAlign: "center" }}>운영자 전용</div>
      <div className="lead" style={{ textAlign: "center" }}>이 화면은 운영자만 볼 수 있어요.</div>
      <button className="btn primary" style={{ marginTop: 16 }} onClick={() => router.push("/dashboard")}>대시보드로</button>
    </div></div>
  );

  return (
    <div className="phone">
      <div className="top">
        <button className="back" onClick={() => router.push("/dashboard")}>‹</button>
        <h2>운영자 콘솔</h2>
        <span className="spacer" />
        <span className="pill" style={{ background: "#2B2F2E", color: "#fff" }}>운영자</span>
      </div>

      <div className="pad">
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.key} style={tabStyle(tab === t.key)} onClick={() => switchTab(t.key)}>
              {t.label}{total != null && tab === t.key ? ` (${total})` : ""}
            </button>
          ))}
        </div>

        {isDB && (
          <div className="lead" style={{ marginBottom: 12, fontSize: 13 }}>
            여기서 더한 표현이 <b>전 학원의 목소리</b>가 돼요. 원장님(운영자)만 접근합니다.
          </div>
        )}

        {/* 추가/수정 폼 (표현·계절만) */}
        {isDB && !showAdd && (
          <button className="btn ghost lg" onClick={() => { setEditId(null); setShowAdd(true); }}>＋ {tab === "expr" ? "표현" : "계절 인사"} 추가</button>
        )}
        {showAdd && tab === "expr" && (
          <div style={{ border: "1.5px solid var(--teal)", borderRadius: 14, padding: 12, background: "var(--teal-soft)" }}>
            <div style={{ fontWeight: 700, color: "var(--teal-d)", fontSize: 13, marginBottom: 6 }}>{editId ? "✏️ 표현 수정" : "＋ 새 표현"}</div>
            <div className="row2">
              <div><label className="fl" style={{ marginTop: 0 }}>섹션</label>
                <select className="tf" value={ef.section} onChange={(e) => setEf({ ...ef, section: e.target.value })}>{SECTIONS.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="fl" style={{ marginTop: 0 }}>상황</label>
                <input className="tf" value={ef.situation} onChange={(e) => setEf({ ...ef, situation: e.target.value })} placeholder="평상시/시험후…" /></div>
            </div>
            <div className="row2" style={{ marginTop: 8 }}>
              <div><label className="fl">감정</label><input className="tf" value={ef.emotion} onChange={(e) => setEf({ ...ef, emotion: e.target.value })} placeholder="기특함…" /></div>
              <div><label className="fl">가치</label><input className="tf" value={ef.value_tag} onChange={(e) => setEf({ ...ef, value_tag: e.target.value })} placeholder="인내심…" /></div>
            </div>
            <label className="fl">표현</label>
            <textarea className="tf" rows={3} value={ef.expression} onChange={(e) => setEf({ ...ef, expression: e.target.value })} placeholder="{이름} 같은 자리표시자를 쓸 수 있어요" />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => { setShowAdd(false); setEditId(null); setEf(EMPTY_E); }}>취소</button>
              <button className="btn primary" style={{ flex: 2 }} disabled={busy || !ef.expression.trim()} onClick={saveExpr}>{editId ? "수정 완료" : "추가"}</button>
            </div>
          </div>
        )}
        {showAdd && tab === "season" && (
          <div style={{ border: "1.5px solid var(--teal)", borderRadius: 14, padding: 12, background: "var(--teal-soft)" }}>
            <div style={{ fontWeight: 700, color: "var(--teal-d)", fontSize: 13, marginBottom: 6 }}>{editId ? "✏️ 계절 인사 수정" : "＋ 새 계절 인사"}</div>
            <label className="fl" style={{ marginTop: 0 }}>계절</label>
            <select className="tf" value={sf.season} onChange={(e) => setSf({ ...sf, season: e.target.value })}>{SEASONS.map((s) => <option key={s}>{s}</option>)}</select>
            <label className="fl">인사 문구</label>
            <textarea className="tf" rows={2} value={sf.text} onChange={(e) => setSf({ ...sf, text: e.target.value })} placeholder="예: 청명한 맑은 하늘 같은 가을 되시기 바랍니다." />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => { setShowAdd(false); setEditId(null); setSf(EMPTY_S); }}>취소</button>
              <button className="btn primary" style={{ flex: 2 }} disabled={busy || !sf.text.trim()} onClick={saveSeason}>{editId ? "수정 완료" : "추가"}</button>
            </div>
          </div>
        )}

        {/* 필터 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "16px 0 12px", flexWrap: "wrap" }}>
          {tab === "expr" && (
            <>
              <select style={sel} value={fSection} onChange={(e) => setFSection(e.target.value)}>
                <option value="">전체 섹션</option>{SECTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <input style={{ ...sel, flex: 1, minWidth: 120 }} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="표현 검색…" />
              <button className="btn primary" style={{ width: "auto", padding: "9px 14px", fontSize: 13 }} onClick={load}>검색</button>
            </>
          )}
          {tab === "season" && (
            <select style={sel} value={fSeason} onChange={(e) => { setFSeason(e.target.value); }}>
              <option value="">전체 계절</option>{SEASONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          {tab === "customers" && (
            <>
              <input style={{ ...sel, flex: 1, minWidth: 120 }} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="학원명·원장명·연락처 검색…" />
              <button className="btn primary" style={{ width: "auto", padding: "9px 14px", fontSize: 13 }} onClick={load}>검색</button>
            </>
          )}
        </div>

        {/* 목록: 표현·계절 */}
        {(tab === "expr" || tab === "season") && rows.map((r) => (
          <div className="stu" key={r.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            {tab === "expr" ? (
              <>
                <div style={{ fontSize: 11.5, color: "var(--teal-d)", fontWeight: 700 }}>
                  {r.section}{r.emotion ? ` · ${r.emotion}` : ""}{r.value_tag ? ` · ${r.value_tag}` : ""}{r.situation ? ` · ${r.situation}` : ""}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{r.expression}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 11.5, color: "var(--teal-d)", fontWeight: 700 }}>{r.season}</div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{r.text}</div>
              </>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn ghost" style={{ padding: "7px 0", fontSize: 13 }} onClick={() => tab === "expr" ? startEditE(r) : startEditS(r)}>✏️ 수정</button>
              <button className="btn" style={{ padding: "7px 0", fontSize: 13, background: "#fff", color: "#c0392b", border: "1.5px solid #eab4ae" }} onClick={() => del(tab === "expr" ? "expressions" : "seasons", r.id)}>🗑 삭제</button>
            </div>
          </div>
        ))}

        {/* 목록: 고객 */}
        {tab === "customers" && rows.map((r) => {
          const active = r.plan && r.sub_status !== "canceled";
          const badge = !r.plan ? { t: "무료", c: "#8b9a94", b: "#eef2f0" }
            : r.sub_status === "canceled" ? { t: `${PLAN_NM[r.plan] || r.plan} · 해지`, c: "#c0392b", b: "#FDECEA" }
            : { t: `${PLAN_NM[r.plan] || r.plan} 구독`, c: "var(--teal-d)", b: "var(--teal-soft)" };
          return (
            <div className="stu" key={r.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{r.name || "이름 없음"}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: badge.c, background: badge.b, borderRadius: 6, padding: "3px 8px" }}>{badge.t}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {r.owner_name ? `${r.owner_name} 원장` : "원장명 미입력"}{r.phone ? ` · ${r.phone}` : ""}
              </div>
              <div style={{ fontSize: 12, color: "#7a8781", display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span>🎟️ 크레딧 {(r.sub_credits ?? 0) + (r.credits ?? 0)}개 <span style={{ color: "#aab4af" }}>(구독 {r.sub_credits ?? 0}·충전 {r.credits ?? 0})</span></span>
                {active && r.sub_next_billing && <span>· 다음결제 {fmtDate(r.sub_next_billing)}</span>}
                <span>· 가입 {fmtDate(r.created_at)}</span>
              </div>
            </div>
          );
        })}

        {/* 목록: 체험단 신청자 */}
        {tab === "applicants" && rows.map((r) => {
          const st = APP_STATUS[r.status] || APP_STATUS.applied;
          return (
            <div className="stu" key={r.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800 }}>▶ {r.youtube_id || "닉네임 없음"}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.b, borderRadius: 6, padding: "3px 8px", marginLeft: "auto" }}>{st.t}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {r.name || "이름 미기재"}{r.contact ? ` · 📞 ${r.contact}` : ""}
              </div>
              <div style={{ fontSize: 12, color: "#7a8781", display: "flex", gap: 10, flexWrap: "wrap" }}>
                {r.student_count && <span>👥 {r.student_count}</span>}
                {r.region && <span>· 📍 {r.region}</span>}
                <span>· 신청 {fmtDate(r.created_at)}</span>
              </div>
              {r.motivation && <div style={{ fontSize: 13.5, lineHeight: 1.55, background: "#F7F9F8", borderRadius: 10, padding: "10px 12px" }}>{r.motivation}</div>}
              {r.status === "rejected" && r.coupon_code && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FDECEA", borderRadius: 10, padding: "9px 12px" }}>
                  <span style={{ fontSize: 12, color: "#c0392b", fontWeight: 700 }}>🎟️ 쿠폰</span>
                  <b style={{ fontSize: 14, letterSpacing: 0.5 }}>{r.coupon_code}</b>
                  {r.coupon_redeemed && <span style={{ fontSize: 11, color: "#9aa6a1" }}>· 사용됨</span>}
                  {!r.coupon_redeemed && (
                    <button className="linkbtn" style={{ width: "auto", padding: 0, marginLeft: "auto", fontSize: 12 }} onClick={() => navigator.clipboard?.writeText(r.coupon_code)}>복사</button>
                  )}
                </div>
              )}
              {r.status === "applied" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn primary" style={{ flex: 1, padding: "8px 0", fontSize: 13 }} disabled={busy} onClick={() => decideApplicant(r.id, "select")}>🎉 선정</button>
                  <button className="btn" style={{ flex: 1, padding: "8px 0", fontSize: 13, background: "#fff", color: "#c0392b", border: "1.5px solid #eab4ae" }} disabled={busy} onClick={() => decideApplicant(r.id, "reject")}>미선정 (쿠폰 발급)</button>
                </div>
              )}
            </div>
          );
        })}

        {/* 목록: 문의함 */}
        {tab === "inquiry" && rows.map((r) => {
          const answered = r.status === "answered";
          const draft = ansDraft[r.id] ?? (answered ? r.answer : "");
          const draftOpen = r.id in ansDraft;
          return (
            <div className="stu" key={r.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 8px", color: answered ? "var(--teal-d)" : "#8a6d2b", background: answered ? "var(--teal-soft)" : "#FFF7E6" }}>
                  {answered ? "답변 완료" : "답변 대기"}
                </span>
                <span style={{ fontSize: 11.5, color: "#9aa6a1", marginLeft: "auto" }}>{fmtDate(r.created_at)}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {r.academy_name || "학원"}{r.owner_name ? ` · ${r.owner_name} 원장` : ""}{r.phone ? ` · ${r.phone}` : ""}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.55 }}>{r.message}</div>

              {answered && !draftOpen && (
                <div style={{ background: "var(--teal-soft)", borderRadius: 12, padding: "11px 13px" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--teal-d)", marginBottom: 4 }}>💬 내 답변</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.answer}</div>
                  <button className="linkbtn" style={{ width: "auto", padding: 0, marginTop: 6, fontSize: 12.5 }} onClick={() => setAnsDraft((d) => ({ ...d, [r.id]: r.answer || "" }))}>✏️ 답변 수정</button>
                </div>
              )}

              {(!answered || draftOpen) && (
                <div>
                  <textarea className="tf" rows={3} value={draft}
                    onChange={(e) => setAnsDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                    placeholder="답변을 입력하세요. 고객 화면(고객센터)에 그대로 보여요." />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {draftOpen && answered && (
                      <button className="btn ghost" style={{ flex: 1, padding: "8px 0", fontSize: 13 }} onClick={() => setAnsDraft((d) => { const n = { ...d }; delete n[r.id]; return n; })}>취소</button>
                    )}
                    <button className="btn primary" style={{ flex: 2, padding: "8px 0", fontSize: 13 }} disabled={busy || !(draft || "").trim()} onClick={() => saveAnswer(r.id)}>
                      {answered ? "답변 수정 저장" : "답변 보내기"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 목록: 해지 사유 */}
        {tab === "cancel" && rows.map((r) => (
          <div className="stu" key={r.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#c0392b", background: "#FDECEA", borderRadius: 6, padding: "3px 9px" }}>{r.reason || "사유 미기재"}</span>
              <span style={{ fontSize: 11.5, color: "#9aa6a1", marginLeft: "auto" }}>{fmtDate(r.created_at)}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {r.academy_name || "학원"}{r.owner_name ? ` · ${r.owner_name} 원장` : ""}{r.plan ? ` · ${PLAN_NM[r.plan] || r.plan}` : ""}
            </div>
            {r.detail && <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", background: "#F7F9F8", borderRadius: 10, padding: "10px 12px" }}>{r.detail}</div>}
          </div>
        ))}

        {rows.length === 0 && <div className="lead" style={{ textAlign: "center", marginTop: 20 }}>표시할 항목이 없어요.</div>}
        {tab === "expr" && rows.length >= 300 && <div className="hint" style={{ textAlign: "center", marginTop: 10 }}>최근 300개만 표시됨 · 섹션·검색으로 좁혀보세요</div>}
      </div>
    </div>
  );
}
