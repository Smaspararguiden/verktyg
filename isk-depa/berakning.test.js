import { test } from "node:test";
import assert from "node:assert/strict";

import { parametrar } from "./parametrar.js";
import {
  aktieandelSammaRisk, berakna, depaSkattVidForsaljning, iskSkatt, manadsranta,
  schablonranta, simulera,
} from "./berakning.js";

const narall = (a, b, tolerans = 0.01) =>
  assert.ok(Math.abs(a - b) <= tolerans, `${a} är inte nära ${b}`);

// Input without interest, fund tax or tax-free amount unless a test adds them.
const grund = (andra = {}) => ({
  startbelopp: 100000,
  manadssparande: 0,
  statslanerantan: 0.0255,
  kontoranta: 0,
  statensAndelAvForlust: 0.21,
  aktieandelIsk: 0.7,
  medFribelopp: false,
  fonder: false,
  ...andra,
});

const ettAr = (r) => ({ namn: "test", forstaAret: r, ovrigaAr: r });

// Parameters without ISK tax, for tests of everything else. The input must
// also have statslanerantan 0.
function utanIskSkatt() {
  const p = structuredClone(parametrar);
  p.schablonGolv.varde = 0;
  p.schablonPaslag.varde = 0;
  return p;
}

test("ISK-skatten stämmer med Handelsbankens och Rika tillsammans exempel", () => {
  // 500 000 kr capital base, 300 000 kr tax free.
  narall(iskSkatt(parametrar, 500000, 0.0255, 300000), 2130);
  narall(iskSkatt(parametrar, 500000, 0.0309, 300000), 2454);
  narall(iskSkatt(parametrar, 1000000, 0.0255, 300000), 7455);
});

test("schablonräntan har ett golv och ingen skatt under fribeloppet", () => {
  assert.equal(schablonranta(parametrar, 0), 0.0125);
  narall(schablonranta(parametrar, 0.0255), 0.0355, 1e-12);
  assert.equal(iskSkatt(parametrar, 250000, 0.0255, 300000), 0);
});

test("kapitalunderlaget är kvartalsvärdena plus insättningar, delat med fyra", () => {
  const rader = simulera(parametrar, grund({ startbelopp: 0, manadssparande: 1000 }), ettAr(0), 1, 1, 1);
  // Quarter values 0, 3 000, 6 000, 9 000 plus 12 000 deposited.
  narall(rader[0].kapitalunderlag, 7500);
});

test("ISK ett år: kvartalsvärden med månadsavkastning och skatt i slutet", () => {
  const r = 0.08;
  const rader = simulera(parametrar, grund(), ettAr(r), 1, 1, 1);
  const kvartal = [0, 3, 6, 9].reduce((sum, m) => sum + 100000 * Math.pow(1 + r, m / 12), 0);
  const skatt = (kvartal / 4) * 0.0355 * 0.3;
  narall(rader[0].iskTotalt, 108000 - skatt);
});

test("depå ett år: 30 % på vinsten, och fondskatten på värdet 1 januari", () => {
  const utanFond = simulera(parametrar, grund(), ettAr(0.1), 1, 1, 1);
  narall(utanFond[0].depaTotalt, 107000);
  const medFond = simulera(parametrar, grund({ fonder: true }), ettAr(0), 1, 1, 1);
  narall(medFond[0].fondskatt, 120);
  // The fund tax lowers the value below cost, so the sale gives a small refund.
  narall(medFond[0].depaTotalt, 100000 - 120 + 120 * 0.21);
});

test("förlust på depån: staten står för den valda andelen", () => {
  narall(depaSkattVidForsaljning(parametrar, 50000, 100000, 0.21), -10500);
  const rader = simulera(parametrar, grund(), ettAr(-0.5), 1, 1, 1);
  narall(rader[0].depaTotalt, 60500);
});

test("sparkontot: räntan beskattas med 30 % varje år", () => {
  const rader = simulera(parametrar, grund({ kontoranta: 0.02 }), ettAr(0), 2, 0, 0);
  narall(rader[0].kontoIsk, 101400);
  narall(rader[1].kontoDepa, 101400 * 1.014);
});

test("aktieandel för samma risk: delas med det som sparen själv bär", () => {
  const a = aktieandelSammaRisk(0.7, 0.21);
  narall(a.andel, 0.7 / 0.79, 1e-12);
  assert.equal(a.begransad, false);
  assert.deepEqual(aktieandelSammaRisk(1, 0.21), { andel: 1, begransad: true });
});

test("samma risk: efter en krasch förlorar båda lika mycket", () => {
  // Without ISK tax, interest and fund tax, the depå with 70 / 0.7 = 100 %
  // equities must end exactly where the ISK with 70 % does.
  const p = utanIskSkatt();
  const indata = grund({ statslanerantan: 0, statensAndelAvForlust: 0.3, aktieandelIsk: 0.7 });
  const r = berakna(p, indata);
  const krasch = r.sammaRisk.scenarier.find((s) => s.namn === "Krasch år 1");
  narall(r.sammaRisk.andelDepa, 1, 1e-12);
  narall(krasch.ar[0].iskTotalt, 65000);
  narall(krasch.ar[0].depaTotalt, 65000);
});

test("utan skatter på ISK och utan avkastning blir allt lika", () => {
  const p = utanIskSkatt();
  const r = berakna(p, grund({ statslanerantan: 0, manadssparande: 500 }));
  const noll = r.sammaPengar.scenarier.find((s) => s.namn === "Nominellt noll");
  for (const h of noll.horisonter) {
    narall(h.isk, h.depa);
    narall(h.isk, 100000 + 500 * 12 * h.ar);
  }
});

test("berakna ger varje horisont för varje scenario", () => {
  const r = berakna(parametrar, grund());
  assert.equal(r.sammaPengar.scenarier.length, parametrar.scenarier.varde.length);
  for (const s of r.sammaRisk.scenarier) {
    assert.deepEqual(s.horisonter.map((h) => h.ar), parametrar.horisonter.varde);
  }
});

test("månadsräntan blir årsräntan efter tolv månader", () => {
  narall(Math.pow(1 + manadsranta(0.08), 12), 1.08, 1e-12);
  narall(Math.pow(1 + manadsranta(-0.5), 12), 0.5, 1e-12);
});
