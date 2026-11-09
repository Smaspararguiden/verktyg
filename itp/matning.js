// What the ITP1 calculator saves about a page view, and where it is sent. Only
// the values below leave the browser; what they are and why is in DECISIONS.md.
// The receiver checks them again, see apps-script/itp-resultat.gs.

// Not a secret: the browser needs it, so anyone can read it.
export const INSAMLINGSADRESS =
  "https://script.google.com/macros/s/AKfycbwTc68eThpPp1CJRe8imSGomzMnPSdIPq428ZxiTSBLidKz_il-deyUxKOVVKgTvbaz/exec";

const SAJTENS_VARD = "www.smaspararguiden.se";

// The amounts are rounded as on the page.
export const tusental = (x) => Math.round(x / 1000) * 1000;
export const tiotal = (x) => Math.round(x / 10) * 10;

const jaNej = (x) => (x ? "ja" : "nej");

// A random code for one page view. It lives only in the page's memory, so the
// receiver can overwrite the page view's row instead of adding one.
export function nyKod() {
  const byte = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(byte, (b) => b.toString(16).padStart(2, "0")).join("");
}

// One page view as values for one row. r is null while the page shows no
// result; then the row shows how far the visitor got. Inputs not yet given are
// null, itp1Tidigare is null for those who were not asked, and forsakringar
// lists the filled-in rows of "flera bolag" as { belopp, sparform }.
export function matvarden({
  r, fodelsear, alder, manadslon, kapital, andelPremieFond, lage,
  itp1Nu, itp1Tidigare, forsakringar, vard, version, kod,
}) {
  const varden = {
    // Everything but the real site is marked, so test rows can be filtered out.
    kalla: vard === SAJTENS_VARD ? "sajt" : "test",
    kod,
    lage,
    itp1_nu: jaNej(itp1Nu),
    resultat: jaNej(r),
  };
  // What is left out was not asked for, not given or not shown.
  if (version) varden.version = version;
  if (fodelsear !== null) {
    varden.fodelsear = fodelsear;
    varden.alder = alder;
  }
  if (itp1Tidigare !== null) varden.itp1_tidigare = jaNej(itp1Tidigare);
  if (manadslon !== null) varden.manadslon = manadslon;
  if (andelPremieFond !== null) varden.andel_fond = Math.round(andelPremieFond * 100);
  if (kapital !== null && lage !== "ingen") {
    varden.kapital_trad = kapital.obligatoriskTrad + kapital.flyttbarTrad;
    varden.kapital_fond = kapital.flyttbarFond;
  }
  if (lage === "delar" && forsakringar.length) {
    varden.forsakringar = forsakringar.map((f) => `${f.belopp}:${f.sparform}`).join("|");
  }
  if (r) Object.assign(varden, resultatvarden(r));
  return varden;
}

function resultatvarden(r) {
  const s = r.scenarier;
  const varden = {
    vinst: tusental(r.vinstFlytt),
    kostnad_regeln: tusental(r.kostnadRegeln),
    kvar_att_hamta: tusental(r.kvarAttHamta),
    trafikljus: r.trafikljus ?? "inget",
    aldersvarning: jaNej(r.aldersvarning),
    slut_allt_trad: tusental(s.alltTrad.slutkapital),
    slut_nuvarande: tusental(s.nuvarande.slutkapital),
    slut_allt_som_gar: tusental(s.alltMojligtFlyttat.slutkapital),
    slut_utan_regeln: tusental(s.alltFlyttat.slutkapital),
  };
  if (r.andelUppnadd !== null) varden.andel_uppnadd = Math.round(r.andelUppnadd * 100);
  if (r.privatFlytt !== null) {
    varden.spara_flytt = tiotal(r.privatFlytt);
    varden.spara_utan_regeln = tiotal(r.privatUtanRegeln);
  }
  return varden;
}
