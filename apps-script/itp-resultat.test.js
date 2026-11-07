// Runs the Apps Script file in Node with Google's services replaced by stand-ins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function ladda() {
  const rader = [];
  const flik = {
    appendRow: (r) => rader.push(r),
    getLastRow: () => rader.length,
    setFrozenRows: () => {},
  };
  let finns = false;
  const miljo = {
    console,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => (finns ? flik : null),
        insertSheet: () => { finns = true; return flik; },
      }),
    },
    Utilities: { formatDate: () => "2026-11-07" },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ContentService: { createTextOutput: (text) => text },
  };
  const kod = readFileSync(new URL("./itp-resultat.gs", import.meta.url), "utf8");
  vm.runInNewContext(kod, miljo);
  return { ...miljo, rader };
}

const giltig = {
  kalla: "sajt", fodelsear: 1988, alder: 38, lage: "ingen", vinst: 171000, manadslon: 45000,
};
const post = (data) => ({ postData: { contents: JSON.stringify(data) } });

test("en giltig rad sparas med rubriker och bara datum", () => {
  const s = ladda();
  assert.equal(s.doPost(post(giltig)), "ok");
  assert.equal(s.rader.length, 2);
  assert.equal(s.rader[0][0], "datum");
  assert.equal(s.rader[1][0], "2026-11-07");
  assert.equal(s.rader[1][s.rader[0].indexOf("manadslon")], 45000);
  assert.equal(s.rader[1].length, s.rader[0].length);
});

test("okända fält avvisar hela raden", () => {
  const s = ladda();
  assert.equal(s.doPost(post({ ...giltig, ip: "192.0.2.1" })), "avvisad");
  assert.equal(s.rader.length, 0);
});

test("text som kunde bli en formel kommer aldrig in", () => {
  const s = ladda();
  const forsok = [
    { ...giltig, version: "=IMPORTXML(1)" },
    { ...giltig, forsakringar: "=1+1" },
    { ...giltig, lage: "=1+1" },
    { ...giltig, vinst: "=1+1" },
  ];
  for (const data of forsok) assert.equal(s.doPost(post(data)), "avvisad");
  assert.equal(s.rader.length, 0);
});

test("saknade krav, orimliga värden och trasig indata avvisas", () => {
  const s = ladda();
  const { vinst, ...utanVinst } = giltig;
  assert.equal(vinst, 171000);
  const fall = [
    post(utanVinst),
    post({ ...giltig, fodelsear: 1800 }),
    post({ ...giltig, andel_fond: 101 }),
    post([giltig]),
    post(null),
    { postData: { contents: "inte json" } },
    { postData: { contents: "x".repeat(3001) } },
    {},
  ];
  for (const e of fall) assert.equal(s.doPost(e), "avvisad");
  assert.equal(s.rader.length, 0);
});

test("försäkringsraderna kan sparas", () => {
  const s = ladda();
  const data = { ...giltig, lage: "delar", forsakringar: "200000:trad|50000:fond" };
  assert.equal(s.doPost(post(data)), "ok");
  assert.equal(s.rader[1][s.rader[0].indexOf("forsakringar")], "200000:trad|50000:fond");
});

test("provkörningen ger en rad märkt som test", () => {
  const s = ladda();
  s.provkor();
  assert.equal(s.rader[1][s.rader[0].indexOf("kalla")], "test");
});
