# Beslut

En daterad post per beslut. Poster raderas aldrig. Ett beslut som ersätts får
en hänvisning framåt till det nya.

## 1. Verktygen körs i webbläsaren, utan server (2026-10-22)

Räknesnurrorna skrivs i ren JavaScript och körs helt i besökarens webbläsare.
Lön och pensionskapital lämnar därför inte användarens dator, och det finns
ingen server att drifta eller betala för. Python valdes bort eftersom det inte
körs i webbläsaren utan en server eller en nedladdning på flera megabyte.

Inget byggsteg och inga ramverk: filerna publiceras som de är.

Beräkningen körs fortfarande i webbläsaren, men uppgifterna lämnar nu datorn för
statistiken, se 24.

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
tredje parter kontaktas av servern, aldrig av besökarens webbläsare. För
statistiken gjordes ett undantag i 24, som togs bort i 26.

Uppdatering sker för hand: filerna skrivs över via FTP och sajtens cache
rensas i WordPress. Den första installationen gjordes med zip-fil, se 21.
Automatisk uppdatering från GitHub valdes bort på
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

Delvis ersatt av 22: fält och knappar ärver sidans typsnitt genom vår CSS.

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
ett antagande som inte är bestämt. Bestämd i 19.

## 14. Användaren kan strunta i sparat kapital (2026-10-23)

Ett tredje val, "Vi struntar i sparat kapital", räknar bara på premierna från
och med nu, utifrån lönen. Den som inte vill eller kan ta reda på sitt kapital
får ändå ett svar.

## 15. Alecta räknas med 70 % aktier (2026-11-04)

Alecta räknas med 70 % aktier till 63 år, 60 % från 63 och 50 % från 66.

Alecta anger 60, 50 och 40 % aktier (faktablad 6187, från 15 mars 2026), men
har också 20 % alternativa tillgångar i alla tre inriktningarna: fastigheter,
alternativa krediter, infrastruktur och onoterat. De ligger mellan aktier och
räntor i avkastning. Under 2021–2025 gav de 5,0 % per år, mot 11,5 % för
aktierna och −0,4 % för räntorna i Alecta Optimal Pension, alltså knappt
halvvägs. Hälften av de alternativa räknas därför som aktier, vilket ger 10
procentenheter extra i varje steg.

## 16. Collectums avgift dras från premien (2026-11-04)

Modellen drar Collectums avgift, 0,55 % av premien och högst 450 kr per år,
innan premien fördelas på potterna. Den är inte en avgift på kapitalet och
det egna sparandet slipper den, så den hör hemma i jämförelsen med eget
sparande.

Taket hålls fast i dagens penningvärde, som Alectas avgiftstak. Det räknas på
hela premien, eftersom Collectum anger det per år och anställning.

## 17. Avgifterna för Alecta och entrélösningen ligger kvar (2026-11-04)

Alecta räknas med 0,05 % med tak plus 0,03 % i kapitalförvaltningskostnad,
entrélösningen med 0,08 % på aktiedelen.

Alectas totala kapitalförvaltningskostnad är 0,14 %, men av den är det bara
cirka 0,09 % som motsvarar en fonds årliga avgift, och den redovisade
avkastningen kan redan vara räknad efter de externa kostnaderna. Skillnaden är
inte avgörande för resultatet.

För entrélösningen visar avtalat.se 0,07–0,06 % i årlig avgift
(2026-11-04), och den totala avgiften ligger ofta en baspunkt högre. Det
stämmer med 0,08 % när allt ligger i aktier.

## 18. Lönen får ett karriärpåslag till 50 år (2026-11-04)

Lönen växer 2,5 % per år till 50 år och sedan 1,5 %. Inkomstbasbeloppet växer
1,5 % hela vägen.

Inkomstbasbeloppet följer genomsnittet, som hålls nere av att de som lämnar
arbetsmarknaden tjänar mer än de som kommer in. En enskild person gör också
karriär. Skillnaden spelar roll eftersom den avgör när lönen passerar
brytpunkten, där premien går från 4,5 % till 30 %.

Bland privatanställda tjänstemän 2025 är medellönen 44 900 kr vid 25–34 år,
54 000 kr vid 35–44, 60 100 kr vid 45–54 och 58 800 kr vid 55–64 (SCB). Det är
1,9 och 1,1 % per år upp till toppen och sedan en svag nedgång, därav stoppet
vid 50. Tvärsnittet visar också skillnader mellan generationer, så påslaget
hålls försiktigt på 1 procentenhet.

## 19. Skatten på pensionen är 30 % (2026-11-05)

Skatten på pensionen i jämförelsen med eget sparande är 30 %. Andreas har
bestämt det, och värdet är inte längre en platshållare. Det är ett antagande,
inte en beräkning av någons faktiska skatt, och det påverkar bara beloppet för
eget sparande per månad. Kapitalet och vinsten i kronor påverkas inte.

## 20. Trafikljuset och åldersvarningen ligger kvar (2026-11-05)

Andreas har gått igenom gränserna och behåller dem: rött under 10 % av vinsten,
grönt från 90 %, inget trafikljus när vinsten är under 10 000 kr och
åldersvarning från 55 år.

## 21. Första installationen med zip-fil, testmiljön först (2026-11-06)

Pluginen installerades som zip-fil via Tillägg i WordPress, inte via FTP.
Andreas kan då göra det själv med sin vanliga inloggning, utan FTP-uppgifter.
Sajtens webbansvarig rådde oss att först prova i testmiljön, sedan installera
på den skarpa sajten och där testa på en privat sida innan den publiceras. Så
gjorde vi. Hur senare uppdateringar laddas upp är inte bestämt.

## 22. Fält och knappar ärver sidans typsnitt (2026-11-06)

Temat stylar inte fält och knappar, och webbläsare låter dem inte ärva typsnitt
av sig själva. På sajten blev fälten därför små och fick webbläsarens typsnitt.
Vår CSS ger dem `font: inherit` och lite luft. Vi väljer inget eget typsnitt:
Andreas vill att sajtens tema styr det. Förhandsvisningen har inte längre egna
regler för fält och knappar, eftersom de dolde felet.

## 23. Källorna öppnas med en knapp (2026-11-06)

Källkolumnen i "Så har vi räknat" tog plats från övrig text, och ingen källa är
en länk. Sajtens webbansvarig föreslog en ikon med tooltip. Varje källa öppnas
i stället med en knapp, på en egen rad, eftersom en tooltip som visas vid hovring
inte fungerar på pekskärm.

## 24. Resultaten sparas i ett Google-ark, högst en gång per sidvisning (2026-11-07)

Vi vill veta hur många som får ett resultat och vilka resultat de får, med
exakta belopp, och kunna räkna på det i efterhand. Sajtens Plausible valdes bort:
det är byggt för besöksstatistik, data går inte att radera eller hämta ut på ett
smidigt sätt, och personuppgifter är inte tillåtna där. En fil eller en tabell på
sajtens server valdes också bort: det kräver att vi driftar kod som skriver på
servern och tar emot anrop från vem som helst, och en fil i pluginens mapp raderas
vid en uppdatering med zip-fil. Tabellen är nästa steg om arket inte räcker.
Webbläsaren skickar samma värden oavsett mottagare, så bara adressen ändras då.

Apps Script är enklast att bygga och ändra, och arket går att läsa direkt. Det är
ett undantag från att besökarens webbläsare inte ska kontakta tredje part (9):
Google får besökarens IP-adress i anropet, men den når varken skriptet eller
arket. Anropet görs utan kakor och utan sidans adress. Undantaget togs bort, se 26.

Det här sparas: dagen, allt besökaren fyllt i och allt vi räknat ut och visar.
Beräknade belopp avrundas som på sidan. IP-adress och klockslag sparas inte, så en
rad går inte att para ihop med sajtens loggar. Sidan säger vad vi sparar, och
integritetspolicyn får en rad om det. Vi ser inget samtycke som krävs för det här,
och det är Andreas bedömning som ansvarig.

Resultatet visas vid varje knapptryck och går inte att ändra när det väl är
skickat. Därför skickas det första gången besökaren lämnar sidan eller fliken,
med siffrorna just då, och sedan inte mer under sidvisningen. Den som byter flik
och sedan ändrar siffrorna räknas med de första, och den som laddar om sidan och
räknar igen räknas en gång till. Att känna igen en återkommande besökare skulle
kräva något sparat i webbläsaren, och det valdes bort.

När och hur ofta det skickas ersätts av 25.

## 25. En rad per sidvisning, med det besökaren såg sist (2026-11-09)

Den som ska räkna behöver oftast hämta sina uppgifter på avtalat.se eller
minpension.se i en annan flik. Med en rad vid första flikbytet (24) kom ofta en
gissning eller ett halvfärdigt resultat med i stället för de riktiga siffrorna.

Därför skickas sidvisningen varje gång besökaren lämnar sidan eller fliken, om
något har ändrats, och skriptet skriver över sidvisningens rad i stället för att
lägga till en. Raden känns igen på en slumpad kod som bara finns i sidans minne.
Den sparas inte i webbläsaren, så det krävs inget samtycke enligt reglerna om
kakor, och den säger inget om besökaren. Den som laddar om sidan, eller vars
mobil har stängt sidan i bakgrunden, får en ny kod och en ny rad.

Även sidvisningar utan resultat sparas, med det som är ifyllt så långt, så att
det syns hur långt de kommer som inte blir klara. Inget skickas innan besökaren
har fyllt i något. Raden visar alltid läget sist besökaren lämnade sidan, så den
som tar bort ett fält efter ett resultat får en rad utan resultat.

## 26. Statistiken går via sajtens server (2026-11-09)

Med anropet direkt från webbläsaren (24) fick Google besökarens IP-adress. Det
kan kräva samtycke, och sajtens webbansvarig påpekade att det bröt mot hans
princip om tredje part (9). Nu skickar webbläsaren till pluginen på sajten, som
genast skickar vidare till Apps Script. Google ser bara serverns adress, och
pluginen skickar inte vidare besökarens.

Att spara i en fil eller tabell och skicka till Google var 15:e minut valdes bort.
Det kräver lagring på servern som ska rensas och överleva uppdateringar, och
WordPress schemalagda körningar går bara när sajten har besök. Skriptet behöver
också slå ihop flera anrop med samma kod. Att skicka vidare direkt lagrar inget
och lämnar skriptet som det är. Nackdelen är att ett anrop som misslyckas
försvinner, i stället för att försökas igen.

Pluginen får därmed sin första kod som tar emot anrop från vem som helst. Den
släpper bara igenom små JSON-objekt och skickar dem bara till skriptet, som
kontrollerar varje värde.

## 27. Mottagaren kräver en nyckel när en är satt, och söker bara bland de senaste raderna (2026-11-09)

Adressen till Apps Script är publik, för förhandsvisningen publicerar repot, så vem
som helst kunde skriva rader direkt i arket. När egenskapen `SGV_NYCKEL` är satt i
skriptet kräver `doPost` samma värde som `?nyckel=...`. Sajtens plugin håller sin
kopia i WordPress-databasen, se 29. Innan egenskapen är satt accepteras alla anrop,
så utrullningen kan göras i vilken ordning som helst, men sätt egenskapen sist.
`provkor()` går förbi `doPost` och fungerar alltid.

Kodsökningen läser nu bara de senaste 5000 raderna i stället för hela kolumnen, som
blir långsam när arket växer. En sidvisning skickar igen inom några minuter, så en
kod äldre än så får en dubblettrad i stället för att skriva över, vilket är okej
för statistiken.

## 28. Statistik-endpointen är taktsbegränsad och vidarebefordrar bara små JSON-objekt (2026-11-09)

`POST /wp-json/sgv/v1/itp-resultat` är öppen för alla, som sidan själv, och varje
anrop höll tidigare en PHP-arbetare upp till tio sekunder mot Google. En flod av
anrop kunde då ta ner sajten, och vem som helst kunde skicka förfalskade rader till
arket genom sajten. Nu räknas anrop per adress och totalt (10 respektive 120 per
minut) i transienter innan något skickas vidare, och överskridande ger 429. Kroppen
ska vara högst 3000 tecken och ett JSON-objekt med högst 30 strängnycklar, och
timeouten mot skriptet är 5 sekunder. Google är ibland långsamt att starta, och med
3 sekunder räknades många anrop som misslyckade fast raden sparades. Endast räknare
över skickade, misslyckade och begränsade anrop sparas i wp_options
(`sgv_matning_stat`), aldrig rapporterna. Väntetiden ändrades till 3 sekunder, se 30.

Räkningen per adress sparar en hash av besökarens IP-adress som nyckel i en
transient, i en minut. Det är det enda om besökaren som sajten sparar för
statistiken, och det görs för att skydda sajten.

Allt ligger i pluginen, så inget behöver ändras i wp-config.php eller i nginx.
Saknas X-Forwarded-For blir adressräkningen en global gräns, vilket fortfarande
skyddar PHP-arbetarna. Filversionen är nu en hash av senaste ändringstiden, så
serverns klocka inte syns i URL:erna.

## 29. Nyckeln till statistikmottagaren ligger i wp_options och visas i admin (2026-11-09)

Repot publiceras via GitHub Pages, så en nyckel i en fil i repot skulle vara
offentlig. Därför ligger nyckeln i WordPress-databasen (`sgv_itp_nyckel`), skapad
första gången någon öppnar en admin-sida, och visas på Inställningar ->
Småspararguiden för den med behörigheten manage_options. Sidan är byggd enbart med
WordPress inbyggda admin-komponenter, utan egen CSS. Där finns också en länk till
kalkylarket, räknare över anrop till endpointen (se 28) och en knapp som skickar en
provrad märkt `test` genom hela kedjan. Export av statistiken sker fortfarande från
själva kalkylarket; här sparas aldrig rapportinnehåll.

## 30. Väntetiden mot Google är 3 sekunder (2026-11-10)

Varje anrop till statistikadressen håller en PHP-process medan pluginen väntar på
Google, och servern har ett begränsat antal sådana. Väntar varje anrop länge kan
servern sluta svara på andra sidor. Sajtens webbansvarig bedömer att nästan alla
anrop till Google är klara inom 3 sekunder, så väntetiden är 3 sekunder i stället
för 5 (28). Det som tar längre tid räknas som misslyckat i räknarna på
inställningssidan. Om raden ändå sparas i de fallen vet vi inte, så vi följer
räknaren och höjer bara om den visar många misslyckade.

## 31. Kapitalet vid 68 år fälls ihop, och uppmaningarna ligger i WordPress (2026-11-10)

Under resultatet ska det finnas uppmaningar att flytta, att donera via Octanys
Swish-widget och senare att skriva till facket. De byggs med vanliga block i
WordPress under kortkoden i stället för i pluginen, så att de går att ändra utan
en ny version och widgetarna används som på resten av sajten. Kortkoden ritar
hela snurran i ett stycke, så blocken hamnar efter den. Med staplarna och
CSV-knappen hopfällda kommer de ändå strax efter antagandena, där besökaren
fortfarande läser.

Att flytta in blocken mitt i resultatet valdes bort tills vidare. Resultatet
ritas om vid varje knapptryck, så det kräver mer kod för att blocken inte ska
försvinna. Det är nästa steg om avståndet visar sig för stort.

Även antagandena och "Så har vi räknat" fälldes ihop, se 32.

## 32. Allt utom huvudresultatet ligger i en expander (2026-11-10)

Med bara kapitalet hopfällt (31) låg antagandena, texten om vad vi sparar och
"Så har vi räknat" fortfarande mellan resultatet och uppmaningarna, och på
datorn scrollade man lätt inte så långt. Nu ligger antagandena, kapitalet och
"Så har vi räknat" i en ruta, "Se ditt kapital vid 68 år och hur vi har räknat",
direkt efter huvudresultatet. Kapitalet och beräkningen blir expandrar inuti den,
alltså dubbla för den som vill se dem.

Antagandena syns därmed inte längre utan ett klick. Det är en avvägning: de
säger till exempel att vi räknat som om allt ligger i traditionell försäkring,
men uppmaningarna väger tyngre. Texten om vad vi sparar flyttades i stället
överst i snurran, så att besökaren ser den innan hen fyller i något och den inte
göms i rutan.
