import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp, collection, deleteDoc, deleteField, doc, getDoc, getDocs, query,
  runTransaction, serverTimestamp, setDoc, where, writeBatch
} from 'firebase/firestore';

import { keepFirstAnswer } from '../www/js/backend.js';

const projectId = 'demo-hanbando-school';
let env;
const db = uid => env.authenticatedContext(uid).firestore();
const fromNow = minutes => Timestamp.fromMillis(Date.now() + minutes * 60_000);
const inquiryId = 'alice_' + '0'.repeat(32);

async function fixture(callback) {
  await env.withSecurityRulesDisabled(async context => callback(context.firestore()));
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') }
  });
});
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await fixture(async admin => {
    const batch = writeBatch(admin);
    for (const uid of ['alice', 'bob']) batch.set(doc(admin, 'users', uid), { name: '가상 참가자', consent: true });
    for (const uid of ['operator-one', 'operator-two']) batch.set(doc(admin, 'staff', uid), { label: '가상 운영진' });
    for (const [n, opens, closes] of [[1, -30, 30], [2, 2, 60], [3, -60, -2]]) {
      batch.set(doc(admin, 'courseSchedule', String(n)), { opensAt: fromNow(opens), closesAt: fromNow(closes) });
    }
    batch.set(doc(admin, 'courseSchedule', 'deep'), { closesAt: fromNow(30) });
    await batch.commit();
  });
});

const attend = (store, uid, lecture, method = 'online', by) => setDoc(doc(store, 'attendance', lecture + '_' + uid), {
  uid, lecture, method, at: serverTimestamp(), ...(by ? { by } : {})
});

test('출석은 서버 시각과 회차를 검사하고 본인과 운영진에게만 보여준다', async () => {
  const alice = db('alice'), bob = db('bob');
  await assertFails(attend(alice, 'alice', 2));
  await assertFails(attend(alice, 'alice', 3));
  await assertFails(attend(alice, 'alice', 6));
  await assertFails(attend(bob, 'alice', 1));
  await assertFails(setDoc(doc(alice, 'attendance', '1_alice'), {
    uid: 'alice', lecture: 1, method: 'online', at: fromNow(-2)
  }));
  await assertSucceeds(attend(alice, 'alice', 1));
  await assertFails(getDoc(doc(bob, 'attendance', '1_alice')));
  await assertFails(getDocs(collection(alice, 'attendance')));
  const own = query(collection(alice, 'attendance'), where('uid', '==', 'alice'));
  assert.equal((await assertSucceeds(getDocs(own))).size, 1);
  await assertFails(setDoc(doc(alice, 'courseSchedule', '1'), { opensAt: fromNow(-60), closesAt: fromNow(90) }));
});

test('두 기기와 운영진이 같은 출석을 처리해도 회차 문서는 하나만 남는다', async () => {
  const clients = [['alice', 'online'], ['alice', 'online'], ['operator-one', 'qr']];
  const results = await Promise.all(clients.map(([account, method]) => {
    const store = db(account), ref = doc(store, 'attendance', '1_alice');
    return runTransaction(store, async transaction => {
      if ((await transaction.get(ref)).exists()) return 'existing';
      transaction.set(ref, {
        uid: 'alice', lecture: 1, method, at: serverTimestamp(),
        ...(method === 'qr' ? { by: account } : {})
      });
      return 'created';
    });
  }));
  assert.deepEqual(results.sort(), ['created', 'existing', 'existing']);
});

test('문의 재전송은 같은 문서를 사용하고 답변 동시 저장은 첫 운영진만 성공한다', async () => {
  const alice = db('alice'), inquiry = doc(alice, 'questions', inquiryId);
  const send = () => runTransaction(alice, async transaction => {
    if (!(await transaction.get(inquiry)).exists()) {
      transaction.set(inquiry, { uid: 'alice', text: '가상 문의', status: 'open', at: serverTimestamp() });
      return true;
    }
    return false;
  });
  assert.ok(await send());
  assert.equal(await send(), false);
  await assertFails(getDoc(doc(db('bob'), 'questions', inquiryId)));
  await assertFails(getDoc(doc(db('bob'), 'questions', 'alice_' + '1'.repeat(32))));
  await assertFails(getDocs(collection(alice, 'questions')));
  const own = query(collection(alice, 'questions'), where('uid', '==', 'alice'));
  assert.equal((await assertSucceeds(getDocs(own))).size, 1);
  const answers = await Promise.all(['operator-one', 'operator-two'].map(uid => {
    const staff = db(uid), ref = doc(staff, 'questions', inquiryId);
    return keepFirstAnswer(() => runTransaction(staff, async transaction => {
      if ((await transaction.get(ref)).data().answer) return null;
      transaction.update(ref, { answer: uid, answeredAt: serverTimestamp(), answeredBy: uid, status: 'answered' });
      return uid;
    }), () => getDoc(ref));
  }));
  const [winner] = answers.filter(Boolean);
  assert.equal(answers.filter(Boolean).length, 1);
  assert.equal((await getDoc(inquiry)).data().answer, winner);
});

test('공지는 대상에 맞게 조회하고 동일 계정만 읽음 기록을 공유한다', async () => {
  await fixture(async admin => {
    await setDoc(doc(admin, 'notices', 'public'), { audience: 'all' });
    await setDoc(doc(admin, 'notices', 'private'), { audience: 'deep' });
    await setDoc(doc(admin, 'deepApps', 'alice'), { uid: 'alice', status: 'selected', seat: 1 });
  });
  const alice = db('alice'), bob = db('bob');
  const publicOnly = query(collection(bob, 'notices'), where('audience', '==', 'all'));
  const candidates = store => query(collection(store, 'notices'), where('audience', '==', 'deep'));
  assert.equal((await assertSucceeds(getDocs(publicOnly))).size, 1);
  assert.equal((await assertSucceeds(getDocs(candidates(alice)))).size, 1);
  await assertFails(getDocs(candidates(bob)));
  await assertFails(getDocs(collection(bob, 'notices')));
  const marker = store => doc(store, 'users', 'alice', 'inboxReads', 'n_private');
  await assertSucceeds(setDoc(marker(alice), { at: serverTimestamp() }));
  assert.equal((await assertSucceeds(getDoc(marker(db('alice'))))).exists(), true);
  await assertFails(getDoc(marker(bob)));
  await assertFails(deleteDoc(marker(bob)));
  await assertSucceeds(deleteDoc(marker(alice)));
});

test('40번째 좌석 경쟁에서 한 명만 선발되고 취소와 탈퇴는 같은 작업에서 좌석을 해제한다', async () => {
  await fixture(async admin => {
    const batch = writeBatch(admin);
    for (let n = 1; n < 40; n++) batch.set(doc(admin, 'deepSeats', String(n)), { uid: 'dummy-' + n, seat: n });
    for (const uid of ['alice', 'bob']) batch.set(doc(admin, 'deepApps', uid), { uid, status: 'submitted' });
    await batch.commit();
  });
  const selectLast = (staff, uid) => runTransaction(staff, async transaction => {
    const seat = doc(staff, 'deepSeats', '40');
    if ((await transaction.get(seat)).exists()) return false;
    transaction.set(seat, { uid, seat: 40 });
    transaction.update(doc(staff, 'deepApps', uid), { status: 'selected', seat: 40, decidedAt: serverTimestamp() });
    return true;
  });
  const staff = db('operator-one');
  const results = await Promise.all([selectLast(staff, 'alice'), selectLast(db('operator-two'), 'bob')]);
  assert.equal(results.filter(Boolean).length, 1);
  const [winner, other] = results[0] ? ['alice', 'bob'] : ['bob', 'alice'];
  await assertFails(deleteDoc(doc(db(winner), 'deepApps', winner)));
  await assertFails(deleteDoc(doc(staff, 'deepSeats', '40')));
  const cancel = writeBatch(staff);
  cancel.update(doc(staff, 'deepApps', winner), { status: 'rejected', seat: deleteField(), decidedAt: serverTimestamp() });
  cancel.delete(doc(staff, 'deepSeats', '40'));
  await assertSucceeds(cancel.commit());
  assert.ok(await selectLast(staff, other));
  const participant = db(other), withdraw = writeBatch(participant);
  withdraw.delete(doc(participant, 'deepApps', other));
  withdraw.delete(doc(participant, 'deepSeats', '40'));
  await assertSucceeds(withdraw.commit());
  assert.equal((await getDoc(doc(staff, 'deepSeats', '40'))).exists(), false);
});
