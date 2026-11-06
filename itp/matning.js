// What the ITP1 calculator reports to the site's Plausible. Only the values
// below leave the browser; what they are and why is in DECISIONS.md.

export const MATHANDELSE = "ITP resultat";

// The amounts are rounded as on the page.
export const tusental = (x) => Math.round(x / 1000) * 1000;
export const tiotal = (x) => Math.round(x / 10) * 10;

export function aldersgrupp(alder) {
  if (alder < 30) return "under 30";
  if (alder < 40) return "30-39";
  if (alder < 50) return "40-49";
  if (alder < 55) return "50-54";
  return "55+";
}

// lage is how the capital was given: "trad", "delar" or "ingen".
export function matvarden(r, alder, lage) {
  const varden = {
    vinst: tusental(r.vinstFlytt),
    kostnad_regeln: tusental(r.kostnadRegeln),
    kvar_att_hamta: tusental(r.kvarAttHamta),
    trafikljus: r.trafikljus ?? "inget",
    aldersgrupp: aldersgrupp(alder),
    kapital: lage,
  };
  // The saving comparison is not always available.
  if (r.privatFlytt !== null) {
    varden.spara_flytt = tiotal(r.privatFlytt);
    varden.spara_utan_regeln = tiotal(r.privatUtanRegeln);
  }
  return varden;
}
