"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, idToEmail } from "@/lib/supabaseClient";
import Footer from "../_components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [payNext, setPayNext] = useState("");

  useEffect(() => {
    try {
      const n = new URLSearchParams(window.location.search).get("next");
      if (n) setPayNext(n);
    } catch (e) {}
  }, []);

  async function handleLogin() {
    setErr("");
    if (!loginId.trim() || !pw) {
      setErr("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: idToEmail(loginId),
      password: pw,
    });
    setBusy(false);
    if (error) {
      setErr("아이디 또는 비밀번호가 올바르지 않아요.");
      return;
    }
    router.push(payNext || "/dashboard");
  }

  return (
    <div className="phone">
      <div className="pad center">
        <div className="lock">🔒</div>
        <div className="h1" style={{ textAlign: "center" }}>자물쇠 피드백</div>
        <div className="lead" style={{ textAlign: "center" }}>
          질문에 답만 하면,<br />학부모 피드백이 완성됩니다
        </div>

        <div style={{ width: "100%", border: "1.5px solid var(--teal)", background: "var(--teal-soft)", borderRadius: 12, padding: "13px 15px", marginTop: 24, fontSize: 13, color: "var(--teal-d)", fontWeight: 700, lineHeight: 1.6, textAlign: "center" }}>
          🎉 vip 원장님 무료 체험 중<br />
          <span style={{ fontWeight: 500, color: "#5a6763" }}>아래로 로그인하거나, 처음이시면 ‘학원 등록’을 해주세요.</span>
        </div>
      </div>
      <div className="foot">
        <label className="fl">학원 아이디</label>
        <input
          className="tf"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          placeholder="예: 서울국어학원5678"
        />
        <label className="fl">비밀번호</label>
        <input
          className="tf"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="비밀번호"
        />
        <div className="err">{err}</div>
        <button className="btn primary lg" onClick={handleLogin} disabled={busy}>
          {busy ? "확인 중…" : "로그인"}
        </button>
        <Link href="/signup" className="linkbtn" style={{ display: "block", textAlign: "center", marginTop: 8 }}>
          처음이신가요? 학원 등록하기
        </Link>
      </div>
      <Footer />
    </div>
  );
}
