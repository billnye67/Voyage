// Organic playthrough of lesson-ss12-knowing-the-past.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss12-knowing-the-past.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: open all clues, wrong verdict first
  for (const k of ['diary', 'photo', 'web']) await page.evaluate(kk => openClue(kk), k);
  await expectText('Walked the mile to school', 'diary content');
  await page.getByRole('button', { name: /family has always said so/ }).click();
  await expectText('repetition, not proof', 'verdict wrong feedback');
  await page.getByRole('button', { name: /diary and photo agree/ }).click();
  await expectText('Three independent clues, one answer', 'verdict correct');
  await page.locator('#nx').click();

  // beat 1: sort with one wrong
  await page.evaluate(() => pickSort(0, 'primary'));
  await page.evaluate(() => pickSort(1, 'secondary'));
  await expectText('camera clicked in 1962', 'sort wrong feedback');
  await page.evaluate(() => pickSort(1, 'primary'));
  await page.evaluate(() => pickSort(2, 'secondary'));
  await expectText('Two primaries and a secondary', 'sort complete');
  await page.locator('#nx').click();

  // beat 2: wrong then right
  await page.getByRole('button', { name: /too loudly/ }).click();
  await expectText('Volume isn’t on the list', 'test wrong feedback');
  await page.getByRole('button', { name: /wasn’t there — born eight years/ }).click();
  await expectText('weak source', 'test correct');
  await page.locator('#nx').click();

  // beat 3: two wrongs then right
  await page.getByRole('button', { name: /whichever source is older/ }).click();
  await expectText('tossing your best evidence', 'disagree wrong 1');
  await page.getByRole('button', { name: /better story/ }).click();
  await expectText('how legends get made', 'disagree wrong 2');
  await page.getByRole('button', { name: /BOTH are true/ }).click();
  await expectText('disagreement dissolves', 'disagree correct');
  await page.locator('#nx').click();

  // beat 4: Finn
  await page.getByRole('button', { name: /newer/ }).click();
  await expectText('confused “new” with', 'Finn reveal');
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
  if (!store.done || !store.done['SS.4.H.1']) fail('progress key missing SS.4.H.1');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();
