// Parameters for the fund vs ETF cost comparison. Anything marked VERIFIERA
// must be checked against a source before the tool is published. The
// calculation module reads everything from here and holds no numbers of its
// own. The "Så har vi räknat" view renders this file, which is why every value
// carries a description and a source.
//
// All amounts are kronor. Shares are decimals: 0.0025 = 0.25 %.

export const parametrar = {
  // --- Brokerage ------------------------------------------------------------
  courtageklasser: {
    // Courtage for one trade is max(procent × belopp, minimum). A flat fee is
    // procent 0 with the fee as minimum. Avanza's classes for foreign
    // exchanges are left out: their minimum is in euro or pound, and for now
    // the tool counts everything in kronor.
    varde: [
      { id: "avanza-mini", namn: "Avanza Mini", procent: 0.0025, minimum: 1 },
      { id: "avanza-small", namn: "Avanza Small", procent: 0.0015, minimum: 39 },
      { id: "avanza-medium", namn: "Avanza Medium", procent: 0.00069, minimum: 69 },
      { id: "avanza-fast", namn: "Avanza Fast Pris", procent: 0.00045, minimum: 99 },
      { id: "nordnet-mini", namn: "Nordnet Mini, Norden", procent: 0.0025, minimum: 1 },
      { id: "nordnet-liten", namn: "Nordnet Liten, Norden", procent: 0.0015, minimum: 39 },
      { id: "nordnet-mellan", namn: "Nordnet Mellan, Norden", procent: 0.00069, minimum: 69 },
      { id: "nordnet-fast", namn: "Nordnet Fast, Norden", procent: 0, minimum: 99 },
      { id: "nordnet-mini-utland", namn: "Nordnet Mini, utanför Norden", procent: 0.0025, minimum: 9 },
      { id: "nordnet-liten-utland", namn: "Nordnet Liten, utanför Norden", procent: 0.0015, minimum: 49 },
      { id: "nordnet-mellan-utland", namn: "Nordnet Mellan, utanför Norden", procent: 0.00089, minimum: 69 },
      { id: "nordnet-fast-utland", namn: "Nordnet Fast, utanför Norden", procent: 0.00079, minimum: 99 },
    ],
    enhet: "courtageklasser",
    beskrivning: "Courtage för en affär med ETF:er: en procent av beloppet, men minst minimiavgiften. Avanzas klasser gäller ETF:er på Stockholmsbörsen. Nordnets avgifter utanför Norden gäller bland annat Xetra, London, Amsterdam och Paris",
    kalla: "Avanza, prislista handel Sverige och courtageklasser (raden Börshandlade fonder), och Nordnet, prislista, lästa 27 november 2026. VERIFIERA: Nordnets prislista har ingen egen rad för ETF:er i Norden, vi har antagit att de följer aktiernas klasser",
  },
  standardCourtage: {
    // The class the form starts with. Mini is the class most new savers have.
    varde: "avanza-mini",
    enhet: "courtageklass",
    beskrivning: "Courtageklassen som är vald när sidan öppnas",
    kalla: "Antagande (Småspararguiden): Mini är den klass de flesta nya sparare har",
  },
  valutavaxling: {
    varde: 0.0025,
    enhet: "per växling",
    beskrivning: "Avgift för att växla kronor till ETF:ens valuta vid köp, och tillbaka vid försäljning. Med valutakonto är det billigare: 0,125 % hos Avanza och 0,075 % hos Nordnet",
    kalla: "Avanza, prislista handel utland, och Nordnet, prislista, avsnittet Spread, lästa 27 november 2026: automatisk växling kostar 0,25 % hos båda",
  },

  // --- The comparison --------------------------------------------------------
  antalAr: {
    varde: 30,
    enhet: "år",
    beskrivning: "Hur länge innehavet räknas som längst",
    kalla: "Antagande (Småspararguiden)",
  },
  belopp: {
    varde: 100000,
    enhet: "kr",
    beskrivning: "Exempel på belopp som köps vid start och säljs vid slutet",
    kalla: "Exempel",
  },
  fondAvgift: {
    varde: 0.002,
    enhet: "per år",
    beskrivning: "Exempel på fondens årliga avgift",
    kalla: "Exempel, ingen särskild fond",
  },
  etfAvgift: {
    varde: 0.0007,
    enhet: "per år",
    beskrivning: "Exempel på ETF:ens årliga avgift",
    kalla: "Exempel, ingen särskild ETF",
  },
  spread: {
    varde: 0.002,
    enhet: "av beloppet",
    beskrivning: "Exempel på spread: skillnaden mellan köp- och säljkurs. Halva spreaden betalas vid köp och halva vid försäljning",
    kalla: "Exempel, ingen särskild ETF",
  },
};
