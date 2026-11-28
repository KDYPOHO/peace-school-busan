import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { extname, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { chromium, devices, webkit } from 'playwright';

const project = 'demo-hanbando-school';
const participant = 'participant@example.invalid';
const operator = 'operator@example.invalid';
const password = 'LocalBrowserFixture-132';
const firestore = `http://127.0.0.1:8182/v1/projects/${project}/databases/(default)/documents`;
const root = resolve('www');
const types = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json'
};

async function serveApp() {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    try {
      assert.ok(file.startsWith(root + sep));
      const bytes = await readFile(file);
      response.writeHead(200, {
        'Content-Type': types[extname(file)] || 'application/octet-stream',
        'Content-Length': bytes.length
      });
      response.end(bytes);
    } catch {
      response.statusCode = 404;
      response.end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, url: `http://127.0.0.1:${server.address().port}/?emulator=127.0.0.1` };
}

async function seedOperator() {
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9182');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8182');
  const auth = 'http://127.0.0.1:9182/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key';
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };
  const signup = await fetch(auth, { method: 'POST', headers,
    body: JSON.stringify({ email: operator, password, returnSecureToken: true }) });
  assert.ok(signup.ok, `Fixture account failed (${signup.status})`);
  const { localId } = await signup.json();
  const staff = await fetch(firestore + '/staff/' + localId, { method: 'PATCH', headers,
    body: JSON.stringify({ fields: { label: { stringValue: '가상 운영진' } } }) });
  assert.ok(staff.ok, `Fixture staff role failed (${staff.status})`);
}

async function openFixtureLecture() {
  const minute = 60_000;
  const start = Date.now() + 15 * minute;
  const end = start + 120 * minute;
  const times = { start, end, opensAt: start - 30 * minute, closesAt: end + 60 * minute };
  const fields = Object.fromEntries(Object.entries(times).map(([key, value]) => [
    key, { timestampValue: new Date(value).toISOString() }
  ]));
  const result = await fetch(firestore + '/courseSchedule/1', {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  assert.ok(result.ok, `Fixture schedule failed (${result.status})`);
}

async function openPage(browser, device, url, options = {}) {
  const context = await browser.newContext({ ...device, reducedMotion: 'reduce', locale: 'ko-KR', ...options });
  context.setDefaultTimeout(12_000);
  await context.route('**/*', route =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => console.error('App JavaScript error:', error.message));
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200);
  await page.locator('#splash').waitFor({ state: 'hidden' });
  return { context, page };
}

async function signIn(page, email, signup = false) {
  if (signup) await page.locator('#swBtn').click();
  await page.locator('#aEmail').fill(email);
  await page.locator('#aPw').fill(password);
  if (signup) await page.locator('#aPw2').fill(password);
  await page.locator('#aBtn').click();
}

async function enroll(page) {
  await signIn(page, participant, true);
  await page.locator('#oName').fill('가상 검증 참가자');
  await page.locator('#oBirth').selectOption('2000');
  await page.locator('#oNext').click();
  await page.locator('#oRegion').selectOption('부산');
  await page.locator('#oOrgR').selectOption('해당 없음 (일반 청년)');
  await page.locator('#oType').selectOption('일반 청년');
  await page.locator('#oNext').click();
  for (const field of ['#oT', '#oC1', '#oC2']) await page.locator(field).check();
  await page.locator('#oNext').click();
  await page.getByRole('heading', { name: '가입 승인 대기' }).waitFor();
  await page.locator('.success').waitFor({ state: 'hidden' });
}

async function reply(page, question, answer) {
  const card = page.locator('.inquiry-card article').filter({ hasText: question });
  const editor = card.locator('textarea');
  const send = card.locator('button[type="submit"]');
  await editor.waitFor();
  assert.equal(await editor.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');

  const compact = page.viewportSize();
  const view = page.locator('main[data-view=noti]');
  assert.equal(await view.evaluate(el => getComputedStyle(el).display), 'flex');
  const initialScale = await page.evaluate(() => window.visualViewport.scale);
  await editor.tap();
  await editor.tap();
  await editor.fill(answer);
  assert.equal(await editor.evaluate(el => el === document.activeElement), true);
  assert.ok(await editor.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16));
  assert.equal(await page.evaluate(() => window.visualViewport.scale), initialScale);

  await page.setViewportSize({ width: 1024, height: 768 });
  assert.equal(await view.evaluate(el => getComputedStyle(el).display), 'grid');
  const columns = await view.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  assert.equal(columns, 2);
  await page.setViewportSize(compact);
  assert.equal(await view.evaluate(el => getComputedStyle(el).display), 'flex');
  assert.equal(await editor.inputValue(), answer);
  await editor.focus();
  await page.keyboard.press('Tab');
  assert.equal(await send.evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Enter');
  await card.waitFor({ state: 'hidden' });
}

async function checkReply(reader, other, question, answer) {
  await reader.locator('#bellDot').waitFor();
  await other.locator('#bellDot').waitFor();
  await reader.locator('#bellBtn').click();
  await reader.locator('[data-inbox-index]').filter({ hasText: question }).click();
  await reader.getByText(answer, { exact: true }).waitFor();
  await other.locator('#bellDot').waitFor({ state: 'hidden' });
}

test('Chromium과 WebKit에서 참가자 신청, 문의 답변, 읽음 상태를 공유한다', { timeout: 150_000 }, async t => {
  await seedOperator();
  const { server, url } = await serveApp();
  t.after(() => { server.close(); server.closeAllConnections(); });
  const chrome = await chromium.launch();
  t.after(() => chrome.close());
  const safari = await webkit.launch();
  t.after(() => safari.close());

  const android = await openPage(chrome, devices['Pixel 5'], url);
  await enroll(android.page);
  const apple = await openPage(safari, devices['iPhone 13'], url);
  await signIn(apple.page, participant);
  await apple.page.locator('#approvalPending').waitFor();
  for (const { page } of [android, apple]) {
    assert.equal(await page.locator('[data-tab=att]').count(), 0);
  }
  const appleStaff = await openPage(safari, devices['iPhone 13'], url, { colorScheme: 'dark' });
  await signIn(appleStaff.page, operator);
  await appleStaff.page.locator('#roleA').click();

  await appleStaff.page.locator('[data-tab=people]').click();
  await appleStaff.page.getByRole('button', { name: '승인', exact: true }).click();
  await appleStaff.page.getByRole('button', { name: '승인하기', exact: true }).click();
  await Promise.all([android.page, apple.page].map(page => page.locator('[data-tab=att]').waitFor()));
  t.diagnostic('새 계정은 두 앱에서 대기하고 운영진 승인 한 번으로 두 앱에서 입장됨');
  await appleStaff.page.locator('[data-tab=noti]').click();
  for (const { page } of [android, apple]) {
    await page.locator('[data-view=home] [data-go=att]').click();
    await page.locator('.qr-pass svg').waitFor();
  }
  const enrollment = await android.page.getByText(/^수강번호 BS27-/).textContent();
  assert.equal(await apple.page.getByText(/^수강번호 BS27-/).textContent(), enrollment);
  t.diagnostic('Chromium 신청이 WebKit에서 같은 수강번호와 QR로 표시됨');

  const firstQuestion = 'Chromium에서 보낸 가상 문의';
  const firstAnswer = 'WebKit에서 남긴 가상 답변';
  await android.page.locator('#attendanceHelp').click();
  const draft = android.page.locator('#helpText');
  await draft.fill(firstQuestion);
  await android.context.setOffline(true);
  await android.page.locator('#helpForm button[type=submit]').click();
  await android.page.locator('#helpError').waitFor();
  assert.equal(await draft.inputValue(), firstQuestion);
  await android.context.setOffline(false);
  await android.page.locator('#helpForm button[type=submit]').click();
  await android.page.getByText(firstQuestion, { exact: true }).waitFor();
  await reply(appleStaff.page, firstQuestion, firstAnswer);
  await checkReply(android.page, apple.page, firstQuestion, firstAnswer);
  t.diagnostic('오프라인 문의 초안을 재전송하고 WebKit에서 답변한 뒤 읽음 상태가 동기화됨');

  const androidStaff = await openPage(chrome, devices['Pixel 5'], url, { colorScheme: 'dark' });
  await signIn(androidStaff.page, operator);
  await androidStaff.page.locator('#roleA').click();
  await androidStaff.page.locator('[data-tab=noti]').click();
  const secondQuestion = 'WebKit에서 보낸 두 번째 가상 문의';
  const secondAnswer = 'Chromium에서 남긴 두 번째 가상 답변';
  await apple.page.locator('[data-tab=ai]').click();
  await apple.page.locator('#helpText').fill(secondQuestion);
  await apple.page.locator('#helpForm button[type=submit]').click();
  await reply(androidStaff.page, secondQuestion, secondAnswer);
  await checkReply(apple.page, android.page, secondQuestion, secondAnswer);
  t.diagnostic('WebKit 참가자와 Chromium 운영진으로 바꿔도 동기화됨');

  const participants = [android.page, apple.page];
  for (const page of participants) {
    await page.locator('[data-tab=att]').click();
    assert.equal(await page.locator('#onlineBtn').isEnabled(), false);
  }
  await openFixtureLecture();
  const buttons = participants.map(page => page.getByRole('button', { name: '온라인 출석하기', exact: true }));
  await Promise.all(buttons.map(button => button.waitFor()));
  await Promise.all(buttons.map(button => button.evaluate(el => el.click())));
  await Promise.all(participants.map(page => page.getByRole('button', { name: '출석 완료', exact: true }).waitFor()));
  const attendance = await fetch(firestore + '/attendance', { headers: { Authorization: 'Bearer owner' } });
  assert.ok(attendance.ok);
  const { documents } = await attendance.json();
  assert.equal(documents.length, 1);
  assert.equal(documents[0].fields.method.stringValue, 'online');
  t.diagnostic('서버에서 연 강의에 두 브라우저로 동시에 출석해도 한 건만 저장됨');
});
