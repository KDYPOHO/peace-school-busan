#!/usr/bin/env python3
"""소개 누리집 빌드: pages/*.html 본문에 공통 머리글·바닥글을 붙여 site/*.html 생성.
사용법: python3 site/build.py   (외부 패키지 불필요)
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
APP = "https://kdypoho.github.io/peace-school-busan/"
ARCHIVE = "https://youtharchive.kr/"
SITE = "https://kdypoho.github.io/peace-school-busan/home/"

MENU = [
    ("about.html", "평화학교 소개", [("about.html#background", "추진 배경"), ("about.html#vision", "비전과 목표"), ("about.html#system", "운영 체계"), ("about.html#changes", "달라진 점")]),
    ("course.html", "교육과정", [("course.html#basic", "기본과정"), ("course.html#deep", "심화과정"), ("course.html#lecturer", "강사 선정 원칙"), ("course.html#complete", "수료 기준")]),
    ("apply.html", "참여 안내", [("apply.html#target", "참여 대상"), ("apply.html#schedule", "모집 일정"), ("apply.html#how", "신청 방법"), ("apply.html#select", "심화과정 선발"), ("apply.html#faq", "자주 묻는 질문")]),
    ("notice.html", "알림마당", [("notice.html#notice", "공지사항"), ("notice.html#data", "자료실")]),
    (ARCHIVE, "청년아카이브", [(ARCHIVE, "아카이브 바로가기"), ("about.html#system", "앱·아카이브 연계")]),
]

PAGES = {
    "index.html": dict(title="한반도 평화학교 부산 청년 과정", desc="민주평화통일자문회의 부산지역회의 한반도 평화학교 부산 청년 과정. 기본과정 5강(회당 2시간)과 심화과정 2박3일(정원 40명)을 전국 청년·대학생에게 운영합니다.", active=None),
    "about.html": dict(title="평화학교 소개", desc="한반도 평화학교 부산 청년 과정의 추진 배경, 비전과 목표, 운영 체계, 2026년 과정 대비 달라진 점을 안내합니다.", active="about.html"),
    "course.html": dict(title="교육과정", desc="기본과정 5강(회당 2시간, 현장·온라인)과 심화과정 2박3일(부산, 정원 40명) 일정과 수료 기준을 안내합니다.", active="course.html"),
    "apply.html": dict(title="참여 안내", desc="참여 대상, 모집 일정, 앱 신청 방법, 심화과정 선발 기준과 자주 묻는 질문을 안내합니다.", active="apply.html"),
    "notice.html": dict(title="알림마당", desc="한반도 평화학교 부산 청년 과정의 공지사항과 자료실입니다.", active="notice.html"),
}

ICON_ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
ICON_OUT = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3L5 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'


def nav(active):
    out = []
    for href, label, subs in MENU:
        ext = href.startswith("http")
        cur = ' aria-current="page"' if href == active else ""
        tgt = ' target="_blank" rel="noopener" title="새 창 열림"' if ext else ""
        newwin = ' target="_blank" rel="noopener" title="새 창 열림"'
        items = "".join(f'<li><a href="{h}"{newwin if h.startswith("http") else ""}>{l}</a></li>' for h, l in subs)
        out.append(f'<li><a href="{href}"{cur}{tgt}>{label}</a><ul class="sub">{items}</ul></li>')
    return "".join(out)


def head(page, meta):
    title = meta["title"] if page == "index.html" else f'{meta["title"]} | 한반도 평화학교 부산 청년 과정'
    ld = {"@context": "https://schema.org", "@type": "WebPage", "name": title, "description": meta["desc"], "inLanguage": "ko",
          "publisher": {"@type": "Organization", "name": "민주평화통일자문회의 부산지역회의"}}
    return f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{meta["desc"]}">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0F1D4A">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta["desc"]}">
<meta property="og:url" content="{SITE}{'' if page == 'index.html' else page}">
<meta property="og:image" content="{SITE}img/photo-sea.jpg">
<link rel="icon" href="img/symbol.png">
<link rel="preload" href="css/fonts/PretendardVariable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/site.css">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body>
<a class="skip" href="#main">본문 바로가기</a>
<div class="draftbar" role="note"><div class="wrap"><b>시안</b><span>사무처 승인 전 시안입니다. 일정·정원·장소·지원 내용은 계획(안)이며 확정 시 변경될 수 있습니다.</span></div></div>
<div class="util"><div class="wrap">
  <a href="https://www.puac.go.kr/" target="_blank" rel="noopener" title="새 창 열림">민주평화통일자문회의</a>
  <a href="{ARCHIVE}" target="_blank" rel="noopener" title="새 창 열림">청년아카이브</a>
  <a href="{APP}">평화학교 앱</a>
</div></div>
<header class="head">
  <div class="wrap">
    <a class="logo" href="index.html"><img src="img/signature-ko.jpg" width="960" height="192" alt="민주평화통일자문회의"><span>한반도 평화학교<small>부산 청년 과정</small></span></a>
    <nav class="gnb" aria-label="주 메뉴"><ul>{nav(meta["active"])}</ul></nav>
    <div class="head-cta">
      <a class="btn btn-navy btn-sm" href="{APP}">앱에서 신청하기</a>
      <button class="menu-toggle" type="button" aria-expanded="false"><span></span><b class="sr">메뉴 열기</b></button>
    </div>
  </div>
</header>
'''


FOOT = f'''
<footer class="foot">
  <div class="wrap">
    <nav class="foot-top" aria-label="바닥글 메뉴">
      <a class="privacy" href="{APP}privacy.html">개인정보 처리방침</a>
      <a href="{APP}terms.html">이용약관</a>
      <a href="about.html#system">운영 체계</a>
      <a href="apply.html#faq">자주 묻는 질문</a>
      <a href="{ARCHIVE}" target="_blank" rel="noopener" title="새 창 열림">청년아카이브</a>
    </nav>
    <div class="foot-body">
      <div class="mark"><img src="img/emblem.jpg" width="320" height="315" alt="민주평화통일자문회의 엠블럼"></div>
      <div>
        <address><b>민주평화통일자문회의 부산지역회의</b><br>한반도 평화학교 부산 청년 과정<br>문의: 부산지역회의 사무처 (주소·전화번호 확정 후 기재)</address>
        <p class="credit">사진 출처(Wikimedia Commons): 재한유엔기념공원·감천문화마을·유엔기념공원 기념관 사진 Bernard Gagnon(CC0), 해운대 바다 사진 Masterhatch(<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ko" target="_blank" rel="noopener">CC BY-SA 4.0</a>, 일부 자름). 앱 화면은 시험용 가상 정보입니다.<br>이 누리집은 쿠키·방문 분석 도구를 쓰지 않으며 개인정보를 수집하지 않습니다.</p>
        <p class="copy">© 2027 민주평화통일자문회의 부산지역회의. 기관 명칭과 로고는 사무처 승인 범위에서만 사용합니다.</p>
      </div>
    </div>
  </div>
</footer>
<script src="js/site.js" defer></script>
</body>
</html>
'''


def build():
    for page, meta in PAGES.items():
        body = (ROOT / "pages" / page).read_text(encoding="utf-8")
        body = body.replace("{{APP}}", APP).replace("{{ARCHIVE}}", ARCHIVE).replace("{{ARROW}}", ICON_ARROW).replace("{{OUT}}", ICON_OUT)
        (ROOT / page).write_text(head(page, meta) + body + FOOT, encoding="utf-8")
        print("built", page)


if __name__ == "__main__":
    build()
