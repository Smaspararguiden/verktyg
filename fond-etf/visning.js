// Display for the fund vs ETF cost comparison: draws the form into the page's
// .sg-fondetf element, reads it, calls the calculation module and renders the
// result as a chart and tables. Holds no numbers of its own; the form's
// starting values, the brokerage classes and "Så har vi räknat" all come from
// the parameter file.

// The modules are loaded with this file's own version query, as in the other
// tools, so a later WordPress upload is never mixed with cached modules.
const versionsfraga = new URL(import.meta.url).search;
const { parametrar: p } = await import(`./parametrar.js${versionsfraga}`);
const { berakna, courtage } = await import(`./berakning.js${versionsfraga}`);
const { html, procent, kronor } = await import(`./delat.js${versionsfraga}`);

const rot = document.querySelector(".sg-fondetf");

// Number text for the form's percentage fields, without the % sign.
const procenttal = (andel) =>
  (andel * 100).toLocaleString("sv-SE", { maximumFractionDigits: 3 });

const EGEN_PROCENT = "egen-procent";
const EGEN_FAST = "egen-fast";

const valCourtage = p.courtageklasser.varde
  .map((k) => `<option value="${html(k.id)}"${k.id === p.standardCourtage.varde ? " selected" : ""}>${html(k.namn)}</option>`)
  .join("") +
  `<option value="${EGEN_PROCENT}">Eget: procent med minimiavgift</option>` +
  `<option value="${EGEN_FAST}">Eget: fast avgift per affär</option>`;

rot.innerHTML = `
  <form autocomplete="off">
    <fieldset>
      <legend>Belopp</legend>
      <label>Hur mycket du köper för (kr)
        <input name="belopp" inputmode="numeric" value="${p.belopp.varde}">
      </label>
      <p class="hjalp">Vi räknar som om du köper allt på en gång och säljer allt när du tar ut pengarna.</p>
    </fieldset>
    <div class="sida-vid-sida">
      <fieldset>
        <legend>Fonden</legend>
        <label>Årlig avgift (%)
          <input name="fondAvgift" inputmode="decimal" value="${procenttal(p.fondAvgift.varde)}">
        </label>
        <p class="hjalp">Helst fondens totala kostnad. Annars årlig avgift eller förvaltningsavgift.
          Fonder köps och säljs utan courtage, spread och växling.</p>
      </fieldset>
      <fieldset>
        <legend>ETF:en</legend>
        <label>Årlig avgift (%)
          <input name="etfAvgift" inputmode="decimal" value="${procenttal(p.etfAvgift.varde)}">
        </label>
        <p class="hjalp">Helst total kostnad (TER). Annars årlig avgift eller förvaltningsavgift.</p>
        <label>Courtage
          <select name="courtageklass">${valCourtage}</select>
        </label>
        <div class="rad" data-egen-procent hidden>
          <label>Courtage (%)
            <input name="egenProcent" inputmode="decimal" value="0,25">
          </label>
          <label>Minst (kr)
            <input name="egenMinimum" inputmode="numeric" value="1">
          </label>
        </div>
        <label data-egen-fast hidden>Fast avgift per affär (kr)
          <input name="egenFast" inputmode="numeric" value="99">
        </label>
        <p class="hjalp" data-courtage-text></p>
        <label>Spread (%)
          <input name="spread" inputmode="decimal" value="${procenttal(p.spread.varde)}">
        </label>
        <p class="hjalp">Skillnaden mellan köp- och säljkurs. Halva betalar du när du köper, halva när du säljer.</p>
        <label class="kryss">
          <input type="checkbox" name="handlasISek">
          Handlas i SEK
        </label>
        <label data-vaxling>Valutaväxling (% per växling)
          <input name="valutavaxling" inputmode="decimal" value="${procenttal(p.valutavaxling.varde)}">
        </label>
        <p class="hjalp" data-vaxling>Dras både när du köper och när du säljer.
          ${html(procenttal(p.valutavaxling.varde))} % är automatisk växling hos Avanza och Nordnet.</p>
      </fieldset>
    </div>
  </form>

  <div data-meddelande></div>

  <section data-resultat>
    <h2>Genomsnittlig årlig kostnad</h2>
    <p class="slutsats" data-slutsats></p>
    <div class="forklaring">
      <span><i class="farg fond"></i>Fonden</span>
      <span><i class="farg etf"></i>ETF:en</span>
    </div>
    <div class="diagram" data-diagram></div>
    <p class="hjalp">Alla kostnader under innehavstiden delade med antalet år, som andel av beloppet.
      Håll muspekaren över diagrammet för att se ett visst år.</p>

    <h3>ETF:ens kostnader vid köp och försäljning</h3>
    <div class="tabell" data-engang></div>

    <details class="ar-for-ar">
      <summary>År för år</summary>
      <div class="tabell" data-ar></div>
    </details>
  </section>

  <details class="parametrar">
    <summary>Så har vi räknat</summary>
    <div data-parametrar></div>
  </details>
`;

const form = rot.querySelector("form");
const falt = (namn) => form.elements[namn];

// Reads a number typed the Swedish way: spaces, decimal comma.
function talFran(text) {
  const rensad = String(text).replace(/\s/g, "").replace(",", ".");
  if (rensad === "") return NaN;
  return Number(rensad);
}

// The brokerage class chosen in the form, as { procent, minimum }.
function valdKlass(fel) {
  const val = falt("courtageklass").value;
  rot.querySelector("[data-egen-procent]").hidden = val !== EGEN_PROCENT;
  rot.querySelector("[data-egen-fast]").hidden = val !== EGEN_FAST;
  if (val === EGEN_PROCENT) {
    const procentVarde = talFran(falt("egenProcent").value) / 100;
    const minimum = talFran(falt("egenMinimum").value);
    if (!Number.isFinite(procentVarde) || procentVarde < 0 || procentVarde > 0.05) fel.push("courtaget i procent");
    if (!Number.isFinite(minimum) || minimum < 0) fel.push("minsta courtage");
    return { procent: procentVarde, minimum };
  }
  if (val === EGEN_FAST) {
    const fast = talFran(falt("egenFast").value);
    if (!Number.isFinite(fast) || fast < 0) fel.push("det fasta courtaget");
    return { procent: 0, minimum: fast };
  }
  return p.courtageklasser.varde.find((k) => k.id === val);
}

function lasIndata() {
  const fel = [];
  const pr = (namn, etikett, max) => {
    const v = talFran(falt(namn).value) / 100;
    if (!Number.isFinite(v) || v < 0 || v > max) fel.push(etikett);
    return v;
  };
  const belopp = talFran(falt("belopp").value);
  if (!Number.isFinite(belopp) || belopp <= 0) fel.push("beloppet");
  const handlasISek = falt("handlasISek").checked;
  for (const el of rot.querySelectorAll("[data-vaxling]")) el.hidden = handlasISek;
  const indata = {
    belopp,
    fondAvgift: pr("fondAvgift", "fondens avgift", 0.05),
    etfAvgift: pr("etfAvgift", "ETF:ens avgift", 0.05),
    courtage: valdKlass(fel),
    spread: pr("spread", "spreaden", 0.1),
    valutavaxling: handlasISek ? 0 : pr("valutavaxling", "valutaväxlingen", 0.05),
    handlasISek,
  };
  return { indata, fel };
}

function courtageText(klass, belopp) {
  const regel = klass.procent === 0
    ? `${kronor(klass.minimum)} per affär`
    : `${procent(klass.procent, 3)}, minst ${kronor(klass.minimum)} per affär`;
  if (!Number.isFinite(belopp) || belopp <= 0) return regel + ".";
  return `${regel}. För ditt belopp blir det ${kronor(courtage(klass, belopp))} när du köper och lika mycket när du säljer.`;
}

function slutsats(resultat) {
  const ar = resultat.brytpunkt;
  const horisont = p.antalAr.varde;
  if (ar === null) return "ETF:en har lika hög eller högre årlig avgift än fonden, så den blir aldrig billigare.";
  if (ar === 1) return "ETF:en är billigare än fonden redan första året.";
  if (ar > horisont) return `Fonden är billigare i alla ${horisont} år. Med de här siffrorna blir ETF:en billigare först efter ${ar} år.`;
  return `Fonden är billigare om du säljer inom ${ar - 1} år. Behåller du ETF:en i ${ar} år eller längre är den billigare.`;
}

// A round step for the y axis that gives about five gridlines.
function steg(max) {
  const grov = max / 5;
  const tiopotens = 10 ** Math.floor(Math.log10(grov));
  const multipel = [1, 2, 2.5, 5, 10].find((m) => m * tiopotens >= grov);
  return multipel * tiopotens;
}

// Line chart of the average yearly cost, both series on one percentage axis.
// The chart is drawn at the width of its box, so its text keeps its size on a
// phone instead of shrinking with the picture.
let B = 640, H = 300;
function anpassaStorlek(behallare) {
  B = Math.max(300, Math.round(behallare.clientWidth || 640));
  H = B < 500 ? 240 : 300;
}
const M = { v: 56, h: 64, o: 12, u: 42 };

// Scales from year and share to chart coordinates, shared by the chart and
// its hover layer.
function skala(ar) {
  const n = ar.length;
  const maxVarde = Math.max(...ar.flatMap((r) => [r.fond, r.etf]));
  const ystep = steg(maxVarde || 0.001);
  const ymax = Math.ceil(maxVarde / ystep) * ystep || ystep;
  return {
    n, ystep, ymax,
    x: (t) => M.v + ((t - 1) / Math.max(n - 1, 1)) * (B - M.v - M.h),
    y: (v) => M.o + (1 - v / ymax) * (H - M.o - M.u),
  };
}

function diagram(ar) {
  const { n, ystep, ymax, x, y } = skala(ar);

  const decimaler = ystep < 0.0001 ? 3 : 2;
  let rutnat = "";
  for (let v = 0; v <= ymax + ystep / 2; v += ystep) {
    rutnat += `<line class="rutnat" x1="${M.v}" x2="${B - M.h}" y1="${y(v)}" y2="${y(v)}"/>
      <text class="axel" x="${M.v - 8}" y="${y(v) + 4}" text-anchor="end">${procent(v, decimaler)}</text>`;
  }
  const xetiketter = ar.filter((r) => r.ar === 1 || r.ar % 5 === 0)
    .map((r) => `<text class="axel" x="${x(r.ar)}" y="${H - M.u + 18}" text-anchor="middle">${r.ar}</text>`).join("");
  const linje = (nyckel) => ar.map((r, i) => `${i ? "L" : "M"}${x(r.ar).toFixed(1)},${y(r[nyckel]).toFixed(1)}`).join("");

  // Direct labels at the right end, pushed apart if the lines end close.
  const sista = ar[n - 1];
  let yFond = y(sista.fond), yEtf = y(sista.etf);
  if (Math.abs(yFond - yEtf) < 14) {
    const mitt = (yFond + yEtf) / 2, upp = sista.fond >= sista.etf;
    yFond = mitt + (upp ? -7 : 7);
    yEtf = mitt + (upp ? 7 : -7);
  }

  return `<svg viewBox="0 0 ${B} ${H}" role="img" aria-label="Genomsnittlig årlig kostnad för fonden och ETF:en, år 1 till ${n}. Siffrorna finns i tabellen år för år.">
    ${rutnat}
    <line class="baslinje" x1="${M.v}" x2="${B - M.h}" y1="${y(0)}" y2="${y(0)}"/>
    ${xetiketter}
    <text class="axel" x="${(M.v + B - M.h) / 2}" y="${H - 2}" text-anchor="middle">År</text>
    <path class="linje fond" d="${linje("fond")}"/>
    <path class="linje etf" d="${linje("etf")}"/>
    <text class="etikett" x="${B - M.h + 8}" y="${yFond + 4}">Fonden</text>
    <text class="etikett" x="${B - M.h + 8}" y="${yEtf + 4}">ETF:en</text>
    <g class="markor" hidden>
      <line class="sikte" y1="${M.o}" y2="${H - M.u}"/>
      <circle class="punkt fond" r="4.5"/>
      <circle class="punkt etf" r="4.5"/>
    </g>
    <rect class="traffyta" x="${M.v}" y="${M.o}" width="${B - M.v - M.h}" height="${H - M.o - M.u}"/>
  </svg>
  <div class="tips" hidden></div>`;
}

// Crosshair and tooltip: the year nearest the pointer.
function kopplaHovring(behallare, ar) {
  const svg = behallare.querySelector("svg");
  const markor = svg.querySelector(".markor");
  const tips = behallare.querySelector(".tips");
  const ytan = svg.querySelector(".traffyta");
  const { n, x, y } = skala(ar);

  ytan.addEventListener("pointermove", (e) => {
    const ruta = svg.getBoundingClientRect();
    const sx = ((e.clientX - ruta.left) / ruta.width) * B;
    const t = Math.min(n, Math.max(1, Math.round(1 + ((sx - M.v) / (B - M.v - M.h)) * (n - 1))));
    const r = ar[t - 1];
    // SVG elements have no hidden property, only the attribute.
    markor.removeAttribute("hidden");
    const sikte = markor.querySelector(".sikte");
    sikte.setAttribute("x1", x(t));
    sikte.setAttribute("x2", x(t));
    for (const [klass, varde] of [["fond", r.fond], ["etf", r.etf]]) {
      const c = markor.querySelector(`.punkt.${klass}`);
      c.setAttribute("cx", x(t));
      c.setAttribute("cy", y(varde));
    }
    tips.innerHTML = `<strong>${t} år</strong><br>
      <i class="farg fond"></i>Fonden ${procent(r.fond, 3)} (${kronor(r.fondKronor)})<br>
      <i class="farg etf"></i>ETF:en ${procent(r.etf, 3)} (${kronor(r.etfKronor)})`;
    tips.hidden = false;
    const px = (x(t) / B) * ruta.width;
    const vanster = px > ruta.width / 2;
    tips.style.left = vanster ? "" : `${px + 12}px`;
    tips.style.right = vanster ? `${ruta.width - px + 12}px` : "";
  });
  ytan.addEventListener("pointerleave", () => {
    markor.setAttribute("hidden", "");
    tips.hidden = true;
  });
}

function engangTabell(engang, belopp) {
  const rad = (namn, kop, salj) => `<tr><td>${namn}</td><td>${kronor(kop)}</td><td>${kronor(salj)}</td><td>${kronor(kop + salj)}</td></tr>`;
  return `<table>
    <thead><tr><th></th><th>Vid köp</th><th>Vid försäljning</th><th>Totalt</th></tr></thead>
    <tbody>
      ${rad("Courtage", engang.courtageKop, engang.courtageSalj)}
      ${rad("Halva spreaden", engang.spreadKop, engang.spreadSalj)}
      ${rad("Valutaväxling", engang.vaxlingKop, engang.vaxlingSalj)}
      <tr class="summa"><td>Summa</td><td>${kronor(engang.courtageKop + engang.spreadKop + engang.vaxlingKop)}</td>
        <td>${kronor(engang.courtageSalj + engang.spreadSalj + engang.vaxlingSalj)}</td>
        <td>${kronor(engang.totalt)} (${procent(engang.totalt / belopp, 2)})</td></tr>
    </tbody></table>`;
}

function arTabell(ar, brytar) {
  const rader = ar.map((r) => `<tr${r.ar === brytar ? ' class="brytpunkt"' : ""}>
    <td>${r.ar}</td>
    <td class="${r.fond < r.etf ? "vinner" : ""}">${procent(r.fond, 3)}</td><td>${kronor(r.fondKronor)}</td>
    <td class="${r.etf <= r.fond ? "vinner" : ""}">${procent(r.etf, 3)}</td><td>${kronor(r.etfKronor)}</td>
  </tr>`).join("");
  return `<table>
    <thead><tr><th>År</th><th>Fonden per år</th><th>Fonden totalt</th><th>ETF:en per år</th><th>ETF:en totalt</th></tr></thead>
    <tbody>${rader}</tbody></table>`;
}

function uppdatera() {
  const { indata, fel } = lasIndata();
  if (indata.courtage && !fel.length) {
    rot.querySelector("[data-courtage-text]").textContent = courtageText(indata.courtage, indata.belopp);
  }
  const meddelande = rot.querySelector("[data-meddelande]");
  const resultat = rot.querySelector("[data-resultat]");
  if (fel.length) {
    meddelande.innerHTML = `<p class="meddelande varning">Kontrollera ${html(fel.join(", "))}.</p>`;
    resultat.hidden = true;
    return;
  }
  meddelande.innerHTML = "";
  resultat.hidden = false;

  const r = berakna(p, indata);
  rot.querySelector("[data-slutsats]").textContent = slutsats(r);
  const behallare = rot.querySelector("[data-diagram]");
  anpassaStorlek(behallare);
  behallare.innerHTML = diagram(r.ar);
  kopplaHovring(behallare, r.ar);
  rot.querySelector("[data-engang]").innerHTML = engangTabell(r.engang, indata.belopp);
  rot.querySelector("[data-ar]").innerHTML = arTabell(r.ar, r.brytpunkt);
}

// "Så har vi räknat": renders the parameter file as it is.
function formateraVarde(post) {
  if (post === p.courtageklasser) {
    return post.varde.map((k) => html(`${k.namn}: ${k.procent === 0
      ? `${kronor(k.minimum)} per affär`
      : `${procent(k.procent, 3)}, minst ${kronor(k.minimum)}`}`)).join("<br>");
  }
  if (post === p.standardCourtage) {
    return html(p.courtageklasser.varde.find((k) => k.id === post.varde).namn);
  }
  if (post.enhet === "kr") return html(kronor(post.varde));
  if (post.enhet === "år") return html(`${post.varde} år`);
  return html(`${procent(post.varde, 3)} ${post.enhet}`);
}

function visaParametrar() {
  const rader = Object.values(p).map((post) => `<tr>
    <td>${html(post.beskrivning)}<br><span class="kalla">Källa: ${html(post.kalla)}</span></td>
    <td>${formateraVarde(post)}</td>
  </tr>`).join("");
  rot.querySelector("[data-parametrar]").innerHTML = `
    <p>Vi räknar som om innehavet inte växer, så att alla kostnader kan läggas
      ihop i kronor. Fonden kostar bara sin årliga avgift. ETF:en kostar sin
      årliga avgift plus courtage, halva spreaden och valutaväxling, både när
      den köps och när den säljs. Den genomsnittliga årliga kostnaden är
      summan av allt delad med beloppet och antalet år.</p>
    <table><tbody>${rader}</tbody></table>`;
}

form.addEventListener("input", uppdatera);
form.addEventListener("change", uppdatera);
// Redraw when the box changes width, but only then.
let senasteBredd = 0;
new ResizeObserver(([post]) => {
  const bredd = Math.round(post.contentRect.width);
  if (bredd && bredd !== senasteBredd) {
    senasteBredd = bredd;
    uppdatera();
  }
}).observe(rot.querySelector("[data-diagram]"));
visaParametrar();
uppdatera();
