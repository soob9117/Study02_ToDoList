(function () {
  "use strict";

  const { Dates, Storage, Todos, Render } = window.TodoApp;

  // ============================================================
  // 상수: 안내 문구
  // ============================================================
  const MSG = {
    corrupt: "저장된 데이터를 읽을 수 없어 백업으로 보관하고 새로 시작합니다.",
    unavailable: "저장소를 사용할 수 없어 데이터가 저장되지 않습니다.",
  };

  // ============================================================
  // 기본 의존성 (테스트에서 바꿔 끼울 수 있음)
  // ============================================================
  const DEFAULTS = {
    today: () => Dates.today(),
    now: () => Date.now(),
    confirm: (message) => window.confirm(message),
    alert: (message) => window.alert(message),
    download: (filename, text) => downloadFile(filename, text),
  };

  // file://에서도 동작하는 Blob 다운로드
  function downloadFile(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  // ============================================================
  // 앱 초기화
  // ============================================================
  function init(options) {
    const opts = Object.assign({}, DEFAULTS, options);
    const root = opts.root;
    const storage = opts.storage;

    // ----- 상태 -----
    const loaded = Storage.load(storage);
    const state = {
      todos: loaded.data.todos,
      today: opts.today(),
      viewDate: null,
      filter: "all",
      editingId: null,
      notice: loaded.error ? MSG[loaded.error] : null,
      saveFailed: false,
      hasBackup: Storage.hasBackup(storage),
    };
    state.viewDate = state.today;

    const cleanups = [];
    const afterRender = [];
    const api = {
      state,
      destroy() {
        cleanups.forEach((fn) => fn());
      },
    };

    // ----- 이벤트 처리 표 -----
    const clickHandlers = {}; // data-action → function(target, event)
    const keyHandlers = {}; // data-role → function(event)
    const changeHandlers = {}; // data-action 또는 data-role → function(target, event)

    // ----- 공통: 그리기·저장 -----
    function part(role) {
      return root.querySelector(`[data-role="${role}"]`);
    }

    function idOf(target) {
      const item = target.closest("[data-id]");
      return item ? item.dataset.id : null;
    }

    function update() {
      Render.render(root, state);
      afterRender.forEach((fn) => fn());
    }

    function persist() {
      state.saveFailed = !Storage.save(storage, { version: Storage.VERSION, todos: state.todos });
    }

    function commit(nextTodos) {
      state.todos = nextTodos;
      persist();
      update();
    }

    // 한글 등 IME 조합 중인 키 입력인지
    function isComposing(event) {
      return event.isComposing || event.keyCode === 229;
    }

    // ----- 할 일: 추가·완료·삭제 -----
    function addFromInput() {
      const input = part("add-input");
      const todo = Todos.createTodo(input.value, part("add-category").value, state.viewDate, opts.now());
      if (!todo) return;
      input.value = "";
      commit(Todos.addTodo(state.todos, todo));
      input.focus();
    }

    keyHandlers["add-input"] = (event) => {
      if (event.key !== "Enter" || isComposing(event)) return;
      event.preventDefault();
      addFromInput();
    };
    clickHandlers["add"] = addFromInput;

    clickHandlers["toggle"] = (target) => commit(Todos.toggleTodo(state.todos, idOf(target)));

    clickHandlers["delete"] = (target) => {
      const todo = state.todos.find((t) => t.id === idOf(target));
      if (!todo) return;
      if (!opts.confirm(`'${todo.text}'을(를) 삭제할까요?`)) return;
      commit(Todos.deleteTodo(state.todos, todo.id));
    };

    // ----- 날짜 이동·필터 -----
    function goTo(dateStr) {
      state.viewDate = dateStr;
      update();
    }

    clickHandlers["prev-day"] = () => goTo(Dates.addDays(state.viewDate, -1));
    clickHandlers["next-day"] = () => goTo(Dates.addDays(state.viewDate, 1));
    clickHandlers["go-today"] = () => goTo(state.today);
    clickHandlers["filter"] = (target) => {
      state.filter = target.dataset.filter;
      update();
    };

    // ----- 수정 모드 -----
    // 수정 세션마다 finished 플래그를 둔다. Enter·Esc·blur 중 먼저 처리된 쪽만 유효하다.
    let edit = null; // { id, finished, input, select }

    function startEdit(id) {
      if (!id) return;
      if (edit && !edit.finished) finishEdit(true);
      edit = { id, finished: false, input: null, select: null };
      state.editingId = id;
      update();
      if (edit.input) {
        edit.input.focus();
        edit.input.select();
      }
    }

    function finishEdit(save) {
      if (!edit || edit.finished) return;
      edit.finished = true;
      state.editingId = null;
      if (save && edit.input && edit.select) {
        const next = Todos.updateTodo(state.todos, edit.id, {
          text: edit.input.value,
          category: edit.select.value,
        });
        if (next !== state.todos) {
          commit(next);
          return;
        }
      }
      update();
    }

    // 그릴 때마다 새로 만들어지는 수정 영역에 현재 세션을 묶는다.
    function bindEditArea() {
      const area = part("edit-area");
      if (!area || !edit) return;
      const session = edit;
      session.input = area.querySelector('[data-role="edit-input"]');
      session.select = area.querySelector('[data-role="edit-category"]');
      area.addEventListener("focusout", (event) => {
        if (edit !== session) return;
        if (event.relatedTarget && area.contains(event.relatedTarget)) return; // 수정 영역 안에서 이동
        finishEdit(true);
      });
    }
    afterRender.push(bindEditArea);

    function onEditKey(event) {
      if (isComposing(event)) return;
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault();
      const id = edit && edit.id;
      finishEdit(event.key === "Enter");
      // 키보드로 끝낸 경우에만 해당 항목의 ✎ 버튼으로 포커스를 돌려준다.
      const button = id && root.querySelector(`[data-id="${id}"] [data-action="edit"]`);
      if (button) button.focus();
    }
    keyHandlers["edit-input"] = onEditKey;
    keyHandlers["edit-category"] = onEditKey;

    clickHandlers["edit"] = (target) => startEdit(idOf(target));

    root.addEventListener("dblclick", (event) => {
      const text = event.target.closest(".todo-text");
      if (text) startEdit(idOf(text));
    });

    // ----- 이월·자정 처리 -----
    clickHandlers["carry-over"] = () => commit(Todos.carryOver(state.todos, state.today));

    // 앱을 열어둔 채 자정이 지나도 창이 다시 활성화되면 "오늘"을 다시 계산한다.
    function refreshToday() {
      const nowToday = opts.today();
      if (nowToday === state.today) return;
      if (edit && !edit.finished) finishEdit(true);
      if (state.viewDate === state.today) state.viewDate = nowToday;
      state.today = nowToday;
      update();
    }
    api.refreshToday = refreshToday;

    function onVisibilityChange() {
      if (document.visibilityState === "visible") refreshToday();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", refreshToday);
    cleanups.push(() => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", refreshToday);
    });

    // ----- 내보내기·가져오기·백업 복원 -----
    function applyData(data) {
      if (edit) edit.finished = true; // 열려 있던 수정 세션은 저장하지 않고 버린다
      state.todos = data.todos;
      state.editingId = null;
      state.notice = null;
      state.hasBackup = Storage.hasBackup(storage);
      update();
    }

    clickHandlers["export"] = () => {
      const json = JSON.stringify({ version: Storage.VERSION, todos: state.todos }, null, 2);
      opts.download(`todo-backup-${opts.today()}.json`, json);
    };

    function importText(text) {
      const result = Storage.parseAndValidate(text);
      if (!result.ok) {
        opts.alert("가져올 수 없습니다.\n" + result.error);
        return;
      }
      const message = `현재 할 일 ${state.todos.length}개가 가져온 ${result.data.todos.length}개로 대체됩니다. 계속할까요?`;
      if (!opts.confirm(message)) return;
      state.saveFailed = !Storage.replaceData(storage, result.data);
      applyData(result.data);
    }
    api.importText = importText;

    clickHandlers["import"] = () => part("import-file").click();

    changeHandlers["import-file"] = (input) => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        input.value = ""; // 같은 파일을 다시 고를 수 있게
        importText(String(reader.result));
      };
      reader.onerror = () => {
        input.value = "";
        opts.alert("파일을 읽을 수 없습니다.");
      };
      reader.readAsText(file);
    };

    clickHandlers["restore-backup"] = () => {
      const backup = Storage.readBackup(storage);
      if (!backup.ok) {
        opts.alert(backup.error);
        return;
      }
      const message = `현재 할 일 ${state.todos.length}개를 백업의 ${backup.data.todos.length}개로 되돌립니다. 계속할까요?`;
      if (!opts.confirm(message)) return;
      const result = Storage.restoreBackup(storage);
      if (!result.ok) {
        opts.alert(result.error);
        return;
      }
      state.saveFailed = false;
      applyData(result.data);
    };

    // ----- 다른 탭 변경 감지 -----
    function onStorage(event) {
      if (event.key === Storage.BACKUP_KEY) {
        state.hasBackup = Storage.hasBackup(storage);
        update();
        return;
      }
      if (event.key !== Storage.KEY) return;
      if (edit) edit.finished = true; // 저장하지 않고 수정 세션을 버린다
      state.todos = Storage.load(storage).data.todos;
      state.editingId = null;
      state.hasBackup = Storage.hasBackup(storage);
      state.notice = "다른 탭에서 변경된 내용을 불러왔습니다.";
      update();
    }
    window.addEventListener("storage", onStorage);
    cleanups.push(() => window.removeEventListener("storage", onStorage));

    // ----- 이벤트 연결 -----
    function editActive() {
      return !!(edit && !edit.finished);
    }

    // 수정 중 다른 버튼을 누르면 포커스가 빠져나가 다시 그려지며 클릭이 사라진다. 포커스를 유지시킨다.
    root.addEventListener("mousedown", (event) => {
      if (!editActive()) return;
      const target = event.target.closest("[data-action]");
      if (!target || !root.contains(target)) return;
      if (target.closest('[data-role="edit-area"]')) return;
      event.preventDefault();
    });

    root.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target || !root.contains(target)) return;
      if (editActive() && !target.closest('[data-role="edit-area"]')) finishEdit(true);
      const handler = clickHandlers[target.dataset.action];
      if (handler) handler(target, event);
    });

    root.addEventListener("change", (event) => {
      const target = event.target;
      const handler = changeHandlers[target.dataset.action] || changeHandlers[target.dataset.role];
      if (handler) handler(target, event);
    });

    root.addEventListener("keydown", (event) => {
      const handler = keyHandlers[event.target.dataset.role];
      if (handler) handler(event);
    });

    // ----- 시작 -----
    Render.mount(root);
    update();
    return api;
  }

  window.TodoApp.App = { init };
})();
