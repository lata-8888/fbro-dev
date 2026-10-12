# Wardley Maps

Wardley Maps erstellen, verwalten und pflegen. PWA mit Vanilla JS (kein Build-Schritt für die App selbst),
Supabase als Backend und GitHub Pages als Hosting. Aufbau wie FBRO.

Zwei Betriebsarten, gesteuert über `config.js`:

| Modus | `BACKEND` | Daten | Zweck |
|---|---|---|---|
| lokal | `'local'` (Standard im Repo) | `localStorage` im Browser | Ausprobieren ohne Server |
| Supabase | `'supabase'` | Postgres mit Row Level Security | Mehrere Personen, echte Rechte |

Im Supabase-Modus erzeugt der Build `config.js` automatisch aus den GitHub-Variablen.
Die Anleitung dazu steht in **DEPLOY.md**.

## Lokal starten

    python3 -m http.server 8080      # oder: npm run serve

Dann `http://localhost:8080` öffnen. Die Anmeldung läuft wie bei FBRO mit Länderwahl (CH, DE, Andere), Mobilnummer und PIN. Das PIN-Feld darf leer bleiben,
dann gilt die Standard-PIN: die letzten 6 Ziffern der Nummer. Demo-Logins im lokalen Modus:

| Mobilnummer | PIN | Person | Rolle |
|---|---|---|---|
| 079 111 11 11 | 111111 | Admin | Admin |
| 079 222 22 22 | 222222 | Anna | Bearbeiterin der Beispiel-Map |
| 079 333 33 33 | 333333 | Ben | Leser der Beispiel-Map |

Die Nummer darf als `079 …`, `+41 79 …`, `0041 79 …` oder `+41 (0)79 …` eingegeben werden.

Gegen ein Supabase-Projekt lokal testen: `config.example.js` als `config.js` speichern und ausfüllen.
Diese Datei nicht committen.

## Module

Oberfläche im Stil der FBRO-App: Mobile-first, untere Icon-Leiste (Library, Admin nur für Admins, Profil),
Aktionen pro Eintrag gebündelt unter dem «…»-Knopf, grosse Titel mit Barlow Condensed (lokal in `fonts/`).

- Profil: Name und Nummer, Rollen, Sprache (Deutsch, English), Darstellung (Hell, Dunkel, Automatisch), App installieren, Abmelden.
  Sprache und Darstellung werden pro Gerät im Browser gespeichert (`localStorage`).
- Library: Karten mit Vorschau, Suche, «+» für neue Map (leer, Teeshop-Vorlage oder JSON-Import), «…» pro Karte: Öffnen, Duplizieren, Teilen, Löschen.
- Designer: Werkzeugleiste (Auswählen, Baustein, Verbinden, Rückgängig, Wiederholen), «…» oben rechts: Version speichern, Export SVG und JSON. Bausteine setzen und verschieben, Verbinden, Entwicklungspfeile, Beschriftungsposition,
  Undo und Redo (Strg+Z, Strg+Y), Autosave, Versionen mit Wiederherstellung, Export als SVG und JSON.
- Admin Console: Personenliste, «+» legt eine Person mit Mobilnummer an, «…» pro Person: Admin-Rolle, aktivieren oder deaktivieren, PIN zurücksetzen
  (auf Standard oder eigene PIN), löschen.

Rechte pro Map: Besitzer, Bearbeiter, Leser. Admins sehen und verwalten alles.

## Projektstruktur

| Pfad | Inhalt |
|---|---|
| `index.html`, `app.js`, `i18n.js`, `styles.css`, `fonts/` | Die App. `app.js` enthält `LocalApi` und die Supabase-Schicht hinter derselben Schnittstelle |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA |
| `assets/logo.png`, `scripts/make-icons.py` | Logo (Quelle) und Skript, das daraus alle Icons in `icons/` erzeugt (`python3 scripts/make-icons.py`, braucht Pillow) |
| `config.js` | Lokale Standardkonfiguration (im Repo ohne Zugangsdaten) |
| `config.example.js` | Vorlage für Supabase |
| `supabase/schema.sql` | Tabellen, Row Level Security, Trigger, Admin-RPCs (idempotent) |
| `supabase/seed.sql` | Erster Admin |
| `scripts/check.js` | Statische Prüfungen (Syntax, SHELL, RLS, Tabellen und RPCs, Secrets) |
| `scripts/build.js` | Baut `dist/`: `config.js` aus Variablen, SW-Cache-ID, Content-Security-Policy |
| `.github/workflows/ci.yml` | Prüfungen bei Pull Requests und Branches |
| `.github/workflows/deploy.yml` | Prüfen, bauen und auf GitHub Pages veröffentlichen |
| `DEPLOY.md` | Einrichtung, Checkliste, Regressionstest, Fehlersuche |

## Datenmodell

- `profiles` (Name, Mobilnummer, Admin, aktiv), verknüpft mit `auth.users`. Die Nummer ist nur für Admins lesbar
- `maps` mit `data jsonb` (Nodes, Links, Entwicklungspfeile), Besitzer, Revisionsnummer
- `map_members` (Bearbeiter oder Leser pro Map)
- `map_versions` (Snapshots, höchstens 50 pro Map)

Rechte werden in der Datenbank durchgesetzt (RLS und `security definer`-Funktionen), nicht nur im Client.
Personen anlegen, PIN zurücksetzen, Rollen ändern und löschen laufen über RPCs, die `is_admin()` prüfen.

## Bekannte Grenzen

- Kein Zoom und Pan im Designer, keine Mehrfachauswahl.
- Kein Konfliktschutz bei gleichzeitigem Bearbeiten derselben Map: wer zuletzt speichert, gewinnt.
  Die Spalte `rev` ist dafür vorbereitet.
- Deutsch und Englisch. Texte laufen über `t()`, Übersetzungen stehen in `i18n.js` (Schlüssel = deutscher Text). Karteninhalte und die Teeshop-Vorlage bleiben deutsch.
- Profil-Einstellungen gelten pro Gerät, nicht pro Konto.
- Im lokalen Modus liegen PINs im Klartext im Browser. Mit Supabase übernimmt Auth das Hashing.
- Personen können ihre PIN nicht selbst ändern, nur ein Admin kann sie zurücksetzen (wie bei FBRO).
- Die Standard-PIN (letzte 6 Ziffern der Nummer) ist leicht zu erraten. Für sensible Daten beim Anlegen eine eigene PIN setzen.
