export type RenderTrustMode = "product-composite-edit" | "product-composite-preview" | "mock-image-preview" | "openai-image-edit" | "openrouter-image-edit" | string;

export type RenderResultBadge = {
  label: string;
  detail: string;
  className: string;
};

export function getRenderResultBadge(mode: RenderTrustMode | null, hasImage: boolean): RenderResultBadge {
  if (!hasImage) {
    return {
      label: "분위기 참고 이미지 · 실제 상품과 다를 수 있음",
      detail: "아직 실제 상품을 사진에 배치하기 전입니다.",
      className: "bg-white/90 text-slate-950",
    };
  }

  if (mode === "product-composite-edit") {
    return {
      label: "AI 보정본 · 직접 확인 필요",
      detail: "핵심 상품 최대 3개를 먼저 배치한 뒤 AI가 조명과 색감을 맞춘 참고 결과입니다. 상품 썸네일과 비교해 형태·색감이 유지됐는지 확인하세요.",
      className: "bg-amber-200 text-slate-950",
    };
  }

  if (mode === "product-composite-preview") {
    return {
      label: "1차 상품 합성본 · 최종 보정 전",
      detail: "상품 위치와 썸네일 형태를 먼저 확인하는 미리보기입니다.",
      className: "bg-amber-200 text-slate-950",
    };
  }

  return {
    label: "분위기 참고 이미지 · 실제 상품과 다를 수 있음",
    detail: "상품 후보와 별도로 만든 스타일 참고용 이미지입니다.",
    className: "bg-white/90 text-slate-950",
  };
}

export function getResultTrustNotice(hasImageProductMapping: boolean) {
  if (!hasImageProductMapping) {
    return "이미지 생성 전에는 전체 구매 후보를 준비합니다. 생성 후에는 실제 구매 링크와 연결된 ‘이미지에 반영된 상품’과 ‘추가 구매 후보’를 분리해 보여드립니다.";
  }

  return "이미지 안의 모든 물체가 구매 후보는 아닙니다. 실제 구매 링크와 연결된 항목은 아래 ‘이미지에 반영된 상품’과 ‘추가 구매 후보’ 카드 기준이며, 최종 AI 보정본은 상품 썸네일과 비교해 형태·색감 유지 여부를 직접 확인해 주세요.";
}
