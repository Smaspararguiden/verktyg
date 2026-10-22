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

// Runs one scenario. A scenario is a list of pots ("potter"), each with a
// product, a starting capital and the share of each year's premium that goes
// into it. Returns the final capital and a year-by-year table.
export function simuleraScenario(p, indata, potter) {
  const pensionsalder = p.pensionsalder.varde;
  const ra = p.realAvkastningAktier.varde;
  const rr = p.realAvkastningRantor.varde;
  const skatt = p.avkastningsskattPension.varde;

  const kapital = potter.map((pott) => pott.startkapital);
  const ar = [];
  let arslon = indata.manadslon * 12;
  let ibb = p.inkomstbasbelopp.varde;

  for (let alder = indata.alder; alder < pensionsalder; alder++) {
    const premie = alder >= p.premieStartalder.varde ? arsPremie(p, arslon, ibb) : 0;
    const rad = { alder, arslon, ibb, premie, potter: [] };

    potter.forEach((pott, i) => {
      const produkt = p.produkter[pott.produkt];
      const andelAktier = aktieandel(produkt, alder, pensionsalder);
      const avkastning = andelAktier * ra + (1 - andelAktier) * rr;
      const k = kapital[i];
      const avgift = arligAvgift(produkt, k, andelAktier);
      const skattKr = skatt * k;
      const pottPremie = premie * pott.premieandel;
      // Premiums arrive evenly over the year, so on average they earn half a
      // year's return.
      kapital[i] = k * (1 + avkastning) + pottPremie * (1 + avkastning / 2) - avgift - skattKr;
      rad.potter.push({
        namn: pott.namn, produkt: pott.produkt, andelAktier, avkastning,
        startkapital: k, premie: pottPremie, avgift, skatt: skattKr, slutkapital: kapital[i],
      });
    });

    ar.push(rad);
    arslon *= 1 + p.realLoneokning.varde;
    ibb *= 1 + p.realIbbOkning.varde;
  }

  const slutkapital = kapital.reduce((s, k) => s + k, 0);
  return { slutkapital, ar };
}

// Builds the four scenarios from the user's capital. indata.kapital has
// obligatoriskTrad, flyttbarTrad and flyttbarFond.
export function scenarier(p, indata) {
  const obl = p.andelObligatoriskTrad.varde;
  const { obligatoriskTrad, flyttbarTrad, flyttbarFond } = indata.kapital;
  const flyttbar = flyttbarTrad + flyttbarFond;

  // Future premiums to the movable part are assumed to go where its capital
  // is today, in the same proportion. With no capital yet, to trad.
  const andelFondIdag = flyttbar > 0 ? flyttbarFond / flyttbar : 0;

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
      { namn: "flyttbar i trad", produkt: "alectaTrad", startkapital: flyttbarTrad, premieandel: (1 - obl) * (1 - andelFondIdag) },
      { namn: "flyttbar i fond", produkt: "entrelosning", startkapital: flyttbarFond, premieandel: (1 - obl) * andelFondIdag },
    ],
  };
}

// Runs all scenarios and derives the results shown to the user.
//
// indata: { alder, manadslon, kapital: { obligatoriskTrad, flyttbarTrad, flyttbarFond } }
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

  return {
    scenarier: utfall,
    vinstFlytt, kostnadRegeln, redanUppnatt, kvarAttHamta,
    andelUppnadd, trafikljus,
    aldersvarning: indata.alder >= p.aldersvarningFran.varde,
  };
}
