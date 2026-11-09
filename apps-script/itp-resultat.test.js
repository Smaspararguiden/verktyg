// Runs the Apps Script file in Node with Google's services replaced by stand-ins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// A sheet held as rows of values, with the few calls the script uses.
function nyFlik(rader = []) {
  return {
    rader,
    appendRow: (r) => rader.push([...r]),
    getLastRow: () => rader.length,
    getLastColumn: () => Math.max(0, ...rader.map((r) => r.length)),
    setFrozenRows: () => {},
    getRange: (rad, kolumn, antalRader, antalKolumner) => ({
      getValues: () => rader.slice(rad - 1, rad - 1 + antalRader)
        .map((r) => r.slice(kolumn - 1, kolumn - 1 + antalKolumner).map((v) => v ?? "")),
      setValues: (varden) => varden.forEach((v, i) => {
        const r = rader[rad - 1 + i] ?? (rader[rad - 1 + i] = []);
        v.forEach((x, j) => { r[kolumn - 1 + j] = x; });
      }),
    }),
  };
}

function ladda(flik = null, nyckel = null) {
  const miljo = {
    console,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => flik,
        insertSheet: () => (flik = nyFlik()),
      }),
    },
    Utilities: { formatDate: () => "2026-11-09" },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ContentService: { createTextOutput: (text) => text },
  };
  const kod = readFileSync(new URL("./itp-resultat.gs", import.meta.url), "utf8");
  vm.runInNewContext(kod, miljo);
  // const declarations do not land on the sandbox object, so read them back.
  const nyckelEgenskap = vm.runInNewContext("NYCKEL_EGENSKAP", miljo);
  miljo.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (namn) => (namn === nyckelEgenskap ? nyckel : null),
    }),
  };
  for (const namn of ["RUBRIKER", "KOD_KOLUMN", "MAX_SOKNING"]) {
    miljo[namn] = vm.runInNewContext(namn, miljo);
  }
  return { ...miljo, flik: () => flik };
}

const giltig = {
  kalla: "sajt", fodelsear: 1988, alder: 38, lage: "ingen", vinst: 171000, manadslon: 45000,
  resultat: "ja", kod: "0123456789abcdef0123456789abcdef",
};
const post = (data) => ({ postData: { contents: JSON.stringify(data) } });
const varde = (s, rad, namn) => s.flik().rader[rad][s.flik().rader[0].indexOf(namn)];

test("en giltig rad sparas med rubriker och bara datum", () => {
  const s = ladda();
  assert.equal(s.doPost(post(giltig)), "ok");
  const rader = s.flik().rader;
  assert.equal(rader.length, 2);
  assert.equal(rader[0][0], "datum");
  assert.equal(rader[1][0], "2026-11-09");
  assert.equal(varde(s, 1, "manadslon"), 45000);
  assert.equal(rader[1].length, rader[0].length);
});

test("samma kod skriver över raden, en ny kod ger en ny rad", () => {
  const s = ladda();
  s.doPost(post({ ...giltig, resultat: "nej", vinst: undefined }));
  s.doPost(post({ ...giltig, manadslon: 50000 }));
  assert.equal(s.flik().rader.length, 2);
  assert.equal(varde(s, 1, "manadslon"), 50000);
  assert.equal(varde(s, 1, "resultat"), "ja");
  s.doPost(post({ ...giltig, kod: "f".repeat(32) }));
  assert.equal(s.flik().rader.length, 3);
});

test("utan kod blir varje anrop en ny rad", () => {
  const s = ladda();
  const { kod, ...utanKod } = giltig;
  assert.ok(kod);
  s.doPost(post(utanKod));
  s.doPost(post(utanKod));
  assert.equal(s.flik().rader.length, 3);
});

test("en påbörjad rad utan resultat sparas", () => {
  const s = ladda();
  const paborjad = { kalla: "sajt", lage: "trad", fodelsear: 1988, alder: 38, resultat: "nej", kod: giltig.kod };
  assert.equal(s.doPost(post(paborjad)), "ok");
  assert.equal(varde(s, 1, "vinst"), "");
});

test("rubriker för nya fält läggs till i ett befintligt ark", () => {
  const gammal = nyFlik([["datum", "kalla"], ["2026-11-07", "test"]]);
  const s = ladda(gammal);
  s.doPost(post(giltig));
  assert.equal(gammal.rader[0].at(-1), "kod");
  assert.equal(gammal.rader[1][1], "test");
  assert.equal(gammal.rader.length, 3);
});

test("okända fält avvisar hela raden", () => {
  const s = ladda();
  assert.equal(s.doPost(post({ ...giltig, ip: "192.0.2.1" })), "avvisad");
  assert.equal(s.doPost(post({ ...giltig, datum: "2026-01-01" })), "avvisad");
  assert.equal(s.flik(), null);
});

test("text som kunde bli en formel kommer aldrig in", () => {
  const s = ladda();
  s.doPost(post({ ...giltig, version: "=IMPORTXML(1)", forsakringar: "=1+1", vinst: "=1+1", kod: "=1+1" }));
  assert.equal(s.doPost(post({ ...giltig, lage: "=1+1" })), "avvisad");
  const rad = s.flik().rader[1];
  assert.ok(rad.every((v) => !String(v).startsWith("=")));
});

test("orimliga frivilliga värden blir tomma, orimliga krav avvisar", () => {
  const s = ladda();
  assert.equal(s.doPost(post({ ...giltig, fodelsear: 1800, andel_fond: 101 })), "ok");
  assert.equal(varde(s, 1, "fodelsear"), "");
  assert.equal(varde(s, 1, "andel_fond"), "");
  const fall = [
    post({ ...giltig, kalla: "annan" }),
    post([giltig]),
    post(null),
    { postData: { contents: "inte json" } },
    { postData: { contents: "x".repeat(3001) } },
    {},
  ];
  for (const e of fall) assert.equal(s.doPost(e), "avvisad");
  assert.equal(s.flik().rader.length, 2);
});

test("provkörningen ger en rad märkt som test", () => {
  const s = ladda();
  s.provkor();
  assert.equal(varde(s, 1, "kalla"), "test");
});

test("med nyckel i skriptet krävs samma nyckel i anropet", () => {
  const s = ladda(null, "hemlig");
  assert.equal(s.doPost(post(giltig)), "avvisad");
  assert.equal(s.doPost({ postData: { contents: JSON.stringify(giltig) }, parameter: { nyckel: ["fel"] } }), "avvisad");
  assert.equal(s.doPost({ postData: { contents: JSON.stringify(giltig) }, parameter: { nyckel: ["hemlig"] } }), "ok");
  assert.equal(s.flik().rader.length, 2);
  // utan egenskapen satt accepteras alla anrop, så utrullning kan ske i valfri ordning
  assert.equal(ladda().doPost(post(giltig)), "ok");
});

test("fel nyckel skapar inget ark", () => {
  const s = ladda(null, "hemlig");
  s.doPost(post(giltig));
  assert.equal(s.flik(), null);
});

test("kodsökningen läser bara de senaste MAX_SOKNING raderna", () => {
  const s = ladda();
  const { RUBRIKER, KOD_KOLUMN, MAX_SOKNING } = s;
  const gammalKod = "a".repeat(32);
  const rader = [RUBRIKER.slice()];
  for (let i = 0; i <= MAX_SOKNING; i++) {
    const rad = RUBRIKER.map(() => "");
    rad[0] = "2026-11-09";
    rad[KOD_KOLUMN - 1] = i === 0 ? gammalKod : "b".repeat(28) + String(i).padStart(4, "0");
    rader.push(rad);
  }
  const s2 = ladda(nyFlik(rader));
  const senasteKod = rader[rader.length - 1][KOD_KOLUMN - 1];
  // a code among the last rows overwrites its row
  s2.doPost(post({ ...giltig, kod: senasteKod, manadslon: 50000 }));
  assert.equal(rader.length, MAX_SOKNING + 2);
  // a code older than MAX_SOKNING rows gets a new row instead
  s2.doPost(post({ ...giltig, kod: gammalKod }));
  assert.equal(rader.length, MAX_SOKNING + 3);
});
