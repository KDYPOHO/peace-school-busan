// 데이터 계층: Firebase(실서비스) 또는 Demo(이 기기에만 저장) 중 하나를 같은 모양으로 제공
import { firebaseConfig } from "./config.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
export const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

function makeNo() {
  const t = Date.now().toString(36).slice(-4).toUpperCase();
  const r = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `BS27-${t}${r}`;
}

/* ───────────────────────── Firebase ───────────────────────── */
async function firebaseBackend() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(FB + "firebase-app.js"),
    import(FB + "firebase-auth.js"),
    import(FB + "firebase-firestore.js")
  ]);
  const app = initializeApp(firebaseConfig);
  // iOS 앱 웹뷰(capacitor://)에서는 getAuth()가 멈추는 알려진 문제가 있어 앱일 때는 initializeAuth를 씀
  let auth;
  if (isNative) {
    auth = A.initializeAuth(app, { persistence: [A.indexedDBLocalPersistence, A.inMemoryPersistence] });
  } else {
    auth = A.getAuth(app);
    try { await A.setPersistence(auth, A.browserLocalPersistence); } catch (e) {}
  }
  auth.languageCode = "ko";
  const db = F.initializeFirestore(app, {
    localCache: F.persistentLocalCache ? F.persistentLocalCache() : undefined,
    // WebKit에서 스트림 응답이 지연될 수 있어 iOS 앱에서는 긴 폴링 사용
    experimentalForceLongPolling: isNative && window.Capacitor.getPlatform?.() === "ios"
  });
  const { doc, getDoc, getDocFromServer, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocsFromServer, serverTimestamp, addDoc, runTransaction, writeBatch } = F;
  const ts = () => serverTimestamp();
  const profileData = s => s.exists() ? { id: s.id, ...s.data() } : null;
  const toMs = v => (v && v.toMillis ? v.toMillis() : (typeof v === "number" ? v : Date.now()));
  const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const api = {
    mode: "firebase",
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
    async deleteAccount() {
      const authUser = auth.currentUser, { uid } = authUser;
      // 개인정보 보호법 제21조: 탈퇴 시 본인 정보 지체 없이 파기
      const history = await Promise.all(["attendance", "questions"].map(c =>
        getDocsFromServer(query(collection(db, c), where("uid", "==", uid)))
      ));
      await Promise.all(history.flatMap(snap => snap.docs.map(d => deleteDoc(d.ref))));
      const batch = writeBatch(db);
      batch.delete(doc(db, "deepApps", uid));
      batch.delete(doc(db, "signupApprovals", uid));
      batch.delete(doc(db, "users", uid));
      await batch.commit();
      await A.deleteUser(authUser);
    },

    async getAccount() {
      const uid = api.user.uid;
      const [profile, staff, approval] = await Promise.all(
        ["users", "staff", "signupApprovals"].map(c => getDocFromServer(doc(db, c, uid)))
      );
      return { profile: profileData(profile), staff: staff.exists(), approved: profile.exists() && approval.exists() };
    },
    async createProfile(p) {
      const { uid, email } = api.user;
      const ref = doc(db, "users", uid);
      const data = { ...p, no: makeNo(), email, consent: true, consentAt: ts(), createdAt: ts() };
      await runTransaction(db, async tx => {
        if (!(await tx.get(ref)).exists()) tx.set(ref, data);
      });
    },
    async updateProfile(p) { await updateDoc(doc(db, "users", api.user.uid), { ...p, updatedAt: ts() }); },

    watchMyAttendance(cb) {
      return onSnapshot(query(collection(db, "attendance"), where("uid", "==", api.user.uid)),
        s => cb(rows(s).map(r => ({ ...r, at: toMs(r.at) }))), () => cb([]));
    },
    async checkInOnline(n) {
      await setDoc(doc(db, "attendance", `${n}_${api.user.uid}`), { uid: api.user.uid, lecture: n, method: "online", at: ts() });
    },
    // 운영진
    async recordAttendance(uid, n, method) {
      const ref = doc(db, "attendance", `${n}_${uid}`);
      const ex = await getDoc(ref);
      if (ex.exists()) return { duplicate: true };
      await setDoc(ref, { uid, lecture: n, method, at: ts(), by: api.user.uid });
      return { duplicate: false };
    },
    async removeAttendance(uid, n) { await deleteDoc(doc(db, "attendance", `${n}_${uid}`)); },
    watchAllAttendance(cb) {
      return onSnapshot(collection(db, "attendance"), s => cb(rows(s).map(r => ({ ...r, at: toMs(r.at) }))), () => cb([]));
    },
    watchUsers(cb) {
      return onSnapshot(collection(db, "users"), s => cb(rows(s).map(r => ({ ...r, uid: r.id, createdAt: toMs(r.createdAt) }))), () => cb([]));
    },
    watchApprovals(cb) {
      return onSnapshot(collection(db, "signupApprovals"), s => cb(new Set(s.docs.map(d => d.id))), () => cb(null));
    },
    async approveSignup(uid) {
      const ref = doc(db, "signupApprovals", uid), by = api.user.uid;
      await runTransaction(db, async tx => {
        if (!(await tx.get(ref)).exists()) tx.set(ref, { by, at: ts() });
      });
    },
    async setMemberVerified(uid, v) { await updateDoc(doc(db, "users", uid), { memberVerified: v, verifiedBy: api.user.uid, verifiedAt: ts() }); },

    async getDeepApp() { const s = await getDoc(doc(db, "deepApps", api.user.uid)); return s.exists() ? s.data() : null; },
    async submitDeepApp(d) { await setDoc(doc(db, "deepApps", api.user.uid), { ...d, uid: api.user.uid, status: "submitted", at: ts() }); },
    async updateDeepApp(d) { await updateDoc(doc(db, "deepApps", api.user.uid), { essay: d.essay, arrival: d.arrival, updatedAt: ts() }); },
    watchDeepApps(cb) { return onSnapshot(collection(db, "deepApps"), s => cb(rows(s).map(r => ({ ...r, uid: r.id, at: toMs(r.at) }))), () => cb([])); },
    async setDeepStatus(uid, status) { await updateDoc(doc(db, "deepApps", uid), { status, decidedAt: ts() }); },

    watchNotices(cb) { return onSnapshot(collection(db, "notices"), s => cb(rows(s).map(r => ({ ...r, at: toMs(r.at) })).sort((a, b) => b.at - a.at)), () => cb([])); },
    async addNotice(n) { await addDoc(collection(db, "notices"), { ...n, at: ts(), by: api.user.uid }); },
    async deleteNotice(id) { await deleteDoc(doc(db, "notices", id)); },

    async askQuestion(text) { await addDoc(collection(db, "questions"), { uid: api.user.uid, text, at: ts(), status: "open" }); },
    watchMyQuestions(cb) { return onSnapshot(query(collection(db, "questions"), where("uid", "==", api.user.uid)), s => cb(rows(s).map(r => ({ ...r, at: toMs(r.at) })).sort((a, b) => b.at - a.at)), () => cb([])); },
    watchQuestions(cb) { return onSnapshot(collection(db, "questions"), s => cb(rows(s).map(r => ({ ...r, at: toMs(r.at) })).sort((a, b) => b.at - a.at)), () => cb([])); },
    async answerQuestion(id, answer) { await updateDoc(doc(db, "questions", id), { answer, status: "answered", answeredAt: ts() }); },

    watchScores(round, cb) { return onSnapshot(query(collection(db, "scores"), where("round", "==", round)), s => cb(rows(s)), () => cb([])); },
    async saveScore(round, team, crit) {
      await setDoc(doc(db, "scores", `${round}_${team}_${api.user.uid}`), { round, team, crit, judge: api.user.uid, at: ts() });
    },

    watchStaff(cb) { return onSnapshot(collection(db, "staff"), s => cb(rows(s)), () => cb([])); },
    async addStaff(uid, label) { await setDoc(doc(db, "staff", uid), { label, at: ts(), by: api.user.uid }); },
    async removeStaff(uid) { await deleteDoc(doc(db, "staff", uid)); }
  };
  return api;
}

/* ───────────────────────── Demo (localStorage) ───────────────────────── */
function demoBackend() {
  const KEY = "psb_demo_v1";
  const listeners = new Set();
  let D;
  const blank = () => ({ me: null, staff: {}, users: {}, approvals: {}, attendance: {}, deepApps: {}, notices: [], questions: [], scores: {} });
  try { D = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { D = blank(); }
  D.approvals ||= {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} listeners.forEach(f => f()); };
  const sub = fn => { listeners.add(fn); fn(); return () => listeners.delete(fn); };
  let authCb = null;
  function signIn(user) {
    D.me = api.user = user;
    save();
    authCb?.(user);
  }
  const api = {
    mode: "demo",
    user: null,
    canGoogle: false,
    onAuth(cb) { authCb = cb; api.user = D.me; setTimeout(() => cb(api.user), 0); return () => {}; },
    async signInEmail(email) {
      const encoded = btoa(unescape(encodeURIComponent(email)));
      const legacy = "u_" + encoded.replace(/[^a-z0-9]/gi, "").slice(0, 16);
      const uid = D.users[legacy]?.email === email ? legacy : "u_" + encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      signIn({ uid, email, name: "" });
    },
    async signUpEmail(email, pw) { return api.signInEmail(email, pw); },
    async signInDemoStaff() {
      D.staff.demo_staff = { label: "체험 운영진" };
      signIn({ uid: "demo_staff", email: "", name: "체험 운영진" });
    },
    async resetPassword() {},
    async signOut() { D.me = null; api.user = null; save(); authCb && authCb(null); },
    async deleteAccount() { for (const k of Object.keys(D.attendance)) if (D.attendance[k].uid === D.me.uid) delete D.attendance[k]; D.questions = D.questions.filter(q => q.uid !== D.me.uid); delete D.users[D.me.uid]; delete D.approvals[D.me.uid]; delete D.deepApps[D.me.uid]; return api.signOut(); },
    async getAccount() {
      const { uid } = api.user;
      const profile = D.users[uid] || null;
      return { profile, staff: !!D.staff[uid], approved: !!profile && !!D.approvals[uid] };
    },
    async createProfile(p) { const { uid, email } = api.user; D.users[uid] ||= { ...p, no: makeNo(), email, consent: true, consentAt: Date.now(), createdAt: Date.now() }; save(); },
    async updateProfile(p) { Object.assign(D.users[api.user.uid], p, { updatedAt: Date.now() }); save(); },
    watchMyAttendance(cb) { return sub(() => cb(Object.entries(D.attendance).filter(([, a]) => a.uid === api.user?.uid).map(([id, a]) => ({ id, ...a })))); },
    async checkInOnline(n) { D.attendance[`${n}_${api.user.uid}`] = { uid: api.user.uid, lecture: n, method: "online", at: Date.now() }; save(); },
    async recordAttendance(uid, n, method) { const id = `${n}_${uid}`; if (D.attendance[id]) return { duplicate: true }; D.attendance[id] = { uid, lecture: n, method, at: Date.now(), by: api.user.uid }; save(); return { duplicate: false }; },
    async removeAttendance(uid, n) { delete D.attendance[`${n}_${uid}`]; save(); },
    watchAllAttendance(cb) { return sub(() => cb(Object.entries(D.attendance).map(([id, a]) => ({ id, ...a })))); },
    watchUsers(cb) { return sub(() => cb(Object.entries(D.users).map(([uid, u]) => ({ uid, ...u })))); },
    watchApprovals(cb) { return sub(() => cb(new Set(Object.keys(D.approvals)))); },
    async approveSignup(uid) { if (!D.staff[api.user.uid] || !D.users[uid]) throw new Error("Cannot approve signup"); D.approvals[uid] ||= { by: api.user.uid, at: Date.now() }; save(); },
    async setMemberVerified(uid, v) { Object.assign(D.users[uid], { memberVerified: v, verifiedBy: api.user.uid, verifiedAt: Date.now() }); save(); },
    async getDeepApp() { return D.deepApps[api.user.uid] || null; },
    async submitDeepApp(d) { D.deepApps[api.user.uid] = { ...d, uid: api.user.uid, status: "submitted", at: Date.now() }; save(); },
    async updateDeepApp(d) { Object.assign(D.deepApps[api.user.uid], d); save(); },
    watchDeepApps(cb) { return sub(() => cb(Object.entries(D.deepApps).map(([uid, a]) => ({ uid, ...a })))); },
    async setDeepStatus(uid, status) { D.deepApps[uid].status = status; save(); },
    watchNotices(cb) { return sub(() => cb([...D.notices].sort((a, b) => b.at - a.at))); },
    async addNotice(n) { D.notices.push({ id: "n" + Date.now(), ...n, at: Date.now() }); save(); },
    async deleteNotice(id) { D.notices = D.notices.filter(n => n.id !== id); save(); },
    async askQuestion(text) { D.questions.push({ id: "q" + Date.now(), uid: api.user.uid, text, at: Date.now(), status: "open" }); save(); },
    watchMyQuestions(cb) { return sub(() => cb(D.questions.filter(q => q.uid === api.user?.uid).sort((a, b) => b.at - a.at))); },
    watchQuestions(cb) { return sub(() => cb([...D.questions].sort((a, b) => b.at - a.at))); },
    async answerQuestion(id, answer) { const q = D.questions.find(q => q.id === id); if (q) { q.answer = answer; q.status = "answered"; } save(); },
    watchScores(round, cb) { return sub(() => cb(Object.entries(D.scores).filter(([, s]) => s.round === round).map(([id, s]) => ({ id, ...s })))); },
    async saveScore(round, team, crit) { D.scores[`${round}_${team}_${api.user.uid}`] = { round, team, crit, judge: api.user.uid, at: Date.now() }; save(); },
    watchStaff(cb) { return sub(() => cb(Object.entries(D.staff).map(([id, s]) => ({ id, ...s })))); },
    async addStaff(uid, label) { if (!D.approvals[uid]) throw new Error("Signup approval required"); D.staff[uid] = { label }; save(); },
    async removeStaff(uid) { delete D.staff[uid]; save(); }
  };
  return api;
}

export async function createBackend() {
  return firebaseConfig.apiKey ? firebaseBackend() : demoBackend();
}
