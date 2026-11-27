import { test } from "node:test";
import assert from "node:assert/strict";

import { parametrar } from "./parametrar.js";
import {
  aktieandelSammaRisk, berakna, dagensPengar, depaSkattVidForsaljning, egenBerakning,
  forstaAretDepaBattre,
  iskSkatt, manadsfaktorEfterAvgift, manadsranta,
  simulera,
} from "./berakning.js";

const narall = (a, b, tolerans = 0.01) =>
  assert.ok(Math.abs(a - b) <= tolerans, `${a} är inte nära ${b}`);

// Input without interest, fund tax or tax-free amount unless a test adds them.
const grund = (andra = {}) => ({
  startbelopp: 100000,
  manadssparande: 0,
  // The 2026 ISK tax, which the checked cases below were read with.
  iskSkattesats: 0.01065,
  kontoranta: 0,
  avgift: 0,
  iskSkattKvartal: false,
  avgiftManadsvis: false,
  statensAndelAvForlust: 0.21,
  aktieandelIsk: 0.7,
  medFribelopp: false,
  fonder: false,
  ...andra,
});

const ettAr = (r) => ({ namn: "test", forstaAret: r, ovrigaAr: r });


test("ISK-skatten stämmer med Handelsbankens och Rika tillsammans exempel", () => {
  // 500 000 kr capital base, 300 000 kr tax free.
  // 1.065 % is 2026 (bond rate 2.55 %), 1.227 % a bond rate of 3.09 %.
  narall(iskSkatt(500000, 0.01065, 300000), 2130);
  narall(iskSkatt(500000, 0.01227, 300000), 2454);
  narall(iskSkatt(1000000, 0.01065, 300000), 7455);
});

test("ingen ISK-skatt under fribeloppet, och parameterns värde är 2027 års skatt", () => {
  assert.equal(iskSkatt(250000, 0.01164, 300000), 0);
  assert.equal(parametrar.iskSkattesats.varde, 0.01164);
});

test("kapitalunderlaget är ISK:ns värde 1 januari, utan årets insättningar", () => {
  const rader = simulera(parametrar, grund({ startbelopp: 0, manadssparande: 1000 }), ettAr(0), 2, 1, 1);
  assert.equal(rader[0].kapitalunderlag, 0);
  narall(rader[1].kapitalunderlag, 12000);
});

test("ISK ett år: skatten på värdet 1 januari dras i slutet av året", () => {
  const rader = simulera(parametrar, grund(), ettAr(0.08), 1, 1, 1);
  narall(rader[0].iskTotalt, 108000 - 100000 * 0.01065);
});

test("Andreas kontrollark: 1 000 000 kr, fribelopp, 8 % och 0,1 % avgift", () => {
  const indata = grund({ startbelopp: 1000000, medFribelopp: true, avgift: 0.001 });
  const rader = simulera(parametrar, indata, ettAr(0.08), 1, 1, 1);
  narall(rader[0].iskSkatt, 7455);
  narall(rader[0].iskTotalt, 1071545);
  narall(rader[0].depa, 1079000);
  narall(rader[0].depaTotalt, 1055300);
});

test("fondens avgift dras på värdet 1 januari från aktierna, inte från sparkontot", () => {
  const indata = grund({ iskSkattesats: 0, avgift: 0.001, kontoranta: 0.02 });
  const rader = simulera(parametrar, indata, ettAr(0.08), 1, 0.5, 0.5);
  // 50 000 kr in equities grows 8 %, less 0.1 % of 50 000. Account: 2 % taxed at 30 %.
  const aktier = 50000 * 1.08 - 50;
  const konto = 50000 * (1 + 0.02 * 0.7);
  narall(rader[0].avgiftIsk, 50);
  narall(rader[0].iskTotalt, aktier + konto);
  narall(rader[0].depa, aktier);
});

test("exakt avgift: dras varje månad på det aktuella värdet", () => {
  const indata = grund({ iskSkattesats: 0, avgift: 0.001, avgiftManadsvis: true });
  const rader = simulera(parametrar, indata, ettAr(0.08), 1, 1, 1);
  narall(rader[0].avgiftIsk, 0);
  narall(rader[0].iskTotalt, 100000 * 1.08 * 0.999);
  narall(manadsfaktorEfterAvgift(0.001) ** 12, 0.999, 1e-12);
});

test("exakt ISK-skatt: kvartalsvärdena plus insättningar, delat med fyra", () => {
  const sparande = simulera(parametrar, grund({ startbelopp: 0, manadssparande: 1000, iskSkattKvartal: true }), ettAr(0), 1, 1, 1);
  // Quarter values 0, 3 000, 6 000, 9 000 plus 12 000 deposited.
  narall(sparande[0].kapitalunderlag, 7500);
  const r = 0.08;
  const rader = simulera(parametrar, grund({ iskSkattKvartal: true }), ettAr(r), 1, 1, 1);
  const kvartal = [0, 3, 6, 9].reduce((sum, m) => sum + 100000 * Math.pow(1 + r, m / 12), 0);
  narall(rader[0].iskTotalt, 108000 - (kvartal / 4) * 0.01065);
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
  const p = parametrar;
  const indata = grund({ iskSkattesats: 0, statensAndelAvForlust: 0.3, aktieandelIsk: 0.7 });
  const r = berakna(p, indata);
  const krasch = r.sammaRisk.scenarier.find((s) => s.namn === "Krasch år 1");
  narall(r.sammaRisk.andelDepa, 1, 1e-12);
  narall(krasch.ar[0].iskTotalt, 65000);
  narall(krasch.ar[0].depaTotalt, 65000);
});

test("utan skatter på ISK och utan avkastning blir allt lika", () => {
  const p = parametrar;
  const r = berakna(p, grund({ iskSkattesats: 0, manadssparande: 500 }));
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

test("Rika tillsammans: med exakt ISK-skatt blir ISK lika på kronan", () => {
  for (const [indata, ar, rikasVarde] of [
    [rika({ manadssparande: 1000, iskSkattKvartal: true }), 10, 374257],
    [rika({ startbelopp: 1000000, iskSkattKvartal: true }), 30, 6226676],
  ]) {
    narall(simulera(parametrar, indata, ettAr(rikasAvkastning), ar, 1, 1).at(-1).iskTotalt, rikasVarde, 1);
  }
});

test("Rika tillsammans: med enkel ISK-skatt blir ISK något högre hos oss, under 1 %", () => {
  // Rika uses Skatteverket's quarterly capital base; the simple way taxes only
  // the value on 1 January, which leaves the ISK slightly higher.
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
  const indata = grund({ iskSkattesats: 0 });
  const rader = egenBerakning(parametrar, indata,
    { forstaAret: -0.5, ovrigaAr: 0.1, antalAr: 3, andelIsk: 0.5, andelDepa: 0.8 });
  assert.equal(rader.length, 3);
  // Same as simulera with that scenario and those shares.
  const direkt = simulera(parametrar, indata, { forstaAret: -0.5, ovrigaAr: 0.1 }, 3, 0.5, 0.8);
  narall(rader[2].iskTotalt, direkt[2].iskTotalt);
  narall(rader[2].depaTotalt, direkt[2].depaTotalt);
  // Year 1: half the ISK money halves, the other half stays on the account.
  narall(rader[0].iskTotalt, 75000);
  narall(rader[0].iskIDagensPengar, 75000 / 1.02);
  narall(rader[2].depaIDagensPengar, rader[2].depaTotalt / 1.02 ** 3);
});

test("första året depån ger mer än ISK", () => {
  const rad = (ar, iskTotalt, depaTotalt) => ({ ar, iskTotalt, depaTotalt });
  assert.equal(forstaAretDepaBattre([rad(1, 100, 99), rad(2, 101, 102), rad(3, 103, 104)]), 2);
  assert.equal(forstaAretDepaBattre([rad(1, 100, 101)]), 1);
  assert.equal(forstaAretDepaBattre([rad(1, 100, 100), rad(2, 101, 100)]), null);
});
