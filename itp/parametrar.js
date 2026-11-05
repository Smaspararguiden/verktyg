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
    // One age for everyone, no adjustment per birth year. Premiums are paid
    // up to this age as well, although today's agreement stops them at 66:
    // we assume the agreement follows the rising target retirement age.
    // The entry solution's glide path follows this age; Alecta's follows the
    // insured's age only.
    varde: 68,
    enhet: "år",
    beskrivning: "Premier betalas och kapitalet växer fram till den här åldern. Riktåldern höjs med tiden, så den blir troligen högre än dagens för den som är ung nu",
    kalla: "Antagande – samma ålder för alla. Dagens ITP1-avtal betalar premier till 66 år",
  },
  andelObligatoriskTrad: {
    varde: 0.5,
    enhet: "andel av premien",
    beskrivning: "Den del av varje premie som måste gå till traditionell försäkring",
    kalla: "ITP1-avtalet",
  },
  collectumAvgift: {
    // Taken off the premium before it reaches the insurer, so it is the same
    // whichever product the premium goes to.
    varde: 0.0055,
    enhet: "andel av premien",
    beskrivning: "Collectums avgift, som dras från premien innan den betalas in till försäkringsbolaget",
    kalla: "Collectum, Så beräknas Collectums avgift på ITP-premier (2026); Alecta, faktablad 6187",
  },
  collectumAvgiftTak: {
    varde: 450,
    enhet: "kr/år",
    beskrivning: "Högsta avgift till Collectum per år och anställning",
    kalla: "Collectum, Så beräknas Collectums avgift på ITP-premier (2026); Alecta, faktablad 6187",
  },

  // --- Salary growth ------------------------------------------------------
  realLoneokning: {
    varde: 0.015,
    enhet: "per år",
    beskrivning: "Allmän real löneökning, samma som för inkomstbasbeloppet",
    kalla: "Antagande (Småspararguiden)",
  },
  karriarPaslag: {
    // On top of the general growth, until karriarTillAlder. This is what moves
    // the user's salary relative to the income base amount and the break point.
    varde: 0.01,
    enhet: "per år",
    beskrivning: "Extra löneökning för lönekarriären, utöver den allmänna",
    kalla: "Antagande (Småspararguiden). SCB, lönestrukturstatistik 2025 (privatanställda tjänstemän): medellönen ökar 1,9 och 1,1 % per år mellan åldersgrupperna från 25–34 till 45–54 år",
  },
  karriarTillAlder: {
    varde: 50,
    enhet: "år",
    beskrivning: "Lönekarriären ger extra löneökning fram till den här åldern",
    kalla: "Antagande (Småspararguiden). SCB, lönestrukturstatistik 2025 (privatanställda tjänstemän): medellönen är högst vid 45–54 år och något lägre vid 55–64 år",
  },
  realIbbOkning: {
    // Follows the general salary growth: it stands for the average, which
    // has no career of its own since those who leave work earn more than
    // those who enter.
    varde: 0.015,
    enhet: "per år",
    beskrivning: "Hur inkomstbasbeloppet, och därmed brytpunkten, växer realt",
    kalla: "Antagande (Småspararguiden)",
  },

  // --- Returns ------------------------------------------------------------
  realAvkastningAktier: {
    varde: 0.06,
    enhet: "per år",
    beskrivning: "Förväntad real avkastning på aktier, före avgifter och skatt",
    kalla: "Antagande (Småspararguiden)",
  },
  realAvkastningRantor: {
    varde: 0.01,
    enhet: "per år",
    beskrivning: "Förväntad real avkastning på räntor, före avgifter och skatt",
    kalla: "Antagande (Småspararguiden)",
  },
  avkastningsandelArsPremie: {
    // Premiums (and monthly private saving) arrive evenly over the year, so
    // on average they earn half a year's return in the year they are paid.
    // 0 means no return until the next year.
    varde: 0.5,
    enhet: "andel av årets avkastning",
    beskrivning: "Hur stor del av årets avkastning som årets inbetalningar får, eftersom de kommer in under året",
    kalla: "Antagande (Småspararguiden): inbetalningar jämnt fördelade över året",
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
  skattPaPension: {
    // Pension is taxed as income when paid out; money saved privately on an
    // ISK is not. So a krona of pension capital is worth less than a krona
    // saved privately, and the comparison is made after this tax.
    varde: 0.30,
    enhet: "andel av utbetalningen",
    beskrivning: "Inkomstskatt på pensionen när den betalas ut. Används för att jämföra med eget sparande, som inte beskattas vid uttag",
    kalla: "Antagande (Småspararguiden)",
  },
  iskSkatt: {
    // (Government bond rate 30 Nov 2025, 2.55 %, + 1 percentage point) × 30 %.
    // The tax-free amount (300 000 kr from 2026) is left out: it is shared
    // with all of the person's other ISK savings.
    varde: 0.01065,
    enhet: "andel av kapitalet per år",
    beskrivning: "Skatt på ISK 2026, för jämförelsen med eget sparande. Det skattefria beloppet räknar vi inte med",
    kalla: "Skatteverket; statslåneräntan 30 november 2025 (2,55 %)",
  },

  // --- Products -----------------------------------------------------------
  // Equity share comes in two forms:
  //   perAlder:     points [age, share], interpolated linearly between them.
  //                 Before the first point the first value holds; after the
  //                 last point the last value holds.
  //   forePension:  startandel until startArForePension years before the
  //                 pension age, then linearly down to slutandel over
  //                 langdAr years. Moves with the pension age.
  //
  // Fee per year in kronor =
  //   min(tak, max(golv, procent * kapital + fastKr)) + procentUtanTak * kapital
  // where procent = aktieandel * procentAktiedel + (1 - aktieandel) * procentRantedel.
  // A null tak or golv means no cap or no floor. procentUtanTak covers costs
  // charged on top of a capped fee, such as Alecta's capital management cost.
  produkter: {
    // Used only to compare with saving on one's own: what the user would
    // have to save each month for the same effect on the pension.
    privatIsk: {
      namn: "Eget sparande på ISK i en global indexfond",
      aktieandel: {
        typ: "fast",
        andel: 1.0,
        kalla: "Antagande (Småspararguiden)",
      },
      avgift: {
        procentAktiedel: 0.002,
        procentRantedel: 0.002,
        fastKr: 0,
        takKr: null,
        golvKr: null,
        procentUtanTak: 0,
        kalla: "Antagande (Småspararguiden): vanlig avgift för en global indexfond",
      },
    },
    alectaTrad: {
      namn: "Alecta traditionell försäkring",
      aktieandel: {
        // Alecta's 60, 50 and 40 % plus half of the 20 % alternative assets:
        // 70 % until 63, 60 % from 63 to 66, 50 % from 66.
        typ: "perAlder",
        punkter: [[62, 0.70], [63, 0.60], [65, 0.60], [66, 0.50]],
        kalla: "Alecta, faktablad 6187 (från 15 mars 2026): 60 % aktier till 63 år, 50 % från 63 och 40 % senast vid 66, med 20 % alternativa tillgångar i alla tre. Hälften av de alternativa räknas som aktier (Småspararguiden)",
      },
      avgift: {
        // Alecta charges the same rate whatever the mix, so both parts are
        // equal.
        procentAktiedel: 0.0005,
        procentRantedel: 0.0005,
        fastKr: 0,
        takKr: 480,
        golvKr: null,
        procentUtanTak: 0.0003,
        kalla: "Alecta; Konsumenternas, Jämför tjänstepensioner ITP 1 (2026-10): 0,05 % per år, högst 40 kr/mån, plus kapitalförvaltningskostnad cirka 0,03 %",
      },
    },
    entrelosning: {
      namn: "Länsförsäkringar fondförsäkring, entrélösningen (LF Entré ITP)",
      aktieandel: {
        // All in equity funds until six years before pension, then moved
        // over to bond funds during 20 years (with lifelong payout) until 25 %
        // remains in equities. The move is read as linear. With pension at 65
        // this matches "normally starts at 59".
        typ: "forePension",
        startandel: 1.0,
        startArForePension: 6,
        langdAr: 20,
        slutandel: 0.25,
        kalla: "Länsförsäkringars förköpsinformation ITP (2026-01-01); Konsumenternas, Jämför tjänstepensioner ITP 1 (2026-10)",
      },
      avgift: {
        // Equity part: LF Global Index 80 % and LF Sverige Vision 20 %.
        // Bond part: LF Kort Räntefond and LF Lång Räntefond. LF states the
        // total as 0.08 % when young and 0.06 % at 25 % equity; the bond
        // part's rate is derived from that.
        procentAktiedel: 0.0008,
        procentRantedel: 0.00053,
        fastKr: 0,
        takKr: null,
        golvKr: null,
        procentUtanTak: 0,
        kalla: "Länsförsäkringars förköpsinformation ITP (2026-01-01): 0 kr fast avgift, 0 % kapitalavgift, 0,08–0,06 % årlig avgift",
      },
    },
  },

  // --- Display ------------------------------------------------------------
  minstaVinstForTrafikljus: {
    varde: 10000,
    enhet: "kr",
    beskrivning: "Är vinsten med att flytta mindre än så visas inget trafikljus",
    kalla: "Antagande",
  },
  trafikljusGulFran: {
    varde: 0.1,
    enhet: "andel av vinsten",
    beskrivning: "Under den här andelen uppnådd vinst är trafikljuset rött",
    kalla: "Antagande",
  },
  trafikljusGronFran: {
    varde: 0.9,
    enhet: "andel av vinsten",
    beskrivning: "Från den här andelen uppnådd vinst är trafikljuset grönt",
    kalla: "Antagande",
  },
  aldersvarningFran: {
    varde: 55,
    enhet: "år",
    beskrivning: "Från den här åldern visas en varning om att det är mindre självklart att flytta",
    kalla: "Antagande",
  },
};
