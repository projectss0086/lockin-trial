"use client";
import { useRouter } from "next/navigation";
import Footer from "../_components/Footer";

export default function CheckoutPage() {
  const router = useRouter();
  return (
    <div className="phone">
      <div className="top">
        <button className="back" onClick={() => router.push("/dashboard")}>‹</button>
        <h2>무료 체험 중</h2>
      </div>
      <div className="pad">
        <div style={{ border: "1.5px solid var(--teal)", borderRadius: 16, padding: "20px 16px", marginTop: 14, background: "var(--teal-soft)", textAlign: "center" }}>
          <div style={{ fontSize: 30 }}>🎁</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--teal-d)", marginTop: 8 }}>지금은 결제가 없어요</div>
          <div style={{ fontSize: 13.5, color: "#3f4a46", lineHeight: 1.7, marginTop: 10 }}>
            창립 멤버 원장님을 위한 <b>무료 체험 기간</b>이에요.
            넉넉한 무료 이용권으로 마음껏 써보세요. 결제는 정식 오픈 후에 열려요.
          </div>
        </div>

        <button className="btn primary lg" style={{ marginTop: 18 }} onClick={() => router.push("/review")}>
          ✍️ 후기 남기고 평생 할인코드 받기
        </button>
        <button className="linkbtn" style={{ marginTop: 10 }} onClick={() => router.push("/dashboard")}>
          대시보드로 돌아가기
        </button>
      </div>
      <Footer />
    </div>
  );
}
