import type { RoomAnalysis } from "./design-api";

const toneSets = [
  ["화이트", "라이트 우드", "베이지"],
  ["아이보리", "월넛", "웜 그레이"],
  ["쿨 화이트", "블랙", "실버"],
];

const furnitureSets = [
  ["침대", "책상", "옷장"],
  ["소파", "커튼", "조명"],
  ["책상", "수납장", "러그"],
];

function makeAnalysisId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `analysis_${crypto.randomUUID().slice(0, 8)}`;
  }

  return `analysis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function hashText(value: string) {
  return Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function analyzeRoomImageMock(file: { name: string; type: string; size: number }): RoomAnalysis {
  const seed = hashText(`${file.name}:${file.type}:${file.size}`);
  const roomType: RoomAnalysis["roomType"] = seed % 4 === 0 ? "작업방" : seed % 3 === 0 ? "거실" : seed % 2 === 0 ? "침실" : "원룸";
  const lightLevel: RoomAnalysis["lightLevel"] = seed % 3 === 0 ? "좋음" : seed % 3 === 1 ? "보통" : "낮음";
  const clutterLevel: RoomAnalysis["clutterLevel"] = file.size > 2_000_000 ? "높음" : seed % 2 === 0 ? "보통" : "낮음";
  const dominantTones = toneSets[seed % toneSets.length];
  const detectedFurniture = furnitureSets[seed % furnitureSets.length];
  const needsStorage = clutterLevel !== "낮음" || detectedFurniture.includes("책상");
  const needsLight = lightLevel !== "좋음";

  return {
    id: makeAnalysisId(),
    createdAt: new Date().toISOString(),
    source: "mock-vision",
    file,
    roomType,
    lightLevel,
    clutterLevel,
    dominantTones,
    detectedFurniture,
    summary: `${roomType}로 보이며, 채광은 ${lightLevel}, 생활감은 ${clutterLevel} 수준으로 추정됩니다. ${dominantTones.join("·")} 톤에 맞춘 저비용 변화가 적합합니다.`,
    constraints: [
      "월세방에서도 가능한 무타공/저시공 솔루션 우선",
      "큰 가구 교체보다 패브릭·조명·수납으로 체감 변화 극대화",
      ...(needsLight ? ["채광 보완을 위한 웜톤 보조 조명 필요"] : []),
    ],
    opportunities: [
      needsStorage ? "책상 주변과 바닥 생활감을 수납 박스·카트로 먼저 정리" : "기존 정돈감을 유지하면서 러그와 식물로 포인트 추가",
      "Before/After 차이가 잘 보이는 큰 면적 색상 통일",
      "구매 링크로 바로 전환 가능한 소품 위주 구성",
    ],
    recommendedPromptAdditions: [
      `${dominantTones.join(" ")} 톤 유지`,
      needsStorage ? "수납 중심" : "미니멀 포인트",
      needsLight ? "웜톤 조명 보강" : "자연광을 살리는 배치",
      "못질 없이 설치",
    ],
    confidenceScore: Math.min(94, 78 + (seed % 17)),
  };
}
