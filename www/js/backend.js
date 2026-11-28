import { DEEP, DEEP_APPLY_UNTIL, LECTURES } from "./config.js";
import { deleteAccountInOrder } from "./account-deletion.js";
import { lectureWindow } from "./course.js";
import { DEMO_ACCOUNTS, DEMO_NOW, demoSeed } from "./demo-seed.js";

const unavailable = () => Object.assign(new Error("Firebase configuration or connection unavailable"), { code: "unavailable" });
export function isApprovedProfile(profile) {
  return profile != null && (profile.approvalStatus === undefined || profile.approvalStatus === "approved");
}
export function newRequestId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, "0")).join("");
}
export async function keepFirstAnswer(save, readCurrent) {
  try {
    return await save();
  } catch (error) {
    if (error.code === "permission-denied" && (await readCurrent()).data()?.answer) return false;
    throw error;
  }
}
// 운영진 역할: admin(관리자) / staff(운영진) / judge(심사위원). role이 없는 기존 문서는 관리자
export const STAFF_ROLES = { admin: "관리자", staff: "운영진", judge: "심사위원" };
export function staffRoleOf(record) {
  if (!record) return "";
  return Object.prototype.hasOwnProperty.call(STAFF_ROLES, record.role || "admin") ? record.role || "admin" : "";
}
export const isNative = typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;

// 수강번호 = 계정 ID 앞 6자리 (보안 규칙이 같은 값만 허용해 남의 번호를 쓸 수 없다)
function makeNo(uid) {
  return `BS27-${String(uid || "").slice(0, 6).toUpperCase()}`;
}

/* ───────────────────────── Firebase ───────────────────────── */
async function firebaseBackend(settings, emulator) {
  const { initializeApp, Auth: A, Firestore: F } = await import("../vendor/firebase.js");
  const app = initializeApp(settings.firebase);
  const auth = isNative ? A.initializeAuth(app, { persistence: [A.indexedDBLocalPersistence, A.inMemoryPersistence] }) : A.getAuth(app);
  if (emulator) A.connectAuthEmulator(auth, `http://${emulator}:9182`, { disableWarnings: true });
  if (!isNative) await A.setPersistence(auth, A.browserLocalPersistence);
  auth.languageCode = "ko";
  const db = F.initializeFirestore(app, { localCache: F.memoryLocalCache() });
  if (emulator) F.connectFirestoreEmulator(db, emulator, 8182);
  const { doc, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, serverTimestamp } = F;
  const ts = () => serverTimestamp();
  const toMs = v => (v && v.toMillis ? v.toMillis() : (typeof v === "number" ? v : Date.now()));
  const rows = snap => snap.docs.map(d => ({ ...d.data(), id: d.id }));
  const questions = snap => rows(snap).map(row => ({
    ...row, at: row.at ? toMs(row.at) : 0, answeredAt: row.answeredAt ? toMs(row.answeredAt) : 0
  })).sort((a, b) => b.at - a.at);

  const read = ref => F.getDocFromServer(ref);
  const transaction = fn => F.runTransaction(db, fn);
  const ensureOnline = () => { if (!navigator.onLine) throw unavailable(); };
  const record = (uid, lecture, method, by) => {
    ensureOnline();
    const ref = doc(db, "attendance", `${lecture}_${uid}`);
    return transaction(async tx => {
      if ((await tx.get(ref)).exists()) return { duplicate: true };
      tx.set(ref, { uid, lecture, method, at: ts(), ...(by ? { by } : {}) });
      return { duplicate: false };
    });
  };
  const readRef = (uid, key) => doc(db, "users", uid, "inboxReads", key);
  const seatRef = seat => doc(db, "deepSeats", String(seat));
  const noticeCollection = audience => audience === "deep" ? "deepNotices" : "notices";

  const api = {
    mode: "firebase",
    environment: settings.mode,
    user: null,
    onAuth(cb) {
      return A.onAuthStateChanged(auth, u => {
        api.user = u ? { uid: u.uid, email: u.email || "", name: u.displayName || "" } : null;
        cb(api.user);
      });
    },
    canGoogle: !isNative,
    async signInGoogle() {
      const p = new A.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      try { await A.signInWithPopup(auth, p); }
      catch (e) {
        if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") await A.signInWithRedirect(auth, p);
        else throw e;
      }
    },
    async signInEmail(email, pw) { await A.signInWithEmailAndPassword(auth, email, pw); },
    async signUpEmail(email, pw) { await A.createUserWithEmailAndPassword(auth, email, pw); },
    async resetPassword(email) { await A.sendPasswordResetEmail(auth, email); },
    async signOut() { await A.signOut(auth); },
    accountDeletionMethod() {
      return auth.currentUser?.providerData.some(p => p.providerId === 'password') ? 'password' : 'google';
    },
    async deleteAccount(password) {
      const user = auth.currentUser;
      if (!user) throw Object.assign(new Error('Sign in again'), { code: 'auth/requires-recent-login' });
      const uid = user.uid;
      const method = api.accountDeletionMethod();
      await deleteAccountInOrder({
        async reauthenticate() {
          if (method === 'password') {
            await A.reauthenticateWithCredential(user, A.EmailAuthProvider.credential(user.email, password));
          } else {
            await A.reauthenticateWithPopup(user, new A.GoogleAuthProvider());
          }
        },
        async deleteRecords() {
          const profile = await api.getProfile();
          if (!isApprovedProfile(profile) && !(await api.isStaff())) {
            await deleteDoc(doc(db, "users", uid));
            return;
          }
          const application = doc(db, "deepApps", uid);
          await transaction(async tx => {
            const existing = (await tx.get(application)).data();
            if (!existing) return;
            if (Number.isInteger(existing.seat)) tx.delete(seatRef(existing.seat));
            tx.delete(application);
          });
          const snapshots = await Promise.all([
            ...['attendance', 'questions'].map(name =>
              F.getDocsFromServer(query(collection(db, name), where('uid', '==', uid)))),
            F.getDocsFromServer(collection(db, 'users', uid, 'inboxReads'))
          ]);
          const refs = snapshots.reduce((refs, snap) => refs.concat(snap.docs.map(item => item.ref)), []);
          refs.push(doc(db, 'users', uid));
          for (let offset = 0; offset < refs.length; offset += 400) {
            const batch = F.writeBatch(db);
            for (const ref of refs.slice(offset, offset + 400)) batch.delete(ref);
            await batch.commit();
          }
        },
        deleteLogin: () => A.deleteUser(user)
      });
    },

    async staffRole() {
      const snap = await read(doc(db, "staff", api.user.uid));
      return snap.exists() ? staffRoleOf(snap.data()) : "";
    },
    async isStaff() { return ["admin", "staff"].includes(await api.staffRole()); },
    async getProfile() {
      const s = await read(doc(db, "users", api.user.uid));
      return s.exists() ? { id: s.id, ...s.data() } : null;
    },
    watchOwnProfile(cb, onError) {
      return onSnapshot(doc(db, "users", api.user.uid), { includeMetadataChanges: true }, snap => {
        if (!snap.metadata.fromCache && !snap.metadata.hasPendingWrites) cb(snap.data() || null);
      }, onError);
    },
    async createProfile(p) {
      const ref = doc(db, "users", api.user.uid);
      const data = { ...p, no: makeNo(api.user.uid), email: api.user.email, consent: true, consentAt: ts(), createdAt: ts(), approvalStatus: "pending" };
      ensureOnline();
      return transaction(async tx => {
        const existing = (await tx.get(ref)).data();
        if (existing) return existing;
        tx.set(ref, data);
        return { ...data, consentAt: Date.now(), createdAt: Date.now() };
      });
    },
    // 가입 결정: approved(승인) / rejected(반려) / hold(보류). 대기·보류 상태에서만 바꿀 수 있음
    async decideProfile(uid, status, { note = "", waitlist = false } = {}) {
      ensureOnline();
      const ref = doc(db, "users", uid), approvedBy = api.user.uid;
      return transaction(async tx => {
        const profile = (await tx.get(ref)).data();
        if (!["pending", "hold"].includes(profile?.approvalStatus)) return false;
        const change = { approvalStatus: status, approvedAt: ts(), approvedBy, approvalNote: String(note).slice(0, 100) };
        if (status === "approved" && waitlist) change.onsiteWaitlist = true;
        tx.update(ref, change);
        return true;
      });
    },
    approveProfile(uid) { return api.decideProfile(uid, "approved"); },
    async setOnsiteWaitlist(uid, waitlist) { await updateDoc(doc(db, "users", uid), { onsiteWaitlist: waitlist }); },
    async setParticipantMode(uid, mode) { await updateDoc(doc(db, "users", uid), { mode, onsiteWaitlist: false }); },
    watchOnsiteStats(cb) {
      return onSnapshot(doc(db, "stats", "onsite"), snap => cb(snap.data() || null), () => cb(null));
    },
    async publishOnsiteStats(stat) { await setDoc(doc(db, "stats", "onsite"), { ...stat, at: ts() }); },
    async updateProfile(p) { await updateDoc(doc(db, "users", api.user.uid), { ...p, updatedAt: ts() }); },

    watchMyAttendance(cb) {
      return onSnapshot(query(collection(db, "attendance"), where("uid", "==", api.user.uid)),
        s => cb(rows(s).map(r => ({ ...r, at: toMs(r.at) }))), () => cb([]));
    },
    async checkInOnline(n) { return record(api.user.uid, n, "online"); },
    async recordAttendance(uid, n, method) { return record(uid, n, method, api.user.uid); },
    async removeAttendance(uid, n) { await deleteDoc(doc(db, "attendance", `${n}_${uid}`)); },
    watchAllAttendance(cb) {
      return onSnapshot(collection(db, "attendance"), s => cb(rows(s).map(r => ({ ...r, at: toMs(r.at) }))), () => cb([]));
    },
    watchUsers(cb) {
      return onSnapshot(collection(db, "users"), s => cb(rows(s).map(r => ({ ...r, uid: r.id, createdAt: toMs(r.createdAt) }))), () => cb([]));
    },
    async getUser(uid) { const s = await read(doc(db, "users", uid)); return s.exists() ? { uid, ...s.data() } : null; },
    async setMemberVerified(uid, v) { await updateDoc(doc(db, "users", uid), { memberVerified: v, verifiedBy: api.user.uid, verifiedAt: ts() }); },

    watchCourseSchedule(cb, onError) {
      return onSnapshot(collection(db, "courseSchedule"), { includeMetadataChanges: true }, snapshot => {
        if (snapshot.metadata.fromCache) return;
        const toTime = value => value instanceof F.Timestamp ? value.toMillis() : null;
        const lectures = {};
        let deepDeadline = null;
        snapshot.forEach(record => {
          const { start, end, opensAt, closesAt } = record.data();
          if (record.id === "deep") deepDeadline = toTime(closesAt);
          else if (/^[1-5]$/.test(record.id)) {
            lectures[record.id] = { start: toTime(start), end: toTime(end), opensAt: toTime(opensAt), closesAt: toTime(closesAt) };
          }
        });
        cb({ lectures, deepDeadline });
      }, onError);
    },
    async getDeepApp() { const s = await read(doc(db, "deepApps", api.user.uid)); return s.exists() ? s.data() : null; },
    async submitDeepApp(d) { await setDoc(doc(db, "deepApps", api.user.uid), { ...d, uid: api.user.uid, status: "submitted", at: ts() }); },
    async updateDeepApp(d) { await updateDoc(doc(db, "deepApps", api.user.uid), { essay: d.essay, arrival: d.arrival, updatedAt: ts() }); },
    watchDeepApps(cb) { return onSnapshot(collection(db, "deepApps"), s => cb(rows(s).map(r => ({ ...r, uid: r.id, at: toMs(r.at) }))), () => cb([])); },
    watchMyDeepApp(cb, onError) {
      return onSnapshot(doc(db, "deepApps", api.user.uid), snap => cb(snap.data() || null), onError);
    },
    async setDeepStatus(uid, status) {
      ensureOnline();
      const ref = doc(db, "deepApps", uid);
      return transaction(async tx => {
        const application = (await tx.get(ref)).data();
        if (!application) throw new Error("Application is no longer available");
        if (application.status === status) return;
        if (status === "selected") {
          let seat;
          for (let n = 1; n <= DEEP.cap; n++) {
            if (!(await tx.get(seatRef(n))).exists()) { seat = n; break; }
          }
          if (seat === undefined) throw Object.assign(new Error("All seats are full"), { code: "capacity-full" });
          tx.set(seatRef(seat), { uid, seat });
          tx.update(ref, { status, seat, decidedAt: ts() });
        } else {
          if (Number.isInteger(application.seat)) tx.delete(seatRef(application.seat));
          tx.update(ref, { status, seat: F.deleteField(), decidedAt: ts() });
        }
      });
    },

    watchNotices({ staff, selected }, cb, onError) {
      const audiences = staff || selected ? ["all", "deep"] : ["all"];
      const items = audiences.map(() => []);
      const publish = () => cb([].concat(...items).sort((a, b) => b.at - a.at));
      const unsubs = audiences.map((audience, index) => {
        const source = collection(db, noticeCollection(audience));
        return onSnapshot(source, snapshot => {
          items[index] = rows(snapshot).map(row => ({ ...row, audience, at: toMs(row.at) }));
          publish();
        }, error => {
          items[index] = [];
          publish();
          onError?.(error);
        });
      });
      return () => unsubs.forEach(unsub => unsub());
    },
    async addNotice(notice) {
      ensureOnline();
      await F.addDoc(collection(db, noticeCollection(notice.audience)), { ...notice, at: ts(), by: api.user.uid });
    },
    async deleteNotice(id, audience) {
      ensureOnline();
      await deleteDoc(doc(db, noticeCollection(audience), id));
    },

    async askQuestion(text, requestId) {
      ensureOnline();
      const uid = api.user.uid, ref = doc(db, "questions", `${uid}_${requestId}`);
      return transaction(async tx => {
        const previous = await tx.get(ref);
        if (previous.exists()) {
          if (previous.data().text !== text) throw new Error("The current draft has a different request ID");
          return;
        }
        tx.set(ref, { uid, text, at: ts(), status: "open" });
      });
    },
    watchInboxReads(cb, onError) {
      return onSnapshot(collection(db, "users", api.user.uid, "inboxReads"), s => cb(s.docs.map(d => d.id)), onError);
    },
    async markInboxRead(key) {
      ensureOnline();
      const ref = readRef(api.user.uid, key);
      return transaction(async tx => {
        if (!(await tx.get(ref)).exists()) tx.set(ref, { at: ts() });
      });
    },
    watchMyQuestions(cb, onError) {
      return onSnapshot(query(collection(db, "questions"), where("uid", "==", api.user.uid)), snap => cb(questions(snap)), onError);
    },
    watchQuestions(cb, onError) {
      return onSnapshot(collection(db, "questions"), snap => cb(questions(snap)), onError);
    },
    async answerQuestion(id, answer) {
      ensureOnline();
      const ref = doc(db, "questions", id), answeredBy = api.user.uid;
      return keepFirstAnswer(() => transaction(async tx => {
        const existing = await tx.get(ref);
        if (!existing.exists()) throw new Error("Inquiry is no longer available");
        if (existing.data().answer) return false;
        tx.update(ref, { answer, status: "answered", answeredAt: ts(), answeredBy });
        return true;
      }), () => read(ref));
    },

    watchScores(round, cb) { return onSnapshot(query(collection(db, "scores"), where("round", "==", round)), s => cb(rows(s)), () => cb([])); },
    async saveScore(round, team, crit) {
      await setDoc(doc(db, "scores", `${round}_${team}_${api.user.uid}`), { round, team, crit, judge: api.user.uid, at: ts() });
    },

    watchStaff(cb) { return onSnapshot(collection(db, "staff"), s => cb(rows(s)), () => cb([])); },
    async addStaff(uid, label, role = "staff") { await setDoc(doc(db, "staff", uid), { label, role, at: ts(), by: api.user.uid }); },
    async setStaffRole(uid, role) { await updateDoc(doc(db, "staff", uid), { role }); },
    async removeStaff(uid) { await deleteDoc(doc(db, "staff", uid)); }
  };
  return api;
}

/* ───────────────────────── Demo (localStorage) ───────────────────────── */
// seeded = 간담회 시연용(가상 자료 + 시연 시각 고정). 아니면 빈 체험 모드
function demoBackend({ seeded = false } = {}) {
  const KEY = seeded ? "psb_demo_seed_v1" : "psb_demo_v1";
  const listeners = new Set();
  let D;
  const blank = () => seeded ? demoSeed() : ({ me: null, staff: {}, users: {}, attendance: {}, deepApps: {}, notices: [], questions: [], scores: {} });
  try { D = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { D = blank(); }
  if (seeded) {
    // 시연 시각: 2027. 5. 15. 14:20(3강 진행 중)부터 실제 시간만큼 흐름
    const realNow = Date.now.bind(Date), began = realNow();
    Date.now = () => DEMO_NOW + (realNow() - began);
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} listeners.forEach(f => f()); };
  const sub = fn => { listeners.add(fn); fn(); return () => listeners.delete(fn); };
  let authCb = null;
  const api = {
    mode: "demo",
    environment: seeded ? "demo" : "development",
    seeded,
    // 시연: 역할별 가상 계정으로 바로 들어감
    async enterDemo(role) {
      const account = DEMO_ACCOUNTS[role]; if (!account) return;
      D.me = { ...account }; api.user = D.me; save(); authCb && authCb(api.user);
    },
    resetDemo() { try { localStorage.removeItem(KEY); } catch (e) {} D = blank(); D.me = null; api.user = null; save(); authCb && authCb(null); },
    user: null,
    canGoogle: false,
    onAuth(cb) { authCb = cb; api.user = D.me; setTimeout(() => cb(api.user), 0); return () => {}; },
    async signInEmail(email) { D.me = { uid: "u_" + btoa(unescape(encodeURIComponent(email))).replace(/[^a-z0-9]/gi, "").slice(0, 16), email, name: "" }; if (!Object.keys(D.staff).length) D.staff[D.me.uid] = { label: "체험 운영진" }; api.user = D.me; save(); authCb && authCb(api.user); },
    async signUpEmail(email, pw) { return api.signInEmail(email, pw); },
    async resetPassword() {},
    async signOut() { D.me = null; api.user = null; save(); authCb && authCb(null); },
    accountDeletionMethod() { return 'demo'; },
    async deleteAccount() { for (const k of Object.keys(D.attendance)) if (D.attendance[k].uid === D.me.uid) delete D.attendance[k]; D.questions = D.questions.filter(q => q.uid !== D.me.uid); delete D.users[D.me.uid]; delete D.deepApps[D.me.uid]; if (D.reads) delete D.reads[D.me.uid]; return api.signOut(); },
    async staffRole() { return staffRoleOf(D.staff[api.user.uid]); },
    async isStaff() { return ["admin", "staff"].includes(await api.staffRole()); },
    async getProfile() { return D.users[api.user.uid] || null; },
    watchOwnProfile(cb) {
      const uid = api.user.uid;
      const refresh = () => cb(D.users[uid] || null);
      listeners.add(refresh);
      queueMicrotask(() => { if (listeners.has(refresh)) refresh(); });
      return () => listeners.delete(refresh);
    },
    async createProfile(p) {
      const data = { ...p, no: makeNo(api.user.uid), email: api.user.email, consent: true, consentAt: Date.now(), createdAt: Date.now(), approvalStatus: "pending" };
      D.users[api.user.uid] ||= data;
      save();
      return D.users[api.user.uid];
    },
    async decideProfile(uid, status, { note = "", waitlist = false } = {}) {
      if (!["admin", "staff"].includes(staffRoleOf(D.staff[api.user.uid])) || !["pending", "hold"].includes(D.users[uid]?.approvalStatus)) return false;
      Object.assign(D.users[uid], { approvalStatus: status, approvedAt: Date.now(), approvedBy: api.user.uid, approvalNote: String(note).slice(0, 100) }, status === "approved" && waitlist ? { onsiteWaitlist: true } : {});
      save();
      return true;
    },
    approveProfile(uid) { return api.decideProfile(uid, "approved"); },
    async setOnsiteWaitlist(uid, waitlist) { D.users[uid].onsiteWaitlist = waitlist; save(); },
    async setParticipantMode(uid, mode) { Object.assign(D.users[uid], { mode, onsiteWaitlist: false }); save(); },
    watchOnsiteStats(cb) { return sub(() => cb(D.onsiteStats || null)); },
    async publishOnsiteStats(stat) { D.onsiteStats = { ...stat, at: Date.now() }; save(); },
    async updateProfile(p) { Object.assign(D.users[api.user.uid], p, { updatedAt: Date.now() }); save(); },
    watchMyAttendance(cb) { return sub(() => cb(Object.entries(D.attendance).filter(([, a]) => a.uid === api.user?.uid).map(([id, a]) => ({ id, ...a })))); },
    async checkInOnline(n) { D.attendance[`${n}_${api.user.uid}`] = { uid: api.user.uid, lecture: n, method: "online", at: Date.now() }; save(); },
    async recordAttendance(uid, n, method) { const id = `${n}_${uid}`; if (D.attendance[id]) return { duplicate: true }; D.attendance[id] = { uid, lecture: n, method, at: Date.now(), by: api.user.uid }; save(); return { duplicate: false }; },
    async removeAttendance(uid, n) { delete D.attendance[`${n}_${uid}`]; save(); },
    watchAllAttendance(cb) { return sub(() => cb(Object.entries(D.attendance).map(([id, a]) => ({ id, ...a })))); },
    watchUsers(cb) { return sub(() => cb(Object.entries(D.users).map(([uid, u]) => ({ uid, ...u })))); },
    async getUser(uid) { return D.users[uid] ? { uid, ...D.users[uid] } : null; },
    async setMemberVerified(uid, v) { Object.assign(D.users[uid], { memberVerified: v, verifiedBy: api.user.uid, verifiedAt: Date.now() }); save(); },
    async getDeepApp() { return D.deepApps[api.user.uid] || null; },
    async submitDeepApp(d) { D.deepApps[api.user.uid] = { ...d, uid: api.user.uid, status: "submitted", at: Date.now() }; save(); },
    async updateDeepApp(d) { Object.assign(D.deepApps[api.user.uid], d); save(); },
    watchDeepApps(cb) { return sub(() => cb(Object.entries(D.deepApps).map(([uid, a]) => ({ uid, ...a })))); },
    async setDeepStatus(uid, status) { D.deepApps[uid].status = status; save(); },
    watchMyDeepApp(cb) { return sub(() => cb(D.deepApps[api.user?.uid] || null)); },
    watchCourseSchedule(cb) {
      cb({
        lectures: LECTURES.reduce((windows, lecture) => {
          windows[lecture.n] = lectureWindow(lecture);
          return windows;
        }, {}),
        deepDeadline: Date.parse(DEEP_APPLY_UNTIL + "T00:00:00+09:00") + 86_400_000
      });
      return () => {};
    },
    watchNotices({ staff, selected }, cb) { return sub(() => cb(D.notices.filter(n => staff || n.audience !== "deep" || selected).sort((a, b) => b.at - a.at))); },
    watchInboxReads(cb) { return sub(() => cb(D.reads?.[api.user?.uid] || [])); },
    async markInboxRead(key) {
      D.reads ||= {};
      const reads = D.reads[api.user.uid] ||= [];
      if (!reads.includes(key)) { reads.push(key); save(); }
    },
    async addNotice(n) { D.notices.push({ id: "n" + Date.now(), ...n, at: Date.now() }); save(); },
    async deleteNotice(id) { D.notices = D.notices.filter(n => n.id !== id); save(); },
    async askQuestion(text, requestId) {
      const id = `${api.user.uid}_${requestId}`;
      if (D.questions.some(q => q.id === id)) return;
      D.questions.push({ id, uid: api.user.uid, text, at: Date.now(), status: "open" });
      save();
    },
    watchMyQuestions(cb) { return sub(() => cb(D.questions.filter(q => q.uid === api.user?.uid).sort((a, b) => b.at - a.at))); },
    watchQuestions(cb) { return sub(() => cb([...D.questions].sort((a, b) => b.at - a.at))); },
    async answerQuestion(id, answer) {
      if (!D.staff[api.user.uid]) throw new Error("Only staff can answer");
      const q = D.questions.find(question => question.id === id);
      if (!q) throw new Error("Inquiry is no longer available");
      if (q.answer) return false;
      Object.assign(q, { answer, status: "answered", answeredAt: Date.now(), answeredBy: api.user.uid });
      save();
      return true;
    },
    watchScores(round, cb) { return sub(() => cb(Object.entries(D.scores).filter(([, s]) => s.round === round).map(([id, s]) => ({ id, ...s })))); },
    async saveScore(round, team, crit) { D.scores[`${round}_${team}_${api.user.uid}`] = { round, team, crit, judge: api.user.uid, at: Date.now() }; save(); },
    watchStaff(cb) { return sub(() => cb(Object.entries(D.staff).map(([id, s]) => ({ id, ...s })))); },
    async addStaff(uid, label, role = "staff") { D.staff[uid] = { label, role }; save(); },
    async setStaffRole(uid, role) { D.staff[uid].role = role; save(); },
    async removeStaff(uid) { delete D.staff[uid]; save(); }
  };
  return api;
}

export async function createBackend() {
  const { default: settings } = await import("../vendor/runtime.js").catch(() => ({ default: { mode: "locked" } }));
  if (settings.mode === "production" && settings.firebase?.projectId === "kdypoho"
      && settings.firebase.appId === "1:701264486422:web:a6a02a8e45d5a610fb5537") {
    return firebaseBackend(settings);
  }
  if (settings.mode === "staging" && settings.firebase?.projectId && settings.firebase.projectId !== "kdypoho") {
    return firebaseBackend(settings);
  }
  if (settings.mode === "demo") return demoBackend({ seeded: true });
  if (settings.mode === "development") {
    const query = new URLSearchParams(location.search);
    const target = query.get("emulator");
    if (["localhost", "127.0.0.1", "10.0.2.2"].includes(target)) {
      return firebaseBackend({
        mode: "development", firebase: { projectId: settings.emulatorProject, apiKey: "demo-api-key" }
      }, target);
    }
    if (query.get("demo") === "1") return demoBackend();
    if (query.get("demo") === "seed") return demoBackend({ seeded: true });
  }
  throw unavailable();
}
