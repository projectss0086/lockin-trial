import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { SYSTEM_PROMPT, buildUserMessage, wrapMessage, currentSeason } from "@/lib/enginePrompt";

export const runtime = "nodejs";

const PLAN_ALLOWANCE = { bronze: 50, silver: 100, gold: 200 };
function currentPeriod() {
  const d = new Date(Date.now() + 9 * 3600 * 1000); // KST
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

async function fetchRefs(input, supa) {
  if (!supa) return "";
  try {
    const base = ["학습-경험", "학습-반응", "학습-의견"];
    const extra = input.fork === "growth" ? ["성장-경험", "성장-반응", "성장-의견"] : ["에피소드"];
    const out = [];
    for (const sec of [...base, ...extra]) {
      const { count } = await supa.from("expressions").select("id", { count: "exact", head: true }).eq("section", sec);
      if (!count) continue;
      const take = sec.startsWith("성장") || sec === "에피소드" ? 4 : 3;
      const offset = Math.max(0, Math.floor(Math.random() * Math.max(1, count - take)));
      const { data } = await supa.from("expressions").select("expression").eq("section", sec).range(offset, offset + take - 1);
      (data || []).forEach((r) => r.expression && out.push(`- [${sec}] ${r.expression}`));
    }
    if (!out.length) return "";
    return `\n\n## 원장님 실제 표현 (참고용)\n아래는 이 원장님이 실제로 써온 표현들입니다. 이 **말투·리듬·온도·시선**을 본보기로 삼되, 그대로 복사하지 말고 이번 학생과 이번 입력에 맞게 새로 쓰세요.\n${out.join("\n")}`;
  } catch (e) { return ""; }
}

async function fetchSeasonGreeting(supa) {
  if (!supa) return "";
  try {
    const { data } = await supa.from("season_greetings").select("text").eq("season", currentSeason());
    if (!data || !data.length) return "";
    return data[Math.floor(Math.random() * data.length)].text || "";
  } catch (e) { return ""; }
}

async function fetchOwnVoice(supa, uid) {
  if (!supa || !uid) return "";
  try {
    const { data } = await supa.from("feedbacks").select("content").eq("academy_id", uid).order("sent_at", { ascending: false }).limit(6);
    if (!data || !data.length) return "";
    const items = data.map((r, i) => `[${i + 1}]\n${(r.content || "").trim()}`).join("\n\n");
    return `\n\n## 이 원장님이 최근 실제로 보낸 문자 (말투 학습용 · 최우선 참고)\n첫인사·맺음말은 고정 문구이니 무시하고, **그 사이 본문의 말투·어휘·리듬·시선을 이 원장님 것에 최대한 맞추세요.** 단, 여기 담긴 특정 학생 이름·사실은 절대 옮겨오지 마세요(말투만 참고).\n${items}`;
  } catch (e) { return ""; }
}

export async function POST(req) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!apiKey) return Response.json({ error: "AI 키가 아직 연결되지 않았어요." }, { status: 500 });

    // 인증
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let uid = null;
    if (url && anon && token) {
      const { data } = await createClient(url, anon).auth.getUser(token);
      uid = data?.user?.id || null;
    }
    if (!uid) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

    const input = await req.json();
    if (!input?.student?.name || !input?.learn?.what) {
      return Response.json({ error: "학생과 학습 내용을 입력해주세요." }, { status: 400 });
    }

    const svcClient = url && svc ? createClient(url, svc, { auth: { persistSession: false } }) : null;

    // 이용권: 구독 이용권(매월 리셋) + 추가 이용권. 확인·리셋은 생성 전에.
    let subCredits = 0, topup = 0, hasSub = false, plan = null;
    if (svcClient) {
      const { data: aca } = await svcClient.from("academies").select("*").eq("id", uid).single();
      hasSub = aca ? "plan" in aca : false; // 구독 컬럼(마이그레이션) 존재 여부
      topup = aca?.credits ?? 0;
      subCredits = aca?.sub_credits ?? 0;
      plan = aca?.plan ?? null;
      if (hasSub && plan) {
        const period = currentPeriod();
        if (aca.sub_period !== period) {
          subCredits = PLAN_ALLOWANCE[plan] || 0; // 매월 1일 기준 리셋
          await svcClient.from("academies").update({ sub_credits: subCredits, sub_period: period }).eq("id", uid);
        }
      }
      if (subCredits + topup <= 0) {
        return Response.json({ error: "이용 횟수가 부족해요.", code: "no_credit" }, { status: 402 });
      }
    }

    // 생성
    const anthropic = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
    const refs = await fetchRefs(input, svcClient);
    const ownVoice = await fetchOwnVoice(svcClient, uid);
    const msg = await anthropic.messages.create({
      model, max_tokens: 1200, temperature: 1,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(input) + ownVoice + refs }],
    });
    const body = (msg.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    const seasonLine = await fetchSeasonGreeting(svcClient);
    const feedback = wrapMessage(body, input.student, seasonLine);

    // 차감: 구독 이용권 먼저 → 추가 이용권 (서버에서, 우회 불가)
    let newSub = subCredits, newTop = topup;
    if (svcClient) {
      if (newSub > 0) newSub -= 1; else newTop = Math.max(0, newTop - 1);
      const upd = { credits: newTop };
      if (hasSub) upd.sub_credits = newSub;
      await svcClient.from("academies").update(upd).eq("id", uid);
    }

    return Response.json({ feedback, credits: newTop, subCredits: newSub });
  } catch (e) {
    console.error("generate error:", e);
    return Response.json({ error: e?.message || "생성 중 문제가 생겼어요." }, { status: 500 });
  }
}
