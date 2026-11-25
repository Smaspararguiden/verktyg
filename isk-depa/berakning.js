// Calculation module for the ISK vs depå simulator. Takes the parameters (see
// parametrar.js) and the user's input and returns numbers. Knows nothing
// about the page and holds no numbers of its own.
//
// Two portfolios are compared, each split between equities and a savings
// account: one with the equities on an ISK, one with them on a depå. The
// simulation runs month by month in nominal kronor. Taxes are settled at the
// end of each year; the depå is sold, and its gain taxed, at each horizon.

const MANADER = 12;
const KVARTAL = 4;

// The ISK's deemed rate: government bond rate plus the add-on, with a floor.
export function schablonranta(p, statslanerantan) {
  return Math.max(p.schablonGolv.varde, statslanerantan + p.schablonPaslag.varde);
}

// ISK tax in kronor for a year's capital base.
export function iskSkatt(p, kapitalunderlag, statslanerantan, fribelopp) {
  const beskattat = Math.max(0, kapitalunderlag - fribelopp);
  return beskattat * schablonranta(p, statslanerantan) * p.skattesatsKapital.varde;
}

// Equity share on the depå that gives the same risk after tax as a given
// share on the ISK. The state carries part of a loss on the depå, so the
// saver carries only (1 - that part) of each krona in equities. Capped at
// 100 %: going above needs borrowing, which is not modelled.
export function aktieandelSammaRisk(andelIsk, statensAndelAvForlust) {
  const andel = andelIsk / (1 - statensAndelAvForlust);
  return { andel: Math.min(1, andel), begransad: andel > 1 };
}

// Monthly rate that compounds to the given yearly rate.
export function manadsranta(arlig) {
  return Math.pow(1 + arlig, 1 / MANADER) - 1;
}

// Tax when the whole depå is sold: on the gain, or a refund on a loss.
export function depaSkattVidForsaljning(p, varde, omkostnad, statensAndelAvForlust) {
  const vinst = varde - omkostnad;
  return vinst >= 0 ? vinst * p.skattesatsKapital.varde : vinst * statensAndelAvForlust;
}

// Runs one scenario for `antalAr` years with the given equity shares on the
// ISK and the depå. Returns one row per year, with values at the end of the
// year after that year's taxes; `depaEfterForsaljning` is what the depå
// holds if it is sold then.
export function simulera(p, indata, scenario, antalAr, andelIsk, andelDepa) {
  const s = p.skattesatsKapital.varde;
  const fribelopp = indata.medFribelopp ? p.fribelopp.varde : 0;
  const rKonto = manadsranta(indata.kontoranta);

  let isk = indata.startbelopp * andelIsk;
  let kontoIsk = indata.startbelopp * (1 - andelIsk);
  let depa = indata.startbelopp * andelDepa;
  let kontoDepa = indata.startbelopp * (1 - andelDepa);
  let omkostnad = depa;
  let insatt = indata.startbelopp;

  const rader = [];
  for (let ar = 1; ar <= antalAr; ar++) {
    const rAktier = manadsranta(ar === 1 ? scenario.forstaAret : scenario.ovrigaAr);
    const depaFoerstaJanuari = depa;
    let kvartalsvarden = 0;
    let iskInsattIAr = 0;
    let rantaIsk = 0;
    let rantaDepa = 0;

    for (let m = 0; m < MANADER; m++) {
      // The capital base counts the value at the start of each quarter.
      if (m % (MANADER / KVARTAL) === 0) kvartalsvarden += isk;

      const insattning = indata.manadssparande;
      insatt += insattning;
      isk += insattning * andelIsk;
      iskInsattIAr += insattning * andelIsk;
      kontoIsk += insattning * (1 - andelIsk);
      depa += insattning * andelDepa;
      omkostnad += insattning * andelDepa;
      kontoDepa += insattning * (1 - andelDepa);

      isk *= 1 + rAktier;
      depa *= 1 + rAktier;
      rantaIsk += kontoIsk * rKonto;
      kontoIsk *= 1 + rKonto;
      rantaDepa += kontoDepa * rKonto;
      kontoDepa *= 1 + rKonto;
    }

    // Year-end taxes, taken from the accounts themselves.
    const kapitalunderlag = (kvartalsvarden + iskInsattIAr) / KVARTAL;
    const skattIsk = iskSkatt(p, kapitalunderlag, indata.statslanerantan, fribelopp);
    isk -= skattIsk;
    const fondskatt = indata.fonder ? depaFoerstaJanuari * p.fondSchablon.varde * s : 0;
    depa -= fondskatt;
    kontoIsk -= rantaIsk * s;
    kontoDepa -= rantaDepa * s;

    const skattForsaljning = depaSkattVidForsaljning(p, depa, omkostnad, indata.statensAndelAvForlust);
    const depaEfterForsaljning = depa - skattForsaljning;
    rader.push({
      ar,
      insatt,
      kapitalunderlag,
      iskSkatt: skattIsk,
      isk,
      kontoIsk,
      iskTotalt: isk + kontoIsk,
      fondskatt,
      depa,
      omkostnad,
      skattForsaljning,
      depaEfterForsaljning,
      kontoDepa,
      depaTotalt: depaEfterForsaljning + kontoDepa,
    });
  }
  return rader;
}

// One comparison (same money or same risk) for all scenarios.
function jamforelse(p, indata, andelIsk, andelDepa, begransad) {
  const horisonter = p.horisonter.varde;
  const langst = Math.max(...horisonter);
  const scenarier = p.scenarier.varde.map((scenario) => {
    const ar = simulera(p, indata, scenario, langst, andelIsk, andelDepa);
    return {
      namn: scenario.namn,
      ar,
      horisonter: horisonter.map((h) => ({
        ar: h,
        isk: ar[h - 1].iskTotalt,
        depa: ar[h - 1].depaTotalt,
      })),
    };
  });
  return { andelIsk, andelDepa, begransad, scenarier };
}

// Indata: { startbelopp, manadssparande, statslanerantan, kontoranta,
// statensAndelAvForlust, aktieandelIsk, medFribelopp, fonder }.
// aktieandelIsk is the ISK's equity share in the same-risk comparison.
export function berakna(p, indata) {
  const lika = p.aktieandelSammaPengar.varde;
  const risk = aktieandelSammaRisk(indata.aktieandelIsk, indata.statensAndelAvForlust);
  return {
    sammaPengar: jamforelse(p, indata, lika, lika, false),
    sammaRisk: jamforelse(p, indata, indata.aktieandelIsk, risk.andel, risk.begransad),
  };
}
