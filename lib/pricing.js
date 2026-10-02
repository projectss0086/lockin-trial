// 요금·이용권 단가 — 화면(pricing/checkout)과 서버(api/pay)가 같은 값을 쓰도록 한 곳에 모음.
// 서버는 절대 클라이언트가 보낸 금액을 믿지 않고, 여기 값으로 다시 계산합니다.

export const PLANS = [
  { key: "bronze", nm: "브론즈", cap: "학생 50명 이하", m: 49000, y: 490000, list: 61000, per: "학생 1명당 최대 980원", allowance: 50 },
  { key: "silver", nm: "실버", cap: "학생 100명 이하", m: 89000, y: 890000, list: 111000, per: "학생 1명당 최대 890원", allowance: 100, best: true },
  { key: "gold", nm: "골드", cap: "학생 200명 이하", m: 149000, y: 1490000, list: 186000, per: "학생 1명당 최대 745원", allowance: 200 },
];

export const planByKey = (k) => PLANS.find((p) => p.key === k) || null;

// 이용권 1회 단가(원) — 표시용
export const CREDIT_UNIT = 1300;
// (구) 임의 충전 최대 개수 — 이용권 패키지 방식으로 전환하며 미사용. 호환 위해 남겨둠.
export const CREDIT_MAX = 30;

// 단건 '추가 이용권' 패키지 — 정해진 묶음만 판매(임의 충전 불가)
export const PACKS = [
  { n: 10, price: 13000 },
  { n: 20, price: 26000 },
  { n: 30, price: 39000 },
];
export const packByQty = (q) => PACKS.find((p) => p.n === Number(q)) || null;

export const won = (n) => (n || 0).toLocaleString("ko-KR") + "원";

// 주문 금액을 서버·클라 동일 규칙으로 계산
export function orderAmount({ kind, plan, cycle, qty }) {
  if (kind === "credit") {
    // 정해진 패키지(10/20/30회)만 허용 — 임의 금액 결제 차단
    const pack = packByQty(qty) || PACKS[0];
    return { amount: pack.price, qty: pack.n };
  }
  const p = planByKey(plan);
  if (!p) return { amount: 0 };
  return { amount: cycle === "y" ? p.y : p.m, plan: p.key, cycle: cycle === "y" ? "y" : "m" };
}
