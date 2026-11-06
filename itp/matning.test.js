import { test } from "node:test";
import assert from "node:assert/strict";
import { aldersgrupp, matvarden, tusental } from "./matning.js";
import { berakna } from "./berakning.js";
import { parametrar } from "./parametrar.js";

const resultat = {
  vinstFlytt: 171499,
  kostnadRegeln: 171501,
  kvarAttHamta: 171499,
  trafikljus: "rod",
  privatFlytt: 214,
  privatUtanRegeln: 416,
};

test("åldersgrupperna byter vid rätt ålder", () => {
  const fall = [[29, "under 30"], [30, "30-39"], [39, "30-39"], [40, "40-49"],
    [49, "40-49"], [50, "50-54"], [54, "50-54"], [55, "55+"]];
  for (const [alder, grupp] of fall) assert.equal(aldersgrupp(alder), grupp);
});

test("beloppen avrundas som på sidan", () => {
  const v = matvarden(resultat, 38, "ingen");
  assert.equal(v.vinst, 171000);
  assert.equal(v.kostnad_regeln, 172000);
  assert.equal(v.spara_flytt, 210);
  assert.equal(v.spara_utan_regeln, 420);
  assert.equal(tusental(1499), 1000);
});

test("utan trafikljus och sparjämförelse skickas inget värde för dem", () => {
  const v = matvarden({ ...resultat, trafikljus: null, privatFlytt: null, privatUtanRegeln: null },
    38, "trad");
  assert.equal(v.trafikljus, "inget");
  assert.ok(!("spara_flytt" in v));
  assert.ok(!("spara_utan_regeln" in v));
});

test("ett riktigt resultat skickar bara de avsedda uppgifterna", () => {
  const kapital = { obligatoriskTrad: 200000, flyttbarTrad: 200000, flyttbarFond: 0 };
  const r = berakna(parametrar, { alder: 38, manadslon: 70000, kapital });
  const v = matvarden(r, 38, "trad");
  assert.deepEqual(Object.keys(v).sort(), ["aldersgrupp", "kapital", "kostnad_regeln",
    "kvar_att_hamta", "spara_flytt", "spara_utan_regeln", "trafikljus", "vinst"]);
  for (const namn of ["vinst", "kostnad_regeln", "kvar_att_hamta", "spara_flytt", "spara_utan_regeln"]) {
    assert.ok(Number.isFinite(v[namn]), namn);
  }
});
