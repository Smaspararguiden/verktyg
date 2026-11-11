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
  matning.js      vad som sparas om ett resultat, och vart det skickas
  facket.js       mejlet till facket, med användarens belopp
  stil.css        stilar för verktygets egna komponenter
  index.html      förhandsvisning utanför WordPress
apps-script/      skript som tar emot resultat och sparar dem i ett Google-ark
```

Beräkningsmodulen importerar inget från visningen. Visningen anropar
beräkningsmodulen och läser parameterfilen för "Så har vi räknat".

## Publicering

Pluginen ligger i `wp-content/plugins/smaspararguiden-verktyg/` på sajten:
`smaspararguiden-verktyg.php` och de filer som verktygen laddar, för ITP-snurran
`parametrar.js`, `berakning.js`, `visning.js`, `matning.js`, `facket.js` och `stil.css`. Första gången
laddas den upp som en zip-fil via Tillägg i WordPress och aktiveras där. Zip-filen
har filerna i en mapp som heter `smaspararguiden-verktyg`. Ändrade filer skrivs
över via FTP, och sajtens cache rensas i WordPress.

Kortkoden ger ett tomt element med klassen `sg-itp` och laddar `visning.js`
som modul. Stilmallen läggs till av kortkoden, så den laddas bara på sidor
som använder verktyget. Alla filadresser får `?ver=` med en hash av den senaste
ändringstiden bland verktygets filer. `visning.js` laddar de andra modulerna
med samma `?ver=`, så en uppladdning byter alla adresser på en gång.

GitHub Pages publicerar `main` som förhandsvisning:
https://smaspararguiden.github.io/verktyg/itp/

## ITP-räknesnurran (`itp/`)

`berakning.js` exporterar `berakna(parametrar, indata)`, där indata är
`{ alder, manadslon, kapital: { obligatoriskTrad, flyttbarTrad, flyttbarFond }, andelPremieFond }`.
`andelPremieFond` är andelen av hela premien som användaren valt att lägga i
fond. Saknas den går allt till trad. `delaUppKapital(parametrar, trad, fond)`
delar det användaren ser på avtalat.se, trad och fond, i obligatorisk och
flyttbar del.
Den bygger fyra scenarier (allt i trad, allt möjligt flyttat, allt flyttat,
nuvarande), räknar vart och ett år för år och returnerar slutkapital, tabellen
år för år och de härledda resultaten (vinst, kostnad för regeln, redan
uppnått, trafikljus). Den räknar också om vinsterna till eget sparande per
månad med `privatSparandePerManad()`: vad användaren skulle behöva spara på
ISK varje månad fram till pensionsåldern för samma pension efter skatt. Det
egna sparandet räknas år för år i `simuleraPrivat()`, och `berakna()` returnerar
de åren också (`privatAr`), så att de syns i CSV-filen.

Ett scenario är en lista av potter med produkt, startkapital och andel av
premien. Produkterna (Alecta trad och entrélösningen) beskrivs helt i
parameterfilen: aktieandel och avgift.

Tester: `itp/berakning.test.js`, körs med `node --test`.

Visningen är `visning.js` och `stil.css`. `visning.js` ritar formuläret i
sidans `.sg-itp`-element, läser det, anropar `berakna()` vid varje ändring och ritar resultatet. Den
har inga egna siffror. "Så har vi räknat" ritas direkt från parameterfilen,
och knappen "Ladda ner år för år" ger tabellen från `berakna()`, med det
egna sparandet efter scenarierna, som CSV
(semikolon och decimalkomma, för svenska Excel och Sheets). Filen skapas i
webbläsaren. Under huvudresultatet ligger en hopfälld ruta, "Se ditt kapital
vid 68 år och hur vi har räknat", med antagandena, staplarna för kapitalet och
CSV-knappen, och inuti den "Ditt kapital" och "Så har vi räknat" som egna
expandrar. Rutan ritas inte om, och "Ditt kapital" hålls öppen när resultatet
ritas om. Allt som sajten lägger under kortkoden, som uppmaningar och Octanys
widgetar, ligger i WordPress och syns därför direkt efter huvudresultatet.
Förhandsvisningen visar en platshållare där. Texten om vad vi sparar står
överst i snurran. Texterna i "Så har vi räknat" HTML-escapas innan de ritas, så även
parameterfilens texter är säkra att rendera.

Kapitalet anges på ett av tre sätt: en total, som räknas som trad, en rad
per försäkring med belopp och trad eller fond, eller inte alls ("Vi struntar
i sparat kapital"), som ger kapital 0. Raderna summeras till trad
och fond och delas upp med `delaUppKapital()`. Andelen av kommande
inbetalningar till fond är ett valfritt fält. Det som användaren lämnar
tomt och som vi därför gissar listas i resultatet under "Det här har vi
antagit".

Den som inte har ITP1 i sin nuvarande anställning bockar ur en ruta. Då
döljs lönen och kommande inbetalningar, och `berakna()` får månadslön 0, vilket ger inga nya premier.

Användarens ålder räknas som innevarande år minus födelseår. Den som är född
före 1979 har troligen ITP2. Under födelseåret förklaras det, och att vissa
arbetsplatser har ITP1 för alla. I stället för rutan om nuvarande anställning
får de två rutor, båda urkryssade: ITP1 i nuvarande anställning (ger nya
premier) och ITP1 i en tidigare anställning (bara sparat kapital). Med någon
av dem ikryssad räknar sidan ändå.

Stilarna i `stil.css` gäller bara inuti `.sg-itp`. Rubriker, text och tabeller
lämnas åt WordPress-temat. Fält och knappar ärver sidans typsnitt och storlek
och får lite luft av oss, eftersom temat inte stylar dem. `index.html` är en
förhandsvisning med samma element och några regler som står i för temat.

I "Så har vi räknat" ligger varje källa på en egen rad som öppnas med en knapp.

## Mejl till facket

Kortkoden `[itp_mejl_till_facket]` ger en tom ruta som sajten placerar bland
sina egna block under snurran. `visning.js`, som laddas av `[itp_raknesnurra]`
på samma sida, letar upp rutan och fyller den med en knapp som visar ett mejl
till facket. Mejlet skapas av `facket.js` från resultatet och följer det när
användaren ändrar något. Beloppen är vad regeln kostar och vad det motsvarar i
månadssparande, det vill säga skillnaden mellan sparandet utan regeln och med
flytt. Mejlet går att kopiera eller öppna i mejlprogrammet, utan mottagare.
Rubrik och inledande text ligger i WordPress. Utan snurran på sidan förblir
rutan tom.

Själva mejlet kan också skrivas i WordPress, mellan kortkodens taggar:
`[itp_mejl_till_facket amne="…"]…[/itp_mejl_till_facket]`. Texten får
platshållarna `{kostnad}` och `{per_manad}`. PHP lägger texten oförändrad i en
`<template>` i rutan, och `facket.js` gör om WordPress stycken till vanlig text
och fyller i beloppen. Saknas månadsbeloppet stryks meningen med `{per_manad}`.
Utan ämne eller text används snurrans egna, `AMNE` och `MALL` i `facket.js`.

## Mätning

`matning.js` bestämmer vilka värden som lämnar webbläsaren och testas fristående.
`visning.js` skickar dem varje gång besökaren lämnar sidan eller fliken, om
något har ändrats sedan förra gången. Inget skickas innan besökaren har fyllt i
något. Varje sidvisning får en slumpad kod som bara finns i sidans minne och
skickas med varje gång.

Webbläsaren skickar till pluginen på sajten, `POST /wp-json/sgv/v1/itp-resultat`,
som genast skickar vidare till ett Apps Script och inte sparar något. Google ser
då sajtens server, inte besökaren. Pluginen ger sidan adressen i kortkodens
`data-insamling`. Förhandsvisningen har ingen sådan adress och skickar inget.
Endpointen är taktsbegränsad (10 anrop per minut och adress, 120 totalt, svar 429
vid överskridande) och tar bara emot små JSON-objekt med strängnycklar; pluginen
sparar bara räknare över anrop i databasen, aldrig rapporterna.

Skriptet, `apps-script/itp-resultat.gs`, kontrollerar varje värde och sparar i
fliken `Resultat` i det Google-ark det hör till. Finns koden redan skrivs den
raden över, annars läggs en ny till. Det blir en rad per sidvisning med det
besökaren såg sist, och kolumnen `resultat` säger om sidan visade ett resultat.
Ett okänt fält eller ett ogiltigt obligatoriskt värde ger ingen rad, och ett
ogiltigt frivilligt värde blir en tom cell. Koden söks bara bland de senaste 5000
raderna. När egenskapen `SGV_NYCKEL` är satt i skriptet krävs samma nyckel som
`?nyckel=` i anropet; pluginen skickar sin kopia från WordPress-databasen.

Varken sidan eller pluginen vet om raden sparades. Rader från allt annat än
sajten, som testmiljön, märks `test` i kolumnen `kalla`.

Skriptet klistras in i arket för hand. En ändring gäller först efter Deploy →
Manage deployments → New version, och adressen är då densamma. Ett nytt fält
läggs sist i skriptets lista. Skriptet lägger själv till dess rubrik.

Förhandsvisningen använder ES-moduler och måste därför visas via en
webbserver, inte som fil. Lokalt: `python -m http.server` i repots rot och
sedan `/itp/`.

Under Inställningar -> Småspararguiden finns nyckeln till mottagaren (i
wp_options, skickad som `?nyckel=`), en länk till kalkylarket, räknare över anrop
till endpointen och en knapp som skickar en provrad märkt `test` genom hela
kedjan. Sidan är byggd enbart med WordPress inbyggda admin-komponenter.
