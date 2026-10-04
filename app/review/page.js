"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Footer from "../_components/Footer";

function optStyle(on) {
  return {
    textAlign: "left", padding: "13px 15px", borderRadius: 12, cursor: "pointer",
    fontFamily: "inherit", fontSize: 14,
    border: on ? "2px solid var(--teal)" : "1.5px solid var(--line)",
    background: on ? "var(--teal-soft)" : "#fff", color: "var(--ink)",
  };
}

export default function ReviewPage() {
  const router = useRouter();
  const [kind, setKind] = useState("trial");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
    })();
  }, [router]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(done.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    } catch (e) {}
  }

  async function submit() {
    setErr("");
    if (!content.trim()) { setErr("후기 내용을 적어주세요."); return; }
    if (kind === "parent" && !file) { setErr("학부모님 답장 캡처를 첨부해주세요."); return; }
    if (!consent) { setErr("홍보 활용 동의가 필요해요."); return; }
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      let imageUrl = "";
      if (file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("reviews").upload(path, file);
        if (upErr) throw new Error("사진 업로드 실패: " + upErr.message);
        const { data: pub } = supabase.storage.from("reviews").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ kind, content: content.trim(), imageUrl, consent }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "제출 실패"); setBusy(false); return; }
      setDone({ code: data.code, discount: data.discount });
      setBusy(false);
    } catch (e) {
      setErr(e.message || "문제가 생겼어요.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="phone">
        <div className="top"><button className="back" onClick={() => router.push("/dashboard")}>‹</button><h2>발급 완료</h2></div>
        <div className="pad">
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FFF4E5", border: "1.5px solid #F0C089", borderRadius: 12, padding: "12px 14px", marginTop: 14 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ fontSize: 13, color: "#8A5A1A", lineHeight: 1.6, fontWeight: 700 }}>
              이 코드는 지금 화면에서만 보여요.<br />
              <span style={{ fontWeight: 800 }}>지금 꼭 캡처해서 보관</span>해주세요!
            </div>
          </div>

          <div style={{ textAlign: "center", border: "2px solid var(--teal)", background: "var(--teal-soft)", borderRadius: 16, padding: "24px 16px", marginTop: 14 }}>
            <div style={{ fontSize: 30 }}>🎟️</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--teal-d)", marginTop: 8 }}>평생 {done.discount}% 할인 코드</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2, color: "#20302B", margin: "14px 0", userSelect: "all" }}>{done.code}</div>
            <button
              className="btn"
              style={{ background: "#fff", color: "var(--teal-d)", border: "1.5px solid var(--teal)", width: "auto", padding: "10px 20px", fontSize: 14 }}
              onClick={copyCode}
            >
              {codeCopied ? "✓ 복사됐어요" : "📋 코드 복사하기"}
            </button>
          </div>

          <div style={{ fontSize: 12.5, color: "#3f4a46", lineHeight: 1.7, marginTop: 14, textAlign: "center" }}>
            이 코드는 <b>정식 오픈</b> 때 결제 화면에 입력하면 <b>평생 {done.discount}%</b> 할인이 적용돼요.
          </div>

          <button className="btn primary lg" style={{ marginTop: 18 }} onClick={() => router.push("/dashboard")}>캡처했어요 · 대시보드로 →</button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="top"><button className="back" onClick={() => router.push("/dashboard")}>‹</button><h2>후기 남기기</h2></div>
      <div className="pad">
        <div className="h1">후기 남기고 할인코드 받기</div>
        <div className="lead" style={{ marginBottom: 14 }}>
          써보신 소감을 남겨주시면, 정식 오픈 때 쓸 수 있는 평생 할인코드를 드려요.
        </div>

        <div className="fl" style={{ marginTop: 0 }}>후기 종류</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <button type="button" onClick={() => setKind("trial")} style={optStyle(kind === "trial")}>
            <b>체험 후기</b> · 평생 20% 할인
            <div style={{ fontSize: 12, color: "#5a6763", fontWeight: 500, marginTop: 2 }}>자물쇠 피드백을 써본 소감</div>
          </button>
          <button type="button" onClick={() => setKind("parent")} style={optStyle(kind === "parent")}>
            <b>학부모 답장 인증</b> · 평생 30% 할인
            <div style={{ fontSize: 12, color: "#5a6763", fontWeight: 500, marginTop: 2 }}>학부모님께 받은 답장 캡처 첨부</div>
          </button>
        </div>

        <label className="fl">후기 내용</label>
        <textarea className="tf" style={{ minHeight: 120, resize: "vertical" }} value={content} onChange={(e) => setContent(e.target.value)}
          placeholder={kind === "parent" ? "학부모님 반응이 어땠는지 적어주세요." : "써보니 어떠셨나요? 솔직한 후기를 남겨주세요."} />

        <label className="fl">사진 {kind === "parent" ? "(필수 · 답장 캡처)" : "(선택 · 화면 캡처)"}</label>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 13, marginTop: 6 }} />
        <div style={{ fontSize: 11.5, color: "#9aa6a1", marginTop: 6 }}>
          개인정보(학생·학부모 이름, 전화번호 등)는 꼭 가리고 올려주세요.
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16, fontSize: 12.5, color: "#3f4a46", lineHeight: 1.6 }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
          <span>후기·이미지를 자물쇠 피드백 홍보에 활용하는 것에 동의합니다. (개인정보는 가린 상태로 제출)</span>
        </label>

        <div className="err" style={{ marginTop: 10 }}>{err}</div>
      </div>
      <div className="foot">
        <button className="btn primary lg" disabled={busy} onClick={submit}>
          {busy ? "제출 중…" : "후기 제출하고 코드 받기 →"}
        </button>
      </div>
      <Footer />
    </div>
  );
}
