(function () {
  "use strict";

  const { CATEGORIES, MAX_TEXT_LENGTH } = window.TodoApp.Storage;

  // ============================================================
  // 상수
  // ============================================================
  const CATEGORY_LABELS = { work: "업무", personal: "개인", study: "공부" };

  // ============================================================
  // 입력 정리·검사
  // ============================================================
  function normalizeText(text) {
    return typeof text === "string" ? text.trim() : "";
  }

  function isValidText(text) {
    const length = normalizeText(text).length;
    return length >= 1 && length <= MAX_TEXT_LENGTH;
  }

  function isValidCategory(category) {
    return CATEGORIES.includes(category);
  }

  // ============================================================
  // 생성·추가·수정·삭제·완료
  // ============================================================
  function makeId(now) {
    return "t_" + now + "_" + Math.random().toString(36).slice(2, 6);
  }

  function createTodo(text, category, dateStr, now) {
    if (!isValidText(text) || !isValidCategory(category)) return null;
    return {
      id: makeId(now),
      text: normalizeText(text),
      category,
      done: false,
      date: dateStr,
      originalDate: dateStr,
      createdAt: now,
    };
  }

  function addTodo(todos, todo) {
    return todos.concat([todo]);
  }

  // 값이 잘못되면 같은 배열을 그대로 돌려준다(호출 측이 "변경 없음"을 알 수 있게).
  function updateTodo(todos, id, changes) {
    if ("text" in changes && !isValidText(changes.text)) return todos;
    if ("category" in changes && !isValidCategory(changes.category)) return todos;
    return todos.map((todo) => {
      if (todo.id !== id) return todo;
      const next = Object.assign({}, todo);
      if ("text" in changes) next.text = normalizeText(changes.text);
      if ("category" in changes) next.category = changes.category;
      return next;
    });
  }

  function deleteTodo(todos, id) {
    return todos.filter((todo) => todo.id !== id);
  }

  function toggleTodo(todos, id) {
    return todos.map((todo) => (todo.id === id ? Object.assign({}, todo, { done: !todo.done }) : todo));
  }

  // ============================================================
  // 조회·정렬
  // ============================================================
  function todosForDate(todos, dateStr) {
    return todos.filter((todo) => todo.date === dateStr);
  }

  function sortTodos(todos) {
    return todos.slice().sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt);
  }

  window.TodoApp.Todos = {
    CATEGORY_LABELS,
    createTodo,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    todosForDate,
    sortTodos,
  };
})();
