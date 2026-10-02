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
