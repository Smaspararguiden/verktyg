import { test } from "node:test";
import assert from "node:assert/strict";

import { parametrar } from "./parametrar.js";
import {
  aktieandelSammaRisk, berakna, dagensPengar, depaSkattVidForsaljning, egenBerakning,
  iskSkatt, manadsfaktorEfterAvgift, manadsranta,
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
  avgift: 0,
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

test("kapitalunderlaget är ISK:ns värde 1 januari, utan årets insättningar", () => {
  const rader = simulera(parametrar, grund({ startbelopp: 0, manadssparande: 1000 }), ettAr(0), 2, 1, 1);
  assert.equal(rader[0].kapitalunderlag, 0);
  narall(rader[1].kapitalunderlag, 12000);
});

test("ISK ett år: skatten på värdet 1 januari dras i slutet av året", () => {
  const rader = simulera(parametrar, grund(), ettAr(0.08), 1, 1, 1);
  narall(rader[0].iskTotalt, 108000 - 100000 * 0.0355 * 0.3);
});

test("Andreas kontrollark: 1 000 000 kr, fribelopp och 8 % ger 7 455 kr i ISK-skatt", () => {
  const rader = simulera(parametrar, grund({ startbelopp: 1000000, medFribelopp: true }), ettAr(0.08), 1, 1, 1);
  narall(rader[0].iskSkatt, 7455);
  narall(rader[0].iskTotalt, 1072545);
});

test("fondens avgift dras från aktierna på båda kontona, inte från sparkontot", () => {
  const indata = grund({ statslanerantan: 0, avgift: 0.001, kontoranta: 0.02 });
  const rader = simulera(utanIskSkatt(), indata, ettAr(0.08), 1, 0.5, 0.5);
  // A year at 8 % with 0.1 % fee: 50 000 × 1.08 × 0.999. Account: 2 % taxed at 30 %.
  const aktier = 50000 * 1.08 * 0.999;
  const konto = 50000 * (1 + 0.02 * 0.7);
  narall(rader[0].iskTotalt, aktier + konto);
  narall(rader[0].depa, aktier);
  narall(manadsfaktorEfterAvgift(0.001) ** 12, 0.999, 1e-12);
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

// Cases read from Rika tillsammans' ISK/KF/AF calculator on 2026-11-25
// (rikatillsammans.se/verktyg/isk-kf-af-jamfor/), with its defaults:
// government bond rate 2.55 %, tax-free amount, 7 % return, 30 % on gains.
// Rika compounds 7 %/12 each month, which is about 7.23 % a year in our terms.
const rikasAvkastning = Math.pow(1 + 0.07 / 12, 12) - 1;
const rika = (andra) => grund({ statensAndelAvForlust: 0.3, medFribelopp: true, ...andra });

test("Rika tillsammans: ISK blir något högre hos oss, under 1 %", () => {
  // Rika uses Skatteverket's quarterly capital base; we tax only the value on
  // 1 January (DECISIONS.md 41), which leaves the ISK slightly higher. With
  // the quarterly base the two matched to the krona (checked 2026-11-25).
  for (const [indata, ar, rikasVarde] of [
    [rika({ manadssparande: 1000 }), 10, 374257],
    [rika({ startbelopp: 1000000 }), 30, 6226676],
  ]) {
    const isk = simulera(parametrar, indata, ettAr(rikasAvkastning), ar, 1, 1).at(-1).iskTotalt;
    assert.ok(isk > rikasVarde && isk < rikasVarde * 1.01, `${isk} mot Rikas ${rikasVarde}`);
  }
});

test("Rika tillsammans: depån utan fondskatt blir exakt lika", () => {
  // Rika's result with the annual AF tax set to 0.
  const rader = simulera(parametrar, rika({ manadssparande: 1000 }), ettAr(rikasAvkastning), 10, 1, 1);
  narall(rader.at(-1).depaTotalt, 328542, 1);
});

test("Rika tillsammans: med fondskatt blir depån något högre hos oss", () => {
  // Rika taxes the full growth at sale as if the fund tax had never been paid;
  // we tax the gain on what is left in the account. The gap stays below 1 %.
  for (const [indata, ar, rikasVarde] of [
    [rika({ manadssparande: 1000, fonder: true }), 10, 325541],
    [rika({ startbelopp: 1000000, fonder: true }), 30, 5759185],
  ]) {
    const depa = simulera(parametrar, indata, ettAr(rikasAvkastning), ar, 1, 1).at(-1).depaTotalt;
    assert.ok(depa > rikasVarde && depa < rikasVarde * 1.01, `${depa} mot Rikas ${rikasVarde}`);
  }
});

test("dagens pengar: 2 % inflation per år räknas bort", () => {
  narall(dagensPengar(parametrar, 102000, 1), 100000);
  narall(dagensPengar(parametrar, 100000 * 1.02 ** 30, 30), 100000);
  assert.equal(dagensPengar(parametrar, 5000, 0), 5000);
});

test("egen beräkning: egna andelar och avkastning, och värdet i dagens pengar", () => {
  const indata = grund({ statslanerantan: 0 });
  const rader = egenBerakning(utanIskSkatt(), indata,
    { forstaAret: -0.5, ovrigaAr: 0.1, antalAr: 3, andelIsk: 0.5, andelDepa: 0.8 });
  assert.equal(rader.length, 3);
  // Same as simulera with that scenario and those shares.
  const direkt = simulera(utanIskSkatt(), indata, { forstaAret: -0.5, ovrigaAr: 0.1 }, 3, 0.5, 0.8);
  narall(rader[2].iskTotalt, direkt[2].iskTotalt);
  narall(rader[2].depaTotalt, direkt[2].depaTotalt);
  // Year 1: half the ISK money halves, the other half stays on the account.
  narall(rader[0].iskTotalt, 75000);
  narall(rader[0].iskIDagensPengar, 75000 / 1.02);
  narall(rader[2].depaIDagensPengar, rader[2].depaTotalt / 1.02 ** 3);
});
