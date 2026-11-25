// Display for the ISK vs depå simulator: draws the form into the page's
// .sg-iskdepa element, reads it, calls the calculation module and renders the
// result. Holds no numbers of its own; the form's starting values, the
// scenarios and "Så har vi räknat" all come from the parameter file.

// The modules are loaded with this file's own version query, as in the ITP
// calculator, so a later WordPress upload is never mixed with cached modules.
const versionsfraga = new URL(import.meta.url).search;
const { parametrar: p } = await import(`./parametrar.js${versionsfraga}`);
const { berakna, schablonranta } = await import(`./berakning.js${versionsfraga}`);

const rot = document.querySelector(".sg-iskdepa");

const procent = (andel, decimaler = 2) =>
  (andel * 100).toLocaleString("sv-SE", { maximumFractionDigits: decimaler });
const kronor = (belopp) =>
  Math.round(belopp).toLocaleString("sv-SE") + " kr";
const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

const valForlust = p.statensAndelAvForlust.alternativ
  .map((a) => `<option value="${a.varde}"${a.varde === p.statensAndelAvForlust.varde ? " selected" : ""}>${escape(a.text)}</option>`)
  .join("");
const valScenario = p.scenarier.varde
  .map((s, i) => `<option value="${i}">${escape(s.namn)}</option>`)
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
        Depån innehåller fonder (fondskatt ${procent(p.fondSchablon.varde * p.skattesatsKapital.varde)} % per år)
      </label>
    </fieldset>
    <fieldset>
      <legend>Skatter och räntor</legend>
      <label>Statslåneräntan 30 november året före (%)
        <input name="statslanerantan" inputmode="decimal" value="${procent(p.statslanerantan.varde)}">
      </label>
      <p class="hjalp" data-iskskatt></p>
      <label>Ränta på sparkonto (%)
        <input name="kontoranta" inputmode="decimal" value="${procent(p.kontoranta.varde)}">
      </label>
      <label>Hur stor del av en förlust på depån staten står för
        <select name="statensAndelAvForlust">${valForlust}</select>
      </label>
    </fieldset>
    <fieldset>
      <legend>Jämförelsen samma risk</legend>
      <label>Aktieandel på ISK (%)
        <input name="aktieandelIsk" inputmode="decimal" value="${procent(p.aktieandelIskSammaRisk.varde)}">
      </label>
      <p class="hjalp">Resten står på sparkonto, i båda jämförelserna.</p>
    </fieldset>
  </form>

  <div data-meddelande></div>

  <section data-resultat>
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
    statslanerantan: pr("statslanerantan", "statslåneräntan", -0.05, 0.2),
    kontoranta: pr("kontoranta", "räntan på sparkonto", -0.05, 0.2),
    aktieandelIsk: pr("aktieandelIsk", "aktieandelen på ISK", 0, 1),
    statensAndelAvForlust: Number(falt("statensAndelAvForlust").value),
    medFribelopp: falt("medFribelopp").checked,
    fonder: falt("fonder").checked,
  };
  if (!fel.length && indata.startbelopp + indata.manadssparande <= 0) {
    fel.push("startbelopp eller månadssparande");
  }
  return { indata, fel };
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
        <span class="skillnad">Depå ${skillnad >= 0 ? "+" : "−"}${procent(Math.abs(skillnad), 1)} %</span>
      </td>`;
    }).join("");
    return `<tr><th>${escape(s.namn)}</th>${celler}</tr>`;
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
  const { indata, fel } = lasIndata();
  const meddelande = rot.querySelector("[data-meddelande]");
  const resultat = rot.querySelector("[data-resultat]");
  if (fel.length) {
    meddelande.innerHTML = `<p class="meddelande varning">Kontrollera ${escape(fel.join(", "))}.</p>`;
    resultat.hidden = true;
    return;
  }
  meddelande.innerHTML = "";
  resultat.hidden = false;

  const ranta = schablonranta(p, indata.statslanerantan);
  rot.querySelector("[data-iskskatt]").textContent =
    `Det ger schablonräntan ${procent(ranta)} % och ISK-skatten ${procent(ranta * p.skattesatsKapital.varde, 3)} % av kapitalunderlaget.`;

  senaste = berakna(p, indata);
  const { sammaPengar, sammaRisk } = senaste;

  rot.querySelector("[data-text-pengar]").textContent =
    `${procent(sammaPengar.andelIsk, 0)} % aktier på både ISK och depå. Värdet efter skatt om allt säljs efter så många år.`;
  rot.querySelector("[data-tabell-pengar]").innerHTML = tabell(sammaPengar);

  rot.querySelector("[data-text-risk]").textContent = sammaRisk.begransad
    ? `${procent(sammaRisk.andelIsk, 0)} % aktier på ISK. För samma risk skulle depån behöva mer än 100 % aktier, alltså lån, så den har 100 % och därmed lägre risk än ISK.`
    : `${procent(sammaRisk.andelIsk, 0)} % aktier på ISK mot ${procent(sammaRisk.andelDepa, 0)} % på depån. Staten står för en del av en förlust på depån, så depån kan ha mer aktier med samma risk efter skatt.`;
  rot.querySelector("[data-tabell-risk]").innerHTML = tabell(sammaRisk);

  arTabell();
}

// "Så har vi räknat": renders the parameter file as it is.
function formateraVarde(post) {
  if (post === p.scenarier) {
    return post.varde.map((s) => s.forstaAret === s.ovrigaAr
      ? `${escape(s.namn)}: ${procent(s.ovrigaAr)} %`
      : `${escape(s.namn)}: ${procent(s.forstaAret)} % år 1, sedan ${procent(s.ovrigaAr)} %`).join("<br>");
  }
  if (post === p.horisonter) return post.varde.join(", ") + " år";
  if (post.enhet === "kr" || post.enhet === "kr/mån") return escape(kronor(post.varde) + (post.enhet === "kr/mån" ? "/mån" : ""));
  const enhet = post.enhet === "andel" ? "" : ` ${post.enhet}`;
  return escape(`${procent(post.varde)} %${enhet}`);
}

function visaParametrar() {
  const rader = Object.values(p).map((post) => `<tr>
    <td>${escape(post.beskrivning)}<br><span class="kalla">Källa: ${escape(post.kalla)}</span></td>
    <td>${formateraVarde(post)}</td>
  </tr>`).join("");
  rot.querySelector("[data-parametrar]").innerHTML = `
    <p>Allt räknas månad för månad i nominella kronor. Skatterna dras i slutet
      av varje år från kontot de gäller. Depån säljs och vinsten beskattas
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
