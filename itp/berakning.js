// Calculation module for the ITP1 calculator. Takes the parameters (see
// parametrar.js) and the user's input and returns numbers. Knows nothing
// about the page and holds no numbers of its own.
//
// Everything is in real terms (today's money) and runs in whole years: the
// user's current age up to the pension age.

// Equity share for a product at a given age.
export function aktieandel(produkt, alder, pensionsalder) {
  const a = produkt.aktieandel;
  if (a.typ === "perAlder") {
    return interpolera(a.punkter, alder);
  }
  if (a.typ === "forePension") {
    const start = pensionsalder - a.startArForePension;
    if (alder <= start) return a.startandel;
    if (alder >= start + a.langdAr) return a.slutandel;
    return a.startandel + (a.slutandel - a.startandel) * (alder - start) / a.langdAr;
  }
  if (a.typ === "fast") return a.andel;
  throw new Error(`Okänd typ av aktieandel: ${a.typ}`);
}

// Linear interpolation between [x, y] points, flat outside them.
function interpolera(punkter, x) {
  if (x <= punkter[0][0]) return punkter[0][1];
  for (let i = 1; i < punkter.length; i++) {
    const [x1, y1] = punkter[i];
    if (x <= x1) {
      const [x0, y0] = punkter[i - 1];
      // Two points at the same x make a step; take the later value.
      if (x1 === x0) return y1;
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return punkter[punkter.length - 1][1];
}

// Yearly fee in kronor for a product, given capital and equity share.
export function arligAvgift(produkt, kapital, andelAktier) {
  const f = produkt.avgift;
  const procent = andelAktier * f.procentAktiedel + (1 - andelAktier) * f.procentRantedel;
  let medTak = procent * kapital + f.fastKr;
  if (f.golvKr !== null) medTak = Math.max(f.golvKr, medTak);
  if (f.takKr !== null) medTak = Math.min(f.takKr, medTak);
  return medTak + f.procentUtanTak * kapital;
}

// Yearly ITP1 premium in kronor for a yearly salary and income base amount.
export function arsPremie(p, arslon, ibb) {
  const brytpunkt = p.brytpunktIbb.varde * ibb;
  const tak = p.lonetakIbb.varde * ibb;
  const under = Math.min(arslon, brytpunkt);
  const over = Math.max(0, Math.min(arslon, tak) - brytpunkt);
  return p.premieUnderBrytpunkt.varde * under + p.premieOverBrytpunkt.varde * over;
}

// Collectum's fee in kronor on a year's premium.
export function collectumAvgift(p, premie) {
  return Math.min(p.collectumAvgiftTak.varde, p.collectumAvgift.varde * premie);
}

// Runs one scenario. A scenario is a list of pots ("potter"), each with a
// product, a starting capital and the share of each year's premium that goes
// into it. Returns the final capital and a year-by-year table.
export function simuleraScenario(p, indata, potter) {
  const pensionsalder = p.pensionsalder.varde;
  const ra = p.realAvkastningAktier.varde;
  const rr = p.realAvkastningRantor.varde;
  const skatt = p.avkastningsskattPension.varde;
  const delAr = p.avkastningsandelArsPremie.varde;

  const kapital = potter.map((pott) => pott.startkapital);
  const ar = [];
  let arslon = indata.manadslon * 12;
  let ibb = p.inkomstbasbelopp.varde;

  for (let alder = indata.alder; alder < pensionsalder; alder++) {
    const premie = alder >= p.premieStartalder.varde ? arsPremie(p, arslon, ibb) : 0;
    const avgiftCollectum = collectumAvgift(p, premie);
    const rad = { alder, arslon, ibb, premie, potter: [] };

    potter.forEach((pott, i) => {
      const produkt = p.produkter[pott.produkt];
      const andelAktier = aktieandel(produkt, alder, pensionsalder);
      const avkastning = andelAktier * ra + (1 - andelAktier) * rr;
      const k = kapital[i];
      const avgift = arligAvgift(produkt, k, andelAktier);
      const skattKr = skatt * k;
      // Collectum takes its fee before the premium reaches the pots.
      const pottCollectum = avgiftCollectum * pott.premieandel;
      const pottPremie = premie * pott.premieandel - pottCollectum;
      // Premiums arrive during the year, so they earn only part of the
      // year's return.
      kapital[i] = k * (1 + avkastning) + pottPremie * (1 + avkastning * delAr) - avgift - skattKr;
      rad.potter.push({
        namn: pott.namn, produkt: pott.produkt, andelAktier, avkastning,
        startkapital: k, collectum: pottCollectum, premie: pottPremie, avgift, skatt: skattKr,
        slutkapital: kapital[i],
      });
    });

    ar.push(rad);
    const karriar = alder < p.karriarTillAlder.varde ? p.karriarPaslag.varde : 0;
    arslon *= 1 + p.realLoneokning.varde + karriar;
    ibb *= 1 + p.realIbbOkning.varde;
  }

  const slutkapital = kapital.reduce((s, k) => s + k, 0);
  return { slutkapital, ar };
}

// Splits the capital the user sees on avtalat.se, which only tells trad from
// fund, into the obligatory and the movable part. The obligatory part has
// always been in trad and received its share of every premium, so it is
// taken as that share of the total capital, but never more than the trad
// capital there is.
export function delaUppKapital(p, trad, fond) {
  const obligatoriskTrad = Math.min(trad, p.andelObligatoriskTrad.varde * (trad + fond));
  return { obligatoriskTrad, flyttbarTrad: trad - obligatoriskTrad, flyttbarFond: fond };
}

// Saving a fixed amount each month on an ISK from now to the pension age,
// year by year, in the same shape as simuleraScenario so the CSV can list
// it next to the pension scenarios. The year's deposits earn the same part
// of the year's return as the premiums do. ISK tax and fee are taken on the
// capital at the start of the year.
export function simuleraPrivat(p, alder, manadsbelopp) {
  const pensionsalder = p.pensionsalder.varde;
  const produkt = p.produkter.privatIsk;
  const ra = p.realAvkastningAktier.varde;
  const rr = p.realAvkastningRantor.varde;
  const insattning = 12 * manadsbelopp;

  let kapital = 0;
  const ar = [];
  for (let a = alder; a < pensionsalder; a++) {
    const andelAktier = aktieandel(produkt, a, pensionsalder);
    const avkastning = andelAktier * ra + (1 - andelAktier) * rr;
    const k = kapital;
    const avgift = arligAvgift(produkt, k, andelAktier);
    const skatt = p.iskSkatt.varde * k;
    kapital = k * (1 + avkastning) + insattning * (1 + avkastning * p.avkastningsandelArsPremie.varde)
      - avgift - skatt;
    ar.push({
      alder: a, arslon: null, ibb: null, premie: insattning,
      potter: [{
        namn: "eget sparande", produkt: "privatIsk", andelAktier, avkastning,
        startkapital: k, collectum: 0, premie: insattning, avgift, skatt, slutkapital: kapital,
      }],
    });
  }
  return { slutkapital: kapital, ar };
}

// How much the user would have to save on their own each month, from now to
// the pension age, to get the same as a gain in pension capital. The pension
// is taxed when paid out and the private saving is not, so the comparison is
// made after that tax. The private saving pays ISK tax instead of the yield
// tax on pensions. Null when there are no years left.
export function privatSparandePerManad(p, alder, vinstKr) {
  if (alder >= p.pensionsalder.varde || vinstKr <= 0) return vinstKr <= 0 ? 0 : null;
  // Fees and tax are proportional to the capital, so the capital from
  // 1 kr a month scales with the amount.
  return vinstKr * (1 - p.skattPaPension.varde) / simuleraPrivat(p, alder, 1).slutkapital;
}

// Builds the four scenarios from the user's capital. indata.kapital has
// obligatoriskTrad, flyttbarTrad and flyttbarFond. indata.andelPremieFond is
// the share of future premiums the user has chosen to put in funds; without
// it, everything goes to trad.
export function scenarier(p, indata) {
  const obl = p.andelObligatoriskTrad.varde;
  const { obligatoriskTrad, flyttbarTrad, flyttbarFond } = indata.kapital;
  const flyttbar = flyttbarTrad + flyttbarFond;
  // The obligatory share always goes to trad, so funds get at most the rest.
  const premieFond = Math.min(1 - obl, Math.max(0, indata.andelPremieFond ?? 0));

  const tvaPotter = (oblProdukt, flyttProdukt) => [
    { namn: "obligatorisk", produkt: oblProdukt, startkapital: obligatoriskTrad, premieandel: obl },
    { namn: "flyttbar", produkt: flyttProdukt, startkapital: flyttbar, premieandel: 1 - obl },
  ];

  return {
    alltTrad: tvaPotter("alectaTrad", "alectaTrad"),
    alltMojligtFlyttat: tvaPotter("alectaTrad", "entrelosning"),
    alltFlyttat: tvaPotter("entrelosning", "entrelosning"),
    nuvarande: [
      { namn: "obligatorisk", produkt: "alectaTrad", startkapital: obligatoriskTrad, premieandel: obl },
      { namn: "flyttbar i trad", produkt: "alectaTrad", startkapital: flyttbarTrad, premieandel: 1 - obl - premieFond },
      { namn: "flyttbar i fond", produkt: "entrelosning", startkapital: flyttbarFond, premieandel: premieFond },
    ],
  };
}

// Runs all scenarios and derives the results shown to the user.
//
// indata: { alder, manadslon, kapital: { obligatoriskTrad, flyttbarTrad, flyttbarFond },
//           andelPremieFond (optional, share of the whole premium) }
export function berakna(p, indata) {
  const s = scenarier(p, indata);
  const utfall = Object.fromEntries(
    Object.entries(s).map(([namn, potter]) => [namn, simuleraScenario(p, indata, potter)]),
  );
  const slut = (namn) => utfall[namn].slutkapital;

  const vinstFlytt = slut("alltMojligtFlyttat") - slut("alltTrad");
  const kostnadRegeln = slut("alltFlyttat") - slut("alltMojligtFlyttat");
  const redanUppnatt = slut("nuvarande") - slut("alltTrad");
  const kvarAttHamta = slut("alltMojligtFlyttat") - slut("nuvarande");

  // With a tiny gain the share means nothing, so no traffic light.
  let andelUppnadd = null;
  let trafikljus = null;
  if (vinstFlytt >= p.minstaVinstForTrafikljus.varde) {
    // Capped: we assume the entry solution, but the user's own funds may do
    // better or worse.
    andelUppnadd = Math.min(1, Math.max(0, redanUppnatt / vinstFlytt));
    if (andelUppnadd >= p.trafikljusGronFran.varde) trafikljus = "gron";
    else if (andelUppnadd >= p.trafikljusGulFran.varde) trafikljus = "gul";
    else trafikljus = "rod";
  }

  // The same gains expressed as monthly private saving: moving what can be
  // moved today, and moving everything if the rule were dropped.
  const privatFlytt = privatSparandePerManad(p, indata.alder, vinstFlytt);
  const privatUtanRegeln = privatSparandePerManad(p, indata.alder, vinstFlytt + kostnadRegeln);
  // The same saving year by year, for the CSV.
  const privatAr = {};
  if (privatFlytt) privatAr.egetSparandeFlytt = simuleraPrivat(p, indata.alder, privatFlytt);
  if (privatUtanRegeln) privatAr.egetSparandeUtanRegeln = simuleraPrivat(p, indata.alder, privatUtanRegeln);

  return {
    scenarier: utfall,
    vinstFlytt, kostnadRegeln, redanUppnatt, kvarAttHamta,
    privatFlytt, privatUtanRegeln, privatAr,
    andelUppnadd, trafikljus,
    aldersvarning: indata.alder >= p.aldersvarningFran.varde,
  };
}
