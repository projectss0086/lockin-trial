import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
const key = fs.readFileSync('/home/claude/.anthropic_key','utf8').trim();
const anthropic = new Anthropic({ apiKey: key });

// 샘플: 원문 앞부분 ~2200자 (개별 피드백 2~3개 분량)
const raw = fs.readFileSync('/home/claude/raw_feedback.txt','utf8');
const sample = raw.slice(0, 2200);

const SYS = `너는 학원 원장의 실제 학부모 피드백에서 '재사용 가능한 표현 조각'을 뽑아 스타일 DB를 만드는 편집자다.
규칙:
1. 학생 이름·구체 점수·특정 학원명/날짜 등 개인정보와 특정 사실은 {이름} 같은 자리표시자로 일반화하거나 덜어내고, 재사용 가능한 문장·표현만 남긴다.
2. 원장의 말투·리듬·온도를 그대로 살린다 (매끄럽게 다듬지 말 것).
3. 각 표현에 태그를 붙인다:
   - section: 첫인사 | 학습-경험 | 학습-반응 | 학습-의견 | 성장-경험 | 성장-반응 | 성장-의견 | 에피소드 | 마무리  중 하나
   - situation: 평상시 | 시험후 | 신규상담 | 명절·계절 | 기타
   - emotion: 기특함/대견함/안쓰러움/뿌듯함 등 (없으면 "")
   - value_tag: 인내심/자존감/성실함/계획성/자기효능감/사회성 등 (없으면 "")
4. 너무 짧거나 무의미한 조각(단순 인사 한 마디 등)은 제외. 의미 있는 표현 위주로.
JSON 배열로만 출력. 각 원소: {"section","situation","emotion","value_tag","expression"}`;

const msg = await anthropic.messages.create({
  model:'claude-sonnet-4-5', max_tokens:2500, temperature:0.4,
  system: SYS,
  messages:[{role:'user', content: `아래 실제 피드백에서 표현을 뽑아 태깅해줘:\n\n${sample}`}],
});
const txt = msg.content.filter(b=>b.type==='text').map(b=>b.text).join('').trim();
fs.writeFileSync('/home/claude/sample_expr.json', txt);
console.log(txt);
console.log('\n--- usage:', JSON.stringify(msg.usage));
