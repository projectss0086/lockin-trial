import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
const key = fs.readFileSync('/home/claude/.anthropic_key','utf8').trim();
const anthropic = new Anthropic({ apiKey: key });
const PROG='/home/claude/tag_progress.json';

const SYS = `너는 학원 원장의 실제 학부모 피드백에서 '재사용 가능한 표현 조각'을 뽑아 스타일 DB를 만드는 편집자다.
규칙:
1. 학생 이름·구체 점수·특정 학원명/날짜 등 개인정보와 특정 사실은 {이름} 같은 자리표시자로 일반화하거나 덜어내고, 재사용 가능한 문장·표현만 남긴다.
2. 원장의 말투·리듬·온도를 그대로 살린다 (매끄럽게 다듬지 말 것).
3. 각 표현에 태그: section(첫인사|학습-경험|학습-반응|학습-의견|성장-경험|성장-반응|성장-의견|에피소드|마무리), situation(평상시|시험후|신규상담|명절·계절|기타), emotion(없으면 ""), value_tag(없으면 "").
4. 너무 짧거나 무의미한 조각은 제외.
반드시 JSON 배열로만 출력(설명·코드펜스 금지): {"section","situation","emotion","value_tag","expression"}`;

const raw = fs.readFileSync('/home/claude/raw_feedback.txt','utf8').replace(/=====MSG=====/g,'\n');
const CHUNK=2000; const chunks=[];
for(let i=0;i<raw.length;i+=CHUNK) chunks.push(raw.slice(i,i+CHUNK));

let done=0, all=[];
if(fs.existsSync(PROG)){ const p=JSON.parse(fs.readFileSync(PROG,'utf8')); done=p.done||0; all=p.all||[]; }
console.log('청크', chunks.length,'· 이어시작', done, '· 기존표현', all.length);

function parseJson(t){
  t=t.trim().replace(/^```json/,'').replace(/^```/,'').replace(/```$/,'').trim();
  try{ return JSON.parse(t); }catch{ const i=t.lastIndexOf('}'); if(i>0){ try{ return JSON.parse(t.slice(0,i+1)+']'); }catch{} } return null; }
}
async function one(chunk,idx){
  for(let a=0;a<2;a++){ try{
    const msg=await anthropic.messages.create({model:'claude-sonnet-4-5',max_tokens:4096,temperature:0.4,system:SYS,
      messages:[{role:'user',content:`아래 실제 피드백에서 표현을 뽑아 태깅해줘:\n\n${chunk}`}]});
    const arr=parseJson(msg.content.filter(b=>b.type==='text').map(b=>b.text).join(''));
    if(Array.isArray(arr)) return arr;
  }catch(e){ if(a===1) console.log('청크',idx,'실패'); } }
  return [];
}
const CONC=8;
for(let i=done;i<chunks.length;i+=CONC){
  const batch=chunks.slice(i,i+CONC).map((c,j)=>one(c,i+j));
  const res=await Promise.all(batch);
  res.forEach(a=>all.push(...a));
  done=Math.min(i+CONC,chunks.length);
  fs.writeFileSync(PROG, JSON.stringify({done,all}));
  process.stdout.write(`  ${done}/${chunks.length} · 누적 ${all.length}\n`);
}
const seen=new Set(), dedup=[];
for(const e of all){ const k=(e.expression||'').trim(); if(!k||k.length<8||seen.has(k))continue; seen.add(k); dedup.push(e); }
fs.writeFileSync('/home/claude/expressions_all.json', JSON.stringify(dedup,null,1));
const dist={}; dedup.forEach(e=>dist[e.section]=(dist[e.section]||0)+1);
console.log('완료 · 총', all.length,'→ 중복제거', dedup.length);
console.log('섹션분포:', JSON.stringify(dist));
