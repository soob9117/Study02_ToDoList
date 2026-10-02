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

// ============================================================
// 테스트 도구: 가짜 저장소
// ============================================================
function fakeStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  const storage = {
    writes: [],
    failGet: false,
    failSet: false,
    getItem(key) {
      if (storage.failGet) throw new Error("getItem 차단");
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      if (storage.failSet) throw new Error("QuotaExceededError");
      storage.writes.push(key);
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
  return storage;
}

function storageWith(todos, backupTodos) {
  const initial = { "todoApp.v1": JSON.stringify({ version: 1, todos }) };
  if (backupTodos) {
    initial["todoApp.v1.backup"] = JSON.stringify({ version: 1, todos: backupTodos });
  }
  return fakeStorage(initial);
}

// ============================================================
// 테스트: Storage 읽기/쓰기·백업
// ============================================================
test("Storage.load: 빈 저장소면 빈 데이터, 오류 없음", () => {
  assertEqual(TodoApp.Storage.load(fakeStorage()), { data: { version: 1, todos: [] }, error: null });
});

test("Storage.save → load 왕복 결과가 같다", () => {
  const s = fakeStorage();
  const data = { version: 1, todos: [makeTodo({ id: "a" }), makeTodo({ id: "b", done: true })] };
  assertEqual(TodoApp.Storage.save(s, data), true);
  assertEqual(TodoApp.Storage.load(s), { data, error: null });
});

test("Storage.load: 깨진 JSON이면 원문을 백업에 보관하고 빈 데이터", () => {
  const s = fakeStorage({ "todoApp.v1": "{broken" });
  assertEqual(TodoApp.Storage.load(s), { data: { version: 1, todos: [] }, error: "corrupt" });
  assertEqual(s.getItem("todoApp.v1.backup"), "{broken");
});

test("Storage.load: 형식이 틀린 JSON도 corrupt로 처리", () => {
  const raw = JSON.stringify({ version: 2, todos: [] });
  const s = fakeStorage({ "todoApp.v1": raw });
  assertEqual(TodoApp.Storage.load(s).error, "corrupt");
  assertEqual(s.getItem("todoApp.v1.backup"), raw);
});

test("Storage.load: 저장소 접근이 막히면 unavailable", () => {
  const s = fakeStorage();
  s.failGet = true;
  assertEqual(TodoApp.Storage.load(s), { data: { version: 1, todos: [] }, error: "unavailable" });
  assertEqual(TodoApp.Storage.hasBackup(s), false);
});

test("Storage.save: setItem이 예외를 던지면 false", () => {
  const s = fakeStorage();
  s.failSet = true;
  assertEqual(TodoApp.Storage.save(s, { version: 1, todos: [] }), false);
});

test("Storage.hasBackup: 백업 키 유무", () => {
  assertEqual(TodoApp.Storage.hasBackup(fakeStorage()), false);
  assertEqual(TodoApp.Storage.hasBackup(fakeStorage({ "todoApp.v1.backup": "x" })), true);
});

test("Storage.replaceData: 현재 원문을 백업에 넣고 새 데이터로 덮어쓴다", () => {
  const s = storageWith([makeTodo({ id: "old" })]);
  const oldRaw = s.getItem("todoApp.v1");
  const next = { version: 1, todos: [makeTodo({ id: "new" })] };
  assertEqual(TodoApp.Storage.replaceData(s, next), true);
  assertEqual(s.getItem("todoApp.v1.backup"), oldRaw);
  assertEqual(JSON.parse(s.getItem("todoApp.v1")), next);
});

test("Storage.readBackup: 없음·손상·정상", () => {
  const { readBackup } = TodoApp.Storage;
  assertEqual(readBackup(fakeStorage()), { ok: false, error: "백업이 없습니다." });
  assertEqual(readBackup(fakeStorage({ "todoApp.v1.backup": "{broken" })), {
    ok: false,
    error: "백업 데이터가 손상되어 복원할 수 없습니다.",
  });
  const result = readBackup(storageWith([], [makeTodo({ id: "b1" })]));
  assertEqual(result.ok, true);
  assertEqual(result.data.todos.map((t) => t.id), ["b1"]);
});

test("Storage.restoreBackup: 본 데이터와 백업을 맞바꾼다", () => {
  const s = storageWith([makeTodo({ id: "cur" })], [makeTodo({ id: "b1" }), makeTodo({ id: "b2" })]);
  const currentRaw = s.getItem("todoApp.v1");
  const backupRaw = s.getItem("todoApp.v1.backup");
  const result = TodoApp.Storage.restoreBackup(s);
  assertEqual(result.ok, true);
  assertEqual(result.data.todos.map((t) => t.id), ["b1", "b2"]);
  assertEqual(s.getItem("todoApp.v1"), backupRaw);
  assertEqual(s.getItem("todoApp.v1.backup"), currentRaw);
});

test("Storage.restoreBackup: 손상된 백업이면 아무것도 바꾸지 않는다", () => {
  const s = fakeStorage({ "todoApp.v1": "현재 원문", "todoApp.v1.backup": "{broken" });
  assertEqual(TodoApp.Storage.restoreBackup(s), {
    ok: false,
    error: "백업 데이터가 손상되어 복원할 수 없습니다.",
  });
  assertEqual(s.getItem("todoApp.v1"), "현재 원문");
  assertEqual(s.getItem("todoApp.v1.backup"), "{broken");
});

// ============================================================
// 테스트: Todos CRUD
// ============================================================
test("Todos.createTodo: 공백을 제거하고 날짜 필드를 채운다", () => {
  const todo = TodoApp.Todos.createTodo("  보고서 초안  ", "work", "2026-10-02", 1000);
  assert(todo.id.startsWith("t_1000_"), "id 형식: " + todo.id);
  assertEqual(
    [todo.text, todo.category, todo.done, todo.date, todo.originalDate, todo.createdAt],
    ["보고서 초안", "work", false, "2026-10-02", "2026-10-02", 1000]
  );
});

test("Todos.createTodo: 잘못된 입력이면 null", () => {
  const { createTodo } = TodoApp.Todos;
  assertEqual(createTodo("", "work", "2026-10-02", 1), null);
  assertEqual(createTodo("   ", "work", "2026-10-02", 1), null);
  assertEqual(createTodo("가".repeat(101), "work", "2026-10-02", 1), null);
  assertEqual(createTodo("할 일", "etc", "2026-10-02", 1), null);
  assert(createTodo("가".repeat(100), "study", "2026-10-02", 1) !== null, "100자는 허용");
});

test("Todos.addTodo: 새 배열을 반환하고 원본은 그대로", () => {
  const original = [makeTodo({ id: "a" })];
  const next = TodoApp.Todos.addTodo(original, makeTodo({ id: "b" }));
  assertEqual(next.map((t) => t.id), ["a", "b"]);
  assertEqual(original.map((t) => t.id), ["a"]);
});

test("Todos.updateTodo: 텍스트(공백 제거)와 카테고리를 바꾼다", () => {
  const original = [makeTodo({ id: "a", text: "이전", category: "work" })];
  const next = TodoApp.Todos.updateTodo(original, "a", { text: "  이후 ", category: "personal" });
  assertEqual([next[0].text, next[0].category], ["이후", "personal"]);
  assertEqual([original[0].text, original[0].category], ["이전", "work"]);
});

test("Todos.updateTodo: 잘못된 값이면 같은 배열을 그대로 반환", () => {
  const original = [makeTodo({ id: "a" })];
  const { updateTodo } = TodoApp.Todos;
  assert(updateTodo(original, "a", { text: "   " }) === original, "빈 텍스트");
  assert(updateTodo(original, "a", { text: "가".repeat(101) }) === original, "101자");
  assert(updateTodo(original, "a", { category: "etc" }) === original, "잘못된 카테고리");
});

test("Todos.deleteTodo: 해당 id만 지운다", () => {
  const original = [makeTodo({ id: "a" }), makeTodo({ id: "b" })];
  assertEqual(TodoApp.Todos.deleteTodo(original, "a").map((t) => t.id), ["b"]);
  assertEqual(original.length, 2);
});

test("Todos.toggleTodo: 완료 상태를 뒤집는다", () => {
  const original = [makeTodo({ id: "a", done: false })];
  const once = TodoApp.Todos.toggleTodo(original, "a");
  assertEqual(once[0].done, true);
  assertEqual(TodoApp.Todos.toggleTodo(once, "a")[0].done, false);
  assertEqual(original[0].done, false);
});

test("Todos.todosForDate: 해당 날짜 항목만", () => {
  const todos = [makeTodo({ id: "a", date: "2026-10-01", originalDate: "2026-10-01" }), makeTodo({ id: "b" })];
  assertEqual(TodoApp.Todos.todosForDate(todos, "2026-10-02").map((t) => t.id), ["b"]);
});

test("Todos.sortTodos: 미완료 먼저, 그 안에서 생성 순", () => {
  const todos = [
    makeTodo({ id: "d1", done: true, createdAt: 1 }),
    makeTodo({ id: "u2", createdAt: 3 }),
    makeTodo({ id: "u1", createdAt: 2 }),
    makeTodo({ id: "d2", done: true, createdAt: 0 }),
  ];
  assertEqual(TodoApp.Todos.sortTodos(todos).map((t) => t.id), ["u1", "u2", "d2", "d1"]);
  assertEqual(todos[0].id, "d1", "원본 순서 유지");
});

// ============================================================
// 테스트 도구: 이월 상황 데이터 (오늘 = 2026-10-02)
// ============================================================
function overdueFixture() {
  return [
    makeTodo({ id: "old1", text: "오래된 일", date: "2026-09-28", originalDate: "2026-09-28" }),
    makeTodo({ id: "old2", text: "그제 일", date: "2026-09-30", originalDate: "2026-09-30" }),
    makeTodo({ id: "doneOld", text: "끝낸 일", date: "2026-09-30", originalDate: "2026-09-30", done: true }),
    makeTodo({ id: "today1", text: "오늘 일", date: "2026-10-02", originalDate: "2026-10-02" }),
    makeTodo({ id: "future", text: "미래 일", date: "2026-10-05", originalDate: "2026-10-05" }),
  ];
}

// ============================================================
// 테스트: Todos 이월·진행률
// ============================================================
test("Todos.overdueTodos: 오늘 이전의 모든 미완료(중간에 빈 날 포함)", () => {
  assertEqual(TodoApp.Todos.overdueTodos(overdueFixture(), "2026-10-02").map((t) => t.id), ["old1", "old2"]);
});

test("Todos.carryOver: date만 오늘로 옮기고 originalDate는 유지", () => {
  const original = overdueFixture();
  const next = TodoApp.Todos.carryOver(original, "2026-10-02");
  const byId = {};
  next.forEach((t) => (byId[t.id] = t));
  assertEqual([byId.old1.date, byId.old1.originalDate], ["2026-10-02", "2026-09-28"]);
  assertEqual([byId.old2.date, byId.old2.originalDate], ["2026-10-02", "2026-09-30"]);
  assertEqual(byId.doneOld.date, "2026-09-30", "완료 항목 제외");
  assertEqual(byId.future.date, "2026-10-05", "미래 항목 제외");
  assertEqual(original[0].date, "2026-09-28", "원본 불변");
});

test("Todos.progress: 전체와 카테고리별 완료/전체", () => {
  const todos = [
    makeTodo({ category: "work", done: true }),
    makeTodo({ category: "work", done: false }),
    makeTodo({ category: "personal", done: true }),
    makeTodo({ category: "study", done: true, date: "2026-10-01", originalDate: "2026-10-01" }),
  ];
  assertEqual(TodoApp.Todos.progress(todos, "2026-10-02"), {
    done: 2,
    total: 3,
    percent: 67,
    byCategory: { work: { done: 1, total: 2 }, personal: { done: 1, total: 1 }, study: { done: 0, total: 0 } },
  });
});

test("Todos.progress: 할 일이 없으면 0% (NaN 아님)", () => {
  assertEqual(TodoApp.Todos.progress([], "2026-10-02"), {
    done: 0,
    total: 0,
    percent: 0,
    byCategory: { work: { done: 0, total: 0 }, personal: { done: 0, total: 0 }, study: { done: 0, total: 0 } },
  });
});

test("Todos.carryDays: 이월된 항목만 N일째", () => {
  const { carryDays } = TodoApp.Todos;
  assertEqual(carryDays(makeTodo({ date: "2026-10-02", originalDate: "2026-09-30" })), 3);
  assertEqual(carryDays(makeTodo({ date: "2026-10-02", originalDate: "2026-10-02" })), 0);
});

// ============================================================
// 테스트 도구: 화면
// ============================================================
function withRendered(stateOverrides, fn) {
  const root = document.createElement("div");
  document.getElementById("test-root").appendChild(root);
  const state = Object.assign(
    {
      todos: [],
      today: "2026-10-02",
      viewDate: "2026-10-02",
      filter: "all",
      editingId: null,
      notice: null,
      saveFailed: false,
      hasBackup: false,
    },
    stateOverrides
  );
  try {
    TodoApp.Render.mount(root);
    TodoApp.Render.render(root, state);
    fn({
      root,
      q: (selector) => root.querySelector(selector),
      qa: (selector) => Array.from(root.querySelectorAll(selector)),
    });
  } finally {
    root.remove();
  }
}

function textOf(ctx, role) {
  return ctx.q('[data-role="' + role + '"]').textContent;
}

function listTexts(ctx) {
  return ctx.qa('[data-role="list"] .todo-text').map((node) => node.textContent);
}

// ============================================================
// 테스트: Render
// ============================================================
test("Render: 오늘이면 날짜·계산된 요일·오늘 표시", () => {
  withRendered({}, (ctx) => assertEqual(textOf(ctx, "date-label"), "2026-10-02 (금) · 오늘"));
});

test("Render: 다른 날짜면 오늘 표시 없음", () => {
  withRendered({ viewDate: "2026-10-01" }, (ctx) => assertEqual(textOf(ctx, "date-label"), "2026-10-01 (목)"));
});

test("Render: 진행률 텍스트·막대·카테고리별", () => {
  const todos = [
    makeTodo({ category: "work", done: true }),
    makeTodo({ category: "work" }),
    makeTodo({ category: "personal", done: true }),
  ];
  withRendered({ todos }, (ctx) => {
    assertEqual(textOf(ctx, "progress-text"), "진행률 2/3 (67%)");
    assertEqual(ctx.q('[data-role="progress-fill"]').style.width, "67%");
    assertEqual(textOf(ctx, "progress-categories"), "업무 1/2 · 개인 1/1 · 공부 0/0");
  });
});

test("Render: 할 일이 없으면 진행률 0/0 (0%)", () => {
  withRendered({}, (ctx) => {
    assertEqual(textOf(ctx, "progress-text"), "진행률 0/0 (0%)");
    assertEqual(ctx.q('[data-role="progress-fill"]').style.width, "0%");
  });
});

test("Render: 목록은 미완료 먼저, 완료 항목은 done 클래스와 체크", () => {
  const todos = [
    makeTodo({ id: "a", text: "끝낸 일", done: true }),
    makeTodo({ id: "b", text: "할 일 B" }),
  ];
  withRendered({ todos }, (ctx) => {
    assertEqual(listTexts(ctx), ["할 일 B", "끝낸 일"]);
    assert(ctx.q('[data-id="a"]').classList.contains("done"), "done 클래스");
    assertEqual(ctx.q('[data-id="a"] [data-action="toggle"]').checked, true);
    assertEqual(ctx.q('[data-id="b"] [data-action="toggle"]').checked, false);
  });
});

test("Render: 필터는 목록만 거르고 진행률은 그대로, 버튼 aria-pressed 표시", () => {
  const todos = [
    makeTodo({ text: "업무 일", category: "work" }),
    makeTodo({ text: "공부 일", category: "study", done: true }),
  ];
  withRendered({ todos, filter: "study" }, (ctx) => {
    assertEqual(listTexts(ctx), ["공부 일"]);
    assertEqual(textOf(ctx, "progress-text"), "진행률 1/2 (50%)");
    assertEqual(ctx.q('[data-filter="study"]').getAttribute("aria-pressed"), "true");
    assertEqual(ctx.q('[data-filter="all"]').getAttribute("aria-pressed"), "false");
  });
});

test("Render: 그 날짜에 할 일이 없을 때 안내", () => {
  withRendered({}, (ctx) => {
    assertEqual(ctx.q('[data-role="empty"]').hidden, false);
    assertEqual(textOf(ctx, "empty"), "이 날짜에 할 일이 없습니다.");
  });
});

test("Render: 필터 결과가 없을 때 안내, 항목이 보이면 안내 숨김", () => {
  withRendered({ todos: [makeTodo({ category: "work" })], filter: "study" }, (ctx) => {
    assertEqual(textOf(ctx, "empty"), "이 카테고리에 할 일이 없습니다.");
  });
  withRendered({ todos: [makeTodo({ category: "work" })] }, (ctx) => {
    assertEqual(ctx.q('[data-role="empty"]').hidden, true);
  });
});

test("Render: 이월 버튼은 오늘 화면 + 대상이 있을 때만", () => {
  withRendered({ todos: overdueFixture() }, (ctx) => {
    const button = ctx.q('[data-role="carry-over"]');
    assertEqual(button.hidden, false);
    assertEqual(button.textContent, "밀린 미완료 2개 가져오기");
  });
  withRendered({ todos: overdueFixture(), viewDate: "2026-10-01" }, (ctx) => {
    assertEqual(ctx.q('[data-role="carry-over"]').hidden, true);
  });
  withRendered({ todos: [makeTodo()] }, (ctx) => {
    assertEqual(ctx.q('[data-role="carry-over"]').hidden, true);
  });
});

test("Render: 이월된 항목에만 N일째 표시", () => {
  const todos = [
    makeTodo({ id: "c", originalDate: "2026-09-30" }),
    makeTodo({ id: "n" }),
  ];
  withRendered({ todos }, (ctx) => {
    assertEqual(ctx.q('[data-id="c"] .todo-carry').textContent, "3일째");
    assertEqual(ctx.q('[data-id="n"] .todo-carry'), null);
  });
});

test("Render: 수정 중인 항목은 입력란과 카테고리 선택으로 그린다", () => {
  const todos = [makeTodo({ id: "a", text: "보고서", category: "personal" })];
  withRendered({ todos, editingId: "a" }, (ctx) => {
    const row = ctx.q('[data-id="a"]');
    assert(row.classList.contains("editing"), "editing 클래스");
    assertEqual(row.querySelector('[data-role="edit-input"]').value, "보고서");
    assertEqual(row.querySelector('[data-role="edit-category"]').value, "personal");
    assertEqual(row.querySelector(".todo-text"), null);
  });
});

test("Render: 백업 복원 버튼은 백업이 있을 때만", () => {
  withRendered({ hasBackup: false }, (ctx) => assertEqual(ctx.q('[data-role="restore-backup"]').hidden, true));
  withRendered({ hasBackup: true }, (ctx) => assertEqual(ctx.q('[data-role="restore-backup"]').hidden, false));
});

test("Render: 안내·저장 실패 메시지", () => {
  withRendered({}, (ctx) => assertEqual(ctx.q('[data-role="messages"]').hidden, true));
  withRendered({ notice: "안내 문구", saveFailed: true }, (ctx) => {
    assertEqual(ctx.q('[data-role="messages"]').hidden, false);
    assertEqual(
      ctx.qa('[data-role="messages"] .message').map((n) => n.textContent),
      ["안내 문구", "저장에 실패했습니다. 새로고침하면 변경 내용이 사라질 수 있습니다."]
    );
  });
});

test("Render: 사용자 텍스트는 HTML로 해석하지 않는다", () => {
  const evil = '<img src=x onerror="window.__xss=1">';
  withRendered({ todos: [makeTodo({ id: "x", text: evil })] }, (ctx) => {
    assertEqual(listTexts(ctx), [evil]);
    assertEqual(ctx.q('[data-id="x"] img'), null);
  });
});

// ============================================================
// 테스트 도구: 앱 띄우기·이벤트
// ============================================================
function withApp(options, fn) {
  options = options || {};
  const root = document.createElement("div");
  document.getElementById("test-root").appendChild(root);
  const storage = options.storage || fakeStorage();
  const dialogs = { confirms: [], alerts: [], downloads: [], answer: options.answer !== undefined ? options.answer : true };
  let todayValue = options.today || "2026-10-02";
  let clock = 5000;
  const app = TodoApp.App.init({
    root,
    storage,
    today: () => todayValue,
    now: () => ++clock,
    confirm: (message) => {
      dialogs.confirms.push(message);
      return dialogs.answer;
    },
    alert: (message) => dialogs.alerts.push(message),
    download: (name, text) => dialogs.downloads.push({ name, text }),
  });
  const ctx = {
    root,
    storage,
    app,
    dialogs,
    q: (selector) => root.querySelector(selector),
    qa: (selector) => Array.from(root.querySelectorAll(selector)),
    setToday: (value) => (todayValue = value),
  };
  try {
    fn(ctx);
  } finally {
    app.destroy();
    root.remove();
  }
}

function pressKey(element, key, extra) {
  element.dispatchEvent(
    new KeyboardEvent("keydown", Object.assign({ key, bubbles: true, cancelable: true }, extra || {}))
  );
}

function addViaUi(ctx, text, category) {
  if (category) ctx.q('[data-role="add-category"]').value = category;
  const input = ctx.q('[data-role="add-input"]');
  input.value = text;
  pressKey(input, "Enter");
}

function savedTodos(storage) {
  return JSON.parse(storage.getItem("todoApp.v1")).todos;
}

function keyWrites(storage) {
  return storage.writes.filter((key) => key === "todoApp.v1").length;
}

// ============================================================
// 테스트: App 기본 동작
// ============================================================
test("App: 오늘 날짜로 시작하고 저장된 할 일을 보여준다", () => {
  withApp({ storage: storageWith([makeTodo({ text: "저장된 일" })]) }, (ctx) => {
    assertEqual(textOf(ctx, "date-label"), "2026-10-02 (금) · 오늘");
    assertEqual(listTexts(ctx), ["저장된 일"]);
  });
});

test("App: Enter로 추가하면 저장되고 입력란이 비며, 다시 열어도 유지된다", () => {
  const storage = fakeStorage();
  withApp({ storage }, (ctx) => {
    addViaUi(ctx, "  보고서 초안  ");
    assertEqual(listTexts(ctx), ["보고서 초안"]);
    assertEqual(ctx.q('[data-role="add-input"]').value, "");
    const saved = savedTodos(storage);
    assertEqual([saved[0].text, saved[0].date, saved[0].originalDate], ["보고서 초안", "2026-10-02", "2026-10-02"]);
  });
  withApp({ storage }, (ctx) => assertEqual(listTexts(ctx), ["보고서 초안"]));
});

test("App: [추가] 버튼으로도 추가된다", () => {
  withApp({}, (ctx) => {
    ctx.q('[data-role="add-input"]').value = "버튼으로 추가";
    ctx.q('[data-action="add"]').click();
    assertEqual(listTexts(ctx), ["버튼으로 추가"]);
  });
});

test("App: 빈 값·공백만 있으면 추가하지 않는다", () => {
  withApp({}, (ctx) => {
    addViaUi(ctx, "");
    addViaUi(ctx, "    ");
    assertEqual(listTexts(ctx), []);
    assertEqual(keyWrites(ctx.storage), 0);
  });
});

test("App: 한글 조합 중 Enter는 무시하고 조합이 끝난 Enter만 추가한다", () => {
  withApp({}, (ctx) => {
    const input = ctx.q('[data-role="add-input"]');
    input.value = "공부하기";
    pressKey(input, "Enter", { isComposing: true });
    assertEqual(listTexts(ctx), []);
    pressKey(input, "Enter");
    assertEqual(listTexts(ctx), ["공부하기"]);
  });
});

test("App: 고른 카테고리로 추가되고 선택은 유지된다", () => {
  withApp({}, (ctx) => {
    addViaUi(ctx, "단어 외우기", "study");
    assertEqual(savedTodos(ctx.storage)[0].category, "study");
    assertEqual(ctx.q('[data-role="add-category"]').value, "study");
  });
});

test("App: 체크박스로 완료를 토글하고 저장한다", () => {
  const storage = storageWith([makeTodo({ id: "a", text: "운동" })]);
  withApp({ storage }, (ctx) => {
    ctx.q('[data-id="a"] [data-action="toggle"]').click();
    assertEqual(savedTodos(storage)[0].done, true);
    assert(ctx.q('[data-id="a"]').classList.contains("done"), "done 클래스");
  });
});

test("App: 삭제는 확인 후 진행한다", () => {
  const storage = storageWith([makeTodo({ id: "a", text: "운동" })]);
  withApp({ storage }, (ctx) => {
    ctx.q('[data-id="a"] [data-action="delete"]').click();
    assertEqual(ctx.dialogs.confirms, ["'운동'을(를) 삭제할까요?"]);
    assertEqual(listTexts(ctx), []);
    assertEqual(savedTodos(storage), []);
  });
});

test("App: 삭제 확인을 거부하면 그대로 둔다", () => {
  const storage = storageWith([makeTodo({ id: "a", text: "운동" })]);
  withApp({ storage, answer: false }, (ctx) => {
    ctx.q('[data-id="a"] [data-action="delete"]').click();
    assertEqual(listTexts(ctx), ["운동"]);
    assertEqual(keyWrites(storage), 0);
  });
});

test("App: 날짜 이동과 다른 날짜에 추가", () => {
  withApp({}, (ctx) => {
    ctx.q('[data-action="prev-day"]').click();
    assertEqual(textOf(ctx, "date-label"), "2026-10-01 (목)");
    addViaUi(ctx, "어제 일");
    const saved = savedTodos(ctx.storage)[0];
    assertEqual([saved.date, saved.originalDate], ["2026-10-01", "2026-10-01"]);
    ctx.q('[data-action="next-day"]').click();
    ctx.q('[data-action="next-day"]').click();
    assertEqual(textOf(ctx, "date-label"), "2026-10-03 (토)");
    assertEqual(listTexts(ctx), []);
    ctx.q('[data-action="go-today"]').click();
    assertEqual(textOf(ctx, "date-label"), "2026-10-02 (금) · 오늘");
  });
});

test("App: 필터 버튼으로 목록을 거른다", () => {
  const storage = storageWith([
    makeTodo({ text: "업무 일", category: "work" }),
    makeTodo({ text: "개인 일", category: "personal" }),
  ]);
  withApp({ storage }, (ctx) => {
    ctx.q('[data-filter="personal"]').click();
    assertEqual(listTexts(ctx), ["개인 일"]);
    assertEqual(ctx.q('[data-filter="personal"]').getAttribute("aria-pressed"), "true");
    ctx.q('[data-filter="all"]').click();
    assertEqual(listTexts(ctx), ["업무 일", "개인 일"]);
  });
});

test("App: 저장 데이터가 깨져 있으면 안내하고 백업 버튼을 보여준다", () => {
  const storage = fakeStorage({ "todoApp.v1": "{broken" });
  withApp({ storage }, (ctx) => {
    assertEqual(textOf(ctx, "messages"), "저장된 데이터를 읽을 수 없어 백업으로 보관하고 새로 시작합니다.");
    assertEqual(ctx.q('[data-role="restore-backup"]').hidden, false);
    assertEqual(storage.getItem("todoApp.v1.backup"), "{broken");
    assertEqual(listTexts(ctx), []);
  });
});

test("App: 저장 실패 시 경고하고 화면은 유지, 다음 저장 성공 시 경고 해제", () => {
  withApp({}, (ctx) => {
    ctx.storage.failSet = true;
    addViaUi(ctx, "첫 번째");
    assertEqual(textOf(ctx, "messages"), "저장에 실패했습니다. 새로고침하면 변경 내용이 사라질 수 있습니다.");
    assertEqual(listTexts(ctx), ["첫 번째"]);
    ctx.storage.failSet = false;
    addViaUi(ctx, "두 번째");
    assertEqual(ctx.q('[data-role="messages"]').hidden, true);
  });
});

test("App: 저장소 접근이 막혀도 멈추지 않고 안내한다", () => {
  const storage = fakeStorage();
  storage.failGet = true;
  withApp({ storage }, (ctx) => {
    assertEqual(textOf(ctx, "messages"), "저장소를 사용할 수 없어 데이터가 저장되지 않습니다.");
    addViaUi(ctx, "그래도 추가");
    assertEqual(listTexts(ctx), ["그래도 추가"]);
  });
});

// ============================================================
// 테스트 도구: 수정 모드
// ============================================================
function focusOut(element, relatedTarget) {
  element.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: relatedTarget || null }));
}

function startEditing(ctx, id) {
  ctx.q('[data-id="' + id + '"] [data-action="edit"]').click();
  return { input: ctx.q('[data-role="edit-input"]'), select: ctx.q('[data-role="edit-category"]') };
}

function editFixture() {
  return storageWith([makeTodo({ id: "a", text: "보고서", category: "work" })]);
}

// ============================================================
// 테스트: App 수정 모드
// ============================================================
test("App 수정: ✎ 버튼으로 수정 모드에 들어간다", () => {
  withApp({ storage: editFixture() }, (ctx) => {
    const { input, select } = startEditing(ctx, "a");
    assert(ctx.q('[data-id="a"]').classList.contains("editing"), "editing 클래스");
    assertEqual([input.value, select.value], ["보고서", "work"]);
  });
});

test("App 수정: ✎만으로 텍스트·카테고리를 바꾸고 Enter로 저장", () => {
  const storage = editFixture();
  withApp({ storage }, (ctx) => {
    const { input, select } = startEditing(ctx, "a");
    input.value = "  보고서 최종본 ";
    select.value = "study";
    pressKey(input, "Enter");
    const saved = savedTodos(storage)[0];
    assertEqual([saved.text, saved.category], ["보고서 최종본", "study"]);
    assertEqual(ctx.q('[data-role="edit-input"]'), null, "수정 모드 종료");
    assertEqual(listTexts(ctx), ["보고서 최종본"]);
  });
});

test("App 수정: Enter 뒤에 blur가 와도 저장은 정확히 1회", () => {
  const storage = editFixture();
  withApp({ storage }, (ctx) => {
    const { input } = startEditing(ctx, "a");
    const before = keyWrites(storage);
    input.value = "새 이름";
    pressKey(input, "Enter");
    focusOut(input);
    assertEqual(keyWrites(storage) - before, 1);
  });
});

test("App 수정: Esc로 취소하면 뒤따르는 blur에도 저장하지 않는다", () => {
  const storage = editFixture();
  withApp({ storage }, (ctx) => {
    const { input } = startEditing(ctx, "a");
    const before = keyWrites(storage);
    input.value = "바꾸다 만 텍스트";
    pressKey(input, "Escape");
    focusOut(input);
    assertEqual(keyWrites(storage) - before, 0);
    assertEqual(listTexts(ctx), ["보고서"]);
  });
});

test("App 수정: 한글 조합 중 Enter는 무시하고 수정 모드를 유지한다", () => {
  const storage = editFixture();
  withApp({ storage }, (ctx) => {
    const { input } = startEditing(ctx, "a");
    const before = keyWrites(storage);
    input.value = "수정하기";
    pressKey(input, "Enter", { isComposing: true });
    assert(ctx.q('[data-role="edit-input"]') === input, "수정 모드 유지");
    assertEqual(keyWrites(storage) - before, 0);
    pressKey(input, "Enter");
    assertEqual(savedTodos(storage)[0].text, "수정하기");
  });
});

test("App 수정: 카테고리 선택으로 포커스가 옮겨가면 저장하지 않고, 밖으로 나가면 저장", () => {
  const storage = editFixture();
  withApp({ storage }, (ctx) => {
    const { input, select } = startEditing(ctx, "a");
    const before = keyWrites(storage);
    input.value = "카테고리도 변경";
    focusOut(input, select);
    assert(ctx.q('[data-role="edit-input"]') === input, "수정 모드 유지");
    assertEqual(keyWrites(storage) - before, 0);
    select.value = "personal";
    focusOut(select, null);
    assertEqual(keyWrites(storage) - before, 1);
    const saved = savedTodos(storage)[0];
    assertEqual([saved.text, saved.category], ["카테고리도 변경", "personal"]);
  });
});

test("App 수정: 텍스트를 비우면 저장하지 않고 원래 값으로 돌아간다", () => {
  const storage = editFixture();
  withApp({ storage }, (ctx) => {
    const { input } = startEditing(ctx, "a");
    const before = keyWrites(storage);
    input.value = "   ";
    pressKey(input, "Enter");
    assertEqual(keyWrites(storage) - before, 0);
    assertEqual(ctx.q('[data-role="edit-input"]'), null);
    assertEqual(listTexts(ctx), ["보고서"]);
  });
});

test("App 수정: 텍스트 더블클릭으로도 수정 모드에 들어간다(데스크톱 보조)", () => {
  withApp({ storage: editFixture() }, (ctx) => {
    ctx.q('[data-id="a"] .todo-text').dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    assertEqual(ctx.q('[data-role="edit-input"]').value, "보고서");
  });
});

// ============================================================
// 테스트: App 이월·자정 처리
// ============================================================
test("App 이월: 버튼을 누르면 밀린 미완료가 오늘로 오고 N일째가 붙는다", () => {
  const storage = storageWith(overdueFixture());
  withApp({ storage }, (ctx) => {
    const button = ctx.q('[data-role="carry-over"]');
    assertEqual(button.textContent, "밀린 미완료 2개 가져오기");
    button.click();
    assertEqual(listTexts(ctx), ["오래된 일", "그제 일", "오늘 일"]);
    assertEqual(ctx.q('[data-id="old1"] .todo-carry').textContent, "5일째");
    assertEqual(ctx.q('[data-id="old2"] .todo-carry').textContent, "3일째");
    const byId = {};
    savedTodos(storage).forEach((t) => (byId[t.id] = t));
    assertEqual([byId.old1.date, byId.old1.originalDate], ["2026-10-02", "2026-09-28"]);
    assertEqual(byId.doneOld.date, "2026-09-30");
    assertEqual(byId.future.date, "2026-10-05");
    assertEqual(ctx.q('[data-role="carry-over"]').hidden, true);
  });
});

test("App 이월: 오늘이 아닌 날짜에서는 버튼이 없다", () => {
  withApp({ storage: storageWith(overdueFixture()) }, (ctx) => {
    ctx.q('[data-action="prev-day"]').click();
    assertEqual(ctx.q('[data-role="carry-over"]').hidden, true);
  });
});

test("App 자정: 오늘을 보던 중 날짜가 바뀌면 창 포커스 시 새 오늘로 이동", () => {
  withApp({}, (ctx) => {
    ctx.setToday("2026-10-03");
    window.dispatchEvent(new Event("focus"));
    assertEqual(textOf(ctx, "date-label"), "2026-10-03 (토) · 오늘");
  });
});

test("App 자정: 다른 날짜를 보던 중이면 그 날짜를 유지", () => {
  withApp({}, (ctx) => {
    ctx.q('[data-action="prev-day"]').click();
    ctx.setToday("2026-10-03");
    ctx.app.refreshToday();
    assertEqual(textOf(ctx, "date-label"), "2026-10-01 (목)");
    ctx.q('[data-action="go-today"]').click();
    assertEqual(textOf(ctx, "date-label"), "2026-10-03 (토) · 오늘");
  });
});

// ============================================================
// 테스트: App 내보내기·가져오기·백업 복원
// ============================================================
test("App 내보내기: 저장 형식 그대로 todo-backup-오늘.json", () => {
  const todos = [makeTodo({ id: "a" }), makeTodo({ id: "b", done: true })];
  withApp({ storage: storageWith(todos) }, (ctx) => {
    ctx.q('[data-action="export"]').click();
    assertEqual(ctx.dialogs.downloads.length, 1);
    assertEqual(ctx.dialogs.downloads[0].name, "todo-backup-2026-10-02.json");
    assertEqual(JSON.parse(ctx.dialogs.downloads[0].text), { version: 1, todos });
  });
});

test("App 가져오기: 확인 후 기존 데이터를 백업하고 교체", () => {
  const storage = storageWith([makeTodo({ id: "old", text: "기존" })]);
  const oldRaw = storage.getItem("todoApp.v1");
  const incoming = { version: 1, todos: [makeTodo({ id: "n1", text: "가져온 1" }), makeTodo({ id: "n2", text: "가져온 2" })] };
  withApp({ storage }, (ctx) => {
    ctx.app.importText(JSON.stringify(incoming));
    assertEqual(ctx.dialogs.confirms, ["현재 할 일 1개가 가져온 2개로 대체됩니다. 계속할까요?"]);
    assertEqual(listTexts(ctx), ["가져온 1", "가져온 2"]);
    assertEqual(savedTodos(storage).map((t) => t.id), ["n1", "n2"]);
    assertEqual(storage.getItem("todoApp.v1.backup"), oldRaw);
    assertEqual(ctx.q('[data-role="restore-backup"]').hidden, false);
  });
});

test("App 가져오기: 형식 오류면 첫 오류를 알리고 아무것도 바꾸지 않는다", () => {
  const storage = storageWith([makeTodo({ id: "old", text: "기존" })]);
  const oldRaw = storage.getItem("todoApp.v1");
  const incoming = { version: 1, todos: [makeTodo(), makeTodo({ category: "etc" })] };
  withApp({ storage }, (ctx) => {
    ctx.app.importText(JSON.stringify(incoming));
    assertEqual(ctx.dialogs.alerts, ["가져올 수 없습니다.\n2번째 항목: category 값이 잘못되었습니다."]);
    assertEqual(ctx.dialogs.confirms, []);
    assertEqual(storage.getItem("todoApp.v1"), oldRaw);
    assertEqual(storage.getItem("todoApp.v1.backup"), null);
    assertEqual(listTexts(ctx), ["기존"]);
  });
});

test("App 가져오기: JSON이 아니면 알린다", () => {
  withApp({}, (ctx) => {
    ctx.app.importText("not json");
    assertEqual(ctx.dialogs.alerts, ["가져올 수 없습니다.\nJSON 형식이 아닙니다."]);
  });
});

test("App 가져오기: 확인을 거부하면 그대로 둔다", () => {
  const storage = storageWith([makeTodo({ id: "old", text: "기존" })]);
  const oldRaw = storage.getItem("todoApp.v1");
  withApp({ storage, answer: false }, (ctx) => {
    ctx.app.importText(JSON.stringify({ version: 1, todos: [] }));
    assertEqual(storage.getItem("todoApp.v1"), oldRaw);
    assertEqual(storage.getItem("todoApp.v1.backup"), null);
    assertEqual(listTexts(ctx), ["기존"]);
  });
});

test("App 백업 복원: 확인 후 현재와 백업을 맞바꾼다", () => {
  const storage = storageWith(
    [makeTodo({ id: "cur", text: "현재" })],
    [makeTodo({ id: "b1", text: "백업 1" }), makeTodo({ id: "b2", text: "백업 2" })]
  );
  const currentRaw = storage.getItem("todoApp.v1");
  const backupRaw = storage.getItem("todoApp.v1.backup");
  withApp({ storage }, (ctx) => {
    ctx.q('[data-action="restore-backup"]').click();
    assertEqual(ctx.dialogs.confirms, ["현재 할 일 1개를 백업의 2개로 되돌립니다. 계속할까요?"]);
    assertEqual(listTexts(ctx), ["백업 1", "백업 2"]);
    assertEqual(storage.getItem("todoApp.v1"), backupRaw);
    assertEqual(storage.getItem("todoApp.v1.backup"), currentRaw);
  });
});

test("App 백업 복원: 확인을 거부하면 둘 다 그대로", () => {
  const storage = storageWith([makeTodo({ id: "cur", text: "현재" })], [makeTodo({ id: "b1" })]);
  const currentRaw = storage.getItem("todoApp.v1");
  const backupRaw = storage.getItem("todoApp.v1.backup");
  withApp({ storage, answer: false }, (ctx) => {
    ctx.q('[data-action="restore-backup"]').click();
    assertEqual(storage.getItem("todoApp.v1"), currentRaw);
    assertEqual(storage.getItem("todoApp.v1.backup"), backupRaw);
    assertEqual(listTexts(ctx), ["현재"]);
  });
});

test("App 백업 복원: 손상된 백업이면 알리고 아무것도 바꾸지 않는다", () => {
  const currentRaw = JSON.stringify({ version: 1, todos: [makeTodo({ id: "cur", text: "현재" })] });
  const storage = fakeStorage({ "todoApp.v1": currentRaw, "todoApp.v1.backup": "{broken" });
  withApp({ storage }, (ctx) => {
    ctx.q('[data-action="restore-backup"]').click();
    assertEqual(ctx.dialogs.alerts, ["백업 데이터가 손상되어 복원할 수 없습니다."]);
    assertEqual(ctx.dialogs.confirms, []);
    assertEqual(storage.getItem("todoApp.v1"), currentRaw);
    assertEqual(listTexts(ctx), ["현재"]);
  });
});

test("App: 내보내기 → 전부 삭제 → 가져오기로 원래대로 돌아온다", () => {
  const storage = storageWith([makeTodo({ id: "a", text: "하나" }), makeTodo({ id: "b", text: "둘", done: true })]);
  withApp({ storage }, (ctx) => {
    ctx.q('[data-action="export"]').click();
    const exported = ctx.dialogs.downloads[0].text;
    while (ctx.q('[data-action="delete"]')) ctx.q('[data-action="delete"]').click();
    assertEqual(listTexts(ctx), []);
    ctx.app.importText(exported);
    assertEqual(listTexts(ctx), ["하나", "둘"]);
    assertEqual(savedTodos(storage), JSON.parse(exported).todos);
  });
});

// ============================================================
// 테스트: 최종 리뷰 수정
// ============================================================
function twoFixture() {
  return storageWith([
    makeTodo({ id: "a", text: "첫째", category: "work" }),
    makeTodo({ id: "b", text: "둘째", category: "personal" }),
  ]);
}

function mouseDown(element) {
  const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event;
}

test("최종 F1: 수정 중 다른 항목 ✎의 mousedown은 막히고, 클릭 한 번에 저장 후 그 항목 수정", () => {
  const storage = twoFixture();
  withApp({ storage }, (ctx) => {
    const { input } = startEditing(ctx, "a");
    input.value = "첫째 수정";
    const before = keyWrites(storage);
    const button = ctx.q('[data-id="b"] [data-action="edit"]');
    assertEqual(mouseDown(button).defaultPrevented, true, "mousedown 막힘");
    assertEqual(keyWrites(storage) - before, 0);
    assert(ctx.q('[data-id="a"]').classList.contains("editing"), "A 수정 유지");
    button.click();
    assertEqual(keyWrites(storage) - before, 1);
    assertEqual(savedTodos(storage)[0].text, "첫째 수정");
    assertEqual(ctx.q('[data-role="edit-input"]').value, "둘째");
    assert(ctx.q('[data-id="b"]').classList.contains("editing"), "B 수정 모드");
  });
});

test("최종 F1: 수정 중 다른 항목 체크박스 한 번 클릭으로 저장 + 완료 토글", () => {
  const storage = twoFixture();
  withApp({ storage }, (ctx) => {
    const { input } = startEditing(ctx, "a");
    input.value = "첫째 수정";
    const box = ctx.q('[data-id="b"] [data-action="toggle"]');
    assertEqual(mouseDown(box).defaultPrevented, true);
    box.click();
    const saved = savedTodos(storage);
    assertEqual(saved[0].text, "첫째 수정");
    assertEqual(saved[1].done, true);
  });
});

test("최종 F1: 수정 중 다른 항목 🗑 한 번 클릭으로 저장 + 삭제", () => {
  const storage = twoFixture();
  withApp({ storage, answer: true }, (ctx) => {
    const { input } = startEditing(ctx, "a");
    input.value = "첫째 수정";
    const button = ctx.q('[data-id="b"] [data-action="delete"]');
    assertEqual(mouseDown(button).defaultPrevented, true);
    button.click();
    const saved = savedTodos(storage);
    assertEqual(saved.map((t) => t.text), ["첫째 수정"]);
  });
});

test("최종 F1: 액션이 아닌 곳이나 수정 영역 안의 mousedown은 막지 않는다", () => {
  withApp({ storage: twoFixture() }, (ctx) => {
    const { input, select } = startEditing(ctx, "a");
    assertEqual(mouseDown(ctx.q('[data-id="b"] .todo-text')).defaultPrevented, false);
    assertEqual(mouseDown(input).defaultPrevented, false);
    assertEqual(mouseDown(select).defaultPrevented, false);
  });
});

function externalChange(ctx, todos) {
  ctx.storage.setItem("todoApp.v1", JSON.stringify({ version: 1, todos }));
  window.dispatchEvent(new StorageEvent("storage", { key: "todoApp.v1" }));
}

test("최종 F2: 다른 탭에서 본 데이터가 바뀌면 다시 불러오고 안내한다(저장 없음)", () => {
  const storage = twoFixture();
  withApp({ storage }, (ctx) => {
    const before = storage.writes.length;
    externalChange(ctx, [makeTodo({ id: "z", text: "다른 탭" })]);
    const after = storage.writes.length;
    assertEqual(listTexts(ctx), ["다른 탭"]);
    assertEqual(textOf(ctx, "messages"), "다른 탭에서 변경된 내용을 불러왔습니다.");
    assertEqual(after - before, 1, "테스트가 직접 쓴 1회뿐");
    assertEqual(storage.writes.length, after);
  });
});

test("최종 F2: 수정 중 외부 변경이 오면 수정을 닫고 입력한 텍스트를 저장하지 않는다", () => {
  const storage = twoFixture();
  withApp({ storage }, (ctx) => {
    const { input } = startEditing(ctx, "a");
    input.value = "저장되면 안 됨";
    externalChange(ctx, [makeTodo({ id: "z", text: "다른 탭" })]);
    const after = storage.writes.length;
    assertEqual(ctx.q('[data-role="edit-input"]'), null);
    focusOut(input);
    assertEqual(storage.writes.length, after);
    assertEqual(savedTodos(storage).map((t) => t.text), ["다른 탭"]);
  });
});

test("최종 F2: 관련 없는 키의 storage 이벤트는 무시한다", () => {
  withApp({ storage: twoFixture() }, (ctx) => {
    window.dispatchEvent(new StorageEvent("storage", { key: "other.key" }));
    assertEqual(listTexts(ctx), ["첫째", "둘째"]);
    assertEqual(textOf(ctx, "messages"), "");
  });
});

test("최종 F4: 가져오기로 데이터가 바뀌면 열려 있던 수정 세션은 저장하지 않는다", () => {
  const storage = twoFixture();
  withApp({ storage }, (ctx) => {
    const { input } = startEditing(ctx, "a");
    input.value = "저장되면 안 됨";
    ctx.app.importText(JSON.stringify({ version: 1, todos: [makeTodo({ id: "n", text: "가져옴" })] }));
    const after = storage.writes.length;
    focusOut(input);
    assertEqual(storage.writes.length, after);
    assertEqual(savedTodos(storage).map((t) => t.text), ["가져옴"]);
  });
});
