// Jämför fältlistorna på de tre ställen där en rapports fält definieras:
// FALT i apps-script/itp-resultat.gs, SGV_RAPPORT_FALT i
// smaspararguiden-verktyg.php och de nycklar matvarden() i itp/matning.js kan
// skicka. Ett nytt fält läggs sist i alla tre listorna; detta test misslyckas
// om det saknas på något ställe, så att rapporter inte avvisas med 400 i
// tysthet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { matvarden, nyKod } from "../itp/matning.js";
import { berakna, delaUppKapital } from "../itp/berakning.js";
import { parametrar as p } from "../itp/parametrar.js";

const rot = join(dirname(fileURLToPath(import.meta.url)), "..");
// Konstanterna i skriptet expanderas så att listorna kan jämföras direkt.
const skript = readFileSync(join(rot, "apps-script/itp-resultat.gs"), "utf8")
  .replaceAll("STORT_BELOPP", "100000000000")
  .replaceAll("JA_NEJ", '["ja", "nej"]');
const plugin = readFileSync(join(rot, "smaspararguiden-verktyg.php"), "utf8");

// En rad per fält i båda listorna.
function faltFranSkriptet() {
  const block = skript.match(/const FALT = \[([\s\S]*?)\n\];/)[1];
  return block.split("\n").map((rad) => {
    const namn = rad.match(/namn: "([^"]+)"/)?.[1];
    if (!namn) return null;
    const falt = { namn };
    const val = rad.match(/val: \[([^\]]*)\]/);
    if (val) falt.val = val[1].split(",").map((s) => s.trim().replace(/"/g, ""));
    const monster = rad.match(/monster: (\/.*\/[a-z]*)/);
    if (monster) falt.monster = monster[1];
    const min = rad.match(/min: (-?\d+)/);
    if (min) falt.min = Number(min[1]);
    const max = rad.match(/max: (-?\d+)/);
    if (max) falt.max = Number(max[1]);
    if (/krav: true/.test(rad)) falt.krav = true;
    return falt;
  }).filter(Boolean);
}

function faltFranPluginen() {
  const block = plugin.match(/const SGV_RAPPORT_FALT = \[([\s\S]*?)\n\];/)[1];
  return block.split("\n").map((rad) => {
    const namn = rad.match(/^\s*'([^']+)' => \[/)?.[1];
    if (!namn) return null;
    const falt = { namn };
    const val = rad.match(/'val' => \[([^\]]*)\]/);
    if (val) falt.val = val[1].split(",").map((s) => s.trim().replace(/'/g, ""));
    const monster = rad.match(/'monster' => '(\/.*\/[A-Za-z]*)'/);
    if (monster) falt.monster = monster[1];
    const min = rad.match(/'min' => (-?\d+)/);
    if (min) falt.min = Number(min[1]);
    const max = rad.match(/'max' => (-?\d+)/);
    if (max) falt.max = Number(max[1]);
    if (/'krav' => true/.test(rad)) falt.krav = true;
    return falt;
  }).filter(Boolean);
}

// Regex-kroppen utan skiljetecken och flaggor, så regex-litteralen i skriptet
// och strängen i pluginen kan jämföras.
const monsterKropp = (m) => m.replace(/^\//, "").replace(/\/[a-zA-Z]*$/, "").replace(/\\\\/g, "\\");

const franSkriptet = faltFranSkriptet();
const franPluginen = faltFranPluginen();

test("FALT i skriptet och SGV_RAPPORT_FALT i pluginen har samma fält i samma ordning", () => {
  assert.deepEqual(franPluginen.map((f) => f.namn), franSkriptet.map((f) => f.namn));
});

test("varje fält har samma villkor i skriptet och i pluginen", () => {
  const normalisera = (f) => ({
    namn: f.namn,
    val: f.val,
    monster: f.monster ? monsterKropp(f.monster) : undefined,
    min: f.min,
    max: f.max,
    krav: !!f.krav,
  });
  assert.deepEqual(franPluginen.map(normalisera), franSkriptet.map(normalisera));
});

test("alla nycklar matvarden() kan skicka finns i fältlistan", () => {
  const r = berakna(p, {
    alder: 36, manadslon: 45000,
    kapital: delaUppKapital(p, 400000, 50000), andelPremieFond: 0.5,
  });
  const full = matvarden({
    r, fodelsear: 1990, alder: 36, manadslon: 45000,
    kapital: { obligatoriskTrad: 200000, flyttbarTrad: 200000, flyttbarFond: 50000 },
    andelPremieFond: 0.5, lage: "delar", itp1Nu: true, itp1Tidigare: false,
    forsakringar: [{ belopp: 200000, sparform: "trad" }, { belopp: 50000, sparform: "fond" }],
    vard: "www.smaspararguiden.se", version: "0123456789abcdef", kod: nyKod(),
  });
  const partiell = matvarden({
    r: null, fodelsear: null, alder: null, manadslon: null, kapital: null,
    andelPremieFond: null, lage: "ingen", itp1Nu: false, itp1Tidigare: null,
    forsakringar: [], vard: "example.com", version: null, kod: nyKod(),
  });
  const namn = new Set(franSkriptet.map((f) => f.namn));
  for (const nyckel of new Set([...Object.keys(full), ...Object.keys(partiell)])) {
    assert.ok(namn.has(nyckel), `matvarden() skickar ${nyckel}, som saknas i fältlistan`);
  }
});
