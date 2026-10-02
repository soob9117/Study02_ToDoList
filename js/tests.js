"use strict";

// ============================================================
// 테스트 도구: 등록·단언
// ============================================================
const registeredTests = [];

function test(name, fn) {
  registeredTests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "assert 실패");
}

function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error((message ? message + " — " : "") + "기대값 " + e + ", 실제값 " + a);
  }
}

// ============================================================
// 실행·결과 표시
// ============================================================
function runAllTests() {
  const list = document.getElementById("results");
  let passed = 0;
  registeredTests.forEach((t) => {
    const li = document.createElement("li");
    try {
      t.fn();
      passed++;
      li.className = "pass";
      li.textContent = "✔ " + t.name;
    } catch (err) {
      li.className = "fail";
      li.textContent = "✘ " + t.name + " — " + (err && err.message ? err.message : String(err));
    }
    list.appendChild(li);
  });
  const failed = registeredTests.length - passed;
  const verdict = failed === 0 ? "PASS" : "FAIL";
  document.getElementById("summary").textContent =
    verdict + " " + passed + "/" + registeredTests.length + " 통과, " + failed + " 실패";
  document.title = verdict + " " + passed + "/" + registeredTests.length;
}

document.addEventListener("DOMContentLoaded", runAllTests);

// ============================================================
// 테스트: Dates
// ============================================================
test("Dates.toLocalDateStr: 로컬 자정 직후에도 날짜가 하루 밀리지 않는다", () => {
  assertEqual(TodoApp.Dates.toLocalDateStr(new Date(2026, 9, 2, 0, 30)), "2026-10-02");
});

test("Dates.toLocalDateStr: 한 자리 월·일을 0으로 채운다", () => {
  assertEqual(TodoApp.Dates.toLocalDateStr(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("Dates.parseLocalDate: 로컬 자정 Date를 만들고 잘못된 값은 null", () => {
  const d = TodoApp.Dates.parseLocalDate("2026-10-02");
  assertEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 9, 2, 0]);
  assertEqual(TodoApp.Dates.parseLocalDate("2026-02-30"), null);
  assertEqual(TodoApp.Dates.parseLocalDate("2026-1-5"), null);
});

test("Dates.isValidDateStr: 형식과 실제 존재 여부를 검사한다", () => {
  const { isValidDateStr } = TodoApp.Dates;
  assertEqual(isValidDateStr("2026-10-02"), true);
  assertEqual(isValidDateStr("2028-02-29"), true);
  assertEqual(isValidDateStr("2026-02-30"), false);
  assertEqual(isValidDateStr("2026-13-01"), false);
  assertEqual(isValidDateStr("2026-1-5"), false);
  assertEqual(isValidDateStr(""), false);
  assertEqual(isValidDateStr(20261002), false);
  assertEqual(isValidDateStr(null), false);
});

test("Dates.addDays: 월말·연말을 넘긴다", () => {
  const { addDays } = TodoApp.Dates;
  assertEqual(addDays("2026-12-31", 1), "2027-01-01");
  assertEqual(addDays("2026-03-01", -1), "2026-02-28");
  assertEqual(addDays("2026-10-02", 0), "2026-10-02");
});

test("Dates.diffDays: b - a 일수를 반환한다", () => {
  const { diffDays } = TodoApp.Dates;
  assertEqual(diffDays("2026-09-30", "2026-10-02"), 2);
  assertEqual(diffDays("2026-10-02", "2026-09-30"), -2);
  assertEqual(diffDays("2026-02-27", "2026-03-01"), 2);
  assertEqual(diffDays("2026-10-02", "2026-10-02"), 0);
});

test("Dates.weekdayLabel: 날짜에서 요일을 계산한다", () => {
  const { weekdayLabel } = TodoApp.Dates;
  assertEqual(weekdayLabel("2026-10-02"), "금");
  assertEqual(weekdayLabel("2026-10-01"), "목");
  assertEqual(weekdayLabel("2028-02-29"), "화");
});
