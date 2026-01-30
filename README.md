# Artist & Event Discovery MCP Server

Ein MCP Server für Claude Code, der Lieblingskünstler verwaltet, Events findet und ähnliche Künstler vorschlägt.

## Installation

```bash
cd /home/dizzle/dev/EVENTS/ai
npm install
npm run build
```

Der Server ist bereits in `~/.claude.json` registriert. Nach einem Neustart von Claude Code ist er verfügbar.

## Verfügbare Tools

### Künstlerverwaltung

**add_artist** - Künstler hinzufügen
```
"Füge Moderat als Musiker hinzu mit Genres Electronic, Techno"
"Füge Gerhard Richter als Künstler hinzu"
```

**remove_artist** - Künstler entfernen
```
"Entferne Radiohead aus meiner Liste"
```

**list_artists** - Alle Künstler anzeigen
```
"Zeige meine Künstler"
"Zeige nur meine Musiker"
```

### Event-Suche

**search_events** - Events finden
```
"Suche Events in Kempten"
"Suche Konzerte in Berlin für die nächsten 2 Monate"
"Suche Events für Moderat in München"
```

Parameter:
- `location` (erforderlich): Stadt oder Region
- `artist_name` (optional): Bestimmter Künstler
- `radius_km` (optional): Suchradius in km (Standard: 100)
- `date_from` / `date_to` (optional): Zeitraum (YYYY-MM-DD)

### Ähnliche Künstler

**find_similar_artists** - Ähnliche Künstler finden
```
"Finde ähnliche Künstler zu Radiohead"
"Welche Bands sind ähnlich wie Moderat?"
```

### Web Scraping

**scrape_event_page** - Beliebige Webseiten durchsuchen
```
"Durchsuche https://www.bigbox-allgaeu.de/veranstaltungen nach Events"
"Scrape https://berghain.berlin nach Terminen"
```

## Beispiel: Events in Kempten/Allgäu

```
"Suche Events in Kempten"
"Durchsuche https://www.allgaeu.de/veranstaltungen nach Events"
```

**Getestete Event-Quellen für Allgäu:**
- https://www.allgaeu.de/veranstaltungen - Regionale Events
- Bandsintown API - Konzerte deiner Lieblingskünstler
- Songkick - Internationale Tourneen

## Datenablage

- Künstlerliste: `~/.artist-events/artists.json`

## Entwicklung

```bash
npm run dev    # TypeScript Watch Mode
npm run build  # Kompilieren
npm start      # Server starten (für Tests)
```
# event-agend
