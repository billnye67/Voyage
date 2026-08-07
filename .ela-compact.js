const fs=require('fs'),path=require('path');
for(const file of process.argv.slice(2)){
 const a=JSON.parse(fs.readFileSync(path.join('.ela-audit',file.replace(/\.html$/,''),'log.json'),'utf8'));
 console.log('\n### '+file);
 let gotChallenge=false;const gotTag=new Set(),gotQ=new Set();
 for(const e of a){const t=e.text.replace(/\r/g,'');
  if(!gotChallenge&&/\nCHALLENGE\n/.test(t)){gotChallenge=true;console.log('\n[CHALLENGE]\n'+t);continue;}
  const tm=t.match(/\n(WHAT JUST HAPPENED|PREDICT FIRST|WHY|CATCH THE MISTAKE)\n([^\n]+)/);
  if(tm&&!gotTag.has(tm[1])){gotTag.add(tm[1]);console.log('\n['+tm[1]+']\n'+t);continue;}
  const qm=t.match(/QUESTION (\d+) OF \d+/);
  if(qm&&!gotQ.has(qm[1])){gotQ.add(qm[1]);console.log('\n[Q'+qm[1]+']\n'+t);}
 }
}
