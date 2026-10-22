// Display for the ITP1 calculator: reads the form, calls the calculation
// module and renders the result. Holds no numbers of its own; everything it
// shows comes from berakna() or the parameter file.

import { parametrar as p } from "./parametrar.js";
import { berakna } from "./berakning.js";

// ITP1 covers those born this year or later; older people have ITP2.
const ITP1_FRAN_FODELSEAR = 1979;

const form = document.getElementById("indata");
const resultat = document.getElementById("resultat");

const kr = (x) => `${(Math.round(x / 1000) * 1000).toLocaleString("sv-SE")} kr`;
const procent = (x, decimaler = 0) =>
  `${(x * 100).toLocaleString("sv-SE", { maximumFractionDigits: decimaler })} %`;

// Accepts "45 000", "45000" and "45 000 kr".
function tal(namn) {
  const varde = form.elements[namn].value.replace(/[^\d]/g, "");
  return varde === "" ? null : Number(varde);
}

function lasIndata() {
  const fodelsear = tal("fodelsear");
  // Without ITP1 in the current job no more premiums come in, which the
  // calculation handles as a salary of zero.
  const anstalld = form.elements.anstalld.checked;
  const manadslon = anstalld ? tal("manadslon") : 0;
  const lage = form.elements.lage.value;
  let kapital;
  if (lage === "total") {
    const total = tal("total");
    if (total === null) return { fodelsear, manadslon, kapital: null };
    // Half of every premium goes to each part, so for someone who never
    // made a choice the capital is split down the middle.
    const obl = total * p.andelObligatoriskTrad.varde;
    kapital = { obligatoriskTrad: obl, flyttbarTrad: total - obl, flyttbarFond: 0 };
  } else {
    const delar = ["obligatoriskTrad", "flyttbarTrad", "flyttbarFond"].map(tal);
    if (delar.every((d) => d === null)) return { fodelsear, manadslon, kapital: null };
    const [obligatoriskTrad, flyttbarTrad, flyttbarFond] = delar.map((d) => d ?? 0);
    kapital = { obligatoriskTrad, flyttbarTrad, flyttbarFond };
  }
  return { fodelsear, manadslon, kapital };
}

function meddelande(text, klass = "") {
  resultat.innerHTML = `<div class="meddelande ${klass}">${text}</div>`;
}

let senaste = null;

function uppdatera() {
  const { fodelsear, manadslon, kapital } = lasIndata();
  senaste = null;

  if (fodelsear === null || manadslon === null || kapital === null) {
    meddelande(form.elements.anstalld.checked
      ? "Fyll i födelseår, lön och ditt ITP1-kapital så räknar vi."
      : "Fyll i födelseår och ditt ITP1-kapital så räknar vi.");
    return;
  }
  if (fodelsear < ITP1_FRAN_FODELSEAR) {
    meddelande(
      `Är du född före ${ITP1_FRAN_FODELSEAR} har du troligen ITP2, som den här
       räknesnurran inte räknar på.`,
      "varning",
    );
    return;
  }
  const alder = new Date().getFullYear() - fodelsear;
  if (alder >= p.pensionsalder.varde || alder < 16) {
    meddelande("Kontrollera födelseåret.", "varning");
    return;
  }

  const indata = { alder, manadslon, kapital };
  const r = berakna(p, indata);
  senaste = { indata, r };
  visaResultat(indata, r);
}

function visaResultat(indata, r) {
  const s = r.scenarier;
  const pa = p.pensionsalder.varde;
  const harFond = indata.kapital.flyttbarFond > 0;
  const delar = [];

  if (r.aldersvarning) {
    delar.push(`<div class="meddelande varning">
      Med kort tid kvar till pension är det inte lika självklart att flytta
      pengarna. Aktier svänger mer, och tiden att hämta igen en nedgång är kort.
    </div>`);
  }

  delar.push(`<h2>Det här kan du vinna</h2>
    <div class="nyckeltal">
      <div><div class="etikett">Mer i pension om du flyttar allt som går</div>
        <div class="belopp">${kr(r.vinstFlytt)}</div></div>
      <div><div class="etikett">Vad regeln om obligatorisk trad kostar dig</div>
        <div class="belopp">${kr(r.kostnadRegeln)}</div></div>
    </div>
    <p class="hjalp">Kapital vid ${pa} år, i dagens penningvärde${indata.manadslon === 0
      ? ", utan nya inbetalningar" : ""}.</p>`);

  if (r.trafikljus) {
    const texter = {
      rod: `Du har inte flyttat något än. Hela vinsten, ${kr(r.kvarAttHamta)}, finns kvar att hämta.`,
      gul: `Du har redan fått ut ${procent(r.andelUppnadd)} av vinsten. ${kr(r.kvarAttHamta)} finns kvar att hämta.`,
      gron: "Du har redan flyttat det som går. Bra jobbat!",
    };
    delar.push(`<div class="meddelande trafikljus">
      <span class="lampa ${r.trafikljus}" aria-hidden="true"></span>
      <span>${texter[r.trafikljus]}</span></div>`);
  }

  if (harFond) {
    delar.push(`<div class="meddelande varning">
      Vi ser inte vilka fonder du har valt. Vi räknar som om din fondförsäkring
      ligger i Länsförsäkringars entrélösning. Har du valt andra fonder kan
      det bli både bättre och sämre.
    </div>`);
  }

  const rader = [
    ["Allt i traditionell försäkring", s.alltTrad.slutkapital, ""],
    ["Nuvarande fördelning", s.nuvarande.slutkapital, "nuvarande"],
    ["Allt som går flyttat till fondförsäkring", s.alltMojligtFlyttat.slutkapital, "fond"],
    ["Allt i fondförsäkring, om regeln togs bort", s.alltFlyttat.slutkapital, "fond"],
  ];
  const max = Math.max(...rader.map(([, v]) => v));
  delar.push(`<h2>Ditt kapital vid ${pa} år</h2><div class="staplar">${rader
    .map(([namn, varde, klass]) => `<div class="stapel ${klass}">
      <div class="rubrik"><span>${namn}</span><strong>${kr(varde)}</strong></div>
      <div class="spar"><div class="fyllning" style="width:${(varde / max) * 100}%"></div></div>
    </div>`).join("")}</div>
    <button type="button" id="ladda-ner">Ladda ner år för år (CSV)</button>`);

  resultat.innerHTML = delar.join("");
  document.getElementById("ladda-ner").addEventListener("click", laddaNerCsv);
}

// Year-by-year table for every scenario and pot, for checking by hand.
// Semicolons and decimal commas so Swedish Excel and Sheets read it directly.
function laddaNerCsv() {
  if (!senaste) return;
  const tal = (x) => String(Math.round(x * 100) / 100).replace(".", ",");
  const rader = [["scenario", "ålder", "årslön", "ibb", "pott", "produkt", "aktieandel",
    "avkastning", "startkapital", "premie", "avgift", "skatt", "slutkapital"]];
  for (const [scenario, { ar }] of Object.entries(senaste.r.scenarier)) {
    for (const rad of ar) {
      for (const pott of rad.potter) {
        rader.push([scenario, rad.alder, tal(rad.arslon), tal(rad.ibb), pott.namn, pott.produkt,
          tal(pott.andelAktier * 100) + " %", tal(pott.avkastning * 100) + " %",
          tal(pott.startkapital), tal(pott.premie), tal(pott.avgift), tal(pott.skatt),
          tal(pott.slutkapital)]);
      }
    }
  }
  const csv = rader.map((r) => r.join(";")).join("\r\n");
  // The byte order mark makes Excel read the file as UTF-8.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "itp-ar-for-ar.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// "Så har vi räknat": renders the parameter file as it is.
function formateraVarde(post) {
  const { varde, enhet = "" } = post;
  if (enhet.startsWith("andel") || enhet === "per år") return procent(varde, 3);
  if (enhet === "kr" || enhet === "kr/år") return `${varde.toLocaleString("sv-SE")} kr`;
  return `${varde.toLocaleString("sv-SE")} ${enhet}`;
}

function aktieandelText(a) {
  if (a.typ === "perAlder") {
    return a.punkter.map(([alder, andel]) => `${alder} år: ${procent(andel)}`).join(", ");
  }
  return `${procent(a.startandel)} aktier fram till ${a.startArForePension} år före
    pensionsåldern, sedan jämnt ner mot ${procent(a.slutandel)} under ${a.langdAr} år`;
}

function avgiftText(f) {
  const delar = [f.procentAktiedel === f.procentRantedel
    ? procent(f.procentAktiedel, 3)
    : `aktiedel ${procent(f.procentAktiedel, 3)}, räntedel ${procent(f.procentRantedel, 3)}`];
  if (f.fastKr) delar.push(`plus ${f.fastKr} kr`);
  if (f.takKr !== null) delar.push(`högst ${f.takKr} kr per år`);
  if (f.golvKr !== null) delar.push(`minst ${f.golvKr} kr per år`);
  if (f.procentUtanTak) delar.push(`plus ${procent(f.procentUtanTak, 3)} utan tak`);
  return delar.join(", ");
}

function visaParametrar() {
  const allmanna = Object.values(p).filter((post) => post && "varde" in post);
  const produkter = Object.values(p.produkter);
  document.getElementById("parametrar").innerHTML = `
    <p class="hjalp">Alla belopp är i dagens penningvärde, och avkastningen är
      real, det vill säga efter inflation. Vi räknar med väntevärden: utfallet
      kan bli både bättre och sämre.</p>
    <div class="tabell-rulla"><table>
      <tr><th>Antagande</th><th>Värde</th><th>Källa</th></tr>
      ${allmanna.map((post) => `<tr><td>${post.beskrivning}</td>
        <td>${formateraVarde(post)}</td><td class="kalla">${post.kalla}</td></tr>`).join("")}
    </table></div>
    ${produkter.map((prod) => `<h3>${prod.namn}</h3>
      <div class="tabell-rulla"><table>
        <tr><td>Aktieandel</td><td>${aktieandelText(prod.aktieandel)}</td>
          <td class="kalla">${prod.aktieandel.kalla}</td></tr>
        <tr><td>Avgift</td><td>${avgiftText(prod.avgift)}</td>
          <td class="kalla">${prod.avgift.kalla}</td></tr>
      </table></div>`).join("")}`;
}

// Shows the fields that match the choices: "total" or "parts", and the
// salary only for those with ITP1 in their current job.
function visaLage() {
  const lage = form.elements.lage.value;
  for (const el of form.querySelectorAll("[data-lage]")) el.hidden = el.dataset.lage !== lage;
  const anstalld = form.elements.anstalld.checked;
  for (const el of form.querySelectorAll("[data-anstalld]")) el.hidden = !anstalld;
  for (const el of form.querySelectorAll("[data-ej-anstalld]")) el.hidden = anstalld;
}

form.addEventListener("input", () => { visaLage(); uppdatera(); });
form.addEventListener("submit", (e) => e.preventDefault());
visaLage();
visaParametrar();
uppdatera();
