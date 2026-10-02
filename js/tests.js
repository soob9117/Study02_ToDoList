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

// ============================================================
// 테스트 도구: 할 일 데이터
// ============================================================
let todoSeq = 0;

function makeTodo(overrides) {
  todoSeq++;
  return Object.assign(
    {
      id: "t_test_" + todoSeq,
      text: "할 일 " + todoSeq,
      category: "work",
      done: false,
      date: "2026-10-02",
      originalDate: "2026-10-02",
      createdAt: 1000 + todoSeq,
    },
    overrides
  );
}

// ============================================================
// 테스트: Storage 형식 검증
// ============================================================
function expectItemError(overrides, message) {
  const data = { version: 1, todos: [makeTodo(), makeTodo(overrides)] };
  assertEqual(TodoApp.Storage.validateData(data), { ok: false, error: "2번째 항목: " + message });
}

test("Storage.validateData: 정상 데이터와 빈 목록을 통과시킨다", () => {
  const { validateData } = TodoApp.Storage;
  assertEqual(validateData({ version: 1, todos: [makeTodo(), makeTodo({ done: true })] }), { ok: true });
  assertEqual(validateData({ version: 1, todos: [] }), { ok: true });
});

test("Storage.validateData: 최상위·version·todos 오류", () => {
  const { validateData } = TodoApp.Storage;
  assertEqual(validateData(null), { ok: false, error: "최상위 형식이 잘못되었습니다." });
  assertEqual(validateData([]), { ok: false, error: "최상위 형식이 잘못되었습니다." });
  assertEqual(validateData({ version: 2, todos: [] }), { ok: false, error: "지원하지 않는 version입니다." });
  assertEqual(validateData({ version: 1, todos: {} }), { ok: false, error: "todos가 배열이 아닙니다." });
});

test("Storage.validateData: 항목이 객체가 아니면 거부", () => {
  assertEqual(TodoApp.Storage.validateData({ version: 1, todos: [null] }), {
    ok: false,
    error: "1번째 항목: 객체가 아닙니다.",
  });
});

test("Storage.validateData: id 오류", () => {
  expectItemError({ id: "" }, "id 값이 잘못되었습니다.");
  expectItemError({ id: 7 }, "id 값이 잘못되었습니다.");
});

test("Storage.validateData: id 중복", () => {
  const data = { version: 1, todos: [makeTodo({ id: "same" }), makeTodo({ id: "same" })] };
  assertEqual(TodoApp.Storage.validateData(data), { ok: false, error: "2번째 항목: id가 중복되었습니다." });
});

test("Storage.validateData: text는 공백 제거 후 1~100자", () => {
  expectItemError({ text: "   " }, "text 값이 잘못되었습니다.");
  expectItemError({ text: "가".repeat(101) }, "text 값이 잘못되었습니다.");
  expectItemError({ text: 3 }, "text 값이 잘못되었습니다.");
  const ok = { version: 1, todos: [makeTodo({ text: "가".repeat(100) })] };
  assertEqual(TodoApp.Storage.validateData(ok), { ok: true });
});

test("Storage.validateData: category 오류", () => {
  expectItemError({ category: "etc" }, "category 값이 잘못되었습니다.");
});

test("Storage.validateData: done은 불리언", () => {
  expectItemError({ done: "false" }, "done 값이 잘못되었습니다.");
});

test("Storage.validateData: date 형식·존재 여부", () => {
  expectItemError({ date: "2026-1-5" }, "date 값이 잘못되었습니다.");
  expectItemError({ date: "2026-10-32", originalDate: "2026-10-01" }, "date 값이 잘못되었습니다.");
});

test("Storage.validateData: originalDate 형식·존재 여부", () => {
  expectItemError({ originalDate: "2026-02-30" }, "originalDate 값이 잘못되었습니다.");
});

test("Storage.validateData: originalDate가 date보다 늦으면 거부", () => {
  expectItemError({ date: "2026-10-02", originalDate: "2026-10-03" }, "originalDate가 date보다 늦습니다.");
});

test("Storage.validateData: createdAt은 유한한 숫자", () => {
  expectItemError({ createdAt: "1" }, "createdAt 값이 잘못되었습니다.");
  expectItemError({ createdAt: NaN }, "createdAt 값이 잘못되었습니다.");
});

test("Storage.parseAndValidate: JSON이 아니면 거부", () => {
  assertEqual(TodoApp.Storage.parseAndValidate("{broken"), { ok: false, error: "JSON 형식이 아닙니다." });
});

test("Storage.parseAndValidate: 정상 JSON이면 data를 돌려준다", () => {
  const data = { version: 1, todos: [makeTodo({ id: "a" })] };
  const result = TodoApp.Storage.parseAndValidate(JSON.stringify(data));
  assertEqual(result, { ok: true, data });
});
