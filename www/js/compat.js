// 오래된 Android 시스템 WebView(Chrome 84 미만)는 flex 상자의 gap을 무시해 간격이 모두 붙어 버린다.
// 그런 기기에서만 gap 값을 바깥 여백(margin)으로 바꿔 넣는다. 최신 기기에서는 아무것도 하지 않는다.
function flexGapSupported() {
  const d = document.createElement("div");
  d.style.cssText = "display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden";
  d.appendChild(document.createElement("div"));
  d.appendChild(document.createElement("div"));
  document.body.appendChild(d);
  const ok = d.scrollHeight === 1;
  d.remove();
  return ok;
}

function px(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }

function applyGaps(root) {
  const all = root.querySelectorAll("*");
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display !== "flex" && cs.display !== "inline-flex") continue;
    const cg = px(cs.columnGap), rg = px(cs.rowGap);
    if (!cg && !rg) continue;
    const col = cs.flexDirection.startsWith("column"), wrap = cs.flexWrap !== "nowrap";
    const kids = [...el.children].filter(k => getComputedStyle(k).position !== "absolute" && getComputedStyle(k).display !== "none");
    kids.forEach((k, i) => {
      if (k.dataset.gapFix === "1") return;
      k.dataset.gapFix = "1";
      if (col) { if (i > 0 && rg) k.style.marginTop = rg + "px"; }
      else {
        if (i > 0 && cg && !wrap) k.style.marginLeft = cg + "px";
        if (wrap) { if (cg) k.style.marginRight = cg + "px"; if (rg) k.style.marginBottom = rg + "px"; }
      }
    });
  }
}

export function initCompat() {
  try {
    if (flexGapSupported()) return;
    document.documentElement.classList.add("no-flexgap");
    let queued = false;
    const run = () => { queued = false; applyGaps(document.body); };
    run();
    new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(run); } })
      .observe(document.body, { childList: true, subtree: true });
  } catch (e) { /* 보정 실패해도 앱은 그대로 동작 */ }
}
