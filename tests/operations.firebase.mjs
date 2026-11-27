import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp, collection, deleteDoc, deleteField, doc, getDoc, getDocs, query,
  runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch
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

test('새 가입은 운영진이 한 번 승인할 때까지 과정 데이터에 접근할 수 없다', async () => {
  const uid = 'new-applicant', applicant = db(uid), staff = db('operator-one');
  const profile = doc(applicant, 'users', uid);
  const ownQuestion = doc(applicant, 'questions', uid + '_' + '1'.repeat(32));
  const inquiry = { uid, text: '승인 확인 문의', status: 'open', at: serverTimestamp() };
  const approve = (store, by) => updateDoc(doc(store, 'users', uid), {
    approvalStatus: 'approved', approvedBy: by, approvedAt: serverTimestamp()
  });

  await assertFails(getDoc(doc(applicant, 'courseSchedule', '1')));
  await assertFails(setDoc(profile, { name: '가상 신규 참가자', consent: true }));
  await assertFails(setDoc(profile, { name: '가상 신규 참가자', consent: true, approvalStatus: 'approved' }));
  await assertSucceeds(setDoc(profile, { name: '가상 신규 참가자', consent: true, approvalStatus: 'pending' }));
  assert.equal((await getDoc(profile)).data().approvalStatus, 'pending');
  await assertFails(approve(applicant, uid));
  await assertFails(deleteDoc(doc(applicant, 'staff', uid)));
  await assertFails(setDoc(doc(applicant, 'staff', uid), { label: '가상 운영진' }));
  await assertFails(setDoc(doc(staff, 'staff', uid), { label: '가입 승인 전' }));
  await assertFails(getDocs(collection(applicant, 'notices')));
  await assertFails(getDoc(doc(applicant, 'deepApps', uid)));
  await assertFails(setDoc(ownQuestion, inquiry));
  await assertFails(attend(applicant, uid, 1));
  await assertFails(attend(staff, uid, 1, 'manual', 'operator-one'));
  await assertFails(approve(staff, 'operator-two'));
  await assertSucceeds(approve(staff, 'operator-one'));
  await assertFails(approve(db('operator-two'), 'operator-two'));
  const approved = (await getDoc(profile)).data();
  assert.equal(approved.approvalStatus, 'approved');
  assert.equal(approved.approvedBy, 'operator-one');
  await assertSucceeds(getDoc(doc(applicant, 'courseSchedule', '1')));
  await assertSucceeds(setDoc(ownQuestion, inquiry));
  await assertSucceeds(attend(applicant, uid, 1));
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

test('이전 앱은 전체 공지를 조회하고 심화 공지는 선발자와 운영진만 읽는다', async () => {
  await fixture(async admin => {
    await setDoc(doc(admin, 'notices', 'legacy'), { title: '가상 기존 공지' });
    await setDoc(doc(admin, 'deepApps', 'alice'), { uid: 'alice', status: 'selected', seat: 1 });
  });
  const alice = db('alice'), bob = db('bob'), staff = db('operator-one');
  await assertSucceeds(setDoc(doc(staff, 'notices', 'public'), { audience: 'all' }));
  await assertSucceeds(setDoc(doc(staff, 'deepNotices', 'private'), { audience: 'deep' }));
  await assertFails(setDoc(doc(staff, 'notices', 'misrouted-private'), { audience: 'deep' }));
  await assertFails(setDoc(doc(staff, 'deepNotices', 'misrouted-public'), { audience: 'all' }));
  await assertFails(setDoc(doc(bob, 'notices', 'public'), { audience: 'all' }));
  const guest = env.unauthenticatedContext().firestore();
  await assertFails(getDocs(collection(guest, 'notices')));
  await assertFails(getDocs(collection(guest, 'deepNotices')));
  const publicNotices = collection(bob, 'notices');
  assert.deepEqual((await assertSucceeds(getDocs(publicNotices))).docs.map(item => item.id).sort(), ['legacy', 'public']);
  const privateNotices = store => collection(store, 'deepNotices');
  assert.equal((await assertSucceeds(getDocs(privateNotices(alice)))).size, 1);
  assert.equal((await assertSucceeds(getDocs(privateNotices(staff)))).size, 1);
  await assertFails(getDocs(privateNotices(bob)));
  await assertFails(getDoc(doc(bob, 'deepNotices', 'private')));
  const marker = store => doc(store, 'users', 'alice', 'inboxReads', 'd_private');
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
