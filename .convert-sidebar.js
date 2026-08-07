// Converts an old-style lesson (thin .steps bar) to the sidebar/TOC shell,
// replicating the exact transformation committed for the 23 ELA lessons.
// Usage: node .convert-sidebar.js lesson-x.html [...]
const fs = require('fs');

// Hand-written sidebar step titles per lesson (warm-up + learn beats, in step order).
// Question/Wrap-up entries are generated. 4nbt4 has 6 teaching beats; all others 5.
const TITLES = {
  'lesson-4nbt1-place-value.html': ['Put the digit to work', 'Ten times more', 'Predict first', 'Ten make the next column', 'Catch Kai’s mistake'],
  'lesson-4nbt2-read-write-compare.html': ['Break the number apart', 'Zeros hold columns', 'Which is bigger?', 'Compare from the left', 'Catch Nadia’s mistake'],
  'lesson-4nbt3-rounding.html': ['Closer to which end?', 'Same number, three answers', 'What about dead centre?', 'Round without the line', 'Catch Theo’s mistake'],
  'lesson-4nbt4-add-subtract.html': ['Make a carry yourself', 'One column at a time', 'Carrying is a trade', 'A column comes up short', 'Trading through a zero', 'Catch Ria’s mistake'],
  'lesson-4nbt5-multiplication.html': ['Fill the boxes', 'Four easy ones', 'Predict first', 'Every piece meets every piece', 'Catch Owen’s mistake'],
  'lesson-4nbt6-division.html': ['Share 84 between 4', 'Break the stranded ten', '137 between 6', 'Without the blocks', 'Catch Ava’s mistake'],
  'lesson-4oa1-multiplication-comparison.html': ['Copies or extras?', 'Sentences become math', 'Run it backwards', 'Same numbers, new sentence', 'Catch Ava’s mistake'],
  'lesson-4oa2-word-problems.html': ['Which number is hiding?', 'One picture, three questions', 'The small pile hides', 'The one-word difference', 'Catch Zoe’s mistake'],
  'lesson-4oa3-remainders.html': ['Load the vans', 'Three jobs for a remainder', 'Predict first', 'Read the question twice', 'Catch Marcus’s mistake'],
  'lesson-4oa4-factors-primes.html': ['Make every rectangle', '7 goes one way only', 'Predict first', 'Factor pairs and multiples', 'Catch Priya’s mistake'],
  'lesson-4oa5-patterns.html': ['Set the machine', 'Odd or even?', 'Before the machine runs', 'The add amount decides', 'Catch Dev’s mistake'],
  'lesson-4nf1-equivalent-fractions.html': ['Eat as much as Jamie', 'Three bars, same amount', 'Predict first', 'What the numbers did', 'Catch Maya’s mistake'],
  'lesson-4nf2-comparing-fractions.html': ['Pick the fuller bottle', 'Three tricks', '3/4 or 2/3?', 'Piece size, not amount', 'Catch Leo’s mistake'],
  'lesson-4nf3-adding-fractions.html': ['Fill it to the line', 'The bottom never moved', 'Predict first', 'Counting, not calculating', 'Catch Priya’s mistake'],
  'lesson-4nf4-multiply-fraction-whole.html': ['How much milk?', 'Counting quarters', 'Predict first', 'Groups of same-size pieces', 'Catch Omar’s mistake'],
  'lesson-4nf5-tenths-hundredths.html': ['Fill the page exactly', 'One row is ten singles', 'Predict first', 'Same-size pieces only', 'Catch Nia’s mistake'],
  'lesson-4nf6-decimal-notation.html': ['Pay the exact amount', 'Each coin gets a column', 'Predict first', 'The box decides the size', 'Catch Theo’s mistake'],
  'lesson-4nf7-comparing-decimals.html': ['Count the little squares', 'The grid, decoded', 'The short one wins?', 'Money taught you this', 'Catch Theo’s mistake'],
  'lesson-4md1-converting-units.html': ['Fill the tank', 'Big units are packages', 'Same move on lengths', 'One move, every measurement', 'Catch Mia’s mistake'],
  'lesson-4md2-measurement-word-problems.html': ['Same numbers, new story', 'The story picks the move', 'The unit trap', 'Two-move stories', 'Catch Jon’s mistake'],
  'lesson-4md3-area-perimeter.html': ['Fence it, then fill it', 'Two shortcuts', 'Same fence, same grass?', 'Shortcuts backwards', 'Catch Ava’s mistake'],
  'lesson-4md4-line-plots.html': ['Read the stacks', 'Numbers into one picture', 'Between the numbers', 'The plot subtracts for you', 'Catch Sam’s mistake'],
  'lesson-4md5-angle-turns.html': ['Measure the spin', 'The turn ruler', 'Freeze a turn', 'The clock turn machine', 'Catch Kai’s mistake'],
  'lesson-4md6-protractor.html': ['Two numbers, one answer', 'The protractor, piece by piece', 'Partners to 180', 'Draw an angle to order', 'Catch Lena’s mistake'],
  'lesson-4md7-additive-angles.html': ['Pieces of a corner', 'Degrees add like blocks', 'A split square corner', 'Around a point: 360', 'Catch Omar’s mistake'],
  'lesson-4g1-lines-angles.html': ['Read the ends', 'Three different figures', 'Two rays, same point', 'Lines sharing a page', 'Catch Maya’s mistake'],
  'lesson-4g2-classify-shapes.html': ['Read the marks', 'Pass a check, earn a name', 'One shape, every check', 'Cut it — marks still work', 'Catch Leo’s mistake'],
  'lesson-4g3-line-symmetry.html': ['The fold test', 'The fold is the judge', 'Several fold lines?', 'Hunting fold lines', 'Catch Noah’s mistake'],
  'lesson-w41-opinion-writing.html': ['Pick the skeleton’s bones', 'The skeleton, assembled', 'Three sentences, zero reasons', 'Write for your reader', 'Catch Devon’s mistake'],
  'lesson-w42-informative-writing.html': ['Every fact has a drawer', 'The report, assembled', 'A fact in the wrong drawer', 'Teaching voice', 'Catch Ravi’s mistake'],
  'lesson-w43-narrative-writing.html': ['Build Jo’s story', 'The story, assembled', 'Show it, or say it?', 'Pacing the beats', 'Catch Nia’s mistake'],
};

const SIDEBAR_CSS = `
  /* ---------- lesson app shell (sidebar) ---------- */
  .app{display:none}
  .app.on{display:flex;min-height:100vh;align-items:stretch}
  .side{width:272px;flex-shrink:0;background:var(--card);border-right:1.5px solid var(--blue-line);
    display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto}
  .side-head{padding:18px 20px 14px;border-bottom:1.5px dashed var(--blue-line)}
  .side-exit{font-family:'Space Mono',monospace;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
    color:var(--muted);text-decoration:none;display:inline-block;margin-bottom:12px}
  .side-exit:hover{color:var(--ink)}
  .side-kick{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--accent);margin-bottom:6px}
  .side-title{font-family:'Fraunces',serif;font-weight:700;font-size:19px;line-height:1.2}
  .toc{flex:1;padding:10px 12px 16px}
  .toc-phase{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--muted);padding:14px 10px 6px}
  .toc-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;
    font-family:'Space Grotesk',sans-serif;font-size:14px;color:var(--ink);padding:8px 10px;border-radius:9px;
    cursor:pointer;line-height:1.3}
  .toc-item:hover{background:rgba(27,79,138,.06)}
  .toc-item.locked{color:var(--muted);opacity:.55;cursor:default}
  .toc-item.locked:hover{background:none}
  .toc-item.cur{background:var(--ink);color:#fff;font-weight:600}
  .toc-item.cur:hover{background:var(--ink)}
  .dot{width:22px;height:22px;flex-shrink:0;border-radius:50%;border:1.5px solid var(--blue-line);background:#fff;
    display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;font-size:10.5px;color:var(--muted)}
  .toc-item.cur .dot{border-color:#fff;background:var(--accent);color:#fff;font-weight:700}
  .toc-item.done .dot{border-color:var(--green);background:var(--green);color:#fff}
  .side-foot{padding:14px 20px 18px;border-top:1.5px dashed var(--blue-line)}
  .side-foot .lab{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;
    color:var(--muted);margin-bottom:7px;display:flex;justify-content:space-between}
  .pbar{height:7px;border-radius:4px;background:var(--blue-line);overflow:hidden}
  .pbar>div{height:100%;background:var(--green);border-radius:4px;transition:width .3s}
  .main{flex:1;min-width:0}
  .main-inner{max-width:720px;margin:0 auto;padding:30px 30px 90px}
  .stepkick{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px}
  .stepkick .where{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .stepkick .where b{color:var(--blue);font-weight:700}

  @media(max-width:760px){
    .app.on{display:block}
    .side{width:100%;height:auto;position:static;border-right:none;border-bottom:1.5px solid var(--blue-line)}
    .toc{display:flex;overflow-x:auto;padding:8px 10px}
    .toc-phase{display:none}
    .toc-item{width:auto;flex-shrink:0}
    .toc-item span.tocname{display:none}
    .side-head{padding:12px 16px 10px}
    .side-foot{display:none}
    .main-inner{padding:20px 15px 70px}
    .card{padding:24px 18px}
  }
`;

let failures = 0;
for (const file of process.argv.slice(2)) {
  const titles = TITLES[file];
  if (!titles) { console.log('SKIP  ' + file + ' — no titles defined'); failures++; continue; }
  let src = fs.readFileSync(file, 'utf8');
  const orig = src;
  const problems = [];
  const sub = (re, repl, what) => {
    if (!re.test(src)) { problems.push('anchor not found: ' + what); return; }
    src = src.replace(re, repl);
  };

  // --- gather per-lesson facts
  const mTot = src.match(/var step=0,TOTAL=(\d+);/);
  const mQuiz = src.match(/step>=(\d+)&&step<TOTAL-1/);
  const mTag = src.match(/<div class="tag">(Lesson[^<]*)<\/div>/i);
  const mH1 = src.match(/<h1>([^<]*)<\/h1>/);
  const mCrumb = src.match(/<div class="crumb">([^<]*?)&nbsp;/);
  if (!mTot || !mQuiz || !mTag || !mH1) { console.log('SKIP  ' + file + ' — missing anchors'); failures++; continue; }
  const TOTAL = +mTot[1], quizStart = +mQuiz[1];
  const isMath = !/^lesson-w4/.test(file);
  const courseHref = isMath ? 'math-course.html' : 'ela-course.html';
  const courseLabel = isMath ? 'Grade 4 Math' : 'Grade 4 ELA';
  if (titles.length !== quizStart) { console.log('SKIP  ' + file + ` — ${titles.length} titles but quiz starts at ${quizStart}`); failures++; continue; }

  // --- build OUTLINE literal
  const learnItems = titles.slice(1).map((n, i) => `{s:${i + 1}, n:'${n.replace(/'/g, "\\'")}'}`).join(',');
  const qItems = [];
  for (let s = quizStart; s < TOTAL - 1; s++) qItems.push(`{s:${s}, n:'Question ${s - quizStart + 1}'}`);
  const outline = `var OUTLINE=[
  {phase:'Warm-up', items:[{s:0, n:'${titles[0].replace(/'/g, "\\'")}'}]},
  {phase:'Learn',   items:[${learnItems}]},
  {phase:'Show it', items:[${qItems.join(',')}]},
  {phase:'Finish',  items:[{s:${TOTAL - 1}, n:'Wrap-up'}]}
];
`;

  // --- 1. CSS: drop dead .steps rules if present; insert sidebar block before </style>
  src = src.replace(/\n\s*\.steps\{[^}]*\}\n\s*\.steps \.seg\{[^}]*\}\n\s*\.steps \.seg\.on\{[^}]*\}/, '');
  sub(/<\/style>/, SIDEBAR_CSS + '</style>', '</style>');

  // --- 2. HTML: shell wraps intro only; #lesson block becomes the app shell
  sub(/<div class="shell">\s*\n\s*<div id="intro">/, '<div class="shell" id="intro">', 'shell+intro open');
  const appShell = `<div class="app" id="app">
  <aside class="side">
    <div class="side-head">
      <a class="side-exit" href="${courseHref}">← ${courseLabel}</a>
      <div class="side-kick">${mTag[1]}</div>
      <div class="side-title">${mH1[1]}</div>
    </div>
    <nav class="toc" id="toc"></nav>
    <div class="side-foot">
      <div class="lab"><span>Progress</span><span id="pctlab"></span></div>
      <div class="pbar"><div id="pfill" style="width:0%"></div></div>
    </div>
  </aside>
  <div class="main">
    <div class="main-inner">
      <div class="stepkick"><span class="where" id="where"></span><span class="where" id="pageno"></span></div>
      <div class="card" id="stage"></div>
    </div>
  </div>
</div>`;
  sub(/<div id="lesson" class="hide">[\s\S]*?<div class="card" id="stage"><\/div>\s*<\/div>\s*\n\s*<\/div>/, appShell, '#lesson block');

  // --- 3. JS
  sub(/var step=0,TOTAL=(\d+);/, 'var step=0,TOTAL=$1,maxStep=0;', 'TOTAL var');
  sub(/function el\(i\)\{return document\.getElementById\(i\);\}/,
    outline + '\nfunction el(i){return document.getElementById(i);}', 'el()');
  sub(/function startLesson\(\)\{el\('intro'\)\.classList\.add\('hide'\);el\('lesson'\)\.classList\.remove\('hide'\);render\(\);scrollTo\(0,0\);\}/,
    "function startLesson(){el('intro').classList.add('hide');el('app').classList.add('on');render();scrollTo(0,0);}", 'startLesson');
  const drawSide = `function goStep(s){
  if(s>maxStep)return;
  if(s>=${quizStart}&&s<TOTAL-1){qIndex=s-${quizStart};}
  step=s;render();scrollTo(0,0);
}

function drawSide(){
  if(step>maxStep)maxStep=step;
  var h='';
  for(var p=0;p<OUTLINE.length;p++){
    h+='<div class="toc-phase">'+OUTLINE[p].phase+'</div>';
    for(var i=0;i<OUTLINE[p].items.length;i++){
      var it=OUTLINE[p].items[i];
      var state;
      if(it.s===step)state='cur';
      else if(it.s<maxStep||step===TOTAL-1)state='done';
      else state='locked';
      var dot=state==='done'?'✓':(it.s>=${quizStart}&&it.s<TOTAL-1?(it.s-${quizStart - 1}):'·');
      h+='<button class="toc-item '+state+'" onclick="goStep('+it.s+')"><span class="dot">'+dot+'</span><span class="tocname">'+it.n+'</span></button>';
    }
  }
  el('toc').innerHTML=h;
  var doneCount=(step===TOTAL-1)?TOTAL:maxStep;
  var pct=Math.round(doneCount/TOTAL*100);
  el('pfill').style.width=pct+'%';
  el('pctlab').innerHTML=pct+'%';
  var phaseName='',stepName='';
  for(var p2=0;p2<OUTLINE.length;p2++)for(var i2=0;i2<OUTLINE[p2].items.length;i2++)
    if(OUTLINE[p2].items[i2].s===step){phaseName=OUTLINE[p2].phase;stepName=OUTLINE[p2].items[i2].n;}
  el('where').innerHTML='<b>'+phaseName+'</b> &nbsp;›&nbsp; '+stepName;
  el('pageno').innerHTML='p. '+(step+1)+' / '+TOTAL;
}`;
  sub(/function drawSteps\(\)\{var h='';for\(var i=0;i<TOTAL;i\+\+\)h\+='<div class="seg'\+\(i<=step\?' on':''\)\+'"><\/div>';el\('steps'\)\.innerHTML=h;\}/,
    drawSide, 'drawSteps()');
  sub(/function restart\(\)\{step=0;/, 'function restart(){step=0;maxStep=0;', 'restart()');
  sub(/^\s*drawSteps\(\);/m, '  drawSide();', 'render() drawSteps call');

  if (problems.length) { console.log('FAIL  ' + file); problems.forEach(p => console.log('        - ' + p)); failures++; continue; }
  if (src === orig) { console.log('FAIL  ' + file + ' — no changes made'); failures++; continue; }
  fs.writeFileSync(file, src, 'utf8');
  console.log('OK    ' + file + `  (TOTAL=${TOTAL}, quiz@${quizStart})`);
}
process.exit(failures ? 1 : 0);
