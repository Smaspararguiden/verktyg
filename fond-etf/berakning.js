// Calculation module for the fund vs ETF cost comparison. Takes the parameter
// file and the user's input and returns numbers; knows nothing about the page.
//
// The return is assumed to be zero, so the holding is worth the same amount
// every year and costs can simply be summed. The fund costs its annual fee and
// nothing more. The ETF costs its annual fee plus one-time costs: courtage at
// purchase and sale, half the spread at each, and currency exchange at each
// unless it trades in kronor. The average yearly cost after t years is the
// sum of all costs divided by (amount × t).

// Courtage for one trade: a share of the amount, but at least the minimum.
// klass is { procent, minimum }.
export function courtage(klass, belopp) {
  return Math.max(klass.procent * belopp, klass.minimum);
}

// The ETF's one-time costs in kronor for a purchase and a later sale.
// indata: { belopp, courtage: { procent, minimum }, spread, valutavaxling,
// handlasISek }.
export function engangskostnader(indata) {
  const { belopp } = indata;
  const avgiftPerAffar = courtage(indata.courtage, belopp);
  const vaxling = indata.handlasISek ? 0 : indata.valutavaxling * belopp;
  const delar = {
    courtageKop: avgiftPerAffar,
    courtageSalj: avgiftPerAffar,
    spreadKop: (indata.spread / 2) * belopp,
    spreadSalj: (indata.spread / 2) * belopp,
    vaxlingKop: vaxling,
    vaxlingSalj: vaxling,
  };
  return { ...delar, totalt: Object.values(delar).reduce((a, b) => a + b, 0) };
}

// The first whole year when the ETF's average yearly cost is at most the
// fund's, or null if it never gets there.
export function brytpunkt(indata, engangTotalt) {
  const besparingPerAr = (indata.fondAvgift - indata.etfAvgift) * indata.belopp;
  if (besparingPerAr <= 0) return engangTotalt === 0 && besparingPerAr === 0 ? 1 : null;
  // The small margin keeps a break-even that lands exactly on a year, but is
  // computed a hair above it, on that year.
  return Math.max(1, Math.ceil(engangTotalt / besparingPerAr - 1e-9));
}

// indata: { belopp, fondAvgift, etfAvgift, courtage: { procent, minimum },
// spread, valutavaxling, handlasISek }. Returns the one-time costs, a row per
// year with the average yearly cost as a share and the total cost in kronor
// for both, and the break-even year.
export function berakna(parametrar, indata) {
  const engang = engangskostnader(indata);
  const { belopp } = indata;
  const ar = [];
  for (let t = 1; t <= parametrar.antalAr.varde; t++) {
    const fondKronor = indata.fondAvgift * belopp * t;
    const etfKronor = indata.etfAvgift * belopp * t + engang.totalt;
    ar.push({
      ar: t,
      fondKronor,
      etfKronor,
      fond: fondKronor / (belopp * t),
      etf: etfKronor / (belopp * t),
    });
  }
  return { engang, ar, brytpunkt: brytpunkt(indata, engang.totalt) };
}
