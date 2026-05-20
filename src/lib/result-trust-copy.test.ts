import * as assert from "node:assert/strict";
import { test } from "node:test";

import { getRenderResultBadge, getResultTrustNotice } from "./result-trust-copy";

test("getRenderResultBadge keeps product composite edit copy non-final and verification-oriented", () => {
  const badge = getRenderResultBadge("product-composite-edit", true);

  assert.equal(badge.label, "AI 보정본 · 직접 확인 필요");
  assert.match(badge.detail, /상품 썸네일과 비교/);
  assert.match(badge.detail, /형태·색감/);
  assert.doesNotMatch(`${badge.label} ${badge.detail}`, /완성|성공/);
});

test("getResultTrustNotice distinguishes generated objects from linked purchase products", () => {
  const notice = getResultTrustNotice(true);

  assert.match(notice, /이미지 안의 모든 물체가 구매 후보는 아닙니다/);
  assert.match(notice, /이미지에 반영된 상품/);
  assert.match(notice, /추가 구매 후보/);
  assert.match(notice, /구매 링크/);
});
