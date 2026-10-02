"use client";

import Link from "next/link";
import Footer from "./_components/Footer";

export default function Home() {
  return (
    <div className="phone">
      <div className="pad">
        {/* 서비스 소개 (히어로) */}
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div className="lock" style={{ fontSize: 40 }}>🔒</div>
          <div className="h1" style={{ textAlign: "center" }}>자물쇠 피드백</div>
          <div className="lead" style={{ textAlign: "center" }}>
            질문에 답만 하면,<br />학부모 피드백이 완성됩니다
          </div>
        </div>

        <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7, textAlign: "center", margin: "14px 4px 0" }}>
          학원 원장님이 간단한 질문에 답하면, AI가 학부모님께 보낼 <b>수려한 피드백 문자</b>를 완성해 주는 <b>구독형 서비스</b>예요.
        </div>

        {/* 상품·요금 */}
        <div style={{ background: "#fff", border: "1.5px solid var(--line)", borderRadius: 14, padding: "16px 16px 18px", marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--teal-d)", marginBottom: 8 }}>💳 이용 요금</div>
          <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.9 }}>
            브론즈 <b>49,000원</b> <span style={{ color: "#9aa6a1", fontSize: 12.5 }}>(학생 50명 이하 · 월 50회)</span><br />
            실버 <b>89,000원</b> <span style={{ color: "#9aa6a1", fontSize: 12.5 }}>(학생 100명 이하 · 월 100회)</span><br />
            골드 <b>149,000원</b> <span style={{ color: "#9aa6a1", fontSize: 12.5 }}>(학생 200명 이하 · 월 200회)</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>월 구독 · 부가세 포함 · 추가 이용권 회당 1,300원</div>
          <Link href="/pricing" className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}>요금제 자세히 보기 · 결제하기 →</Link>
        </div>

        {/* 결제 심사용 테스트 계정 — 로그인 바로 위 (심사 후 삭제 예정) */}
        <div style={{ marginTop: 20, border: "1.5px dashed #c3cec9", borderRadius: 12, padding: "13px 15px", background: "#F7F9F8" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#5a6763", marginBottom: 6 }}>🔎 결제 심사용 테스트 계정</div>
          <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.8 }}>
            아이디 <b>테스트학원0000</b><br />
            비밀번호 <b>123456</b>
          </div>
          <div style={{ fontSize: 11.5, color: "#9aa6a1", marginTop: 6 }}>
            아래 ‘로그인’으로 접속 → 요금제 → 결제하기에서 결제창을 확인하실 수 있어요. · <b>심사 완료 후 삭제 예정</b>입니다.
          </div>
        </div>

        {/* 로그인 / 학원 등록 */}
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <Link href="/login" className="btn primary lg" style={{ flex: 2, textAlign: "center", textDecoration: "none" }}>로그인</Link>
          <Link href="/signup" className="btn lg" style={{ flex: 1, textAlign: "center", background: "none", color: "var(--teal-d)", border: "1.5px solid var(--teal)", textDecoration: "none" }}>학원 등록</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
