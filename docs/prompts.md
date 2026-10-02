# 할 일 관리 앱: Claude Code 5단계 프롬프트

[PRD·설계 스펙](superpowers/specs/2026-10-02-todo-app-prd.md)을 Claude Code에 순서대로 보내면 이 앱을 처음부터 다시 만들 수 있도록 정리한 프롬프트입니다. [구현 계획](superpowers/plans/2026-10-02-todo-app.md)의 12개 Task를 5단계로 묶었고, 최종 리뷰에서 추가된 수정 사항(수정 중 다른 항목 클릭, 다른 탭 변경 감지 등)도 반영했습니다.

## 사용 방법

1. 빈 폴더에서 Claude Code를 열고 **1단계 프롬프트**를 그대로 붙여 넣습니다.
2. Claude가 작업을 마치고 결과를 보고하면 확인한 뒤 "승인"이라고 답합니다. Claude가 커밋합니다.
3. 다음 단계 프롬프트를 붙여 넣습니다. 각 프롬프트는 앞의 대화 없이도 이해되도록 프로젝트 맥락과 공통 규칙을 모두 담고 있습니다.

| 단계 | 내용 | 계획 Task | 누적 테스트(참고) |
|---|---|---|---|
| 1 | 테스트 도구, 날짜 유틸, 저장소(검증·읽기쓰기·백업) | 1–3 | 약 32개 |
| 2 | 할 일 로직(추가·수정·삭제·완료·정렬·이월·진행률) | 4–5 | 약 46개 |
| 3 | 화면 그리기와 앱 기본 동작 | 6–7 | 약 74개 |
| 4 | 수정 모드, 이월 버튼·자정 처리, 내보내기·가져오기·백업 복원, 다른 탭 감지 | 8–10 + 최종 리뷰 수정 | 약 103개(게이지 테스트 포함 시 약 108개) |
| 5 | `index.html`, `style.css`, 모바일 대응, 최종 점검, README | 11–12 | 약 108개 |

테스트 개수는 원래 구현 기준의 참고값입니다. 완료 기준은 각 단계에 적힌 **테스트 항목이 모두 있고 전부 통과하는 것**입니다.

---

## 1단계: 테스트 도구, 날짜 유틸, 저장소

~~~text
# 1단계: 테스트 도구, 날짜 유틸, 저장소

## 프로젝트 맥락
하루 10~20개의 할 일을 날짜별로 관리하는 개인용 웹 앱을 순수 HTML/CSS/JavaScript로 만든다. index.html을 더블클릭(file://)하면 실행되고 localStorage에 저장한다. 전체 작업은 5단계이고, 이번은 1단계다. 이번 단계에서는 화면 없이 테스트 도구와 DOM을 모르는 로직 모듈만 만든다.

## 공통 규칙 (모든 단계에 적용)
- 외부 라이브러리, 빌드 도구, Node.js, ES 모듈(import/export)을 쓰지 않는다. 스크립트는 일반 <script src>로 불러온다.
- index.html과 tests.html 모두 더블클릭(file://)으로 동작해야 한다.
- 전역은 window.TodoApp 하나만 만든다. 각 JS 파일(테스트 파일 제외)은 (function () { "use strict"; ... })(); 로 감싸고 TodoApp.이름 하나만 등록한다.
- 각 JS 파일 안은 역할별로 구역을 나누고 // ==================== 주석으로 구분한다.
- toISOString()은 쓰지 않는다. 날짜는 getFullYear()/getMonth()+1/getDate()로 로컬 기준 "YYYY-MM-DD"를 만든다.
- TDD로 진행한다: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현하고 통과를 확인한다.
- 커밋 작성자 이메일은 전역 git 설정을 그대로 쓰고, 개인 이메일을 코드나 문서에 넣지 않는다.

## 만들 파일
- tests.html: 테스트 실행 페이지. js/dates.js → js/storage.js → js/todos.js → js/render.js → js/app.js → js/tests.js 순서로 불러온다(아직 없는 파일은 로드 실패해도 괜찮다). #summary, #results, 숨겨진 #test-root를 둔다.
- js/tests.js: IIFE로 감싸지 않는다(이후 단계가 파일 끝에 테스트를 이어 붙인다). test(name, fn), assert(cond, msg), assertEqual(actual, expected, msg)(JSON 문자열 비교)를 제공하고, DOMContentLoaded에서 모두 실행해 #summary에 "PASS 7/7 통과, 0 실패" 같은 요약을, 실패 항목은 class="fail"인 li로 표시한다.
- js/dates.js: TodoApp.Dates
- js/storage.js: TodoApp.Storage

## 구체적인 지시 사항
1. TodoApp.Dates
   - toLocalDateStr(date) → "YYYY-MM-DD" (0 채움)
   - parseLocalDate(str) → 로컬 자정 Date. 형식이 틀리거나 없는 날짜(2026-02-30)면 null
   - isValidDateStr(value) → boolean (문자열이 아니면 false)
   - addDays(str, n), diffDays(a, b) → b − a 일수(Math.round로 반올림), weekdayLabel(str) → ["일","월","화","수","목","금","토"] 중 하나(getDay로 계산, 하드코딩 금지), today()
2. TodoApp.Storage 상수: KEY = "todoApp.v1", BACKUP_KEY = "todoApp.v1.backup", VERSION = 1, CATEGORIES = ["work","personal","study"], MAX_TEXT_LENGTH = 100
3. 형식 검증 validateData(obj) → { ok: true } | { ok: false, error }. 첫 오류에서 멈추고, 오류 문구는 정확히 다음과 같다.
   - "최상위 형식이 잘못되었습니다." / "지원하지 않는 version입니다." / "todos가 배열이 아닙니다."
   - 항목 오류는 "N번째 항목: " 접두사 + "객체가 아닙니다." / "id 값이 잘못되었습니다." / "id가 중복되었습니다." / "text 값이 잘못되었습니다."(앞뒤 공백 제거 후 1~100자) / "category 값이 잘못되었습니다." / "done 값이 잘못되었습니다." / "date 값이 잘못되었습니다." / "originalDate 값이 잘못되었습니다." / "originalDate가 date보다 늦습니다." / "createdAt 값이 잘못되었습니다."(유한한 숫자)
   - parseAndValidate(text): JSON 파싱 실패 시 "JSON 형식이 아닙니다.", 성공 시 { ok: true, data }
4. 저장소 함수는 저장소 객체(getItem/setItem/removeItem)를 인자로 받고, 모든 접근을 try/catch로 감싼다.
   - load(storage) → { data, error }: 값이 없으면 빈 데이터 { version: 1, todos: [] }와 error null. 파싱·검증에 실패하면 원문을 BACKUP_KEY에 보관하고 빈 데이터와 "corrupt". getItem이 예외를 던지면 "unavailable".
   - save(storage, data) → boolean, hasBackup, writeBackup(storage, raw)
   - readBackup(storage) → { ok, data, raw } 또는 오류 "백업이 없습니다." / "백업 데이터가 손상되어 복원할 수 없습니다."
   - replaceData(storage, data): 현재 원문이 있으면 백업에 넣은 뒤 덮어쓴다.
   - restoreBackup(storage): 백업을 검증한 뒤 본 데이터와 백업을 맞바꾼다. 저장 실패 시 "저장에 실패했습니다."
5. tests.js에 테스트 도우미를 둔다: makeTodo(overrides)(기본 date/originalDate "2026-10-02", 호출마다 id와 createdAt 증가), fakeStorage(initial)(setItem한 키를 writes 배열에 기록, failGet/failSet 플래그), storageWith(todos, backupTodos).

## 완료 기준 (통과해야 할 테스트)
- 날짜: new Date(2026, 9, 2, 0, 30) → "2026-10-02"(자정 직후에도 하루 밀리지 않음), 0 채움, "2026-12-31" + 1일 → "2027-01-01", "2026-03-01" − 1일 → "2026-02-28", "2026-02-30"·"2026-1-5"·숫자·null 거부, "2028-02-29" 허용, diffDays("2026-09-30", "2026-10-02") = 2, 요일 2026-10-02 = 금, 2026-10-01 = 목, 2028-02-29 = 화
- 검증: 정상 데이터·빈 목록 통과, 위의 오류 문구가 각각 정확히 나옴, text 100자 허용·101자 거부
- 저장소: 빈 저장소, 저장 → 불러오기 왕복, 깨진 JSON과 형식 오류 JSON의 백업 보관(corrupt), getItem 예외(unavailable), setItem 예외 시 false, replaceData의 백업, readBackup의 없음·손상·정상, restoreBackup의 맞바꾸기, 손상된 백업이면 아무것도 바꾸지 않음
- 테스트 실행(Git Bash, 프로젝트 폴더에서):
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-first-run --user-data-dir="$LOCALAPPDATA/todo-test-chrome" --dump-dom "file:///$(pwd -W | sed 's/ /%20/g')/tests.html" 2>/dev/null | grep -oE 'id="summary">[^<]*|class="fail">[^<]*'
  결과가 "PASS"이고 실패 0이어야 한다. (tests.html을 더블클릭해도 같은 결과를 볼 수 있다.)

## 단계 마무리 규칙
작업이 끝나면 만든 파일, 테스트 실행 결과(실패→통과 과정 포함)를 보고하고 멈춘다. 사용자 승인을 받은 뒤 커밋하고 다음 단계로 넘어간다. 승인 전에는 커밋하지 않는다.
~~~

---

## 2단계: 할 일 로직

~~~text
# 2단계: 할 일 로직 (추가·수정·삭제·완료·정렬·이월·진행률)

## 프로젝트 맥락
하루 10~20개의 할 일을 날짜별로 관리하는 개인용 웹 앱을 순수 HTML/CSS/JavaScript로 만들고 있다(index.html 더블클릭 실행, localStorage 저장). 전체 5단계 중 2단계다. 1단계에서 다음이 이미 있다.
- tests.html, js/tests.js: test/assert/assertEqual, 도우미 makeTodo, fakeStorage, storageWith. 테스트는 파일 끝에 이어 붙인다.
- js/dates.js(TodoApp.Dates: toLocalDateStr, parseLocalDate, isValidDateStr, addDays, diffDays(a,b)=b−a, weekdayLabel, today)
- js/storage.js(TodoApp.Storage: KEY, BACKUP_KEY, VERSION, CATEGORIES, MAX_TEXT_LENGTH, validateData, parseAndValidate, load, save, 백업 함수들)
시작하기 전에 이 파일들을 읽고 이름과 형식을 맞춘다.

## 공통 규칙 (모든 단계에 적용)
- 외부 라이브러리, 빌드 도구, Node.js, ES 모듈(import/export)을 쓰지 않는다. 스크립트는 일반 <script src>로 불러온다.
- index.html과 tests.html 모두 더블클릭(file://)으로 동작해야 한다.
- 전역은 window.TodoApp 하나만 만든다. 각 JS 파일(테스트 파일 제외)은 IIFE + "use strict"로 감싸고 TodoApp.이름 하나만 등록한다.
- 각 JS 파일 안은 역할별로 구역을 나누고 // ==================== 주석으로 구분한다.
- toISOString()은 쓰지 않는다. 날짜는 로컬 기준 "YYYY-MM-DD"로 다룬다.
- TDD로 진행한다: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현하고 통과를 확인한다.

## 데이터 형식
할 일 1개: { id, text(1~100자), category("work"|"personal"|"study"), done(boolean), date(현재 속한 날짜), originalDate(처음 등록한 날짜, 이후 불변), createdAt(ms) }

## 만들 파일
- js/todos.js: TodoApp.Todos (DOM을 모르는 순수 함수. 원본 배열과 객체를 바꾸지 않고 새 배열을 반환)
- js/tests.js: 테스트 추가(끝에 이어 붙임)

## 구체적인 지시 사항
1. CATEGORY_LABELS = { work: "업무", personal: "개인", study: "공부" }
2. createTodo(text, category, dateStr, now) → todo | null. 텍스트는 앞뒤 공백 제거, 비었거나 100자를 넘거나 카테고리가 틀리면 null. id는 "t_" + now + "_" + 랜덤 4자, date와 originalDate는 dateStr, createdAt은 now.
3. addTodo(todos, todo), deleteTodo(todos, id), toggleTodo(todos, id)
4. updateTodo(todos, id, { text?, category? }): 값이 잘못되면 같은 배열 참조를 그대로 반환한다(호출 측이 "변경 없음"을 알 수 있게).
5. todosForDate(todos, dateStr), sortTodos(todos): 미완료가 먼저, 그 안에서 createdAt 오름차순
6. 이월
   - overdueTodos(todos, today): done이 false이고 date < today인 모든 항목. 중간에 기록이 없는 날이 있어도 빠지지 않는다.
   - carryOver(todos, today): 대상의 date만 today로 바꾸고 originalDate는 유지한다(이동 방식).
   - carryDays(todo): date === originalDate면 0, 아니면 diffDays(originalDate, date) + 1 ("N일째" 표시용)
7. progress(todos, dateStr) → { done, total, percent, byCategory: { work: {done,total,percent}, personal: {...}, study: {...} } }. 항상 dateStr 날짜의 할 일만으로 계산한다. percent는 Math.round(완료/전체×100)이고, 전체가 0이면 0(NaN 금지). 카테고리별 percent도 같은 규칙이다.

## 완료 기준 (통과해야 할 테스트)
- createTodo: 공백 제거와 필드 값, 빈 값·공백만·101자·잘못된 카테고리 거부, 100자 허용
- addTodo, deleteTodo, toggleTodo가 원본을 바꾸지 않음
- updateTodo: 텍스트(공백 제거)와 카테고리 변경, 잘못된 값이면 같은 배열(===) 반환
- todosForDate, sortTodos(원본 순서 유지)
- 이월 픽스처(오늘 2026-10-02): 09-28 미완료, 09-30 미완료, 09-30 완료, 10-02 미완료, 10-05 미완료 → overdueTodos는 앞의 두 개만, carryOver 후 date는 10-02이고 originalDate는 그대로, 완료·미래 항목은 그대로. 이 픽스처는 overdueFixture()로 tests.js에 두어 이후 단계에서도 쓴다.
- progress: 업무 1/2(50%) · 개인 1/1(100%) · 공부 0/0(0%) → 전체 2/3 (67%), 다른 날짜의 할 일은 제외, 할 일이 없으면 0/0 (0%)
- carryDays: originalDate 09-30, date 10-02 → 3, 이월되지 않은 항목은 0
- 테스트 실행(Git Bash, 프로젝트 폴더에서):
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-first-run --user-data-dir="$LOCALAPPDATA/todo-test-chrome" --dump-dom "file:///$(pwd -W | sed 's/ /%20/g')/tests.html" 2>/dev/null | grep -oE 'id="summary">[^<]*|class="fail">[^<]*'
  이전 단계 테스트를 포함해 전부 "PASS"이고 실패 0이어야 한다.

## 단계 마무리 규칙
작업이 끝나면 만든 파일, 테스트 실행 결과(실패→통과 과정 포함)를 보고하고 멈춘다. 사용자 승인을 받은 뒤 커밋하고 다음 단계로 넘어간다. 승인 전에는 커밋하지 않는다.
~~~

---

## 3단계: 화면 그리기와 앱 기본 동작

~~~text
# 3단계: 화면 그리기(Render)와 앱 기본 동작(App)

## 프로젝트 맥락
하루 10~20개의 할 일을 날짜별로 관리하는 개인용 웹 앱을 순수 HTML/CSS/JavaScript로 만들고 있다(index.html 더블클릭 실행, localStorage 저장). 전체 5단계 중 3단계다. 이미 있는 것:
- js/dates.js(TodoApp.Dates), js/storage.js(TodoApp.Storage: 검증, load/save, 백업), js/todos.js(TodoApp.Todos: CATEGORY_LABELS, createTodo, addTodo, updateTodo, deleteTodo, toggleTodo, todosForDate, sortTodos, overdueTodos, carryOver, carryDays, progress)
- tests.html, js/tests.js(test/assert/assertEqual, makeTodo, fakeStorage(writes, failGet, failSet), storageWith, overdueFixture)
시작하기 전에 이 파일들을 읽고 이름과 형식을 맞춘다.

## 공통 규칙 (모든 단계에 적용)
- 외부 라이브러리, 빌드 도구, Node.js, ES 모듈을 쓰지 않는다. 일반 <script src>만 쓰고, file://로 동작해야 한다.
- 전역은 window.TodoApp 하나만 만든다. 각 JS 파일은 IIFE + "use strict"로 감싼다. 파일 안은 // ==================== 주석으로, App.init 내부는 // ----- 이름 ----- 주석으로 구역을 나눈다.
- toISOString()은 쓰지 않는다. 요일은 계산한다.
- 사용자 입력 텍스트는 textContent, value, setAttribute로만 넣는다. innerHTML은 사용자 데이터가 없는 고정 골격에서만 쓴다(XSS 방지).
- TDD로 진행한다.

## 만들 파일
- js/render.js: TodoApp.Render = { mount(root), render(root, state) }. 그리기만 하고 이벤트는 모른다.
- js/app.js: TodoApp.App = { init(options) → api }
- js/tests.js: 테스트 추가

## 구체적인 지시 사항
1. state 모양: { todos, today, viewDate, filter("all"|카테고리), editingId, notice, saveFailed, hasBackup }
2. DOM 계약(App과 테스트가 이 이름을 쓴다)
   - data-role: messages, date-label, progress-text, progress-fill, progress-categories, carry-over, add-input, add-category, filters, list, empty, restore-backup, import-file, edit-area, edit-input, edit-category
   - data-action: prev-day, next-day, go-today, carry-over, add, filter(+data-filter), toggle(체크박스), edit, delete, export, import, restore-backup
   - 항목은 <li class="todo-item" data-id>(완료 시 done, 수정 중 editing 클래스), 텍스트 .todo-text, 이월 표시 .todo-carry
3. Render
   - 헤더 "2026-10-02 (금) · 오늘"(다른 날짜면 "· 오늘" 없음)
   - 진행률 "진행률 2/3 (67%)", 막대 width "67%"
   - 카테고리별 게이지: 전체 게이지 아래 progress-categories 영역에 그날 할 일이 있는 카테고리만 업무→개인→공부 순서로 한 줄씩(.cat-progress[data-category]) "이름(.cat-progress-label) + 완료/전체(.cat-progress-count) + 게이지(.cat-progress-bar, role=\"progressbar\", aria-valuemin 0, aria-valuemax 100, aria-valuenow, aria-label \"업무 진행률\")"를 그린다. 막대(.cat-progress-fill) 색은 배지 색과 같다. 할 일이 0개인 카테고리는 줄을 그리지 않고, 그날 할 일이 없으면 영역을 숨긴다. 게이지는 필터와 무관하게 그 날짜 전체 기준이다.
   - 이월 버튼 "밀린 미완료 N개 가져오기"(오늘 화면이고 대상이 있을 때만)
   - 필터 버튼 aria-pressed. 필터는 목록만 거르고 진행률은 그 날짜 전체 기준이다.
   - 빈 상태 "이 날짜에 할 일이 없습니다." / "이 카테고리에 할 일이 없습니다."
   - 이월된 항목에 "N일째", 완료 항목에 done 클래스와 체크, 수정 중인 항목은 입력란과 카테고리 select로 그린다.
   - [백업 복원] 버튼은 hasBackup일 때만 보인다.
   - 메시지 영역: notice와 "저장에 실패했습니다. 새로고침하면 변경 내용이 사라질 수 있습니다."
4. App.init({ root, storage, today?, now?, confirm?, alert?, download? }): today/now/confirm/alert/download는 테스트에서 바꿔 끼울 수 있게 기본값을 둔다. 반환값 api = { state, destroy() }.
   - 이벤트는 root 하나에 위임하고, data-action/data-role 이름으로 처리 함수 표(clickHandlers, keyHandlers, changeHandlers)에서 찾는다. update() 뒤에 실행할 afterRender 배열과 정리용 cleanups 배열을 둔다(4단계에서 쓴다).
   - 시작 시 Storage.load. corrupt면 notice "저장된 데이터를 읽을 수 없어 백업으로 보관하고 새로 시작합니다.", unavailable이면 "저장소를 사용할 수 없어 데이터가 저장되지 않습니다."
   - 추가: Enter 또는 [추가]. keydown에서 e.isComposing이나 keyCode 229(한글 조합 중)면 무시한다. 추가 후 입력란을 비우고 포커스를 유지하며, 카테고리 선택은 유지한다.
   - 완료 토글, 삭제는 confirm("'텍스트'을(를) 삭제할까요?")를 거친다.
   - ◀/▶/[오늘] 날짜 이동. 다른 날짜에서 추가하면 그 날짜에 등록된다.
   - 필터 클릭
   - 상태가 바뀔 때마다 즉시 저장한다. 저장에 실패하면 saveFailed 경고를 띄우고, 다음 저장에 성공하면 지운다.

## 완료 기준 (통과해야 할 테스트)
- Render: 헤더(금/목, 오늘 표시), 진행률(67%, 0/0 (0%)), 카테고리 게이지(할 일 있는 카테고리만·순서·숫자·width·aria, 0개면 영역 숨김, 다른 날짜 제외, 필터 무관), 정렬과 done 표시, 필터(목록만 거름, 진행률 불변, aria-pressed), 빈 상태 두 가지, 이월 버튼 표시 조건, N일째, 수정 중 행, 백업 버튼, 메시지, XSS(<img src=x onerror=...>가 문자 그대로 보이고 img 요소가 생기지 않음)
- App 게이지: 공부 할 일 추가 → 공부 줄 즉시 표시, 완료 토글 → 게이지 갱신, 삭제 → 줄 즉시 사라짐
- App(테스트 도우미 withApp으로 숨겨진 #test-root에 띄우고, 오늘을 "2026-10-02"로 고정): 시작 화면, Enter 추가와 저장, 다시 열어도 유지, 버튼 추가, 빈 값 거부, isComposing:true인 Enter 무시 후 일반 Enter로 1개만 추가, 카테고리 유지, 토글 저장, 삭제 승인과 거부, 날짜 이동과 다른 날짜 추가, 필터, 깨진 데이터 안내와 백업 버튼, 저장 실패 경고와 해제, 저장소 접근 불가 안내
- 테스트 실행(Git Bash, 프로젝트 폴더에서):
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-first-run --user-data-dir="$LOCALAPPDATA/todo-test-chrome" --dump-dom "file:///$(pwd -W | sed 's/ /%20/g')/tests.html" 2>/dev/null | grep -oE 'id="summary">[^<]*|class="fail">[^<]*'
  이전 단계 테스트를 포함해 전부 "PASS"이고 실패 0이어야 한다.

## 단계 마무리 규칙
작업이 끝나면 만든 파일, 테스트 실행 결과(실패→통과 과정 포함)를 보고하고 멈춘다. 사용자 승인을 받은 뒤 커밋하고 다음 단계로 넘어간다. 승인 전에는 커밋하지 않는다.
~~~

---

## 4단계: 수정 모드, 이월·자정 처리, 데이터 보관

~~~text
# 4단계: 수정 모드, 이월 버튼·자정 처리, 내보내기·가져오기·백업 복원, 다른 탭 감지

## 프로젝트 맥락
하루 10~20개의 할 일을 날짜별로 관리하는 개인용 웹 앱을 순수 HTML/CSS/JavaScript로 만들고 있다(index.html 더블클릭 실행, localStorage 저장). 전체 5단계 중 4단계다. 이미 있는 것:
- js/dates.js, js/storage.js(parseAndValidate, load, save, hasBackup, replaceData, readBackup, restoreBackup 포함), js/todos.js(updateTodo, carryOver 포함)
- js/render.js(Render.mount/render, DOM 계약: edit-area/edit-input/edit-category, carry-over, export/import/restore-backup, import-file)
- js/app.js(App.init: state, clickHandlers/keyHandlers/changeHandlers 표, afterRender, cleanups, api, update, commit, isComposing, 옵션 confirm/alert/download/today/now)
- js/tests.js(withApp, pressKey, addViaUi, savedTodos, keyWrites, overdueFixture 등)
시작하기 전에 app.js, render.js, tests.js를 읽고 구조와 이름을 맞춘다. 새 기능은 app.js의 이벤트 연결 구역 위에 구역을 추가하는 방식으로 넣는다.

## 공통 규칙 (모든 단계에 적용)
- 외부 라이브러리, 빌드 도구, Node.js, ES 모듈을 쓰지 않는다. 일반 <script src>만 쓰고, file://로 동작해야 한다.
- 전역은 window.TodoApp 하나만 만든다. IIFE + "use strict", 구역 주석을 유지한다.
- toISOString()은 쓰지 않는다. 사용자 텍스트는 textContent/value로만 넣는다.
- TDD로 진행한다. 화면 문구는 아래에 적힌 그대로 쓴다.

## 만들 파일
- js/app.js 수정, js/tests.js 테스트 추가 (필요하면 js/render.js의 작은 수정)

## 구체적인 지시 사항
1. 수정 모드
   - ✎ 버튼만으로 텍스트와 카테고리를 모두 수정할 수 있어야 한다(터치 기기 대응). 텍스트 더블클릭은 데스크톱 보조 수단이다.
   - Enter 또는 포커스가 수정 영역 밖으로 나가면(focusout) 저장, Esc는 취소. 텍스트가 비면 저장하지 않고 원래 값으로 되돌린다.
   - 수정 입력란에도 isComposing/keyCode 229 Enter 무시를 적용한다.
   - 수정 세션마다 { id, finished, input, select } 객체를 만든다. Enter·Esc·blur 중 먼저 처리된 쪽만 유효하게 finished 플래그로 막는다. Esc 뒤 blur는 저장 0회, Enter 뒤 blur는 저장 정확히 1회. 세션은 자기 input/select 요소를 직접 들고 있어야 한다. 그래서 요소가 DOM에서 빠진 뒤 blur가 와도 플래그가 없으면 다시 저장된다(플래그를 지우면 테스트가 실패하는지 직접 확인한다).
   - 같은 수정 영역 안의 input → select 포커스 이동은 저장 트리거가 아니다.
   - Enter/Esc로 끝냈으면 그 항목의 ✎ 버튼으로 포커스를 돌려준다.
   - 수정 중 다른 항목의 ✎·체크박스·🗑를 누르면 한 번에 동작해야 한다. 수정 중에는 root mousedown에서 수정 영역 밖의 [data-action] 대상에 preventDefault를 해서 포커스가 이동하지 않게 한다. 클릭 처리에서는 수정을 먼저 저장해 끝낸 뒤 해당 동작을 실행한다. 완료 토글은 change가 아니라 click으로 처리한다.
2. 이월·자정 처리
   - [밀린 미완료 N개 가져오기] 클릭 시 Todos.carryOver(오늘)를 적용하고 저장한다.
   - 앱을 열어둔 채 자정이 지나면, 창 focus 또는 visibilitychange(visible) 때 "오늘"을 다시 계산한다. 오늘을 보던 중이면 새 오늘로 이동하고, 다른 날짜를 보던 중이면 그대로 둔다. 리스너는 cleanups로 제거한다. 테스트용으로 api.refreshToday를 노출한다.
3. 내보내기·가져오기·백업 복원
   - 내보내기: { version: 1, todos }를 "todo-backup-YYYY-MM-DD.json"(오늘)으로 다운로드한다(Blob + a[download], file://에서 동작).
   - 가져오기: 파일 선택 → FileReader → parseAndValidate. 실패하면 alert("가져올 수 없습니다.\n" + 오류)를 띄우고 아무것도 바꾸지 않는다. 성공하면 confirm("현재 할 일 A개가 가져온 B개로 대체됩니다. 계속할까요?") 후 replaceData(기존 원문을 백업에 보관)로 교체한다. 처리 후 file input 값을 비운다. 테스트용으로 api.importText(text)를 노출한다.
   - 백업 복원: readBackup이 실패하면 그 오류를 alert한다. 성공하면 confirm("현재 할 일 A개를 백업의 B개로 되돌립니다. 계속할까요?") 후 restoreBackup(맞바꾸기)을 실행한다.
   - 데이터를 교체할 때(가져오기·복원) 열려 있는 수정 세션은 저장 없이 finished로 만든다.
4. 다른 탭 감지
   - window "storage" 이벤트에서 key가 todoApp.v1이면, 열린 수정은 저장 없이 닫고 Storage.load로 다시 불러온다. notice는 "다른 탭에서 변경된 내용을 불러왔습니다."로 한다. 이 처리에서는 저장소에 쓰지 않는다.
   - 백업 키 변경 시에는 hasBackup만 갱신하고, 그 외 키는 무시한다. 리스너는 cleanups로 제거한다.

## 완료 기준 (통과해야 할 테스트)
- 수정: ✎ 진입, ✎만으로 텍스트·카테고리 저장(Enter), Enter 후 blur 저장 1회, Esc 후 blur 저장 0회와 원래 텍스트 유지, 조합 중 Enter 무시, select로 포커스 이동 시 저장 안 함 → 밖으로 나가면 저장, 빈 텍스트 무시, 더블클릭 진입
- 수정 중 다른 항목: B의 ✎·체크박스·🗑에 대한 mousedown이 preventDefault됨, click 한 번으로 A 저장 + B 동작, 동작 대상이 아니거나 수정 영역 안에서는 preventDefault 안 함
- 이월: 버튼 문구와 클릭 후 목록·"5일째"/"3일째"·저장된 date/originalDate, 버튼이 사라짐, 다른 날짜에서는 버튼 없음
- 자정: focus 이벤트로 "2026-10-03 (토) · 오늘"로 이동, 다른 날짜를 보던 중이면 유지
- 데이터: 내보내기 파일명과 내용, 가져오기 정상(확인 문구, 교체, 백업, 복원 버튼 표시), 형식 오류("가져올 수 없습니다.\n2번째 항목: category 값이 잘못되었습니다."), JSON 아님, 확인 거부, 백업 복원 승인(맞바꾸기)·거부·손상, 내보내기 → 전부 삭제 → 가져오기 왕복, 가져오기 시 열린 수정이 저장되지 않음
- 다른 탭: 본 키 변경 시 목록 갱신과 안내 문구, 앱의 저장 0회, 수정 중 변경 시 입력 내용을 저장하지 않음, 다른 키는 무시
- 테스트 실행(Git Bash, 프로젝트 폴더에서):
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-first-run --user-data-dir="$LOCALAPPDATA/todo-test-chrome" --dump-dom "file:///$(pwd -W | sed 's/ /%20/g')/tests.html" 2>/dev/null | grep -oE 'id="summary">[^<]*|class="fail">[^<]*'
  이전 단계 테스트를 포함해 전부 "PASS"이고 실패 0이어야 한다.

## 단계 마무리 규칙
작업이 끝나면 바꾼 파일, 테스트 실행 결과(실패→통과 과정과 플래그 제거 확인 결과 포함)를 보고하고 멈춘다. 사용자 승인을 받은 뒤 커밋하고 다음 단계로 넘어간다. 승인 전에는 커밋하지 않는다.
~~~

---

## 5단계: 앱 진입점, 스타일, 최종 점검

~~~text
# 5단계: index.html, style.css, 모바일 대응, 최종 점검, README

## 프로젝트 맥락
하루 10~20개의 할 일을 날짜별로 관리하는 개인용 웹 앱을 순수 HTML/CSS/JavaScript로 만들고 있다(index.html 더블클릭 실행, localStorage 저장). 전체 5단계 중 마지막 단계다. 모든 JS 모듈(js/dates.js, storage.js, todos.js, render.js, app.js)과 tests.html/js/tests.js는 이미 완성되어 있고 테스트가 전부 통과한다. 이번 단계는 진입점과 스타일을 만들고, 전체를 점검하고, README를 정리한다. render.js가 만드는 클래스 이름과 data-role을 먼저 읽고 스타일을 맞춘다.

## 공통 규칙 (모든 단계에 적용)
- 외부 라이브러리, 빌드 도구, Node.js, ES 모듈을 쓰지 않는다. 일반 <script src>만 쓰고, file://로 동작해야 한다. 외부 폰트나 CDN도 쓰지 않는다.
- 전역은 window.TodoApp 하나만 만든다. CSS도 역할별 구역 주석으로 나눈다.
- 이번 단계에서 JS 로직은 바꾸지 않는다. 문제를 발견하면 고치기 전에 보고한다.

## 만들 파일
- index.html: <meta name="viewport" content="width=device-width, initial-scale=1">, lang="ko", style.css 연결, <main id="app">. 스크립트는 dates → storage → todos → render → app 순서로 불러온다. 마지막 인라인 스크립트에서 window.localStorage 접근을 try/catch로 감싸고(막히면 null) TodoApp.App.init({ root, storage })를 호출한다.
- style.css
- README.md(있으면 수정)

## 구체적인 지시 사항
1. 색과 크기는 :root 토큰으로 정의하고 [hidden] { display: none !important; }를 둔다.
2. 터치 대상(체크박스와 라벨 영역, ✎, 🗑, ◀/▶, [오늘], 필터·추가·이월 버튼)은 최소 44×44px로 한다.
3. button, input, select의 font-size는 16px 이상으로 한다(iOS 포커스 시 자동 확대 방지).
4. 추가 줄은 flex-wrap으로 만든다. 480px 이하에서는 입력란이 한 줄 전체를 쓰고, 카테고리와 [추가]가 다음 줄로 내려간다.
5. 카테고리 게이지 줄은 "이름 | 숫자 | 게이지" 3열 그리드(이름·숫자 고정 폭, 숫자는 tabular-nums, 게이지 열은 minmax(0, 1fr))로 360px에서도 한 줄이 넘치지 않게 한다. 긴 텍스트는 overflow-wrap: anywhere로 줄바꿈한다. 날짜 헤더는 word-break: keep-all로 "오/늘"처럼 끊기지 않게 한다.
6. 완료 항목은 취소선과 흐린 색, 카테고리 배지는 색과 글자로 구분, "N일째"는 강조색, 메시지와 이월 버튼은 경고색으로 한다.
7. 최종 점검
   - grep으로 toISOString 사용(주석 제외), import/export 문, type="module", 외부 URL이 없는지 확인한다.
   - innerHTML은 render.js의 골격 한 곳뿐인지 확인한다.
   - 360px 폭 확인: 헤드리스 --window-size 스크린샷은 실제보다 잘려 보일 수 있다. 너비 360px iframe에 index.html을 띄워 documentElement.scrollWidth가 360인지, 보이는 버튼이 모두 44px 이상인지, 입력 글자가 16px인지 측정한다.
8. 수동 체크리스트를 사용자에게 전달하고 결과를 받는다.
   - index.html과 tests.html이 더블클릭으로 실행되는가
   - Chrome·Edge에서 "공부하기" + Enter → 1개만 추가되고 마지막 글자 "기"가 남는가(수정 입력란도 확인, Esc 취소·Enter 1회 저장)
   - 수정 중 다른 항목의 ✎·체크박스·🗑가 한 번에 동작하는가
   - 360px(DevTools 기기 모드)에서 가로 스크롤 없음, 줄바꿈된 입력 줄로 추가 가능, ✎만으로 수정 가능, 44px·16px
   - 새로고침 후 유지, 내보내기 → 전부 삭제 → 가져오기 복원, 가져오기 직후 [백업 복원]
   - 탭 두 개에서 한쪽 변경이 다른 탭에 안내와 함께 반영되는가
   - 카테고리 게이지가 할 일 있는 카테고리만 보이고 추가·삭제·완료 시 바로 바뀌며, 360px에서도 깨지지 않는가
9. README.md: 프로젝트 소개, 주요 기능, 실행 방법(index.html 더블클릭), 테스트 방법(tests.html 더블클릭 + 헤드리스 명령), 폴더 구조, PRD 문서 링크. 수동 체크리스트가 모두 통과하면 상태를 "완성"으로 적고 실제 테스트 개수를 넣는다.

## 완료 기준 (통과해야 할 테스트)
- 헤드리스로 index.html을 열었을 때 date-label이 "YYYY-MM-DD (요일) · 오늘"(실행한 날 기준의 올바른 요일), progress-text가 "진행률 0/0 (0%)"
- 360px iframe 측정 통과, 최종 점검 grep 통과
- 전체 테스트 실행(Git Bash, 프로젝트 폴더에서):
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-first-run --user-data-dir="$LOCALAPPDATA/todo-test-chrome" --dump-dom "file:///$(pwd -W | sed 's/ /%20/g')/tests.html" 2>/dev/null | grep -oE 'id="summary">[^<]*|class="fail">[^<]*'
  전부 "PASS"이고 실패 0이어야 한다.
- 사용자가 수동 체크리스트 전 항목 통과를 확인

## 단계 마무리 규칙
작업이 끝나면 만든 파일, 점검·테스트 결과, 수동 체크리스트 결과를 보고하고 멈춘다. 사용자 승인을 받은 뒤 커밋하고 다음 단계로 넘어간다(마지막 단계이므로 다음은 main 브랜치 병합 방식 결정이다). 승인 전에는 커밋하지 않는다.
~~~
