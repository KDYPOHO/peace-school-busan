import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential,
  deleteUser
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, getDocFromServer, runTransaction,
  serverTimestamp, setDoc, deleteDoc
} from 'firebase/firestore';
import { deleteAccountInOrder } from '../www/js/account-deletion.js';

const projectId = 'demo-hanbando-school';
const app = initializeApp({ projectId, apiKey: 'demo-api-key' }, 'reconnect');
after(() => deleteApp(app));

test('통신이 끊긴 문의를 동일한 요청으로 보내고 재인증 실패 후 안전하게 탈퇴한다', async () => {
  const auth = getAuth(app);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const [firestoreHost, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectAuthEmulator(auth, 'http://' + authHost, { disableWarnings: true });
  const store = getFirestore(app);
  connectFirestoreEmulator(store, firestoreHost, Number(port));
  const email = 'psb-reconnect@example.invalid', password = 'Emulator-only-pass';
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = user;
  const profile = doc(store, 'users', uid);
  const question = doc(store, 'questions', uid + '_' + '7'.repeat(32));
  const marker = doc(store, 'users', uid, 'inboxReads', 'n_read');
  await setDoc(profile, { name: '가상 참가자', consent: true });
  const send = () => runTransaction(store, async tx => {
    if ((await tx.get(question)).exists()) return false;
    tx.set(question, { uid, at: serverTimestamp(), text: '통신 시험', status: 'open' });
    return true;
  }, { maxAttempts: 1 });
  // Commit reached the server before the connection dropped and the client retries the same request.
  await assert.rejects(async () => {
    assert.equal(await send(), true);
    throw new Error('lost acknowledgement');
  }, /lost acknowledgement/);
  assert.equal(await send(), false);
  await setDoc(marker, { at: serverTimestamp() });
  const remove = candidate => deleteAccountInOrder({
    reauthenticate: () => reauthenticateWithCredential(user, EmailAuthProvider.credential(email, candidate)),
    async deleteRecords() {
      await deleteDoc(marker);
      await deleteDoc(question);
      await deleteDoc(profile);
      assert.equal((await getDocFromServer(marker)).exists(), false);
    },
    deleteLogin: () => deleteUser(user)
  });
  await assert.rejects(remove('invalid-password'));
  assert.equal((await getDocFromServer(marker)).exists(), true);
  assert.equal((await getDocFromServer(question)).exists(), true);
  await remove(password);
  assert.equal(auth.currentUser, null);
});
