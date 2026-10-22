"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Footer from "../_components/Footer";

const GSEQ = ["초1","초2","초3","초4","초5","초6","중1","중2","중3","고1","고2","고3","졸업"];
const UNGROUPED = "미분류";

// 기능 설명 팝업에 담을 3가지
const INTRO = [
  { n: "1", k: "인지", t: "수업이 잘 되고 있다고 느끼게", d: "‘우리 아이가 잘 챙겨지고 있구나’ 하고 학부모가 안심하게 해요." },
  { n: "2", k: "감정", t: "학원을 더 좋아하게", d: "학원을 향한 따뜻한 신뢰의 감정을 쌓아요." },
  { n: "3", k: "관계", t: "학부모와 더 가깝게", d: "꾸준한 소통으로 학부모와의 관계를 단단하게 만들어요." },
];

function currentYM() {
  const d = new Date(Date.now() + 9 * 3600 * 1000); // KST
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}
function currentDay() {
  const d = new Date(Date.now() + 9 * 3600 * 1000); // KST
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [academy, setAcademy] = useState(null);
  const [students, setStudents] = useState([]);
  const [sortMode, setSortMode] = useState("reg");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showIntro, setShowIntro] = useState(false);        // 기능 설명 팝업 (하루 1회)
  const [showEnrollPopup, setShowEnrollPopup] = useState(false); // 월 1회 정원 입력 알림

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const uid = session.user.id;
      const { data: aca } = await supabase.from("academies").select("*").eq("id", uid).single();
      setAcademy(aca);
      const { data: stu } = await supabase.from("students").select("*").order("created_at", { ascending: true });
      setStudents(stu || []);
      setLoading(false);

      // 기능 설명 팝업: 하루 1회 (그날 처음 대시보드에 들어왔을 때) 노출
      const today = currentDay();
      let introDay = "";
      try { introDay = window.localStorage.getItem(`intro_day_${uid}`) || ""; } catch (e) {}
      const willShowIntro = introDay !== today;
      if (willShowIntro) {
        setShowIntro(true);
        try { window.localStorage.setItem(`intro_day_${uid}`, today); } catch (e) {} // 오늘은 더 안 뜨게 바로 표시
      }

      // 이번 달 정원 기록이 없고, 이번 달에 '나중에'로 넘긴 적도 없으면 알림 팝업
      // 단, 기능 설명 팝업이 뜨는 날엔 겹치지 않게 양보
      try {
        const ym = currentYM();
        const { data: log } = await supabase.from("enrollment_logs").select("id").eq("academy_id", uid).eq("year_month", ym).maybeSingle();
        let dismissed = false;
        try { dismissed = window.localStorage.getItem(`enroll_remind_${uid}_${ym}`) === "1"; } catch (e) {}
        if (!log && !dismissed && !willShowIntro) setShowEnrollPopup(true);
      } catch (e) {}

      try {
        const res = await fetch("/api/admin?type=check", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) setIsAdmin(true);
      } catch (e) {}
    })();
  }, [router]);

  // 기능 설명 팝업 닫기 = 오늘 하루는 다시 안 뜨게 표시 (내일 다시 노출)
  function closeIntro() {
    try {
      if (academy?.id) window.localStorage.setItem(`intro_day_${academy.id}`, currentDay());
    } catch (e) {}
    setShowIntro(false);
  }

  // '나중에' = 그냥 닫기 (다음 로그인 때 또 뜸)
  function closePopup() { setShowEnrollPopup(false); }
  // '이미 했어요' = 이번 달엔 다시 안 뜨게 표시
  function markRecorded() {
    try {
      const ym = currentYM();
      if (academy?.id) window.localStorage.setItem(`enroll_remind_${academy.id}_${ym}`, "1");
    } catch (e) {}
    setShowEnrollPopup(false);
  }

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
      {showIntro && (
        <div onClick={closeIntro} style={{ position: "fixed", inset: 0, background: "rgba(20,30,28,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: "26px 22px", maxWidth: 340, width: "100%", boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 38 }}>🔒</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginTop: 8 }}>자물쇠 피드백이 하는 일</div>
              <div style={{ fontSize: 13, color: "#5a6763", lineHeight: 1.6, marginTop: 6, wordBreak: "keep-all" }}>
                학부모님께 보내는 이 한 통이, 세 가지를 만들어 학생이 학원을 떠나지 않게 지켜줘요.
              </div>
            </div>

            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {INTRO.map((it) => (
                <div key={it.n} style={{ display: "flex", gap: 11, alignItems: "flex-start", border: "1.5px solid var(--line)", borderRadius: 13, padding: "12px 13px" }}>
                  <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "var(--teal-soft)", color: "var(--teal-d)", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{it.n}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>
                      <span style={{ color: "var(--teal-d)" }}>{it.k}</span> · {it.t}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#5a6763", lineHeight: 1.55, marginTop: 3, wordBreak: "keep-all" }}>{it.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn primary lg" style={{ marginTop: 18 }} onClick={closeIntro}>오늘 하루 보지 않기</button>
          </div>
        </div>
      )}
      {showEnrollPopup && (
        <div onClick={closePopup} style={{ position: "fixed", inset: 0, background: "rgba(20,30,28,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: "26px 22px", maxWidth: 320, width: "100%", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}>
            <div style={{ fontSize: 40 }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginTop: 10 }}>이번 달 정원, 기록하셨나요?</div>
            <div style={{ fontSize: 13.5, color: "#5a6763", lineHeight: 1.7, marginTop: 8, wordBreak: "keep-all" }}>
              매달 재원·신입·퇴원을 남겨두시면, 분기마다 제가 리포트로 정리해 돌려드려요. 30초면 돼요.
            </div>
            <button className="btn primary lg" style={{ marginTop: 18 }} onClick={() => router.push("/enrollment")}>지금 입력하기 →</button>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={markRecorded}>이미 했어요</button>
              <button className="btn ghost" style={{ flex: 1 }} onClick={closePopup}>나중에</button>
            </div>
          </div>
        </div>
      )}
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

        <div style={{ border: "1.5px solid var(--teal)", borderRadius: 14, padding: "13px 15px", marginBottom: 14, background: "var(--teal-soft)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--teal-d)" }}>🎉 vip 원장님 무료 체험 중</div>
          <div style={{ fontSize: 12.5, color: "#3f4a46", lineHeight: 1.65, marginTop: 6 }}>
            결제 없이 무료 이용권으로 자유롭게 써보세요. 써보신 후기를 남기면 정식 오픈 때 쓸 수 있는 <b>평생 할인코드</b>를 드려요.
          </div>
          <button className="pbtn" style={{ marginTop: 11 }} onClick={() => router.push("/review")}>✍️ 후기 남기고 할인코드 받기 →</button>
        </div>

        <div className="credbar">
          <span style={{ fontSize: 18 }}>🎟️</span>
          <span className="cb-n">
            남은 이용 횟수 <b>{(academy?.sub_credits ?? 0) + (academy?.credits ?? 0)}</b>회
          </span>
          <button className="cb-btn" onClick={() => router.push("/pricing")}>체험 혜택 보기</button>
        </div>

        <button className="btn" style={{ background: "#fff", color: "var(--teal-d)", border: "1.5px solid var(--teal)", marginBottom: 12, fontSize: 14 }} onClick={() => router.push("/enrollment")}>
          📊 이번 달 정원 기록 · 퇴원 분석
        </button>

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
