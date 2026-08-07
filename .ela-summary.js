const fs=require('fs'),path=require('path');
for(const file of process.argv.slice(2)){
 const p=path.join('.ela-audit',file.replace(/\.html$/,''),'log.json');
 const a=JSON.parse(fs.readFileSync(p,'utf8'));
 console.log('\n######## '+file+' ########');
 let challenge=false,last='';
 for(const e of a){
  const t=e.text.replace(/\r/g,'');
  let take=false;
  if(!challenge&&/\nCHALLENGE\n/.test(t)){challenge=true;take=true;}
  if(/\n(?:WHAT JUST HAPPENED|PREDICT FIRST|WHY|CATCH THE MISTAKE)\n/.test(t))take=true;
  if(/QUESTION \d+ OF \d+/.test(t))take=true;
  if(/Lesson complete|Worth one more pass/.test(t))take=true;
  const norm=t.replace(/\s+/g,' ').trim();
  if(take&&norm!==last){console.log('\n--- SCREEN '+e.n+' ---\n'+t);last=norm;}
 }
}
