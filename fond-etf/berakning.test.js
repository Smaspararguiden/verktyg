import { test } from "node:test";
import assert from "node:assert/strict";

import { parametrar } from "./parametrar.js";
import { berakna, brytpunkt, courtage, engangskostnader } from "./berakning.js";

const narall = (a, b, tolerans = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tolerans, `${a} är inte nära ${b}`);

const klass = (id) => parametrar.courtageklasser.varde.find((k) => k.id === id);

// 100 000 kr in Avanza Mini, traded in a foreign currency.
const grund = (andra = {}) => ({
  belopp: 100000,
  fondAvgift: 0.002,
  etfAvgift: 0.0007,
  courtage: klass("avanza-mini"),
  spread: 0.002,
  valutavaxling: 0.0025,
  handlasISek: false,
  ...andra,
});

test("courtage: procent av beloppet, men minst minimiavgiften", () => {
  narall(courtage(klass("avanza-small"), 100000), 150);
  assert.equal(courtage(klass("avanza-small"), 10000), 39);
  // A flat fee is procent 0 with the fee as minimum.
  assert.equal(courtage(klass("nordnet-fast"), 1000000), 99);
  narall(courtage(klass("avanza-fast"), 1000000), 450);
});

test("engångskostnader: courtage och växling vid köp och sälj, halva spreaden vid varje", () => {
  const e = engangskostnader(grund());
  narall(e.courtageKop, 250);
  narall(e.courtageSalj, 250);
  narall(e.spreadKop, 100);
  narall(e.spreadSalj, 100);
  narall(e.vaxlingKop, 250);
  narall(e.vaxlingSalj, 250);
  narall(e.totalt, 1200);
});

test("handlas i SEK: ingen valutaväxling", () => {
  const e = engangskostnader(grund({ handlasISek: true }));
  assert.equal(e.vaxlingKop, 0);
  assert.equal(e.vaxlingSalj, 0);
  narall(e.totalt, 700);
});

test("genomsnittlig årlig kostnad: engångskostnaderna slås ut över åren", () => {
  const { ar } = berakna(parametrar, grund());
  assert.equal(ar.length, parametrar.antalAr.varde);
  narall(ar[0].etf, 0.0007 + 1200 / 100000);
  narall(ar[9].etf, 0.0007 + 1200 / 100000 / 10);
  narall(ar[9].etfKronor, 70 * 10 + 1200);
  // The fund costs its fee every year, whatever the horizon.
  for (const r of ar) narall(r.fond, 0.002);
  narall(ar[29].fondKronor, 200 * 30);
});

test("brytpunkt: första hela året då ETF:en är billigast", () => {
  // 1 200 kr in one-time costs, 130 kr saved per year: 9.2 years.
  assert.equal(berakna(parametrar, grund()).brytpunkt, 10);
  const r = berakna(parametrar, grund()).ar;
  assert.ok(r[8].etf > r[8].fond);
  assert.ok(r[9].etf <= r[9].fond);
});

test("brytpunkt: exakt på ett helt år räknas det året", () => {
  // 65 kr courtage twice is 130 kr, exactly one year of savings.
  const indata = grund({ courtage: { procent: 0, minimum: 65 }, spread: 0, handlasISek: true });
  assert.equal(berakna(parametrar, indata).brytpunkt, 1);
});

test("brytpunkt: aldrig om ETF:en har samma eller högre avgift", () => {
  assert.equal(brytpunkt(grund({ etfAvgift: 0.003 }), 1200), null);
  assert.equal(brytpunkt(grund({ etfAvgift: 0.002 }), 1200), null);
  assert.equal(brytpunkt(grund({ etfAvgift: 0.002 }), 0), 1);
});

test("parameterfilen: standardklassen finns och varje klass är rimlig", () => {
  assert.ok(klass(parametrar.standardCourtage.varde));
  const id = new Set();
  for (const k of parametrar.courtageklasser.varde) {
    assert.ok(!id.has(k.id), `${k.id} finns två gånger`);
    id.add(k.id);
    assert.ok(k.procent >= 0 && k.procent < 0.01, k.id);
    assert.ok(k.minimum >= 0, k.id);
  }
  for (const post of Object.values(parametrar)) {
    assert.ok(post.beskrivning && post.kalla, "varje värde har beskrivning och källa");
  }
});
