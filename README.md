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
| `manifest.webmanifest`, `sw.js`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | machen die App installierbar (Symbol und Name auf dem Startbildschirm). Der Ordner `icons/` enthält nur noch das kleine Browser-Symbol und Kopien des Logos. |
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
- **iPhone:** in **Safari** öffnen (nicht in Chrome oder in einer anderen App), unten auf **Teilen** tippen, dann **Zum Home-Bildschirm**. Der Name lautet «FBRO».
- **Android:** in Chrome öffnen, im Menü **App installieren** wählen. Alternativ zeigt die App unter «Profil» einen Installations-Knopf.

Auf dem Startbildschirm erscheint das FBRO-Wappen mit dem Namen «FBRO». Auf dem iPhone kommt das Symbol aus `apple-touch-icon.png`, auf Android aus `icon-192.png`, `icon-512.png` und `icon-maskable-512.png`. Der Name kommt aus `index.html` (iPhone) beziehungsweise `manifest.webmanifest` (Android). Wer die App schon vor dem Logo-Update installiert hat, muss das Symbol einmal entfernen und die App neu zum Startbildschirm hinzufügen. Daten gehen dabei nicht verloren.

**Auf Android erscheint ein Buchstabe oder ein falsches Symbol statt des Wappens?**
1. Öffne im Chrome von Android `https://DEIN-NAME.github.io/REPOSITORY/icon-512.png` und `.../manifest.webmanifest`. Das Wappen muss erscheinen, und das Manifest muss als Text mit «FBRO» erscheinen. Bei «404» fehlt die Datei auf GitHub. Lade `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` und `manifest.webmanifest` direkt ins Hauptverzeichnis des Repositorys hoch.
2. Chrome speichert das Symbol beim Installieren. Entferne die alte App vom Startbildschirm (lange drücken, «Deinstallieren» beziehungsweise «Entfernen») und installiere sie neu über das Chrome-Menü. Eine bereits installierte App aktualisiert ihr Symbol oft erst nach ein bis zwei Tagen von selbst.
3. Falls die Veröffentlichung über «GitHub Actions» läuft, ersetze auch `.github/workflows/pages.yml`. Einfacher ist es, unter Settings → Pages **«Deploy from a branch»** (Branch `main`, Ordner `/ (root)`) zu wählen. Dann wird alles veröffentlicht, was im Hauptverzeichnis liegt, und die Datei `.github/workflows/pages.yml` wird nicht mehr gebraucht.

**Auf dem iPhone erscheint eine schwarze Kachel mit «T» statt des Wappens?** Dann konnte das iPhone die Bilddatei nicht laden. Das passiert, wenn die Datei auf GitHub fehlt oder die Seite noch die alte Version zeigt.
1. Öffne in Safari `https://DEIN-NAME.github.io/REPOSITORY/apple-touch-icon.png`. Es muss das Wappen auf weissem Grund erscheinen. Bei «404» fehlt die Datei auf GitHub. Lade `apple-touch-icon.png` (liegt im Hauptordner des ZIP) direkt in das Repository hoch, ins Hauptverzeichnis neben `index.html`.
2. Prüfe, dass `index.html` neu ist: In der Datei muss `apple-touch-icon.png?v=3` stehen.
3. Wenn unter Settings → Pages «GitHub Actions» gewählt ist, ersetze auch `.github/workflows/pages.yml`, damit die neue Datei veröffentlicht wird. Bei «Deploy from a branch» ist das nicht nötig.
4. Warte, bis die Veröffentlichung fertig ist (Reiter Actions: grüner Haken), und entferne das alte Symbol vom Home-Bildschirm.
5. Öffne die App in einem **privaten Tab** von Safari und lege das Symbol dort neu an. So holt das iPhone alles frisch und nimmt nichts aus dem Zwischenspeicher.

## Aufbau der App (Stand jetzt)
- **FBRO-Trainings:** Die nächsten 20 Termine stehen direkt sichtbar da, nach Monaten gruppiert. Alle weiteren Termine (bis 12 Monate im Voraus) sind unter «Weitere Termine» eingeklappt. Vergangene Termine erscheinen nicht mehr. Die Anzahl änderst du in `config.js` bei `TRAININGS_VISIBLE`.
- **FBRO-Events:** Alle kommenden Events, nach Monaten gruppiert. Es gibt keine Obergrenze. Der Kurzname «FBRO» steht in `config.js` bei `CLUB_SHORT`.
- **Verwalten:** Die Bereiche «Montag Trainings», «Weitere Trainings», «Kommende Trainings», «Events» und «Mitglieder» sind einklappbar und anfangs zu.
  - Bei «Montag Trainings», «Events» und «Mitglieder» steht neben dem Bereichsnamen ein **«+»**. Erst nach dem Tippen darauf erscheint das Erfassungsformular. Nach dem Speichern schliesst es sich wieder.
  - «Weitere Trainings» enthält die zusätzlichen Termine (Turniere, Zusatztrainings) mit Liste und Formular. «Kommende Trainings» zeigt die Termine der Montag-Serie, die du einzeln ändern oder absagen kannst.
  - Weitere Trainings und Events sind nicht begrenzt (getestet mit über 150 Einträgen).
- **Handynummern:** Eingegeben werden dürfen `079 123 45 67`, `+41 79 123 45 67` oder `0041 79 …`. Leerschläge spielen keine Rolle. Im Feld und in allen Listen erscheint die Nummer im Schweizer Format `079 123 45 67`. Gespeichert wird intern das internationale Format.
- **Mitglieder hinzufügen:** Name und Handynummer eingeben. Das Mitglied meldet sich danach nur mit der Handynummer an, der PIN sind die letzten 6 Ziffern. Einen Vereinscode braucht es dafür nicht.
- **Mitglied entfernen:** Der Knopf «Entfernen» löscht das Konto samt Antworten. Das lässt sich nicht rückgängig machen.

**Update einer bestehenden Installation:** Ersetze `app.js`, `styles.css` und `sw.js`. Deine `config.js` kannst du behalten. Falls darin `TRAININGS_VISIBLE: 12` steht, ändere den Wert auf 20. Führe zusätzlich `supabase/schema.sql` im SQL Editor erneut aus. Sie fügt die Spalte für die Sprache und die Gast-Rolle hinzu und erlaubt alle neun Sprachen. Ohne diesen Schritt funktioniert der Knopf «Gast» nicht. Ohne diesen Schritt funktioniert die Sprachauswahl nur auf dem jeweiligen Gerät und wird nicht im Profil gespeichert.

## Rollen: Mitglied, Admin und Gast
- **Mitglied:** sieht Trainings, Events und das eigene Profil und kann sich für alles ein- und austragen.
- **Admin:** darf zusätzlich alles unter «Verwalten» ändern. Den Stern neben einem Namen tippen macht die Person zum Admin.
- **Gast:** sieht nur die **Trainings** und das eigene **Profil**, keine Events und keinen Bereich «Verwalten». Gäste können sich bei Trainings weiterhin ein- und austragen. Admins legen einen Gast in «Verwalten → Mitglieder» mit dem Knopf **«Gast»** fest. Beim Hinzufügen eines neuen Mitglieds gibt es dafür die Option «Als Gast hinzufügen».
- **Zusammenspiel:** Ein Admin ist nie Gast. Wer zum Admin gemacht wird, verliert den Gast-Status, und wer zum Gast gemacht wird, verliert die Admin-Rechte. Die eigenen Rechte kann man sich nicht selbst entziehen und sich auch nicht selbst zum Gast machen.
- **Schutz in der Datenbank:** Die Sperre der Events gilt nicht nur in der App. Supabase liefert Gästen Events und die Antworten darauf gar nicht erst aus.

## Sprachen
Die App gibt es auf **Deutsch, Französisch, Englisch, Italienisch, Züridütsch, Ukrainisch, Boarisch (Bayerisch), Tschechisch und Niederländisch**.
- **Auswahl:** Jede Person wählt ihre Sprache im Profil unter «Sprache». Auf der Anmeldeseite steht oben rechts ebenfalls eine Auswahl, damit man sich schon vor dem ersten Login in der eigenen Sprache zurechtfindet.
- **Speicherung:** Die Sprache wird im Profil bei Supabase gespeichert und gilt deshalb auf allen Geräten. Beim ersten Login wird die Sprache des Handys übernommen (Deutsch, Französisch, Englisch, Italienisch, Ukrainisch, Tschechisch oder Niederländisch, sonst Deutsch). Züridütsch und Boarisch muss man selbst wählen.
- **Datum:** Wochentage und Monate erscheinen in der gewählten Sprache. Bei Züridütsch («Mäntig», «Septämber») und Boarisch («Mondog», «Septemba») sind sie von Hand hinterlegt.
- **Texte ändern:** Alle Texte stehen am Anfang von `app.js` im Abschnitt «Sprachen (Übersetzungen)», pro Sprache ein Block mit denselben Schlüsseln. Dort kannst du Formulierungen anpassen. Die Übersetzungen sind maschinell erstellt und sollten von Muttersprachlern gegengelesen werden, besonders Züridütsch, Boarisch, Ukrainisch und Tschechisch. Für Mundarten gibt es keine einheitliche Schreibweise. Verwendet wurde eine Zürcher beziehungsweise eine allgemein bairische Schreibweise.
- **Neue Sprache:** Einen weiteren Block im Wörterbuch ergänzen und die Sprache in den Listen `LANGS`, `LANG_NAMES`, `LANG_LOCALE` und `LANG_HTML` eintragen (bei Mundarten ohne Intl-Sprache zusätzlich in `CUSTOM_DATES`). In `supabase/schema.sql` muss die Sprache ausserdem im `check`-Befehl bei `profiles_language_check` und im Trigger `handle_new_user` stehen. Danach das Schema erneut ausführen.
- **Nicht übersetzt:** Bezeichnungen, die Admins selbst erfassen (Titel, Ort von Trainings und Events), und die Namen der Mitglieder.

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
