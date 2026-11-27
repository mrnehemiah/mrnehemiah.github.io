import test from "node:test";
import assert from "node:assert/strict";

import { answerZuneKnowledge, getZuneKnowledgeTopics } from "../zune-knowledge.js";
import { expandSwahiliTokens, getSwahiliSearchTokens, normalizeSwahiliQuery } from "../swahili-language.js";
import { countLoadedBrands, getRecommendationTokens, rankRecommendationProducts, resolveRecommendationQuery } from "../assistant-recommendations.js";

test("the knowledge catalogue includes the core Marketplace workflows", () => {
  const topics = new Set(getZuneKnowledgeTopics("sw").map(item => item.topic));
  for (const topic of [
    "marketplace", "products", "categories", "brands", "orders", "payments",
    "delivery", "wallet", "withdrawals", "returns", "support-tickets", "reels"
  ]) {
    assert.ok(topics.has(topic), `missing knowledge topic: ${topic}`);
  }
});

test("Kiswahili normalization and common verb forms remain searchable", () => {
  assert.equal(normalizeSwahiliQuery("HABARI za asubuhi!"), "habari za asubuhi");
  assert.ok(expandSwahiliTokens("nimenunua").includes("nunua"));
  assert.deepEqual(getSwahiliSearchTokens("nimenunua simu"), ["nunua", "simu"]);
});

test("refund and cancellation questions outrank generic order wording", () => {
  assert.equal(answerZuneKnowledge("Nataka kurejesha oda", "sw")?.topic, "returns");
  assert.equal(answerZuneKnowledge("Cancel my order", "en")?.topic, "returns");
});

test("checkout questions outrank generic order wording", () => {
  assert.equal(answerZuneKnowledge("Nataka kulipia oda", "sw")?.topic, "checkout");
  assert.equal(answerZuneKnowledge("How do I pay for my order?", "en")?.topic, "checkout");
});

test("a new 'show me' request is not mistaken for a follow-up because it contains 'how'", () => {
  assert.equal(answerZuneKnowledge("Show me products", "en", "wallet")?.topic, "products");
  assert.equal(answerZuneKnowledge("How does it work?", "en", "wallet")?.topic, "wallet");
});

test("known Marketplace topics route in both languages and unknown text stays unmatched", () => {
  assert.equal(answerZuneKnowledge("ZUNE Reels ni nini?", "sw")?.topic, "reels");
  assert.equal(answerZuneKnowledge("How do I track my order?", "en")?.topic, "orders");
  assert.equal(answerZuneKnowledge("Oda yangu iko wapi?", "sw")?.topic, "orders");
  assert.equal(answerZuneKnowledge("zxqv blorpt", "sw"), null);
});

test("recommendation requests prefer an explicit product subject and otherwise use context", () => {
  assert.equal(resolveRecommendationQuery("Nipe mapendekezo ya simu", "viatu", "", normalizeSwahiliQuery), "ya simu");
  assert.equal(resolveRecommendationQuery("Nipe mapendekezo", "simu", "", normalizeSwahiliQuery), "simu");
  assert.equal(resolveRecommendationQuery("Nipe mapendekezo", "", "", normalizeSwahiliQuery), "");
});

test("recommendations expand Kiswahili synonyms and include brand fields", () => {
  const phoneTokens = getRecommendationTokens("simu", expandSwahiliTokens);
  const phoneResults = rankRecommendationProducts([
    { title: "Android Smartphone", stock_quantity: 3 },
    { title: "Leather Shoes", brand: "Nike", stock_quantity: 12 }
  ], phoneTokens, normalizeSwahiliQuery);
  assert.deepEqual(phoneResults.map(product => product.title), ["Android Smartphone"]);

  const brandTokens = getRecommendationTokens("Nike", expandSwahiliTokens);
  const brandResults = rankRecommendationProducts([
    { title: "Running Shoes", brand_name: "Nike", stock_quantity: 2 },
    { title: "Running Shoes", brand_name: "Adidas", stock_quantity: 20 }
  ], brandTokens, normalizeSwahiliQuery);
  assert.equal(brandResults.length, 1);
  assert.equal(brandResults[0].brand_name, "Nike");
});

test("recommendations do not show unrelated stock-only products or default to an empty query", () => {
  const tokens = getRecommendationTokens("simu", expandSwahiliTokens);
  assert.deepEqual(rankRecommendationProducts([
    { title: "Leather Shoes", stock_quantity: 100 }
  ], tokens, normalizeSwahiliQuery), []);
  assert.deepEqual(rankRecommendationProducts([
    { title: "Leather Shoes", stock_quantity: 100 }
  ], [], normalizeSwahiliQuery), []);
});

test("loaded brand count is distinct and supports both product field names", () => {
  assert.equal(countLoadedBrands([
    { brand: "Apple" },
    { brand_name: "apple" },
    { brand_name: "Nike" },
    { title: "Unbranded item" }
  ]), 2);
});
