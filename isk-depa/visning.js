// Display for the ISK vs depå simulator: draws the form into the page's
// .sg-iskdepa element, reads it, calls the calculation module and renders the
// result. Holds no numbers of its own; the form's starting values, the
// scenarios and "Så har vi räknat" all come from the parameter file.

// The modules are loaded with this file's own version query, as in the ITP
// calculator, so a later WordPress upload is never mixed with cached modules.
const versionsfraga = new URL(import.meta.url).search;
const { parametrar: p } = await import(`./parametrar.js${versionsfraga}`);
const { aktieandelSammaRisk, berakna, egenBerakning, forstaAretDepaBattre } =
  await import(`./berakning.js${versionsfraga}`);
const { html, procent, kronor } = await import(`./delat.js${versionsfraga}`);

const rot = document.querySelector(".sg-iskdepa");

// Number text for the form's percentage fields, without the % sign.
const procenttal = (andel, decimaler = 2) =>
  (andel * 100).toLocaleString("sv-SE", { maximumFractionDigits: decimaler });

const valForlust = p.statensAndelAvForlust.alternativ
  .map((a) => `<option value="${a.varde}"${a.varde === p.statensAndelAvForlust.varde ? " selected" : ""}>${html(a.text)}</option>`)
  .join("");
const valScenario = p.scenarier.varde
  .map((s, i) => `<option value="${i}">${html(s.namn)}</option>`)
  .join("");

rot.innerHTML = `
  <form autocomplete="off">
    <fieldset>
      <legend>Sparandet</legend>
      <label>Startbelopp (kr)
        <input name="startbelopp" inputmode="numeric" value="${p.startbelopp.varde}">
      </label>
      <label>Månadssparande (kr)
        <input name="manadssparande" inputmode="numeric" value="${p.manadssparande.varde}">
      </label>
      <label class="kryss">
        <input type="checkbox" name="medFribelopp">
        Räkna med fribeloppet på ISK (${kronor(p.fribelopp.varde)})
      </label>
      <p class="hjalp">Bara om du inte har något annat på ISK eller i kapitalförsäkring.
        Utan bocken räknar vi på kronor över fribeloppet.</p>
      <label class="kryss">
        <input type="checkbox" name="fonder" checked>
        Depån innehåller fonder (fondskatt ${procent(p.fondSchablon.varde * p.skattesatsKapital.varde, 2)} per år)
      </label>
    </fieldset>
    <fieldset>
      <legend>Skatter och räntor</legend>
      <label>ISK-skatt (% av kapitalunderlaget)
        <input name="iskSkattesats" inputmode="decimal" value="${procenttal(p.iskSkattesats.varde, 3)}">
      </label>
      <p class="hjalp" data-iskskatt></p>
      <label>Fondens totala avgift per år (%)
        <input name="avgift" inputmode="decimal" value="${procenttal(p.fondavgift.varde)}">
      </label>
      <label>Ränta på sparkonto (%)
        <input name="kontoranta" inputmode="decimal" value="${procenttal(p.kontoranta.varde)}">
      </label>
      <label class="kryss">
        <input type="checkbox" name="iskSkattKvartal">
        Exakt ISK-skatt: Skatteverkets snitt av fyra kvartalsvärden plus årets insättningar
      </label>
      <label class="kryss">
        <input type="checkbox" name="avgiftManadsvis">
        Exakt avgift: dras varje månad på det aktuella värdet
      </label>
      <p class="hjalp">Utan bockarna räknas både ISK-skatten och avgiften på värdet 1 januari.</p>
      <label>Hur stor del av en förlust på depån staten står för
        <select name="statensAndelAvForlust">${valForlust}</select>
      </label>
    </fieldset>
    <fieldset>
      <legend>Egen beräkning</legend>
      <div class="rad">
        <label>Avkastning första året (%)
          <input name="egenForstaAret" inputmode="decimal" value="${procenttal(p.scenarier.varde[0].forstaAret)}">
        </label>
        <label>Avkastning övriga år (%)
          <input name="egenOvrigaAr" inputmode="decimal" value="${procenttal(p.scenarier.varde[0].ovrigaAr)}">
        </label>
        <label>Tidshorisont (år)
          <input name="egenAntalAr" inputmode="numeric" value="${Math.max(...p.horisonter.varde)}">
        </label>
      </div>
      <p class="hjalp">Nominell avkastning på aktierna per år, före fondens avgift.</p>
      <div class="rad">
        <label>Aktieandel på ISK (%)
          <input name="egenAndelIsk" inputmode="decimal" value="${procenttal(p.aktieandelSammaPengar.varde)}">
        </label>
        <label>Aktieandel på depån (%)
          <input name="egenAndelDepa" inputmode="decimal" value="${procenttal(p.aktieandelSammaPengar.varde)}">
        </label>
      </div>
      <p class="hjalp" data-egen-risk></p>
    </fieldset>
    <fieldset>
      <legend>Jämförelsen samma risk</legend>
      <label>Aktieandel på ISK (%)
        <input name="aktieandelIsk" inputmode="decimal" value="${procenttal(p.aktieandelIskSammaRisk.varde)}">
      </label>
      <p class="hjalp">Resten står på sparkonto, i båda jämförelserna.</p>
    </fieldset>
  </form>

  <div data-meddelande></div>

  <section data-resultat>
    <h2>Egen beräkning, år för år</h2>
    <p class="brytar" data-brytar></p>
    <p data-text-egen></p>
    <div class="tabell" data-tabell-egen></div>

    <h2>Samma pengar</h2>
    <p data-text-pengar></p>
    <div class="tabell" data-tabell-pengar></div>

    <h2>Samma risk</h2>
    <p data-text-risk></p>
    <div class="tabell" data-tabell-risk></div>

    <h2>År för år</h2>
    <div class="rad">
      <label>Scenario <select name="arScenario">${valScenario}</select></label>
      <label>Jämförelse
        <select name="arJamforelse">
          <option value="sammaPengar">Samma pengar</option>
          <option value="sammaRisk">Samma risk</option>
        </select>
      </label>
    </div>
    <div class="tabell" data-tabell-ar></div>
  </section>

  <details class="parametrar">
    <summary>Så har vi räknat</summary>
    <div data-parametrar></div>
  </details>
`;

const form = rot.querySelector("form");
const falt = (namn) => form.elements[namn];
let senaste = null;

// Reads a number typed the Swedish way: spaces, decimal comma.
function talFran(text) {
  const rensad = String(text).replace(/\s/g, "").replace(",", ".");
  if (rensad === "") return NaN;
  return Number(rensad);
}

function lasIndata() {
  const fel = [];
  const kr = (namn, etikett) => {
    const v = talFran(falt(namn).value);
    if (!Number.isFinite(v) || v < 0) fel.push(etikett);
    return v;
  };
  const pr = (namn, etikett, min, max) => {
    const v = talFran(falt(namn).value) / 100;
    if (!Number.isFinite(v) || v < min || v > max) fel.push(etikett);
    return v;
  };
  const indata = {
    startbelopp: kr("startbelopp", "startbelopp"),
    manadssparande: kr("manadssparande", "månadssparande"),
    iskSkattesats: pr("iskSkattesats", "ISK-skatten", 0, 0.1),
    kontoranta: pr("kontoranta", "räntan på sparkonto", -0.05, 0.2),
    avgift: pr("avgift", "fondens avgift", 0, 0.05),
    aktieandelIsk: pr("aktieandelIsk", "aktieandelen på ISK", 0, 1),
    statensAndelAvForlust: Number(falt("statensAndelAvForlust").value),
    medFribelopp: falt("medFribelopp").checked,
    fonder: falt("fonder").checked,
    iskSkattKvartal: falt("iskSkattKvartal").checked,
    avgiftManadsvis: falt("avgiftManadsvis").checked,
  };
  if (!fel.length && indata.startbelopp + indata.manadssparande <= 0) {
    fel.push("startbelopp eller månadssparande");
  }
  const antalAr = talFran(falt("egenAntalAr").value);
  if (!Number.isInteger(antalAr) || antalAr < 1 || antalAr > 60) fel.push("tidshorisonten (1–60 år)");
  const egen = {
    forstaAret: pr("egenForstaAret", "avkastningen första året", -1, 1),
    ovrigaAr: pr("egenOvrigaAr", "avkastningen övriga år", -1, 1),
    antalAr,
    andelIsk: pr("egenAndelIsk", "aktieandelen på ISK i egen beräkning", 0, 1),
    andelDepa: pr("egenAndelDepa", "aktieandelen på depån i egen beräkning", 0, 1),
  };
  return { indata, egen, fel };
}

// The user's own run, year by year, with both totals also in today's money.
// The row of brytar (the first year the depå leaves more) is in bold.
function egenTabell(rader, brytar) {
  const tabellrader = rader.map((r) => {
    const skillnad = (r.depaTotalt - r.iskTotalt) / r.iskTotalt;
    const depaVinner = r.depaTotalt > r.iskTotalt;
    const iskMinusDepa = r.iskTotalt - r.depaTotalt;
    return `<tr${r.ar === brytar ? ' class="brytar"' : ""}>
      <td>${r.ar}</td>
      <td>${kronor(r.insatt)}</td>
      <td>${kronor(r.iskSkatt)}</td>
      <td class="${depaVinner ? "" : "vinner"}">${kronor(r.iskTotalt)}</td>
      <td>${kronor(r.iskIDagensPengar)}</td>
      <td>${kronor(r.fondskatt)}</td>
      <td>${kronor(r.skattForsaljning)}</td>
      <td class="${depaVinner ? "vinner" : ""}">${kronor(r.depaTotalt)}</td>
      <td>${kronor(r.depaIDagensPengar)}</td>
      <td>${iskMinusDepa >= 0 ? "+" : "−"}${kronor(Math.abs(iskMinusDepa))}</td>
      <td>${Number.isFinite(skillnad) ? `${skillnad >= 0 ? "+" : "−"}${procent(Math.abs(skillnad), 1)}` : "–"}</td>
    </tr>`;
  }).join("");
  const real = `i dagens penningvärde givet ${procent(p.inflation.varde, 1)} inflation`;
  return `<table>
    <thead><tr>
      <th>År</th><th>Insatt</th><th>ISK-skatt</th><th>ISK + sparkonto</th>
      <th>ISK ${real}</th><th>Fondskatt</th><th>Skatt vid försäljning</th>
      <th>Depå + sparkonto efter försäljning</th><th>Depå ${real}</th>
      <th>ISK + sparkonto − depå + sparkonto</th><th>Depå mot ISK</th>
    </tr></thead><tbody>${tabellrader}</tbody></table>`;
}

// One table: scenarios down, horizons across, both portfolios in each cell.
function tabell(jamforelse) {
  const huvud = p.horisonter.varde.map((h) => `<th>${h} år</th>`).join("");
  const rader = jamforelse.scenarier.map((s) => {
    const celler = s.horisonter.map((h) => {
      const depaVinner = h.depa > h.isk;
      const skillnad = (h.depa - h.isk) / h.isk;
      return `<td>
        <span class="${depaVinner ? "" : "vinner"}">ISK ${kronor(h.isk)}</span><br>
        <span class="${depaVinner ? "vinner" : ""}">Depå ${kronor(h.depa)}</span><br>
        <span class="skillnad">Depå ${skillnad >= 0 ? "+" : "−"}${procent(Math.abs(skillnad), 1)}</span>
      </td>`;
    }).join("");
    return `<tr><th>${html(s.namn)}</th>${celler}</tr>`;
  }).join("");
  return `<table><thead><tr><th>Scenario</th>${huvud}</tr></thead><tbody>${rader}</tbody></table>`;
}

function arTabell() {
  if (!senaste) return;
  const jamforelse = senaste[rot.querySelector("[name=arJamforelse]").value];
  const index = Number(rot.querySelector("[name=arScenario]").value);
  const ar = jamforelse.scenarier[index].ar;
  const rader = ar.map((r) => `<tr>
    <td>${r.ar}</td>
    <td>${kronor(r.insatt)}</td>
    <td>${kronor(r.iskSkatt)}</td>
    <td>${kronor(r.iskTotalt)}</td>
    <td>${kronor(r.fondskatt)}</td>
    <td>${kronor(r.depa + r.kontoDepa)}</td>
    <td>${kronor(r.skattForsaljning)}</td>
    <td>${kronor(r.depaTotalt)}</td>
  </tr>`).join("");
  rot.querySelector("[data-tabell-ar]").innerHTML = `<table>
    <thead><tr>
      <th>År</th><th>Insatt</th><th>ISK-skatt</th><th>ISK + sparkonto</th>
      <th>Fondskatt</th><th>Depå + sparkonto före försäljning</th>
      <th>Skatt vid försäljning</th><th>Depå + sparkonto efter försäljning</th>
    </tr></thead><tbody>${rader}</tbody></table>`;
}

function uppdatera() {
  const { indata, egen, fel } = lasIndata();
  const meddelande = rot.querySelector("[data-meddelande]");
  const resultat = rot.querySelector("[data-resultat]");
  if (fel.length) {
    meddelande.innerHTML = `<p class="meddelande varning">Kontrollera ${html(fel.join(", "))}.</p>`;
    resultat.hidden = true;
    return;
  }
  meddelande.innerHTML = "";
  resultat.hidden = false;

  rot.querySelector("[data-iskskatt]").textContent = indata.iskSkattKvartal
    ? "Kapitalunderlaget är Skatteverkets snitt av kvartalsvärden plus årets insättningar."
    : "Kapitalunderlaget är ISK:ns värde 1 januari.";

  const risk = aktieandelSammaRisk(egen.andelIsk, indata.statensAndelAvForlust);
  rot.querySelector("[data-egen-risk]").textContent = risk.begransad
    ? `Samma risk som ${procent(egen.andelIsk, 0)} på ISK skulle kräva mer än 100 % aktier på depån.`
    : `Samma risk som ${procent(egen.andelIsk, 0)} på ISK är ${procent(risk.andel, 1)} på depån, med den valda andelen staten står för.`;
  rot.querySelector("[data-text-egen]").textContent =
    `Resten står på sparkonto. Depån visas som om den säljs i slutet av året. Värdena gäller 31 december varje år.`;
  const egnaRader = egenBerakning(p, indata, egen);
  const brytar = forstaAretDepaBattre(egnaRader);
  rot.querySelector("[data-brytar]").textContent = brytar === null
    ? `Depån ger inte mer kvar efter skatt än ISK någon gång under ${egen.antalAr} år i din egen beräkning.`
    : brytar === 1
      ? `Depån ger mer kvar efter skatt än ISK redan första året i din egen beräkning.`
      : `Det tar ${brytar} år innan depån ger mer kvar efter skatt än ISK i din egen beräkning.`;
  rot.querySelector("[data-tabell-egen]").innerHTML = egenTabell(egnaRader, brytar);

  senaste = berakna(p, indata);
  const { sammaPengar, sammaRisk } = senaste;

  rot.querySelector("[data-text-pengar]").textContent =
    `${procent(sammaPengar.andelIsk, 0)} aktier på både ISK och depå. Värdet efter skatt om allt säljs efter så många år.`;
  rot.querySelector("[data-tabell-pengar]").innerHTML = tabell(sammaPengar);

  rot.querySelector("[data-text-risk]").textContent = sammaRisk.begransad
    ? `${procent(sammaRisk.andelIsk, 0)} aktier på ISK. För samma risk skulle depån behöva mer än 100 % aktier, alltså lån, så den har 100 % och därmed lägre risk än ISK.`
    : `${procent(sammaRisk.andelIsk, 0)} aktier på ISK mot ${procent(sammaRisk.andelDepa, 0)} på depån. Staten står för en del av en förlust på depån, så depån kan ha mer aktier med samma risk efter skatt.`;
  rot.querySelector("[data-tabell-risk]").innerHTML = tabell(sammaRisk);

  arTabell();
}

// "Så har vi räknat": renders the parameter file as it is.
function formateraVarde(post) {
  if (post === p.scenarier) {
    return post.varde.map((s) => s.forstaAret === s.ovrigaAr
      ? `${html(s.namn)}: ${procent(s.ovrigaAr, 2)}`
      : `${html(s.namn)}: ${procent(s.forstaAret, 2)} år 1, sedan ${procent(s.ovrigaAr, 2)}`).join("<br>");
  }
  if (post === p.horisonter) return post.varde.join(", ") + " år";
  if (post.enhet === "kr" || post.enhet === "kr/mån") return html(kronor(post.varde) + (post.enhet === "kr/mån" ? "/mån" : ""));
  const enhet = post.enhet === "andel" ? "" : ` ${post.enhet}`;
  return html(`${procent(post.varde, 3)}${enhet}`);
}

function visaParametrar() {
  const rader = Object.values(p).map((post) => `<tr>
    <td>${html(post.beskrivning)}<br><span class="kalla">Källa: ${html(post.kalla)}</span></td>
    <td>${formateraVarde(post)}</td>
  </tr>`).join("");
  rot.querySelector("[data-parametrar]").innerHTML = `
    <p>Allt räknas månad för månad i nominella kronor. Skatterna dras i slutet
      av varje år från kontot de gäller. ISK-skatten och fondens avgift räknar
      vi förenklat på värdet 1 januari, om du inte bockar för de exakta sätten:
      Skatteverkets snitt av fyra kvartalsvärden och årets insättningar, och
      avgiften dragen varje månad.
      Depån säljs och vinsten beskattas
      vid varje tidshorisont. Utdelningar räknar vi inte med: fonderna antas
      återinvestera dem.</p>
    <table><tbody>${rader}</tbody></table>`;
}

form.addEventListener("input", uppdatera);
form.addEventListener("change", uppdatera);
rot.querySelector("[name=arScenario]").addEventListener("change", arTabell);
rot.querySelector("[name=arJamforelse]").addEventListener("change", arTabell);
visaParametrar();
uppdatera();
