import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { SYSTEM_PROMPT, buildUserMessage } from './lib/enginePrompt.js';
const key = fs.readFileSync('/home/claude/.anthropic_key','utf8').trim();
const anthropic = new Anthropic({ apiKey: key });
const input = {
  academy:{name:'장유황소수학',owner_name:'이윤하',subject:'수학'},
  student:{name:'양은수',grade:'초4',subject:'수학'},
  learn:{what:'세 자리 나눗셈',react:'지루해했지만 끝까지 풀어냄',opinion:'다음 달부터 응용문제 비중 늘릴 예정'},
  fork:'growth',
  scene:'HME 수상 못했지만 다음엔 꼭 받고싶다고 다짐',
  emotion:'짠하면서도 대견함',
  plan:'발표 기회를 더 주며 자신감을 키워줄 계획',
};
const msg = await anthropic.messages.create({model:'claude-sonnet-4-5',max_tokens:1200,temperature:1,system:SYSTEM_PROMPT,messages:[{role:'user',content:buildUserMessage(input)}]});
console.log(msg.content.filter(b=>b.type==='text').map(b=>b.text).join('').trim());
