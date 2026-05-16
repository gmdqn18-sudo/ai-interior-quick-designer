import * as assert from "node:assert/strict";
import { test } from "node:test";

import { buildConcepts, getProductPurchaseUrl, type Product } from "./interior-design";

test("buildConcepts scales selected products toward a high user budget", () => {
  const concepts = buildConcepts(1_000_000, "우드톤 수납 조명 호텔식", 1);
  const highestUsedBudget = Math.max(...concepts.map((concept) => concept.usedBudget));

  assert.ok(highestUsedBudget >= 600_000, `expected at least 600,000원 used, got ${highestUsedBudget}`);
  assert.ok(concepts.every((concept) => concept.usedBudget <= 1_000_000));
  assert.ok(concepts.some((concept) => concept.products.length >= 8));
  assert.ok(concepts.every((concept) => concept.products.length <= 12));
});

test("getProductPurchaseUrl deep-links to the selected shopping source search", () => {
  const product: Product = {
    id: "test-lamp",
    name: "웜톤 무드 테이블 램프",
    category: "조명",
    price: 18900,
    source: "쿠팡",
    url: "https://www.coupang.com/",
    reason: "테스트",
  };

  assert.equal(
    getProductPurchaseUrl(product),
    "https://www.coupang.com/np/search?q=%EC%9B%9C%ED%86%A4%20%EB%AC%B4%EB%93%9C%20%ED%85%8C%EC%9D%B4%EB%B8%94%20%EB%9E%A8%ED%94%84",
  );
});
