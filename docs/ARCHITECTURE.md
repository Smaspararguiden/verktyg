# Arkitektur

## Översikt

Varje verktyg ligger i en egen mapp och består av statiska filer som körs i
besökarens webbläsare. En WordPress-plugin skickar filerna från sajtens server
och lägger in verktyget där dess kortkod står. Det finns inget byggsteg.

```
smaspararguiden-verktyg.php   pluginen: en kortkod per verktyg
<verktyg>/
  parametrar.js   alla antaganden, med beskrivning och källa
  berakning.js    beräkningsmodulen: parametrar + indata -> siffror
  visning.js      visningen: ritar inmatning, resultat och "Så har vi räknat"
  stil.css        stilar för verktygets egna komponenter
  index.html      förhandsvisning utanför WordPress
```

Beräkningsmodulen importerar inget från visningen. Visningen anropar
beräkningsmodulen och läser parameterfilen för "Så har vi räknat".

## Publicering

Pluginen läggs i `wp-content/plugins/smaspararguiden-verktyg/` på sajten:
`smaspararguiden-verktyg.php` och verktygens mappar, som de ligger i repot.
Första gången aktiveras den i WordPress. Därefter skrivs ändrade filer över
via FTP, och sajtens cache rensas i WordPress.

Kortkoden ger ett tomt element med klassen `sg-itp` och laddar `visning.js`
som modul. Stilmallen läggs till av kortkoden, så den laddas bara på sidor
som använder verktyget. Alla filadresser får `?ver=` med den senaste
ändringstiden bland verktygets filer. `visning.js` laddar de andra modulerna
med samma `?ver=`, så en uppladdning byter alla adresser på en gång.

GitHub Pages publicerar `main` som förhandsvisning:
https://smaspararguiden.github.io/verktyg/itp/

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

Visningen är `visning.js` och `stil.css`. `visning.js` ritar formuläret i
sidans `.sg-itp`-element, läser det, anropar `berakna()` vid varje ändring och ritar resultatet. Den
har inga egna siffror. "Så har vi räknat" ritas direkt från parameterfilen,
och knappen "Ladda ner år för år" ger tabellen från `berakna()` som CSV
(semikolon och decimalkomma, för svenska Excel och Sheets). Inget lämnar
webbläsaren.

Den som inte har ITP1 i sin nuvarande anställning bockar ur en ruta. Då
döljs lönen och `berakna()` får månadslön 0, vilket ger inga nya premier.

Användarens ålder räknas som innevarande år minus födelseår. Den som är född
före 1979 har ITP2 och får ett meddelande i stället för ett resultat.

Stilarna i `stil.css` gäller bara inuti `.sg-itp`. Rubriker, text, fält,
knappar och tabeller lämnas åt WordPress-temat. `index.html` är en
förhandsvisning med samma element och några regler som står i för temat.

Förhandsvisningen använder ES-moduler och måste därför visas via en
webbserver, inte som fil. Lokalt: `python -m http.server` i repots rot och
sedan `/itp/`.
