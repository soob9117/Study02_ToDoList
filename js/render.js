(function () {
  "use strict";

  const { Dates, Storage, Todos } = window.TodoApp;

  // ============================================================
  // 상수: 화면 문구
  // ============================================================
  const TEXT = {
    emptyDate: "이 날짜에 할 일이 없습니다.",
    emptyFilter: "이 카테고리에 할 일이 없습니다.",
    saveFailed: "저장에 실패했습니다. 새로고침하면 변경 내용이 사라질 수 있습니다.",
  };

  // ============================================================
  // 골격 (고정 마크업, 사용자 데이터 없음)
  // ============================================================
  function categoryOptionsHtml() {
    return Storage.CATEGORIES.map((c) => `<option value="${c}">${Todos.CATEGORY_LABELS[c]}</option>`).join("");
  }

  function filterButtonsHtml() {
    const button = (value, label) =>
      `<button type="button" class="filter-btn" data-action="filter" data-filter="${value}">${label}</button>`;
    return [button("all", "전체")]
      .concat(Storage.CATEGORIES.map((c) => button(c, Todos.CATEGORY_LABELS[c])))
      .join("");
  }

  function skeletonHtml() {
    return `
      <div class="messages" data-role="messages" role="status" hidden></div>
      <header class="date-nav">
        <button type="button" class="icon-btn" data-action="prev-day" aria-label="이전 날짜">◀</button>
        <h1 class="date-label" data-role="date-label"></h1>
        <button type="button" class="icon-btn" data-action="next-day" aria-label="다음 날짜">▶</button>
        <button type="button" class="text-btn" data-action="go-today">오늘</button>
      </header>
      <section class="progress" aria-label="진행률">
        <p class="progress-text" data-role="progress-text"></p>
        <div class="progress-bar"><div class="progress-fill" data-role="progress-fill"></div></div>
        <div class="progress-categories" data-role="progress-categories" hidden></div>
      </section>
      <button type="button" class="carry-btn" data-action="carry-over" data-role="carry-over" hidden></button>
      <div class="add-row">
        <input type="text" class="add-input" data-role="add-input" maxlength="${Storage.MAX_TEXT_LENGTH}"
               placeholder="할 일을 입력하세요" aria-label="새 할 일">
        <select class="add-category" data-role="add-category" aria-label="카테고리">${categoryOptionsHtml()}</select>
        <button type="button" class="add-btn" data-action="add">추가</button>
      </div>
      <div class="filters" data-role="filters" role="group" aria-label="카테고리 필터">${filterButtonsHtml()}</div>
      <ul class="todo-list" data-role="list"></ul>
      <p class="empty" data-role="empty" hidden></p>
      <footer class="data-tools">
        <button type="button" class="text-btn" data-action="export">JSON 내보내기</button>
        <button type="button" class="text-btn" data-action="import">JSON 가져오기</button>
        <button type="button" class="text-btn" data-action="restore-backup" data-role="restore-backup" hidden>백업 복원</button>
        <input type="file" data-role="import-file" accept=".json,application/json" hidden>
      </footer>`;
  }

  function mount(root) {
    root.classList.add("app");
    root.innerHTML = skeletonHtml();
  }

  // ============================================================
  // DOM 도우미 (사용자 텍스트는 textContent로만)
  // ============================================================
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function part(root, role) {
    return root.querySelector(`[data-role="${role}"]`);
  }

  function iconButton(action, symbol, label) {
    const button = el("button", "icon-btn", symbol);
    button.type = "button";
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    return button;
  }

  function categorySelect(selected, role, className) {
    const select = el("select", className);
    select.dataset.role = role;
    Storage.CATEGORIES.forEach((c) => {
      const option = el("option", null, Todos.CATEGORY_LABELS[c]);
      option.value = c;
      select.appendChild(option);
    });
    select.value = selected;
    return select;
  }

  // ============================================================
  // 영역별 그리기
  // ============================================================
  function renderMessages(root, state) {
    const box = part(root, "messages");
    const lines = [];
    if (state.notice) lines.push(state.notice);
    if (state.saveFailed) lines.push(TEXT.saveFailed);
    box.textContent = "";
    lines.forEach((line) => box.appendChild(el("p", "message", line)));
    box.hidden = lines.length === 0;
  }

  function renderHeader(root, state) {
    let label = `${state.viewDate} (${Dates.weekdayLabel(state.viewDate)})`;
    if (state.viewDate === state.today) label += " · 오늘";
    part(root, "date-label").textContent = label;
  }

  function renderProgress(root, state) {
    const p = Todos.progress(state.todos, state.viewDate);
    part(root, "progress-text").textContent = `진행률 ${p.done}/${p.total} (${p.percent}%)`;
    part(root, "progress-fill").style.width = p.percent + "%";
    renderCategoryGauges(part(root, "progress-categories"), p.byCategory);
  }

  // 그 날짜에 할 일이 있는 카테고리만 "이름 | 숫자 | 게이지" 한 줄씩 그린다.
  function renderCategoryGauges(box, byCategory) {
    box.textContent = "";
    const shown = Storage.CATEGORIES.filter((c) => byCategory[c].total > 0);
    shown.forEach((c) => {
      const stat = byCategory[c];
      const label = Todos.CATEGORY_LABELS[c];
      const row = el("div", "cat-progress");
      row.dataset.category = c;

      const bar = el("div", "cat-progress-bar");
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", "100");
      bar.setAttribute("aria-valuenow", String(stat.percent));
      bar.setAttribute("aria-label", label + " 진행률");
      const fill = el("div", "cat-progress-fill badge-" + c);
      fill.style.width = stat.percent + "%";
      bar.appendChild(fill);

      row.append(el("span", "cat-progress-label", label), el("span", "cat-progress-count", `${stat.done}/${stat.total}`), bar);
      box.appendChild(row);
    });
    box.hidden = shown.length === 0;
  }

  function renderCarryOver(root, state) {
    const count = state.viewDate === state.today ? Todos.overdueTodos(state.todos, state.today).length : 0;
    const button = part(root, "carry-over");
    button.textContent = `밀린 미완료 ${count}개 가져오기`;
    button.hidden = count === 0;
  }

  function renderFilters(root, state) {
    root.querySelectorAll('[data-action="filter"]').forEach((button) => {
      const active = button.dataset.filter === state.filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderEditArea(todo) {
    const area = el("div", "edit-area");
    area.dataset.role = "edit-area";
    const input = el("input", "edit-input");
    input.type = "text";
    input.maxLength = Storage.MAX_TEXT_LENGTH;
    input.value = todo.text;
    input.dataset.role = "edit-input";
    input.setAttribute("aria-label", "할 일 수정");
    const select = categorySelect(todo.category, "edit-category", "edit-category");
    select.setAttribute("aria-label", "카테고리 수정");
    area.append(input, select);
    return area;
  }

  function renderItem(todo, state) {
    const item = el("li", "todo-item");
    item.dataset.id = todo.id;
    if (todo.done) item.classList.add("done");

    if (todo.id === state.editingId) {
      item.classList.add("editing");
      item.appendChild(renderEditArea(todo));
      return item;
    }

    const check = el("label", "todo-check");
    const checkbox = el("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.dataset.action = "toggle";
    checkbox.setAttribute("aria-label", "완료: " + todo.text);
    check.appendChild(checkbox);
    item.appendChild(check);

    item.appendChild(el("span", "todo-badge badge-" + todo.category, Todos.CATEGORY_LABELS[todo.category]));
    item.appendChild(el("span", "todo-text", todo.text));

    const days = Todos.carryDays(todo);
    if (days > 0) item.appendChild(el("span", "todo-carry", days + "일째"));

    item.appendChild(iconButton("edit", "✎", "수정"));
    item.appendChild(iconButton("delete", "🗑", "삭제"));
    return item;
  }

  function renderList(root, state) {
    const forDate = Todos.todosForDate(state.todos, state.viewDate);
    const filtered = state.filter === "all" ? forDate : forDate.filter((t) => t.category === state.filter);
    const visible = Todos.sortTodos(filtered);

    const list = part(root, "list");
    list.textContent = "";
    visible.forEach((todo) => list.appendChild(renderItem(todo, state)));

    const empty = part(root, "empty");
    empty.textContent = forDate.length === 0 ? TEXT.emptyDate : visible.length === 0 ? TEXT.emptyFilter : "";
    empty.hidden = visible.length > 0;
  }

  function renderBackup(root, state) {
    part(root, "restore-backup").hidden = !state.hasBackup;
  }

  // ============================================================
  // 전체 그리기
  // ============================================================
  function render(root, state) {
    renderMessages(root, state);
    renderHeader(root, state);
    renderProgress(root, state);
    renderCarryOver(root, state);
    renderFilters(root, state);
    renderList(root, state);
    renderBackup(root, state);
  }

  window.TodoApp.Render = { mount, render };
})();
