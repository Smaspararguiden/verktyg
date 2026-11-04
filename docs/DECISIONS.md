# Beslut

En daterad post per beslut. Poster raderas aldrig. Ett beslut som ersätts får
en hänvisning framåt till det nya.

## 1. Verktygen körs i webbläsaren, utan server (2026-10-22)

Räknesnurrorna skrivs i ren JavaScript och körs helt i besökarens webbläsare.
Lön och pensionskapital lämnar därför inte användarens dator, och det finns
ingen server att drifta eller betala för. Python valdes bort eftersom det inte
körs i webbläsaren utan en server eller en nedladdning på flera megabyte.

Inget byggsteg och inga ramverk: filerna publiceras som de är.

## 2. Beräkning skild från visning (2026-10-22)

Varje verktyg har en beräkningsmodul som tar parametrar och användarens data
och returnerar siffror. Den vet inget om sidan. Det gör att den kan testas
fristående och jämföras med kalkylark rad för rad, och att samma beräkning kan
köras i Node om den någon gång behövs på en server.

## 3. Alla antaganden i en parameterfil (2026-10-22)

Avkastning, avgifter, skatt, premiesatser och liknande ligger i verktygets
parameterfil, med beskrivning och källa för varje värde. Beräkningsmodulen har
inga egna siffror. Antagandena ska vara lätta att ändra utan kodändring, och
"Så har vi räknat" visar samma fil som beräkningen använder.

Filen är JavaScript och inte `.env` eller JSON: den behöver kommentarer och
tabeller (aktieandel per ålder), och både webbläsaren och testerna kan läsa
den utan tolkning.

## 4. Eget repo (2026-10-22)

Verktygen ligger i ett eget repo. Smaspararguiden-Automations innehåller
interna Python-skript som hanterar API-nycklar och ignorerar `*.json`, och
smaspararboten deployar till produktion vid varje merge. Inget av dem hör ihop
med en publik webbsida. GitHub Team-planen ger obegränsat antal privata repos.

## 5. GitHub Pages som hosting (2026-10-22)

Pages ingår i Team-planen, och en merge till `main` publicerar. Alternativet att
ladda upp till WordPress-servern hos Hetzner via SFTP valdes bort: GitHub skulle
få skrivrätt till samma server som hela sajten. Sidan på Pages är publik även
från ett privat repo och får `noindex` tills den lanseras. Pages-adressen är
också testmiljön, så att andra kan testa via en länk.

Ersatt av 9: verktygen publiceras som WordPress-plugin. Pages finns kvar som
förhandsvisning.

## 6. Väntevärde i reala kronor (2026-10-22)

ITP-räknesnurran visar väntevärdet, i dagens penningvärde, och i första hand
kapital vid pension. Ett utfallsintervall valdes bort i första versionen.
Antagandena redovisas öppet i "Så har vi räknat".

## 7. En pensionsålder för alla, premier ända dit (2026-10-22)

ITP-räknesnurran räknar med samma pensionsålder för alla, 68 år, och med
premier fram till den. Dagens ITP1-avtal betalar premier till 66 år, men
riktåldern för pension höjs med tiden, och för den som är ung i dag blir den
troligen högre. Vi antar att avtalet följer med. Ingen anpassning efter
födelseår, åtminstone inte nu: en ålder är enklare att förklara.

Pensionsåldern är en parameter. Entrélösningens nedtrappning räknas från den,
så att den flyttar med om åldern ändras.

## 8. Typsnitt från repot, inte från Google Fonts (2026-10-22)

Räknesnurran använder sajtens typsnitt Lato, och filerna ligger i repot
(`itp/typsnitt/`, från Fontsource, med licensen OFL). Google Fonts valdes bort
eftersom varje besök då skickar besökarens IP-adress till Google. Bara
vanlig och fet vikt, och bara latinska tecken (som täcker å, ä och ö), för att
hålla nedladdningen liten.

Delvis ersatt av 10: på sajten används temats typsnitt. Filerna i repot
används bara av förhandsvisningen.

## 9. WordPress-plugin med kortkod, uppdaterad för hand via FTP (2026-10-22)

Verktygen publiceras som en WordPress-plugin, `smaspararguiden-verktyg.php`
i repots rot. Den skickar verktygets filer från sajtens egen server och
lägger in verktyget där en kortkod står, till exempel `[itp_raknesnurra]`.
Beräkningen körs fortfarande i besökarens webbläsare (1).

Skälet är integritet. Med iframe från GitHub Pages hämtade besökarens
webbläsare sidan från GitHub, som då fick IP-adress, tidpunkt och vilken
sida på smaspararguiden.se besökaren var på. IP-adressen är en
personuppgift. Som plugin pratar webbläsaren bara med smaspararguiden.se,
som redan tar emot besöket. Sajtens webbansvarig rekommenderade samma väg:
tredje parter kontaktas av servern, aldrig av besökarens webbläsare.

Uppdatering sker för hand: filerna skrivs över via FTP och sajtens cache
rensas i WordPress. Automatisk uppdatering från GitHub valdes bort på
webbansvarigs inrådan. Den kräver kod från tredje part i pluginen och ger
GitHub en väg in till sajten, samma invändning som i 5. Priset är att en
merge till `main` inte längre publicerar något på sajten.

För att besökarnas webbläsare inte ska blanda en ny uppladdning med gamla
filer i cachen får filernas adresser en version från den senaste
ändringstiden bland dem. Pluginen behöver alltså inget nytt versionsnummer
för varje ändring.

Pages finns kvar som förhandsvisning, med `noindex`, så att andra kan testa
via en länk innan en ändring laddas upp.

## 10. Temat stylar det vanliga, vi bara komponenterna (2026-10-22)

Utan iframe hamnar verktyget i samma sida som WordPress-temat. Rubriker,
text, fält, knappar och tabeller får temats utseende, så att verktyget ser
ut som resten av sajten och följer med om temat ändras. Vår CSS styler bara
verktygets egna komponenter: rutorna, nyckeltalen, staplarna och
trafikljuset.

Alla våra regler gäller bara inuti verktygets element (`.sg-itp`), så de
når inte resten av sidan. Shadow DOM, som stänger ute temat helt, valdes
bort: då försvinner också det vi vill ärva.

## 11. Användaren anger trad och fond, vi räknar ut vad som går att flytta (2026-10-22)

Avtalat.se visar kapitalet per bolag och försäkring, och för varje försäkring
om den är traditionell försäkring eller fondförsäkring. Den visar inte hur
mycket av den traditionella försäkringen som är den obligatoriska delen.
Användaren kan alltså inte ange den, och vi frågar bara efter trad och fond.

Vi räknar den obligatoriska delen som hälften av det totala kapitalet, men
aldrig mer än det som ligger i trad. Den har fått hälften av varje
inbetalning och alltid legat i trad. För den som aldrig gjort något val
stämmer det exakt. För den som haft fond länge blir den något för stor,
eftersom fonden vuxit snabbare, och vinsten med att flytta något för liten.
Det står i "Så har vi räknat".

Inmatningen börjar med ett val: "Allt ligger i traditionell försäkring" ger
ett fält för totalen, som står på avtalat.se:s startsida.
"Jag har flera olika pensionsbolag" ger en rad per försäkring med belopp och
trad eller fond. Pensionsbolag frågar vi inte efter: det avgör inte
sparformen säkert och används inte i beräkningen.

Vi tvingar ingen att ta reda på något. Ovanför valet står att den som är
osäker kan välja att allt ligger i trad, så ser man hur illa det kan vara.
Resultatet säger att vi har räknat så.

## 12. Fördelningen av kommande inbetalningar är valfri (2026-10-22)

Avtalat.se visar hur kommande inbetalningar fördelas, till exempel 50 %
traditionell försäkring och 50 % fondförsäkring. Användaren kan ange andelen
till fond, högst den flyttbara halvan. Lämnas fältet tomt går alla nya
inbetalningar till trad, och resultatet säger att vi har antagit det.

Det ersätter antagandet att nya inbetalningar går dit kapitalet ligger i dag.

## 13. Vinsten visas också som eget sparande per månad (2026-10-23)

Vinsten med att flytta allt som går, och vinsten om regeln togs bort och allt
fick flyttas, visas också som hur mycket användaren skulle behöva spara själv
varje månad fram till pensionsåldern för samma effekt. Ett månadsbelopp är
lättare att förstå än ett kapital långt fram.

Det egna sparandet antas ligga på ISK i en global indexfond: bara aktier,
samma reala avkastning som i pensionen, 0,2 % i avgift och ISK-skatt i stället
för avkastningsskatt. Det skattefria beloppet på ISK räknas inte med, eftersom
det delas med allt annat sparande personen har.

Jämförelsen görs efter skatt. Pensionen beskattas som inkomst när den betalas
ut, det egna sparandet på ISK gör det inte. Vinsten i pensionskapital räknas
därför ner med skatten på pensionen innan den jämförs. Skattesatsen, 30 %, är
ett antagande som inte är bestämt.

## 14. Användaren kan strunta i sparat kapital (2026-10-23)

Ett tredje val, "Vi struntar i sparat kapital", räknar bara på premierna från
och med nu, utifrån lönen. Den som inte vill eller kan ta reda på sitt kapital
får ändå ett svar.

## 15. Alecta räknas med 70 % aktier (2026-11-04)

Alecta räknas med 70 % aktier fram till 62 år, i stället för de 60 % som en
andrahandskälla anger. Alectas alternativa investeringar räknas delvis in som
aktier. Nedtrappningen därefter är oförändrad: 50 % från 63 år och 40 % från
66 år.
