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
