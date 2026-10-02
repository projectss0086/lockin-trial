"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Footer from "../_components/Footer";

const GSEQ = ["초1","초2","초3","초4","초5","초6","중1","중2","중3","고1","고2","고3","졸업"];
const UNGROUPED = "미분류";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [academy, setAcademy] = useState(null);
  const [students, setStudents] = useState([]);
  const [sortMode, setSortMode] = useState("reg");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: aca } = await supabase.from("academies").select("*").eq("id", session.user.id).single();
      setAcademy(aca);
      const { data: stu } = await supabase.from("students").select("*").order("created_at", { ascending: true });
      setStudents(stu || []);
      setLoading(false);
      try {
        const res = await fetch("/api/admin?type=check", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) setIsAdmin(true);
      } catch (e) {}
    })();
  }, [router]);

  async function logout() { await supabase.auth.signOut(); router.replace("/login"); }

  function sortList(arr) {
    const a = arr.slice();
    if (sortMode === "name_asc") a.sort((x, y) => (x.name || "").localeCompare(y.name || "", "ko"));
    else if (sortMode === "name_desc") a.sort((x, y) => (y.name || "").localeCompare(x.name || "", "ko"));
    else if (sortMode === "grade_asc") a.sort((x, y) => GSEQ.indexOf(x.grade) - GSEQ.indexOf(y.grade));
    else if (sortMode === "grade_desc") a.sort((x, y) => GSEQ.indexOf(y.grade) - GSEQ.indexOf(x.grade));
    else a.sort((x, y) => new Date(x.created_at) - new Date(y.created_at));
    return a;
  }

  const grouped = {};
  students.forEach((s) => { const g = s.group_name || UNGROUPED; (grouped[g] = grouped[g] || []).push(s); });
  const groupNames = Object.keys(grouped).sort((a, b) => {
    if (a === UNGROUPED) return 1; if (b === UNGROUPED) return -1; return a.localeCompare(b, "ko");
  });
  const hasGroups = !(groupNames.length === 1 && groupNames[0] === UNGROUPED);

  const selStyle = { border: "1.5px solid var(--line)", borderRadius: 10, padding: "8px 11px", fontSize: 13, fontFamily: "inherit", background: "#fff", color: "var(--ink)" };

  function StudentCard({ s }) {
    return (
      <div className="stu" style={{ cursor: "pointer" }} onClick={() => router.push(`/feedback/${s.id}`)}>
        <div className="ava">{s.name?.slice(-2, -1) || s.name?.[0]}</div>
        <div style={{ flex: 1 }}>
          <div className="nm">{s.name}</div>
          <div className="sub">{s.grade} · {s.subject} · {s.parent_phone}</div>
        </div>
        <div style={{ color: "#c3cec9", fontSize: 20 }}>›</div>
      </div>
    );
  }

  if (loading) return <div className="phone"><div className="spin">불러오는 중…</div></div>;

  return (
    <div className="phone">
      <div className="top">
        <span className="brand">🔒 자물쇠 피드백</span>
        <span className="spacer" />
        <button className="linkbtn" style={{ width: "auto", color: "#8b9a94", marginRight: 12 }} onClick={() => router.push("/support")}>고객센터</button>
        <button className="linkbtn" style={{ width: "auto", color: "#8b9a94" }} onClick={logout}>로그아웃</button>
      </div>
      <div className="pad">
        <div className="h1">{academy?.name || "내 학원"}</div>
        <div className="lead" style={{ marginBottom: 14 }}>
          {academy?.owner_name ? `${academy.owner_name} 원장님, ` : ""}학생을 눌러 이번 달 피드백을 시작하세요.
        </div>

        <div className="credbar">
          <span style={{ fontSize: 18 }}>🎟️</span>
          <span className="cb-n">
            남은 이용 횟수 <b>{(academy?.sub_credits ?? 0) + (academy?.credits ?? 0)}</b>회
            {academy?.plan && (
              <span style={{ display: "block", fontSize: 11, color: "#8b9a94", fontWeight: 500, marginTop: 1 }}>
                구독 {academy?.sub_credits ?? 0}회 · 추가 {academy?.credits ?? 0}회
              </span>
            )}
          </span>
          <button className="cb-btn" onClick={() => router.push("/pricing")}>🛒 이용권 구매 · 구독</button>
        </div>

        {isAdmin && (
          <button className="btn" style={{ background: "#2B2F2E", color: "#fff", marginBottom: 12, fontSize: 14 }} onClick={() => router.push("/admin")}>
            🔧 운영자 콘솔 (표현 관리)
          </button>
        )}

        {students.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 700 }}>정렬</span>
            <select style={selStyle} value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
              <option value="reg">등록순</option>
              <option value="name_asc">이름 오름차순 (ㄱ→ㅎ)</option>
              <option value="name_desc">이름 내림차순 (ㅎ→ㄱ)</option>
              <option value="grade_asc">학년 오름차순 (초1→고3)</option>
              <option value="grade_desc">학년 내림차순 (고3→초1)</option>
            </select>
          </div>
        )}

        {students.length === 0 ? (
          <div className="stu" style={{ justifyContent: "center", color: "var(--muted)" }}>
            아직 등록된 학생이 없어요. 아래에서 등록해보세요.
          </div>
        ) : hasGroups ? (
          groupNames.map((g) => (
            <div key={g} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: g === UNGROUPED ? "#9aa6a1" : "var(--teal-d)", margin: "4px 2px 8px" }}>
                📁 {g} <span style={{ fontWeight: 500, color: "#aab4af" }}>{grouped[g].length}명</span>
              </div>
              {sortList(grouped[g]).map((s) => <StudentCard key={s.id} s={s} />)}
            </div>
          ))
        ) : (
          sortList(students).map((s) => <StudentCard key={s.id} s={s} />)
        )}
      </div>
      <div className="foot">
        <button className="btn primary lg" onClick={() => router.push("/students")}>＋ 학생 관리 · 등록</button>
      </div>
      <Footer />
    </div>
  );
}
