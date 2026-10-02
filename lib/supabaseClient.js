import { createClient } from '@supabase/supabase-js';

// 브라우저에서 쓰는 Supabase 연결. anon 키는 공개용이라 안전합니다.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon);

// 학원 아이디(학원명 + 연락처 뒷 4자리)를 Supabase 로그인용 이메일로 변환.
// 한글이 섞여도 항상 같은 값이 나오도록 UTF-8 바이트를 16진수로 인코딩합니다.
export function idToEmail(loginId) {
  const bytes = new TextEncoder().encode(loginId.trim());
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return `academy_${hex}@jamulsoe.app`;
}

// 학원명 + 전화번호 뒷 4자리 → 로그인 아이디
export function makeLoginId(name, phone) {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  const last4 = digits.slice(-4);
  return `${(name || '').trim()}${last4}`;
}
