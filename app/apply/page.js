"use client";

import Link from "next/link";
import BetaForm from "../_components/BetaForm";

export default function ApplyPage() {
  return (
    <div className="phone">
      <div className="top">
        <Link href="/" className="back">‹</Link>
        <h2>체험단 신청</h2>
      </div>
      <div className="pad">
        <div className="ebbanner">
          <div className="t">🎬 자물쇠 피드백 체험단 모집</div>
          <div className="s">
            유튜브에서 <b>구독 + 신청 댓글</b>을 남기고, 아래 정보를 남겨주세요. 가입 없이 신청돼요.
            선정 시 <b>무료 체험</b>, 미선정 시 <b>첫 달 50% 할인 쿠폰</b>을 드려요.
          </div>
        </div>
        <div style={{ border: "1.5px solid var(--line)", borderRadius: 16, padding: "16px 16px 18px", marginTop: 12, background: "#fff" }}>
          <BetaForm />
        </div>
      </div>
    </div>
  );
}
