# FBRO Vereins-App – Projektkontext für Claude

## Umgebungen — IMMER klar unterscheiden

| | DEV | PRD |
|---|---|---|
| **GitHub** | `lata-8888/fbro-dev` | `fbro-8942/fbro-app` |
| **Supabase** | `hshchitgcweewnantxbs` | `dpiewpccucadlrtogvhh` |
| **Region** | eu-central-1 | eu-central-2 (Zürich) |
| **Status** | ✅ läuft | ✅ Login läuft, Schema vollständig, Daten werden nachgeladen |
| **GitHub Pages** | `lata-8888.github.io/fbro-dev/` | `fbro-8942.github.io/fbro-app/` |

**Regel:** Änderungen immer zuerst in DEV testen, dann in PRD deployen.

## Übersicht
Vanilla JS Single-Page-App für den Verein FBRO. Gehostet auf GitHub Pages, Backend auf Supabase.
Kein Build-Schritt — alle Dateien werden direkt ausgeliefert.

## Sicherheit
- Den `service_role`-Schlüssel **NIE** in `config.js` eintragen
- Nur der `anon public`-Key kommt in `config.js`

## Login-Logik
- Synthetic Email: `<phone_digits_ohne_plus>@fbro.app`
  Beispiel: `+41791234567` → `41791234567@fbro.app`
- PIN = letzte 6 Ziffern der Telefonnummer
- **`EMAIL_DOMAIN` muss in `config.js` aktiv gesetzt sein** (`EMAIL_DOMAIN: 'fbro.app'`). Die App baut die Login-Adresse in `phoneToEmail()` (app.js) als `<digits>@` + `EMAIL_DOMAIN`, **Fallback ohne Eintrag: `phone-login.app`**. Fehlt der Eintrag, sucht die App `…@phone-login.app`, findet den Migrations-User (`…@fbro.app`) nicht und meldet «Invalid login credentials».
- Pro Umgebung muss die Domain zu den Adressen in `auth.users` passen. Prüfen: `select email from auth.users limit 5;`
- Diagnose bei Login-Problem: DevTools → Network → `token?grant_type=password` → Payload → `email` mit `auth.users` vergleichen.
- Der Service Worker cached `config.js`: nach Änderung Seite hart neu laden bzw. unter Application → Service Workers «Unregister».

## Bekannte Bugs & Fixes

### NULL-Fix für auth.users (WICHTIG)
**Problem:** Supabase Auth lehnt den Login ab, wenn Token-Spalten in `auth.users` `NULL` statt `''` sind. Je nach Version als HTTP 500 «Database error querying schema» **oder** als 400 «Invalid login credentials» (obwohl E-Mail und PIN stimmen, `crypt()`-Vergleich = true).
**Ursache:** Per SQL angelegte User (Migration) haben `NULL`; per App registrierte User bekommen von Supabase `''`. Deshalb lief DEV, PRD nicht.
**Fix:** Im SQL Editor des betroffenen Projekts ausführen (inkl. `email_change` und `phone_change`):
```sql
UPDATE auth.users SET confirmation_token = '' WHERE confirmation_token IS NULL;
UPDATE auth.users SET recovery_token = '' WHERE recovery_token IS NULL;
UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;
UPDATE auth.users SET email_change_token_new = '' WHERE email_change_token_new IS NULL;
UPDATE auth.users SET email_change_token_current = '' WHERE email_change_token_current IS NULL;
UPDATE auth.users SET reauthentication_token = '' WHERE reauthentication_token IS NULL;
UPDATE auth.users SET phone_change = '' WHERE phone_change IS NULL;
UPDATE auth.users SET phone_change_token = '' WHERE phone_change_token IS NULL;
```
`fbro_migration_v4.sql` setzt diese Spalten seit dem Fix selbst auf `''`; der Fix ist nur für ältere Läufe nötig.
**Prüfen (ohne Login-Versuch):** `select email, encrypted_password = crypt('<PIN>', encrypted_password) as pin_ok, confirmation_token is null as conf_null from auth.users where email = '<mail>';`
**Referenz:** https://github.com/orgs/supabase/discussions/13043

### Auth-Diagnose
```sql
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'auth';
```
Muss viele Zeilen zurückgeben. Nur 4 (uid, role, email, jwt) = NULL-Problem → NULL-Fix anwenden.

## Deployment-Prozess
1. Änderungen in `app.js`/`sw.js`: `CACHE`-Version in `sw.js` erhöhen (`training-vXX`)
2. Schema-Änderungen: `supabase/schema.sql` im SQL Editor ausführen (idempotent)
3. Neue User: `fbro_migration_v4.sql` ausführen (setzt alle Rollen auf `false`: **Admin danach manuell setzen**: `update public.profiles set is_admin = true where phone = '+41…';`)
4. `config.js` committen und pushen → GitHub Pages deployed automatisch
5. PRD und DEV unterscheiden sich **nur** in `config.js` (URL, Anon-Key). Alles andere identisch halten.

## Dateien
| Datei | Beschreibung |
|---|---|
| `config.js` | Supabase URL + Anon-Key, App-Einstellungen |
| `app.js` | Gesamte App-Logik |
| `sw.js` | Service Worker (PWA, Cache-Version) |
| `schema.sql` (Root) | **ACHTUNG: alte Version (262 Zeilen)** — nicht verwenden, nicht hochladen |
| `supabase/schema.sql` | Aktuelles vollständiges Schema (898 Zeilen, 14 Tabellen inkl. `cc_*`, `jass_*`). **Vor jedem Setup `wc -l` prüfen: 898 erwartet.** Eine 393/400-Zeilen-Version fehlt `cc_*`/`jass_*` und viele RPCs |
| `fbro_migration_v4.sql` | Enthält Namen und Telefonnummern → **bewusst nicht im Repo**, nur lokal/als ZIP |
| `icons/` + Root-Icons | `icons/logo.png` + `icons/favicon-48.png` werden von app.js/index.html genutzt; `icon-*.png`, `apple-touch-icon.png` im Root (Manifest) |

## Migration
- `fbro_migration_v4.sql`: Alle 45 Mitglieder mit `auth.users` + `auth.identities` + `profiles`
- Daten-Nachladen auf eine neue Umgebung (Reihenfolge): Schema → Migration → Admin setzen → `training_rules`/`training_extras`/`events` aus DEV exportieren (`format('%L')`-INSERTs) → `jassmasters_historie.sql` → `chilbi_2027.sql`
- Antworten (`training_responses`, `event_responses`) sind an User-IDs gebunden und werden **nicht** mitkopiert (neue IDs); nur über Telefonnummer neu zuordnen

## Libraries
- `@supabase/supabase-js@2.45.4` (via CDN)
- `jsPDF@2.5.1` (via CDN)

## Backup Supabase Projekt
- `ppnapfnsikwgkgvjcsdi` (eu-central-2, Zürich) — leer, bereit für Notfall

## Regressionstest (statisch, ohne Live-DB)
Stand 2026-10-08: `node --check` ok; SW-SHELL-Dateien vorhanden; Manifest ok; alle 13 Tabellen und 13 RPCs aus app.js existieren im vollen Schema; RLS auf allen Tabellen; Admin-RPCs prüfen serverseitig (`is_admin()`/`can_jass()`/`can_cc()`); Telefon/PIN/E-Mail-Logik 12/12 ok; Übersetzungen 348 Keys × 7 Sprachen vollständig.

## Offene Aufgaben
- [ ] PRD: Trainings, Events nachladen (Export aus DEV), Jass-Historie, Chilbi 2027
- [ ] PRD: `fbro-8942/fbro-app` enthält noch Altlasten (doppelte Icons mit «(1)», `download`, `*.sql` im Root) → löschen
- [ ] DEV: prüfen, welche Domain `auth.users` nutzt (`phone-login.app` vs `fbro.app`) und `EMAIL_DOMAIN` explizit setzen
- [ ] Vereins-Supabase unter eigenem Vereins-Account führen (Trennung von persönlichem Account)
