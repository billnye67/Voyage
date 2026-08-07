// Organic playthrough of lesson-ss4-geography-shapes-life.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss4-geography-shapes-life.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: try mountain spot, then plains, then harbor
  await page.evaluate(() => foundCity('peak'));
  await expectText('has the view — and the winter', 'peak feedback');
  await page.evaluate(() => foundCity('plains'));
  await expectText('farmable — but thirsty', 'plains feedback');
  await page.evaluate(() => foundCity('harbor'));
  await expectText('the one real founders picked', 'harbor correct');
  await page.locator('#nx').click();

  // beat 1: wrong then river
  await page.getByRole('button', { name: /dry inland town/ }).click();
  await expectText('stuck hauling water', 'water wrong feedback');
  await page.getByRole('button', { name: /river-mouth town/ }).click();
  await expectText('the head start', 'water correct');
  await page.locator('#nx').click();

  // beat 2: jobs — wrong on place 1 then all correct
  await page.evaluate(() => pickJob(0, 'ski'));
  await expectText('flat, rich soil for miles', 'job wrong feedback');
  await page.evaluate(() => pickJob(0, 'farm'));
  await page.evaluate(() => pickJob(1, 'fish'));
  await page.evaluate(() => pickJob(2, 'ski'));
  await expectText('Three lands, three livings', 'jobs complete');
  await page.locator('#nx').click();

  // beat 3: wrong then canals
  await page.getByRole('button', { name: /raining more/ }).click();
  await expectText('the people changed it', 'push wrong feedback');
  await page.getByRole('button', { name: /Canals bringing/ }).click();
  await expectText('classic case of changing the land', 'push correct');
  await page.locator('#nx').click();

  // beat 4: Kai
  await page.getByRole('button', { name: /Dot the big cities/ }).click();
  await expectText('never checked the land under the dots', 'Kai reveal');
  await page.screenshot({ path: '.ss4-shot-cities.png' });
  await page.locator('#nx').click();

  // quiz: 4/5 (deliberate wrong on Q1)
  for (let q = 0; q < 5; q++) {
    const correct = await page.evaluate(i => QUESTIONS[i].correct, q);
    if (q === 0) { await page.locator('#ch' + ((correct + 1) % 4)).click(); await expectText('Not quite', 'Q1 wrong feedback'); }
    else { await page.locator('#ch' + correct).click(); await expectText('Yes.', 'Q' + (q + 1) + ' correct'); }
    await page.locator('#nx').click();
  }
  await expectText('Lesson complete', 'done screen');
  await expectText('4 of 5', 'score');
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('voyage_g4ss_progress') || '{}'));
  if (!store.done || !store.done['SS.4.G.4']) fail('progress key missing SS.4.G.4');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();
