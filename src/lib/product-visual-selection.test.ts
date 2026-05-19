import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isProductImageReflectable, selectProductsForImageReflection } from "./product-visual-selection";

type Candidate = {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
};

const image = "https://example.com/product.png";

test("selectProductsForImageReflection prioritizes visually large identifiable products", () => {
  const products: Candidate[] = [
    { id: "lamp", name: "작은 무드 조명", category: "조명", imageUrl: image },
    { id: "storage", name: "대형 오픈 선반 수납장", category: "수납", imageUrl: image },
    { id: "rug", name: "패턴 러그", category: "러그", imageUrl: image },
    { id: "chair", name: "카페 체어", category: "의자", imageUrl: image },
    { id: "curtain", name: "암막 커튼", category: "커튼", imageUrl: image },
  ];

  assert.deepEqual(selectProductsForImageReflection(products).map((product) => product.id), ["rug", "curtain", "chair"]);
});

test("selectProductsForImageReflection does not fill image reflected slots with weakly identifiable products", () => {
  const products: Candidate[] = [
    { id: "lamp", name: "테이블 무드 조명", category: "조명", imageUrl: image },
    { id: "decor", name: "작은 오브제 세트", category: "소품", imageUrl: image },
    { id: "box", name: "데스크 정리함", category: "수납", imageUrl: image },
    { id: "mini-shelf", name: "미니 2칸 원룸수납선반 인테리어책장선반", category: "수납", imageUrl: image },
    { id: "tray", name: "소형 바구니 트레이 수납함", category: "수납", imageUrl: image },
    { id: "rug", name: "원형 러그", category: "러그", imageUrl: image },
    { id: "curtain", name: "암막 커튼", category: "커튼", imageUrl: image },
  ];

  assert.deepEqual(selectProductsForImageReflection(products).map((product) => product.id), ["rug", "curtain"]);
  assert.equal(isProductImageReflectable(products[0]), false);
  assert.equal(isProductImageReflectable(products[1]), false);
  assert.equal(isProductImageReflectable(products[2]), false);
  assert.equal(isProductImageReflectable(products[3]), false);
  assert.equal(isProductImageReflectable(products[4]), false);
});

test("selectProductsForImageReflection allows storage only when the silhouette is clearly large", () => {
  const products: Candidate[] = [
    { id: "mini-bookcase", name: "미니 2칸 책장선반", category: "수납", imageUrl: image },
    { id: "desktop-rack", name: "데스크 소형 랙 정리함", category: "수납", imageUrl: image },
    { id: "large-cabinet", name: "와이드 거실 수납장 캐비닛", category: "수납", imageUrl: image },
    { id: "hanger", name: "스탠드 행거 랙", category: "수납", imageUrl: image },
  ];

  assert.deepEqual(selectProductsForImageReflection(products).map((product) => product.id), ["large-cabinet"]);
  assert.equal(isProductImageReflectable(products[0]), false);
  assert.equal(isProductImageReflectable(products[1]), false);
  assert.equal(isProductImageReflectable(products[2]), true);
});

test("selectProductsForImageReflection keeps one product per category to avoid confusing alternatives", () => {
  const products: Candidate[] = [
    { id: "rug-a", name: "베이지 러그", category: "러그", imageUrl: image },
    { id: "rug-b", name: "그레이 러그", category: "러그", imageUrl: image },
    { id: "table", name: "원형 테이블", category: "책상/테이블", imageUrl: image },
  ];

  assert.deepEqual(selectProductsForImageReflection(products).map((product) => product.id), ["rug-a", "table"]);
});
