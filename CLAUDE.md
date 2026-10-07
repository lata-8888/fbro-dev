# FBRO Vereins-App – Projektkontext für Claude

## Umgebungen — IMMER klar unterscheiden

| | DEV | PRD |
|---|---|---|
| **GitHub** | `lata-8888/fbro-dev` | `fbro-8942/fbro-app` |
| **Supabase** | `hshchitgcweewnantxbs` | `dpiewpccucadlrtogvhh` |
| **Region** | eu-central-1 | eu-central-2 (Zürich) |
| **Status** | ✅ läuft | ⚠️ Schema + Migration ausstehend |
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
- `EMAIL_DOMAIN` ist in `config.js` auskommentiert → App verwendet eigene Logik

## Bekannte Bugs & Fixes

### NULL-Fix für auth.users (WICHTIG)
**Problem:** Supabase Auth gibt HTTP 500 «Database error querying schema» wenn Token-Spalten NULL sind.
**Fix:** Im SQL Editor des betroffenen Projekts ausführen:
```sql
UPDATE auth.users SET confirmation_token = '' WHERE confirmation_token IS NULL;
UPDATE auth.users SET recovery_token = '' WHERE recovery_token IS NULL;
UPDATE auth.users SET email_change_token_new = '' WHERE email_change_token_new IS NULL;
UPDATE auth.users SET email_change_token_current = '' WHERE email_change_token_current IS NULL;
UPDATE auth.users SET reauthentication_token = '' WHERE reauthentication_token IS NULL;
UPDATE auth.users SET phone_change_token = '' WHERE phone_change_token IS NULL;
```
**Referenz:** https://github.com/orgs/supabase/discussions/13043

### Auth-Diagnose
```sql
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'auth';
```
Muss viele Zeilen zurückgeben. Nur 4 (uid, role, email, jwt) = NULL-Problem → NULL-Fix anwenden.

## Deployment-Prozess
1. Änderungen in `app.js`/`sw.js`: `CACHE`-Version in `sw.js` erhöhen (`training-vXX`)
2. Schema-Änderungen: `supabase/schema.sql` im SQL Editor ausführen (idempotent)
3. Neue User: `fbro_migration_v4.sql` ausführen
4. `config.js` committen und pushen → GitHub Pages deployed automatisch

## Dateien
| Datei | Beschreibung |
|---|---|
| `config.js` | Supabase URL + Anon-Key, App-Einstellungen |
| `app.js` | Gesamte App-Logik |
| `sw.js` | Service Worker (PWA, Cache-Version) |
| `schema.sql` | **ACHTUNG: alte Version (262 Zeilen)** — nicht verwenden |
| `supabase/schema.sql` | Aktuelles vollständiges Schema (898 Zeilen) |

## Migration
- `fbro_migration_v4.sql`: Alle 45 Mitglieder mit `auth.users` + `auth.identities` + `profiles`

## Libraries
- `@supabase/supabase-js@2.45.4` (via CDN)
- `jsPDF@2.5.1` (via CDN)

## Backup Supabase Projekt
- `ppnapfnsikwgkgvjcsdi` (eu-central-2, Zürich) — leer, bereit für Notfall

## Offene Aufgaben
- [ ] Schema (`supabase/schema.sql`) auf PRD `dpiewpccucadlrtogvhh` ausführen
- [ ] Migration (`fbro_migration_v4.sql`) auf PRD ausführen
- [ ] `config.js` in `fbro-8942/fbro-app` mit neuer PRD URL + Anon-Key aktualisieren
- [ ] PRD Login testen
