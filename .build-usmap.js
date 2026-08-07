// Extract lower-48 state paths from the Wikimedia blank US map and emit
// region-grouped JS data (usmap-data.js) for embedding in lessons.
const fs = require('fs');
const src = fs.readFileSync(process.env.TEMP + '/us2.svg', 'utf8');

const REGIONS = {
  ne: ['me','nh','vt','ma','ri','ct','ny','nj','pa'],
  mw: ['oh','mi','in','il','wi','mn','ia','mo','nd','sd','ne','ks'],
  se: ['de','md','va','wv','ky','tn','nc','sc','ga','fl','al','ms','ar','la'],
  sw: ['tx','ok','nm','az'],
  w:  ['wa','or','ca','nv','id','ut','co','mt','wy'],
};

// state shape paths have exactly a two-letter class
const paths = {};
const re = /<path class="([a-z]{2})"\s+d="([^"]+)"/g;
let m;
while ((m = re.exec(src))) paths[m[1]] = m[2];

const out = {};
let missing = [];
for (const [rgn, states] of Object.entries(REGIONS)) {
  out[rgn] = {};
  for (const st of states) {
    if (paths[st]) out[rgn][st] = paths[st].replace(/\s+/g, ' ').trim();
    else missing.push(st);
  }
}
if (missing.length) { console.error('MISSING: ' + missing.join(',')); process.exit(1); }

fs.writeFileSync('.usmap-data.js', 'var USMAP=' + JSON.stringify(out) + ';\n', 'utf8');
const size = fs.statSync('.usmap-data.js').size;
console.log('wrote .usmap-data.js  (' + Math.round(size / 1024) + ' KB, ' + Object.values(out).reduce((a, r) => a + Object.keys(r).length, 0) + ' states)');
