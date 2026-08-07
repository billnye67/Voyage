// Sidebar audit: plays each lesson like the old walker, but verifies the new
// TOC shell against what actually happens on screen. Exit 0 only if all pass.
const { chromium } = require('playwright');
const path = require('path');

const navRx = /^(next|back|.*review the lesson|again|back to)/i;
const clean = s => s.replace(/\s+/g, ' ').trim();

async function auditLesson(browser, file) {
  const issues = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/net::|ERR_|font/i.test(m.text())) jsErrors.push(m.text().slice(0, 200)); });
  await page.goto('file:///' + path.join(process.cwd(), file).replace(/\\/g, '/'));

  // --- static outline check: OUTLINE steps must be exactly 0..TOTAL-1 in order
  const meta = await page.evaluate(() => {
    if (typeof OUTLINE === 'undefined') return { noOutline: true };
    const flat = OUTLINE.flatMap(p => p.items.map(i => ({ s: i.s, n: i.n, phase: p.phase })));
    return {
      steps: flat.map(x => x.s),
      titles: flat.map(x => x.phase + ' / ' + x.n),
      total: typeof TOTAL !== 'undefined' ? TOTAL : null,
      nq: typeof QUESTIONS !== 'undefined' ? QUESTIONS.length : null,
    };
  });
  if (meta.noOutline) { issues.push('no OUTLINE global — sidebar not wired'); }
  else {
    const want = Array.from({ length: meta.total }, (_, i) => i);
    if (JSON.stringify(meta.steps) !== JSON.stringify(want))
      issues.push(`OUTLINE steps [${meta.steps}] != 0..${meta.total - 1}`);
    const qItems = meta.titles.filter(t => /Question \d+/i.test(t)).length;
    if (meta.nq !== null && qItems !== meta.nq)
      issues.push(`TOC lists ${qItems} questions, QUESTIONS has ${meta.nq}`);
  }

  const start = page.getByRole('button', { name: /Start lesson/i });
  if (await start.count()) { await start.click(); await page.waitForTimeout(600); }

  async function sidebarState() {
    return page.evaluate(() => {
      const items = [...document.querySelectorAll('.toc-item')];
      const pf = document.getElementById('pfill');
      return {
        cur: items.findIndex(i => i.classList.contains('cur')),
        nCur: items.filter(i => i.classList.contains('cur')).length,
        done: items.map((i, ix) => i.classList.contains('done') ? ix : -1).filter(x => x >= 0),
        locked: items.map((i, ix) => i.classList.contains('locked') ? ix : -1).filter(x => x >= 0),
        pfill: pf ? parseFloat(pf.style.width) || 0 : -1,
        step: typeof step !== 'undefined' ? step : null,
      };
    });
  }

  // --- locked click is a no-op (test once, early)
  let s0 = await sidebarState();
  if (s0.locked.length) {
    const lockedIx = s0.locked[s0.locked.length - 1];
    await page.locator('.toc-item').nth(lockedIx).click({ force: true });
    await page.waitForTimeout(150);
    const s1 = await sidebarState();
    if (s1.step !== s0.step) issues.push(`clicking locked TOC item ${lockedIx} jumped step ${s0.step}→${s1.step}`);
  } else if (!meta.noOutline) {
    issues.push('no locked items at lesson start — future steps not locked');
  }

  // --- play through blind, checking sidebar sync each screen
  const tried = new Map();
  let finished = false, maxPfill = 0, curSeq = [], stuckCount = 0;
  // Screen identity = full exact main text. Any visible change (feedback, next
  // patient, ✓ marks) is a new state, so same-named buttons become clickable again.
  function identity(txt) { return clean(txt); }
  async function mainText() {
    const m = page.locator('.main');
    return (await m.count()) ? m.first().innerText() : page.locator('body').innerText();
  }
  for (let turn = 0; turn < 180 && !finished; turn++) {
    const txt = await mainText();
    const st = await sidebarState();
    if (st.nCur > 1) issues.push(`step ${st.step}: ${st.nCur} TOC items highlighted at once`);
    if (st.cur >= 0 && st.step !== null && st.cur !== st.step)
      issues.push(`step ${st.step}: sidebar highlights item ${st.cur} (off-by-${st.step - st.cur})`);
    if (st.pfill < maxPfill - 1) issues.push(`step ${st.step}: progress bar went backwards ${maxPfill}%→${st.pfill}%`);
    maxPfill = Math.max(maxPfill, st.pfill);
    if (!curSeq.length || curSeq[curSeq.length - 1] !== st.cur) curSeq.push(st.cur);

    if (/Lesson complete|Worth one more pass/i.test(txt)) { finished = true; break; }
    const fields = page.locator('textarea:visible,input:visible');
    for (let i = 0; i < await fields.count(); i++) {
      const f = fields.nth(i);
      if (!(await f.inputValue())) await f.fill('The text gives a clear detail that supports this idea.');
    }
    const buttons = page.getByRole('button');
    const count = await buttons.count(), candidates = [];
    for (let i = 0; i < count; i++) {
      const b = buttons.nth(i), name = clean(await b.innerText());
      const box = await b.boundingBox();
      if (await b.isVisible() && await b.isEnabled() && !navRx.test(name) && box && box.x > 280) candidates.push({ b, name });
    }
    const id = identity(txt), used = tried.get(id) || new Set();
    const choice = candidates.find(x => !used.has(x.name));
    if (choice) {
      used.add(choice.name); tried.set(id, used);
      if (process.env.DEBUG_STUCK) console.log(`  [click t${turn} s${st.step}] "${choice.name.slice(0, 30)}" id="${id.slice(0, 60)}"`);
      await choice.b.click(); await page.waitForTimeout(1500); continue;
    }
    if (process.env.DEBUG_STUCK) console.log(`  [noclick t${turn} s${st.step}] cand=[${candidates.map(c => c.name.slice(0, 15)).join(',')}] used=${used.size} id="${id.slice(0, 60)}"`);
    // Non-button clickables (e.g. <div onclick> myth cards): try untried ones.
    const clickables = page.locator('.main [onclick]:not(button):visible');
    const cc = await clickables.count();
    let clickedDiv = false;
    for (let i = 0; i < cc && !clickedDiv; i++) {
      const c = clickables.nth(i), cname = 'div:' + clean(await c.innerText()).slice(0, 60);
      if (!used.has(cname)) { used.add(cname); tried.set(id, used); await c.click(); await page.waitForTimeout(700); clickedDiv = true; }
    }
    if (clickedDiv) { stuckCount = 0; continue; }
    const nx = page.getByRole('button', { name: /^Next/i });
    if (await nx.count() && await nx.isEnabled()) { await nx.click(); await page.waitForTimeout(250); stuckCount = 0; continue; }
    const st2 = page.getByRole('button', { name: /Start lesson/i });
    if (await st2.count() && await st2.isVisible()) { await st2.click(); await page.waitForTimeout(600); continue; }
    if (++stuckCount < 3) { await page.waitForTimeout(800); continue; }
    if (process.env.DEBUG_STUCK) {
      for (let i = 0; i < count; i++) {
        const b = buttons.nth(i), box = await b.boundingBox();
        console.log('  [btn]', JSON.stringify({ t: clean(await b.innerText()).slice(0, 40), vis: await b.isVisible(), en: await b.isEnabled(), x: box && Math.round(box.x) }));
      }
      console.log('  [main]', clean(txt).slice(0, 200));
    }
    issues.push(`stuck at step ${st.step} — no usable control`);
    break;
  }
  if (!finished) issues.push('never reached done screen');
  if (finished) {
    const st = await sidebarState();
    if (st.pfill < 99) issues.push(`done screen but progress bar at ${st.pfill}%`);
    // done-item click navigates back, then we can return forward
    if (st.done.length) {
      const before = st.step;
      await page.locator('.toc-item').first().click();
      await page.waitForTimeout(200);
      const back = await sidebarState();
      if (back.step !== 0) issues.push(`clicking done TOC item 0 landed on step ${back.step}, not 0`);
      else {
        await page.locator('.toc-item').nth(before).click();
        await page.waitForTimeout(200);
        const fwd = await sidebarState();
        if (fwd.step !== before) issues.push(`could not return forward to step ${before} (got ${fwd.step})`);
      }
    } else issues.push('done screen but no TOC items marked done');
    // Blind play usually scores <80%, so the lesson rightly withholds progress.
    // Invoke the lesson's own writer directly to verify the key path.
    const store = await page.evaluate(() => {
      if (typeof markCourseDone === 'function') markCourseDone();
      const o = {};
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/progress/.test(k)) o[k] = localStorage.getItem(k); }
      return o;
    });
    if (!Object.keys(store).length) issues.push('markCourseDone() wrote no progress key to localStorage');
    else issuesMeta.store = store;
  }
  await context.close();

  // --- mobile: sidebar must collapse, lesson must start
  const mctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const mp = await mctx.newPage();
  mp.on('pageerror', e => jsErrors.push('mobile: ' + String(e).slice(0, 150)));
  await mp.goto('file:///' + path.join(process.cwd(), file).replace(/\\/g, '/'));
  const ms = mp.getByRole('button', { name: /Start lesson/i });
  if (await ms.count()) { await ms.click(); await mp.waitForTimeout(200); }
  const mob = await mp.evaluate(() => {
    const side = document.querySelector('.side');
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return { sideHeight: side ? side.getBoundingClientRect().height : -1, overflow, vw: document.documentElement.clientWidth };
  });
  if (mob.overflow) issues.push('mobile 390px: horizontal overflow');
  if (mob.sideHeight > 400) issues.push(`mobile 390px: sidebar still ${Math.round(mob.sideHeight)}px tall — not collapsed`);
  await mctx.close();

  if (jsErrors.length) issues.push('JS errors: ' + [...new Set(jsErrors)].slice(0, 3).join(' | '));
  return { file, pass: !issues.length, issues, titles: meta.titles || [], store: issuesMeta.store };
}

const issuesMeta = {};
(async () => {
  const browser = await chromium.launch({ headless: true });
  let failed = 0;
  for (const file of process.argv.slice(2)) {
    issuesMeta.store = undefined;
    try {
      const r = await auditLesson(browser, file);
      if (!r.pass) failed++;
      console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + file);
      r.issues.forEach(i => console.log('        - ' + i));
      if (process.env.SHOW_TOC) r.titles.forEach(t => console.log('        toc: ' + t));
      if (r.store) console.log('        progress: ' + JSON.stringify(r.store).slice(0, 200));
    } catch (e) {
      failed++; console.log('ERROR ' + file + ' — ' + String(e).slice(0, 200));
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
