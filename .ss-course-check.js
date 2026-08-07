// Verify the social studies course launcher: menu, navigation, done states, progress bar.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'social-studies-course.html').replace(/\\/g, '/'));
  // 14 skills listed, 4 domains
  const n = await page.locator('.skill-btn').count();
  if (n !== 14) fail('expected 14 skills, got ' + n);
  await expectText('0 / 14 skills mastered', 'initial progress');
  await expectText('Map skills', 'first card shown');

  // navigate to a later skill
  await page.locator('.skill-btn').nth(6).click();
  await expectText('The three branches', 'skill 7 card');
  await expectText('SS.4.C.3', 'skill 7 code');
  const href = await page.locator('.card a.btn').getAttribute('href');
  if (href !== 'lesson-ss7-three-branches.html') fail('bad lesson link: ' + href);

  // simulate two lessons completed (as lessons write it), reload, check done states
  await page.evaluate(() => {
    localStorage.setItem('voyage_g4ss_progress', JSON.stringify({ done: { 'SS.4.G.1': true, 'SS.4.C.3': true }, lastSkill: 6 }));
  });
  await page.reload();
  await expectText('2 / 14 skills mastered', 'progress after completion');
  await expectText('Mastered — replay any time', 'done badge on lastSkill card');
  const doneBtns = await page.locator('.skill-btn.done').count();
  if (doneBtns !== 2) fail('expected 2 done skills in menu, got ' + doneBtns);
  await expectText('Replay lesson', 'replay label');

  // every lesson link resolves to a file that exists
  const fs = require('fs');
  const links = await page.evaluate(() => DOMAINS.flatMap(d => d.skills.map(s => s.file)));
  for (const f of links) if (!fs.existsSync(f)) fail('missing lesson file: ' + f);

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'COURSE CHECK HAD FAILURES' : 'COURSE CHECK PASS');
  await browser.close();
})();
