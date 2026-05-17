import * as assert from "node:assert/strict";
import { test } from "node:test";

import { getProductPurchaseUrl, productPool, type Product } from "./interior-design";

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
