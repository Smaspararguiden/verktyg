# Arkitektur

## Översikt

Varje verktyg ligger i en egen mapp och består av statiska filer som körs i
besökarens webbläsare. Det finns ingen server och inget byggsteg.

```
<verktyg>/
  parametrar.js   alla antaganden, med beskrivning och källa
  berakning.js    beräkningsmodulen: parametrar + indata -> siffror
  index.html      visningen: inmatning, resultat, "Så har vi räknat"
```

Beräkningsmodulen importerar inget från visningen. Visningen anropar
beräkningsmodulen och läser parameterfilen för "Så har vi räknat".

## Publicering

GitHub Pages publicerar från `main`. Sidan bäddas in i WordPress.

## ITP-räknesnurran (`itp/`)

`berakning.js` exporterar `berakna(parametrar, indata)`, där indata är
`{ alder, manadslon, kapital: { obligatoriskTrad, flyttbarTrad, flyttbarFond } }`.
Den bygger fyra scenarier (allt i trad, allt möjligt flyttat, allt flyttat,
nuvarande), räknar vart och ett år för år och returnerar slutkapital, tabellen
år för år och de härledda resultaten (vinst, kostnad för regeln, redan
uppnått, trafikljus).

Ett scenario är en lista av potter med produkt, startkapital och andel av
premien. Produkterna (Alecta trad och entrélösningen) beskrivs helt i
parameterfilen: aktieandel och avgift.

Tester: `itp/berakning.test.js`, körs med `node --test`.

## Status

Beräkningsmodulen finns. Visningen (`index.html`) är inte byggd.
