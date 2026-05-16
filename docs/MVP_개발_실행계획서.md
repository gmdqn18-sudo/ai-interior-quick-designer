# AI Interior Quick Designer MVP 개발 실행계획서

작성일: 2026-05-16

## 1. 개발 운영 방식

이번 개발은 다음 역할 분담으로 진행한다.

- **Hermes(나)**: PM/기획/QA/오케스트레이터
  - 기획서 해석
  - MVP 범위 통제
  - Codex 작업 지시
  - 구현물 검수
  - 실행/빌드/브라우저 테스트
- **Codex**: 구현 담당 개발 에이전트
  - Next.js 코드 작성
  - 컴포넌트/페이지/API 구현
  - 타입/빌드 오류 수정

## 2. MVP 핵심 원칙

이 프로젝트의 핵심 차별화는 일반 AI 도구처럼 “프롬프트로 방 이미지를 한 번 만들어주는 것”이 아니다.

핵심 UX는 다음이다.

```text
방 사진 업로드
→ 사용자가 원하는 분위기/조건을 자연어로 입력
→ 예산 설정
→ AI가 내부적으로 예산 안의 실판매 상품 조합을 가정
→ 같은 예산으로 여러 시안을 계속 생성
→ 사용자가 마음에 드는 시안 선택
→ 선택한 시안의 상품 리스트/총액/구매 링크 확인
```

MVP에서는 실제 AI/쇼핑 API를 바로 붙이기보다, 이 UX를 더미 데이터로 먼저 구현한다.

## 3. 기술 스택

- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- UI: 자체 컴포넌트 우선, 필요 시 shadcn/ui 추후 도입
- State: React state로 시작
- Data: 더미 시안/상품 데이터
- Future API: 이미지 생성 API, 쇼핑 API, Supabase/DB는 후속 단계

## 4. 1차 MVP 범위

### 포함

1. 랜딩 페이지
2. 사진 업로드 UI
3. 자연어 프롬프트 입력
4. 예산 입력/프리셋 선택
5. 유지할 가구 선택
6. “같은 예산으로 시안 생성” 버튼
7. 여러 시안 카드 표시
8. 시안 비교 정보
   - 방향
   - 사용 금액
   - 남은 예산
   - 특징
   - 구매 가능성 점수
9. 시안 선택 기능
10. 선택한 시안의 상품 리스트 표시
11. 상품별 가격/카테고리/구매처/구매 링크 버튼
12. 총액/남은 예산 요약

### 제외

- 실제 AI 이미지 생성
- 실제 쇼핑몰 API 연동
- 결제
- 회원가입
- DB 저장
- 이미지 서버 업로드
- 3D/AR

## 5. 화면 구조

### `/`

랜딩 + 데모 생성 플로우를 한 화면에서 제공한다.

섹션:

1. Hero
   - “내 방 사진 한 장으로, 예산 안에서 계속 인테리어 시안 뽑기”
   - 일반 AI 도구 대비 차별화 문구
2. 작동 방식
   - 사진/프롬프트/예산 → 여러 시안 → 선택 → 쇼핑 리스트
3. 생성 패널
   - 이미지 업로드
   - 프롬프트 입력
   - 예산 선택
   - 유지할 가구 선택
4. 시안 결과 영역
   - 시안 카드 3개
   - “같은 예산으로 다시 생성” 버튼
5. 선택 시안 상세
   - Before/After placeholder
   - 상품 리스트
   - 총액/남은 예산

## 6. 더미 데이터 구조

```ts
type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  source: '쿠팡' | '이케아' | '오늘의집' | '네이버쇼핑';
  url: string;
  reason: string;
};

type DesignConcept = {
  id: string;
  title: string;
  strategy: string;
  usedBudget: number;
  budgetFitScore: number;
  feasibilityScore: number;
  roomStructureScore: number;
  highlights: string[];
  products: Product[];
};
```

## 7. Codex 1차 작업 지시

Codex에게는 아래 범위만 맡긴다.

> Next.js + TypeScript + Tailwind 프로젝트를 만들고, `/` 페이지에 AI Interior Quick Designer의 1차 MVP 데모 UI를 구현한다. 실제 AI/쇼핑 API는 붙이지 말고 더미 데이터로 구현한다. 핵심 UX는 “상품을 먼저 고르는 것”이 아니라 “예산과 프롬프트를 입력하면 같은 예산 안에서 여러 시안을 계속 뽑고, 마음에 드는 시안을 선택하면 상품 리스트를 보여주는 것”이다.

## 8. 검수 체크리스트

- [ ] 사용자가 상품을 먼저 고르게 만들지 않았는가?
- [ ] 예산 입력이 생성 플로우의 핵심으로 보이는가?
- [ ] 같은 예산으로 다시 생성하는 CTA가 있는가?
- [ ] 시안 여러 개를 비교할 수 있는가?
- [ ] 시안 선택 후 상품 리스트가 보이는가?
- [ ] 일반 AI 도구 대비 차별화가 랜딩에 드러나는가?
- [ ] 모바일에서도 기본 사용이 가능한가?
- [ ] `npm run build`가 통과하는가?

## 9. 2차 작업 후보

1. 이미지 업로드 미리보기 개선
2. 시안 히스토리 저장
3. 상품 대체안 보기
4. 실제 AI 이미지 생성 API 연결
5. 쿠팡 파트너스/상품 카탈로그 연동
6. Supabase 저장
7. 로그인/무료 생성 횟수 제한
