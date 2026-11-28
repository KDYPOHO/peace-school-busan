/* 한반도 평화학교 소개 누리집 공통 스크립트 (외부 라이브러리·분석 도구 없음) */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 모바일 메뉴 */
  var head = document.querySelector('.head');
  var toggle = document.querySelector('.menu-toggle');
  if (head && toggle) {
    var setOpen = function (open) {
      if (head.classList.contains('open') === open) return;
      toggle.click();
    };
    // 메뉴 안 링크를 누르면 닫기 (같은 페이지 구획 이동 포함)
    head.querySelectorAll('.gnb a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    // 넓은 화면으로 바뀌면 닫기 (스크롤 잠금 해제)
    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width: 1021px)');
      var onMq = function () { if (mq.matches) setOpen(false); };
      if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);
    }
    // 열려 있는 동안 Tab 초점을 메뉴 안에서 순환
    head.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !head.classList.contains('open')) return;
      var f = [toggle].concat([].slice.call(head.querySelectorAll('.gnb a')));
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    toggle.addEventListener('click', function () {
      var open = head.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.querySelector('.sr').textContent = open ? '메뉴 닫기' : '메뉴 열기';
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) { var first = head.querySelector('.gnb a'); if (first) first.focus(); } else toggle.focus();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && head.classList.contains('open')) toggle.click();
    });
  }

  /* 하위 메뉴: 보고 있는 구획 표시 */
  var lnbLinks = document.querySelectorAll('.lnb a[href^="#"]');
  if (lnbLinks.length && 'IntersectionObserver' in window) {
    var mark = function (id) { lnbLinks.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false'); }); };
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    lnbLinks.forEach(function (a) { var s = document.getElementById(a.getAttribute('href').slice(1)); if (s) io.observe(s); });
  }

  /* 알림마당 탭 */
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = list.querySelectorAll('[role="tab"]');
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(i); });
      tab.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { select((i + 1) % tabs.length); tabs[(i + 1) % tabs.length].focus(); }
        if (e.key === 'ArrowLeft') { select((i - 1 + tabs.length) % tabs.length); tabs[(i - 1 + tabs.length) % tabs.length].focus(); }
      });
    });
    function select(n) {
      tabs.forEach(function (t, j) {
        var on = j === n;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    }
  });

  /* 모집 개시까지 남은 날 (한국 시간 기준) */
  var dd = document.querySelector('[data-dday]');
  if (dd) {
    var target = Date.parse(dd.getAttribute('data-dday') + 'T00:00:00+09:00');
    var nowKst = new Date(Date.now() + 9 * 3600e3);
    var today = Date.parse(nowKst.toISOString().slice(0, 10) + 'T00:00:00+09:00');
    var diff = Math.round((target - today) / 864e5);
    dd.textContent = diff > 0 ? 'D-' + diff : diff === 0 ? 'D-DAY' : '진행 중';
    var items = document.querySelectorAll('[data-date]');
    for (var k = 0; k < items.length; k++) {
      if (Date.parse(items[k].getAttribute('data-date') + 'T23:59:59+09:00') >= Date.now()) { items[k].classList.add('next'); break; }
    }
  }

  /* 첫 화면 앱 시연: 15초 반복, 매 프레임 시간으로 계산하므로 끝 장면 = 첫 장면 */
  var demo = document.querySelector('.demo');
  if (!demo) return;
  var shots = demo.querySelectorAll('.shot');       // 0 홈, 1 일정, 2 출석, 3 내 정보
  var tap = demo.querySelector('.tap');
  var toast = demo.querySelector('.toast');
  var steps = demo.querySelectorAll('.demo-steps li');
  var btn = demo.querySelector('.demo-pause');
  var LOOP = 15000;
  var ease = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var p = function (t, a, b) { return t <= a ? 0 : t >= b ? 1 : ease((t - a) / (b - a)); };
  // 탭 위치 (화면 대비 비율): 홈 '전체 일정', 하단 '출석', 하단 '내 정보'
  var taps = [[1800, .443, .333], [4600, .497, .943], [9400, .863, .943]];

  function frame(t) {
    var push = p(t, 2200, 2750);                 // 홈 → 일정: 밀어 넣기
    var f12 = p(t, 5000, 5400);                  // 일정 → 출석: 탭 전환
    var f23 = p(t, 9800, 10200);                 // 출석 → 내 정보
    var back = p(t, 14000, 14800);               // 내 정보 → 홈: 처음으로
    set(shots[0], (1 - push) + back, -30 * push * (1 - back));
    set(shots[1], push * (1 - f12), 100 * (1 - push));
    set(shots[2], f12 * (1 - f23), 0);
    set(shots[3], f23 * (1 - back), 0);
    var tp = 0, tx = 0, ty = 0, ts = 1;
    taps.forEach(function (d) {
      if (t >= d[0] && t < d[0] + 520) {
        var q = (t - d[0]) / 520; tp = q < .35 ? q / .35 : 1 - (q - .35) / .65;
        ts = .6 + .6 * ease(q); tx = d[1]; ty = d[2];
      }
    });
    tap.style.opacity = tp;
    if (tp) { tap.style.left = tx * 100 + '%'; tap.style.top = ty * 100 + '%'; tap.style.transform = 'scale(' + ts + ')'; }
    var to = p(t, 6200, 6650) * (1 - p(t, 8800, 9200));
    toast.style.opacity = to;
    toast.style.transform = 'translateY(' + (-16 * (1 - to)) + 'px)';
    var s = t < 4800 ? 0 : t < 9600 ? 1 : t < 14400 ? 2 : 0;
    steps.forEach(function (li, i) { li.classList.toggle('on', i === s); });
  }
  function set(el, o, x) {
    el.style.opacity = Math.max(0, Math.min(1, o));
    el.style.transform = 'translateX(' + x + '%)';
  }

  if (reduce) { frame(0); btn.hidden = true; steps.forEach(function (li) { li.classList.add('on'); }); return; }
  var start = null, paused = false, pausedAt = 0, hiddenAt = 0, visible = true;
  function loop(now) {
    if (start === null) start = now;
    if (!paused && visible) frame((now - start) % LOOP);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  btn.addEventListener('click', function () {
    paused = !paused;
    var now = performance.now();
    if (paused) pausedAt = now; else start += now - pausedAt;  // 사용자 정지 시간만큼 보정
    btn.setAttribute('aria-label', paused ? '앱 시연 재생' : '앱 시연 일시정지');
    btn.innerHTML = paused
      ? '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="currentColor"/></svg>';
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var v = es[0].isIntersecting, now = performance.now();
      if (!v && visible && !paused) hiddenAt = now;          // 화면 밖 정지는 따로 기록
      if (v && !visible && !paused) start += now - hiddenAt;
      visible = v;
    }).observe(demo);
  }
  window.__demoFrame = frame; // 녹화 점검용
})();
