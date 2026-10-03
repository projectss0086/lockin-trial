"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Footer from "../_components/Footer";

export default function PricingPage() {
  const router = useRouter();
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: a } = await supabase.from("academies").select("*").eq("id", session.user.id).single();
      setCredits((a?.sub_credits ?? 0) + (a?.credits ?? 0));
    })();
  }, []);

  return (
    <div className="phone">
      <div className="top">
        <Link href="/dashboard" className="back">‹</Link>
        <h2>창립 멤버 무료 체험</h2>
      </div>
      <div className="pad">
        {credits !== null && (
          <div className="credbar">
            <span style={{ fontSize: 18 }}>🎟️</span>
            <span className="cb-n">남은 이용 횟수 <b>{credits}</b>회</span>
          </div>
        )}

        <div style={{ border: "1.5px solid var(--teal)", borderRadius: 16, padding: "18px 16px", marginTop: 14, background: "var(--teal-soft)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--teal-d)" }}>🎉 지금은 무료 체험 기간이에요</div>
          <div style={{ fontSize: 13.5, color: "#3f4a46", lineHeight: 1.7, marginTop: 8 }}>
            창립 멤버 원장님을 위해 <b>결제 없이</b> 자물쇠 피드백을 열어드렸어요.
            넉넉하게 <b>무료 30회</b>를 드렸으니, 마음껏 써보세요.
          </div>
        </div>

        <div style={{ border: "1.5px solid var(--line)", borderRadius: 16, padding: "18px 16px", marginTop: 12, background: "#fff" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#20302B" }}>✍️ 후기를 남기면, 평생 할인 코드</div>
          <div style={{ fontSize: 13.5, color: "#3f4a46", lineHeight: 1.7, marginTop: 8 }}>
            써보신 소감을 남겨주시면, 정식 오픈 때 쓸 수 있는 <b>평생 할인 코드</b>를 드려요.
            <br />· 체험 후기 → <b>20% 코드</b>
            <br />· 학부모님께 받은 답장 인증 → <b>30% 코드</b>
          </div>
          <button className="pbtn" style={{ marginTop: 14 }} onClick={() => router.push("/review")}>
            후기 남기고 할인코드 받기 →
          </button>
        </div>

        <div className="nudge" style={{ marginTop: 14 }}>
          💡 체험 기간에는 결제가 없어요. 부담 없이 충분히 테스트해 보세요.
        </div>

        <div style={{ fontSize: 11.5, color: "#9aa6a1", marginTop: 14, textAlign: "center", lineHeight: 1.6 }}>
          철옹성 프로젝트 · 자물쇠 피드백 창립 멤버 체험
        </div>
      </div>
      <Footer />
    </div>
  );
}
