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

Visningen är `index.html`, `stil.css` och `visning.js`. `visning.js` läser
formuläret, anropar `berakna()` vid varje ändring och ritar resultatet. Den
har inga egna siffror. "Så har vi räknat" ritas direkt från parameterfilen,
och knappen "Ladda ner år för år" ger tabellen från `berakna()` som CSV
(semikolon och decimalkomma, för svenska Excel och Sheets). Inget lämnar
webbläsaren.

Den som inte har ITP1 i sin nuvarande anställning bockar ur en ruta. Då
döljs lönen och `berakna()` får månadslön 0, vilket ger inga nya premier.

Användarens ålder räknas som innevarande år minus födelseår. Den som är född
före 1979 har ITP2 och får ett meddelande i stället för ett resultat.

Sidan använder ES-moduler och måste därför visas via en webbserver, inte som
fil. Lokalt: `python -m http.server` i repots rot och sedan `/itp/`.
