(function () {
  "use strict";

  // ============================================================
  // 상수
  // ============================================================
  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
  const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // ============================================================
  // 변환: Date ↔ "YYYY-MM-DD" (로컬 기준, toISOString 사용 금지)
  // ============================================================
  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toLocalDateStr(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  // 로컬 자정 Date를 만든다. 형식이 틀리거나 없는 날짜(예: 2026-02-30)면 null.
  function parseLocalDate(str) {
    if (typeof str !== "string") return null;
    const match = DATE_PATTERN.exec(str);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

  function isValidDateStr(value) {
    return parseLocalDate(value) !== null;
  }

  // ============================================================
  // 계산: 더하기·차이·요일·오늘
  // ============================================================
  function addDays(str, n) {
    const date = parseLocalDate(str);
    date.setDate(date.getDate() + n);
    return toLocalDateStr(date);
  }

  // b - a 일수. 일광절약시간이 있는 지역도 고려해 반올림한다.
  function diffDays(a, b) {
    return Math.round((parseLocalDate(b) - parseLocalDate(a)) / MS_PER_DAY);
  }

  function weekdayLabel(str) {
    return WEEKDAYS[parseLocalDate(str).getDay()];
  }

  function today() {
    return toLocalDateStr(new Date());
  }

  window.TodoApp = window.TodoApp || {};
  window.TodoApp.Dates = {
    toLocalDateStr,
    parseLocalDate,
    isValidDateStr,
    addDays,
    diffDays,
    weekdayLabel,
    today,
  };
})();
