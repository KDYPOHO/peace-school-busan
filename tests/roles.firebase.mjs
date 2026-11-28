import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

// 1.5.0: 관리자/운영진/심사위원 권한, 가입 승인·반려·보류, 현장 정원 대기, 심화 자격
const projectId = 'demo-hanbando-school';
let env;
const db = uid => env.authenticatedContext(uid).firestore();
const fromNow = minutes => Timestamp.fromMillis(Date.now() + minutes * 60_000);
const fixture = callback => env.withSecurityRulesDisabled(async context => callback(context.firestore()));

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
    batch.set(doc(admin, 'staff', 'legacy-admin'), { label: '역할 없는 기존 운영진' });
    batch.set(doc(admin, 'staff', 'chief'), { label: '관리자', role: 'admin' });
    batch.set(doc(admin, 'staff', 'operator'), { label: '운영진', role: 'staff' });
    batch.set(doc(admin, 'staff', 'judge'), { label: '심사위원', role: 'judge' });
    for (const uid of ['alice', 'bob']) batch.set(doc(admin, 'users', uid), { name: '가상 참가자', consent: true, mode: 'online' });
    batch.set(doc(admin, 'users', 'waiting'), { name: '가상 신청자', consent: true, approvalStatus: 'pending', mode: 'onsite' });
    batch.set(doc(admin, 'courseSchedule', 'deep'), { closesAt: fromNow(30) });
    await batch.commit();
  });
});

test('심사위원은 참가자 개인정보를 볼 수 없고 자기 점수만 쓴다', async () => {
  const judge = db('judge');
  await assertFails(getDoc(doc(judge, 'users', 'alice')));
  await assertFails(getDocs(collection(judge, 'users')));
  await assertFails(getDocs(collection(judge, 'attendance')));
  await assertFails(getDocs(collection(judge, 'questions')));
  await assertFails(getDocs(collection(judge, 'staff')));
  await assertSucceeds(getDoc(doc(judge, 'staff', 'judge')));
  const score = { round: '예선', team: '1팀', crit: { 독창성: 8 }, judge: 'judge', at: serverTimestamp() };
  await assertSucceeds(setDoc(doc(judge, 'scores', '예선_1팀_judge'), score));
  await assertSucceeds(getDocs(collection(judge, 'scores')));
  await assertFails(setDoc(doc(judge, 'scores', '예선_1팀_operator'), { ...score, judge: 'operator' }));
  await assertFails(setDoc(doc(judge, 'scores', '예선_2팀_judge'), { ...score, team: '2팀', extra: 1 }));
  await assertFails(setDoc(doc(db('alice'), 'scores', '예선_1팀_alice'), { ...score, judge: 'alice' }));
  // 심사위원은 출석·공지 처리 불가
  await assertFails(setDoc(doc(judge, 'notices', 'n1'), { title: '공지', audience: 'all' }));
});

test('운영진 지정·해제는 관리자만, 역할 없는 기존 문서는 관리자로 본다', async () => {
  const add = (uid, store, role) => setDoc(doc(store, 'staff', uid), { label: '가상', role });
  await assertFails(add('alice', db('operator'), 'staff'));
  await assertFails(add('alice', db('judge'), 'judge'));
  await assertSucceeds(add('alice', db('chief'), 'judge'));
  await assertSucceeds(add('bob', db('legacy-admin'), 'staff'));
  await assertFails(add('bob', db('chief'), 'owner'));
  await assertFails(updateDoc(doc(db('operator'), 'staff', 'operator'), { role: 'admin' }));
  await assertFails(deleteDoc(doc(db('operator'), 'staff', 'judge')));
  await assertFails(deleteDoc(doc(db('chief'), 'staff', 'chief')));
  await assertSucceeds(deleteDoc(doc(db('chief'), 'staff', 'judge')));
  // 운영진은 참가자 명단을 계속 볼 수 있음
  await assertSucceeds(getDocs(collection(db('operator'), 'users')));
});

test('가입은 승인·반려·보류할 수 있고 보류 뒤에도 다시 결정한다', async () => {
  const staff = db('operator');
  const decide = (store, status, extra = {}) => updateDoc(doc(store, 'users', 'waiting'), {
    approvalStatus: status, approvedAt: serverTimestamp(), approvedBy: 'operator', approvalNote: '소속 확인 필요', ...extra
  });
  await assertFails(decide(db('judge'), 'approved', { approvedBy: 'judge' }));
  await assertFails(decide(staff, 'deleted'));
  await assertSucceeds(decide(staff, 'hold'));
  await assertFails(getDoc(doc(db('waiting'), 'courseSchedule', 'deep')));
  await assertSucceeds(decide(staff, 'approved', { onsiteWaitlist: true }));
  // 승인된 뒤에는 다시 반려로 돌릴 수 없음
  await assertFails(decide(staff, 'rejected'));
  await assertSucceeds(getDoc(doc(db('waiting'), 'courseSchedule', 'deep')));
});

test('현장 대기 표시는 본인이 지울 수 없고 정원이 차면 현장 전환은 대기로만', async () => {
  const alice = db('alice');
  await assertSucceeds(setDoc(doc(db('operator'), 'stats', 'onsite'), { count: 100, cap: 100, full: true, at: serverTimestamp() }));
  await assertFails(setDoc(doc(alice, 'stats', 'onsite'), { count: 0, cap: 100, full: false }));
  await assertSucceeds(getDoc(doc(alice, 'stats', 'onsite')));
  const profile = doc(alice, 'users', 'alice');
  await assertFails(updateDoc(profile, { name: '가상 참가자', mode: 'onsite' }));
  await assertSucceeds(updateDoc(profile, { name: '가상 참가자', mode: 'onsite', onsiteWaitlist: true }));
  await assertFails(updateDoc(profile, { name: '가상 참가자', onsiteWaitlist: false }));
  await assertSucceeds(updateDoc(doc(db('operator'), 'users', 'alice'), { onsiteWaitlist: false }));
});

test('심화 지원은 기본과정 4강 이상 출석자만', async () => {
  const app = { uid: 'alice', status: 'submitted', essay: '지원 동기', arrival: '부산역', at: serverTimestamp() };
  await fixture(async admin => {
    for (const n of [1, 2, 3]) await setDoc(doc(admin, 'attendance', n + '_alice'), { uid: 'alice', lecture: n, method: 'qr', at: Timestamp.now() });
  });
  await assertFails(setDoc(doc(db('alice'), 'deepApps', 'alice'), app));
  await fixture(admin => setDoc(doc(admin, 'attendance', '5_alice'), { uid: 'alice', lecture: 5, method: 'online', at: Timestamp.now() }));
  await assertSucceeds(setDoc(doc(db('alice'), 'deepApps', 'alice'), app));
});
