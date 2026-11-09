// Receives one result from the ITP1 calculator and adds it as a row in the
// spreadsheet this script belongs to. The address is open to anyone, so nothing
// is written unless every value passes the checks below. It never reads or
// returns the sheet. Google does not give the script the visitor's IP address,
// and the row holds the date only.

const FLIK = "Resultat";
const MAX_TECKEN = 3000;
const MAX_RADER = 100000;

const JA_NEJ = ["ja", "nej"];
const STORT_BELOPP = 100000000000;

// The columns in order. A new field goes last, so that existing rows keep their
// meaning. An unknown field or an invalid value rejects the whole row.
const FALT = [
  { namn: "kalla", val: ["sajt", "test"], krav: true },
  { namn: "version", monster: /^[0-9A-Za-z.-]{1,20}$/ },
  { namn: "fodelsear", min: 1900, max: 2100, krav: true },
  { namn: "alder", min: 0, max: 120, krav: true },
  { namn: "itp1_nu", val: JA_NEJ },
  { namn: "itp1_tidigare", val: JA_NEJ },
  { namn: "manadslon", min: 0, max: 10000000 },
  { namn: "andel_fond", min: 0, max: 100 },
  { namn: "lage", val: ["trad", "delar", "ingen"], krav: true },
  { namn: "kapital_trad", min: 0, max: STORT_BELOPP },
  { namn: "kapital_fond", min: 0, max: STORT_BELOPP },
  // One amount and type per insurance, as in 200000:trad|50000:fond.
  { namn: "forsakringar", monster: /^\d{1,12}:(trad|fond)(\|\d{1,12}:(trad|fond)){0,49}$/ },
  { namn: "vinst", min: -STORT_BELOPP, max: STORT_BELOPP, krav: true },
  { namn: "kostnad_regeln", min: -STORT_BELOPP, max: STORT_BELOPP },
  { namn: "kvar_att_hamta", min: -STORT_BELOPP, max: STORT_BELOPP },
  { namn: "trafikljus", val: ["rod", "gul", "gron", "inget"] },
  { namn: "andel_uppnadd", min: 0, max: 100 },
  { namn: "spara_flytt", min: -STORT_BELOPP, max: STORT_BELOPP },
  { namn: "spara_utan_regeln", min: -STORT_BELOPP, max: STORT_BELOPP },
  { namn: "aldersvarning", val: JA_NEJ },
  { namn: "slut_allt_trad", min: -STORT_BELOPP, max: STORT_BELOPP },
  { namn: "slut_nuvarande", min: -STORT_BELOPP, max: STORT_BELOPP },
  { namn: "slut_allt_som_gar", min: -STORT_BELOPP, max: STORT_BELOPP },
  { namn: "slut_utan_regeln", min: -STORT_BELOPP, max: STORT_BELOPP },
];

function giltigt(falt, varde) {
  if (falt.val) return falt.val.indexOf(varde) !== -1;
  if (falt.monster) return typeof varde === "string" && falt.monster.test(varde);
  return typeof varde === "number" && isFinite(varde) && varde >= falt.min && varde <= falt.max;
}

// Turns the received values into a row, or null if anything is off. Only values
// checked here reach the sheet, so text can never become a formula there.
function tillRad(indata, datum) {
  if (indata === null || typeof indata !== "object" || Array.isArray(indata)) return null;
  const kanda = FALT.map(function (falt) { return falt.namn; });
  for (const namn of Object.keys(indata)) {
    if (kanda.indexOf(namn) === -1) return null;
  }
  const rad = [datum];
  for (const falt of FALT) {
    const finns = Object.prototype.hasOwnProperty.call(indata, falt.namn);
    if (!finns && falt.krav) return null;
    if (finns && !giltigt(falt, indata[falt.namn])) return null;
    rad.push(finns ? indata[falt.namn] : "");
  }
  return rad;
}

function hamtaFlik() {
  const ark = SpreadsheetApp.getActiveSpreadsheet();
  let flik = ark.getSheetByName(FLIK);
  if (!flik) {
    flik = ark.insertSheet(FLIK);
    flik.appendRow(["datum"].concat(FALT.map(function (falt) { return falt.namn; })));
    flik.setFrozenRows(1);
  }
  return flik;
}

// Returns whether the row was saved.
function spara(indata) {
  const datum = Utilities.formatDate(new Date(), "Europe/Stockholm", "yyyy-MM-dd");
  const rad = tillRad(indata, datum);
  if (!rad) return false;
  // Several visitors can send at once.
  const las = LockService.getScriptLock();
  las.waitLock(10000);
  try {
    const flik = hamtaFlik();
    if (flik.getLastRow() >= MAX_RADER) return false;
    flik.appendRow(rad);
    return true;
  } finally {
    las.releaseLock();
  }
}

function doPost(e) {
  let sparad = false;
  try {
    const text = e && e.postData ? e.postData.contents : "";
    if (text.length <= MAX_TECKEN) sparad = spara(JSON.parse(text));
  } catch (fel) {
    // Bad input or a busy lock: the row is dropped, the visitor never notices.
    sparad = false;
  }
  return ContentService.createTextOutput(sparad ? "ok" : "avvisad");
}

// Run by hand from the editor: asks for permission the first time and adds a
// row marked as a test.
function provkor() {
  const sparad = spara({
    kalla: "test",
    version: "prov",
    fodelsear: 1988,
    alder: 38,
    itp1_nu: "ja",
    manadslon: 45000,
    lage: "delar",
    kapital_trad: 200000,
    kapital_fond: 50000,
    forsakringar: "200000:trad|50000:fond",
    vinst: 171000,
    trafikljus: "gul",
    andel_uppnadd: 40,
  });
  console.log(sparad ? "Provraden är sparad." : "Provraden avvisades.");
}
