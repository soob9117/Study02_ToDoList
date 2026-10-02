(function () {
  "use strict";

  const Dates = window.TodoApp.Dates;

  // ============================================================
  // 상수: 저장 키·데이터 형식
  // ============================================================
  const KEY = "todoApp.v1";
  const BACKUP_KEY = "todoApp.v1.backup";
  const VERSION = 1;
  const CATEGORIES = ["work", "personal", "study"];
  const MAX_TEXT_LENGTH = 100;

  // ============================================================
  // 데이터 형식 검증
  // ============================================================
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  // 문제가 있으면 오류 문구, 없으면 null
  function validateTodo(todo, index, seenIds) {
    const where = index + 1 + "번째 항목: ";
    if (!isPlainObject(todo)) return where + "객체가 아닙니다.";
    if (typeof todo.id !== "string" || todo.id === "") return where + "id 값이 잘못되었습니다.";
    if (seenIds.has(todo.id)) return where + "id가 중복되었습니다.";
    if (typeof todo.text !== "string") return where + "text 값이 잘못되었습니다.";
    const length = todo.text.trim().length;
    if (length < 1 || length > MAX_TEXT_LENGTH) return where + "text 값이 잘못되었습니다.";
    if (!CATEGORIES.includes(todo.category)) return where + "category 값이 잘못되었습니다.";
    if (typeof todo.done !== "boolean") return where + "done 값이 잘못되었습니다.";
    if (!Dates.isValidDateStr(todo.date)) return where + "date 값이 잘못되었습니다.";
    if (!Dates.isValidDateStr(todo.originalDate)) return where + "originalDate 값이 잘못되었습니다.";
    if (todo.originalDate > todo.date) return where + "originalDate가 date보다 늦습니다.";
    if (typeof todo.createdAt !== "number" || !Number.isFinite(todo.createdAt)) {
      return where + "createdAt 값이 잘못되었습니다.";
    }
    return null;
  }

  function validateData(obj) {
    if (!isPlainObject(obj)) return { ok: false, error: "최상위 형식이 잘못되었습니다." };
    if (obj.version !== VERSION) return { ok: false, error: "지원하지 않는 version입니다." };
    if (!Array.isArray(obj.todos)) return { ok: false, error: "todos가 배열이 아닙니다." };
    const seenIds = new Set();
    for (let i = 0; i < obj.todos.length; i++) {
      const error = validateTodo(obj.todos[i], i, seenIds);
      if (error) return { ok: false, error };
      seenIds.add(obj.todos[i].id);
    }
    return { ok: true };
  }

  function parseAndValidate(text) {
    let obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: "JSON 형식이 아닙니다." };
    }
    const result = validateData(obj);
    return result.ok ? { ok: true, data: obj } : result;
  }

  window.TodoApp.Storage = {
    KEY,
    BACKUP_KEY,
    VERSION,
    CATEGORIES,
    MAX_TEXT_LENGTH,
    validateData,
    parseAndValidate,
  };
})();
