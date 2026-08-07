// Replace the /*USMAP_DATA*/ marker in lesson files with the extracted state data.
const fs = require('fs');
const data = fs.readFileSync('.usmap-data.js', 'utf8').trim();
for (const f of ['lesson-ss2-us-regions.html', 'lesson-ss3-states-capitals-landforms.html', 'lesson-ss4-geography-shapes-life.html']) {
  let src = fs.readFileSync(f, 'utf8');
  if (!src.includes('/*USMAP_DATA*/')) { console.log('SKIP ' + f + ' — no marker (already injected?)'); continue; }
  src = src.replace('/*USMAP_DATA*/', data);
  fs.writeFileSync(f, src, 'utf8');
  console.log('injected into ' + f);
}
