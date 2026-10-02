"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const GRADES = ["초1","초2","초3","초4","초5","초6","중1","중2","중3","고1","고2","고3"];
const EMPTY = { name: "", grade: "초5", gender: "남", subject: "수학", parent_phone: "", group_name: "" };
const UNGROUPED = "미분류";
const GSEQ = ["초1","초2","초3","초4","초5","초6","중1","중2","중3","고1","고2","고3","졸업"];
function nextGrade(g) { const i = GSEQ.indexOf(g); return (i >= 0 && i < GSEQ.length - 1) ? GSEQ[i + 1] : g; }

export default function StudentsPage() {
  const router = useRouter();
  const [uid, setUid] = useState(null);
  const [students, setStudents] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState({});               // 다중 선택 (id -> true)
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [pendingDel, setPendingDel] = useState(null); // 개별 삭제 확인
  const [lastBump, setLastBump] = useState(null);     // 학년 올리기 되돌리기용
  const [showForm, setShowForm] = useState(false);    // 추가 폼 펼침 여부
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      setUid(session.user.id);
      const { data } = await supabase.from("students").select("*").order("created_at", { ascending: true });
      setStudents(data || []);
    })();
  }, [router]);

  // 이미 쓰인 그룹 이름들 (입력 자동완성용)
  const existingGroups = [...new Set(students.map((s) => s.group_name).filter(Boolean))];
  const formOpen = showForm || !!editId;

  // 그룹별로 묶기
  const grouped = {};
  students.forEach((s) => {
    const g = s.group_name || UNGROUPED;
    (grouped[g] = grouped[g] || []).push(s);
  });
  const groupNames = Object.keys(grouped).sort((a, b) => {
    if (a === UNGROUPED) return 1;
    if (b === UNGROUPED) return -1;
    return a.localeCompare(b, "ko");
  });

  const selCount = Object.values(sel).filter(Boolean).length;
  function toggleSel(id) { setSel((s) => ({ ...s, [id]: !s[id] })); setConfirmBulk(false); }
  function selectAll() {
    if (selCount === students.length) { setSel({}); }
    else { const all = {}; students.forEach((s) => (all[s.id] = true)); setSel(all); }
    setConfirmBulk(false);
  }
  function clearSel() { setSel({}); setConfirmBulk(false); }

  async function bulkDelete() {
    const ids = Object.keys(sel).filter((k) => sel[k]);
    if (!ids.length) return;
    setBusy(true);
    await supabase.from("students").delete().in("id", ids);
    setStudents(students.filter((s) => !sel[s.id]));
    clearSel();
    setBusy(false);
  }

  async function bulkGradeUp() {
    const chosen = students.filter((s) => sel[s.id]);
    if (!chosen.length) return;
    setBusy(true);
    const snap = chosen.map((s) => ({ id: s.id, grade: s.grade }));
    setStudents(students.map((s) => (sel[s.id] ? { ...s, grade: nextGrade(s.grade) } : s)));
    await Promise.all(snap.map((x) => supabase.from("students").update({ grade: nextGrade(x.grade) }).eq("id", x.id)));
    setLastBump(snap);
    clearSel();
    setBusy(false);
  }
  async function undoBump() {
    if (!lastBump) return;
    setBusy(true);
    const revert = {}; lastBump.forEach((x) => (revert[x.id] = x.grade));
    setStudents(students.map((s) => (revert[s.id] !== undefined ? { ...s, grade: revert[s.id] } : s)));
    await Promise.all(lastBump.map((x) => supabase.from("students").update({ grade: x.grade }).eq("id", x.id)));
    setLastBump(null);
    setBusy(false);
  }

  function startEdit(s) {
    setEditId(s.id);
    setF({ name: s.name || "", grade: s.grade || "초5", gender: s.gender || "남", subject: s.subject || "", parent_phone: s.parent_phone || "", group_name: s.group_name || "" });
    setPendingDel(null);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }
  function cancelEdit() { setEditId(null); setF(EMPTY); }

  async function save() {
    if (!f.name.trim() || !uid) return;
    setBusy(true);
    const payload = {
      name: f.name.trim(), grade: f.grade, gender: f.gender, subject: f.subject.trim(),
      parent_phone: f.parent_phone.trim(), group_name: f.group_name.trim() || null,
    };
    if (editId) {
      const { data } = await supabase.from("students").update(payload).eq("id", editId).select().single();
      if (data) setStudents(students.map((s) => (s.id === editId ? data : s)));
      setEditId(null);
    } else {
      const { data } = await supabase.from("students").insert({ academy_id: uid, ...payload }).select().single();
      if (data) setStudents([...students, data]);
    }
    setF(EMPTY);
    setBusy(false);
  }

  async function del(id) {
    setBusy(true);
    await supabase.from("students").delete().eq("id", id);
    setStudents(students.filter((s) => s.id !== id));
    setPendingDel(null);
    if (editId === id) cancelEdit();
    setBusy(false);
  }

  return (
    <div className="phone">
      <div className="top">
        <Link href="/dashboard" className="back">‹</Link>
        <h2>학생 관리</h2>
        <span className="spacer" />
        <span className="pill">{students.length}명</span>
      </div>
      <div className="pad">
        <div className="lead" style={{ marginBottom: 12 }}>
          학생 정보를 등록하세요. <b>학부모 전화번호</b>로 피드백이 발송됩니다.
        </div>

        {!formOpen && (
          <button className="btn ghost lg" onClick={() => setShowForm(true)}>＋ 학생 추가하기</button>
        )}
        {formOpen && (
        <div style={{ border: editId ? "1.5px solid var(--teal)" : "1.5px solid var(--line)", borderRadius: 14, padding: 12, background: editId ? "var(--teal-soft)" : "#fff" }}>
          <div style={{ fontWeight: 700, color: "var(--teal-d)", fontSize: 13, marginBottom: 6 }}>{editId ? "✏️ 학생 정보 수정 중" : "＋ 새 학생 등록"}</div>
          <label className="fl" style={{ marginTop: 0 }}>이름</label>
          <input className="tf" value={f.name} onChange={set("name")} placeholder="예: 이영어" />
          <div className="row2" style={{ marginTop: 8 }}>
            <div>
              <label className="fl">학년</label>
              <select className="tf" value={f.grade} onChange={set("grade")}>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="fl">성별</label>
              <select className="tf" value={f.gender} onChange={set("gender")}>
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </div>
            <div>
              <label className="fl">수강 과목</label>
              <input className="tf" value={f.subject} onChange={set("subject")} />
            </div>
          </div>
          <label className="fl">학부모 전화번호</label>
          <input className="tf" value={f.parent_phone} onChange={set("parent_phone")} placeholder="01012345678" inputMode="numeric" />
          <label className="fl">그룹 · 반 · 담당 선생님 <span style={{ color: "#b7c2bd" }}>(선택)</span></label>
          <input className="tf" list="grouplist" value={f.group_name} onChange={set("group_name")} placeholder="예: 월수금 A반 / 김선생님반" />
          <datalist id="grouplist">
            {existingGroups.map((g) => <option key={g} value={g} />)}
          </datalist>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn ghost" style={{ flex: 1 }} onClick={editId ? cancelEdit : () => { setShowForm(false); setF(EMPTY); }}>
              {editId ? "취소" : "접기"}
            </button>
            <button className="btn primary" style={{ flex: 2 }} onClick={save} disabled={busy || !f.name.trim()}>
              {busy ? "저장 중…" : editId ? "수정 완료" : "＋ 학생 추가"}
            </button>
          </div>
        </div>
        )}

        {/* 다중 선택: 학년 올리기 · 삭제 */}
        {students.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 10px", flexWrap: "wrap" }}>
            <button className="linkbtn" style={{ width: "auto", padding: 0, fontSize: 13 }} onClick={selectAll}>
              {selCount === students.length && students.length > 0 ? "☑ 전체 해제" : "☐ 전체 선택"}
            </button>
            <span style={{ flex: 1 }} />
            {lastBump && !confirmBulk && (
              <button className="btn ghost" style={{ width: "auto", padding: "7px 12px", fontSize: 13 }} onClick={undoBump} disabled={busy}>↩ 되돌리기</button>
            )}
            {selCount > 0 && !confirmBulk && (
              <>
                <button className="btn primary" style={{ width: "auto", padding: "7px 12px", fontSize: 13 }} onClick={bulkGradeUp} disabled={busy}>🎓 {selCount}명 학년 올리기</button>
                <button className="btn" style={{ width: "auto", padding: "7px 12px", fontSize: 13, background: "#fff", color: "#c0392b", border: "1.5px solid #eab4ae" }} onClick={() => setConfirmBulk(true)}>🗑 삭제</button>
              </>
            )}
            {selCount > 0 && confirmBulk && (
              <>
                <span style={{ fontSize: 13, color: "#c0392b", fontWeight: 700 }}>{selCount}명 삭제할까요?</span>
                <button className="btn" style={{ width: "auto", padding: "7px 12px", fontSize: 13, background: "#e5484d", color: "#fff" }} onClick={bulkDelete} disabled={busy}>삭제</button>
                <button className="btn ghost" style={{ width: "auto", padding: "7px 12px", fontSize: 13 }} onClick={() => setConfirmBulk(false)}>취소</button>
              </>
            )}
          </div>
        )}

        {/* 그룹별 목록 */}
        {groupNames.map((gName) => (
          <div key={gName} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: gName === UNGROUPED ? "#9aa6a1" : "var(--teal-d)", margin: "4px 2px 8px" }}>
              📁 {gName} <span style={{ fontWeight: 500, color: "#aab4af" }}>{grouped[gName].length}명</span>
            </div>
            {grouped[gName].map((s) => (
              <div className="stu" key={s.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <input type="checkbox" checked={!!sel[s.id]} onChange={() => toggleSel(s.id)}
                    style={{ width: 20, height: 20, accentColor: "#1F6F5C", flex: "none" }} />
                  <div className="ava">{s.name?.slice(-2, -1) || s.name?.[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div className="nm">{s.name}</div>
                    <div className="sub">{s.grade} · {s.gender || "—"} · {s.subject} · {s.parent_phone}</div>
                  </div>
                </div>
                {pendingDel === s.id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ flex: 1, fontSize: 13, color: "#c0392b", fontWeight: 700 }}>정말 삭제할까요?</span>
                    <button className="btn" style={{ width: "auto", padding: "8px 14px", background: "#e5484d", color: "#fff" }} onClick={() => del(s.id)}>삭제</button>
                    <button className="btn ghost" style={{ width: "auto", padding: "8px 14px" }} onClick={() => setPendingDel(null)}>취소</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn ghost" style={{ padding: "8px 0", fontSize: 13.5 }} onClick={() => startEdit(s)}>✏️ 수정</button>
                    <button className="btn" style={{ padding: "8px 0", fontSize: 13.5, background: "#fff", color: "#c0392b", border: "1.5px solid #eab4ae" }} onClick={() => setPendingDel(s.id)}>🗑 삭제</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="foot">
        <Link href="/dashboard" className="btn primary lg" style={{ display: "block", textAlign: "center" }}>
          완료 · 대시보드로
        </Link>
      </div>
    </div>
  );
}
