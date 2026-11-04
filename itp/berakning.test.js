import { test } from "node:test";
import assert from "node:assert/strict";

import { parametrar } from "./parametrar.js";
import {
  aktieandel, arligAvgift, arsPremie, berakna, delaUppKapital, privatSparandePerManad,
  simuleraPrivat,
} from "./berakning.js";

// Deep copy of the parameters, so each test can change values freely.
const kopia = () => structuredClone(parametrar);

// Removes returns, fees and tax, so only the premiums remain.
function utanAvkastningAvgiftSkatt(p) {
  p.realAvkastningAktier.varde = 0;
  p.realAvkastningRantor.varde = 0;
  p.avkastningsskattPension.varde = 0;
  for (const produkt of Object.values(p.produkter)) {
    Object.assign(produkt.avgift, {
      procentAktiedel: 0, procentRantedel: 0, fastKr: 0, takKr: null, golvKr: null, procentUtanTak: 0,
    });
  }
  return p;
}

const narall = (a, b, tolerans = 0.01) =>
  assert.ok(Math.abs(a - b) <= tolerans, `${a} är inte nära ${b}`);

const passiv = { obligatoriskTrad: 100000, flyttbarTrad: 100000, flyttbarFond: 0 };

test("aktieandel per ålder interpoleras och är platt utanför punkterna", () => {
  const alecta = parametrar.produkter.alectaTrad;
  assert.equal(aktieandel(alecta, 30, 68), 0.70);
  narall(aktieandel(alecta, 62.5, 68), 0.60, 1e-9);
  assert.equal(aktieandel(alecta, 64, 68), 0.50);
  assert.equal(aktieandel(alecta, 67, 68), 0.40);
});

test("entrélösningens nedtrappning följer pensionsåldern", () => {
  const entre = parametrar.produkter.entrelosning;
  // Starts six years before pension and runs 20 years down to 25 %.
  assert.equal(aktieandel(entre, 62, 68), 1.0);
  narall(aktieandel(entre, 68, 68), 1 - 0.75 * 6 / 20, 1e-9);
  assert.equal(aktieandel(entre, 59, 65), 1.0);
  narall(aktieandel(entre, 65, 65), 1 - 0.75 * 6 / 20, 1e-9);
  assert.equal(aktieandel(entre, 90, 68), 0.25);
});

test("Alectas avgift har tak, kapitalförvaltningskostnaden inte", () => {
  const alecta = parametrar.produkter.alectaTrad;
  narall(arligAvgift(alecta, 100000, 0.6), 100000 * 0.0005 + 100000 * 0.0003, 1e-9);
  narall(arligAvgift(alecta, 2000000, 0.6), 480 + 2000000 * 0.0003, 1e-9);
});

test("entrélösningens avgift vägs mellan aktie- och räntedelen", () => {
  const entre = parametrar.produkter.entrelosning;
  narall(arligAvgift(entre, 1000000, 1.0), 800, 1e-9);
  narall(arligAvgift(entre, 1000000, 0.25), 1000000 * (0.25 * 0.0008 + 0.75 * 0.00053), 1e-9);
});

test("premien är 4,5 % under brytpunkten, 30 % över och inget över taket", () => {
  const ibb = 83400;
  narall(arsPremie(parametrar, 400000, ibb), 0.045 * 400000);
  const brytpunkt = 7.5 * ibb;
  narall(arsPremie(parametrar, 900000, ibb), 0.045 * brytpunkt + 0.30 * (900000 - brytpunkt));
  narall(arsPremie(parametrar, 5000000, ibb), 0.045 * brytpunkt + 0.30 * (30 * ibb - brytpunkt));
});

test("utan avkastning, avgift och skatt blir kapitalet startkapital plus premier", () => {
  const p = utanAvkastningAvgiftSkatt(kopia());
  p.realLoneokning.varde = 0;
  p.realIbbOkning.varde = 0;
  const r = berakna(p, { alder: 40, manadslon: 40000, kapital: passiv });
  const ar = p.pensionsalder.varde - 40;
  const forvantat = 200000 + ar * 0.045 * 40000 * 12;
  for (const s of Object.values(r.scenarier)) narall(s.slutkapital, forvantat, 1e-6);
});

test("premier betalas varje år från nuvarande ålder till pensionsåldern", () => {
  const p = kopia();
  const r = berakna(p, { alder: 40, manadslon: 40000, kapital: passiv });
  const ar = r.scenarier.alltTrad.ar;
  assert.equal(ar.length, p.pensionsalder.varde - 40);
  assert.equal(ar[0].alder, 40);
  assert.equal(ar.at(-1).alder, p.pensionsalder.varde - 1);
  assert.ok(ar.every((rad) => rad.premie > 0));
});

test("utan lön kommer inga premier, men kapitalet växer", () => {
  const r = berakna(kopia(), { alder: 40, manadslon: 0, kapital: passiv });
  assert.ok(r.scenarier.alltTrad.ar.every((rad) => rad.premie === 0));
  assert.ok(r.scenarier.alltTrad.slutkapital > 200000);
  assert.ok(r.vinstFlytt > 0);
});

test("inga premier före startåldern", () => {
  const r = berakna(kopia(), { alder: 22, manadslon: 30000, kapital: passiv });
  const ar = r.scenarier.alltTrad.ar;
  assert.equal(ar[0].premie, 0);
  assert.equal(ar[2].premie, 0);
  assert.ok(ar[3].premie > 0);
});

test("100 000 kr i 6 % under 34 år blir cirka 725 000 kr, som i artikeln", () => {
  const p = utanAvkastningAvgiftSkatt(kopia());
  p.realAvkastningAktier.varde = 0.06;
  p.produkter.entrelosning.aktieandel = { typ: "perAlder", punkter: [[0, 1.0]] };
  p.pensionsalder.varde = 69;
  const r = berakna(p, {
    alder: 35, manadslon: 0,
    kapital: { obligatoriskTrad: 0, flyttbarTrad: 0, flyttbarFond: 100000 },
  });
  narall(r.scenarier.alltFlyttat.slutkapital, 100000 * 1.06 ** 34);
  narall(r.scenarier.alltFlyttat.slutkapital, 725000, 2000);
});

test("med samma produkt överallt blir alla scenarier lika och inget trafikljus", () => {
  const p = kopia();
  p.produkter.alectaTrad = structuredClone(p.produkter.entrelosning);
  const r = berakna(p, { alder: 35, manadslon: 45000, kapital: passiv });
  narall(r.vinstFlytt, 0, 1e-6);
  narall(r.kostnadRegeln, 0, 1e-6);
  assert.equal(r.trafikljus, null);
  assert.equal(r.andelUppnadd, null);
});

test("för en ung person: allt flyttat > allt möjligt flyttat > allt i trad", () => {
  const r = berakna(kopia(), { alder: 35, manadslon: 45000, kapital: passiv });
  const s = r.scenarier;
  assert.ok(s.alltFlyttat.slutkapital > s.alltMojligtFlyttat.slutkapital);
  assert.ok(s.alltMojligtFlyttat.slutkapital > s.alltTrad.slutkapital);
});

test("den som alltid varit passiv har inte uppnått något: rött", () => {
  const r = berakna(kopia(), { alder: 35, manadslon: 45000, kapital: passiv });
  narall(r.redanUppnatt, 0, 1e-6);
  narall(r.kvarAttHamta, r.vinstFlytt, 1e-6);
  assert.equal(r.andelUppnadd, 0);
  assert.equal(r.trafikljus, "rod");
});

test("den som flyttat hela den flyttbara delen har uppnått allt: grönt", () => {
  const r = berakna(kopia(), {
    alder: 35, manadslon: 45000,
    kapital: { obligatoriskTrad: 100000, flyttbarTrad: 0, flyttbarFond: 130000 },
    andelPremieFond: 0.5,
  });
  narall(r.kvarAttHamta, 0, 1e-6);
  assert.equal(r.andelUppnadd, 1);
  assert.equal(r.trafikljus, "gron");
});

test("delvis flyttat ger gult", () => {
  const r = berakna(kopia(), {
    alder: 35, manadslon: 45000,
    kapital: { obligatoriskTrad: 100000, flyttbarTrad: 50000, flyttbarFond: 50000 },
    andelPremieFond: 0.25,
  });
  assert.ok(r.andelUppnadd > 0.1 && r.andelUppnadd < 0.9);
  assert.equal(r.trafikljus, "gul");
});

test("åldersvarningen slår till från gränsen", () => {
  const p = kopia();
  const grans = p.aldersvarningFran.varde;
  assert.equal(berakna(p, { alder: grans - 1, manadslon: 45000, kapital: passiv }).aldersvarning, false);
  assert.equal(berakna(p, { alder: grans, manadslon: 45000, kapital: passiv }).aldersvarning, true);
});

test("uppdelning: allt i trad ger hälften obligatoriskt och hälften flyttbart", () => {
  assert.deepEqual(delaUppKapital(parametrar, 200000, 0),
    { obligatoriskTrad: 100000, flyttbarTrad: 100000, flyttbarFond: 0 });
});

test("uppdelning: det som ligger i trad utöver hälften är flyttbart", () => {
  assert.deepEqual(delaUppKapital(parametrar, 150000, 50000),
    { obligatoriskTrad: 100000, flyttbarTrad: 50000, flyttbarFond: 50000 });
});

test("uppdelning: den obligatoriska delen blir aldrig större än trad", () => {
  // Funds have grown faster, so trad is less than half of the total.
  assert.deepEqual(delaUppKapital(parametrar, 90000, 110000),
    { obligatoriskTrad: 90000, flyttbarTrad: 0, flyttbarFond: 110000 });
});

test("utan vald fördelning går alla nya premier till trad i nuvarande", () => {
  const kapital = { obligatoriskTrad: 100000, flyttbarTrad: 0, flyttbarFond: 100000 };
  const potter = berakna(kopia(), { alder: 35, manadslon: 45000, kapital })
    .scenarier.nuvarande.ar[0].potter;
  assert.equal(potter.find((x) => x.namn === "flyttbar i fond").premie, 0);
  assert.ok(potter.find((x) => x.namn === "flyttbar i trad").premie > 0);
});

test("andelen till fond styr premierna och kapas vid den flyttbara delen", () => {
  const indata = { alder: 35, manadslon: 45000, kapital: passiv };
  const potter = (andel) => berakna(kopia(), { ...indata, andelPremieFond: andel })
    .scenarier.nuvarande.ar[0].potter;
  const [obl, trad, fond] = potter(0.5);
  narall(fond.premie, obl.premie, 1e-9);
  assert.equal(trad.premie, 0);
  // More than the movable half is not possible; the obligatory part stays.
  const [obl2, , fond2] = potter(0.8);
  narall(fond2.premie, obl2.premie, 1e-9);
});

test("eget sparande: utan avkastning, avgift och skatt är det vinsten delad på månaderna", () => {
  const p = utanAvkastningAvgiftSkatt(kopia());
  p.iskSkatt.varde = 0;
  p.skattPaPension.varde = 0;
  const ar = p.pensionsalder.varde - 40;
  narall(privatSparandePerManad(p, 40, 120000), 120000 / (ar * 12), 1e-9);
});

test("eget sparande jämförs efter skatt på pensionen", () => {
  const p = utanAvkastningAvgiftSkatt(kopia());
  p.iskSkatt.varde = 0;
  p.skattPaPension.varde = 0.3;
  const ar = p.pensionsalder.varde - 40;
  narall(privatSparandePerManad(p, 40, 120000), 0.7 * 120000 / (ar * 12), 1e-9);
});

test("eget sparande: med avkastning räcker det med mindre, och ISK-skatt kostar", () => {
  const p = kopia();
  const ar = p.pensionsalder.varde - 40;
  const utanVaxt = 100000 * (1 - p.skattPaPension.varde) / (ar * 12);
  const medVaxt = privatSparandePerManad(p, 40, 100000);
  assert.ok(medVaxt < utanVaxt);
  p.iskSkatt.varde = 0;
  assert.ok(privatSparandePerManad(p, 40, 100000) < medVaxt);
});

test("eget sparande: ingen vinst ger noll, ingen tid kvar ger null", () => {
  assert.equal(privatSparandePerManad(parametrar, 40, 0), 0);
  assert.equal(privatSparandePerManad(parametrar, parametrar.pensionsalder.varde, 1000), null);
});

test("berakna ger eget sparande för flytten och för att slippa regeln", () => {
  const r = berakna(kopia(), { alder: 35, manadslon: 45000, kapital: passiv });
  assert.ok(r.privatFlytt > 0);
  assert.ok(r.privatUtanRegeln > r.privatFlytt);
});

test("eget sparande år för år slutar i vinsten efter skatt på pensionen", () => {
  const p = kopia();
  const r = berakna(p, { alder: 35, manadslon: 45000, kapital: passiv });
  const efterSkatt = (vinst) => vinst * (1 - p.skattPaPension.varde);
  const flytt = r.privatAr.egetSparandeFlytt;
  narall(flytt.slutkapital, efterSkatt(r.vinstFlytt), 1e-6);
  narall(r.privatAr.egetSparandeUtanRegeln.slutkapital,
    efterSkatt(r.vinstFlytt + r.kostnadRegeln), 1e-6);
  // One row a year from today's age, each depositing twelve monthly amounts.
  assert.equal(flytt.ar.length, p.pensionsalder.varde - 35);
  assert.equal(flytt.ar[0].alder, 35);
  narall(flytt.ar[0].potter[0].premie, 12 * r.privatFlytt, 1e-9);
});

test("eget sparande: utan vinst finns inga år att visa", () => {
  const ingenting = { obligatoriskTrad: 0, flyttbarTrad: 0, flyttbarFond: 0 };
  const r = berakna(kopia(), { alder: 40, manadslon: 0, kapital: ingenting });
  assert.equal(r.vinstFlytt, 0);
  assert.deepEqual(r.privatAr, {});
  assert.equal(simuleraPrivat(kopia(), 40, 0).slutkapital, 0);
});

test("utan sparat kapital räknas bara de kommande premierna", () => {
  const ingenting = { obligatoriskTrad: 0, flyttbarTrad: 0, flyttbarFond: 0 };
  const r = berakna(kopia(), { alder: 35, manadslon: 45000, kapital: ingenting });
  assert.ok(r.vinstFlytt > 0);
  assert.equal(r.scenarier.alltTrad.ar[0].potter.every((x) => x.startkapital === 0), true);
});

test("årets premier får den andel av årets avkastning som parametern säger", () => {
  const p = utanAvkastningAvgiftSkatt(kopia());
  p.realAvkastningRantor.varde = 0.04;
  const kapital = { obligatoriskTrad: 0, flyttbarTrad: 0, flyttbarFond: 0 };
  const forstaAret = (andel) => {
    p.avkastningsandelArsPremie.varde = andel;
    const rad = berakna(p, { alder: 40, manadslon: 40000, kapital }).scenarier.alltTrad.ar[0];
    return { premie: rad.premie, slut: rad.potter.reduce((s, x) => s + x.slutkapital, 0) };
  };
  // Alecta's equity share times 0 % equity return leaves the bond return.
  const r = 0.04 * (1 - aktieandel(p.produkter.alectaTrad, 40, p.pensionsalder.varde));
  const noll = forstaAret(0);
  narall(noll.slut, noll.premie, 1e-6);
  const halv = forstaAret(0.5);
  narall(halv.slut, halv.premie * (1 + r / 2), 1e-6);
});
