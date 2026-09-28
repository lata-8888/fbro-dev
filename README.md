# Vereins-Training – Teilnahme per App

Mitglieder registrieren sich mit Handynummer (ohne SMS) und tragen sich für Trainings und Events ein oder aus. Der PIN ist standardmässig **die letzten 6 Ziffern der Handynummer**. Admins legen Trainingstage und Events fest und bestimmen per Stern weitere Admins. Die App läuft im Browser und lässt sich auf dem Handy wie eine App installieren.

- **Oberfläche:** reine HTML/CSS/JavaScript-Dateien, keine Build-Werkzeuge nötig
- **Daten und Anmeldung:** Supabase
- **Veröffentlichung:** GitHub Pages (automatisch bei jedem Speichern im Repository)

## Dateien

| Datei | Zweck |
|---|---|
| `index.html`, `styles.css`, `app.js` | die App |
| `config.js` | **hier trägst du die Supabase-Werte ein** |
| `supabase/schema.sql` | Tabellen und Zugriffsregeln für die Datenbank |
| `manifest.webmanifest`, `sw.js`, `icons/` | machen die App installierbar |
| `.github/workflows/pages.yml` | veröffentlicht die App automatisch auf GitHub Pages |

## Einrichtung in 6 Schritten

### 1. Supabase-Projekt anlegen
1. Auf [supabase.com](https://supabase.com) ein Konto erstellen und **New project** wählen.
2. Als Region **Zurich (eu-central-2)** oder Frankfurt wählen, damit die Daten in Europa liegen.
3. Datenbank-Passwort vergeben und sicher aufbewahren.

### 2. Anmeldung einstellen
Unter **Authentication → Sign In / Providers → Email**:
- **Enable Email provider:** an
- **Confirm email:** **aus** (sonst kann sich niemand ohne echte E-Mail-Adresse registrieren)
- **Minimum password length:** 6

Die App verwendet die Handynummer intern als Login-Namen. Es werden keine E-Mails und keine SMS verschickt.

### 3. Datenbank einrichten
1. Im Supabase-Dashboard **SQL Editor → New query** öffnen.
2. Den kompletten Inhalt von `supabase/schema.sql` einfügen und **Run** klicken.
3. Danach diese zwei Befehle einzeln ausführen (Werte anpassen):
   ```sql
   -- Vereinscode: ohne ihn kann sich niemand registrieren
   insert into public.app_settings (key, value) values ('club_code', 'MEIN-VEREINSCODE')
   on conflict (key) do update set value = excluded.value;

   -- Erstes Training: Montag 19:00
   insert into public.training_rules (weekday, start_time, place)
   values (1, '19:00', 'Turnhalle Schulhaus Nord');
   ```

### 4. App mit Supabase verbinden
1. In Supabase unter **Project Settings → API** die **Project URL** und den Schlüssel **anon public** kopieren.
2. Beides in `config.js` eintragen. Bei `CLUB_NAME` den Vereinsnamen setzen.

Der `anon`-Schlüssel darf öffentlich sein. Geschützt sind die Daten durch die Zugriffsregeln aus dem Schema. Den `service_role`-Schlüssel niemals eintragen oder weitergeben.

### 5. Auf GitHub veröffentlichen
1. Auf [github.com](https://github.com) ein neues Repository anlegen, z. B. `verein-training`.
2. Alle Dateien dieses Ordners hochladen (Button **Add file → Upload files**, den Ordner `.github` nicht vergessen), oder per Git:
   ```bash
   git init
   git add .
   git commit -m "Erste Version"
   git branch -M main
   git remote add origin https://github.com/DEIN-NAME/verein-training.git
   git push -u origin main
   ```
3. Im Repository **Settings → Pages → Source: GitHub Actions** wählen.
4. Unter dem Reiter **Actions** siehst du die Veröffentlichung laufen. Danach ist die App erreichbar unter `https://DEIN-NAME.github.io/verein-training/`.

Jede weitere Änderung an den Dateien wird automatisch veröffentlicht.

### 6. Ersten Admin festlegen
1. Die App öffnen und mit Name, Handynummer und Vereinscode ein Konto erstellen. Der PIN wird automatisch aus den letzten 6 Ziffern deiner Handynummer gebildet.
2. Im SQL Editor diesen Befehl ausführen (deine Nummer im Format `+41791234567`):
   ```sql
   update public.profiles set is_admin = true where phone = '+41791234567';
   ```
3. App neu laden. Es erscheint der Bereich **Verwalten**. Unter «Mitglieder» kannst du mit dem Stern jedes Mitglied zum Admin machen oder die Rechte wieder entziehen. Die eigenen Rechte kann man sich nicht selbst entziehen, damit es immer mindestens einen Admin gibt.

## App auf dem Handy installieren
Link (oder QR-Code) an die Mitglieder verteilen, z. B. per WhatsApp.
- **iPhone:** in Safari öffnen, unten auf **Teilen** tippen, dann **Zum Home-Bildschirm**.
- **Android:** in Chrome öffnen, im Menü **App installieren** wählen. Alternativ zeigt die App unter «Profil» einen Installations-Knopf.

Als Vereinsname und Symbol erscheinen die Angaben aus `manifest.webmanifest` und `icons/`. Beides kannst du anpassen.

## Termin im Handy-Kalender speichern
Bei jedem Event gibt es den Knopf **Im Kalender speichern**. Die App erstellt eine Kalenderdatei (.ics) mit Titel, Ort, Datum, Uhrzeit und einer Erinnerung eine Stunde vorher.
- **iPhone:** Es öffnet sich das Teilen-Menü, dort «Zum Kalender hinzufügen» wählen. Falls das Teilen-Menü nicht erscheint, wird die Datei geladen und lässt sich in «Dateien» oder im Safari-Download öffnen.
- **Android:** Die Datei wird geladen. In der Download-Meldung auf «Öffnen» tippen und den Kalender wählen.

Events haben keine Endzeit, deshalb dauert der Kalendereintrag standardmässig 2 Stunden. Die Dauer kannst du in `config.js` bei `EVENT_DURATION_MIN` ändern. Später verschobene Events werden im Kalender nicht automatisch aktualisiert. Wer den Termin schon gespeichert hat, muss ihn bei einer Änderung erneut speichern.

## Anmeldung und PIN
- **Registrierung:** Name, Handynummer und Vereinscode. Einen PIN muss niemand wählen.
- **Anmeldung:** Handynummer eingeben und anmelden. Das PIN-Feld bleibt leer, solange das Mitglied seinen PIN nicht geändert hat.
- **PIN ändern:** Im Profil kann jede Person einen eigenen 6-stelligen PIN festlegen und muss ihn dann bei der Anmeldung eintragen. Mit «Auf Standard-PIN zurücksetzen» gilt wieder die Regel mit den letzten 6 Ziffern.
- **PIN vergessen:** Ein Admin tippt unter «Verwalten → Mitglieder» auf «PIN zurücksetzen». Danach gilt für dieses Mitglied wieder der Standard-PIN.
- **Bereits registrierte Mitglieder:** Wenn du eine frühere Version verwendet hast, in der Mitglieder ihren PIN selbst gewählt haben, führe den einmaligen Befehl unter Punkt 3 am Ende von `supabase/schema.sql` aus. Er setzt bei allen Mitgliedern den PIN auf die letzten 6 Ziffern.

## Betrieb

**Update einer bestehenden Installation:** Neue `app.js`, `styles.css` und `supabase/schema.sql` übernehmen. Das Schema kannst du im SQL Editor erneut ausführen, es überschreibt keine Daten.

**Mitglied entfernen:** Supabase → Authentication → Users → Person auswählen und löschen. Ihre Antworten werden mitgelöscht.

**Vereinscode ändern:** den `insert`-Befehl aus Schritt 3 mit neuem Wert erneut ausführen.

**Kosten:** Der kostenlose Supabase-Plan reicht für einen Verein. Beachte, dass kostenlose Projekte nach etwa einer Woche ohne Aktivität pausiert werden. Bei wöchentlichem Training passiert das nicht. Eine pausierte Datenbank lässt sich im Dashboard mit einem Klick wieder aktivieren.

## Sicherheit und Datenschutz
- **Wichtig:** Der Standard-PIN ergibt sich aus der Handynummer. Wer die Nummer eines Mitglieds kennt, kann sich damit anmelden und in dessen Namen antworten. Bei Admins könnte er sogar Trainings, Events und Admin-Rechte ändern. Der Vereinscode schützt nur die Registrierung, nicht die Anmeldung. **Admins sollten deshalb im Profil einen eigenen PIN festlegen**, den niemand erraten kann. Supabase begrenzt zusätzlich die Anmeldeversuche.
- Alle angemeldeten Mitglieder sehen die Namen der anderen Mitglieder und ihre Antworten. Handynummern zeigt die App nur den Admins an. Technisch sind sie für angemeldete Mitglieder über die Datenbank-Schnittstelle abrufbar. Wenn das nicht gewünscht ist, sollte die Nummer in eine separate, nur für Admins lesbare Tabelle ausgelagert werden.
- Wenn ihr später doch eine Bestätigung per SMS möchtet, lässt sich die Anmeldung auf Supabase Phone Auth mit einem SMS-Anbieter umstellen.
- Informiere die Mitglieder kurz, welche Daten (Name, Handynummer, Antworten) gespeichert werden und wo.

## Fehlersuche
| Meldung in der App | Ursache |
|---|---|
| «Einrichtung nötig» | `config.js` enthält noch die Platzhalter |
| «Die Daten konnten nicht geladen werden» | `schema.sql` wurde nicht (vollständig) ausgeführt |
| «Bitte schalte in Supabase Confirm email aus» | Schritt 2 fehlt |
| «Registrierung nicht möglich» | Vereinscode falsch oder in Schritt 3 nicht gesetzt |
| Registrierung wird wegen der Adresse abgelehnt | In `config.js` bei `EMAIL_DOMAIN` eine andere Domain eintragen, z. B. deine Vereins-Domain |
| Registrierung oder PIN-Änderung wird als «unsicher» abgelehnt | In Supabase unter Authentication → Sign In / Providers → Email «Prevent use of leaked passwords» ausschalten (nur im Pro-Plan vorhanden) |
| Änderungen erscheinen nicht auf dem Handy | Seite neu laden. Die App holt sich neue Dateien beim nächsten Start. |
