import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { matvarden, nyKod, tusental } from "./matning.js";
import { berakna } from "./berakning.js";
import { parametrar } from "./parametrar.js";

const kapital = { obligatoriskTrad: 200000, flyttbarTrad: 100000, flyttbarFond: 100000 };
const indata = { alder: 38, manadslon: 70000, kapital, andelPremieFond: 0.25 };
const grund = {
  r: berakna(parametrar, indata),
  fodelsear: 1988,
  alder: 38,
  manadslon: 70000,
  kapital,
  andelPremieFond: 0.25,
  lage: "delar",
  itp1Nu: true,
  itp1Tidigare: null,
  forsakringar: [{ belopp: 300000, sparform: "trad" }, { belopp: 100000, sparform: "fond" }],
  vard: "www.smaspararguiden.se",
  version: "1762520000",
  kod: "0123456789abcdef0123456789abcdef",
};
// A page view where only the birth year is filled in so far.
const paborjad = {
  ...grund, r: null, manadslon: null, kapital: null, andelPremieFond: null, lage: "trad", forsakringar: [],
};

test("det besökaren fyllt i följer med", () => {
  const v = matvarden(grund);
  assert.equal(v.fodelsear, 1988);
  assert.equal(v.alder, 38);
  assert.equal(v.manadslon, 70000);
  assert.equal(v.andel_fond, 25);
  assert.equal(v.kapital_trad, 300000);
  assert.equal(v.kapital_fond, 100000);
  assert.equal(v.forsakringar, "300000:trad|100000:fond");
  assert.equal(v.itp1_nu, "ja");
  assert.equal(v.resultat, "ja");
  assert.equal(v.kod, grund.kod);
  assert.ok(!("itp1_tidigare" in v));
});

test("beloppen avrundas som på sidan", () => {
  const v = matvarden(grund);
  assert.equal(v.vinst, tusental(grund.r.vinstFlytt));
  assert.equal(v.slut_nuvarande, tusental(grund.r.scenarier.nuvarande.slutkapital));
  assert.equal(v.spara_flytt % 10, 0);
  assert.equal(tusental(1499), 1000);
});

test("bara den riktiga sajten räknas som sajt", () => {
  assert.equal(matvarden(grund).kalla, "sajt");
  assert.equal(matvarden({ ...grund, vard: "localhost" }).kalla, "test");
});

test("en påbörjad sidvisning skickar det som är ifyllt och inget resultat", () => {
  const v = matvarden(paborjad);
  assert.equal(v.resultat, "nej");
  assert.equal(v.fodelsear, 1988);
  for (const namn of ["manadslon", "andel_fond", "kapital_trad", "forsakringar", "vinst", "trafikljus"]) {
    assert.ok(!(namn in v), namn);
  }
});

test("det som inte frågats efter eller visats skickas inte", () => {
  const utan = { obligatoriskTrad: 0, flyttbarTrad: 0, flyttbarFond: 0 };
  const r = {
    ...berakna(parametrar, { ...indata, kapital: utan, andelPremieFond: null }),
    trafikljus: null, andelUppnadd: null, privatFlytt: null, privatUtanRegeln: null,
  };
  const v = matvarden({
    ...grund, r, kapital: utan, andelPremieFond: null, lage: "ingen", forsakringar: [], version: null,
  });
  for (const namn of ["version", "andel_fond", "kapital_trad", "kapital_fond", "forsakringar",
    "andel_uppnadd", "spara_flytt", "spara_utan_regeln"]) {
    assert.ok(!(namn in v), namn);
  }
  assert.equal(v.trafikljus, "inget");
});

test("koden är 32 slumpade hexadecimala tecken", () => {
  const a = nyKod();
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.notEqual(a, nyKod());
});

// The page and the receiver are written apart, so real page views go through
// the receiver's own checks here, and nothing is left empty by them.
test("mottagaren godtar allt sidan skickar", () => {
  const kod = readFileSync(new URL("../apps-script/itp-resultat.gs", import.meta.url), "utf8");
  const miljo = {};
  vm.runInNewContext(kod, miljo);
  const rubriker = vm.runInNewContext("RUBRIKER", miljo);
  const fall = [
    grund,
    paborjad,
    { ...grund, itp1Tidigare: true, itp1Nu: false, version: null, kod: nyKod() },
    { ...grund, vard: "localhost", lage: "trad", forsakringar: [] },
  ];
  for (const f of fall) {
    const v = JSON.parse(JSON.stringify(matvarden(f)));
    const rad = miljo.tillRad(v, "2026-11-09");
    assert.ok(rad, f.lage);
    for (const [namn, varde] of Object.entries(v)) assert.equal(rad[rubriker.indexOf(namn)], varde, namn);
  }
});
