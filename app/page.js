"use client";

import Link from "next/link";
import Footer from "./_components/Footer";

export default function Home() {
  return (
    <div className="phone">
      <div className="pad">
        {/* 서비스 소개 (히어로) */}
          <div style={{ fontSize: 13.5, color: "#3f4a46", lineHeight: 1.7, marginTop: 8, wordBreak: "keep-all" }}>
          <div className="lock" style={{ fontSize: 40 }}>🔒</div>
          <div className="h1" style={{ textAlign: "center" }}>자물쇠 피드백</div>
          <div className="lead" style={{ textAlign: "center" }}>
            질문에 답만 하면,<br />학부모 피드백이 완성됩니다
          </div>
        </div>

        <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7, textAlign: "center", margin: "14px 4px 0" }}>
          학원 원장님이 간단한 질문에 답하면, AI가 학부모님께 보낼 <b>수려한 피드백 문자</b>를 완성해 줘요.
        </div>

        {/* vip 원장님 무료 체험 안내 */}
        <div style={{ background: "var(--teal-soft)", border: "1.5px solid var(--teal)", borderRadius: 16, padding: "18px 16px", marginTop: 18, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--teal-d)" }}>🎉 VIP 원장님 무료 체험</div>
          <div style={{ fontSize: 13.5, color: "#3f4a46", lineHeight: 1.7, marginTop: 8 }}>
            초대받으신 원장님, 환영합니다.<br />
            지금 가입하면 <b>무료 이용권 30회</b>를 드려요. 
              결제 없이 마음껏 써보세요.
          </div>
          <div style={{ fontSize: 12.5, color: "#5a6763", lineHeight: 1.7, marginTop: 10, wordBreak: "keep-all" }}>
            써보신 후기를 남기면, 정식 오픈 때 쓸 수 있는 
              <b>평생 할인코드</b>까지 드려요.
          </div>
          <Link href="/signup" className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 14 }}>학원 등록하고 무료로 시작하기 →</Link>
        </div>

        {/* 로그인 / 학원 등록 */}
        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          <Link href="/login" className="btn primary lg" style={{ flex: 2, textAlign: "center", textDecoration: "none" }}>로그인</Link>
          <Link href="/signup" className="btn lg" style={{ flex: 1, textAlign: "center", background: "none", color: "var(--teal-d)", border: "1.5px solid var(--teal)", textDecoration: "none" }}>학원 등록</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
