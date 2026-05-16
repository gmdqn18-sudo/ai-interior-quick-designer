# RoomFit AI — AI Interior Quick Designer

방 사진, 예산, 취향 프롬프트를 입력하면 같은 예산 안에서 여러 인테리어 시안을 비교하고, 마음에 드는 시안을 쇼핑 리스트/공유 페이지로 전환하는 Next.js MVP입니다.

> 현재 버전은 API 키 없이 동작하는 **mock Vision + mock 상품 조합 MVP**입니다. 실제 Vision/Image/Shopping API 연결 전 UX와 제품 가설을 검증하기 위한 프로토타입입니다.

## 핵심 차별화

일반 생성형 AI는 방 사진 기반의 예쁜 이미지를 만들 수 있지만, RoomFit AI는 아래 흐름을 제품화합니다.

```text
방 사진/조건 입력
→ 방 분석(mock Vision)
→ 예산 내 실제 구매 후보 상품 조합
→ 여러 시안 비교
→ 선택한 시안의 쇼핑 리스트/공유 페이지 생성
```

핵심 포인트:

- 사용자가 상품을 먼저 고르지 않음
- 예산을 고정한 상태로 시안을 반복 생성
- 시안 선택 후 상품 리스트와 구매 후보 링크 표시
- 한국 원룸/월세방/무타공 제약을 프롬프트와 상품 조합에 반영
- `/designs/[jobId]` 공유 페이지 제공

## 주요 기능

- 메인 데모 페이지: `/`
- 방 사진 업로드 및 mock Vision 분석: `/api/room-analysis`
- 예산/프롬프트 기반 시안 생성: `/api/designs`
- 생성 Job 상세 JSON: `/api/designs/[jobId]`
- 사용자용 공유 상세 페이지: `/designs/[jobId]`
- 없는 공유 링크용 사용자 친화 404 페이지
- 쇼핑 리스트 복사 텍스트 생성
- 최근 생성 Job 목록
- 테스트 기반 AI Interior Engine/공유 helper 검증

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Node test runner + tsx
- ESLint

## 로컬 실행

```bash
npm install --include=dev
npm run dev
```

브라우저에서 접속:

```text
http://localhost:3000
```

이미 포트 3000이 사용 중이면 Next.js가 자동으로 다른 포트를 사용합니다.

## 검증 명령

```bash
npm test
npm run lint
npm run build
```

현재 테스트 범위:

- AI Interior Engine이 예산/프롬프트/방 분석을 합쳐 시안과 메트릭을 만드는지
- Job 저장소가 메모리 캐시 초기화 후에도 Job을 복구하는지
- 공유 URL/공유 요약/쇼핑 리스트 텍스트/가성비 상품 정렬이 동작하는지

## 프로젝트 구조

```text
src/app/
  page.tsx                    # 메인 MVP 데모
  api/room-analysis/route.ts  # mock Vision 분석 API
  api/designs/route.ts        # 시안 생성/목록 API
  api/designs/[jobId]/route.ts# Job 상세 JSON API
  designs/[jobId]/page.tsx    # 사용자용 공유 상세 페이지
  designs/[jobId]/not-found.tsx

src/lib/
  ai-interior-engine.ts       # 프롬프트/예산/방 분석 기반 시안 생성 엔진
  design-api.ts               # API 타입
  design-job-repository.ts    # Job 저장/조회
  design-share.ts             # 공유 URL/요약/쇼핑 리스트 helper
  interior-design.ts          # mock 상품 풀/시안 기본 데이터
  room-analysis.ts            # mock Vision 분석
```

## MVP 모드와 실제 API 연결 예정 지점

현재는 API 키 없이 다음 mock 흐름으로 동작합니다.

| 영역 | 현재 | 실제 연결 후보 |
| --- | --- | --- |
| 방 분석 | mock Vision | Gemini Vision / GPT-4o Vision |
| After 이미지 | CSS 기반 Preview | OpenAI Images / Gemini Image / FAL / Replicate |
| 상품 검색 | mock 상품 풀 | 네이버 쇼핑 API / 쿠팡 파트너스 / 제휴 링크 |
| 저장소 | `.next/cache/roomfit-design-jobs.json` best-effort | DB / KV / Supabase / Vercel KV |

## 배포 준비

Vercel에서 바로 배포 가능한 Next.js 앱입니다.

권장 설정:

```text
Framework Preset: Next.js
Build Command: npm run build
Install Command: npm install --include=dev
Output Directory: .next
Node.js: 22.x 권장
```

현재 버전은 필수 환경 변수가 없습니다. 실제 API 연결 시 `.env.example`을 기준으로 환경 변수를 추가하세요.

## 환경 변수 예시

```bash
# 실제 Vision API 연결 시 사용 예정
GEMINI_API_KEY=
OPENAI_API_KEY=

# 실제 상품 API 연결 시 사용 예정
NAVER_SHOPPING_CLIENT_ID=
NAVER_SHOPPING_CLIENT_SECRET=
COUPANG_PARTNERS_ACCESS_KEY=
COUPANG_PARTNERS_SECRET_KEY=
```

실제 키는 절대 커밋하지 말고 Vercel Project Settings 또는 로컬 `.env.local`에만 넣어야 합니다.

## 문서

- `docs/AI_Interior_Quick_Designer_기획서.md`
- `docs/MVP_개발_실행계획서.md`

## 현재 상태

- API 키 없이 동작하는 프론트/API MVP
- 테스트, lint, build 통과
- 실제 AI/API 연동 전 UX 검증 가능
