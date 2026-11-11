import { test } from "node:test";
import assert from "node:assert/strict";
import { AMNE, mejl } from "./facket.js";
import { berakna, delaUppKapital } from "./berakning.js";
import { parametrar as p } from "./parametrar.js";

// No salary, 400 000 kr all in trad, 38 years old.
const r = berakna(p, { alder: 38, manadslon: 0, kapital: delaUppKapital(p, 400000, 0), andelPremieFond: null });
// Thin spaces in Swedish numbers are no-break spaces.
const utanHardaMellanslag = (s) => s.replace(/ /g, " ");

test("mejlet har ämnet och användarens belopp, avrundade som på sidan", () => {
  const { amne, text } = mejl(r);
  assert.equal(amne, AMNE);
  const kostnad = Math.round(r.kostnadRegeln / 1000) * 1000;
  assert.ok(utanHardaMellanslag(text).includes(`${kostnad.toLocaleString("sv-SE").replace(/ /g, " ")} kr mindre`));
});

test("månadsbeloppet är det regeln ensam kostar", () => {
  const manad = Math.round((r.privatUtanRegeln - r.privatFlytt) / 10) * 10;
  assert.ok(utanHardaMellanslag(mejl(r).text).includes(`spara ${manad} kr varje månad`));
});

test("utan sparjämförelse står inget månadsbelopp", () => {
  const { text } = mejl({ ...r, privatFlytt: null, privatUtanRegeln: null });
  assert.ok(!text.includes("varje månad"));
  assert.ok(text.includes("mindre i pensionskapital."));
});

test("bara namnet är kvar att fylla i", () => {
  const { text } = mejl(r);
  assert.deepEqual(text.match(/\[[^\]]*\]/g), ["[Namn]"]);
  assert.ok(text.startsWith("Hej,"));
});
