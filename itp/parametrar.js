// Parameters for the ITP1 calculator. First draft – the values are NOT
// final. Anything marked VERIFIERA must be checked against a source before
// launch. The calculation module reads everything from here and holds no
// numbers of its own. The "Så har vi räknat" view renders this file, which
// is why every value carries a description and a source.
//
// All amounts are in today's money (real terms). Shares are decimals:
// 0.045 = 4.5 %.

export const parametrar = {
  // --- Premiums (ITP1) ----------------------------------------------------
  inkomstbasbelopp: {
    varde: 83400,
    enhet: "kr/år",
    beskrivning: "Inkomstbasbelopp 2026",
    kalla: "7,5 IBB = 52 125 kr/mån enligt artikeln om ITP1 och ITP2",
  },
  brytpunktIbb: {
    varde: 7.5,
    enhet: "IBB",
    beskrivning: "Lönen under brytpunkten ger den lägre premien, lönen över den högre",
    kalla: "ITP1-avtalet",
  },
  premieUnderBrytpunkt: {
    varde: 0.045,
    enhet: "andel av lön",
    beskrivning: "Premie på lönedelen upp till brytpunkten",
    kalla: "ITP1-avtalet",
  },
  premieOverBrytpunkt: {
    varde: 0.30,
    enhet: "andel av lön",
    beskrivning: "Premie på lönedelen över brytpunkten",
    kalla: "ITP1-avtalet",
  },
  lonetakIbb: {
    varde: 30,
    enhet: "IBB",
    beskrivning: "Ingen premie betalas på lön över taket",
    kalla: "VERIFIERA",
  },
  premieStartalder: {
    varde: 25,
    enhet: "år",
    beskrivning: "Ålder när premieinbetalningarna börjar",
    kalla: "VERIFIERA – kan ha ändrats i senare avtal",
  },
  pensionsalder: {
    varde: 65,
    enhet: "år",
    beskrivning: "Premier betalas och kapitalet växer fram till den här åldern",
    kalla: "Antagande",
  },
  andelObligatoriskTrad: {
    varde: 0.5,
    enhet: "andel av premien",
    beskrivning: "Den del av varje premie som måste gå till traditionell försäkring",
    kalla: "ITP1-avtalet",
  },

  // --- Salary growth ------------------------------------------------------
  realLoneokning: {
    varde: 0.015,
    enhet: "per år",
    beskrivning: "Användarens reala löneökning",
    kalla: "Antagande – Andreas sätter",
  },
  realIbbOkning: {
    // Same as the salary growth by default: the user's salary then keeps
    // its position relative to the break point. Setting it lower makes a
    // larger part of the salary fall above the break point over time.
    varde: 0.015,
    enhet: "per år",
    beskrivning: "Hur inkomstbasbeloppet, och därmed brytpunkten, växer realt",
    kalla: "Antagande – Andreas sätter",
  },

  // --- Returns ------------------------------------------------------------
  realAvkastningAktier: {
    varde: 0.06,
    enhet: "per år",
    beskrivning: "Förväntad real avkastning på aktier, före avgifter och skatt",
    kalla: "Antagande – siffran från artiklarna, oklart om den är real. Andreas sätter",
  },
  realAvkastningRantor: {
    varde: 0.01,
    enhet: "per år",
    beskrivning: "Förväntad real avkastning på räntor, före avgifter och skatt",
    kalla: "Antagande – siffran från artiklarna. Andreas sätter",
  },

  // --- Tax ----------------------------------------------------------------
  avkastningsskattPension: {
    varde: 0.00375,
    enhet: "andel av kapitalet per år",
    beskrivning: "Avkastningsskatt på pensionskapital (15 % av statslåneräntan)",
    kalla: "VERIFIERA – beror på statslåneräntan i november året innan",
  },

  // --- Products -----------------------------------------------------------
  // Equity share by age is given as points [age, share] and interpolated
  // linearly between them. Before the first point the first value holds;
  // after the last point the last value holds.
  // Fee per year in kronor = min(tak, max(golv, procent * kapital + fastKr)).
  // A null tak or golv means no cap or no floor.
  produkter: {
    alectaTrad: {
      namn: "Alecta traditionell försäkring",
      aktieandelPerAlder: {
        varde: [[25, 0.60], [55, 0.60], [65, 0.50]],
        kalla: "VERIFIERA – artikeln anger cirka 60 % som ung och 50 % som pensionär",
      },
      avgift: {
        procent: 0.0011,
        fastKr: 0,
        takKr: 480,
        golvKr: null,
        kalla: "Artikeln om ITP1 och ITP2 (upphandlingen 2023)",
      },
    },
    entrelosning: {
      namn: "Länsförsäkringar fondförsäkring, entrélösningen",
      aktieandelPerAlder: {
        varde: [[25, 1.0], [55, 1.0], [65, 0.6]],
        kalla: "VERIFIERA – nedtrappningen och slutnivån är gissade",
      },
      avgift: {
        // The fund fee is a blend of the equity and bond funds, weighted by
        // the equity share for the year.
        procentAktiefond: 0.0012,
        procentRantefond: 0.0012,
        fastKr: 0,
        takKr: null,
        golvKr: null,
        kalla: "Aktiefonden: total avgift enligt artikeln. Räntefonden: VERIFIERA",
      },
    },
  },

  // --- Display ------------------------------------------------------------
  aldersvarningFran: {
    varde: 55,
    enhet: "år",
    beskrivning: "Från den här åldern visas en varning om att det är mindre självklart att flytta",
    kalla: "Antagande",
  },
};
