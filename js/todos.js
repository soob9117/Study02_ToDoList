(function () {
  "use strict";

  const { CATEGORIES, MAX_TEXT_LENGTH } = window.TodoApp.Storage;
  const Dates = window.TodoApp.Dates;

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

  // ============================================================
  // 이월
  // ============================================================
  function isOverdue(todo, today) {
    return !todo.done && todo.date < today;
  }

  function overdueTodos(todos, today) {
    return todos.filter((todo) => isOverdue(todo, today));
  }

  function carryOver(todos, today) {
    return todos.map((todo) => (isOverdue(todo, today) ? Object.assign({}, todo, { date: today }) : todo));
  }

  // 이월되지 않았으면 0, 이월됐으면 처음 등록일부터 센 "N일째"
  function carryDays(todo) {
    if (todo.date === todo.originalDate) return 0;
    return Dates.diffDays(todo.originalDate, todo.date) + 1;
  }

  // ============================================================
  // 진행률
  // ============================================================
  function countDone(todos) {
    return todos.filter((todo) => todo.done).length;
  }

  function progress(todos, dateStr) {
    const list = todosForDate(todos, dateStr);
    const byCategory = {};
    CATEGORIES.forEach((category) => {
      const items = list.filter((todo) => todo.category === category);
      byCategory[category] = { done: countDone(items), total: items.length };
    });
    const done = countDone(list);
    const total = list.length;
    return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100), byCategory };
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
    overdueTodos,
    carryOver,
    carryDays,
    progress,
  };
})();
