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
    kalla: "ITP1-avtalet sedan 2023; PTK, Vägledning alternativ ITP (mars 2026)",
  },
  premieStartalder: {
    varde: 25,
    enhet: "år",
    beskrivning: "Ålder när premieinbetalningarna börjar",
    kalla: "ITP1-avtalet; Länsförsäkringars förköpsinformation ITP (2026-01-01)",
  },
  pensionsalder: {
    // The glide paths below are given as absolute ages and assume this
    // pension age. Changing it means moving their points too.
    varde: 66,
    enhet: "år",
    beskrivning: "Premier betalas och kapitalet växer fram till den här åldern",
    kalla: "ITP1-avtalet: premier betalas till 66 år sedan 2023 (Alecta, Ändrade åldersgränser i ITP-planen)",
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
    // 15 % of the average government bond rate for the previous year, with
    // the rate floored at 0.5 %. Varies year to year; we hold it constant.
    varde: 0.00354,
    enhet: "andel av kapitalet per år",
    beskrivning: "Avkastningsskatt på pensionskapital 2026 (15 % av genomsnittlig statslåneränta 2025, 2,36 %)",
    kalla: "Skatteverket, allmänna råd SKV A 2026:1",
  },

  // --- Products -----------------------------------------------------------
  // Equity share by age is given as points [age, share] and interpolated
  // linearly between them. Before the first point the first value holds;
  // after the last point the last value holds.
  // Fee per year in kronor =
  //   min(tak, max(golv, procent * kapital + fastKr)) + procentUtanTak * kapital
  // A null tak or golv means no cap or no floor. procentUtanTak covers costs
  // that are charged on top of the capped fee, such as Alecta's capital
  // management cost.
  produkter: {
    alectaTrad: {
      namn: "Alecta traditionell försäkring",
      aktieandelPerAlder: {
        // 60 % until 63, 50 % from 63 to 66, 40 % after 66.
        varde: [[62, 0.60], [63, 0.50], [65, 0.50], [66, 0.40]],
        kalla: "Andrahandskälla (minkapital.se, 2026). VERIFIERA mot Alecta",
      },
      avgift: {
        procent: 0.0005,
        fastKr: 0,
        takKr: 480,
        golvKr: null,
        procentUtanTak: 0.0003,
        kalla: "Alecta: 0,05 % per år, högst 40 kr/mån, plus kapitalförvaltningskostnad cirka 0,03 %",
      },
    },
    entrelosning: {
      namn: "Länsförsäkringar fondförsäkring, entrélösningen",
      aktieandelPerAlder: {
        // All in equity funds until six years before pension, then moved
        // gradually to 25 % equity at pension. "Gradually" is read as linear.
        varde: [[60, 1.0], [66, 0.25]],
        kalla: "Länsförsäkringars förköpsinformation ITP (2026-01-01)",
      },
      avgift: {
        // The fund fee is a blend of the equity and bond funds, weighted by
        // the equity share for the year. LF states 0.08 % when young and
        // 0.06 % at the end (25 % equity); the bond fee is derived from that.
        procentAktiefond: 0.0008,
        procentRantefond: 0.00053,
        fastKr: 0,
        takKr: null,
        golvKr: null,
        procentUtanTak: 0,
        kalla: "Länsförsäkringars förköpsinformation ITP (2026-01-01): 0 kr fast avgift, 0 % kapitalavgift, 0,08–0,06 % årlig avgift",
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
