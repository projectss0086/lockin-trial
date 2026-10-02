import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { SYSTEM_PROMPT, buildUserMessage } from './lib/enginePrompt.js';
const key = fs.readFileSync('/home/claude/.anthropic_key','utf8').trim();
const anthropic = new Anthropic({ apiKey: key });
const input = {
  academy: { name:'장유황소수학', owner_name:'이윤하', subject:'수학' },
  student: { name:'양은수', grade:'초4', subject:'수학' },
  learn: { what:'두 자리 수를 세 자리 수로 나누는 나눗셈', react:'암산 잘하는 편이라 자신있게 시작했는데 반복되니 지루해함. 그래도 끝까지 풀어냄', opinion:'' },
  fork: 'growth',
  scene:'HME 시상식에서 수상 못함. 상 받는 친구 이름 불릴 때마다 표정 굳어지고, 나도 열심히 했는데 하며 목소리 작아짐. 그래도 다음엔 꼭 받고싶다고 조용히 말함',
  emotion:'속상해하면서도 다음을 다짐하는 모습이 짠하면서도 대견했어요',
};
const msg = await anthropic.messages.create({
  model:'claude-sonnet-4-5', max_tokens:1200, temperature:1,
  system:SYSTEM_PROMPT, messages:[{role:'user',content:buildUserMessage(input)}],
});
console.log(msg.content.filter(b=>b.type==='text').map(b=>b.text).join('').trim());
