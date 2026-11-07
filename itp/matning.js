// What the ITP1 calculator saves about a result, and where it is sent. Only the
// values below leave the browser; what they are and why is in DECISIONS.md. The
// receiver checks them again, see apps-script/itp-resultat.gs.

// Not a secret: the browser needs it, so anyone can read it.
export const INSAMLINGSADRESS =
  "https://script.google.com/macros/s/AKfycbwTc68eThpPp1CJRe8imSGomzMnPSdIPq428ZxiTSBLidKz_il-deyUxKOVVKgTvbaz/exec";

const SAJTENS_VARD = "www.smaspararguiden.se";

// The amounts are rounded as on the page.
export const tusental = (x) => Math.round(x / 1000) * 1000;
export const tiotal = (x) => Math.round(x / 10) * 10;

const jaNej = (x) => (x ? "ja" : "nej");

// One result as values for one row. itp1Tidigare is null for those who were not
// asked, forsakringar lists the rows of "flera bolag" as { belopp, sparform }.
export function matvarden({ r, indata, fodelsear, lage, itp1Nu, itp1Tidigare, forsakringar, vard, version }) {
  const s = r.scenarier;
  const varden = {
    // Everything but the real site is marked, so test rows can be filtered out.
    kalla: vard === SAJTENS_VARD ? "sajt" : "test",
    fodelsear,
    alder: indata.alder,
    itp1_nu: jaNej(itp1Nu),
    manadslon: indata.manadslon,
    lage,
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
  // What is left out was not asked for, not given or not shown.
  if (version) varden.version = version;
  if (itp1Tidigare !== null) varden.itp1_tidigare = jaNej(itp1Tidigare);
  if (indata.andelPremieFond !== null) varden.andel_fond = Math.round(indata.andelPremieFond * 100);
  if (lage !== "ingen") {
    varden.kapital_trad = indata.kapital.obligatoriskTrad + indata.kapital.flyttbarTrad;
    varden.kapital_fond = indata.kapital.flyttbarFond;
  }
  if (lage === "delar") {
    varden.forsakringar = forsakringar.map((f) => `${f.belopp}:${f.sparform}`).join("|");
  }
  if (r.andelUppnadd !== null) varden.andel_uppnadd = Math.round(r.andelUppnadd * 100);
  if (r.privatFlytt !== null) {
    varden.spara_flytt = tiotal(r.privatFlytt);
    varden.spara_utan_regeln = tiotal(r.privatUtanRegeln);
  }
  return varden;
}
