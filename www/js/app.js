// 부산 청년 평화학교 앱 (참가자 + 운영진)
import { APP, LECTURES, VENUE, PASS_COUNT, ONSITE_CAP, DEEP, TEAMS, CRITERIA, REGIONS, DEEP_APPLY_UNTIL, DEEP_STATUS } from "./config.js";
import { createBackend, isNative } from "./backend.js";
import { faqAnswer, FAQ_CHIPS } from "./faq.js";
import { ORG_ROOT, REGION_COUNCILS, DOMESTIC, OVERSEAS, NONE as ORG_NONE, affiliationLabel, affiliationFull } from "./councils.js";
const MEMBER_TYPES = ["자문위원", "청년 서포터즈·추천 청년", "일반 청년"];
import { privacyHtml, termsHtml, permissionsHtml, consentTable, CONSENT_REQUIRED, CONSENT_OPTIONAL, CONSENT_PHOTO } from "./legal.js";

/* ───────── 공통 도구 ───────── */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const LS = {
  get(k, d) { try { const v = localStorage.getItem("psb_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("psb_" + k, JSON.stringify(v)); } catch (e) {} }
};
const ICON = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  ai: '<path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  dash: '<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.2 3.8 5"/>',
  send: '<path d="M3 11l18-8-8 18-2-8z"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
};
const ic = (n, sz) => `<svg viewBox="0 0 24 24" ${sz ? `width="${sz}" height="${sz}"` : ""} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

function toast(m, ms = 2600) {
  const h = $("#toastHost");
  h.innerHTML = `<div class="toast" role="status">${esc(m)}</div>`;
  clearTimeout(toast.t); toast.t = setTimeout(() => (h.innerHTML = ""), ms);
}
function sheet(html, onClose) {
  $("#sheetHost").innerHTML = `<div class="sheet-bg" id="sbg"><div class="sheet" role="dialog" aria-modal="true">${html}<button class="btn ghost block" style="margin-top:14px" id="sclose">닫기</button></div></div>`;
  const close = () => { closeSheet(); onClose && onClose(); };
  $("#sclose").onclick = close;
  $("#sbg").onclick = e => { if (e.target.id === "sbg") close(); };
  const first = $("#sheetHost .sheet input, #sheetHost .sheet textarea, #sheetHost .sheet button");
  first && first.focus({ preventScroll: true });
}
function closeSheet() { $("#sheetHost").innerHTML = ""; }
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#sbg")) closeSheet(); });

// 같은 화면 안에서 "확인" 단계 (브라우저 confirm 대신)
function confirmSheet(title, body, okLabel, danger) {
  return new Promise(res => {
    sheet(`<h2 style="margin:0 0 6px;font-size:1.05rem">${esc(title)}</h2><p class="small muted" style="margin:0 0 14px">${esc(body)}</p><button class="btn block ${danger ? "danger" : ""}" id="cok">${esc(okLabel)}</button>`, () => res(false));
    $("#cok").onclick = () => { closeSheet(); res(true); };
  });
}

/* ───────── 날짜 (한국 시간 기준) ───────── */
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const kstNow = () => new Date(Date.now() + 9 * 3600e3);
const todayStr = () => kstNow().toISOString().slice(0, 10);
const kstMinutes = () => { const d = kstNow(); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const toMin = hm => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
function fmtDate(iso) { const [y, m, d] = iso.split("-").map(Number); const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return `${y}. ${m}. ${d}.(${DOW[w]})`; }
function fmtTime(ms) { if (!ms) return ""; const d = new Date(ms + 9 * 3600e3); return `${d.getUTCMonth() + 1}. ${d.getUTCDate()}. ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; }
function lectureState(l) { const t = todayStr(); return l.date < t ? "past" : l.date === t ? "today" : "future"; }
const todayLecture = () => LECTURES.find(l => l.date === todayStr());
const nextLecture = () => LECTURES.find(l => l.date >= todayStr());
function onlineOpen(l) { if (!l || lectureState(l) !== "today") return false; const m = kstMinutes(); return m >= toMin(l.start) - 30 && m <= toMin(l.end) + 60; }
const courseEnded = () => todayStr() >= LECTURES[LECTURES.length - 1].date;
const remainingFor = attended => LECTURES.filter(l => lectureState(l) !== "past" && !attended.includes(l.n)).length;

/* ───────── 상태 ───────── */
let B;
const S = {
  user: null, profile: null, staff: false, role: "p",
  tab: { p: "home", a: "dash" },
  myAtt: [], notices: [], deepApp: null, myQs: [],
  users: [], allAtt: [], deepApps: [], questions: [], scores: [], staffList: [],
  judge: { round: "예선", team: 0 }, scanLecture: null, chat: [], authMode: "login", onboardStep: 0, draft: {}
};
let unsubs = [], staffUnsubs = [];
const myAttended = () => [...new Set(S.myAtt.map(a => a.lecture))].sort();
const attOf = uid => [...new Set(S.allAtt.filter(a => a.uid === uid).map(a => a.lecture))].sort();

/* ───────── 표시 설정 ───────── */
function applyPrefs() {
  const th = LS.get("theme", "system");
  if (th === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", th);
  document.documentElement.classList.toggle("large", !!LS.get("large", false));
}
applyPrefs();

/* ───────── 화면 그리기 ───────── */
const TABS = {
  p: [["home", "홈", "home"], ["sched", "일정", "cal"], ["att", "출석", "qr"], ["ai", "도우미", "ai"], ["me", "내 정보", "me"]],
  a: [["dash", "현황", "dash"], ["people", "참가자", "users"], ["scan", "출석", "qr"], ["noti", "공지", "send"], ["deep", "심화", "star"], ["judge", "심사", "award"]]
};
let lastInd = null, pending = false;

function shell() {
  $("#root").innerHTML = `
  <header class="top">
    <div class="top-row">
      <div class="mark"><img src="img/symbol.jpg" alt="민주평통 심벌"></div>
      <div class="top-title"><b>${esc(APP.name)}</b><span id="topOrg">${esc(S.profile ? affiliationFull(S.profile) : ORG_ROOT)}</span></div>
      <button class="bell" id="bellBtn" aria-label="공지함">${ic("home").replace(ICON.home, '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>')}<i id="bellDot" hidden></i></button>
    </div>
    <div class="seg" id="seg" role="group" aria-label="화면 구분" hidden>
      <button id="roleP" aria-pressed="true">참가자</button><button id="roleA" aria-pressed="false">운영진</button>
    </div>
  </header>
  <main id="view" tabindex="-1"></main>
  <nav class="tabs" id="tabs" aria-label="메뉴"></nav>`;
  $("#roleP").onclick = () => setRole("p");
  $("#roleA").onclick = () => setRole("a");
  $("#bellBtn").onclick = openNotices;
  lastInd = null;
}
function setRole(r) {
  if (S.role === r) return;
  if (S.role === "a") stopScanner();
  S.role = r; LS.set("role", r);
  if (r === "a") startStaffData();
  render(r === "a" ? "fwd" : "back");
}
function render(anim) {
  if (!S.user) return renderAuth();
  if (!S.profile && !S.staff) return renderOnboard();
  if (!$("#view")) shell();
  $("#seg").hidden = !S.staff;
  const to = $("#topOrg"); if (to) to.textContent = S.profile ? affiliationFull(S.profile) : ORG_ROOT;
  $("#seg").classList.toggle("a", S.role === "a");
  $("#roleP").setAttribute("aria-pressed", S.role === "p");
  $("#roleA").setAttribute("aria-pressed", S.role === "a");
  const tabs = TABS[S.role], cur = S.tab[S.role];
  const nav = $("#tabs");
  nav.style.gridTemplateColumns = `repeat(${tabs.length},1fr)`;
  nav.innerHTML = '<span class="ind"></span>' + tabs.map(([k, l, i]) => `<button data-tab="${k}" ${k === cur ? 'aria-current="page"' : ""}>${ic(i)}<span>${l}</span></button>`).join("");
  const v = $("#view");
  if (S.role === "p" && !S.profile) v.innerHTML = onboardCard();
  else v.innerHTML = VIEWS[cur]();
  [...v.children].forEach((c, i) => c.style.setProperty("--i", i));
  if (anim && !RM) { v.classList.remove("enter", "back"); void v.offsetWidth; v.classList.add("enter"); if (anim === "back") v.classList.add("back"); }
  placeInd();
  if (S.role === "p" && !S.profile) bindOnboard(); else BIND[cur] && BIND[cur]();
  if (anim) animateIn(v);
  updateBell();
  pending = false;
}
// 데이터가 바뀌면 다시 그림. 입력 중이면 입력이 끝난 뒤에.
function refresh() {
  if (!S.user || !$("#view")) return;
  const a = document.activeElement;
  if (a && $("#view").contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { pending = true; return; }
  if ($("#sbg")) { pending = true; return; }
  if (PARTIAL[S.tab[S.role]] && S.role === "a") { PARTIAL[S.tab[S.role]](); updateBell(); return; }
  const top = $("#view").scrollTop; render(); $("#view").scrollTop = top;
}
document.addEventListener("focusout", () => setTimeout(() => { if (pending) refresh(); }, 200));
function go(t) {
  const tabs = TABS[S.role].map(x => x[0]);
  const dir = tabs.indexOf(t) < tabs.indexOf(S.tab[S.role]) ? "back" : "fwd";
  if (S.tab[S.role] === "scan" && t !== "scan") stopScanner();
  S.tab[S.role] = t; render(dir); $("#view").scrollTop = 0; $("#view").focus({ preventScroll: true });
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-tab]"); if (b) go(b.dataset.tab);
  const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go);
});
function placeInd() {
  const ind = $("nav.tabs .ind"), a = $('nav.tabs [aria-current="page"]'); if (!ind || !a) return;
  const w = 28, x = a.offsetLeft + a.offsetWidth / 2 - w / 2;
  if (lastInd !== null) { ind.style.transition = "none"; ind.style.left = lastInd + "px"; ind.style.width = w + "px"; void ind.offsetWidth; ind.style.transition = ""; }
  ind.style.left = x + "px"; ind.style.width = w + "px"; lastInd = x;
}
window.addEventListener("resize", () => { lastInd = null; placeInd(); });
function animateIn(root) {
  root.querySelectorAll(".bar i").forEach(i => { const w = i.style.width; i.style.transition = "none"; i.style.width = "0%"; void i.offsetWidth; i.style.transition = ""; requestAnimationFrame(() => (i.style.width = w)); });
  root.querySelectorAll(".ring").forEach(r => { const p = r.dataset.p; if (RM) { r.style.setProperty("--p", p); return; } r.style.setProperty("--p", 0); requestAnimationFrame(() => requestAnimationFrame(() => r.style.setProperty("--p", p))); });
  if (RM) return;
  root.querySelectorAll("[data-count]").forEach(el => {
    const to = +el.dataset.count, suf = el.dataset.suf || "", t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 800), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e).toLocaleString("ko-KR") + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function celebrate(title, sub, big) {
  const d = document.createElement("div");
  d.className = "success"; d.setAttribute("role", "status");
  d.innerHTML = `<canvas></canvas><svg class="ok" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54"/><path d="M38 62l15 15 30-32"/></svg><h3>${esc(title)}</h3><p>${esc(sub)}</p>${big ? `<div class="big">${esc(big)}</div>` : ""}`;
  document.body.appendChild(d);
  setTimeout(() => confetti(d.querySelector("canvas")), 650);
  const close = () => { d.classList.add("out"); setTimeout(() => d.remove(), 400); };
  d.onclick = close; setTimeout(close, 2600);
}
function confetti(cv) {
  if (RM || !cv) return;
  const ctx = cv.getContext("2d"), dpr = devicePixelRatio || 1; cv.width = cv.offsetWidth * dpr; cv.height = cv.offsetHeight * dpr; ctx.scale(dpr, dpr);
  const W = cv.offsetWidth, H = cv.offsetHeight, cols = ["#D9B774", "#FFFFFF", "#7FA6E6", "#F3DFA8"];
  const ps = Array.from({ length: 100 }, () => ({ x: W / 2, y: H * .38, vx: (Math.random() - .5) * 11, vy: -Math.random() * 11 - 3, s: Math.random() * 6 + 3, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[Math.random() * 4 | 0] }));
  let f = 0;
  (function tick() { ctx.clearRect(0, 0, W, H); ps.forEach(p => { p.vy += .32; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - f / 120); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }); if (++f < 130) requestAnimationFrame(tick); })();
}
function qrSvg(text) {
  try { const q = window.qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
  catch (e) { return `<div style="color:#14213D;font-size:.8rem;text-align:center;padding:20px">QR을 불러오지 못했어요.<br>인터넷 연결을 확인해 주세요.</div>`; }
}
const coin = () => `<div class="coin-wrap" aria-hidden="true"><div class="coin"><span class="edge"></span><span class="edge"></span><span class="edge"></span><div class="face a"><img src="img/symbol.jpg" alt=""></div><div class="face b"><img src="img/symbol.jpg" alt=""></div></div></div>`;
const archiveCard = () => `<section class="card"><a class="arch" href="${APP.archiveUrl}" target="_blank" rel="noopener noreferrer"><span class="cube"><i>청</i></span><span style="min-width:0"><span class="eyebrow">민주평통 청년운영위원회</span><b style="display:block;font-size:1rem">청년아카이브 바로가기</b><span class="small muted">행사 기록, 토론, 멤버 활동을 한곳에서 볼 수 있어요</span></span><span class="go" aria-hidden="true">›</span></a></section>`;

/* ───────── 공지 ───────── */
function visibleNotices() {
  const sel = S.deepApp && S.deepApp.status === "selected";
  return S.notices.filter(n => !n.audience || n.audience === "all" || (n.audience === "deep" && (sel || S.role === "a")));
}
function updateBell() {
  const dot = $("#bellDot"); if (!dot) return;
  const last = LS.get("seen_" + (S.user && S.user.uid), 0);
  dot.hidden = !visibleNotices().some(n => n.at > last);
  $("#bellBtn").classList.toggle("ringing", !dot.hidden);
}
function openNotices() {
  LS.set("seen_" + S.user.uid, Date.now()); updateBell();
  const ns = visibleNotices();
  sheet(`<h2 style="margin:0 0 4px;font-size:1.05rem">공지함</h2><p class="small muted" style="margin:0 0 10px">사무처와 운영진이 올린 공식 안내입니다.</p>
  ${ns.length ? `<div class="list">${ns.map(n => `<div class="li"><div class="body"><div class="k">${esc(n.title)}</div><div class="small" style="white-space:pre-wrap;margin-top:2px">${esc(n.body)}</div><div class="small muted" style="margin-top:4px">${fmtTime(n.at)}${n.audience === "deep" ? " · 심화과정 선발자" : ""}</div></div></div>`).join("")}</div>` : '<p class="small muted">아직 올라온 공지가 없어요.</p>'}`);
}

/* ───────── 로그인 ───────── */
const AUTH_ERR = {
  "auth/invalid-email": "이메일 형식을 확인해 주세요.",
  "auth/missing-password": "비밀번호를 입력해 주세요.",
  "auth/weak-password": "비밀번호는 6자 이상으로 정해 주세요.",
  "auth/email-already-in-use": "이미 가입된 이메일이에요. 로그인해 주세요.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 맞지 않아요.",
  "auth/wrong-password": "이메일 또는 비밀번호가 맞지 않아요.",
  "auth/user-not-found": "가입되지 않은 이메일이에요. 회원가입을 눌러 주세요.",
  "auth/too-many-requests": "시도가 너무 많아요. 잠시 뒤 다시 해 주세요.",
  "auth/network-request-failed": "인터넷 연결을 확인해 주세요.",
  "auth/popup-closed-by-user": "로그인 창이 닫혔어요.",
  "auth/requires-recent-login": "보안을 위해 다시 로그인한 뒤 시도해 주세요."
};
const authMsg = e => AUTH_ERR[e && e.code] || "문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.";

function renderAuth() {
  stopScanner();
  const signup = S.authMode === "signup";
  $("#root").innerHTML = `
  <div class="auth">
    <div class="logo"><div class="tile"><img src="img/symbol.jpg" alt="민주평통 심벌"></div><b>${esc(APP.name)}</b><span>${esc(ORG_ROOT)}</span></div>
    <section class="card">
      <h2 style="margin:0 0 4px">${signup ? "회원가입" : "로그인"}</h2>
      <p class="small muted" style="margin:0 0 12px">${signup ? "이메일과 비밀번호로 계정을 만든 뒤 수강 신청서를 작성해요." : "수강 신청, QR 출석, 수료증을 앱 하나로 관리해요."}</p>
      <form class="form" id="authForm" novalidate>
        <label class="f">이메일<input type="email" id="aEmail" autocomplete="email" inputmode="email" required></label>
        <label class="f">비밀번호${signup ? " (6자 이상)" : ""}<input type="password" id="aPw" autocomplete="${signup ? "new-password" : "current-password"}" minlength="6" required></label>
        ${signup ? '<label class="f">비밀번호 확인<input type="password" id="aPw2" autocomplete="new-password" required></label>' : ""}
        <p class="err" id="aErr" role="alert"></p>
        <button class="btn block" type="submit" id="aBtn">${signup ? "가입하기" : "로그인"}</button>
      </form>
      ${B.canGoogle ? '<button class="btn ghost block" style="margin-top:10px" id="gBtn">Google 계정으로 계속하기</button>' : ""}
      <div class="row between small" style="margin-top:12px">
        <button class="btn ghost mini" id="swBtn">${signup ? "이미 계정이 있어요" : "처음이에요 · 회원가입"}</button>
        ${signup ? "" : '<button class="btn ghost mini" id="rsBtn">비밀번호 찾기</button>'}
      </div>
    </section>
    ${B.mode === "demo" ? '<p class="note">체험 모드: 이 기기에만 저장돼요. 아무 이메일로나 들어가 볼 수 있어요.</p>' : ""}
    <p class="note"><button class="btn ghost mini" id="pvBtn"><b>개인정보 처리방침</b></button> <button class="btn ghost mini" id="tmBtn">이용약관</button> <button class="btn ghost mini" id="pmBtn">앱 접근권한</button></p>
  </div>`;
  const err = m => ($("#aErr").textContent = m || "");
  $("#swBtn").onclick = () => { S.authMode = signup ? "login" : "signup"; renderAuth(); };
  $("#pvBtn").onclick = privacySheet; $("#tmBtn").onclick = termsSheet; $("#pmBtn").onclick = permSheet;
  const rs = $("#rsBtn");
  rs && (rs.onclick = async () => {
    const em = $("#aEmail").value.trim();
    if (!em) return err("비밀번호를 재설정할 이메일을 먼저 적어 주세요.");
    try { await B.resetPassword(em); toast("재설정 메일을 보냈어요. 메일함을 확인해 주세요."); } catch (e) { err(authMsg(e)); }
  });
  const g = $("#gBtn");
  g && (g.onclick = async () => { err(); try { await B.signInGoogle(); } catch (e) { err(authMsg(e)); } });
  $("#authForm").onsubmit = async e => {
    e.preventDefault(); err();
    const em = $("#aEmail").value.trim(), pw = $("#aPw").value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return err("이메일 형식을 확인해 주세요.");
    if (pw.length < 6) return err("비밀번호는 6자 이상이에요.");
    if (signup && pw !== $("#aPw2").value) return err("비밀번호 확인이 일치하지 않아요.");
    const btn = $("#aBtn"); btn.disabled = true; btn.textContent = "잠시만요…";
    try { signup ? await B.signUpEmail(em, pw) : await B.signInEmail(em, pw); }
    catch (e2) { err(authMsg(e2)); btn.disabled = false; btn.textContent = signup ? "가입하기" : "로그인"; }
  };
}

function legalSheet(html) { sheet(`<div class="legal">${html}</div>`); }
function privacySheet() { legalSheet(privacyHtml()); }
function termsSheet() { legalSheet(termsHtml()); }
function permSheet() { legalSheet(`<h1>앱 접근권한 안내</h1>${permissionsHtml()}`); }

/* ───────── 수강 신청 (3단계) ───────── */
function renderOnboard() {
  $("#root").innerHTML = `<div class="auth" style="justify-content:flex-start">
    <div class="logo"><div class="tile"><img src="img/symbol.jpg" alt=""></div><b>수강 신청</b><span>${esc(APP.year)} ${esc(APP.name)} 기본과정</span></div>
    <div id="view" style="display:flex;flex-direction:column;gap:14px">${onboardCard()}</div>
    <button class="btn ghost mini" id="obOut" style="align-self:center">다른 계정으로 로그인</button>
  </div>`;
  $("#obOut").onclick = () => B.signOut();
  bindOnboard();
}
function onboardCard() {
  const st = S.onboardStep, d = S.draft;
  const by0 = APP.year - 39, by1 = APP.year - 19;
  const steps = `<div class="steps" aria-label="${st + 1} / 3단계">${[0, 1, 2].map(i => `<i class="${i <= st ? "on" : ""}"></i>`).join("")}</div>`;
  let body = "";
  if (st === 0) body = `
    <h2 style="margin:0 0 4px">1. 기본 정보</h2><p class="small muted" style="margin:0 0 12px">수료증에 이 이름이 그대로 들어가요.</p>
    <label class="f">이름<input id="oName" maxlength="40" autocomplete="name" value="${esc(d.name || (S.user.name || ""))}" required></label>
    <label class="f">출생연도<select id="oBirth"><option value="">선택</option>${Array.from({ length: by1 - by0 + 1 }, (_, i) => by1 - i).map(y => `<option ${+d.birthYear === y ? "selected" : ""}>${y}</option>`).join("")}</select></label>
    <p class="small muted" style="margin:-4px 0 0">대상: 만 19세~39세 청년 (${by0}~${by1}년생)</p>
    <label class="f">휴대폰 번호 (선택)<input id="oPhone" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000" value="${esc(d.phone || "")}"></label>`;
  else if (st === 1) body = `
    <h2 style="margin:0 0 4px">2. 소속과 참여 방식</h2><p class="small muted" style="margin:0 0 12px">전국 어디서나 참여할 수 있어요. 현장 정원은 ${ONSITE_CAP}명이에요.</p>
    <label class="f">거주 지역<select id="oRegion"><option value="">선택</option>${REGIONS.map(r => `<option ${d.region === r ? "selected" : ""}>${r}</option>`).join("")}</select></label>
    <label class="f">민주평통 소속 지역회의<select id="oOrgR"><option value="">선택</option><optgroup label="국내">${DOMESTIC.map(r => `<option value="${r}" ${d.orgRegion === r ? "selected" : ""}>${r}지역회의</option>`).join("")}</optgroup><optgroup label="해외">${OVERSEAS.map(r => `<option value="${r}" ${d.orgRegion === r ? "selected" : ""}>${r}지역회의</option>`).join("")}</optgroup><option value="${ORG_NONE}" ${d.orgRegion === ORG_NONE ? "selected" : ""}>${ORG_NONE}</option></select></label>
    <div id="oOrgCWrap">${orgCouncilField(d.orgRegion, d.orgCouncil, "oOrgC")}</div>
    <label class="f">참가 구분<select id="oType"><option value="">선택</option>${MEMBER_TYPES.map(t => `<option ${d.memberType === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="f">소속 (학교·직장, 선택)<input id="oOrg" maxlength="40" value="${esc(d.org || "")}" placeholder="예: 부산대학교"></label>
    <div class="f" role="radiogroup" aria-label="참여 방식"><span class="small" style="font-weight:600">참여 방식</span>
      <div class="chips" style="margin-top:6px">${[["onsite", "부산 현장"], ["online", "온라인"]].map(([k, l]) => `<button type="button" class="chip" data-mode="${k}" aria-pressed="${(d.mode || "onsite") === k}">${l}</button>`).join("")}</div></div>
    <p class="small muted" style="margin:0">${esc(VENUE)} · 두 방식 모두 출석으로 인정돼요.</p>`;
  else body = `
    <h2 style="margin:0 0 4px">3. 동의와 확인</h2><p class="small muted" style="margin:0 0 12px">아래 내용으로 신청해요.</p>
    <dl class="kv"><dt>이름</dt><dd>${esc(d.name)}</dd><dt>출생연도</dt><dd>${esc(d.birthYear)}년</dd><dt>지역</dt><dd>${esc(d.region)}</dd><dt>민주평통</dt><dd>${esc(affiliationLabel(d))}</dd><dt>구분</dt><dd>${esc(d.memberType)}</dd><dt>소속</dt><dd>${esc(d.org || "-")}</dd><dt>참여</dt><dd>${(d.mode || "onsite") === "online" ? "온라인" : "부산 현장"}</dd></dl>
    <label class="check all" style="margin-top:12px"><input type="checkbox" id="oAll"> <b>아래 내용에 모두 동의합니다</b></label>
    <label class="check"><input type="checkbox" class="oc" id="oT"> [필수] 이용약관 동의 <button type="button" class="btn ghost mini" id="oTv">보기</button></label>
    <label class="check"><input type="checkbox" class="oc" id="oC1"> [필수] 개인정보 수집·이용 동의</label>
    <details class="legal-d"><summary>필수 동의 내용 보기</summary>${consentTable(CONSENT_REQUIRED)}</details>
    <label class="check"><input type="checkbox" class="oc" id="oC2"> [필수] 만 19세~39세 청년이며, 입력한 정보가 사실입니다.</label>
    <label class="check"><input type="checkbox" class="oc" id="oC4" ${d.opt ? "checked" : ""}> [선택] 휴대폰 번호·소속 수집·이용 동의</label>
    <details class="legal-d"><summary>선택 동의 내용 보기</summary>${consentTable(CONSENT_OPTIONAL)}</details>
    <label class="check"><input type="checkbox" class="oc" id="oC3" ${d.photo ? "checked" : ""}> [선택] 행사 사진·영상 촬영 및 활용 동의</label>
    <details class="legal-d"><summary>사진 동의 내용 보기</summary>${consentTable(CONSENT_PHOTO)}</details>
    <p class="small muted" style="margin:6px 0 0">선택 항목은 동의하지 않아도 신청과 모든 기능을 이용할 수 있어요. 국외 이전(로그인 인증 서버, 미국) 등 자세한 내용은 <button type="button" class="btn ghost mini" id="oPv">개인정보 처리방침</button>에 있어요.</p>`;
  return `<section class="card">${steps}<form class="form" id="obForm" novalidate>${body}
    <p class="err" id="oErr" role="alert"></p>
    <div class="row" style="gap:8px">${st > 0 ? '<button type="button" class="btn ghost" id="oBack">이전</button>' : ""}<button class="btn" style="flex:1" type="submit" id="oNext">${st < 2 ? "다음" : "신청 완료"}</button></div>
  </form></section>`;
}
function bindOnboard() {
  const d = S.draft, err = m => ($("#oErr").textContent = m || "");
  const redraw = () => { const v = $("#view"); v.innerHTML = onboardCard(); bindOnboard(); };
  const orr = $("#oOrgR"); orr && (orr.onchange = () => { $("#oOrgCWrap").innerHTML = orgCouncilField(orr.value, "", "oOrgC"); });
  $$("[data-mode]").forEach(b => (b.onclick = () => { d.mode = b.dataset.mode; $$("[data-mode]").forEach(x => x.setAttribute("aria-pressed", x === b)); }));
  const pv = $("#oPv"); pv && (pv.onclick = e => { e.preventDefault(); privacySheet(); });
  const tv = $("#oTv"); tv && (tv.onclick = e => { e.preventDefault(); termsSheet(); });
  const all = $("#oAll"); all && (all.onchange = () => $$(".oc").forEach(c => (c.checked = all.checked)));
  $$(".oc").forEach(c => (c.onchange = () => { all.checked = $$(".oc").every(x => x.checked); }));
  const back = $("#oBack"); back && (back.onclick = () => { S.onboardStep--; redraw(); });
  $("#obForm").onsubmit = async e => {
    e.preventDefault(); err();
    if (S.onboardStep === 0) {
      d.name = $("#oName").value.trim(); d.birthYear = $("#oBirth").value; d.phone = $("#oPhone").value.trim();
      if (!d.name) return err("이름을 적어 주세요.");
      if (!d.birthYear) return err("출생연도를 골라 주세요.");
      if (d.phone && !/^01[016789]-?\d{3,4}-?\d{4}$/.test(d.phone)) return err("휴대폰 번호 형식을 확인해 주세요. 예: 010-1234-5678");
    } else if (S.onboardStep === 1) {
      d.region = $("#oRegion").value; d.org = $("#oOrg").value.trim(); d.mode = d.mode || "onsite";
      d.orgRegion = $("#oOrgR").value; d.orgCouncil = ($("#oOrgC") ? $("#oOrgC").value.trim() : ""); d.memberType = $("#oType").value;
      if (!d.orgRegion) return err("민주평통 소속 지역회의를 골라 주세요. 소속이 없으면 '해당 없음'을 고르면 돼요.");
      if (d.orgRegion !== ORG_NONE && !d.orgCouncil) return err("소속 협의회를 골라 주세요.");
      if (!d.memberType) return err("참가 구분을 골라 주세요.");
      if (!d.region) return err("거주 지역을 골라 주세요.");
    } else {
      if (!$("#oT").checked || !$("#oC1").checked || !$("#oC2").checked) return err("[필수] 항목 세 가지에 동의해 주세요.");
      d.photo = $("#oC3").checked; d.opt = $("#oC4").checked;
      const btn = $("#oNext"); btn.disabled = true; btn.textContent = "신청 중…";
      try {
        S.profile = await B.createProfile({ name: d.name, birthYear: +d.birthYear, phone: d.opt ? d.phone : "", region: d.region, orgRegion: d.orgRegion, orgCouncil: d.orgRegion === ORG_NONE ? "" : d.orgCouncil, memberType: d.memberType, org: d.opt ? d.org : "", mode: d.mode, optionalConsent: d.opt, photoConsent: d.photo, termsAgreed: true, privacyVersion: APP.privacyVersion, termsVersion: APP.termsVersion });
        if (!d.opt && (d.phone || d.org)) setTimeout(() => toast("선택 동의를 하지 않아 휴대폰 번호와 소속은 저장하지 않았어요", 3600), 2800);
        S.draft = {}; S.onboardStep = 0; S.role = "p";
        shell(); startProfileData(); render("fwd");
        celebrate("수강 신청 완료", `수강번호 ${S.profile.no}`, "환영해요");
      } catch (e2) { console.error(e2); err("신청서를 저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요."); btn.disabled = false; btn.textContent = "신청 완료"; }
      return;
    }
    S.onboardStep++; redraw();
  };
}

function orgCouncilField(region, val, id) {
  if (!region || region === ORG_NONE) return "";
  if (REGION_COUNCILS[region]) return `<label class="f">소속 협의회<select id="${id}"><option value="">선택</option>${REGION_COUNCILS[region].map(c => `<option ${val === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>`;
  return `<label class="f">소속 협의회 (예: 뉴욕협의회)<input id="${id}" maxlength="40" value="${esc(val || "")}"></label>`;
}
const orgKey = u => (u.orgRegion && u.orgRegion !== ORG_NONE ? u.orgRegion : ORG_NONE);

/* ───────── 참가자 화면 ───────── */
function lectureCard(l, tag) {
  return `<h2>${esc(l.title)}</h2><p>${fmtDate(l.date)} ${l.start}~${l.end} · ${esc(VENUE)}</p>`;
}
const VIEWS = {
  home() {
    const att = myAttended(), c = att.length, need = Math.max(0, PASS_COUNT - c), rem = remainingFor(att);
    const tl = todayLecture(), nl = nextLecture();
    const l = tl || nl;
    const done = l && att.includes(l.n);
    const ns = visibleNotices().slice(0, 3);
    const reach = c + rem >= PASS_COUNT;
    return `
    <section class="card hero has-coin"><img class="wm" src="img/symbol.jpg" alt="">${coin()}
      ${l ? `<div class="eyebrow">${tl ? "오늘" : "다음 강의"} · 기본과정 ${l.n}강${l.tag ? " · " + l.tag : ""}</div>${lectureCard(l)}
      <div class="row wrap" style="margin-top:12px">${done ? '<span class="pill p-ok">✓ 출석 완료</span>' : tl ? '<button class="btn" data-go="att">출석하기</button>' : '<button class="btn" data-go="sched">전체 일정</button>'}</div>`
        : `<div class="eyebrow">기본과정 종료</div><h2>${esc(S.profile.name)}님, 수고 많으셨어요</h2><p>${c >= PASS_COUNT ? "수료증은 내 정보에서 볼 수 있어요." : "다음 기수에서 다시 만나요."}</p>`}
    </section>
    <section class="card">
      <div class="row between"><h2 style="margin:0">수료 요건</h2>${c >= PASS_COUNT ? '<span class="pill p-ok">수료 요건 충족</span>' : reach ? `<span class="pill p-warn">${need}강 더 필요</span>` : '<span class="pill p-bad">이번 기수 수료 어려움</span>'}</div>
      <p class="small muted" style="margin:6px 0 10px">${LECTURES.length}강 중 ${PASS_COUNT}강 이상 출석하면 수료예요. 현장·온라인 모두 인정되고, 수료하면 심화과정에 지원할 수 있어요.</p>
      <div class="row" style="gap:14px"><div class="ring" data-p="${c / LECTURES.length * 100}"><b>${c}/${LECTURES.length}</b></div><div style="flex:1;min-width:0"><div class="bar"><i style="width:${c / LECTURES.length * 100}%"></i></div>
      <div class="row between small num" style="margin-top:6px"><span>${c} / ${LECTURES.length}강 출석</span><span class="muted">남은 강의 ${rem}회</span></div></div></div>
      ${c < PASS_COUNT && reach && rem === need ? '<p class="small" style="margin:10px 0 0;color:var(--warn)">남은 강의를 모두 들어야 수료할 수 있어요.</p>' : ""}
    </section>
    <section class="card">
      <div class="row between"><h2 style="margin:0">공지</h2><button class="btn ghost mini" id="allNoti">전체 보기</button></div>
      ${ns.length ? `<div class="list" style="margin-top:8px">${ns.map(n => `<div class="li"><div class="dot">${ic("send", 16)}</div><div class="body"><div class="small k">${esc(n.title)}</div><div class="small muted">${fmtTime(n.at)}</div></div></div>`).join("")}</div>` : '<p class="small muted" style="margin:8px 0 0">아직 공지가 없어요. 새 공지가 오면 종 모양에 점이 생겨요.</p>'}
    </section>
    ${S.profile.privacyVersion !== APP.privacyVersion || S.profile.termsVersion !== APP.termsVersion ? `<section class="card"><div class="row between"><h2 style="margin:0">처리방침·약관이 바뀌었어요</h2><span class="pill p-warn">확인 필요</span></div><p class="small muted" style="margin:6px 0 10px">바뀐 내용을 확인해 주세요. 동의하지 않으면 내 정보에서 탈퇴할 수 있어요.</p><div class="row wrap" style="gap:8px"><button class="btn ghost mini" id="vPv">처리방침</button><button class="btn ghost mini" id="vTm">이용약관</button><button class="btn mini" id="vOk">확인했어요</button></div></section>` : ""}
    ${deepCard()}
    ${archiveCard()}`;
  },
  sched() {
    const att = myAttended();
    return `
    <section class="card">
      <div class="row between"><h2 style="margin:0">기본과정 ${LECTURES.length}강</h2><span class="small muted">격주 토 14:00 · 회당 2시간</span></div>
      <p class="small muted" style="margin:4px 0 12px">${esc(VENUE)}</p>
      <div class="list">${LECTURES.map(l => {
        const st = lectureState(l), a = att.includes(l.n);
        const pill = a ? '<span class="pill p-ok">출석</span>' : st === "past" ? '<span class="pill p-bad">결석</span>' : st === "today" ? '<span class="pill p-warn">오늘</span>' : '<span class="pill p-mute">예정</span>';
        return `<div class="li"><div class="dot ${a ? "done" : st === "today" ? "now" : ""}">${l.n}강</div><div class="body"><div class="k">${esc(l.title)}</div><div class="small muted">${fmtDate(l.date)} ${l.start}~${l.end}${l.tag ? " · " + l.tag : ""}</div></div>${pill}</div>`;
      }).join("")}</div>
      <p class="small muted" style="margin:10px 0 0">강연 80분과 라운드 테이블 40분으로 짧고 알차게 진행해요. 결석한 강의는 다시보기로 복습할 수 있지만 출석으로 인정되지는 않아요.</p>
    </section>
    <section class="card">
      <div class="row between"><h2 style="margin:0">${esc(DEEP.title)}</h2><span class="pill p-gold">정원 ${DEEP.cap}명 · ${DEEP.teams}팀</span></div>
      <p class="small muted" style="margin:4px 0 0">${esc(DEEP.dates)}</p>
      <div class="list" style="margin-top:10px">${DEEP.days.map(d => `<div class="li"><div class="body"><div class="k small">${esc(d.d)}</div><ul class="small muted" style="margin:4px 0 0;padding-left:1.1em">${d.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div></div>`).join("")}</div>
    </section>`;
  },
  att() {
    const tl = todayLecture(), att = myAttended(), p = S.profile;
    const done = tl && att.includes(tl.n);
    const open = onlineOpen(tl);
    return `
    <section class="card" style="text-align:center">
      <div class="eyebrow">${tl ? `${tl.n}강 현장 출석 · 개인 QR` : "개인 QR 수강증"}</div>
      <h2 style="margin:6px 0 2px">${esc(p.name)}</h2>
      <div class="small muted">수강번호 ${esc(p.no)}</div>
      <div class="flip" id="flip" role="button" tabindex="0" aria-label="QR 카드 뒤집기"><div class="flip-in">
        <div class="side front">${qrSvg("PSB1:" + S.user.uid)}</div>
        <div class="side back"><img src="img/symbol.jpg" alt=""><span style="opacity:.75">${APP.year} ${esc(APP.name)} 수강증</span><b>${esc(p.name)}</b><span>${esc(p.no)} · 기본과정</span><span>출석 ${att.length} / ${LECTURES.length}강</span></div>
      </div></div>
      <p class="small muted" style="margin:12px 0">입구에서 운영진에게 이 QR을 보여 주세요. 찍는 순간 출석이 기록돼요. 화면을 밝게 하면 더 잘 찍혀요.</p>
      ${done ? '<span class="pill p-ok" style="font-size:.85rem;padding:6px 12px">✓ 오늘 출석 완료</span>' : ""}
    </section>
    <section class="card">
      <h2>온라인으로 듣는 경우</h2>
      <p class="small muted" style="margin:0 0 10px">강의 당일 ${tl ? `${tl.start} 30분 전부터 종료 1시간 뒤까지` : "시작 30분 전부터"} 아래 버튼을 누르면 온라인 출석이 기록돼요. 운영진이 중계 접속 기록과 대조해요.</p>
      <button class="btn ghost block" id="onlineBtn" ${done || !open ? "disabled" : ""}>${done ? "출석 완료" : open ? "온라인 출석하기" : "강의 시간에 열려요"}</button>
    </section>
    <section class="card">
      <h2>내 출결</h2>
      <div class="row" style="gap:6px">${LECTURES.map(l => `<div class="dot ${att.includes(l.n) ? "done" : lectureState(l) === "today" ? "now" : ""}" style="flex:1" title="${l.n}강">${l.n}</div>`).join("")}</div>
      <p class="small muted" style="margin:10px 0 0">${att.length >= PASS_COUNT ? "수료 요건을 채웠어요." : `수료까지 ${PASS_COUNT - att.length}강 남았어요.`} 출결이 다르게 보이면 도우미 탭에서 운영진에게 알려 주세요.</p>
    </section>`;
  },
  ai() {
    if (!S.chat.length) S.chat.push({ who: "ai", text: `안녕하세요, ${S.profile.name}님. 평화학교 도우미예요. 공식 안내 범위 안에서 답하고, 모르는 건 운영진에게 바로 전달해 드려요.` });
    return `
    <section class="card">
      <div class="row between"><h2 style="margin:0">학습 도우미</h2><span class="small muted">공식 안내 기반 · 무료</span></div>
      <div class="chat" id="chat" style="margin-top:10px">${S.chat.map((m, k) => `<div class="msg ${m.who}" ${k < S.chat.length - 1 ? 'style="animation:none"' : ""}>${esc(m.text)}${m.src ? `<small>근거: ${esc(m.src)}</small>` : ""}${m.ask ? `<div style="margin-top:8px"><button class="btn mini" data-askq="${k}">운영진에게 물어보기</button></div>` : ""}</div>`).join("")}</div>
      <div class="chips" style="margin:12px 0 10px">${FAQ_CHIPS.map(q => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
      <form class="composer" id="chatForm"><input id="chatIn" maxlength="300" placeholder="수료, 일정, 출석, 심화과정 등을 물어보세요" autocomplete="off" aria-label="질문"><button class="btn" type="submit">보내기</button></form>
    </section>
    <section class="card">
      <h2>내 문의</h2>
      ${S.myQs.length ? `<div class="list">${S.myQs.map(q => `<div class="li"><div class="body"><div class="small k">${esc(q.text)}</div>${q.answer ? `<div class="ai-box" style="margin-top:6px"><b>운영진 답변</b><div>${esc(q.answer)}</div></div>` : '<div class="small muted">답변을 기다리고 있어요</div>'}</div><span class="pill ${q.answer ? "p-ok" : "p-mute"}">${q.answer ? "답변" : "대기"}</span></div>`).join("")}</div>` : '<p class="small muted" style="margin:0">도우미가 답하지 못한 질문은 여기에 모이고, 운영진 답변이 달리면 함께 보여요.</p>'}
    </section>`;
  },
  me() {
    const p = S.profile, att = myAttended(), ok = att.length >= PASS_COUNT, issued = ok && courseEnded();
    return `
    <section class="card">
      <div class="row between"><h2 style="margin:0">${esc(p.name)}</h2><span class="pill p-gold">${esc(p.no)}</span></div>
      <dl class="kv" style="margin-top:10px"><dt>이메일</dt><dd>${esc(p.email || S.user.email)}</dd><dt>민주평통</dt><dd>${esc(affiliationLabel(p))} · ${esc(p.memberType || "-")}</dd><dt>지역</dt><dd>${esc(p.region)}</dd><dt>소속</dt><dd>${esc(p.org || "-")}</dd><dt>연락처</dt><dd>${esc(p.phone || "-")}</dd><dt>참여</dt><dd>${p.mode === "online" ? "온라인" : "부산 현장"}</dd><dt>선택 동의</dt><dd>연락처·소속 ${p.optionalConsent ? "동의" : "미동의"} · 사진 ${p.photoConsent ? "동의" : "미동의"}</dd></dl>
      <button class="btn ghost block" style="margin-top:12px" id="editBtn">정보 수정 · 동의 변경</button>
    </section>
    <section class="card">
      <div class="row between"><h2 style="margin:0">수료증</h2>${issued ? '<span class="pill p-ok">발급 완료</span>' : ok ? '<span class="pill p-ok">발급 예정</span>' : '<span class="pill p-mute">미리보기</span>'}</div>
      <p class="small muted" style="margin:6px 0 12px">${issued ? "인쇄하거나 PDF로 저장할 수 있어요." : ok ? `수료식(${fmtDate(LECTURES[LECTURES.length - 1].date)}) 날 자동으로 발급돼요.` : `${PASS_COUNT}강 이상 출석하면 이 수료증이 발급돼요.`}</p>
      ${certHtml(p, !issued)}
      ${issued ? '<button class="btn gold block" style="margin-top:12px" id="printBtn">수료증 인쇄 · PDF 저장</button>' : ""}
    </section>
    <section class="card">
      <h2>표시 설정</h2>
      <div class="list">
        <div class="li"><div class="body"><div class="k small">큰 글씨</div><div class="small muted">글자를 키워 읽기 편하게</div></div><label class="toggle" aria-label="큰 글씨"><input type="checkbox" id="lgT" ${LS.get("large", false) ? "checked" : ""}><span></span></label></div>
        <div class="li"><div class="body"><div class="k small">화면 테마</div></div><div class="chips">${[["system", "자동"], ["light", "밝게"], ["dark", "어둡게"]].map(([k, l]) => `<button class="chip" data-theme-set="${k}" aria-pressed="${LS.get("theme", "system") === k}">${l}</button>`).join("")}</div></div>
      </div>
    </section>
    ${archiveCard()}
    <section class="card">
      <h2>앱 정보</h2>
      <dl class="kv"><dt>버전</dt><dd>${esc(APP.version)}${isNative ? " (앱)" : " (웹)"}${B.mode === "demo" ? " · 체험 모드" : ""}</dd><dt>운영</dt><dd>${esc(APP.contact)}</dd><dt>계정 ID</dt><dd><code style="font-size:.75rem">${esc(S.user.uid)}</code> <button class="btn ghost mini" id="cpUid">복사</button></dd></dl>
      <div class="row wrap" style="gap:8px;margin-top:12px"><button class="btn ghost mini" id="pvBtn2"><b>개인정보 처리방침</b></button><button class="btn ghost mini" id="tmBtn2">이용약관</button><button class="btn ghost mini" id="pmBtn2">앱 접근권한</button><button class="btn ghost mini" id="dlBtn">내 정보 내려받기</button><button class="btn ghost mini" id="outBtn">로그아웃</button><button class="btn ghost mini" id="delBtn" style="color:var(--bad)">회원 탈퇴</button></div>
    </section>`;
  },

  /* ───────── 운영진 화면 ───────── */
  dash() {
    const st = stats(), l = todayLecture() || nextLecture() || LECTURES[LECTURES.length - 1];
    const lc = S.allAtt.filter(a => a.lecture === l.n);
    return `
    <section class="card hero has-coin"><img class="wm" src="img/symbol.jpg" alt="">${coin()}
      <div class="eyebrow">운영 현황 · ${fmtDate(todayStr())}</div>
      <h2>${todayLecture() ? `기본과정 ${l.n}강 진행일` : nextLecture() ? `다음 강의 ${l.n}강 · ${fmtDate(l.date)}` : "기본과정 종료"}</h2>
      <p>${l.n}강 출석 <b class="num" data-count="${lc.length}">${lc.length}</b>명 (현장 ${lc.filter(a => a.method !== "online").length} · 온라인 ${lc.filter(a => a.method === "online").length})</p>
    </section>
    <div class="grid2">
      <div class="stat"><b data-count="${st.n}">${st.n}</b><span>기본과정 신청 (${st.regions}개 시·도)</span></div>
      <div class="stat"><b data-count="${st.rate}" data-suf="%">${st.rate}%</b><span>지난 강의 평균 출석률</span></div>
      <div class="stat"><b data-count="${st.passed}">${st.passed}</b><span>수료 요건 충족</span></div>
      <div class="stat"><b data-count="${S.deepApps.length}">${S.deepApps.length}</b><span>심화 지원 / 정원 ${DEEP.cap}</span></div>
    </div>
    <section class="card">
      <div class="row between"><h2 style="margin:0">주의가 필요한 참가자</h2><span class="pill p-warn">자동 계산</span></div>
      <p class="small muted" style="margin:4px 0 10px">남은 강의를 모두 들어야 수료할 수 있는 참가자 <b>${st.risk.length}</b>명, 이미 수료가 어려운 참가자 <b>${st.lost.length}</b>명</p>
      <div class="row wrap" style="gap:8px"><button class="btn ghost" id="riskBtn" ${st.risk.length ? "" : "disabled"}>명단 보기</button><button class="btn ghost" id="nudgeBtn" ${st.risk.length ? "" : "disabled"}>독려 공지 쓰기</button></div>
    </section>
    <section class="card">
      <div class="row between"><h2 style="margin:0">소속별 신청</h2><span class="small muted">지역회의 기준</span></div>
      <div class="list small" style="margin-top:8px">${[...DOMESTIC, ...OVERSEAS, ORG_NONE].map(r => { const us = S.users.filter(u => orgKey(u) === r); return { r, k: us.length, p: us.filter(u => attOf(u.uid).length >= PASS_COUNT).length }; }).filter(x => x.k).sort((a, b) => b.k - a.k).map(x => `<div class="li"><div class="body"><div class="row between"><span>${esc(x.r === ORG_NONE ? x.r : x.r + "지역회의")}</span><span class="num">${x.k}명 · 수료 요건 ${x.p}명</span></div></div></div>`).join("") || '<p class="muted">아직 신청자가 없어요.</p>'}</div>
    </section>
    <section class="card">
      <h2>강별 출석</h2>
      <div class="list">${LECTURES.map(x => { const k = S.allAtt.filter(a => a.lecture === x.n).length; const pct = st.n ? Math.round(k / st.n * 100) : 0; return `<div class="li"><div class="dot ${lectureState(x) === "past" ? "done" : lectureState(x) === "today" ? "now" : ""}">${x.n}</div><div class="body"><div class="row between small"><span>${fmtDate(x.date)}</span><span class="num">${k}명 · ${pct}%</span></div><div class="bar" style="margin-top:4px"><i style="width:${pct}%"></i></div></div></div>`; }).join("")}</div>
    </section>
    <section class="card">
      <h2>자료 내보내기</h2>
      <p class="small muted" style="margin:0 0 10px">엑셀에서 바로 열리는 명단과, 숫자가 채워진 결과보고서 초안을 만들어요.</p>
      <div class="row wrap" style="gap:8px"><button class="btn" id="csvBtn">참가자·출결 명단 (CSV)</button><button class="btn ghost" id="reportBtn">결과보고서 초안</button></div>
    </section>
    <section class="card">
      <div class="row between"><h2 style="margin:0">운영진</h2><span class="small muted">${S.staffList.length}명</span></div>
      <div class="list small" style="margin-top:8px">${S.staffList.map(s => { const u = S.users.find(x => x.uid === s.id); return `<div class="li"><div class="body"><div class="k">${esc(s.label || (u && u.name) || "운영진")}</div><div class="muted" style="font-size:.72rem;overflow-wrap:anywhere">${esc(s.id)}</div></div>${s.id !== S.user.uid ? `<button class="btn ghost mini" data-unstaff="${esc(s.id)}">해제</button>` : '<span class="pill p-mute">나</span>'}</div>`; }).join("")}</div>
      <p class="small muted" style="margin:10px 0 0">새 운영진은 그 사람이 앱에 먼저 가입한 뒤, 참가자 탭에서 이름을 눌러 지정해요. 가입서를 안 쓴 사람은 내 정보의 계정 ID로 추가해요.</p>
      <form class="composer" id="staffForm" style="margin-top:8px"><input id="staffUid" placeholder="계정 ID 붙여넣기" aria-label="운영진 계정 ID"><button class="btn" type="submit">추가</button></form>
    </section>`;
  },
  people() {
    const q = (S.peopleQ || "").trim(), f = S.peopleF || "all";
    const rows = S.users.map(u => ({ ...u, att: attOf(u.uid) })).map(u => ({ ...u, rem: remainingFor(u.att) }))
      .filter(u => f === "all" || (f === "pass" && u.att.length >= PASS_COUNT) || (f === "risk" && u.att.length < PASS_COUNT && u.att.length + u.rem >= PASS_COUNT && u.att.length + u.rem - PASS_COUNT <= 0) || (f === "lost" && u.att.length + u.rem < PASS_COUNT) || (f === "online" && u.mode === "online"))
      .filter(u => !S.peopleC || orgKey(u) === S.peopleC)
      .filter(u => !q || [u.name, u.no, u.org, u.region, u.email, affiliationLabel(u)].some(x => String(x || "").toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "ko"));
    return `
    <section class="card">
      <div class="row between"><h2 style="margin:0">참가자</h2><span class="small muted num">${rows.length} / ${S.users.length}명</span></div>
      <input class="search" id="pq" style="margin-top:10px" placeholder="이름, 수강번호, 소속, 지역 검색" value="${esc(q)}" aria-label="참가자 검색">
      <select id="pc" class="search" style="margin-top:8px" aria-label="소속 지역회의로 거르기"><option value="">모든 소속</option>${[...DOMESTIC, ...OVERSEAS, ORG_NONE].map(r => { const k = S.users.filter(u => orgKey(u) === r).length; return k || S.peopleC === r ? `<option value="${esc(r)}" ${S.peopleC === r ? "selected" : ""}>${r === ORG_NONE ? r : r + "지역회의"} (${k})</option>` : ""; }).join("")}</select>
      <div class="chips" style="margin-top:10px">${[["all", "전체"], ["pass", "수료 요건 충족"], ["risk", "수료 위험"], ["lost", "수료 불가"], ["online", "온라인"]].map(([k, l]) => `<button class="chip" data-pf="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
    </section>
    <section class="card" style="padding-top:6px">
      <div class="list" id="pList">${rows.length ? rows.slice(0, 300).map(u => `<button class="li" data-user="${esc(u.uid)}" style="width:100%;text-align:left;background:none;border-left:0;border-right:0;border-top:0;cursor:pointer"><div class="body"><div class="k">${esc(u.name)} <span class="small muted" style="font-weight:400">${esc(affiliationLabel(u))}${u.org ? " · " + esc(u.org) : ""}</span></div><div class="small muted">${esc(u.no)} · ${esc(u.memberType || "")} · ${u.mode === "online" ? "온라인" : "현장"}${S.staffList.some(s => s.id === u.uid) ? " · 운영진" : ""}</div></div><span class="pill ${u.att.length >= PASS_COUNT ? "p-ok" : u.att.length + u.rem < PASS_COUNT ? "p-bad" : "p-mute"} num">${u.att.length}/${LECTURES.length}</span></button>`).join("") : '<p class="small muted">조건에 맞는 참가자가 없어요.</p>'}</div>
    </section>`;
  },
  scan() {
    const n = S.scanLecture || (todayLecture() || nextLecture() || LECTURES[0]).n;
    S.scanLecture = n;
    return `
    <section class="card">
      <div class="row between"><h2 style="margin:0">현장 출석</h2><select id="scanL" aria-label="강의 선택" style="padding:6px 8px;border-radius:10px;border:1px solid var(--line);background:var(--surface)">${LECTURES.map(l => `<option value="${l.n}" ${l.n === n ? "selected" : ""}>${l.n}강 · ${fmtDate(l.date)}</option>`).join("")}</select></div>
      <div class="row between" style="margin:10px 0 6px"><span class="num"><b style="font-size:1.4rem" id="scanCount">0</b> / ${ONSITE_CAP}명 현장</span><span class="small muted" id="scanOnline"></span></div>
      <div class="bar"><i id="scanBar" style="width:0%"></i></div>
    </section>
    <section class="card">
      <div id="reader" hidden></div>
      <div class="scan" id="scanPh"><div class="frame"></div><div class="line"></div><div class="cap">카메라를 켜고 참가자 QR을 사각형 안에 맞춰 주세요</div></div>
      <div class="row" style="gap:8px;margin-top:12px"><button class="btn block" id="camBtn">카메라 켜기</button></div>
      <form class="composer" id="manualForm" style="margin-top:10px"><input id="manualNo" placeholder="수강번호로 직접 입력 (예: BS27-AB12CD)" autocapitalize="characters" aria-label="수강번호"><button class="btn" type="submit">출석</button></form>
      <p class="small muted" style="margin:8px 0 0">같은 사람을 두 번 찍어도 한 번만 기록돼요. 휴대폰을 잃어버린 참가자는 수강번호나 참가자 탭에서 처리해요.</p>
    </section>
    <section class="card"><h2>최근 출석</h2><div class="list small" id="recent"></div></section>`;
  },
  noti() {
    const open = S.questions.filter(q => !q.answer);
    return `
    <section class="card">
      <h2>공지 올리기</h2>
      <form class="form" id="notiForm">
        <label class="f">받는 사람<select id="nAud"><option value="all">전체 참가자 (${S.users.length}명)</option><option value="deep">심화과정 선발자 (${S.deepApps.filter(a => a.status === "selected").length}명)</option></select></label>
        <label class="f">제목<input id="nTitle" maxlength="60" required value="${esc(S.notiDraft?.title || "")}"></label>
        <label class="f">내용<textarea id="nBody" rows="4" maxlength="1000" required>${esc(S.notiDraft?.body || "")}</textarea></label>
        <div class="chips">${[["강의 전날 안내", `[내일 ${(nextLecture() || LECTURES[0]).n}강] ${(nextLecture() || LECTURES[0]).title}\n${fmtDate((nextLecture() || LECTURES[0]).date)} ${(nextLecture() || LECTURES[0]).start} 시작 · ${VENUE}\n앱의 QR 수강증을 준비해 주세요.`], ["다시보기 안내", "[다시보기] 지난 강의 영상과 요약 자료가 올라왔어요. 다시보기는 출석으로 인정되지 않으니 남은 강의를 꼭 챙겨 주세요."], ["수료 독려", "[수료 안내] 남은 강의를 모두 들으면 수료할 수 있어요. 현장이 어렵다면 온라인 출석도 인정돼요."]].map(([k, v]) => `<button type="button" class="chip" data-tpl="${esc(v)}">${k}</button>`).join("")}</div>
        <button class="btn" type="submit">공지 올리기</button>
      </form>
      <p class="small muted" style="margin:10px 0 0">공지는 참가자 앱 첫 화면과 공지함에 바로 보여요. 휴대폰 푸시 알림은 2단계에서 붙일 예정이에요.</p>
    </section>
    <section class="card">
      <div class="row between"><h2 style="margin:0">문의함</h2><span class="pill ${open.length ? "p-warn" : "p-ok"}">${open.length ? `답변 대기 ${open.length}` : "모두 답변"}</span></div>
      <div class="list" style="margin-top:8px">${S.questions.slice(0, 40).map(q => { const u = S.users.find(x => x.uid === q.uid); return `<div class="li"><div class="body"><div class="small muted">${esc(u ? u.name + " · " + u.no : "참가자")} · ${fmtTime(q.at)}</div><div class="k small">${esc(q.text)}</div>${q.answer ? `<div class="ai-box" style="margin-top:6px"><b>답변</b><div>${esc(q.answer)}</div></div>` : `<form class="composer" data-ans="${esc(q.id)}" style="margin-top:6px"><input placeholder="답변 쓰기" maxlength="500" aria-label="답변"><button class="btn" type="submit">답변</button></form>`}</div></div>`; }).join("") || '<p class="small muted">아직 문의가 없어요.</p>'}</div>
    </section>
    <section class="card">
      <h2>올린 공지</h2>
      <div class="list small">${S.notices.map(n => `<div class="li"><div class="body"><div class="k">${esc(n.title)}</div><div class="muted">${fmtTime(n.at)} · ${n.audience === "deep" ? "심화 선발자" : "전체"}</div></div><button class="btn ghost mini" data-delnoti="${esc(n.id)}">삭제</button></div>`).join("") || '<p class="muted">아직 올린 공지가 없어요.</p>'}</div>
    </section>`;
  },
  deep() {
    const f = S.deepF || "all";
    const sel = S.deepApps.filter(a => a.status === "selected").length;
    const rows = S.deepApps.map(a => ({ ...a, u: S.users.find(x => x.uid === a.uid) || {}, att: attOf(a.uid) }))
      .filter(a => f === "all" || a.status === f).sort((a, b) => b.att.length - a.att.length || a.at - b.at);
    const over = sel > DEEP.cap;
    return `
    <section class="card">
      <div class="row between"><h2 style="margin:0">심화과정 선발</h2><span class="pill ${over ? "p-bad" : sel === DEEP.cap ? "p-ok" : "p-gold"} num">${sel} / ${DEEP.cap}명</span></div>
      <div class="bar ${over ? "over" : "gold"}" style="margin:10px 0 6px"><i style="width:${Math.min(100, sel / DEEP.cap * 100)}%"></i></div>
      <p class="small muted" style="margin:0">정원 ${DEEP.cap}명을 넘겨 선발할 수 없어요. 지원 ${S.deepApps.length}건 · 예비 ${S.deepApps.filter(a => a.status === "waitlist").length}명. 선발은 운영위원회가 직접 하고, 앱은 출석과 지원서를 나란히 보여 주기만 해요.</p>
      <select id="pc" class="search" style="margin-top:8px" aria-label="소속 지역회의로 거르기"><option value="">모든 소속</option>${[...DOMESTIC, ...OVERSEAS, ORG_NONE].map(r => { const k = S.users.filter(u => orgKey(u) === r).length; return k || S.peopleC === r ? `<option value="${esc(r)}" ${S.peopleC === r ? "selected" : ""}>${r === ORG_NONE ? r : r + "지역회의"} (${k})</option>` : ""; }).join("")}</select>
      <div class="chips" style="margin-top:10px">${[["all", "전체"], ["submitted", "검토 중"], ["selected", "선발"], ["waitlist", "예비"], ["rejected", "미선발"]].map(([k, l]) => `<button class="chip" data-df="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
    </section>
    <section class="card" style="padding-top:6px">
      <div class="list">${rows.map(a => `<div class="li"><div class="body">
        <div class="row between wrap"><span class="k">${esc(a.u.name || "탈퇴한 참가자")} <span class="small muted" style="font-weight:400">${esc(a.u.region || "")}${a.u.org ? " · " + esc(a.u.org) : ""}</span></span><span class="pill p-mute num">${a.att.length}/${LECTURES.length}강</span></div>
        <div class="ai-box" style="margin-top:6px"><b>지원 동기 · ${esc(a.theme || "분야 미선택")}</b><div style="white-space:pre-wrap">${esc(a.essay)}</div></div>
        <div class="small muted" style="margin-top:4px">부산 도착: ${esc(a.arrival || "-")} · ${fmtTime(a.at)} 제출</div>
        <div class="chips" style="margin-top:8px">${[["selected", "선발"], ["waitlist", "예비"], ["rejected", "미선발"], ["submitted", "보류"]].map(([k, l]) => `<button class="chip" data-dset="${esc(a.uid)}" data-st="${k}" aria-pressed="${a.status === k}">${l}</button>`).join("")}</div>
      </div></div>`).join("") || '<p class="small muted">아직 지원서가 없어요.</p>'}</div>
    </section>`;
  },
  judge() {
    const J = S.judge, mine = S.scores.find(s => s.team === J.team && s.judge === S.user.uid);
    const cur = mine ? mine.crit : CRITERIA.map(c => Math.round(c.w * .7));
    return `
    <section class="card">
      <div class="row between"><h2 style="margin:0">해커톤 심사</h2><div class="chips">${["예선", "본선"].map(r => `<button class="chip" data-round="${r}" aria-pressed="${J.round === r}">${r}</button>`).join("")}</div></div>
      <p class="small muted" style="margin:6px 0 12px">운영진 계정마다 한 명의 심사위원으로 집계돼요. 점수를 바꾸면 순위가 바로 다시 계산돼요.</p>
      <label class="f">팀<select id="tSel">${TEAMS.map((t, i) => `<option value="${i}" ${i === J.team ? "selected" : ""}>${esc(t)}${S.scores.some(s => s.team === i && s.judge === S.user.uid) ? " ✓" : ""}</option>`).join("")}</select></label>
      <div class="form" style="margin-top:14px">${CRITERIA.map((c, ci) => `<div class="slider"><span>${c.k}</span><b class="num" id="sv${ci}">${cur[ci]} / ${c.w}</b><input type="range" min="0" max="${c.w}" value="${cur[ci]}" data-ci="${ci}" aria-label="${c.k}"></div>`).join("")}</div>
      <div class="row between" style="margin-top:10px"><span class="small muted">내 점수 합계</span><b class="num" id="jsum">${cur.reduce((a, b) => a + b, 0)} / 100</b></div>
      <button class="btn block" style="margin-top:10px" id="saveScore">${mine ? "점수 고쳐 저장" : "점수 저장"}</button>
    </section>
    <section class="card">
      <div class="row between"><h2 style="margin:0">실시간 순위 · ${J.round}</h2><span class="pill p-ok">자동 집계</span></div>
      <div class="table-wrap" style="margin-top:8px"><table><thead><tr><th>순위</th><th>팀</th><th class="r">심사</th><th class="r">평균</th></tr></thead><tbody id="rankBody">${rankRows()}</tbody></table></div>
      <p class="small muted" style="margin:10px 0 0">${J.round === "예선" ? "예선 상위 4팀이 본선에 올라가요." : "본선 결과는 이 표를 발표 화면에 띄우면 돼요."}</p>
    </section>`;
  }
};

function deepCard() {
  const att = myAttended(), elig = att.length >= PASS_COUNT, closed = todayStr() > DEEP_APPLY_UNTIL, a = S.deepApp;
  let action;
  if (a) action = `<div class="row between"><span class="pill ${a.status === "selected" ? "p-ok" : a.status === "rejected" ? "p-bad" : a.status === "waitlist" ? "p-warn" : "p-mute"}">${DEEP_STATUS[a.status] || "검토 중"}</span>${a.status === "submitted" && !closed ? '<button class="btn ghost mini" id="editDeep">지원서 고치기</button>' : ""}</div>${a.status === "selected" ? '<p class="small" style="margin:8px 0 0">축하해요! 세부 일정과 준비물은 공지로 안내해 드려요.</p>' : ""}`;
  else if (closed) action = '<button class="btn block" disabled>지원이 마감됐어요</button>';
  else if (elig) action = '<button class="btn gold block" id="applyBtn">심화과정 지원하기</button>';
  else action = `<button class="btn block" disabled>${PASS_COUNT}강 출석 후 지원 가능</button>`;
  return `<section class="card">
    <div class="row between"><h2 style="margin:0">${esc(DEEP.title)}</h2><span class="pill p-gold">정원 ${DEEP.cap}명</span></div>
    <p class="small muted" style="margin:6px 0 10px">${esc(DEEP.dates)} · 지원 마감 ${fmtDate(DEEP_APPLY_UNTIL)}. 오후 자유시간과 자율 참여 저녁 프로그램으로 여유 있게 진행해요.</p>
    ${action}
  </section>`;
}
function deepForm() {
  const a = S.deepApp || {};
  sheet(`<h2 style="margin:0 0 4px;font-size:1.05rem">심화과정 지원서</h2><p class="small muted" style="margin:0 0 12px">정원 ${DEEP.cap}명 · 운영위원회가 직접 읽고 선발해요.</p>
  <form class="form" id="deepForm">
    <label class="f">관심 분야<select id="dTheme">${["교육·콘텐츠", "지역 연계", "국제·외교", "미디어", "사회 통합", "기타"].map(t => `<option ${a.theme === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="f">해커톤에서 해보고 싶은 것 (100~800자)<textarea id="dEssay" rows="5" maxlength="800" required>${esc(a.essay || "")}</textarea></label>
    <div class="small muted" id="dCnt" style="text-align:right;margin-top:-6px">0자</div>
    <label class="f">부산 도착 예정<select id="dArr">${["8. 13.(금) 11시 이전 도착", "8. 13.(금) 11시~12시 도착", "부산·경남 거주 (직접 이동)", "아직 모름"].map(t => `<option ${a.arrival === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    ${S.deepApp ? "" : '<label class="check"><input type="checkbox" id="dOk"> 2박3일 전 일정에 참여할 수 있으며, 선발 후 불참 시 다음 예비자에게 기회가 넘어가는 데 동의합니다.</label>'}
    <p class="err" id="dErr" role="alert"></p>
    <button class="btn" type="submit">${S.deepApp ? "고친 내용 저장" : "지원서 제출"}</button>
  </form>`);
  const cnt = () => ($("#dCnt").textContent = $("#dEssay").value.trim().length + "자");
  $("#dEssay").oninput = cnt; cnt();
  $("#deepForm").onsubmit = async e => {
    e.preventDefault();
    const essay = $("#dEssay").value.trim(), err = m => ($("#dErr").textContent = m);
    if (essay.length < 100) return err(`지원 동기를 100자 이상 써 주세요. (지금 ${essay.length}자)`);
    if (!S.deepApp && !$("#dOk").checked) return err("참여 확인에 동의해 주세요.");
    try {
      if (S.deepApp) await B.updateDeepApp({ essay, arrival: $("#dArr").value });
      else await B.submitDeepApp({ essay, theme: $("#dTheme").value, arrival: $("#dArr").value });
      S.deepApp = await B.getDeepApp(); closeSheet(); render();
      toast(S.deepApp && S.deepApp.status === "submitted" ? "지원서를 저장했어요. 결과는 앱 공지로 알려드려요." : "저장했어요");
    } catch (e2) { console.error(e2); err("저장하지 못했어요. 다시 시도해 주세요."); }
  };
}
function certHtml(p, locked) {
  const end = LECTURES[LECTURES.length - 1].date.split("-").map(Number);
  return `<div class="cert ${locked ? "locked" : ""}">
    <div class="watermark"><img src="img/symbol.jpg" alt=""></div>
    <div class="no">제 ${APP.year}-부산청년-${esc(String(p.no).replace(/^BS\d+-/, ""))} 호</div>
    <h4>수료증</h4>
    <div class="who">성&emsp;&emsp;명 : ${esc(p.name)}<br>${p.org ? `소&emsp;&emsp;속 : ${esc(p.org)}<br>` : ""}과&emsp;&emsp;정 : 기본과정 (${LECTURES.length}강)</div>
    <p>위 사람은 ${esc(APP.org)}가 주관한 「${APP.year} ${esc(APP.name)}」 기본과정을 성실히 이수하였기에 이 증서를 수여합니다.</p>
    <div class="date">${end[0]}년 ${end[1]}월 ${end[2]}일</div>
    <div class="issuer"><img src="img/symbol.jpg" alt="">${esc(APP.org)}</div>
  </div>`;
}
function printCert(p) {
  $("#printHost").innerHTML = certHtml(p, false);
  setTimeout(() => { try { window.print(); } catch (e) { toast("이 기기에서는 인쇄를 열 수 없어요. 화면을 캡처해 보관해 주세요."); } }, 50);
}
function editProfileSheet() {
  const p = S.profile; let confirmedOpt = false;
  sheet(`<h2 style="margin:0 0 10px;font-size:1.05rem">정보 수정</h2><form class="form" id="pf">
    <label class="f">이름 (수료증 표기)<input id="eName" maxlength="40" value="${esc(p.name)}" required></label>
    <label class="check"><input type="checkbox" id="eOpt" ${p.optionalConsent ? "checked" : ""}> [선택] 휴대폰 번호·소속 수집·이용 동의 (끄면 두 정보가 즉시 지워져요)</label>
    <label class="f">소속<input id="eOrg" maxlength="40" value="${esc(p.org || "")}"></label>
    <label class="f">민주평통 소속 지역회의<select id="eOrgR">${[...DOMESTIC, ...OVERSEAS].map(r => `<option value="${r}" ${p.orgRegion === r ? "selected" : ""}>${r}지역회의</option>`).join("")}<option value="${ORG_NONE}" ${!p.orgRegion || p.orgRegion === ORG_NONE ? "selected" : ""}>${ORG_NONE}</option></select></label>
    <div id="eOrgCWrap">${orgCouncilField(p.orgRegion, p.orgCouncil, "eOrgC")}</div>
    <label class="f">참가 구분<select id="eType">${MEMBER_TYPES.map(t => `<option ${p.memberType === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="f">거주 지역<select id="eRegion">${REGIONS.map(r => `<option ${p.region === r ? "selected" : ""}>${r}</option>`).join("")}</select></label>
    <label class="f">휴대폰 번호<input id="ePhone" inputmode="tel" value="${esc(p.phone || "")}"></label>
    <label class="check"><input type="checkbox" id="ePhoto" ${p.photoConsent ? "checked" : ""}> [선택] 행사 사진·영상 촬영 및 활용 동의</label>
    <label class="f">참여 방식<select id="eMode"><option value="onsite" ${p.mode !== "online" ? "selected" : ""}>부산 현장</option><option value="online" ${p.mode === "online" ? "selected" : ""}>온라인</option></select></label>
    <p class="err" id="eErr" role="alert"></p><button class="btn" type="submit">저장</button></form>`);
  $("#eOrgR").onchange = () => { $("#eOrgCWrap").innerHTML = orgCouncilField($("#eOrgR").value, "", "eOrgC"); };
  $("#pf").onsubmit = async e => {
    e.preventDefault();
    const opt = $("#eOpt").checked;
    const d = { name: $("#eName").value.trim(), org: opt ? $("#eOrg").value.trim() : "", region: $("#eRegion").value, orgRegion: $("#eOrgR").value, orgCouncil: $("#eOrgR").value === ORG_NONE ? "" : ($("#eOrgC") ? $("#eOrgC").value.trim() : ""), memberType: $("#eType").value, phone: opt ? $("#ePhone").value.trim() : "", mode: $("#eMode").value, optionalConsent: opt, photoConsent: $("#ePhoto").checked };
    if (!opt && ($("#eOrg").value.trim() || $("#ePhone").value.trim()) && !confirmedOpt) { confirmedOpt = true; return ($("#eErr").textContent = "선택 동의를 끄면 휴대폰 번호와 소속이 지워져요. 맞으면 저장을 한 번 더 눌러 주세요."); }
    if (!d.name) return ($("#eErr").textContent = "이름을 적어 주세요.");
    if (d.orgRegion !== ORG_NONE && !d.orgCouncil) return ($("#eErr").textContent = "소속 협의회를 골라 주세요.");
    if (d.phone && !/^01[016789]-?\d{3,4}-?\d{4}$/.test(d.phone)) return ($("#eErr").textContent = "휴대폰 번호 형식을 확인해 주세요.");
    try { await B.updateProfile(d); Object.assign(S.profile, d); closeSheet(); render(); toast("저장했어요"); }
    catch (e2) { $("#eErr").textContent = "저장하지 못했어요. 다시 시도해 주세요."; }
  };
}

/* ───────── 도우미 ───────── */
let busy = false;
function ask(q) {
  q = q.trim(); if (!q || busy) return;
  busy = true; S.chat.push({ who: "me", text: q }); render();
  const c = $("#chat"); c.insertAdjacentHTML("beforeend", '<div class="msg ai typing"><i></i><i></i><i></i></div>'); c.lastElementChild.scrollIntoView({ block: "nearest" });
  const r = faqAnswer(q, { att: myAttended(), profile: S.profile, deepApp: S.deepApp, next: nextLecture(), fmtDate });
  setTimeout(() => {
    busy = false; S.chat.push({ who: "ai", text: r.a, src: r.src, ask: r.unknown ? q : null }); render();
    const c2 = $("#chat"); c2 && c2.lastElementChild.scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" });
  }, RM ? 0 : 650);
}

/* ───────── 운영진 계산 ───────── */
function stats() {
  const n = S.users.length;
  const regions = new Set(S.users.map(u => u.region).filter(Boolean)).size;
  const past = LECTURES.filter(l => lectureState(l) !== "future");
  const rate = n && past.length ? Math.round(past.reduce((s, l) => s + S.allAtt.filter(a => a.lecture === l.n).length, 0) / (past.length * n) * 100) : 0;
  const per = S.users.map(u => { const att = attOf(u.uid); return { u, att, rem: remainingFor(att) }; });
  return {
    n, regions, rate,
    passed: per.filter(x => x.att.length >= PASS_COUNT).length,
    risk: per.filter(x => x.att.length < PASS_COUNT && x.att.length + x.rem === PASS_COUNT),
    lost: per.filter(x => x.att.length + x.rem < PASS_COUNT),
    per
  };
}
function rankRows() {
  const J = S.judge;
  const rows = TEAMS.map((t, i) => { const sc = S.scores.filter(s => s.team === i); const avg = sc.length ? sc.reduce((a, s) => a + s.crit.reduce((x, y) => x + y, 0), 0) / sc.length : 0; return { t, i, avg, k: sc.length }; }).sort((a, b) => b.avg - a.avg);
  return rows.map((r, k) => `<tr data-team="${r.i}"><td><span class="rank ${k === 0 && r.k ? "g1" : ""}">${k + 1}</span></td><td>${esc(r.t)}${J.round === "예선" && k < 4 && r.k ? ' <span class="pill p-ok">본선</span>' : ""}</td><td class="r num">${r.k}</td><td class="r num">${r.k ? r.avg.toFixed(1) : "-"}</td></tr>`).join("");
}
function csvExport() {
  const head = ["수강번호", "이름", "이메일", "출생연도", "지역", "민주평통 소속", "참가 구분", "소속", "연락처", "참여방식", ...LECTURES.map(l => `${l.n}강`), "출석 수", "수료", "심화 지원", "심화 결과", "선택 동의", "사진 동의", "신청일"];
  const lines = [head];
  S.users.forEach(u => {
    const att = attOf(u.uid), d = S.deepApps.find(a => a.uid === u.uid);
    const m = l => { const r = S.allAtt.find(a => a.uid === u.uid && a.lecture === l.n); return r ? (r.method === "online" ? "온라인" : r.method === "manual" ? "수동" : "현장") : ""; };
    lines.push([u.no, u.name, u.email, u.birthYear, u.region, affiliationLabel(u), u.memberType || "", u.org, u.phone, u.mode === "online" ? "온라인" : "현장", ...LECTURES.map(m), att.length, att.length >= PASS_COUNT ? "Y" : "N", d ? "Y" : "N", d ? DEEP_STATUS[d.status] || "" : "", u.optionalConsent ? "Y" : "N", u.photoConsent ? "Y" : "N", u.createdAt ? fmtTime(u.createdAt) : ""]);
  });
  const csv = "﻿" + lines.map(r => r.map(v => { v = String(v ?? ""); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }).join(",")).join("\r\n");
  const name = `평화학교_참가자_${todayStr()}.csv`;
  try {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`${S.users.length}명 명단을 내려받았어요`);
  } catch (e) { copyText(csv, "명단을 복사했어요. 엑셀에 붙여 넣으세요."); }
}
function reportDraft() {
  const st = stats(), sel = S.deepApps.filter(a => a.status === "selected").length;
  const byRegion = {}; S.users.forEach(u => (byRegion[u.region] = (byRegion[u.region] || 0) + 1));
  const top = Object.entries(byRegion).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([r, k]) => `${r} ${k}명`).join(", ");
  const online = S.users.filter(u => u.mode === "online").length;
  const byAff = {}; S.users.forEach(u => { const c = affiliationLabel(u); byAff[c] = (byAff[c] || 0) + 1; });
  const affLine = Object.entries(byAff).sort((a, b) => b[1] - a[1]).map(([c, k]) => `${c === ORG_ROOT ? "소속 없음(일반 청년)" : c} ${k}명`).join(", ");
  const byType = MEMBER_TYPES.map(t => `${t} ${S.users.filter(u => u.memberType === t).length}명`).join(", ");
  const t = `${APP.year} ${APP.name} 결과보고(초안)
작성 기준일: ${fmtDate(todayStr())} / 앱 집계 자동 작성, 담당자 검토 후 확정

1. 참가 현황
 - 기본과정 신청: ${st.n}명 (${st.regions}개 시·도, 온라인 희망 ${online}명)
 - 지역 분포 상위: ${top || "-"}
 - 민주평통 소속별: ${affLine || "-"}
 - 참가 구분: ${byType}

2. 출결 현황
${LECTURES.map(l => { const k = S.allAtt.filter(a => a.lecture === l.n); return ` - ${l.n}강 ${fmtDate(l.date)} 「${l.title}」: ${k.length}명 (현장 ${k.filter(a => a.method !== "online").length}, 온라인 ${k.filter(a => a.method === "online").length})`; }).join("\n")}
 - 지난 강의 평균 출석률: ${st.rate}%

3. 수료
 - 수료 요건(${LECTURES.length}강 중 ${PASS_COUNT}강) 충족: ${st.passed}명 (수료율 ${st.n ? Math.round(st.passed / st.n * 100) : 0}%)

4. 심화과정
 - 지원 ${S.deepApps.length}명 / 선발 ${sel}명 (정원 ${DEEP.cap}명) / 예비 ${S.deepApps.filter(a => a.status === "waitlist").length}명

5. 참가자 문의
 - 앱 문의 ${S.questions.length}건 (답변 완료 ${S.questions.filter(q => q.answer).length}건)

※ 만족도 조사 결과와 정성 평가는 담당자가 덧붙여 주세요.`;
  sheet(`<h2 style="margin:0 0 6px;font-size:1.05rem">결과보고서 초안</h2><p class="small muted" style="margin:0 0 10px">앱에 쌓인 숫자로 채운 초안이에요. 복사해서 한글 문서에 붙여 넣으세요.</p><textarea id="rpt" rows="16" style="width:100%;font-size:.8rem;padding:10px;border-radius:12px;border:1px solid var(--line);background:var(--surface)">${esc(t)}</textarea><button class="btn block" style="margin-top:10px" id="cpRpt">복사</button>`);
  $("#cpRpt").onclick = () => copyText(t, "복사했어요", $("#rpt"));
}
async function myDataExport() {
  const data = { 안내: `${APP.org} ${APP.name} 개인정보 열람 (개인정보 보호법 제35조)`, 내려받은_시각: fmtTime(Date.now()), 계정: { id: S.user.uid, 이메일: S.user.email }, 신청서: S.profile, 출결: S.myAtt.map(a => ({ 강: a.lecture, 방식: a.method, 일시: fmtTime(a.at) })), 심화과정_지원서: S.deepApp, 문의: S.myQs.map(q => ({ 내용: q.text, 답변: q.answer || "", 일시: fmtTime(q.at) })) };
  const json = JSON.stringify(data, (k, v) => (v && typeof v === "object" && typeof v.toMillis === "function" ? fmtTime(v.toMillis()) : v), 2);
  try {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `내정보_${todayStr()}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000); toast("내 정보를 내려받았어요");
  } catch (e) { sheet(`<h2 style="margin:0 0 6px;font-size:1.05rem">내 정보</h2><textarea id="myj" rows="14" style="width:100%;font-size:.75rem">${esc(json)}</textarea>`); }
}
async function copyText(t, msg, el) {
  try { await navigator.clipboard.writeText(t); toast(msg); }
  catch (e) { if (el) { el.focus(); el.select(); } toast("길게 눌러 직접 복사해 주세요"); }
}
function userSheet(uid) {
  const u = S.users.find(x => x.uid === uid); if (!u) return;
  const att = attOf(uid), isSt = S.staffList.some(s => s.id === uid), d = S.deepApps.find(a => a.uid === uid);
  sheet(`<div class="row between"><h2 style="margin:0;font-size:1.05rem">${esc(u.name)}</h2><span class="pill p-gold">${esc(u.no)}</span></div>
  <dl class="kv" style="margin-top:10px"><dt>이메일</dt><dd>${esc(u.email)}</dd><dt>출생</dt><dd>${esc(u.birthYear)}년</dd><dt>민주평통</dt><dd>${esc(affiliationLabel(u))}</dd><dt>구분</dt><dd>${esc(u.memberType || "-")}</dd><dt>지역</dt><dd>${esc(u.region)}</dd><dt>소속</dt><dd>${esc(u.org || "-")}</dd><dt>연락처</dt><dd>${esc(u.phone || "-")}</dd><dt>참여</dt><dd>${u.mode === "online" ? "온라인" : "현장"}</dd><dt>사진 동의</dt><dd>${u.photoConsent ? "동의" : "미동의"}</dd><dt>심화</dt><dd>${d ? DEEP_STATUS[d.status] : "미지원"}</dd></dl>
  <h3 style="margin:14px 0 6px;font-size:.9rem">출결 (눌러서 수동 처리)</h3>
  <div class="row" style="gap:6px">${LECTURES.map(l => `<button class="dot ${att.includes(l.n) ? "done" : ""}" style="flex:1;border:0;cursor:pointer" data-man="${l.n}" aria-pressed="${att.includes(l.n)}" aria-label="${l.n}강 ${att.includes(l.n) ? "출석 취소" : "출석 처리"}">${l.n}</button>`).join("")}</div>
  <p class="small muted" style="margin:8px 0 0">휴대폰 분실, 중계 접속 확인 등 예외 상황에만 쓰세요. 처리한 운영진이 함께 기록돼요.</p>
  <div class="row wrap" style="gap:8px;margin-top:12px">${isSt ? "" : '<button class="btn ghost mini" id="mkStaff">운영진으로 지정</button>'}</div>`);
  $$("[data-man]").forEach(b => (b.onclick = async () => {
    const n = +b.dataset.man, on = attOf(uid).includes(n);
    try { if (on) await B.removeAttendance(uid, n); else await B.recordAttendance(uid, n, "manual"); toast(`${u.name} ${n}강 ${on ? "출석 취소" : "출석 처리"}`); b.classList.toggle("done", !on); b.setAttribute("aria-pressed", !on); }
    catch (e) { toast("처리하지 못했어요"); }
  }));
  const mk = $("#mkStaff");
  mk && (mk.onclick = async () => { if (!(await confirmSheet("운영진으로 지정할까요?", `${u.name}님이 모든 참가자 정보와 출결을 보고 고칠 수 있게 돼요.`, "지정하기"))) return; try { await B.addStaff(uid, u.name); toast("운영진으로 지정했어요"); } catch (e) { toast("지정하지 못했어요"); } });
}

/* ───────── QR 스캐너 ───────── */
let scanner = null, lastCode = "", lastAt = 0;
function loadScript(src) { return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src === src)) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function startScanner() {
  if (!LS.get("camNotice", false)) {
    sheet(`<h2 style="margin:0 0 6px;font-size:1.05rem">카메라 접근권한 안내</h2><p class="small" style="margin:0 0 8px"><b>[선택] 카메라</b>: 참가자 QR 수강증을 찍어 출석을 기록할 때만 사용해요. 영상은 저장하거나 전송하지 않아요.</p><p class="small muted" style="margin:0 0 12px">허용하지 않아도 수강번호 직접 입력으로 출석 처리를 할 수 있어요. 허용은 휴대폰 설정에서 언제든 철회할 수 있어요.</p><button class="btn block" id="camOk">확인하고 카메라 켜기</button>`);
    $("#camOk").onclick = () => { LS.set("camNotice", true); closeSheet(); startScanner(); };
    return;
  }
  const btn = $("#camBtn"); btn.disabled = true; btn.textContent = "카메라 준비 중…";
  try {
    await loadScript("https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js");
    $("#scanPh").hidden = true; $("#reader").hidden = false;
    scanner = new window.Html5Qrcode("reader", { verbose: false });
    await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * .7); return { width: s, height: s }; } }, onScan, () => {});
    btn.disabled = false; btn.textContent = "카메라 끄기"; btn.onclick = () => { stopScanner(); render(); };
  } catch (e) {
    console.error(e); scanner = null;
    $("#scanPh").hidden = false; $("#reader").hidden = true;
    btn.disabled = false; btn.textContent = "카메라 켜기";
    toast("카메라를 쓸 수 없어요. 설정에서 카메라 권한을 허용해 주세요. 수강번호 입력은 계속 쓸 수 있어요.", 4200);
  }
}
function stopScanner() { if (scanner) { const s = scanner; scanner = null; s.stop().then(() => s.clear()).catch(() => {}); } }
async function onScan(text) {
  const now = Date.now();
  if (text === lastCode && now - lastAt < 4000) return;
  lastCode = text; lastAt = now;
  const m = /^PSB1:([A-Za-z0-9_-]{6,128})$/.exec(text.trim());
  if (!m) { toast("평화학교 QR이 아니에요"); return; }
  await checkIn(m[1], "qr");
}
async function checkIn(uid, method) {
  const u = S.users.find(x => x.uid === uid);
  if (!u) { toast("등록되지 않은 참가자예요. 수강 신청 여부를 확인해 주세요."); navigator.vibrate && navigator.vibrate([60, 60, 60]); return; }
  try {
    const r = await B.recordAttendance(uid, S.scanLecture, method);
    navigator.vibrate && navigator.vibrate(r.duplicate ? [40, 40, 40] : 80);
    const rc = $("#recent");
    rc && rc.insertAdjacentHTML("afterbegin", `<div class="li new"><span class="pill ${r.duplicate ? "p-warn" : "p-ok"}">${r.duplicate ? "중복" : "방금"}</span><div class="body">${esc(u.name)} · ${esc(u.no)}</div></div>`);
    toast(r.duplicate ? `${u.name}님은 이미 출석했어요` : `${u.name}님 ${S.scanLecture}강 출석`);
    const sc = $("#reader"); if (sc && !r.duplicate && !RM) { sc.style.outline = "4px solid var(--ok)"; setTimeout(() => (sc.style.outline = ""), 500); }
  } catch (e) { console.error(e); toast("기록하지 못했어요. 인터넷 연결을 확인해 주세요."); }
}
const PARTIAL = {
  scan() {
    const n = S.scanLecture, list = S.allAtt.filter(a => a.lecture === n);
    const on = list.filter(a => a.method !== "online").length;
    const c = $("#scanCount"); if (!c) return;
    c.textContent = on; $("#scanBar").style.width = Math.min(100, on / ONSITE_CAP * 100) + "%";
    $("#scanOnline").textContent = `온라인 ${list.length - on}명 별도`;
    const rc = $("#recent");
    if (rc && !rc.dataset.init) {
      rc.dataset.init = 1;
      rc.innerHTML = list.sort((a, b) => b.at - a.at).slice(0, 8).map(a => { const u = S.users.find(x => x.uid === a.uid); return `<div class="li"><span class="pill p-ok">${fmtTime(a.at).split(" ").pop()}</span><div class="body">${esc(u ? u.name + " · " + u.no : a.uid)} · ${a.method === "online" ? "온라인" : a.method === "manual" ? "수동" : "현장"}</div></div>`; }).join("") || '<p class="small muted">아직 출석한 사람이 없어요.</p>';
    }
  }
};

/* ───────── 이벤트 연결 ───────── */
const BIND = {
  home() {
    $("#allNoti").onclick = openNotices;
    const vOk = $("#vOk");
    if (vOk) { $("#vPv").onclick = privacySheet; $("#vTm").onclick = termsSheet; vOk.onclick = async () => { try { await B.updateProfile({ privacyVersion: APP.privacyVersion, termsVersion: APP.termsVersion }); Object.assign(S.profile, { privacyVersion: APP.privacyVersion, termsVersion: APP.termsVersion }); render(); } catch (e) { toast("저장하지 못했어요"); } }; }
    const a = $("#applyBtn"); a && (a.onclick = deepForm);
    const e = $("#editDeep"); e && (e.onclick = deepForm);
  },
  sched() {},
  att() {
    const f = $("#flip"), tg = () => f.classList.toggle("on");
    f.onclick = tg; f.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tg(); } };
    const o = $("#onlineBtn");
    o && (o.onclick = async () => {
      const l = todayLecture(); if (!l) return;
      o.disabled = true;
      try { await B.checkInOnline(l.n); const c = myAttended().length + (myAttended().includes(l.n) ? 0 : 1); celebrate("온라인 출석 완료", `${l.n}강 · ${fmtDate(l.date)}`, `${c} / ${LECTURES.length}강`); }
      catch (e) { console.error(e); o.disabled = false; toast("출석을 기록하지 못했어요. 다시 눌러 주세요."); }
    });
  },
  ai() {
    $$("[data-q]").forEach(b => (b.onclick = () => ask(b.dataset.q)));
    $("#chatForm").onsubmit = e => { e.preventDefault(); const v = $("#chatIn").value; $("#chatIn").value = ""; $("#chatIn").blur(); ask(v); };
    $$("[data-askq]").forEach(b => (b.onclick = async () => {
      const m = S.chat[+b.dataset.askq]; if (!m || !m.ask) return;
      b.disabled = true;
      try { await B.askQuestion(m.ask.slice(0, 500)); m.ask = null; S.chat.push({ who: "ai", text: "운영진에게 전달했어요. 답변이 오면 아래 '내 문의'에 보여요." }); render(); }
      catch (e) { b.disabled = false; toast("전달하지 못했어요"); }
    }));
  },
  me() {
    $("#editBtn").onclick = editProfileSheet;
    const pb = $("#printBtn"); pb && (pb.onclick = () => printCert(S.profile));
    $("#lgT").onchange = e => { LS.set("large", e.target.checked); applyPrefs(); };
    $$("[data-theme-set]").forEach(b => (b.onclick = () => { LS.set("theme", b.dataset.themeSet); applyPrefs(); render(); }));
    $("#cpUid").onclick = () => copyText(S.user.uid, "계정 ID를 복사했어요");
    $("#pvBtn2").onclick = privacySheet; $("#tmBtn2").onclick = termsSheet; $("#pmBtn2").onclick = permSheet; $("#dlBtn").onclick = myDataExport;
    $("#outBtn").onclick = async () => { if (await confirmSheet("로그아웃할까요?", "다시 들어오려면 이메일과 비밀번호가 필요해요.", "로그아웃")) B.signOut(); };
    $("#delBtn").onclick = async () => {
      if (!(await confirmSheet("회원 탈퇴할까요?", "계정, 수강 신청서, 출결 기록, 문의, 심화 지원서가 즉시 지워지고 되돌릴 수 없어요. 수료 요건과 수료증도 함께 사라져요.", "탈퇴하기", true))) return;
      try { await B.deleteAccount(); toast("탈퇴했어요. 그동안 고마웠어요."); }
      catch (e) { toast(authMsg(e), 4000); }
    };
  },
  dash() {
    const st = stats();
    $("#riskBtn").onclick = () => sheet(`<h2 style="margin:0 0 8px;font-size:1.05rem">수료 위험 ${st.risk.length}명</h2><p class="small muted" style="margin:0 0 10px">남은 강의를 모두 출석해야 수료할 수 있어요.</p><div class="list small">${st.risk.map(x => `<div class="li"><div class="body"><div class="k">${esc(x.u.name)} · ${esc(x.u.no)}</div><div class="muted">${esc(x.u.phone || x.u.email)}</div></div><span class="pill p-warn">${x.att.length}/${LECTURES.length}</span></div>`).join("")}</div>`);
    $("#nudgeBtn").onclick = () => { S.notiDraft = { title: "[수료 안내] 남은 강의를 꼭 챙겨 주세요", body: "남은 강의를 모두 들으면 수료할 수 있어요. 현장 참석이 어렵다면 온라인 출석도 인정돼요." }; go("noti"); };
    $("#csvBtn").onclick = csvExport;
    $("#reportBtn").onclick = reportDraft;
    $$("[data-unstaff]").forEach(b => (b.onclick = async () => { if (!(await confirmSheet("운영진에서 해제할까요?", "이 계정은 더 이상 운영진 화면을 쓸 수 없어요.", "해제", true))) return; try { await B.removeStaff(b.dataset.unstaff); toast("해제했어요"); } catch (e) { toast("해제하지 못했어요"); } }));
    $("#staffForm").onsubmit = async e => {
      e.preventDefault(); const id = $("#staffUid").value.trim();
      if (!/^[A-Za-z0-9_-]{6,128}$/.test(id)) return toast("계정 ID 형식이 아니에요");
      try { await B.addStaff(id, "운영진"); $("#staffUid").value = ""; toast("운영진으로 추가했어요"); } catch (e2) { toast("추가하지 못했어요"); }
    };
  },
  people() {
    const q = $("#pq");
    q.oninput = () => { S.peopleQ = q.value; clearTimeout(q.t); q.t = setTimeout(() => { const pos = q.selectionStart; render(); const n = $("#pq"); n.focus(); n.setSelectionRange(pos, pos); }, 250); };
    $("#pc").onchange = e => { S.peopleC = e.target.value; render(); };
    $$("[data-pf]").forEach(b => (b.onclick = () => { S.peopleF = b.dataset.pf; render(); }));
    $$("[data-user]").forEach(b => (b.onclick = () => userSheet(b.dataset.user)));
  },
  scan() {
    $("#scanL").onchange = e => { S.scanLecture = +e.target.value; const r = $("#recent"); delete r.dataset.init; PARTIAL.scan(); };
    $("#camBtn").onclick = startScanner;
    $("#manualForm").onsubmit = e => {
      e.preventDefault(); const no = $("#manualNo").value.trim().toUpperCase();
      const u = S.users.find(x => String(x.no).toUpperCase() === no);
      if (!u) return toast("그 수강번호를 찾지 못했어요");
      $("#manualNo").value = ""; checkIn(u.uid, "manual");
    };
    PARTIAL.scan();
  },
  noti() {
    $$("[data-tpl]").forEach(b => (b.onclick = () => { const v = b.dataset.tpl; $("#nTitle").value = v.split("\n")[0].slice(0, 60); $("#nBody").value = v; }));
    $("#notiForm").onsubmit = async e => {
      e.preventDefault();
      const title = $("#nTitle").value.trim(), body = $("#nBody").value.trim();
      if (!title || !body) return toast("제목과 내용을 적어 주세요");
      try { await B.addNotice({ title, body, audience: $("#nAud").value }); S.notiDraft = null; $("#nTitle").value = ""; $("#nBody").value = ""; toast("공지를 올렸어요"); }
      catch (e2) { toast("올리지 못했어요"); }
    };
    $$("[data-delnoti]").forEach(b => (b.onclick = async () => { if (!(await confirmSheet("공지를 지울까요?", "참가자 앱에서도 바로 사라져요.", "삭제", true))) return; try { await B.deleteNotice(b.dataset.delnoti); toast("지웠어요"); } catch (e) { toast("지우지 못했어요"); } }));
    $$("[data-ans]").forEach(f => (f.onsubmit = async e => { e.preventDefault(); const v = f.querySelector("input").value.trim(); if (!v) return; try { await B.answerQuestion(f.dataset.ans, v); toast("답변했어요"); } catch (e2) { toast("답변하지 못했어요"); } }));
  },
  deep() {
    $$("[data-df]").forEach(b => (b.onclick = () => { S.deepF = b.dataset.df; render(); }));
    $$("[data-dset]").forEach(b => (b.onclick = async () => {
      const st = b.dataset.st, uid = b.dataset.dset, cur = S.deepApps.find(a => a.uid === uid);
      if (st === "selected" && cur.status !== "selected" && S.deepApps.filter(a => a.status === "selected").length >= DEEP.cap) return toast(`정원 ${DEEP.cap}명이 다 찼어요. 다른 사람을 예비로 바꾼 뒤 선발해 주세요.`, 3600);
      try { await B.setDeepStatus(uid, st); } catch (e) { toast("바꾸지 못했어요"); }
    }));
  },
  judge() {
    $$("[data-round]").forEach(b => (b.onclick = () => { S.judge.round = b.dataset.round; restartScores(); render(); }));
    $("#tSel").onchange = e => { S.judge.team = +e.target.value; render(); };
    const vals = () => $$("[data-ci]").map(r => +r.value);
    $$("[data-ci]").forEach(r => (r.oninput = () => { const ci = +r.dataset.ci; $("#sv" + ci).textContent = r.value + " / " + CRITERIA[ci].w; $("#jsum").textContent = vals().reduce((a, b) => a + b, 0) + " / 100"; }));
    $("#saveScore").onclick = async () => {
      try { await B.saveScore(S.judge.round, S.judge.team, vals()); toast(`${TEAMS[S.judge.team]} 점수를 저장했어요`); }
      catch (e) { toast("저장하지 못했어요"); }
    };
  }
};

/* ───────── 데이터 구독 ───────── */
function stopAll() { S._profSubs = false; unsubs.forEach(u => u && u()); unsubs = []; staffUnsubs.forEach(u => u && u()); staffUnsubs = []; }
function restartScores() {
  if (S._scoreUnsub) S._scoreUnsub();
  S._scoreUnsub = B.watchScores(S.judge.round, r => { S.scores = r; if (S.tab.a === "judge") { const tb = $("#rankBody"); tb ? (tb.innerHTML = rankRows()) : refresh(); } });
  staffUnsubs.push(() => S._scoreUnsub && S._scoreUnsub());
}
function startStaffData() {
  if (staffUnsubs.length || !S.staff) return;
  staffUnsubs.push(B.watchUsers(r => { S.users = r; refresh(); }));
  staffUnsubs.push(B.watchAllAttendance(r => { S.allAtt = r; refresh(); }));
  staffUnsubs.push(B.watchDeepApps(r => { S.deepApps = r; refresh(); }));
  staffUnsubs.push(B.watchQuestions(r => { S.questions = r; refresh(); }));
  staffUnsubs.push(B.watchStaff(r => { S.staffList = r; refresh(); }));
  restartScores();
}
let prevAttCount = null;
async function onSignedIn(u) {
  S.user = u;
  $("#root").innerHTML = '<div class="auth"><p class="note" style="text-align:center">불러오는 중…</p></div>';
  try {
    [S.profile, S.staff] = await Promise.all([B.getProfile(), B.isStaff()]);
    S.deepApp = S.profile ? await B.getDeepApp() : null;
  } catch (e) {
    console.error(e);
    $("#root").innerHTML = '<div class="auth"><section class="card"><h2>연결하지 못했어요</h2><p class="small muted">인터넷 연결을 확인한 뒤 다시 열어 주세요.</p><button class="btn block" onclick="location.reload()">다시 시도</button></section></div>';
    return;
  }
  if (S.profile && S.profile.largeText != null && LS.get("large", null) == null) { LS.set("large", !!S.profile.largeText); applyPrefs(); }
  S.role = S.staff ? LS.get("role", S.profile ? "p" : "a") : "p";
  if (!S.profile && S.staff) S.role = "a";
  unsubs.push(B.watchNotices(r => { S.notices = r; refresh(); }));
  if (S.profile) startProfileData();
  if (S.role === "a") startStaffData();
  if (S.profile || S.staff) { shell(); render("fwd"); } else render();
}
function startProfileData() {
  if (S._profSubs) return; S._profSubs = true;
  {
    unsubs.push(B.watchMyAttendance(r => {
      const before = prevAttCount; S.myAtt = r; const now = myAttended().length; prevAttCount = now;
      // 운영진이 QR을 찍으면 참가자 화면에서 바로 축하
      if (before !== null && now > before && S.role === "p") { const l = todayLecture(); celebrate("출석 완료", l ? `${l.n}강 · ${fmtDate(l.date)}` : "출석이 기록됐어요", `${now} / ${LECTURES.length}강`); }
      refresh();
    }));
    unsubs.push(B.watchMyQuestions(r => { S.myQs = r; refresh(); }));
  }
}

/* ───────── 시작 ───────── */
function offlineBanner() {
  let b = $("#offline");
  if (navigator.onLine) { b && b.remove(); return; }
  if (!b) { b = document.createElement("div"); b.id = "offline"; b.className = "offline"; b.textContent = "오프라인 · 연결되면 자동으로 저장돼요"; document.body.appendChild(b); }
}
window.addEventListener("online", offlineBanner); window.addEventListener("offline", offlineBanner);

(async function boot() {
  B = await createBackend();
  if (B.mode === "demo" && !B.updateDeepApp) B.updateDeepApp = async d => { const a = await B.getDeepApp(); Object.assign(a, d); };
  let first = true;
  B.onAuth(async u => {
    stopAll(); stopScanner(); prevAttCount = null;
    Object.assign(S, { profile: null, staff: false, myAtt: [], notices: [], deepApp: null, myQs: [], users: [], allAtt: [], deepApps: [], questions: [], scores: [], staffList: [], chat: [] });
    if (u) await onSignedIn(u); else { S.user = null; renderAuth(); }
    if (first) { first = false; setTimeout(() => { const sp = $("#splash"); sp && sp.remove(); }, RM ? 0 : 1500); }
  });
  offlineBanner();
  if ("serviceWorker" in navigator && location.protocol === "https:" && !isNative) navigator.serviceWorker.register("sw.js").catch(() => {});
})();

// 카드 기울기 (마우스·터치)
if (!RM) {
  let cur = null;
  const reset = c => { c.classList.remove("tilting"); c.style.removeProperty("--rx"); c.style.removeProperty("--ry"); };
  document.addEventListener("pointermove", e => {
    if (e.target.closest("input,select,textarea,.flip,#reader")) return;
    const c = e.target.closest("main .card, main .stat"); if (cur && cur !== c) reset(cur); cur = c; if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const k = c.classList.contains("stat") ? 10 : Math.max(3, 7 - r.height / 120);
    c.classList.add("tilting"); c.style.setProperty("--ry", ((x - .5) * k * 2).toFixed(2) + "deg"); c.style.setProperty("--rx", ((.5 - y) * k * 2).toFixed(2) + "deg");
    c.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); c.style.setProperty("--my", (y * 100).toFixed(1) + "%");
  });
  document.addEventListener("pointerup", e => { if (cur && e.pointerType !== "mouse") { reset(cur); cur = null; } });
}
