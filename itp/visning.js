// Display for the ITP1 calculator: draws the form into the page's .sg-itp
// element, reads it, calls the calculation module and renders the result.
// Holds no numbers of its own; everything it shows comes from berakna() or
// the parameter file. The same file serves the WordPress shortcode and the
// local preview page index.html.

// The modules are loaded with this file's own version query (?ver=… from the
// plugin), so a new upload is never mixed with cached old modules.
const versionsfraga = new URL(import.meta.url).search;
const { parametrar: p } = await import(`./parametrar.js${versionsfraga}`);
const { berakna, delaUppKapital } = await import(`./berakning.js${versionsfraga}`);

// ITP1 covers those born this year or later; older people have ITP2.
const ITP1_FRAN_FODELSEAR = 1979;

const rot = document.querySelector(".sg-itp");
rot.innerHTML = `
  <form autocomplete="off">
    <fieldset>
      <legend>Om dig</legend>
      <label>Födelseår
        <input name="fodelsear" inputmode="numeric" placeholder="t.ex. 1990">
      </label>
      <div data-fore-itp1 hidden>
        <p class="meddelande varning">
          De flesta som är födda år ${ITP1_FRAN_FODELSEAR - 1} eller tidigare har
          ITP2, som den här räknesnurran inte räknar på. Det finns vissa
          arbetsplatser som har ITP1 för alla oavsett ålder, men det är ganska
          ovanligt. Tror du att du jobbar eller har jobbat på en sådan? Kryssa i
          det som stämmer här under så räknar vi ändå.
        </p>
        <label class="kryss">
          <input type="checkbox" name="nuItp1">
          Ja. Jag har ITP1 i min nuvarande anställning.
        </label>
        <label class="kryss">
          <input type="checkbox" name="tidigareItp1">
          Ja. Jag har haft ITP1 i en tidigare anställning.
        </label>
      </div>
      <label class="kryss" data-ej-fore-itp1>
        <input type="checkbox" name="anstalld" checked>
        Jag har ITP1 i min nuvarande anställning
      </label>
      <p class="hjalp" data-ej-anstalld hidden>
        Vi räknar bara på det kapital du har i dag, utan nya inbetalningar.
      </p>
    </fieldset>

    <fieldset data-anstalld>
      <legend>Kommande inbetalningar</legend>
      <label>Månadslön före skatt (kronor)
        <input name="manadslon" inputmode="numeric" placeholder="t.ex. 45 000">
      </label>
      <label>Andel till fondförsäkring, i procent (valfritt)
        <input name="andelFond" inputmode="numeric" placeholder="t.ex. 50">
      </label>
      <p class="hjalp">
        Står på avtalat.se under Pensionskapital → Placering av kommande
        inbetalningar. Högst 50 %, eftersom resten måste gå till traditionell
        försäkring. Lämnar du fältet tomt räknar vi med att allt går till
        traditionell försäkring.
      </p>
    </fieldset>

    <fieldset>
      <legend>Din ITP1 i dag</legend>
      <p class="hjalp">
        Logga in på avtalat.se. Första gången behöver du godkänna deras villkor.
        Ditt totala ITP1-kapital står på startsidan. Under Din tjänstepension
        → Pensionskapital ser du hos vilka bolag pengarna ligger.
      </p>
      <p class="hjalp">
        Är du osäker och orkar inte kolla? Välj att allt ligger i traditionell
        försäkring, så ser du hur illa det kan vara.
      </p>
      <div class="val">
        <label><input type="radio" name="lage" value="trad" checked>
          Allt ligger i traditionell försäkring</label>
        <label><input type="radio" name="lage" value="delar">
          Jag har flera olika pensionsbolag</label>
        <label><input type="radio" name="lage" value="ingen">
          Vi struntar i sparat kapital</label>
      </div>

      <p class="hjalp" data-lage="ingen" hidden>
        Vi räknar bara på det som betalas in från och med nu, utifrån din lön.
      </p>

      <div data-lage="trad">
        <label>Totalt ITP1-kapital
          <input name="total" inputmode="numeric" placeholder="t.ex. 400 000">
        </label>
        <p class="hjalp">
          Står det bara Alecta under Pensionskapital ligger allt i traditionell
          försäkring.
        </p>
      </div>

      <div data-lage="delar" hidden>
        <p class="hjalp">
          Skriv in varje försäkring under Pensionskapital. Allt hos Alecta är
          traditionell försäkring. Hos de andra bolagen klickar du på plustecknet
          för att se om det står Traditionell försäkring eller Fondförsäkring.
        </p>
        <div class="forsakringar"></div>
        <button type="button" class="lagg-till">+ Lägg till försäkring</button>
        <p class="summa" aria-live="polite"></p>
      </div>
    </fieldset>
  </form>

  <section class="resultat" aria-live="polite"></section>

  <details>
    <summary>Så har vi räknat</summary>
    <div class="parametrar"></div>
  </details>`;

const form = rot.querySelector("form");
const resultat = rot.querySelector(".resultat");

const kr = (x) => `${(Math.round(x / 1000) * 1000).toLocaleString("sv-SE")} kr`;
const krManad = (x) => `${(Math.round(x / 10) * 10).toLocaleString("sv-SE")} kr/mån`;
const procent = (x, decimaler = 0) =>
  `${(x * 100).toLocaleString("sv-SE", { maximumFractionDigits: decimaler })} %`;

// Accepts "45 000", "45000" and "45 000 kr".
function talFran(falt) {
  const varde = falt.value.replace(/[^\d]/g, "");
  return varde === "" ? null : Number(varde);
}
const tal = (namn) => talFran(form.elements[namn]);

// One row per insurance on avtalat.se: an amount and trad or fund. Each row's
// radio buttons need a name of their own.
const forsakringar = rot.querySelector(".forsakringar");
let radNummer = 0;
function laggTillRad() {
  radNummer += 1;
  const rad = document.createElement("div");
  rad.className = "rad";
  rad.innerHTML = `
    <input class="belopp-falt" inputmode="numeric" aria-label="Belopp i kronor" placeholder="Belopp">
    <span class="sparform">
      <label><input type="radio" name="sparform-${radNummer}" value="trad" checked> Trad</label>
      <label><input type="radio" name="sparform-${radNummer}" value="fond"> Fond</label>
    </span>
    <button type="button" class="ta-bort" aria-label="Ta bort försäkringen">✕</button>`;
  forsakringar.append(rad);
}

// Sums the rows into trad and fund, or null if no amount is filled in.
function lasRader() {
  let trad = 0;
  let fond = 0;
  let nagot = false;
  for (const rad of forsakringar.querySelectorAll(".rad")) {
    const belopp = talFran(rad.querySelector(".belopp-falt"));
    if (belopp === null) continue;
    nagot = true;
    if (rad.querySelector('input[value="fond"]').checked) fond += belopp;
    else trad += belopp;
  }
  return nagot ? { trad, fond } : null;
}

// Born before ITP1_FRAN_FODELSEAR: most of them have ITP2, so they get
// their own questions about ITP1.
function foreItp1() {
  const fodelsear = tal("fodelsear");
  return fodelsear !== null && fodelsear < ITP1_FRAN_FODELSEAR;
}

// Whether premiums come in from the current job. Those born before
// ITP1_FRAN_FODELSEAR answer it in their own box, unticked from the start.
function nyaPremier() {
  return foreItp1() ? form.elements.nuItp1.checked : form.elements.anstalld.checked;
}

function lasIndata() {
  const fodelsear = tal("fodelsear");
  // Without ITP1 in the current job no more premiums come in, which the
  // calculation handles as a salary of zero.
  const anstalld = nyaPremier();
  const manadslon = anstalld ? tal("manadslon") : 0;
  // An empty field means the user has made no choice, so everything goes to
  // trad. The percentage is of the whole premium, as avtalat.se shows it.
  const andelFond = anstalld ? tal("andelFond") : null;
  const andelPremieFond = andelFond === null ? null : andelFond / 100;

  let kapital = null;
  const lage = form.elements.lage.value;
  if (lage === "ingen") {
    kapital = { obligatoriskTrad: 0, flyttbarTrad: 0, flyttbarFond: 0 };
  } else if (lage === "trad") {
    const total = tal("total");
    if (total !== null) kapital = delaUppKapital(p, total, 0);
  } else {
    const rader = lasRader();
    if (rader) kapital = delaUppKapital(p, rader.trad, rader.fond);
  }
  return { fodelsear, manadslon, kapital, andelPremieFond };
}

function meddelande(text, klass = "") {
  resultat.innerHTML = `<div class="meddelande ${klass}">${text}</div>`;
}

let senaste = null;

function uppdatera() {
  const { fodelsear, manadslon, kapital, andelPremieFond } = lasIndata();
  senaste = null;
  visaSumma();

  if (fodelsear === null || manadslon === null || kapital === null) {
    meddelande(nyaPremier()
      ? "Fyll i födelseår, lön och ditt ITP1-kapital så räknar vi."
      : "Fyll i födelseår och ditt ITP1-kapital så räknar vi.");
    return;
  }
  if (manadslon === 0 && form.elements.lage.value === "ingen") {
    meddelande("Utan lön och utan sparat kapital finns det inget att räkna på.");
    return;
  }
  // Most people born before this year have ITP2, but some have ITP1, so we
  // ask instead of stopping.
  if (foreItp1() && !form.elements.nuItp1.checked && !form.elements.tidigareItp1.checked) {
    meddelande("Läs frågan under födelseåret. Kryssa i det som stämmer om du har ITP1, så räknar vi.");
    return;
  }
  const alder = new Date().getFullYear() - fodelsear;
  if (alder >= p.pensionsalder.varde || alder < 16) {
    meddelande("Kontrollera födelseåret.", "varning");
    return;
  }

  const indata = { alder, manadslon, kapital, andelPremieFond };
  const r = berakna(p, indata);
  senaste = { indata, r };
  visaResultat(indata, r);
}

function visaResultat(indata, r) {
  const s = r.scenarier;
  const pa = p.pensionsalder.varde;
  const harFond = indata.kapital.flyttbarFond > 0 || indata.andelPremieFond > 0;
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
      ? ", utan nya inbetalningar" : ""}${form.elements.lage.value === "ingen"
      ? ", bara på det som betalas in från och med nu" : ""}.</p>`);

  if (r.trafikljus) {
    const texter = {
      rod: `Du verkar inte ha flyttat något än. Hela vinsten, ${kr(r.kvarAttHamta)}, finns kvar att hämta.`,
      gul: `Du verkar redan ha fått ut ungefär ${procent(r.andelUppnadd)} av vinsten. ${kr(r.kvarAttHamta)} finns kvar att hämta.`,
      gron: "Du verkar redan ha flyttat det som går. Bra jobbat!",
    };
    delar.push(`<div class="meddelande trafikljus">
      <span class="lampa ${r.trafikljus}" aria-hidden="true"></span>
      <span>${texter[r.trafikljus]}</span></div>`);
  }

  if (r.privatFlytt !== null) {
    delar.push(`<h2>Som att spara själv</h2>
      <div class="nyckeltal">
        <div><div class="etikett">Att flytta allt som går motsvarar att du sparar</div>
          <div class="belopp">${krManad(r.privatFlytt)}</div></div>
        <div><div class="etikett">Om regeln togs bort och allt fick flyttas</div>
          <div class="belopp">${krManad(r.privatUtanRegeln)}</div></div>
      </div>
      <p class="hjalp">Per månad i en global indexfond på ISK, varje månad fram
        till ${pa} år, för samma pension efter skatt.</p>`);
  }

  // Where the user left something out we guess, and say so.
  const antaganden = [];
  if (form.elements.lage.value === "trad") {
    antaganden.push("Vi har räknat som om allt ditt kapital ligger i traditionell försäkring.");
  }
  if (indata.manadslon > 0 && indata.andelPremieFond === null) {
    antaganden.push(`Vi har antagit att alla dina nya inbetalningar går till traditionell
      försäkring. Har du valt fondförsäkring, fyll i det under Kommande inbetalningar.`);
  }
  if (harFond) {
    antaganden.push(`Vi ser inte vilka fonder du har valt. Vi räknar som om din
      fondförsäkring ligger i Länsförsäkringars entrélösning. Har du valt andra
      fonder kan det bli både bättre och sämre.`);
  }
  if (antaganden.length) {
    delar.push(`<div class="meddelande varning"><strong>Det här har vi antagit</strong>
      <ul>${antaganden.map((a) => `<li>${a}</li>`).join("")}</ul></div>`);
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
    <button type="button" class="ladda-ner">Ladda ner år för år (CSV)</button>`);

  resultat.innerHTML = delar.join("");
  resultat.querySelector(".ladda-ner").addEventListener("click", laddaNerCsv);
}

// Year-by-year table for every scenario and pot, for checking by hand, and
// the private saving that matches each gain; its last slutkapital is the
// gain after tax on the pension. Semicolons and decimal commas so Swedish
// Excel and Sheets read it directly.
function laddaNerCsv() {
  if (!senaste) return;
  const tal = (x) => (x === null ? "" : String(Math.round(x * 100) / 100).replace(".", ","));
  const rader = [["scenario", "ålder", "årslön", "ibb", "pott", "produkt", "aktieandel",
    "avkastning", "startkapital", "premie", "avgift", "skatt", "slutkapital"]];
  const alla = { ...senaste.r.scenarier, ...senaste.r.privatAr };
  for (const [scenario, { ar }] of Object.entries(alla)) {
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
  if (a.typ === "fast") return `${procent(a.andel)} aktier hela tiden`;
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

// Sum of the rows, to compare with the total capital on avtalat.se.
function visaSumma() {
  const summa = rot.querySelector(".summa");
  const rader = lasRader();
  // Exact kronor, not rounded, so the sum can be checked against avtalat.se.
  const exakt = (x) => `${x.toLocaleString("sv-SE")} kr`;
  summa.textContent = rader
    ? `Summa ${exakt(rader.trad + rader.fond)}, varav ${exakt(rader.trad)} i traditionell försäkring.`
    : "";
}

function visaParametrar() {
  const allmanna = Object.values(p).filter((post) => post && "varde" in post);
  const produkter = Object.values(p.produkter);
  rot.querySelector(".parametrar").innerHTML = `
    <p class="hjalp">Alla belopp är i dagens penningvärde, och avkastningen är
      real, det vill säga efter inflation. Vi räknar med väntevärden: utfallet
      kan bli både bättre och sämre.</p>
    <p class="hjalp">Avtalat.se visar bara om kapitalet ligger i traditionell
      försäkring eller fondförsäkring, inte hur stor del som måste ligga kvar i
      traditionell försäkring. Den delen har fått ${procent(p.andelObligatoriskTrad.varde)}
      av varje inbetalning, så vi räknar med att den är ${procent(p.andelObligatoriskTrad.varde)}
      av ditt totala kapital, men aldrig mer än det du har i traditionell
      försäkring. Har du haft fondförsäkring länge kan den delen vara något
      mindre, och vinsten med att flytta då något större.</p>
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
  const anstalld = nyaPremier();
  const fore = foreItp1();
  for (const el of form.querySelectorAll("[data-anstalld]")) el.hidden = !anstalld;
  for (const el of form.querySelectorAll("[data-fore-itp1]")) el.hidden = !fore;
  for (const el of form.querySelectorAll("[data-ej-fore-itp1]")) el.hidden = fore;
  // "Only today's capital" makes sense once the user has said they have
  // ITP1 without new payments.
  const utanPremier = !anstalld && (!fore || form.elements.tidigareItp1.checked);
  for (const el of form.querySelectorAll("[data-ej-anstalld]")) el.hidden = !utanPremier;
}

form.addEventListener("input", () => { visaLage(); uppdatera(); });
rot.querySelector(".lagg-till").addEventListener("click", () => {
  laggTillRad();
  forsakringar.lastElementChild.querySelector(".belopp-falt").focus();
});
forsakringar.addEventListener("click", (e) => {
  if (!e.target.closest(".ta-bort")) return;
  e.target.closest(".rad").remove();
  uppdatera();
});
// Three rows are enough for most people; more can be added.
for (let i = 0; i < 3; i++) laggTillRad();
form.addEventListener("submit", (e) => e.preventDefault());
visaLage();
visaParametrar();
uppdatera();
