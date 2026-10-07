# FBRO Vereins-App – Projektkontext für Claude

## Übersicht
Vanilla JS Single-Page-App für den Verein FBRO. Gehostet auf GitHub Pages, Backend auf Supabase.
Kein Build-Schritt — alle Dateien werden direkt ausgeliefert.

## GitHub Accounts
- **Dev:** `lata-8888/fbro-dev` (dieses Repo)
- **Prod:** `fbro-8942/fbro-app`

## Supabase Projekte
| Umgebung | Projekt-ID | Region | Status |
|---|---|---|---|
| Dev | `hshchitgcweewnantxbs` | eu-central-1 | ✅ läuft |
| Prod | `airdfxpnqjwffazrsgyy` | — | ⚠️ NULL-Fix noch ausstehend |
| Backup | `ppnapfnsikwgkgvjcsdi` | eu-central-2 (Zürich) | leer |

## Bekannte Bugs & Fixes

### NULL-Fix für auth.users (WICHTIG)
**Problem:** Supabase Auth gibt HTTP 500 «Database error querying schema» wenn Token-Spalten NULL sind.
**Fix:** Im SQL Editor ausführen:
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
Muss viele Zeilen zurückgeben. Nur 4 (uid, role, email, jwt) = Provisioning-Bug oder NULL-Problem.

## Login-Logik
- Synthetic Email: `<phone_digits_ohne_plus>@<EMAIL_DOMAIN>`  
  Beispiel: `+41791234567` → `41791234567@fbro.app`
- PIN = letzte 6 Ziffern der Telefonnummer
- `EMAIL_DOMAIN` ist in `config.js` auskommentiert → App verwendet eigene Logik

## Sicherheit
- Den `service_role`-Schlüssel **NIE** in `config.js` eintragen
- Nur der `anon public`-Key kommt in `config.js`

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
| `schema.sql` | Vollständiges DB-Schema (idempotent) — **ACHTUNG: alte Version (262 Zeilen)** |
| `supabase/schema.sql` | Aktuelles vollständiges Schema (898 Zeilen) |

## Migration
- `fbro_migration_v4.sql`: Alle 44 Mitglieder mit `auth.users` + `auth.identities` + `profiles`
- Datei liegt bei Claude unter `/mnt/user-data/outputs/fbro_migration_v4.sql`

## Libraries
- `@supabase/supabase-js@2.45.4` (via CDN)
- `jsPDF@2.5.1` (via CDN)

## Offene Aufgaben
- [ ] NULL-Fix auf Prod `airdfxpnqjwffazrsgyy` anwenden
- [ ] `config.js` für Prod aktualisieren (`fbro-8942/fbro-app`)
- [ ] Prod testen
