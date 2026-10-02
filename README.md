# Study_02_ToDoList_B

> **상태: 수동 체크리스트 확인 중** — PRD의 모든 기능을 구현했고 자동 테스트 108개를 통과했습니다. 수동 체크리스트 10개 항목 중 10번(카테고리 게이지)을 확인했고, 1~9번은 확인 중입니다.

하루 10~20개의 할 일을 날짜별로 관리하는 개인용 웹 앱입니다. 순수 HTML/CSS/JavaScript로 만들고, 브라우저의 localStorage에 저장하므로 새로고침해도 데이터가 남습니다. 서버, 빌드 도구, 외부 라이브러리가 필요 없습니다.

## 주요 기능

- **할 일 관리**: 추가, 수정, 삭제, 완료 체크
- **카테고리**: 업무 / 개인 / 공부 분류와 필터
- **날짜별 관리**: 날짜를 앞뒤로 이동하며 기록 확인, 미래 날짜에 미리 등록
- **진행률**: 보고 있는 날짜의 전체 진행률 게이지와, 그날 할 일이 있는 카테고리만 한 줄씩 보여주는 카테고리별 게이지(이름 + 완료/전체 + 막대)
- **미완료 이월**: 오늘 이전의 미완료 항목을 버튼 하나로 오늘로 가져오기, 이월된 항목에 "N일째" 표시
- **데이터 보관**: JSON 내보내기·가져오기, 덮어쓰기 전 자동 백업과 백업 복원, 다른 탭에서 바뀐 내용 자동 반영
- **입력 편의**: 한글 입력 중 Enter 오작동 방지, 모바일 화면(360px) 대응

## 실행 방법

1. 저장소를 내려받습니다.
   ```bash
   git clone https://github.com/soob9117/Study_02_ToDoList_B.git
   ```
2. 폴더 안의 `index.html`을 더블클릭해 브라우저로 엽니다.

서버를 띄울 필요가 없습니다. 데이터는 그 브라우저의 localStorage에 저장되므로, 다른 브라우저나 기기로 옮기려면 JSON 내보내기·가져오기를 쓰세요.

## 테스트 방법

`tests.html`을 더블클릭하면 모든 테스트가 실행되고, 맨 위에 `PASS 108/108 통과, 0 실패` 같은 요약이 표시됩니다.

명령줄에서 실행하려면 헤드리스 Chrome을 씁니다(Windows, Git Bash에서 프로젝트 폴더를 기준으로 실행).

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-first-run --user-data-dir="$LOCALAPPDATA/todo-test-chrome" --dump-dom "file:///$(pwd -W | sed 's/ /%20/g')/tests.html" 2>/dev/null | grep -oE 'id="summary">[^<]*|class="fail">[^<]*'
```

## 폴더 구조

```
index.html          앱 진입점
style.css           스타일 (반응형 포함)
tests.html          테스트 실행 페이지
js/
  dates.js          로컬 기준 날짜 유틸
  storage.js        localStorage 읽기/쓰기, 형식 검증, 백업
  todos.js          할 일 로직 (추가·수정·삭제·완료·이월·진행률)
  render.js         상태를 화면으로 그리기
  app.js            초기화와 이벤트 처리
  tests.js          테스트 코드
docs/
  prompts.md        Claude Code 5단계 프롬프트
  superpowers/
    specs/          PRD·설계 스펙
    plans/          구현 계획
```

## 문서

- [PRD·설계 스펙](docs/superpowers/specs/2026-10-02-todo-app-prd.md): 요구사항, 데이터 구조, 화면 구성, 테스트 기준, 설계 결정 기록
- [구현 계획](docs/superpowers/plans/2026-10-02-todo-app.md): Task별 TDD 구현 단계
- [5단계 프롬프트](docs/prompts.md): 이 앱을 Claude Code로 처음부터 다시 만들 때 순서대로 보낼 프롬프트

## 기술 스택

HTML5, CSS3, JavaScript(ES 모듈 없이 일반 `<script>`), localStorage
