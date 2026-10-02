import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { SYSTEM_PROMPT, buildUserMessage } from './lib/enginePrompt.js';
const key = fs.readFileSync('/home/claude/.anthropic_key','utf8').trim();
const anthropic = new Anthropic({ apiKey: key });
const input = {
  academy: { name:'장유황소수학', owner_name:'이윤하', subject:'수학' },
  student: { name:'박서준', grade:'초5', subject:'수학' },
  learn: { what:'분수의 나눗셈', react:'처음엔 헷갈려하다 감을 잡음', opinion:'' },
  fork: 'growth',
  scene: '지루한 연산도 끝까지 붙잡고 풀어냄',
  emotion: '대견함',
};
const models = ['claude-sonnet-4-5'];
try {
  const msg = await anthropic.messages.create({
    model: models[0], max_tokens: 1200, temperature: 1,
    system: SYSTEM_PROMPT,
    messages: [{ role:'user', content: buildUserMessage(input) }],
  });
  console.log('MODEL_OK:', models[0]);
  console.log('--- 생성 결과 ---');
  console.log(msg.content.filter(b=>b.type==='text').map(b=>b.text).join('').trim());
  console.log('--- usage ---', JSON.stringify(msg.usage));
} catch(e) {
  console.log('ERROR:', e.status, e.message);
}
