import Link from "next/link";
import Footer from "../_components/Footer";

export const metadata = { title: "취소·환불 안내 · 자물쇠 피드백" };

export default function RefundPage() {
  return (
    <div className="phone">
      <div className="top">
        <Link href="/" className="back">‹</Link>
        <h2>취소·환불 안내</h2>
      </div>
      <div className="pad legal">
        <p className="lgd">시행일: 2026년 8월 6일</p>

        <h3>1. 구독(정기결제) 해지</h3>
        <p>회원은 서비스 내 <b>구독 해지</b> 기능을 통해 언제든 해지할 수 있습니다. 해지 시 <b>다음 결제일부터 자동결제가 중단</b>되며, 그 이전까지는 서비스를 정상 이용하실 수 있습니다. 이미 결제되어 이용 중인 기간에 대한 부분 환불은 원칙적으로 제공되지 않습니다.</p>

        <h3>2. 이용권 환불</h3>
        <ul>
          <li>구매 후 <b>사용하지 않은 이용권</b>은 구매일로부터 7일 이내에 청약철회(환불)를 요청하실 수 있습니다.</li>
          <li>이미 <b>사용한 이용권</b>은 디지털 콘텐츠 제공이 완료된 것으로 보아 환불이 제한됩니다.</li>
          <li>무료로 지급된 이용권(가입 축하·이벤트 등)은 환불 대상에서 제외됩니다.</li>
        </ul>

        <h3>3. 결제 오류 시</h3>
        <p>중복 결제, 시스템 오류 등으로 인한 잘못된 결제는 확인 후 전액 환불해 드립니다.</p>

        <h3>4. 환불 방법</h3>
        <p>환불은 원결제수단으로 처리되며, 카드 결제의 경우 카드사 사정에 따라 취소 반영까지 수일이 걸릴 수 있습니다.</p>

        <h3>5. 환불 요청</h3>
        <p>아래 연락처로 요청해 주시면 신속히 안내해 드립니다.</p>
        <p>프로젝트 SS · 이메일 projectss0086@gmail.com</p>
      </div>
      <Footer />
    </div>
  );
}
