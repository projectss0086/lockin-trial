"use client";

import Link from "next/link";

const BIZ = {
  service: "자물쇠 피드백",
  company: "프로젝트 SS",
  ceo: "이윤하",
  bizno: "730-91-01452",
  address: "경상남도 김해시 대청로210번길 24, 604-28호(대청동, 장유엔트로빌딩)",
  email: "projectss0086@gmail.com",
  phone: "010-4012-0086",
  mailorder: "",
};

export default function Footer() {
  const line = (label, val) => val ? (
    <span style={{ marginRight: 10, whiteSpace: "nowrap" }}><span style={{ color: "#aab4af" }}>{label}</span> {val}</span>
  ) : null;
  return (
    <div style={{ borderTop: "1px solid var(--line)", marginTop: 20, padding: "16px 18px 22px", fontSize: 11, color: "#8b9a94", lineHeight: 1.8 }}>
      <div style={{ fontWeight: 800, color: "#6f8078", marginBottom: 4 }}>{BIZ.service}</div>
      <div style={{ display: "flex", flexWrap: "wrap", rowGap: 2 }}>
        {line("상호", BIZ.company)}
        {line("대표", BIZ.ceo)}
        {line("사업자등록번호", BIZ.bizno)}
        {line("통신판매업신고", BIZ.mailorder)}
        {line("전화", BIZ.phone)}
        {line("이메일", BIZ.email)}
      </div>
      <div style={{ marginTop: 4 }}>{line("주소", BIZ.address)}</div>
      <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Link href="/terms" style={{ color: "#6f8078", textDecoration: "none", fontWeight: 700 }}>이용약관</Link>
        <Link href="/privacy" style={{ color: "#6f8078", textDecoration: "none", fontWeight: 700 }}>개인정보처리방침</Link>
        <Link href="/refund" style={{ color: "#6f8078", textDecoration: "none", fontWeight: 700 }}>취소·환불 안내</Link>
      </div>
      <div style={{ marginTop: 8, color: "#aab4af" }}>© 2026 {BIZ.company}. All rights reserved.</div>
    </div>
  );
}
