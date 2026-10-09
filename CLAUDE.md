# FBRO Vereins-App – Projektkontext für Claude

## Umgebungen — IMMER klar unterscheiden

| | DEV | PRD |
|---|---|---|
| **GitHub** | `lata-8888/fbro-dev` | `fbro-8942/fbro-app` |
| **Supabase** | `hshchitgcweewnantxbs` | `dpiewpccucadlrtogvhh` |
| **Region** | eu-central-1 | eu-central-2 (Zürich) |
| **Status** | ✅ läuft | ✅ läuft (Stand 2026-10-08, Repo neu aufgesetzt, Login getestet); Trainings/Events von Hand, Jass/Chilbi per SQL |
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
- **Gelber PIN-Hinweisbalken** (`.pinbanner`, in der Render-Funktion von app.js): erscheint bei jedem Seitenaufruf und auf jedem Tab, bis das Mitglied im Profil einen eigenen PIN gesetzt hat (`profiles.pin_changed = true`). Kein Wegklicken. Seit PRD v91 für alle ausser **Admin und Kandidaten** (also Aktiv, Passiv, Friends & Family, Gast); in DEV noch nur Aktiv/Passiv. Wer als Admin testen will, sieht ihn nicht; dafür ein Nicht-Admin-Konto mit `pin_changed = false` nehmen. «PIN zurücksetzen» (Admin, `reset_pin`) setzt `pin_changed` wieder auf `false`. Admin bewusst ausgenommen.
- Nummerneingabe: **DEV** = ein Textfeld, Schweizer Format (`079 …`); eine deutsche Nummer geht nur mit `+49…`. **PRD** = Länder-Dropdown (CH +41 / DE +49 / Andere) + Nummer ohne führende Null (`phoneField()`, `composePhone()`, `phoneParts()` in app.js; neues Land: Eintrag in `PHONE_CC`). Gespeichert wird in beiden Umgebungen das internationale Format. Das Dropdown liegt für DEV bereit im Branch `feature/phone-dropdown` (Stand: SW `v87`), ist auf `main` aber bewusst **nicht** drin, weil alle Tester auf DEV sind.
- **DEV und PRD weichen deshalb absichtlich ab** (`app.js`, `styles.css`, `sw.js`). SW-Versionen sind je Umgebung unabhängig (DEV `v88`, PRD `v96`). Beim späteren Einspielen des Dropdowns in DEV: SW-Version über den aktuellen DEV-Wert erhöhen.
- **`EMAIL_DOMAIN` muss in `config.js` aktiv gesetzt sein** (`EMAIL_DOMAIN: 'fbro.app'`). Die App baut die Login-Adresse in `phoneToEmail()` (app.js) als `<digits>@` + `EMAIL_DOMAIN`, **Fallback ohne Eintrag: `phone-login.app`**. Fehlt der Eintrag, sucht die App `…@phone-login.app`, findet den Migrations-User (`…@fbro.app`) nicht und meldet «Invalid login credentials».
- Pro Umgebung muss die Domain zu den Adressen in `auth.users` passen. Prüfen: `select email from auth.users limit 5;`
- Diagnose bei Login-Problem: DevTools → Network → `token?grant_type=password` → Payload → `email` mit `auth.users` vergleichen.
- Der Service Worker cached `config.js`: nach Änderung Seite hart neu laden bzw. unter Application → Service Workers «Unregister».

## Icon-Konzept (Stand 2026-10-08, nur PRD; DEV noch nicht)
- **Ein Baustein für Kopfzeilen-Icons:** `hico(act, icon, label, opts)` in app.js, CSS-Klasse `.hico` (ersetzt `.ccdots`, `.ccinfo`, `.plusbtn`). Reihenfolge in jeder Kopfzeile: Titel (klappt auf/zu) → Aktions-Icons (`+`, Info, Drucken, «…») → Auf-/Zuklapp-Pfeil (`.ccfold`). Gleiche Höhe wie der Pfeil, Symbolgrösse 20 px; aktiver Zustand `.on` (`aria-pressed`).
- **Regel:** «…» (Menü) nur, wenn dahinter mehrere Aktionen stehen (Anlass, Tag, Mitglied, Jasstag). Gibt es nur «+» und/oder Info, stehen sie direkt als Icons da (Admin-Konsole, Spielplan, Ewige Rangliste).
- **Info-Icons sind vom Auf-/Zuklappen entkoppelt:** Der Text (`.infobar`) steht direkt unter der Kopfzeile und erscheint/verschwindet nur durch das Info-Icon (`js-hint` für Jass, `info-toggle` für Admin); der Abschnitt bleibt dabei offen oder zu, wie er war. Spielplan-Info nur für Jass Manager; Info der Ewigen Rangliste für alle.
- **Drucken vergangene Jassmasters:** nur Jass Manager (`jsEdit()`; Button und Handler geprüft). Der PDF-Druck bei C&C (und sein Handler) nur für `canCC()`: Chilbi- und Chränzli Manager.
- Der PRD-Stand liegt als Branch `prd/icon-konzept` im DEV-Repo (Basis `feature/phone-dropdown`); ZIP: `FBRO-App_PRD_v96.zip`. Browser-Test mit Testdaten (Playwright; Mitglied, Jass Manager, Admin, Admin mit allen Rollen, Chilbi, Chränzli): 96 Prüfungen ok.
- **ZIP-Benennung:** `FBRO-App_<ENV>_v<SW-Version>.zip`, z. B. `FBRO-App_PRD_v88.zip` oder `FBRO-App_DEV_v88.zip`; Stammordner im ZIP bleibt `fbro-app/`.

## Rollen (Stand 2026-10-08, nur PRD; DEV noch nicht)
- **Der Admin hat keine automatischen Rechte mehr** für Events, Chilbi/Chränzli (C&C) und Jass. Wer diese Rechte will, teilt sich die Rolle selbst zu (Admin → Rollen → eigene Person → «Zum … machen»; die RPCs `set_event_manager`, `set_chilbi_manager`, `set_chraenzli_manager`, `set_jass_master` sind weiterhin nur für Admins und erlauben die eigene Person).
- **App:** `canCC()` = Chilbi- oder Chränzli Manager; `canManageEvents()` = Event Manager; `jsEdit()` = Jass Manager. Events-Abschnitt in der Admin-Konsole nur mit Rolle Event Manager. Event-Formulare nur für Event Manager, alle übrigen Admin-Formulare nur für Admins.
- **Datenbank (PRD, SQL Editor):** `supabase/prd-rollen/PRD_rollen_strikt.sql` setzt `can_cc()`, `can_jass()` und die Event-Policies (`events_manage_write`, `event_responses_manager_write`) auf die reinen Rollen. Rückgängig: `PRD_rollen_strikt_RUECKGAENGIG.sql`. Optional: `PRD_admin_rollen_selbst_zuteilen.sql`. `supabase/schema.sql` auf dem Branch `prd/icon-konzept` enthält den neuen Stand (898 Zeilen), `main` (DEV) noch den alten.
- **v90 (nur PRD, 2026-10-08):** Friends & Family sehen den C&C-Tab und lesen den Schichtplan (Tab nur bei aktivem Anlass; DB-Policies liessen sie schon zu). Der Admin darf Teilnehmer bei Trainings (Stift-Icon, `canEditPeople()`) und Events («…»-Menü, `canEditEvPeople()`; ohne Event-Manager-Rolle nur die Teilnehmerliste) bearbeiten. «Noch nicht geantwortet» sehen nur Aktiv/Passiv (`seesOpen()`). SQL: `supabase/prd-rollen/PRD_v90_teilnehmer_admin.sql` (Rückgängig: `..._RUECKGAENGIG.sql`). Rollenmatrix: `FBRO_Rollenkonzept_PRD_v91.xlsx` (bearbeiten, zurückschicken, Claude setzt um).
- **v92 (nur PRD):** Personen-Chips (`.ccp`) zeigen die aktuelle Gruppe: Aktiv blau (`cc-a`), Passiv grün (`cc-p`), Friends & Family violett (`cc-f`), Gast blau mit Rahmen (`cc-g`), nicht in der App gelb (`cc-x`; Name stimmt mit keinem Profil überein). Die eigene Person ist überall rot (nicht fett, `.ccme`). Legende hinter dem Info-Icon rechts neben dem C&C-Titel (`ccLegend()`, `info-toggle` mit id `cclegend`). `ccResolve()` liefert `kind` a/p/f/g/x.
- **v94 (nur PRD):** Abgesagte Trainings/Events (`.ccel.off`) dezent grau abgehoben (Hintergrund 7 % Ink auf `--bg`); Rahmen des «Ich»-Chips 1 px.
- **v95 (nur PRD):** Die Farblegende (Info-Icon rechts neben dem Seitentitel) gibt es auch im Jass-Tab (`pageTopLegend()`, `info-toggle` mit id `jslegend`; im C&C-Tab id `cclegend`).
- **v96 (nur PRD):** «Ich»-Chip ohne Rahmen; mehr Abstand bei Zeit/Ort unter Events; Jass: Zuklappen blendet den Infotext aus, Aufklappen zeigt ihn nicht, Info nur per Info-Icon.
- **Reihenfolge beim Einspielen:** App-ZIP einspielen, SQL ausführen, danach Rolle(n) dem Admin in der App zuteilen. Zwischen SQL und Rollenzuteilung kann der Admin keine Events/C&C/Jass bearbeiten.
- **Benennung:** «Event Manager» (ohne Bindestrich) in allen Sprachen; Admin-Abschnitt «Gruppen» heisst «Rollen» (`secMembers`).
- **Bekannte Lücke:** Der Admin-Tab ist nur für Admins sichtbar. Ein Event Manager ohne Admin-Recht kann Events deshalb nur über das «…»-Menü an bestehenden Events bearbeiten, aber keinen neuen Event anlegen (war schon vorher so).

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
5. PRD und DEV unterscheiden sich in `config.js` (URL, Anon-Key). Ausnahme zur Zeit: Nummernfeld mit Länder-Dropdown nur auf PRD (siehe Login-Logik). Sonst alles identisch halten.

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

## PRD-Repo (`fbro-8942/fbro-app`) – Regeln
- **Muss öffentlich sein.** GitHub Pages ist im kostenlosen Tarif nur für öffentliche Repos verfügbar. Wird das Repo privat gestellt, nimmt GitHub die Seite vom Netz (404 «There isn't a GitHub Pages site here»); beim Zurückstellen auf öffentlich muss Pages neu eingeschaltet werden (Settings → Pages → Deploy from a branch → `main` → `/(root)`).
- **Keine Personendaten im Repo** (Migration, `neue_mitglieder.sql`, Telefonnummern, Namenslisten). Sie bleiben sonst in der Versionsgeschichte, auch nach dem Löschen der Datei. Am 2026-10-08 wurde das Repo deshalb gelöscht und mit sauberen Dateien neu angelegt.
- `supabase/schema.sql` ist im PRD-Repo bewusst **nicht** enthalten (enthält Mitgliedernamen aus dem Beispiel-Einsatzplan). Das Schema wird nur im Supabase SQL Editor ausgeführt.
- Upload per Weboberfläche löst Ordner beim Hineinziehen manchmal auf: danach in github.dev (Taste `.`) den Ordner `icons/` anlegen und `logo.png` + `favicon-48.png` hineinziehen.
- Claude kann PRD aus der Sitzung nicht schreiben (kein Zugriff, Namenskonflikt mit `lata-8888/fbro-app`): Änderungen als ZIP liefern, von Hand einspielen.

## Offene Aufgaben
- [ ] PRD: `PRD_rollen_strikt.sql` ausführen und dem Admin die gewünschten Rollen zuteilen; danach Rollen-Logik nach DEV übernehmen (Branch `prd/icon-konzept`, SW über `v88` erhöhen)
- [ ] Entscheiden: Admin-Tab (Events anlegen) auch für Event Manager ohne Admin-Recht sichtbar machen?
- [ ] Icon-Konzept (Branch `prd/icon-konzept`) nach DEV übernehmen, sobald PRD bestätigt ist (SW-Version über `v88` erhöhen)
- [ ] PRD: Trainings und Events werden von Hand in der App erfasst (kein Export aus DEV); Jass-Historie und Chilbi 2027 sind eingespielt
- [ ] Optional: PRD-Login-Adressen von `@fbro.app` auf `@phone-login.app` umstellen (wie DEV), Skripte in `fbro-prd-umstellung.zip`; dann `EMAIL_DOMAIN` in der PRD-`config.js` auskommentieren
- [ ] DEV: prüfen, welche Domain `auth.users` nutzt (`phone-login.app` vs `fbro.app`)
- [ ] Länder-Dropdown für die Handynummer (Branch `feature/phone-dropdown`) in DEV übernehmen, sobald die Tester bereit sind (SW-Version über `v88` erhöhen)
- [ ] DEV-Repo: `supabase/schema.sql` enthält Mitgliedernamen (ohne Telefonnummern); entscheiden, ob das Repo öffentlich bleiben soll
- [ ] Vereins-Supabase unter eigenem Vereins-Account führen (Trennung von persönlichem Account)
