import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { matvarden, tusental } from "./matning.js";
import { berakna } from "./berakning.js";
import { parametrar } from "./parametrar.js";

const kapital = { obligatoriskTrad: 200000, flyttbarTrad: 100000, flyttbarFond: 100000 };
const indata = { alder: 38, manadslon: 70000, kapital, andelPremieFond: 0.25 };
const grund = {
  r: berakna(parametrar, indata),
  indata,
  fodelsear: 1988,
  lage: "delar",
  itp1Nu: true,
  itp1Tidigare: null,
  forsakringar: [{ belopp: 300000, sparform: "trad" }, { belopp: 100000, sparform: "fond" }],
  vard: "www.smaspararguiden.se",
  version: "1762520000",
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

test("det som inte frågats efter eller visats skickas inte", () => {
  const utan = { ...indata, kapital: { obligatoriskTrad: 0, flyttbarTrad: 0, flyttbarFond: 0 }, andelPremieFond: null };
  const r = { ...berakna(parametrar, utan), trafikljus: null, andelUppnadd: null, privatFlytt: null, privatUtanRegeln: null };
  const v = matvarden({ ...grund, r, indata: utan, lage: "ingen", forsakringar: [], version: null });
  for (const namn of ["version", "andel_fond", "kapital_trad", "kapital_fond", "forsakringar",
    "andel_uppnadd", "spara_flytt", "spara_utan_regeln"]) {
    assert.ok(!(namn in v), namn);
  }
  assert.equal(v.trafikljus, "inget");
});

// The page and the receiver are written apart, so a real result goes through
// the receiver's own checks here.
test("mottagaren godtar det sidan skickar", () => {
  const kod = readFileSync(new URL("../apps-script/itp-resultat.gs", import.meta.url), "utf8");
  const miljo = {};
  vm.runInNewContext(kod, miljo);
  const fall = [
    grund,
    { ...grund, itp1Tidigare: true, itp1Nu: false, version: null },
    { ...grund, vard: "localhost", lage: "trad", forsakringar: [] },
  ];
  for (const f of fall) {
    assert.ok(miljo.tillRad(JSON.parse(JSON.stringify(matvarden(f))), "2026-11-07"), f.lage);
  }
});
