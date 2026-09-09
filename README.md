# AlchemyNote Generative Projects MVP

AlchemyNote는 사용자가 먼저 폼을 채우거나 카테고리를 고르지 않아도 되는 AI Project 도구입니다.
하나의 일반 대화에서 발전시킬 만한 작은 징조를 발견하고, 고유한 대표 색과 정보 구조를 가진
Living Project로 발전시킵니다.

## 핵심 경험

```text
General Chat
  → 지속적인 맥락 발견
  → Project로 발전시키기 제안
  → 사용자 승인
  → 대표 색 + Schema 기반 Project 화면 생성
```

- 하나의 General AI Conversation
- 작은 Project 징조 감지
- 기존 Project 연관성 감지
- 생성·업데이트 전 사용자 승인
- `metric`, `progress`, `status`, `list`, `timeline` Widget Schema
- 주제별 대표 색과 동적 Project 상세 화면
- 브라우저 `localStorage` 저장
- Gemini Structured Output
- API Key 없이 대표 흐름을 확인하는 Demo Mode

## Windows에서 실행

PowerShell을 열고 아래 명령을 그대로 실행합니다.

```powershell
cd "C:\Users\taesi\OneDrive\문서\Ai Agent Demo\alchemynote-demo"
npm run dev
```

터미널에 아래 문구가 나타날 때까지 기다립니다.

```text
Ready in ...
```

그다음 브라우저에서 아래 주소를 엽니다.

```text
http://localhost:3100
```

서버를 종료할 때는 실행 중인 PowerShell에서 `Ctrl+C`를 누릅니다. 이미 서버가 실행 중이면
`Already running at http://localhost:3100`이라고 표시되므로 브라우저만 열면 됩니다.

명령어 대신 프로젝트 폴더의 `start-demo.cmd`를 더블클릭해도 동일하게 실행됩니다.

### 처음 받은 PC에서만 필요한 설치

`node_modules`가 없는 경우 다음 명령을 한 번 실행합니다. 전역 `pnpm` 설치는 필요 없습니다.

```powershell
corepack pnpm install
```

그 후에는 항상 `npm run dev`만 사용하면 됩니다.

현재 서버는 OneDrive 파일 감시 충돌을 피하려고 시작 시점의 코드를 Windows 임시 실행 폴더로
복사합니다. 따라서 코드를 수정했으면 기존 터미널에서 `Ctrl+C`를 누른 뒤 다시 실행해야 합니다.

```powershell
npm run dev
```

`pnpm dev`를 직접 입력하지 않는 이유는 이 PC의 PowerShell PATH에 전역 pnpm 명령이 없기
때문입니다. 의존성 형식은 pnpm을 유지하되 실행 진입점은 사용 가능한 npm 명령으로 고정했습니다.

## 대표 데모

1. Chat에 아래 메시지를 입력합니다.

   ```text
   오래 미뤄둔 할머니 레시피를 인터뷰해서 작은 가족 요리책으로 만들고 싶어.
   이번 달에는 우선 세 가지 음식 이야기부터 기록해보려고 해.
   ```

2. 답변 아래의 `Project로 발전시키기`를 선택합니다.
3. 대표 색과 Widget 구성이 생성된 Preview에서 `이 Project 만들기`를 선택합니다.
4. Projects에서 생성된 Schema 기반 화면을 확인합니다.
5. Chat으로 돌아와 아래 메시지를 입력합니다.

   ```text
   오늘 첫 인터뷰를 했고 레시피 두 개를 정리했어.
   ```

6. 기존 Project 업데이트 Preview를 승인하고 화면 변화를 확인합니다.

## 검사와 빌드

```powershell
npm run typecheck
npm run build
npm run start
```

프로덕션 빌드도 OneDrive 충돌을 피하도록 Windows 임시 빌드 폴더를 사용하며 `npm run start`는
그 산출물을 `http://localhost:3100`에서 실행합니다.

## Gemini 설정

`apps/web/.env.local`:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
```

키가 없거나 Gemini 호출이 실패하면 Demo Mode로 전환됩니다. Demo Mode는 특정 주제 템플릿
대신 문장에서 의도, 수치, 단위, 시점, 현재 단계를 추출해 제한된 UI Schema를 조합합니다.
실제 Gemini 응답은 아닙니다.

## 현재 MVP에서 제외한 것

- 로그인과 사용자 계정
- 서버 DB와 기기 간 동기화
- 복잡한 RAG와 Background Agent
- 음성·브라우저 수집·외부 앱 연동
- 여러 사용자가 사용하는 운영 환경
