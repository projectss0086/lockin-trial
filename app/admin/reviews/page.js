"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminReviewsPage() {
  const router = useRouter();
  const [state, setState] = useState("loading");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const res = await fetch("/api/admin/reviews", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.status === 403) { setState("denied"); return; }
      const data = await res.json();
      setRows(data.rows || []);
      setState("ok");
    })();
  }, [router]);

  function fmt(s) { return s ? String(s).slice(0, 16).replace("T", " ") : ""; }

  if (state === "loading") return <div className="phone"><div className="spin">불러오는 중…</div></div>;
  if (state === "denied") return (
    <div className="phone">
      <div className="top"><button className="back" onClick={() => router.push("/dashboard")}>‹</button><h2>후기 관리</h2></div>
      <div className="pad"><div className="stu" style={{ justifyContent: "center", color: "var(--muted)" }}>이 페이지는 운영자만 볼 수 있어요.</div></div>
    </div>
  );

  const trial = rows.filter((r) => r.kind === "trial").length;
  const parent = rows.filter((r) => r.kind === "parent").length;

  return (
    <div className="phone">
      <div className="top"><button className="back" onClick={() => router.push("/dashboard")}>‹</button><h2>후기 관리</h2></div>
      <div className="pad">
        <div className="h1">받은 후기 {rows.length}건</div>
        <div className="lead" style={{ marginBottom: 14 }}>체험 후기 {trial}건 · 학부모 답장 인증 {parent}건</div>
        {rows.length === 0 ? (
          <div className="stu" style={{ justifyContent: "center", color: "var(--muted)" }}>아직 받은 후기가 없어요.</div>
        ) : rows.map((r) => (
          <div className="stu" key={r.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 8px", color: r.kind === "parent" ? "#8a4b2b" : "var(--teal-d)", background: r.kind === "parent" ? "#FBEEE6" : "var(--teal-soft)" }}>
                {r.kind === "parent" ? "학부모 인증 30%" : "체험 후기 20%"}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{r.author_name || "이름없음"}</span>
              <span style={{ fontSize: 11.5, color: "#9aa6a1", marginLeft: "auto" }}>{fmt(r.created_at)}</span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{r.content}</div>
            {r.image_url && (
              <a href={r.image_url} target="_blank" rel="noreferrer">
                <img src={r.image_url} alt="첨부" style={{ width: "100%", borderRadius: 10, border: "1px solid var(--line)" }} />
              </a>
            )}
            <div style={{ fontSize: 12.5, color: "#5a6763" }}>코드 <b style={{ userSelect: "all" }}>{r.code}</b> · 평생 {r.discount}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
