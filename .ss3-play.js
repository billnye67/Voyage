// Organic playthrough of lesson-ss3-states-capitals-landforms.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss3-states-capitals-landforms.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: fall into the NYC trap, then pick Sacramento right
  await page.getByRole('button', { name: 'New York City' }).click();
  await expectText('That’s the trap', 'NY trap feedback');
  await page.getByRole('button', { name: 'Sacramento' }).click();
  await expectText('right again', 'CA correct feedback');
  await expectText('the wrong test', 'hook reveal');
  await page.locator('#nx').click();

  // beat 1: wrong then state
  await page.getByRole('button', { name: 'The United Nations' }).click();
  await expectText('Closer to home', 'state wrong feedback');
  await page.getByRole('button', { name: /My state/ }).click();
  await expectText('classic state-government job', 'state correct');
  await page.locator('#nx').click();

  // beat 2: Chicago wrong then Springfield
  await page.getByRole('button', { name: /Chicago/ }).click();
  await expectText('reached for “famous” again', 'capital wrong feedback');
  await page.getByRole('button', { name: /Springfield/ }).click();
  await expectText('the government’s address is Springfield', 'capital correct');
  await page.locator('#nx').click();

  // beat 3: click all 4 landforms
  for (let i = 0; i < 4; i++) { await page.locator('.lf-row').nth(i).click(); await page.waitForTimeout(100); }
  await expectText('the country’s skeleton', 'landforms complete');
  await page.screenshot({ path: '.ss3-shot-land.png' });
  await page.locator('#nx').click();

  // beat 4: Ava
  await page.getByRole('button', { name: /Check Ava/ }).click();
  await expectText('used fame as her test', 'Ava reveal');
  await page.locator('#nx').click();

  // quiz: 4/5 (deliberate wrong on Q4)
  for (let q = 0; q < 5; q++) {
    const correct = await page.evaluate(i => QUESTIONS[i].correct, q);
    if (q === 3) { await page.locator('#ch' + ((correct + 1) % 4)).click(); await expectText('Not quite', 'Q4 wrong feedback'); }
    else { await page.locator('#ch' + correct).click(); await expectText('Yes.', 'Q' + (q + 1) + ' correct'); }
    await page.locator('#nx').click();
  }
  await expectText('Lesson complete', 'done screen');
  await expectText('4 of 5', 'score');
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('voyage_g4ss_progress') || '{}'));
  if (!store.done || !store.done['SS.4.G.3']) fail('progress key missing SS.4.G.3');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();
