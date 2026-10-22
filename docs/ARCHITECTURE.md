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

## Status

Bara `itp/parametrar.js` finns än så länge (första utkastet). Beräkningsmodul
och visning är inte byggda.
