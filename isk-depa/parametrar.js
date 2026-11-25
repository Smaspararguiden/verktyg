// Parameters for the ISK vs depå simulator. First draft. Anything marked
// VERIFIERA must be checked against a source before the tool is published.
// The calculation module reads everything from here and holds no numbers of
// its own. The "Så har vi räknat" view renders this file, which is why every
// value carries a description and a source.
//
// All amounts are nominal kronor. Shares are decimals: 0.0255 = 2.55 %.

export const parametrar = {
  // --- ISK -----------------------------------------------------------------
  statslanerantan: {
    // Changes every year. The rate for 2027 (set 30 November 2026) replaces
    // this one when it is known; the page lets the user type another.
    varde: 0.0255,
    enhet: "per år",
    beskrivning: "Statslåneräntan den 30 november året före beskattningsåret. ISK-skatten bygger på den",
    kalla: "Riksgälden; Skatteverket. 2,55 % gäller ISK-skatten 2026",
  },
  schablonPaslag: {
    varde: 0.01,
    enhet: "procentenheter",
    beskrivning: "Läggs på statslåneräntan för att få schablonräntan på ISK",
    kalla: "Skatteverket, skatt på investeringssparkonto (2026)",
  },
  schablonGolv: {
    varde: 0.0125,
    enhet: "per år",
    beskrivning: "Schablonräntan på ISK blir aldrig lägre än så här",
    kalla: "Skatteverket, skatt på investeringssparkonto (2026)",
  },
  fribelopp: {
    // Per person, shared by all of the person's ISK and kapitalförsäkringar.
    // The page counts it only when the user ticks the box.
    varde: 300000,
    enhet: "kr",
    beskrivning: "Så stor del av kapitalunderlaget är skattefri, per person och för alla ISK och kapitalförsäkringar tillsammans",
    kalla: "Skatteverket, skatt på investeringssparkonto (2026)",
  },

  // --- Depå and savings account --------------------------------------------
  skattesatsKapital: {
    varde: 0.30,
    enhet: "andel",
    beskrivning: "Skatt på kapitalinkomster: vinster, räntor och ISK:s schablonintäkt",
    kalla: "Skatteverket, skatt på kapitalinkomster",
  },
  fondSchablon: {
    // Taxed at skattesatsKapital, so 0.4 % × 30 % = 0.12 % of the value at
    // the start of the year.
    varde: 0.004,
    enhet: "andel av värdet 1 januari",
    beskrivning: "Schablonintäkt på fondandelar på depån. Med 30 % skatt blir det 0,12 % av värdet vid årets början",
    kalla: "Skatteverket, schablonintäkt på fondandelar",
  },
  statensAndelAvForlust: {
    // The simulator models the whole depå, so a loss on it has no gains in
    // the depå to be set off against. 21 % is then what everyone gets: 70 %
    // of the loss is deductible, at 30 %. 30 % needs gains elsewhere.
    varde: 0.21,
    alternativ: [
      { varde: 0.21, text: "21 % – förlusten dras av mot andra kapitalinkomster eller ger skattereduktion" },
      { varde: 0.30, text: "30 % – du har andra vinster på marknadsnoterade aktier och fonder att kvitta mot" },
    ],
    enhet: "andel av förlusten",
    beskrivning: "Så stor del av en förlust på depån som du får tillbaka i lägre skatt när du säljer",
    kalla: "Skatteverket, förlust vid försäljning av marknadsnoterade aktier och fonder: full kvittning mot vinster på sådana, annars är 70 % avdragsgill",
  },
  kontoranta: {
    varde: 0.02,
    enhet: "per år",
    beskrivning: "Ränta på sparkontot där den del som inte ligger i aktier står. Räntan beskattas med 30 % varje år",
    kalla: "Antagande (Småspararguiden) – VERIFIERA mot aktuella sparkonton med insättningsgaranti",
  },

  // --- The comparison --------------------------------------------------------
  aktieandelSammaPengar: {
    varde: 1.0,
    enhet: "andel",
    beskrivning: "Aktieandel på både ISK och depå i jämförelsen samma pengar",
    kalla: "Antagande (Småspararguiden): så sparar de flesta av våra läsare",
  },
  aktieandelIskSammaRisk: {
    // Below 100 % so the depå can take more equities without borrowing.
    varde: 0.7,
    enhet: "andel",
    beskrivning: "Aktieandel på ISK i jämförelsen samma risk. Resten står på sparkonto. Depån får så mycket mer aktier att risken blir lika stor",
    kalla: "Exempel (Småspararguiden), ingen rekommendation",
  },
  scenarier: {
    // forstaAret is the return in year 1, ovrigaAr the return every year
    // after. Returns are nominal and after the fund's own fee.
    varde: [
      { namn: "Normalläge", forstaAret: 0.08, ovrigaAr: 0.08 },
      { namn: "Goda tider", forstaAret: 0.12, ovrigaAr: 0.12 },
      { namn: "Halvdåligt", forstaAret: 0.05, ovrigaAr: 0.05 },
      { namn: "Nominellt noll", forstaAret: 0, ovrigaAr: 0 },
      { namn: "Krasch år 1", forstaAret: -0.5, ovrigaAr: 0.08 },
    ],
    enhet: "avkastning per år",
    beskrivning: "Avkastning på aktierna, nominellt och efter fondens avgift. Normalläget är 6 % real avkastning och 2 % inflation",
    kalla: "Antaganden (Småspararguiden)",
  },
  horisonter: {
    varde: [1, 5, 10, 20, 30],
    enhet: "år",
    beskrivning: "Hur länge pengarna står innan allt säljs",
    kalla: "Antagande (Småspararguiden)",
  },
  startbelopp: {
    varde: 100000,
    enhet: "kr",
    beskrivning: "Exempel på belopp som sätts in från början. Det står på kontot redan 1 januari första året",
    kalla: "Exempel",
  },
  manadssparande: {
    varde: 0,
    enhet: "kr/mån",
    beskrivning: "Exempel på månadssparande, insatt i början av varje månad",
    kalla: "Exempel",
  },
};
