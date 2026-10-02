// 토스페이먼츠 연동 설정 — 키가 오면 여기 값만 채워지면 결제가 살아납니다.
// 환경변수(Vercel):
//   NEXT_PUBLIC_TOSS_CLIENT_KEY  (공개용 클라이언트 키, 브라우저에서 결제창 여는 데 사용)
//   TOSS_SECRET_KEY              (비밀 키, 서버에서 결제 승인·정기결제에 사용 — 절대 노출 금지)

export function tossReady() {
  return !!(process.env.TOSS_SECRET_KEY && process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
}

export function tossSecret() {
  return process.env.TOSS_SECRET_KEY || "";
}

// 토스 REST API 인증 헤더 (Basic base64(secretKey + ":"))
export function tossAuthHeader() {
  const secret = tossSecret();
  const b64 = Buffer.from(secret + ":").toString("base64");
  return "Basic " + b64;
}

export const TOSS_API = "https://api.tosspayments.com";
