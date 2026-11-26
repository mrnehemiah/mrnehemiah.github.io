import test from "node:test";
import assert from "node:assert/strict";

import { answerZuneKnowledge, getZuneKnowledgeTopics } from "../zune-knowledge.js";
import { expandSwahiliTokens, getSwahiliSearchTokens, normalizeSwahiliQuery } from "../swahili-language.js";
import { createSmallTalkResponder } from "../small-talk.js";

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


test("Kiswahili casual greetings accept common multi-word variations", () => {
  const reply = createSmallTalkResponder(() => "sw");
  assert.match(reply("Mambo vipi?"), /Poa kabisa|Salama kabisa|Niko fresh/);
  assert.match(reply("Poa tu"), /Poa kabisa|Salama kabisa|Niko fresh/);
});

test("Kiswahili thanks and afternoon greetings are recognized naturally", () => {
  const reply = createSmallTalkResponder(() => "sw");
  assert.match(reply("Asante sana"), /Karibu sana|Usijali kabisa/);
  assert.match(reply("Habari za mchana"), /Habari za mchana/);
});

test("English casual greetings, thanks and goodbyes accept common variations", () => {
  const reply = createSmallTalkResponder(() => "en");
  assert.match(reply("What's up?"), /Doing great|All good/);
  assert.match(reply("Thanks a lot"), /very welcome|Anytime/);
  assert.match(reply("See you later"), /Goodbye|Take care/);
});

test("small-talk matching does not capture Marketplace search requests", () => {
  const reply = createSmallTalkResponder(() => "sw");
  assert.equal(reply("Natafuta simu"), null);
  assert.equal(reply("Nataka kufuatilia oda yangu"), null);
});
