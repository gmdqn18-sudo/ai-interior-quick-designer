import * as assert from "node:assert/strict";
import { test } from "node:test";

import { buildConcepts, getProductPurchaseUrl, productPool, type Product } from "./interior-design";

test("productPool contains only verified real product-detail links", () => {
  assert.ok(productPool.length >= 20);

  for (const product of productPool) {
    assert.equal(product.source, "이케아");
    assert.equal(product.linkType, "product-detail");
    assert.match(product.url, /^https:\/\/www\.ikea\.com\/kr\/ko\/p\//);
    assert.ok(product.externalId, `${product.name} should keep a retailer item id`);
    assert.match(product.verifiedAt, /^2026-05-17$/);
    assert.ok(!product.name.includes("무드 테이블 램프"), "catalog must not contain imagined generic product names");
  }
});

test("buildConcepts scales selected real products toward a high user budget", () => {
  const concepts = buildConcepts(1_000_000, "우드톤 수납 조명 호텔식", 1);
  const highestUsedBudget = Math.max(...concepts.map((concept) => concept.usedBudget));

  assert.ok(highestUsedBudget >= 600_000, `expected at least 600,000원 used, got ${highestUsedBudget}`);
  assert.ok(concepts.every((concept) => concept.usedBudget <= 1_000_000));
  assert.ok(concepts.some((concept) => concept.products.length >= 8));
  assert.ok(concepts.every((concept) => concept.products.length <= 12));
  assert.ok(concepts.every((concept) => concept.products.every((product) => product.linkType === "product-detail")));
});

test("getProductPurchaseUrl returns the verified product detail page instead of a search fallback", () => {
  const product: Product = {
    id: "ikea-fado-table-lamp",
    externalId: "30283899",
    name: "FADO 파도 탁상스탠드",
    category: "조명",
    price: 24900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/fado-table-lamp-white-30283899/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "테스트",
  };

  assert.equal(getProductPurchaseUrl(product), "https://www.ikea.com/kr/ko/p/fado-table-lamp-white-30283899/");
});
