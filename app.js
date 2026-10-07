(function () {
  'use strict';

  /* ---------- Konfiguration & Supabase ---------- */
  var cfg = window.APP_CONFIG || {};
  var configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_URL.indexOf('DEIN-PROJEKT') === -1);
  var sb = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  /* ---------- Hilfsfunktionen ---------- */
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parseIso = function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var hhmm = function (t) { return String(t || '').slice(0, 5); };
  var WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
  var wdName = function (v) { return L('wd' + v); };

  /* ---------- Sprachen (Übersetzungen) ---------- */
  var LANGS = ['de', 'fr', 'en', 'it', 'gsw', 'uk', 'bar'];
  var LANG_NAMES = { de: 'Deutsch', fr: 'Français', en: 'English', it: 'Italiano', gsw: 'Züridütsch', uk: 'Українська', bar: 'Boarisch' };
  var LANG_LOCALE = { de: 'de-CH', fr: 'fr-CH', en: 'en-GB', it: 'it-CH', uk: 'uk-UA' };
  var LANG_HTML = { de: 'de-CH', fr: 'fr-CH', en: 'en', it: 'it-CH', gsw: 'gsw', uk: 'uk', bar: 'bar' };

  var DICT = {
    de: {
      wd0: 'Sonntag', wd1: 'Montag', wd2: 'Dienstag', wd3: 'Mittwoch', wd4: 'Donnerstag', wd5: 'Freitag', wd6: 'Samstag',
      navTrainings: 'Trainings', navEvents: 'Events', navAdmin: 'Admin', navProfile: 'Profil',
      titleTrainings: 'Trainingsplan', titleEvents: 'Vereinsanlässe',
      subTrainings: 'Die nächsten {n} Termine', subEvents: 'Folgende Vereinsanlässe sind geplant', moreDates: 'Weitere Termine ({n})',
      emptyTrTitle: 'Noch keine Trainings geplant.', emptyTrAdmin: 'Lege im Bereich «Verwalten» einen Trainingstag fest.', emptyTrMember: 'Die Admins legen die Trainingstage fest.',
      emptyEvTitle: 'Aktuell sind keine Events geplant.', emptyEvAdmin: 'Lege im Bereich «Verwalten» einen Event an.', emptyEvMember: 'Die Admins legen neue Events an.',
      trainingWord: 'Training', trCancelled: 'Training abgesagt', yes: 'Dabei', no: 'Nicht dabei', participants: 'Teilnehmer',
      ariaTr: '{yes} Teilnehmer, {no} nicht dabei. Teilnehmerliste {action}', ariaEv: '{n} Teilnehmer. Teilnehmerliste {action}',
      listOpen: 'öffnen', listClose: 'schliessen',
      hYes: 'Dabei ({n})', hNo: 'Nicht dabei ({n})', hOpen: 'Noch keine Antwort ({n})', hSolo: 'Allein dabei ({n})', hDuo: 'Zu zweit dabei ({n} Mitglieder, {p} Personen)',
      nobody: 'Niemand', you: '(du)', cancelledTag: 'Abgesagt', cancelledLow: 'abgesagt', changedLow: 'geändert',
      timePlace: '{time} Uhr, {place}', atTime: '{time} Uhr', calAdd: 'Im Kalender speichern', solo: 'Allein', duo: 'Zu zweit',
      secRules: 'Standard Training', secExtra: 'Extra Training', secUpcoming: 'Trainingsplan verwalten', secEvents: 'Events', secMembers: 'Gruppen',
      addNew: 'Neu erfassen', addClose: 'Erfassung schliessen',
      adminTitle: 'Admin Console', titleCC: 'Chilbi & Chränzli', titleJass: 'Jass-Masters', adminSub: 'Nur für Admins sichtbar', rulesIntro: 'Standard-Trainings pro Woche',
      weekday: 'Wochentag', time: 'Uhrzeit', place: 'Ort', date: 'Datum', label: 'Bezeichnung',
      phPlaceTraining: 'z. B. Turnhalle Schulhaus Nord', addRule: 'Trainingstag hinzufügen',
      edit: 'Bearbeiten', remove: 'Entfernen', cancel: 'Absagen', reactivate: 'Reaktivieren', del: 'Löschen', save: 'Speichern', dismiss: 'Abbrechen', reset: 'Zurücksetzen',
      editNote: 'Gilt nur für diesen Termin. Die Antworten der Mitglieder bleiben erhalten.',
      rulesEmpty: 'Noch kein fester Trainingstag. Tippe auf «+», um einen zu erfassen.',
      extraIntro: 'Folgende zusätzliche Trainings sind geplant', extraEmpty: 'Keine zusätzlichen Trainings geplant.', extraDefaultTitle: 'Zusatztraining',
      phPlaceExtra: 'z. B. Sportanlage Süd', addExtra: 'Weiteres Training hinzufügen', upcomingEmpty: 'Keine kommenden Trainings.',
      phEventTitle: 'z. B. Fondue-Plausch', phEventPlace: 'z. B. Vereinshaus', addEvent: 'Event hinzufügen', rsvpRequired: 'Anmeldung erforderlich',
      eventsEmpty: 'Noch keine Events. Tippe auf «+», um den ersten zu erfassen.',
      membersIntro: 'Tippe bei einer Person auf die drei Punkte, um Rollen, Gruppe, PIN, Name oder Handynummer zu ändern oder sie zu löschen. Zahnrad = Admin, Stern = Event-Manager, Glas = Chilbi/Chränzli Manager, Pokal = Jass Manager. Gäste und Friends & Family sehen nur eingeschränkt Inhalte (siehe Gruppen unten).',
      memberAdd: 'Mitglied hinzufügen', fullName: 'Vor- und Nachname', phone: 'Handynummer',
      memberAddNote: 'Das Mitglied meldet sich nur mit der Handynummer an. Der PIN sind die letzten 6 Ziffern.',
      selfAdmin: 'Du bist Admin. Du kannst dir die Rechte nicht selbst entziehen.', revokeAdmin: 'Admin-Rechte entziehen: {name}', makeAdmin: 'Zum Admin machen: {name}',
      adminTag: 'Admin', resetPin: 'PIN zurücksetzen',
      profileTitle: 'Mein Profil', nameLabel: 'Name',
      installTitle: 'App installieren', installHint: 'Lege die App auf deinen Startbildschirm, dann öffnet sie sich im Vollbild.', installBtn: 'Auf dem Startbildschirm speichern',
      installIos: 'Tippe unten in Safari auf «Teilen» und dann auf «Zum Home-Bildschirm». Danach öffnet sich die App im Vollbild.',
      nameChange: 'Name ändern', nameSave: 'Name speichern',
      pinChange: 'PIN ändern', pinIntro: 'Standardmässig sind es die letzten 6 Ziffern deiner Handynummer. Wenn du den PIN änderst, musst du ihn bei der Anmeldung eintragen.',
      pinNew: 'Neuer PIN (6 Ziffern)', pinSave: 'PIN speichern', pinDefault: 'Auf Standard-PIN zurücksetzen', logout: 'Abmelden',
      language: 'Sprache', languageHint: 'Wähle die Sprache, in der du die App nutzen möchtest.', themeTitle: 'Darstellung', themeHint: 'Wähle, wie die App aussehen soll.', themeLight: 'Hell', themeDark: 'Dunkel', themeAuto: 'Automatisch',
      loginSub: 'App',
      loginLeadReg: 'Erstelle dein Konto mit Name, Handynummer und Vereinscode. Dein PIN sind die letzten 6 Ziffern deiner Handynummer.',
      loginLead: 'Melde dich mit deiner Handynummer an.', pinOptional: 'PIN (nur nötig, wenn du ihn geändert hast)', clubCode: 'Vereinscode',
      register: 'Konto erstellen', signIn: 'Anmelden', haveAccount: 'Ich habe schon ein Konto', firstTime: 'Zum ersten Mal hier? Konto erstellen',
      setupTitle: 'Einrichtung nötig', setupLead: 'Die App ist noch nicht mit Supabase verbunden.',
      setupStep1: 'Öffne die Datei <code>config.js</code>.', setupStep2: 'Trage <code>SUPABASE_URL</code> und <code>SUPABASE_ANON_KEY</code> aus deinem Supabase-Projekt ein.',
      setupStep3: 'Lade die Seite neu.', setupNote: 'Die genaue Anleitung steht in der Datei README.md.',
      loading: 'Lade …',
      errFailed: 'Das hat nicht geklappt', respWithdrawn: 'Antwort zurückgezogen', youIn: 'Du bist dabei', youOut: 'Du bist nicht dabei', youSolo: 'Du kommst allein', youDuo: 'Du kommst zu zweit',
      phoneCountry: 'Land', phoneOther: 'Andere (+…)', phoneInvalid: 'Bitte gib eine gültige Handynummer ein, z. B. 079 123 45 67.', alreadyReg: 'Diese Nummer ist schon registriert.',
      memberAdded: '{name} wurde hinzugefügt.', addFailed: 'Hinzufügen nicht möglich: {reason}', unknownError: 'Unbekannter Fehler',
      authInvalid: 'Handynummer oder PIN stimmt nicht. Falls du deinen PIN geändert hast, trage ihn im Feld PIN ein.',
      authAlready: 'Diese Nummer ist bereits registriert. Bitte melde dich an.', authCode: 'Registrierung nicht möglich. Bitte prüfe den Vereinscode.',
      authRate: 'Zu viele Versuche. Bitte warte einen Moment.', authPin: 'Der PIN muss aus 6 Ziffern bestehen.', authFail: 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.',
      pinExact: 'Der PIN muss aus genau 6 Ziffern bestehen.', confirmEmailOff: 'Bitte schalte in Supabase «Confirm email» aus (siehe README).',
      loadFail: 'Die Daten konnten nicht geladen werden. Wurde das Datenbank-Schema ausgeführt?',
      calFile: 'Öffne die Datei «{name}», um den Termin im Kalender zu speichern.', calFail: 'Der Kalendereintrag konnte nicht erstellt werden.',
      pinResetOk: 'PIN auf Standard zurückgesetzt', pinResetFail: 'PIN konnte nicht zurückgesetzt werden.',
      confirmDelRule: 'Diesen Trainingstag entfernen? Alle kommenden Termine der Serie verschwinden.', ruleRemoved: 'Trainingstag entfernt',
      confirmDelExtra: 'Dieses Training löschen?', extraDeleted: 'Training gelöscht',
      confirmDelEvent: 'Diesen Event löschen? Auch alle Antworten werden gelöscht.', eventDeleted: 'Event gelöscht',
      trReactivated: 'Training wieder aktiv', trCancelledMsg: 'Training abgesagt', evReactivated: 'Event wieder aktiv', evCancelledMsg: 'Event abgesagt',
      changeReset: 'Änderung zurückgesetzt', confirmResetPin: 'PIN von {name} auf die letzten 6 Ziffern der Handynummer zurücksetzen?', thisMemberDat: 'diesem Mitglied',
      pinReset: 'PIN zurückgesetzt', confirmRemove: '{name} entfernen? Das Konto und alle Antworten werden gelöscht.', thisMember: 'Dieses Mitglied', memberRemoved: 'Mitglied entfernt',
      adminGranted: 'Admin-Rechte vergeben', adminRevoked: 'Admin-Rechte entzogen', nameSaved: 'Name gespeichert', pinChanged: 'PIN geändert', pinChangeFail: 'PIN konnte nicht geändert werden.',
      ruleAdded: 'Trainingstag hinzugefügt', extraAdded: 'Training hinzugefügt', eventAdded: 'Event hinzugefügt',
      ruleChanged: 'Trainingstag geändert', trChanged: 'Training geändert', eventChanged: 'Event geändert', langSaved: 'Sprache gespeichert',
      guestTag: 'Gast', makeGuest: 'Als Gast festlegen: {name}', revokeGuest: 'Gast-Status entfernen: {name}', guestGranted: 'Als Gast festgelegt', guestRevoked: 'Gast-Status entfernt',
      guestCheck: 'Als Gast hinzufügen (sieht nur Trainings und Profil)', guestInfo: 'Du hast Gast-Zugang. Du siehst die Trainings und dein Profil.', supporterInfo: 'Du bist bei Friends & Family. Du siehst die Trainings, Jass und dein Profil.',
      memberTag: 'Mitglied', emTag: 'Event-Manager', makeEm: 'Zum Event-Manager machen: {name}', revokeEm: 'Event-Manager-Rechte entziehen: {name}', emGranted: 'Als Event-Manager festgelegt', emRevoked: 'Event-Manager-Rechte entzogen', confirmGuestLoses: '{name} hat Admin-, Event-Manager-, Chilbi Manager-, Chränzli Manager- oder Jass Manager-Rechte. Diese Änderung entzieht diese Rechte. Fortfahren?', selfMember: 'Du bist Mitglied. Du kannst dich nicht selbst zum Gast machen.', rolesTitle: 'Rollen', emSub: 'Hier verwaltest du die Events.', ccManagerSub: 'C&C verwaltest du im Reiter «C&C».',
      infoShow: 'Erklärung anzeigen', infoHide: 'Erklärung ausblenden',
      ok: 'OK',
      navCC: 'C&C', ccMembers: 'Mitglieder', ccGuests: 'Gäste', ccOthers: 'Andere', ccEmpty: 'Noch keine Anlässe erfasst.', ccNoDays: 'Noch keine Tage erfasst.', ccSummary: '{s} Schichten · {r} Rollen', ccLvlAll: 'Chränzli und Chilbi', ccLvlEvent: 'Anlass', ccLvlDay: 'Tag', ccLvlShift: 'Schicht', ccLvlRole: 'Rolle', ccActions: 'Aktionen', ccAddEvent: 'Anlass hinzufügen', ccAddDay: 'Tag hinzufügen', ccAddShift: 'Schicht hinzufügen', ccAddRole: 'Rolle hinzufügen', ccChange: 'Ändern', ccCopy: 'Kopieren', ccClose: 'Schliessen', ccNameOpt: 'Name (optional)', ccStart: 'Start', ccEnd: 'Ende', ccActive: 'Aktiv', ccPersons: 'Verantwortliche', ccSearch: 'Namen suchen', ccOtherPerson: 'Andere Person (nicht in der App)', ccAdd: 'Hinzufügen', ccDidYouMean: 'Meinst du {name}?', ccNobody: 'Noch niemand', ccConfirmDel: '«{name}» löschen? Alles, was darunter erfasst ist, wird ebenfalls gelöscht.', ccConfirmDelRole: '«{name}» löschen?', ccCopyEventNote: 'Die Kopie ist zuerst inaktiv. Alle Tage werden um 52 Wochen verschoben, damit die Wochentage gleich bleiben.', ccCopyDayNote: 'Schichten und Rollen werden mit den Verantwortlichen kopiert.', ccSaved: 'Gespeichert', ccCopied: 'Kopiert', ccDeleted: 'Gelöscht', ccNotInApp: '{name} ist noch nicht in der App. Mit der Handynummer kannst du die Person als Gast hinzufügen.', ccAsGuest: 'Als Gast hinzufügen', ccNeedName: 'Gib einen Namen ein.', ccSetup: 'Für C&C muss das Datenbank-Schema aktualisiert werden (supabase/schema.sql).', grpCandidate: 'Kandidaten', candidateTitle: 'Besten Dank für Dein Interesse', candidateMsg: 'Deine Anfrage wird durch unsere Administratoren geprüft.', mGroupActive: 'Zu Aktivmitglied machen', mGroupPassive: 'Zu Passivmitglied machen', mGroupGuest: 'Zu Gast machen', mGroupOther: 'Zu Friends & Family machen', mGroupCandidate: 'Zu Kandidat machen', groupChanged: 'Gruppe geändert', jsEternal: 'Ewige Rangliste', jsEternalHint: 'Über die letzten {n} abgeschlossenen Runden', jsEternalRounds: '{n} Runden', jsEternalRound: '1 Runde', jsVisibleHint: 'Ohne Haken sehen nur Admin und Jass Manager diese Runde', evEdit: 'Event ändern', evManagePeople: 'Teilnehmer verwalten', grpSupporter: 'Friends & Family', mMakeSupporter: 'Zu Friends & Family machen', supporterSet: 'Als Friends & Family eingeordnet', pinLampOk: 'Hat den PIN schon geändert', pinLampNo: 'Nutzt noch den Standard-PIN', pinBannerMsg: 'Bitte setze deinen persönlichen PIN-Code, um alle Funktionen freizuschalten.', pinBannerBtn: 'PIN jetzt setzen', ccPublicLabel: 'Für alle Aktiv- und Passivmitglieder sichtbar', ccPublicOn: 'C&C ist jetzt für alle sichtbar (nur lesend)', ccPublicOff: 'C&C ist jetzt wieder nur für Admin, Chilbi Manager und Chränzli Manager sichtbar', ccCopySuffix: 'Kopie', ccPrint: 'PDF teilen', jsPrint: 'Jassmasters-Übersicht als PDF', ccPdfBuilding: 'PDF wird erstellt…', ccPdfFailed: 'PDF konnte nicht erstellt werden.',
      mMakeAdmin: 'Zum Admin machen', mRevokeAdmin: 'Admin-Rechte entziehen', mMakeEm: 'Zum Event-Manager machen', mRevokeEm: 'Event-Manager-Rechte entziehen', mMakeGuest: 'Zum Gast machen', mMakeMember: 'Zum Mitglied machen', mEdit: 'Name und Handynummer ändern', mEditNote: 'Bei einer neuen Handynummer gilt wieder der Standard-PIN: die letzten 6 Ziffern der neuen Nummer.', mSaved: 'Gespeichert', mDelete: 'Mitglied löschen', mPhoneTaken: 'Diese Handynummer gehört bereits einer anderen Person.',
      navJass: 'Jass', jsParticipants: 'Teilnehmer', jsSchedule: 'Spielplan', jsRanking: 'Tagesrangliste', jsRound: 'Runde {n}', jsTable: 'Tisch {t}', jsTeam1: 'Team I', jsTeam2: 'Team II', jsPlayer: 'Spieler {n}', jsFree: 'frei', jsEmpty: 'Noch kein Jassmasters erfasst.', jsNoDays: 'Noch kein Datum erfasst.', jsAddSeries: 'Jassmasters hinzufügen', jsAddDay: 'Datum hinzufügen', jsLvlSeries: 'Jassmasters', jsLvlDay: 'Jasstag', jsPick: 'Spieler {n} wählen', jsClear: 'Platz freigeben', jsAlready: 'bereits Spieler {n}', jsPoints: 'Punkte', jsGames: '{n} Spiele', jsPtsAbbr: 'Pkt.', jsGame: '{n} Spiel', jsNoPoints: 'Noch keine Punkte erfasst.', jsHint: 'Trage die Punkte beim Siegerteam ein. Das andere Team erhält sie automatisch negativ.', jsSetup: 'Für Jass muss das Datenbank-Schema aktualisiert werden (supabase/schema.sql).', jsFinish: 'Jassmaster abschliessen', jsConfirmFinish: '«{name}» abschliessen? Es wird unter Vergangene Jassmasters verschoben und ist danach nur noch als Rangliste sichtbar. Fortfahren?', jsFinished: 'Als abgeschlossen markiert', jsEditRanking: 'Rangliste bearbeiten', jsRankName: 'Name', jsRankPoints: 'Punkte', jsAddRow: 'Zeile hinzufügen', jsNoRows: 'Noch niemand erfasst.',
      jmTag: 'Jass Manager', mMakeJm: 'Zum Jass Manager machen', mRevokeJm: 'Jass Manager-Rechte entziehen', jmGranted: 'Als Jass Manager festgelegt', jmRevoked: 'Jass Manager-Rechte entzogen', cmTag: 'Chilbi Manager', crmTag: 'Chränzli Manager', mMakeCm: 'Zum Chilbi Manager machen', mRevokeCm: 'Chilbi Manager-Rechte entziehen', mMakeCrm: 'Zum Chränzli Manager machen', mRevokeCrm: 'Chränzli Manager-Rechte entziehen', cmGranted: 'Als Chilbi Manager festgelegt', cmRevoked: 'Chilbi Manager-Rechte entzogen', crmGranted: 'Als Chränzli Manager festgelegt', crmRevoked: 'Chränzli Manager-Rechte entzogen', grpActive: 'Aktivmitglieder', grpPassive: 'Passivmitglieder', mMakePassive: 'Zum Passivmitglied machen', mMakeActive: 'Zum Aktivmitglied machen', passiveSet: 'Als Passivmitglied festgelegt', activeSet: 'Als Aktivmitglied festgelegt', jsUpcoming: 'Anstehendes Jassmaster', jsPast: 'Vergangene Jassmasters'
    },

    fr: {
      wd0: 'Dimanche', wd1: 'Lundi', wd2: 'Mardi', wd3: 'Mercredi', wd4: 'Jeudi', wd5: 'Vendredi', wd6: 'Samedi',
      navTrainings: 'Entraînements', navEvents: 'Événements', navAdmin: 'Admin', navProfile: 'Profil',
      titleTrainings: 'Trainingsplan', titleEvents: 'Vereinsanlässe',
      subTrainings: 'Les {n} prochaines séances', subEvents: 'Voici les événements du club prévus', moreDates: 'Autres dates ({n})',
      emptyTrTitle: 'Aucun entraînement prévu pour le moment.', emptyTrAdmin: 'Définis un jour d’entraînement dans la section « Gérer ».', emptyTrMember: 'Les admins définissent les jours d’entraînement.',
      emptyEvTitle: 'Aucun événement prévu actuellement.', emptyEvAdmin: 'Crée un événement dans la section « Gérer ».', emptyEvMember: 'Les admins créent les nouveaux événements.',
      trainingWord: 'Entraînement', trCancelled: 'Entraînement annulé', yes: 'Présent', no: 'Absent', participants: 'Participants',
      ariaTr: '{yes} participants, {no} absents. {action} la liste des participants', ariaEv: '{n} participants. {action} la liste des participants',
      listOpen: 'Ouvrir', listClose: 'Fermer',
      hYes: 'Présents ({n})', hNo: 'Absents ({n})', hOpen: 'Pas encore de réponse ({n})', hSolo: 'Seul(e) ({n})', hDuo: 'À deux ({n} membres, {p} personnes)',
      nobody: 'Personne', you: '(toi)', cancelledTag: 'Annulé', cancelledLow: 'annulé', changedLow: 'modifié',
      timePlace: '{time}, {place}', atTime: '{time}', calAdd: 'Ajouter au calendrier', solo: 'Seul(e)', duo: 'À deux',
      secRules: 'Entraînement standard', secExtra: 'Entraînement supplémentaire', secUpcoming: 'Gérer le plan d’entraînement', secEvents: 'Événements', secMembers: 'Groupes',
      addNew: 'Ajouter', addClose: 'Fermer le formulaire',
      adminTitle: 'Admin Console', titleCC: 'Chilbi & Chränzli', titleJass: 'Jass-Masters', adminSub: 'Visible uniquement pour les admins', rulesIntro: 'Entraînements standard par semaine',
      weekday: 'Jour de la semaine', time: 'Heure', place: 'Lieu', date: 'Date', label: 'Désignation',
      phPlaceTraining: 'p. ex. salle de gym de l’école Nord', addRule: 'Ajouter un jour d’entraînement',
      edit: 'Modifier', remove: 'Retirer', cancel: 'Annuler', reactivate: 'Réactiver', del: 'Supprimer', save: 'Enregistrer', dismiss: 'Fermer', reset: 'Réinitialiser',
      editNote: 'Ne concerne que cette date. Les réponses des membres sont conservées.',
      rulesEmpty: 'Aucun jour d’entraînement fixe. Touche « + » pour en ajouter un.',
      extraIntro: 'Les entraînements supplémentaires suivants sont prévus', extraEmpty: 'Aucun entraînement supplémentaire prévu.', extraDefaultTitle: 'Entraînement supplémentaire',
      phPlaceExtra: 'p. ex. centre sportif Sud', addExtra: 'Ajouter un entraînement', upcomingEmpty: 'Aucun entraînement à venir.',
      phEventTitle: 'p. ex. soirée fondue', phEventPlace: 'p. ex. maison du club', addEvent: 'Ajouter un événement', rsvpRequired: 'Inscription obligatoire',
      eventsEmpty: 'Aucun événement pour l’instant. Touche « + » pour créer le premier.',
      membersIntro: 'Touche les trois points d’une personne pour modifier ses rôles, son groupe, son PIN, son nom ou son numéro, ou pour la supprimer. Roue dentée = admin, étoile = Event-Manager, verre = Chilbi/Chränzli Manager, coupe = Jass Manager. Les invités et Friends & Family ne voient que du contenu limité (voir les groupes ci-dessous).',
      memberAdd: 'Ajouter un membre', fullName: 'Prénom et nom', phone: 'Numéro de mobile',
      memberAddNote: 'Le membre se connecte uniquement avec son numéro de mobile. Le PIN correspond aux 6 derniers chiffres.',
      selfAdmin: 'Tu es admin. Tu ne peux pas te retirer tes droits toi-même.', revokeAdmin: 'Retirer les droits d’admin : {name}', makeAdmin: 'Nommer admin : {name}',
      adminTag: 'Admin', resetPin: 'Réinitialiser le PIN',
      profileTitle: 'Mein Profil', nameLabel: 'Nom',
      installTitle: 'Installer l’application', installHint: 'Place l’application sur ton écran d’accueil, elle s’ouvrira alors en plein écran.', installBtn: 'Ajouter à l’écran d’accueil',
      installIos: 'Dans Safari, touche « Partager » en bas, puis « Sur l’écran d’accueil ». L’application s’ouvrira ensuite en plein écran.',
      nameChange: 'Modifier le nom', nameSave: 'Enregistrer le nom',
      pinChange: 'Modifier le PIN', pinIntro: 'Par défaut, ce sont les 6 derniers chiffres de ton numéro de mobile. Si tu modifies le PIN, tu devras le saisir lors de la connexion.',
      pinNew: 'Nouveau PIN (6 chiffres)', pinSave: 'Enregistrer le PIN', pinDefault: 'Rétablir le PIN par défaut', logout: 'Se déconnecter',
      language: 'Langue', languageHint: 'Choisis la langue dans laquelle tu souhaites utiliser l’application.', themeTitle: 'Apparence', themeHint: 'Choisis l’apparence de l’app.', themeLight: 'Clair', themeDark: 'Sombre', themeAuto: 'Automatique',
      loginSub: 'App',
      loginLeadReg: 'Crée ton compte avec ton nom, ton numéro de mobile et le code du club. Ton PIN correspond aux 6 derniers chiffres de ton numéro de mobile.',
      loginLead: 'Connecte-toi avec ton numéro de mobile.', pinOptional: 'PIN (uniquement si tu l’as modifié)', clubCode: 'Code du club',
      register: 'Créer un compte', signIn: 'Se connecter', haveAccount: 'J’ai déjà un compte', firstTime: 'Première visite ? Créer un compte',
      setupTitle: 'Configuration nécessaire', setupLead: 'L’application n’est pas encore reliée à Supabase.',
      setupStep1: 'Ouvre le fichier <code>config.js</code>.', setupStep2: 'Saisis <code>SUPABASE_URL</code> et <code>SUPABASE_ANON_KEY</code> de ton projet Supabase.',
      setupStep3: 'Recharge la page.', setupNote: 'Les instructions détaillées se trouvent dans le fichier README.md.',
      loading: 'Chargement …',
      errFailed: 'Cela n’a pas fonctionné', respWithdrawn: 'Réponse retirée', youIn: 'Tu es présent(e)', youOut: 'Tu es absent(e)', youSolo: 'Tu viens seul(e)', youDuo: 'Tu viens à deux',
      phoneCountry: 'Pays', phoneOther: 'Autre (+…)', phoneInvalid: 'Saisis un numéro de mobile valide, p. ex. 079 123 45 67.', alreadyReg: 'Ce numéro est déjà enregistré.',
      memberAdded: '{name} a été ajouté(e).', addFailed: 'Ajout impossible : {reason}', unknownError: 'Erreur inconnue',
      authInvalid: 'Numéro de mobile ou PIN incorrect. Si tu as modifié ton PIN, saisis-le dans le champ PIN.',
      authAlready: 'Ce numéro est déjà enregistré. Connecte-toi.', authCode: 'Inscription impossible. Vérifie le code du club.',
      authRate: 'Trop de tentatives. Patiente un instant.', authPin: 'Le PIN doit comporter 6 chiffres.', authFail: 'Échec de la connexion. Réessaie.',
      pinExact: 'Le PIN doit comporter exactement 6 chiffres.', confirmEmailOff: 'Désactive « Confirm email » dans Supabase (voir README).',
      loadFail: 'Impossible de charger les données. Le schéma de la base de données a-t-il été exécuté ?',
      calFile: 'Ouvre le fichier « {name} » pour enregistrer le rendez-vous dans ton calendrier.', calFail: 'L’entrée de calendrier n’a pas pu être créée.',
      pinResetOk: 'PIN rétabli par défaut', pinResetFail: 'Le PIN n’a pas pu être rétabli.',
      confirmDelRule: 'Retirer ce jour d’entraînement ? Toutes les prochaines dates de la série disparaîtront.', ruleRemoved: 'Jour d’entraînement retiré',
      confirmDelExtra: 'Supprimer cet entraînement ?', extraDeleted: 'Entraînement supprimé',
      confirmDelEvent: 'Supprimer cet événement ? Toutes les réponses seront aussi supprimées.', eventDeleted: 'Événement supprimé',
      trReactivated: 'Entraînement de nouveau actif', trCancelledMsg: 'Entraînement annulé', evReactivated: 'Événement de nouveau actif', evCancelledMsg: 'Événement annulé',
      changeReset: 'Modification annulée', confirmResetPin: 'Rétablir le PIN de {name} aux 6 derniers chiffres du numéro de mobile ?', thisMemberDat: 'ce membre',
      pinReset: 'PIN réinitialisé', confirmRemove: 'Retirer {name} ? Le compte et toutes les réponses seront supprimés.', thisMember: 'Ce membre', memberRemoved: 'Membre retiré',
      adminGranted: 'Droits d’admin accordés', adminRevoked: 'Droits d’admin retirés', nameSaved: 'Nom enregistré', pinChanged: 'PIN modifié', pinChangeFail: 'Le PIN n’a pas pu être modifié.',
      ruleAdded: 'Jour d’entraînement ajouté', extraAdded: 'Entraînement ajouté', eventAdded: 'Événement ajouté',
      ruleChanged: 'Jour d’entraînement modifié', trChanged: 'Entraînement modifié', eventChanged: 'Événement modifié', langSaved: 'Langue enregistrée',
      guestTag: 'Invité', makeGuest: 'Définir comme invité : {name}', revokeGuest: 'Retirer le statut d’invité : {name}', guestGranted: 'Défini comme invité', guestRevoked: 'Statut d’invité retiré',
      guestCheck: 'Ajouter comme invité (ne voit que les entraînements et le profil)', guestInfo: 'Tu as un accès invité. Tu vois les entraînements et ton profil.', supporterInfo: 'Tu fais partie de Friends & Family. Tu vois les entraînements, le Jass et ton profil.',
      memberTag: 'Membre', emTag: 'Responsable des événements', makeEm: 'Nommer responsable des événements : {name}', revokeEm: 'Retirer les droits de responsable des événements : {name}', emGranted: 'Défini comme responsable des événements', emRevoked: 'Droits de responsable des événements retirés', confirmGuestLoses: '{name} a des droits Admin, Event-Manager, Chilbi Manager, Chränzli Manager ou Jass Manager. Ce changement retire ces droits. Continuer ?', selfMember: 'Tu es membre. Tu ne peux pas te définir toi-même comme invité.', rolesTitle: 'Rôles', emSub: 'Ici, tu gères les événements.', ccManagerSub: 'C&C se gère dans l’onglet « C&C ».',
      infoShow: 'Afficher l’explication', infoHide: 'Masquer l’explication',
      ok: 'OK',
      navCC: 'C&C', ccMembers: 'Membres', ccGuests: 'Invités', ccOthers: 'Autres', ccEmpty: 'Aucune manifestation pour l’instant.', ccNoDays: 'Aucun jour pour l’instant.', ccSummary: '{s} créneaux · {r} rôles', ccLvlAll: 'Chränzli et Chilbi', ccLvlEvent: 'Manifestation', ccLvlDay: 'Jour', ccLvlShift: 'Créneau', ccLvlRole: 'Rôle', ccActions: 'Actions', ccAddEvent: 'Ajouter une manifestation', ccAddDay: 'Ajouter un jour', ccAddShift: 'Ajouter un créneau', ccAddRole: 'Ajouter un rôle', ccChange: 'Modifier', ccCopy: 'Copier', ccClose: 'Fermer', ccNameOpt: 'Nom (facultatif)', ccStart: 'Début', ccEnd: 'Fin', ccActive: 'Actif', ccPersons: 'Responsables', ccSearch: 'Rechercher un nom', ccOtherPerson: 'Autre personne (pas dans l’application)', ccAdd: 'Ajouter', ccDidYouMean: 'Tu veux dire {name} ?', ccNobody: 'Personne pour l’instant', ccConfirmDel: 'Supprimer « {name} » ? Tout ce qui y est rattaché sera aussi supprimé.', ccConfirmDelRole: 'Supprimer « {name} » ?', ccCopyEventNote: 'La copie est d’abord inactive. Tous les jours sont décalés de 52 semaines pour garder les mêmes jours de la semaine.', ccCopyDayNote: 'Les créneaux et rôles sont copiés avec les responsables.', ccSaved: 'Enregistré', ccCopied: 'Copié', ccDeleted: 'Supprimé', ccNotInApp: '{name} n’est pas encore dans l’application. Avec son numéro de mobile, tu peux l’ajouter comme invité.', ccAsGuest: 'Ajouter comme invité', ccNeedName: 'Saisis un nom.', ccSetup: 'Pour C&C, le schéma de la base de données doit être mis à jour (supabase/schema.sql).', grpCandidate: 'Candidats', candidateTitle: 'Merci beaucoup pour ton intérêt', candidateMsg: 'Ta demande est examinée par nos administrateurs.', mGroupActive: 'Passer en membre actif', mGroupPassive: 'Passer en membre passif', mGroupGuest: 'Passer en invité', mGroupOther: 'Passer en Friends & Family', mGroupCandidate: 'Passer en candidat', groupChanged: 'Groupe modifié', jsEternal: 'Classement perpétuel', jsEternalHint: 'Sur les {n} dernières manches terminées', jsEternalRounds: '{n} manches', jsEternalRound: '1 manche', jsVisibleHint: 'Sans coche, seuls Admin et Jass Manager voient cette manche', evEdit: 'Modifier l’événement', evManagePeople: 'Gérer les participants', grpSupporter: 'Friends & Family', mMakeSupporter: 'Passer en Friends & Family', supporterSet: 'Classé·e dans Friends & Family', pinLampOk: 'A déjà changé son code PIN', pinLampNo: 'Utilise encore le code PIN standard', pinBannerMsg: 'Définis ton code PIN personnel pour débloquer toutes les fonctions.', pinBannerBtn: 'Définir le PIN', ccPublicLabel: 'Visible pour tous les membres actifs et passifs', ccPublicOn: 'C&C est maintenant visible pour tout le monde (lecture seule)', ccPublicOff: 'C&C n’est de nouveau visible que pour Admin, Chilbi Manager et Chränzli Manager', ccCopySuffix: 'copie', ccPrint: 'Partager en PDF', jsPrint: 'Aperçu Jassmasters en PDF', ccPdfBuilding: 'Création du PDF…', ccPdfFailed: 'Le PDF n’a pas pu être créé.',
      mMakeAdmin: 'Nommer admin', mRevokeAdmin: 'Retirer les droits d’admin', mMakeEm: 'Nommer responsable des événements', mRevokeEm: 'Retirer les droits de responsable des événements', mMakeGuest: 'Définir comme invité', mMakeMember: 'Définir comme membre', mEdit: 'Modifier le nom et le numéro de mobile', mEditNote: 'Avec un nouveau numéro, le PIN par défaut s’applique à nouveau : les 6 derniers chiffres du nouveau numéro.', mSaved: 'Enregistré', mDelete: 'Supprimer le membre', mPhoneTaken: 'Ce numéro de mobile appartient déjà à une autre personne.',
      navJass: 'Jass', jsParticipants: 'Participants', jsSchedule: 'Programme des parties', jsRanking: 'Classement du jour', jsRound: 'Manche {n}', jsTable: 'Table {t}', jsTeam1: 'Équipe I', jsTeam2: 'Équipe II', jsPlayer: 'Joueur {n}', jsFree: 'libre', jsEmpty: 'Aucun Jassmasters pour l’instant.', jsNoDays: 'Aucune date pour l’instant.', jsAddSeries: 'Ajouter un Jassmasters', jsAddDay: 'Ajouter une date', jsLvlSeries: 'Jassmasters', jsLvlDay: 'Journée de jass', jsPick: 'Choisir le joueur {n}', jsClear: 'Libérer la place', jsAlready: 'déjà joueur {n}', jsPoints: 'Points', jsGames: '{n} parties', jsPtsAbbr: 'pts', jsGame: '{n} partie', jsNoPoints: 'Aucun point saisi pour l’instant.', jsHint: 'Saisis les points pour l’équipe gagnante. L’autre équipe les reçoit automatiquement en négatif.', jsSetup: 'Pour le jass, le schéma de la base de données doit être mis à jour (supabase/schema.sql).', jsFinish: 'Clôturer le Jassmaster', jsConfirmFinish: 'Clôturer « {name} » ? La manche sera déplacée sous Jassmasters passés et ne sera plus visible que comme classement. Continuer ?', jsFinished: 'Marqué comme terminé', jsEditRanking: 'Modifier le classement', jsRankName: 'Nom', jsRankPoints: 'Points', jsAddRow: 'Ajouter une ligne', jsNoRows: 'Personne n’a encore été saisi.',
      jmTag: 'Responsable Jass', mMakeJm: 'Nommer responsable Jass', mRevokeJm: 'Retirer les droits de responsable Jass', jmGranted: 'Défini comme responsable Jass', jmRevoked: 'Droits de responsable Jass retirés', cmTag: 'Responsable Chilbi', crmTag: 'Responsable Chränzli', mMakeCm: 'Nommer responsable Chilbi', mRevokeCm: 'Retirer les droits de responsable Chilbi', mMakeCrm: 'Nommer responsable Chränzli', mRevokeCrm: 'Retirer les droits de responsable Chränzli', cmGranted: 'Défini comme responsable Chilbi', cmRevoked: 'Droits de responsable Chilbi retirés', crmGranted: 'Défini comme responsable Chränzli', crmRevoked: 'Droits de responsable Chränzli retirés', grpActive: 'Membres actifs', grpPassive: 'Membres passifs', mMakePassive: 'Passer en membre passif', mMakeActive: 'Passer en membre actif', passiveSet: 'Défini comme membre passif', activeSet: 'Défini comme membre actif', jsUpcoming: 'Jassmaster à venir', jsPast: 'Jassmasters passés'
    },

    en: {
      wd0: 'Sunday', wd1: 'Monday', wd2: 'Tuesday', wd3: 'Wednesday', wd4: 'Thursday', wd5: 'Friday', wd6: 'Saturday',
      navTrainings: 'Trainings', navEvents: 'Events', navAdmin: 'Admin', navProfile: 'Profile',
      titleTrainings: 'Trainingsplan', titleEvents: 'Vereinsanlässe',
      subTrainings: 'The next {n} sessions', subEvents: 'The following club events are planned', moreDates: 'More dates ({n})',
      emptyTrTitle: 'No trainings planned yet.', emptyTrAdmin: 'Set a training day in the “Manage” section.', emptyTrMember: 'The admins set the training days.',
      emptyEvTitle: 'No events planned at the moment.', emptyEvAdmin: 'Create an event in the “Manage” section.', emptyEvMember: 'The admins create new events.',
      trainingWord: 'Training', trCancelled: 'Training cancelled', yes: 'Attending', no: 'Not attending', participants: 'Participants',
      ariaTr: '{yes} participants, {no} not attending. {action} participant list', ariaEv: '{n} participants. {action} participant list',
      listOpen: 'Open', listClose: 'Close',
      hYes: 'Attending ({n})', hNo: 'Not attending ({n})', hOpen: 'No reply yet ({n})', hSolo: 'Attending alone ({n})', hDuo: 'Attending as a pair ({n} members, {p} people)',
      nobody: 'Nobody', you: '(you)', cancelledTag: 'Cancelled', cancelledLow: 'cancelled', changedLow: 'changed',
      timePlace: '{time}, {place}', atTime: '{time}', calAdd: 'Add to calendar', solo: 'Alone', duo: 'As a pair',
      secRules: 'Standard training', secExtra: 'Extra training', secUpcoming: 'Manage training schedule', secEvents: 'Events', secMembers: 'Groups',
      addNew: 'Add new', addClose: 'Close form',
      adminTitle: 'Admin Console', titleCC: 'Chilbi & Chränzli', titleJass: 'Jass-Masters', adminSub: 'Visible to admins only', rulesIntro: 'Standard trainings per week',
      weekday: 'Weekday', time: 'Time', place: 'Place', date: 'Date', label: 'Title',
      phPlaceTraining: 'e.g. North School gym', addRule: 'Add training day',
      edit: 'Edit', remove: 'Remove', cancel: 'Cancel', reactivate: 'Reactivate', del: 'Delete', save: 'Save', dismiss: 'Discard', reset: 'Reset',
      editNote: 'Applies to this date only. Members’ replies are kept.',
      rulesEmpty: 'No fixed training day yet. Tap “+” to add one.',
      extraIntro: 'The following additional trainings are planned', extraEmpty: 'No additional trainings planned.', extraDefaultTitle: 'Extra training',
      phPlaceExtra: 'e.g. South sports ground', addExtra: 'Add another training', upcomingEmpty: 'No upcoming trainings.',
      phEventTitle: 'e.g. Fondue evening', phEventPlace: 'e.g. Club house', addEvent: 'Add event', rsvpRequired: 'Registration required',
      eventsEmpty: 'No events yet. Tap “+” to add the first one.',
      membersIntro: 'Tap the three dots next to a person to change roles, group, PIN, name or mobile number, or to delete them. Gear = admin, star = event manager, glass = Chilbi/Chränzli manager, trophy = Jass manager. Guests and Friends & Family only see limited content (see groups below).',
      memberAdd: 'Add member', fullName: 'First and last name', phone: 'Mobile number',
      memberAddNote: 'The member signs in with the mobile number only. The PIN is the last 6 digits.',
      selfAdmin: 'You are an admin. You cannot remove your own rights.', revokeAdmin: 'Remove admin rights: {name}', makeAdmin: 'Make admin: {name}',
      adminTag: 'Admin', resetPin: 'Reset PIN',
      profileTitle: 'Mein Profil', nameLabel: 'Name',
      installTitle: 'Install app', installHint: 'Add the app to your home screen and it opens in full screen.', installBtn: 'Add to home screen',
      installIos: 'In Safari, tap “Share” at the bottom, then “Add to Home Screen”. The app then opens in full screen.',
      nameChange: 'Change name', nameSave: 'Save name',
      pinChange: 'Change PIN', pinIntro: 'By default it is the last 6 digits of your mobile number. If you change the PIN, you must enter it when signing in.',
      pinNew: 'New PIN (6 digits)', pinSave: 'Save PIN', pinDefault: 'Reset to default PIN', logout: 'Sign out',
      language: 'Language', languageHint: 'Choose the language you would like to use the app in.', themeTitle: 'Appearance', themeHint: 'Choose how the app should look.', themeLight: 'Light', themeDark: 'Dark', themeAuto: 'Automatic',
      loginSub: 'App',
      loginLeadReg: 'Create your account with your name, mobile number and club code. Your PIN is the last 6 digits of your mobile number.',
      loginLead: 'Sign in with your mobile number.', pinOptional: 'PIN (only needed if you changed it)', clubCode: 'Club code',
      register: 'Create account', signIn: 'Sign in', haveAccount: 'I already have an account', firstTime: 'First time here? Create an account',
      setupTitle: 'Setup required', setupLead: 'The app is not connected to Supabase yet.',
      setupStep1: 'Open the file <code>config.js</code>.', setupStep2: 'Enter <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> from your Supabase project.',
      setupStep3: 'Reload the page.', setupNote: 'Detailed instructions are in the file README.md.',
      loading: 'Loading …',
      errFailed: 'That did not work', respWithdrawn: 'Reply withdrawn', youIn: 'You are attending', youOut: 'You are not attending', youSolo: 'You are coming alone', youDuo: 'You are coming as a pair',
      phoneCountry: 'Country', phoneOther: 'Other (+…)', phoneInvalid: 'Please enter a valid mobile number, e.g. 079 123 45 67.', alreadyReg: 'This number is already registered.',
      memberAdded: '{name} has been added.', addFailed: 'Could not add: {reason}', unknownError: 'Unknown error',
      authInvalid: 'Mobile number or PIN is incorrect. If you changed your PIN, enter it in the PIN field.',
      authAlready: 'This number is already registered. Please sign in.', authCode: 'Registration not possible. Please check the club code.',
      authRate: 'Too many attempts. Please wait a moment.', authPin: 'The PIN must consist of 6 digits.', authFail: 'Sign-in failed. Please try again.',
      pinExact: 'The PIN must consist of exactly 6 digits.', confirmEmailOff: 'Please turn off “Confirm email” in Supabase (see README).',
      loadFail: 'The data could not be loaded. Was the database schema executed?',
      calFile: 'Open the file “{name}” to save the event to your calendar.', calFail: 'The calendar entry could not be created.',
      pinResetOk: 'PIN reset to default', pinResetFail: 'The PIN could not be reset.',
      confirmDelRule: 'Remove this training day? All upcoming dates of the series will disappear.', ruleRemoved: 'Training day removed',
      confirmDelExtra: 'Delete this training?', extraDeleted: 'Training deleted',
      confirmDelEvent: 'Delete this event? All replies will be deleted as well.', eventDeleted: 'Event deleted',
      trReactivated: 'Training active again', trCancelledMsg: 'Training cancelled', evReactivated: 'Event active again', evCancelledMsg: 'Event cancelled',
      changeReset: 'Change reset', confirmResetPin: 'Reset the PIN of {name} to the last 6 digits of the mobile number?', thisMemberDat: 'this member',
      pinReset: 'PIN reset', confirmRemove: 'Remove {name}? The account and all replies will be deleted.', thisMember: 'This member', memberRemoved: 'Member removed',
      adminGranted: 'Admin rights granted', adminRevoked: 'Admin rights removed', nameSaved: 'Name saved', pinChanged: 'PIN changed', pinChangeFail: 'The PIN could not be changed.',
      ruleAdded: 'Training day added', extraAdded: 'Training added', eventAdded: 'Event added',
      ruleChanged: 'Training day changed', trChanged: 'Training changed', eventChanged: 'Event changed', langSaved: 'Language saved',
      guestTag: 'Guest', makeGuest: 'Set as guest: {name}', revokeGuest: 'Remove guest status: {name}', guestGranted: 'Set as guest', guestRevoked: 'Guest status removed',
      guestCheck: 'Add as guest (sees only trainings and profile)', guestInfo: 'You have guest access. You can see the trainings and your profile.', supporterInfo: 'You\'re part of Friends & Family. You see trainings, Jass and your profile.',
      memberTag: 'Member', emTag: 'Event manager', makeEm: 'Make event manager: {name}', revokeEm: 'Remove event manager rights: {name}', emGranted: 'Set as event manager', emRevoked: 'Event manager rights removed', confirmGuestLoses: '{name} has Admin, Event-Manager, Chilbi Manager, Chränzli Manager or Jass Manager rights. This change removes those rights. Continue?', selfMember: 'You are a member. You cannot set yourself as a guest.', rolesTitle: 'Roles', emSub: 'Here you manage the events.', ccManagerSub: 'You manage C&C in the "C&C" tab.',
      infoShow: 'Show explanation', infoHide: 'Hide explanation',
      ok: 'OK',
      navCC: 'C&C', ccMembers: 'Members', ccGuests: 'Guests', ccOthers: 'Others', ccEmpty: 'No occasions yet.', ccNoDays: 'No days yet.', ccSummary: '{s} shifts · {r} roles', ccLvlAll: 'Chränzli and Chilbi', ccLvlEvent: 'Occasion', ccLvlDay: 'Day', ccLvlShift: 'Shift', ccLvlRole: 'Role', ccActions: 'Actions', ccAddEvent: 'Add occasion', ccAddDay: 'Add day', ccAddShift: 'Add shift', ccAddRole: 'Add role', ccChange: 'Edit', ccCopy: 'Copy', ccClose: 'Close', ccNameOpt: 'Name (optional)', ccStart: 'Start', ccEnd: 'End', ccActive: 'Active', ccPersons: 'Responsible', ccSearch: 'Search names', ccOtherPerson: 'Other person (not in the app)', ccAdd: 'Add', ccDidYouMean: 'Did you mean {name}?', ccNobody: 'Nobody yet', ccConfirmDel: 'Delete “{name}”? Everything under it will be deleted too.', ccConfirmDelRole: 'Delete “{name}”?', ccCopyEventNote: 'The copy starts inactive. All days move by 52 weeks so the weekdays stay the same.', ccCopyDayNote: 'Shifts and roles are copied with the people responsible.', ccSaved: 'Saved', ccCopied: 'Copied', ccDeleted: 'Deleted', ccNotInApp: '{name} is not in the app yet. With a mobile number you can add them as a guest.', ccAsGuest: 'Add as guest', ccNeedName: 'Enter a name.', ccSetup: 'C&C needs an updated database schema (supabase/schema.sql).', grpCandidate: 'Candidates', candidateTitle: 'Thank you for your interest', candidateMsg: 'Your request is being reviewed by our administrators.', mGroupActive: 'Make active member', mGroupPassive: 'Make passive member', mGroupGuest: 'Make guest', mGroupOther: 'Make Friends & Family', mGroupCandidate: 'Make candidate', groupChanged: 'Group changed', jsEternal: 'All-time ranking', jsEternalHint: 'Over the last {n} completed rounds', jsEternalRounds: '{n} rounds', jsEternalRound: '1 round', jsVisibleHint: 'Without the tick, only Admin and Jass Manager see this round', evEdit: 'Edit event', evManagePeople: 'Manage participants', grpSupporter: 'Friends & Family', mMakeSupporter: 'Make Friends & Family', supporterSet: 'Set to Friends & Family', pinLampOk: 'Has already changed their PIN', pinLampNo: 'Still using the default PIN', pinBannerMsg: 'Please set your personal PIN code to unlock all features.', pinBannerBtn: 'Set PIN now', ccPublicLabel: 'Visible to all active and passive members', ccPublicOn: 'C&C is now visible to everyone (read-only)', ccPublicOff: 'C&C is now visible only to Admin, Chilbi Manager and Chränzli Manager again', ccCopySuffix: 'copy', ccPrint: 'Share as PDF', jsPrint: 'Jassmasters overview as PDF', ccPdfBuilding: 'Creating PDF…', ccPdfFailed: 'The PDF could not be created.',
      mMakeAdmin: 'Make admin', mRevokeAdmin: 'Remove admin rights', mMakeEm: 'Make event manager', mRevokeEm: 'Remove event manager rights', mMakeGuest: 'Set as guest', mMakeMember: 'Set as member', mEdit: 'Change name and mobile number', mEditNote: 'With a new number the default PIN applies again: the last 6 digits of the new number.', mSaved: 'Saved', mDelete: 'Delete member', mPhoneTaken: 'This mobile number already belongs to someone else.',
      navJass: 'Jass', jsParticipants: 'Players', jsSchedule: 'Schedule', jsRanking: 'Daily ranking', jsRound: 'Round {n}', jsTable: 'Table {t}', jsTeam1: 'Team I', jsTeam2: 'Team II', jsPlayer: 'Player {n}', jsFree: 'open', jsEmpty: 'No Jassmasters yet.', jsNoDays: 'No date yet.', jsAddSeries: 'Add Jassmasters', jsAddDay: 'Add date', jsLvlSeries: 'Jassmasters', jsLvlDay: 'Jass day', jsPick: 'Choose player {n}', jsClear: 'Clear seat', jsAlready: 'already player {n}', jsPoints: 'Points', jsGames: '{n} games', jsPtsAbbr: 'pts', jsGame: '{n} game', jsNoPoints: 'No points entered yet.', jsHint: 'Enter the points for the winning team. The other team automatically gets them as negative points.', jsSetup: 'Jass needs an updated database schema (supabase/schema.sql).', jsFinish: 'Finish Jassmaster', jsConfirmFinish: 'Finish "{name}"? It will move to Past Jassmasters and will only be visible as a ranking afterwards. Continue?', jsFinished: 'Marked as finished', jsEditRanking: 'Edit ranking', jsRankName: 'Name', jsRankPoints: 'Points', jsAddRow: 'Add row', jsNoRows: 'Nobody entered yet.',
      jmTag: 'Jass Manager', mMakeJm: 'Make Jass Manager', mRevokeJm: 'Revoke Jass Manager rights', jmGranted: 'Set as Jass Manager', jmRevoked: 'Jass Manager rights revoked', cmTag: 'Chilbi Manager', crmTag: 'Chränzli Manager', mMakeCm: 'Make Chilbi Manager', mRevokeCm: 'Revoke Chilbi Manager rights', mMakeCrm: 'Make Chränzli Manager', mRevokeCrm: 'Revoke Chränzli Manager rights', cmGranted: 'Set as Chilbi Manager', cmRevoked: 'Chilbi Manager rights revoked', crmGranted: 'Set as Chränzli Manager', crmRevoked: 'Chränzli Manager rights revoked', grpActive: 'Active members', grpPassive: 'Passive members', mMakePassive: 'Make passive member', mMakeActive: 'Make active member', passiveSet: 'Set as passive member', activeSet: 'Set as active member', jsUpcoming: 'Upcoming Jassmaster', jsPast: 'Past Jassmasters'
    },

    it: {
      wd0: 'Domenica', wd1: 'Lunedì', wd2: 'Martedì', wd3: 'Mercoledì', wd4: 'Giovedì', wd5: 'Venerdì', wd6: 'Sabato',
      navTrainings: 'Allenamenti', navEvents: 'Eventi', navAdmin: 'Admin', navProfile: 'Profilo',
      titleTrainings: 'Trainingsplan', titleEvents: 'Vereinsanlässe',
      subTrainings: 'I prossimi {n} appuntamenti', subEvents: 'Sono previsti i seguenti eventi del club', moreDates: 'Altri appuntamenti ({n})',
      emptyTrTitle: 'Nessun allenamento in programma.', emptyTrAdmin: 'Definisci un giorno di allenamento nella sezione «Gestione».', emptyTrMember: 'Gli admin definiscono i giorni di allenamento.',
      emptyEvTitle: 'Al momento non ci sono eventi in programma.', emptyEvAdmin: 'Crea un evento nella sezione «Gestione».', emptyEvMember: 'Gli admin creano i nuovi eventi.',
      trainingWord: 'Allenamento', trCancelled: 'Allenamento annullato', yes: 'Presente', no: 'Assente', participants: 'Partecipanti',
      ariaTr: '{yes} partecipanti, {no} assenti. {action} elenco partecipanti', ariaEv: '{n} partecipanti. {action} elenco partecipanti',
      listOpen: 'Apri', listClose: 'Chiudi',
      hYes: 'Presenti ({n})', hNo: 'Assenti ({n})', hOpen: 'Ancora nessuna risposta ({n})', hSolo: 'Da solo/a ({n})', hDuo: 'In due ({n} soci, {p} persone)',
      nobody: 'Nessuno', you: '(tu)', cancelledTag: 'Annullato', cancelledLow: 'annullato', changedLow: 'modificato',
      timePlace: 'ore {time}, {place}', atTime: 'ore {time}', calAdd: 'Aggiungi al calendario', solo: 'Da solo/a', duo: 'In due',
      secRules: 'Allenamento standard', secExtra: 'Allenamento extra', secUpcoming: 'Gestisci il piano di allenamento', secEvents: 'Eventi', secMembers: 'Gruppi',
      addNew: 'Aggiungi', addClose: 'Chiudi il modulo',
      adminTitle: 'Admin Console', titleCC: 'Chilbi & Chränzli', titleJass: 'Jass-Masters', adminSub: 'Visibile solo agli admin', rulesIntro: 'Allenamenti standard settimanali',
      weekday: 'Giorno della settimana', time: 'Ora', place: 'Luogo', date: 'Data', label: 'Denominazione',
      phPlaceTraining: 'ad es. palestra scuola Nord', addRule: 'Aggiungi giorno di allenamento',
      edit: 'Modifica', remove: 'Rimuovi', cancel: 'Annulla', reactivate: 'Riattiva', del: 'Elimina', save: 'Salva', dismiss: 'Chiudi', reset: 'Ripristina',
      editNote: 'Vale solo per questo appuntamento. Le risposte dei soci vengono mantenute.',
      rulesEmpty: 'Nessun giorno di allenamento fisso. Tocca «+» per aggiungerne uno.',
      extraIntro: 'Sono previsti i seguenti allenamenti aggiuntivi', extraEmpty: 'Nessun allenamento aggiuntivo in programma.', extraDefaultTitle: 'Allenamento aggiuntivo',
      phPlaceExtra: 'ad es. impianto sportivo Sud', addExtra: 'Aggiungi allenamento', upcomingEmpty: 'Nessun allenamento in arrivo.',
      phEventTitle: 'ad es. serata fonduta', phEventPlace: 'ad es. sede del club', addEvent: 'Aggiungi evento', rsvpRequired: 'Iscrizione obbligatoria',
      eventsEmpty: 'Ancora nessun evento. Tocca «+» per crearne uno.',
      membersIntro: 'Tocca i tre puntini accanto a una persona per modificare ruoli, gruppo, PIN, nome o numero di cellulare, oppure per eliminarla. Ingranaggio = admin, stella = Event-Manager, bicchiere = Chilbi/Chränzli Manager, coppa = Jass Manager. Ospiti e Friends & Family vedono solo contenuti limitati (vedi i gruppi qui sotto).',
      memberAdd: 'Aggiungi socio', fullName: 'Nome e cognome', phone: 'Numero di cellulare',
      memberAddNote: 'Il socio accede solo con il numero di cellulare. Il PIN corrisponde alle ultime 6 cifre.',
      selfAdmin: 'Sei admin. Non puoi revocarti i diritti da solo.', revokeAdmin: 'Revoca i diritti di admin: {name}', makeAdmin: 'Rendi admin: {name}',
      adminTag: 'Admin', resetPin: 'Reimposta PIN',
      profileTitle: 'Mein Profil', nameLabel: 'Nome',
      installTitle: 'Installa l’app', installHint: 'Aggiungi l’app alla schermata Home: si aprirà a schermo intero.', installBtn: 'Aggiungi alla schermata Home',
      installIos: 'In Safari tocca «Condividi» in basso, poi «Aggiungi alla schermata Home». L’app si aprirà a schermo intero.',
      nameChange: 'Cambia nome', nameSave: 'Salva nome',
      pinChange: 'Cambia PIN', pinIntro: 'Per impostazione predefinita sono le ultime 6 cifre del tuo numero di cellulare. Se cambi il PIN, dovrai inserirlo al momento dell’accesso.',
      pinNew: 'Nuovo PIN (6 cifre)', pinSave: 'Salva PIN', pinDefault: 'Ripristina il PIN predefinito', logout: 'Esci',
      language: 'Lingua', languageHint: 'Scegli la lingua in cui vuoi usare l’app.', themeTitle: 'Aspetto', themeHint: 'Scegli come deve apparire l’app.', themeLight: 'Chiaro', themeDark: 'Scuro', themeAuto: 'Automatico',
      loginSub: 'App',
      loginLeadReg: 'Crea il tuo account con nome, numero di cellulare e codice del club. Il tuo PIN corrisponde alle ultime 6 cifre del tuo numero di cellulare.',
      loginLead: 'Accedi con il tuo numero di cellulare.', pinOptional: 'PIN (necessario solo se lo hai cambiato)', clubCode: 'Codice del club',
      register: 'Crea account', signIn: 'Accedi', haveAccount: 'Ho già un account', firstTime: 'Prima volta qui? Crea un account',
      setupTitle: 'Configurazione necessaria', setupLead: 'L’app non è ancora collegata a Supabase.',
      setupStep1: 'Apri il file <code>config.js</code>.', setupStep2: 'Inserisci <code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code> del tuo progetto Supabase.',
      setupStep3: 'Ricarica la pagina.', setupNote: 'Le istruzioni dettagliate si trovano nel file README.md.',
      loading: 'Caricamento …',
      errFailed: 'Non ha funzionato', respWithdrawn: 'Risposta ritirata', youIn: 'Sei presente', youOut: 'Sei assente', youSolo: 'Vieni da solo/a', youDuo: 'Vieni in due',
      phoneCountry: 'Paese', phoneOther: 'Altro (+…)', phoneInvalid: 'Inserisci un numero di cellulare valido, ad es. 079 123 45 67.', alreadyReg: 'Questo numero è già registrato.',
      memberAdded: '{name} è stato aggiunto.', addFailed: 'Impossibile aggiungere: {reason}', unknownError: 'Errore sconosciuto',
      authInvalid: 'Numero di cellulare o PIN errato. Se hai cambiato il PIN, inseriscilo nel campo PIN.',
      authAlready: 'Questo numero è già registrato. Effettua l’accesso.', authCode: 'Registrazione non possibile. Controlla il codice del club.',
      authRate: 'Troppi tentativi. Attendi un momento.', authPin: 'Il PIN deve essere composto da 6 cifre.', authFail: 'Accesso non riuscito. Riprova.',
      pinExact: 'Il PIN deve essere composto esattamente da 6 cifre.', confirmEmailOff: 'Disattiva «Confirm email» in Supabase (vedi README).',
      loadFail: 'Impossibile caricare i dati. Lo schema del database è stato eseguito?',
      calFile: 'Apri il file «{name}» per salvare l’appuntamento nel calendario.', calFail: 'Impossibile creare la voce di calendario.',
      pinResetOk: 'PIN ripristinato a quello predefinito', pinResetFail: 'Impossibile ripristinare il PIN.',
      confirmDelRule: 'Rimuovere questo giorno di allenamento? Tutti i prossimi appuntamenti della serie scompariranno.', ruleRemoved: 'Giorno di allenamento rimosso',
      confirmDelExtra: 'Eliminare questo allenamento?', extraDeleted: 'Allenamento eliminato',
      confirmDelEvent: 'Eliminare questo evento? Verranno eliminate anche tutte le risposte.', eventDeleted: 'Evento eliminato',
      trReactivated: 'Allenamento di nuovo attivo', trCancelledMsg: 'Allenamento annullato', evReactivated: 'Evento di nuovo attivo', evCancelledMsg: 'Evento annullato',
      changeReset: 'Modifica annullata', confirmResetPin: 'Ripristinare il PIN di {name} alle ultime 6 cifre del numero di cellulare?', thisMemberDat: 'questo socio',
      pinReset: 'PIN reimpostato', confirmRemove: 'Rimuovere {name}? L’account e tutte le risposte verranno eliminati.', thisMember: 'Questo socio', memberRemoved: 'Socio rimosso',
      adminGranted: 'Diritti di admin assegnati', adminRevoked: 'Diritti di admin revocati', nameSaved: 'Nome salvato', pinChanged: 'PIN modificato', pinChangeFail: 'Impossibile modificare il PIN.',
      ruleAdded: 'Giorno di allenamento aggiunto', extraAdded: 'Allenamento aggiunto', eventAdded: 'Evento aggiunto',
      ruleChanged: 'Giorno di allenamento modificato', trChanged: 'Allenamento modificato', eventChanged: 'Evento modificato', langSaved: 'Lingua salvata',
      guestTag: 'Ospite', makeGuest: 'Imposta come ospite: {name}', revokeGuest: 'Rimuovi lo stato di ospite: {name}', guestGranted: 'Impostato come ospite', guestRevoked: 'Stato di ospite rimosso',
      guestCheck: 'Aggiungi come ospite (vede solo allenamenti e profilo)', guestInfo: 'Hai un accesso come ospite. Vedi gli allenamenti e il tuo profilo.', supporterInfo: 'Fai parte di Friends & Family. Vedi gli allenamenti, il Jass e il tuo profilo.',
      memberTag: 'Socio', emTag: 'Responsabile eventi', makeEm: 'Nomina responsabile eventi: {name}', revokeEm: 'Revoca i diritti di responsabile eventi: {name}', emGranted: 'Impostato come responsabile eventi', emRevoked: 'Diritti di responsabile eventi revocati', confirmGuestLoses: '{name} ha diritti da Admin, Event-Manager, Chilbi Manager, Chränzli Manager o Jass Manager. Questa modifica toglie questi diritti. Continuare?', selfMember: 'Sei socio. Non puoi impostarti da solo come ospite.', rolesTitle: 'Ruoli', emSub: 'Qui gestisci gli eventi.', ccManagerSub: 'C&C si gestisce nella scheda «C&C».',
      infoShow: 'Mostra la spiegazione', infoHide: 'Nascondi la spiegazione',
      ok: 'OK',
      navCC: 'C&C', ccMembers: 'Soci', ccGuests: 'Ospiti', ccOthers: 'Altri', ccEmpty: 'Ancora nessuna manifestazione.', ccNoDays: 'Ancora nessun giorno.', ccSummary: '{s} turni · {r} ruoli', ccLvlAll: 'Chränzli e Chilbi', ccLvlEvent: 'Manifestazione', ccLvlDay: 'Giorno', ccLvlShift: 'Turno', ccLvlRole: 'Ruolo', ccActions: 'Azioni', ccAddEvent: 'Aggiungi manifestazione', ccAddDay: 'Aggiungi giorno', ccAddShift: 'Aggiungi turno', ccAddRole: 'Aggiungi ruolo', ccChange: 'Modifica', ccCopy: 'Copia', ccClose: 'Chiudi', ccNameOpt: 'Nome (facoltativo)', ccStart: 'Inizio', ccEnd: 'Fine', ccActive: 'Attivo', ccPersons: 'Responsabili', ccSearch: 'Cerca nomi', ccOtherPerson: 'Altra persona (non nell’app)', ccAdd: 'Aggiungi', ccDidYouMean: 'Intendi {name}?', ccNobody: 'Ancora nessuno', ccConfirmDel: 'Eliminare «{name}»? Verrà eliminato anche tutto ciò che contiene.', ccConfirmDelRole: 'Eliminare «{name}»?', ccCopyEventNote: 'La copia è inizialmente inattiva. Tutti i giorni vengono spostati di 52 settimane, così i giorni della settimana restano uguali.', ccCopyDayNote: 'Turni e ruoli vengono copiati con i responsabili.', ccSaved: 'Salvato', ccCopied: 'Copiato', ccDeleted: 'Eliminato', ccNotInApp: '{name} non è ancora nell’app. Con il numero di cellulare puoi aggiungere la persona come ospite.', ccAsGuest: 'Aggiungi come ospite', ccNeedName: 'Inserisci un nome.', ccSetup: 'Per C&C lo schema del database deve essere aggiornato (supabase/schema.sql).', grpCandidate: 'Candidati', candidateTitle: 'Grazie mille per il tuo interesse', candidateMsg: 'La tua richiesta viene esaminata dai nostri amministratori.', mGroupActive: 'Rendi membro attivo', mGroupPassive: 'Rendi membro passivo', mGroupGuest: 'Rendi ospite', mGroupOther: 'Rendi Friends & Family', mGroupCandidate: 'Rendi candidato', groupChanged: 'Gruppo modificato', jsEternal: 'Classifica perpetua', jsEternalHint: 'Sulle ultime {n} manche concluse', jsEternalRounds: '{n} manche', jsEternalRound: '1 turno', jsVisibleHint: 'Senza spunta, solo Admin e Jass Manager vedono questa manche', evEdit: 'Modifica evento', evManagePeople: 'Gestisci partecipanti', grpSupporter: 'Friends & Family', mMakeSupporter: 'Rendi Friends & Family', supporterSet: 'Assegnato a Friends & Family', pinLampOk: 'Ha già cambiato il PIN', pinLampNo: 'Usa ancora il PIN standard', pinBannerMsg: 'Imposta il tuo PIN personale per sbloccare tutte le funzioni.', pinBannerBtn: 'Imposta PIN', ccPublicLabel: 'Visibile a tutti i membri attivi e passivi', ccPublicOn: 'C&C è ora visibile a tutti (sola lettura)', ccPublicOff: 'C&C è di nuovo visibile solo ad Admin, Chilbi Manager e Chränzli Manager', ccCopySuffix: 'copia', ccPrint: 'Condividi come PDF', jsPrint: 'Panoramica Jassmasters come PDF', ccPdfBuilding: 'Creazione del PDF…', ccPdfFailed: 'Impossibile creare il PDF.',
      mMakeAdmin: 'Rendi admin', mRevokeAdmin: 'Revoca i diritti di admin', mMakeEm: 'Nomina responsabile eventi', mRevokeEm: 'Revoca i diritti di responsabile eventi', mMakeGuest: 'Imposta come ospite', mMakeMember: 'Imposta come socio', mEdit: 'Modifica nome e numero di cellulare', mEditNote: 'Con un nuovo numero vale di nuovo il PIN predefinito: le ultime 6 cifre del nuovo numero.', mSaved: 'Salvato', mDelete: 'Elimina socio', mPhoneTaken: 'Questo numero di cellulare appartiene già a un’altra persona.',
      navJass: 'Jass', jsParticipants: 'Partecipanti', jsSchedule: 'Calendario delle partite', jsRanking: 'Classifica del giorno', jsRound: 'Turno {n}', jsTable: 'Tavolo {t}', jsTeam1: 'Squadra I', jsTeam2: 'Squadra II', jsPlayer: 'Giocatore {n}', jsFree: 'libero', jsEmpty: 'Ancora nessun Jassmasters.', jsNoDays: 'Ancora nessuna data.', jsAddSeries: 'Aggiungi Jassmasters', jsAddDay: 'Aggiungi data', jsLvlSeries: 'Jassmasters', jsLvlDay: 'Giornata di jass', jsPick: 'Scegli il giocatore {n}', jsClear: 'Libera il posto', jsAlready: 'già giocatore {n}', jsPoints: 'Punti', jsGames: '{n} partite', jsPtsAbbr: 'pt', jsGame: '{n} partita', jsNoPoints: 'Ancora nessun punto inserito.', jsHint: 'Inserisci i punti per la squadra vincente. L’altra squadra li riceve automaticamente in negativo.', jsSetup: 'Per il jass lo schema del database deve essere aggiornato (supabase/schema.sql).', jsFinish: 'Concludi il Jassmaster', jsConfirmFinish: 'Concludere «{name}»? Verrà spostato in Jassmasters passati e sarà visibile solo come classifica. Continuare?', jsFinished: 'Contrassegnato come concluso', jsEditRanking: 'Modifica classifica', jsRankName: 'Nome', jsRankPoints: 'Punti', jsAddRow: 'Aggiungi riga', jsNoRows: 'Nessuno ancora inserito.',
      jmTag: 'Responsabile Jass', mMakeJm: 'Nomina responsabile Jass', mRevokeJm: 'Revoca i diritti di responsabile Jass', jmGranted: 'Impostato come responsabile Jass', jmRevoked: 'Diritti di responsabile Jass revocati', cmTag: 'Responsabile Chilbi', crmTag: 'Responsabile Chränzli', mMakeCm: 'Nomina responsabile Chilbi', mRevokeCm: 'Revoca i diritti di responsabile Chilbi', mMakeCrm: 'Nomina responsabile Chränzli', mRevokeCrm: 'Revoca i diritti di responsabile Chränzli', cmGranted: 'Impostato come responsabile Chilbi', cmRevoked: 'Diritti di responsabile Chilbi revocati', crmGranted: 'Impostato come responsabile Chränzli', crmRevoked: 'Diritti di responsabile Chränzli revocati', grpActive: 'Membri attivi', grpPassive: 'Membri passivi', mMakePassive: 'Rendi membro passivo', mMakeActive: 'Rendi membro attivo', passiveSet: 'Impostato come membro passivo', activeSet: 'Impostato come membro attivo', jsUpcoming: 'Jassmaster in arrivo', jsPast: 'Jassmasters passati'
    },

    gsw: {
      wd0: 'Sunntig', wd1: 'Mäntig', wd2: 'Ziischtig', wd3: 'Mittwuch', wd4: 'Dunnschtig', wd5: 'Fritig', wd6: 'Samschtig',
      navTrainings: 'Trainings', navEvents: 'Events', navAdmin: 'Admin', navProfile: 'Profil',
      titleTrainings: 'Trainingsplan', titleEvents: 'Vereinsanlässe',
      subTrainings: 'Di nächschte {n} Termin', subEvents: 'Die Vereinsaalässe sind planet', moreDates: 'Wiitere Termin ({n})',
      emptyTrTitle: 'Es sind no kei Trainings planet.', emptyTrAdmin: 'Leg im Bereich «Verwalte» en Trainingstag fescht.', emptyTrMember: 'D Admins leged d Trainingstäg fescht.',
      emptyEvTitle: 'Im Momänt sind kei Events planet.', emptyEvAdmin: 'Leg im Bereich «Verwalte» en Event aa.', emptyEvMember: 'D Admins leged neui Events aa.',
      trainingWord: 'Training', trCancelled: 'Training abgsait', yes: 'Debii', no: 'Nöd debii', participants: 'Teilnehmer',
      ariaTr: '{yes} Teilnehmer, {no} nöd debii. Teilnehmerlischte {action}', ariaEv: '{n} Teilnehmer. Teilnehmerlischte {action}',
      listOpen: 'ufmache', listClose: 'zuemache',
      hYes: 'Debii ({n})', hNo: 'Nöd debii ({n})', hOpen: 'No kei Antwort ({n})', hSolo: 'Elei debii ({n})', hDuo: 'Zu zwöit debii ({n} Mitglieder, {p} Persone)',
      nobody: 'Niemer', you: '(du)', cancelledTag: 'Abgsait', cancelledLow: 'abgsait', changedLow: 'gänderet',
      timePlace: '{time} Uhr, {place}', atTime: '{time} Uhr', calAdd: 'Im Kaländer spichere', solo: 'Elei', duo: 'Zu zwöit',
      secRules: 'Standard Training', secExtra: 'Extra Training', secUpcoming: 'Trainingsplan verwalte', secEvents: 'Events', secMembers: 'Gruppe',
      addNew: 'Neu erfasse', addClose: 'Erfassig zuemache',
      adminTitle: 'Admin Console', titleCC: 'Chilbi & Chränzli', titleJass: 'Jass-Masters', adminSub: 'Nur für Admins sichtbar', rulesIntro: 'Standard-Trainings pro Wuche',
      weekday: 'Wuchetag', time: 'Uhrziit', place: 'Ort', date: 'Datum', label: 'Bezeichnig',
      phPlaceTraining: 'z. B. Turnhalle Schuelhuus Nord', addRule: 'Trainingstag hinzuefüege',
      edit: 'Bearbeite', remove: 'Entferne', cancel: 'Absäge', reactivate: 'Reaktivierä', del: 'Lösche', save: 'Spichere', dismiss: 'Abbräche', reset: 'Zruggsetze',
      editNote: 'Gilt nur für dä Termin. D Antworte vo de Mitglieder bliibed erhalte.',
      rulesEmpty: 'No kein fester Trainingstag. Tipp uf «+», zum eine z erfasse.',
      extraIntro: 'Die zuesätzliche Trainings sind planet', extraEmpty: 'Kei zuesätzlichi Trainings planet.', extraDefaultTitle: 'Zuesatztraining',
      phPlaceExtra: 'z. B. Sportaalag Süd', addExtra: 'Es wiiters Training hinzuefüege', upcomingEmpty: 'Kei kommendi Trainings.',
      phEventTitle: 'z. B. Fondue-Plausch', phEventPlace: 'z. B. Vereinshuus', addEvent: 'Event hinzuefüege', rsvpRequired: 'Aamäldig erforderlich',
      eventsEmpty: 'No kei Events. Tipp uf «+», zum de erscht z erfasse.',
      membersIntro: 'Tipp bi enere Person uf di drei Pünkt, zum Rolle, Gruppe, PIN, Name oder Handynummere z ändere oder si z lösche. Zahnrad = Admin, Stern = Event-Manager, Glas = Chilbi/Chränzli Manager, Pokal = Jass Manager. Gescht und Friends & Family gseehnd nur igschränkti Inhalt (lueg Gruppe unde).',
      memberAdd: 'Mitglied hinzuefüege', fullName: 'Vor- und Nachname', phone: 'Handynummere',
      memberAddNote: 'S Mitglied meldet sich nur mit de Handynummere aa. De PIN sind di letschte 6 Ziffere.',
      selfAdmin: 'Du bisch Admin. Du chasch dir d Rächt nöd säber entzieh.', revokeAdmin: 'Admin-Rächt entzieh: {name}', makeAdmin: 'Zum Admin mache: {name}',
      adminTag: 'Admin', resetPin: 'PIN zruggsetze',
      profileTitle: 'Mein Profil', nameLabel: 'Name',
      installTitle: 'App installiere', installHint: 'Leg d App uf dä Startbildschirm, denn öffnet si sich im Vollbild.', installBtn: 'Uf em Startbildschirm spichere',
      installIos: 'Tipp z underscht i Safari uf «Teile» und denn uf «Zum Home-Bildschirm». Danach öffnet sich d App im Vollbild.',
      nameChange: 'Name ändere', nameSave: 'Name spichere',
      pinChange: 'PIN ändere', pinIntro: 'Standardmässig sind es di letschte 6 Ziffere vo dinere Handynummere. Wenn du de PIN änderisch, muesch en bim Aamälde igäh.',
      pinNew: 'Neue PIN (6 Ziffere)', pinSave: 'PIN spichere', pinDefault: 'Uf Standard-PIN zruggsetze', logout: 'Abmälde',
      language: 'Sprach', languageHint: 'Wähl d Sprach, i dere du d App bruuche wottsch.', themeTitle: 'Dorstellig', themeHint: 'Wähl, wie d App usgseh söll.', themeLight: 'Häll', themeDark: 'Dunkel', themeAuto: 'Automatisch',
      loginSub: 'App',
      loginLeadReg: 'Erstell dis Konto mit Name, Handynummere und Vereinscode. Din PIN sind di letschte 6 Ziffere vo dinere Handynummere.',
      loginLead: 'Mäld di mit dinere Handynummere aa.', pinOptional: 'PIN (nur nötig, wenn du en gänderet hesch)', clubCode: 'Vereinscode',
      register: 'Konto erstelle', signIn: 'Aamälde', haveAccount: 'Ich han scho es Konto', firstTime: 'Zum erschte Mal da? Konto erstelle',
      setupTitle: 'Iirichtig nötig', setupLead: 'D App isch no nöd mit Supabase verbunde.',
      setupStep1: 'Öffne d Datei <code>config.js</code>.', setupStep2: 'Träg <code>SUPABASE_URL</code> und <code>SUPABASE_ANON_KEY</code> us dim Supabase-Projekt ii.',
      setupStep3: 'Lad d Site neu.', setupNote: 'D genau Aaleitig staht i de Datei README.md.',
      loading: 'Am Lade …',
      errFailed: 'Das hät nöd klappt', respWithdrawn: 'Antwort zruggzoge', youIn: 'Du bisch debii', youOut: 'Du bisch nöd debii', youSolo: 'Du chunsch elei', youDuo: 'Du chunsch zu zwöit',
      phoneCountry: 'Land', phoneOther: 'Anderi (+…)', phoneInvalid: 'Bitte gib e gültigi Handynummere ii, z. B. 079 123 45 67.', alreadyReg: 'Die Nummere isch scho registriert.',
      memberAdded: '{name} isch hinzuegfüegt worde.', addFailed: 'Hinzuefüege nöd möglich: {reason}', unknownError: 'Unbekannte Fähler',
      authInvalid: 'Handynummere oder PIN stimmt nöd. Wenn du din PIN gänderet hesch, träg en im Fäld PIN ii.',
      authAlready: 'Die Nummere isch scho registriert. Bitte mäld di aa.', authCode: 'Registrierig nöd möglich. Bitte prüef de Vereinscode.',
      authRate: 'Zviel Versüech. Bitte wart en Momänt.', authPin: 'De PIN muess us 6 Ziffere bestah.', authFail: 'Aamäldig fählgschlage. Bitte probier s nomal.',
      pinExact: 'De PIN muess us gnau 6 Ziffere bestah.', confirmEmailOff: 'Bitte schalt i Supabase «Confirm email» ab (gsehsch README).',
      loadFail: 'D Date hend nöd chöne glade werde. Isch s Datebank-Schema uusgfüehrt worde?',
      calFile: 'Öffne d Datei «{name}», zum de Termin im Kaländer z spichere.', calFail: 'De Kaländereintrag hät nöd chöne erstellt werde.',
      pinResetOk: 'PIN uf Standard zruggsetzt', pinResetFail: 'De PIN hät nöd chöne zruggsetzt werde.',
      confirmDelRule: 'Dä Trainingstag entferne? Alli kommende Termin vo dere Serie verschwindet.', ruleRemoved: 'Trainingstag entfernt',
      confirmDelExtra: 'Das Training lösche?', extraDeleted: 'Training glöscht',
      confirmDelEvent: 'Dä Event lösche? Au alli Antworte wärded glöscht.', eventDeleted: 'Event glöscht',
      trReactivated: 'Training wieder aktiv', trCancelledMsg: 'Training abgsait', evReactivated: 'Event wieder aktiv', evCancelledMsg: 'Event abgsait',
      changeReset: 'Änderig zruggsetzt', confirmResetPin: 'De PIN vo {name} uf di letschte 6 Ziffere vo de Handynummere zruggsetze?', thisMemberDat: 'däm Mitglied',
      pinReset: 'PIN zruggsetzt', confirmRemove: '{name} entferne? S Konto und alli Antworte wärded glöscht.', thisMember: 'Das Mitglied', memberRemoved: 'Mitglied entfernt',
      adminGranted: 'Admin-Rächt vergäh', adminRevoked: 'Admin-Rächt entzoge', nameSaved: 'Name gspeicheret', pinChanged: 'PIN gänderet', pinChangeFail: 'De PIN hät nöd chöne gänderet werde.',
      ruleAdded: 'Trainingstag hinzuegfüegt', extraAdded: 'Training hinzuegfüegt', eventAdded: 'Event hinzuegfüegt',
      ruleChanged: 'Trainingstag gänderet', trChanged: 'Training gänderet', eventChanged: 'Event gänderet', langSaved: 'Sprach gspeicheret',
      guestTag: 'Gascht', makeGuest: 'Als Gascht festlege: {name}', revokeGuest: 'Gascht-Status entferne: {name}', guestGranted: 'Als Gascht festgleit', guestRevoked: 'Gascht-Status entfernt',
      guestCheck: 'Als Gascht hinzuefüege (gseht nur Trainings und Profil)', guestInfo: 'Du hesch en Gascht-Zuegang. Du gsehsch d Trainings und dis Profil.', supporterInfo: 'Du bisch bi Friends & Family. Du gsehsch d Trainings, de Jass und dis Profil.',
      memberTag: 'Mitglied', emTag: 'Event-Manager', makeEm: 'Zum Event-Manager mache: {name}', revokeEm: 'Event-Manager-Rächt entzieh: {name}', emGranted: 'Als Event-Manager festgleit', emRevoked: 'Event-Manager-Rächt entzoge', confirmGuestLoses: '{name} het Admin-, Event-Manager-, Chilbi Manager-, Chränzli Manager- oder Jass Manager-Rächt. Die Änderig nimmt die Rächt wäg. Wiitermache?', selfMember: 'Du bisch Mitglied. Du chasch di nöd säber zum Gascht mache.', rolesTitle: 'Rolle', emSub: 'Do verwaltisch du d Events.', ccManagerSub: 'C&C verwaltisch im Reiter «C&C».',
      infoShow: 'Erklärig aazeige', infoHide: 'Erklärig verstecke',
      ok: 'OK',
      navCC: 'C&C', ccMembers: 'Mitglieder', ccGuests: 'Gäscht', ccOthers: 'Anderi', ccEmpty: 'No kei Aalässe erfasst.', ccNoDays: 'No kei Täg erfasst.', ccSummary: '{s} Schichte · {r} Rolle', ccLvlAll: 'Chränzli und Chilbi', ccLvlEvent: 'Aalass', ccLvlDay: 'Tag', ccLvlShift: 'Schicht', ccLvlRole: 'Rolle', ccActions: 'Aktione', ccAddEvent: 'Aalass hinzuefüege', ccAddDay: 'Tag hinzuefüege', ccAddShift: 'Schicht hinzuefüege', ccAddRole: 'Rolle hinzuefüege', ccChange: 'Ändere', ccCopy: 'Kopiere', ccClose: 'Schliesse', ccNameOpt: 'Name (freiwillig)', ccStart: 'Start', ccEnd: 'Änd', ccActive: 'Aktiv', ccPersons: 'Verantwortlichi', ccSearch: 'Näme sueche', ccOtherPerson: 'Anderi Person (nöd i de App)', ccAdd: 'Hinzuefüege', ccDidYouMean: 'Meinsch {name}?', ccNobody: 'No niemer', ccConfirmDel: '«{name}» lösche? Alles, wo drunder erfasst isch, wird au glöscht.', ccConfirmDelRole: '«{name}» lösche?', ccCopyEventNote: 'D Kopie isch zerscht inaktiv. Alli Täg wärded um 52 Wuche verschobe, damit d Wuchetäg glich bliibed.', ccCopyDayNote: 'Schichte und Rolle wärded mit de Verantwortliche kopiert.', ccSaved: 'Gspeicheret', ccCopied: 'Kopiert', ccDeleted: 'Glöscht', ccNotInApp: '{name} isch no nöd i de App. Mit de Handynummere chasch d Person als Gascht hinzuefüege.', ccAsGuest: 'Als Gascht hinzuefüege', ccNeedName: 'Gib en Name ii.', ccSetup: 'Für C&C muess s Datebank-Schema aktualisiert wärde (supabase/schema.sql).', grpCandidate: 'Kandidate', candidateTitle: 'Merci vielmal für dis Interässe', candidateMsg: 'Dini Afrog wird vo üsne Administratore gprüeft.', mGroupActive: 'Zum Aktivmitglied mache', mGroupPassive: 'Zum Passivmitglied mache', mGroupGuest: 'Zum Gascht mache', mGroupOther: 'Zu Friends & Family mache', mGroupCandidate: 'Zum Kandidat mache', groupChanged: 'Gruppe gänderet', jsEternal: 'Ewigi Rangliste', jsEternalHint: 'Über die letschte {n} fertige Runde', jsEternalRounds: '{n} Runde', jsEternalRound: '1 Rundi', jsVisibleHint: 'Ohni Häkli gseht nur de Admin und de Jass Manager die Rundi', evEdit: 'Event ändere', evManagePeople: 'Teilnehmer verwalte', grpSupporter: 'Friends & Family', mMakeSupporter: 'Zu Friends & Family mache', supporterSet: 'Als Friends & Family iigordnet', pinLampOk: 'Het de PIN scho gänderet', pinLampNo: 'Bruucht no de Standard-PIN', pinBannerMsg: 'Setz din persönliche PIN-Code, um alli Funktione freizschalte.', pinBannerBtn: 'PIN jetzt setze', ccPublicLabel: 'Sichtbar für alli Aktiv- und Passivmitglieder', ccPublicOn: 'C&C isch jetzt für alli sichtbar (nur zum Lääse)', ccPublicOff: 'C&C isch jetzt wieder nur für Admin, Chilbi Manager und Chränzli Manager sichtbar', ccCopySuffix: 'Kopie', ccPrint: 'PDF teile', jsPrint: 'Jassmasters-Überblick als PDF', ccPdfBuilding: 'PDF wird erstellt…', ccPdfFailed: 'PDF het nöd chönne erstellt werde.',
      mMakeAdmin: 'Zum Admin mache', mRevokeAdmin: 'Admin-Rächt entzieh', mMakeEm: 'Zum Event-Manager mache', mRevokeEm: 'Event-Manager-Rächt entzieh', mMakeGuest: 'Zum Gascht mache', mMakeMember: 'Zum Mitglied mache', mEdit: 'Name und Handynummere ändere', mEditNote: 'Mit enere neue Handynummere gilt wieder de Standard-PIN: di letschte 6 Ziffere vo de neue Nummere.', mSaved: 'Gspeicheret', mDelete: 'Mitglied lösche', mPhoneTaken: 'Die Handynummere ghört scho öpper anderem.',
      navJass: 'Jass', jsParticipants: 'Teilnehmer', jsSchedule: 'Spielplan', jsRanking: 'Tagesrangliste', jsRound: 'Rundi {n}', jsTable: 'Tisch {t}', jsTeam1: 'Team I', jsTeam2: 'Team II', jsPlayer: 'Spieler {n}', jsFree: 'frei', jsEmpty: 'No kei Jassmasters erfasst.', jsNoDays: 'No kei Datum erfasst.', jsAddSeries: 'Jassmasters hinzuefüege', jsAddDay: 'Datum hinzuefüege', jsLvlSeries: 'Jassmasters', jsLvlDay: 'Jasstag', jsPick: 'Spieler {n} uswähle', jsClear: 'Platz freigäh', jsAlready: 'scho Spieler {n}', jsPoints: 'Pünkt', jsGames: '{n} Spiel', jsPtsAbbr: 'Pkt.', jsGame: '{n} Spiel', jsNoPoints: 'No kei Pünkt erfasst.', jsHint: 'Träg d Pünkt bim Siegerteam ii. S ander Team überchunnt si automatisch negativ.', jsSetup: 'Für Jass muess s Datebank-Schema aktualisiert wärde (supabase/schema.sql).', jsFinish: 'Jassmaster abschliesse', jsConfirmFinish: '«{name}» abschliesse? Chunt under Vergangeni Jassmasters und isch denn nur no als Rangliste sichtbar. Wiitermache?', jsFinished: 'Als abgschlosse markiert', jsEditRanking: 'Rangliste bearbeite', jsRankName: 'Name', jsRankPoints: 'Pünkt', jsAddRow: 'Zile dezuefüege', jsNoRows: 'No niemer erfasst.',
      jmTag: 'Jass Manager', mMakeJm: 'Zum Jass Manager mache', mRevokeJm: 'Jass Manager-Rächt wäg nää', jmGranted: 'Als Jass Manager festgleit', jmRevoked: 'Jass Manager-Rächt wäggnoh', cmTag: 'Chilbi Manager', crmTag: 'Chränzli Manager', mMakeCm: 'Zum Chilbi Manager mache', mRevokeCm: 'Chilbi Manager-Rächt wäg nää', mMakeCrm: 'Zum Chränzli Manager mache', mRevokeCrm: 'Chränzli Manager-Rächt wäg nää', cmGranted: 'Als Chilbi Manager festgleit', cmRevoked: 'Chilbi Manager-Rächt wäggnoh', crmGranted: 'Als Chränzli Manager festgleit', crmRevoked: 'Chränzli Manager-Rächt wäggnoh', grpActive: 'Aktivmitglieder', grpPassive: 'Passivmitglieder', mMakePassive: 'Zum Passivmitglied mache', mMakeActive: 'Zum Aktivmitglied mache', passiveSet: 'Als Passivmitglied festgleit', activeSet: 'Als Aktivmitglied festgleit', jsUpcoming: 'Aastaahts Jassmaster', jsPast: 'Vergangeni Jassmasters'
    },


    uk: {
      wd0: 'Неділя', wd1: 'Понеділок', wd2: 'Вівторок', wd3: 'Середа', wd4: 'Четвер', wd5: 'П’ятниця', wd6: 'Субота',
      navTrainings: 'Тренування', navEvents: 'Події', navAdmin: 'Admin', navProfile: 'Профіль',
      titleTrainings: 'Trainingsplan', titleEvents: 'Vereinsanlässe',
      subTrainings: 'Найближчі {n} занять', subEvents: 'Заплановані заходи клубу', moreDates: 'Інші дати ({n})',
      emptyTrTitle: 'Тренувань поки не заплановано.', emptyTrAdmin: 'Встановіть день тренування в розділі «Керування».', emptyTrMember: 'Дні тренувань визначають адміністратори.',
      emptyEvTitle: 'Наразі подій не заплановано.', emptyEvAdmin: 'Створіть подію в розділі «Керування».', emptyEvMember: 'Нові події створюють адміністратори.',
      trainingWord: 'Тренування', trCancelled: 'Тренування скасовано', yes: 'Буду', no: 'Не буду', participants: 'Учасники',
      ariaTr: '{yes} учасників, {no} не буде. {action} список учасників', ariaEv: '{n} учасників. {action} список учасників',
      listOpen: 'Відкрити', listClose: 'Закрити',
      hYes: 'Будуть ({n})', hNo: 'Не будуть ({n})', hOpen: 'Ще немає відповіді ({n})', hSolo: 'Самі ({n})', hDuo: 'Удвох ({n} учасників, {p} осіб)',
      nobody: 'Нікого', you: '(ви)', cancelledTag: 'Скасовано', cancelledLow: 'скасовано', changedLow: 'змінено',
      timePlace: '{time}, {place}', atTime: '{time}', calAdd: 'Додати до календаря', solo: 'Сам(а)', duo: 'Удвох',
      secRules: 'Стандартне тренування', secExtra: 'Додаткове тренування', secUpcoming: 'Керувати розкладом тренувань', secEvents: 'Події', secMembers: 'Групи',
      addNew: 'Додати', addClose: 'Закрити форму',
      adminTitle: 'Admin Console', titleCC: 'Chilbi & Chränzli', titleJass: 'Jass-Masters', adminSub: 'Видно лише адміністраторам', rulesIntro: 'Стандартні тренування щотижня',
      weekday: 'День тижня', time: 'Час', place: 'Місце', date: 'Дата', label: 'Назва',
      phPlaceTraining: 'напр. спортзал школи «Північ»', addRule: 'Додати день тренування',
      edit: 'Редагувати', remove: 'Прибрати', cancel: 'Скасувати', reactivate: 'Відновити', del: 'Видалити', save: 'Зберегти', dismiss: 'Відміна', reset: 'Скинути',
      editNote: 'Діє лише для цієї дати. Відповіді учасників зберігаються.',
      rulesEmpty: 'Постійного дня тренування ще немає. Натисніть «+», щоб додати.',
      extraIntro: 'Заплановані додаткові тренування', extraEmpty: 'Додаткових тренувань не заплановано.', extraDefaultTitle: 'Додаткове тренування',
      phPlaceExtra: 'напр. спортивний комплекс «Південь»', addExtra: 'Додати тренування', upcomingEmpty: 'Найближчих тренувань немає.',
      phEventTitle: 'напр. вечір фондю', phEventPlace: 'напр. клубний будинок', addEvent: 'Додати подію', rsvpRequired: 'Реєстрація обов\'язкова',
      eventsEmpty: 'Подій ще немає. Натисніть «+», щоб додати першу.',
      membersIntro: 'Натисніть три крапки біля людини, щоб змінити ролі, групу, PIN, ім’я чи номер, або видалити її. Шестерня = адмін, зірка = Event-Manager, келих = Chilbi/Chränzli Manager, кубок = Jass Manager. Гості та Friends & Family бачать лише обмежений вміст (див. групи нижче).',
      memberAdd: 'Додати учасника', fullName: 'Ім’я та прізвище', phone: 'Номер мобільного',
      memberAddNote: 'Учасник входить лише за номером мобільного. PIN — останні 6 цифр.',
      selfAdmin: 'Ви адміністратор. Ви не можете забрати права в себе самі.', revokeAdmin: 'Забрати права адміністратора: {name}', makeAdmin: 'Призначити адміністратором: {name}',
      adminTag: 'Адмін', resetPin: 'Скинути PIN',
      profileTitle: 'Mein Profil', nameLabel: 'Ім’я',
      installTitle: 'Встановити застосунок', installHint: 'Додайте застосунок на головний екран, і він відкриватиметься на весь екран.', installBtn: 'Додати на головний екран',
      installIos: 'У Safari натисніть внизу «Поділитися», потім «На початковий екран». Після цього застосунок відкриватиметься на весь екран.',
      nameChange: 'Змінити ім’я', nameSave: 'Зберегти ім’я',
      pinChange: 'Змінити PIN', pinIntro: 'За замовчуванням це останні 6 цифр вашого номера мобільного. Якщо ви змінюєте PIN, його потрібно вводити під час входу.',
      pinNew: 'Новий PIN (6 цифр)', pinSave: 'Зберегти PIN', pinDefault: 'Повернути PIN за замовчуванням', logout: 'Вийти',
      language: 'Мова', languageHint: 'Оберіть мову, якою ви хочете користуватися застосунком.', themeTitle: 'Вигляд', themeHint: 'Вибери, як має виглядати застосунок.', themeLight: 'Світла', themeDark: 'Темна', themeAuto: 'Автоматично',
      loginSub: 'App',
      loginLeadReg: 'Створіть обліковий запис, вказавши ім’я, номер мобільного та код клубу. Ваш PIN — останні 6 цифр номера мобільного.',
      loginLead: 'Увійдіть за номером мобільного.', pinOptional: 'PIN (потрібен, лише якщо ви його змінювали)', clubCode: 'Код клубу',
      register: 'Створити обліковий запис', signIn: 'Увійти', haveAccount: 'У мене вже є обліковий запис', firstTime: 'Вперше тут? Створіть обліковий запис',
      setupTitle: 'Потрібне налаштування', setupLead: 'Застосунок ще не підключено до Supabase.',
      setupStep1: 'Відкрийте файл <code>config.js</code>.', setupStep2: 'Внесіть <code>SUPABASE_URL</code> і <code>SUPABASE_ANON_KEY</code> зі свого проєкту Supabase.',
      setupStep3: 'Оновіть сторінку.', setupNote: 'Детальна інструкція є у файлі README.md.',
      loading: 'Завантаження …',
      errFailed: 'Не вдалося', respWithdrawn: 'Відповідь скасовано', youIn: 'Ви будете', youOut: 'Ви не будете', youSolo: 'Ви прийдете самі', youDuo: 'Ви прийдете удвох',
      phoneCountry: 'Країна', phoneOther: 'Інша (+…)', phoneInvalid: 'Введіть дійсний номер мобільного, напр. 079 123 45 67.', alreadyReg: 'Цей номер уже зареєстровано.',
      memberAdded: '{name} додано.', addFailed: 'Не вдалося додати: {reason}', unknownError: 'Невідома помилка',
      authInvalid: 'Номер мобільного або PIN неправильні. Якщо ви змінювали PIN, введіть його в полі PIN.',
      authAlready: 'Цей номер уже зареєстровано. Будь ласка, увійдіть.', authCode: 'Реєстрація неможлива. Перевірте код клубу.',
      authRate: 'Забагато спроб. Зачекайте хвилинку.', authPin: 'PIN має складатися з 6 цифр.', authFail: 'Не вдалося увійти. Спробуйте ще раз.',
      pinExact: 'PIN має складатися рівно з 6 цифр.', confirmEmailOff: 'Вимкніть у Supabase «Confirm email» (див. README).',
      loadFail: 'Не вдалося завантажити дані. Чи було виконано схему бази даних?',
      calFile: 'Відкрийте файл «{name}», щоб зберегти подію в календарі.', calFail: 'Не вдалося створити запис у календарі.',
      pinResetOk: 'PIN повернено до значення за замовчуванням', pinResetFail: 'Не вдалося скинути PIN.',
      confirmDelRule: 'Прибрати цей день тренування? Усі майбутні дати серії зникнуть.', ruleRemoved: 'День тренування прибрано',
      confirmDelExtra: 'Видалити це тренування?', extraDeleted: 'Тренування видалено',
      confirmDelEvent: 'Видалити цю подію? Усі відповіді також буде видалено.', eventDeleted: 'Подію видалено',
      trReactivated: 'Тренування знову активне', trCancelledMsg: 'Тренування скасовано', evReactivated: 'Подія знову активна', evCancelledMsg: 'Подію скасовано',
      changeReset: 'Зміну скинуто', confirmResetPin: 'Повернути PIN користувача {name} до останніх 6 цифр номера мобільного?', thisMemberDat: 'цього учасника',
      pinReset: 'PIN скинуто', confirmRemove: 'Видалити {name}? Обліковий запис і всі відповіді буде видалено.', thisMember: 'Цей учасник', memberRemoved: 'Учасника видалено',
      adminGranted: 'Права адміністратора надано', adminRevoked: 'Права адміністратора забрано', nameSaved: 'Ім’я збережено', pinChanged: 'PIN змінено', pinChangeFail: 'Не вдалося змінити PIN.',
      ruleAdded: 'День тренування додано', extraAdded: 'Тренування додано', eventAdded: 'Подію додано',
      ruleChanged: 'День тренування змінено', trChanged: 'Тренування змінено', eventChanged: 'Подію змінено', langSaved: 'Мову збережено',
      guestTag: 'Гість', makeGuest: 'Призначити гостем: {name}', revokeGuest: 'Забрати статус гостя: {name}', guestGranted: 'Призначено гостем', guestRevoked: 'Статус гостя знято',
      guestCheck: 'Додати як гостя (бачить лише тренування та профіль)', guestInfo: 'У вас гостьовий доступ. Ви бачите тренування та свій профіль.', supporterInfo: 'Ти в групі Friends & Family. Ти бачиш тренування, Джас і свій профіль.',
      memberTag: 'Член клубу', emTag: 'Менеджер подій', makeEm: 'Призначити менеджером подій: {name}', revokeEm: 'Забрати права менеджера подій: {name}', emGranted: 'Призначено менеджером подій', emRevoked: 'Права менеджера подій забрано', confirmGuestLoses: '{name} має права Admin, Event-Manager, Chilbi Manager, Chränzli Manager або Jass Manager. Ця зміна забере ці права. Продовжити?', selfMember: 'Ви член клубу. Ви не можете призначити себе гостем.', rolesTitle: 'Ролі', emSub: 'Тут ви керуєте подіями.', ccManagerSub: 'C&C керуєш у вкладці «C&C».',
      infoShow: 'Показати пояснення', infoHide: 'Сховати пояснення',
      ok: 'OK',
      navCC: 'C&C', ccMembers: 'Члени клубу', ccGuests: 'Гості', ccOthers: 'Інші', ccEmpty: 'Заходів ще немає.', ccNoDays: 'Днів ще немає.', ccSummary: 'Змін: {s} · ролей: {r}', ccLvlAll: 'Chränzli і Chilbi', ccLvlEvent: 'Захід', ccLvlDay: 'День', ccLvlShift: 'Зміна', ccLvlRole: 'Роль', ccActions: 'Дії', ccAddEvent: 'Додати захід', ccAddDay: 'Додати день', ccAddShift: 'Додати зміну', ccAddRole: 'Додати роль', ccChange: 'Змінити', ccCopy: 'Копіювати', ccClose: 'Закрити', ccNameOpt: 'Назва (необов’язково)', ccStart: 'Початок', ccEnd: 'Кінець', ccActive: 'Активний', ccPersons: 'Відповідальні', ccSearch: 'Пошук імен', ccOtherPerson: 'Інша особа (не в застосунку)', ccAdd: 'Додати', ccDidYouMean: 'Можливо, {name}?', ccNobody: 'Ще нікого', ccConfirmDel: 'Видалити «{name}»? Усе, що в ньому, також буде видалено.', ccConfirmDelRole: 'Видалити «{name}»?', ccCopyEventNote: 'Копія спочатку неактивна. Усі дні зсуваються на 52 тижні, щоб дні тижня збігалися.', ccCopyDayNote: 'Зміни й ролі копіюються разом із відповідальними.', ccSaved: 'Збережено', ccCopied: 'Скопійовано', ccDeleted: 'Видалено', ccNotInApp: '{name} ще немає в застосунку. За номером мобільного можна додати цю особу як гостя.', ccAsGuest: 'Додати як гостя', ccNeedName: 'Введіть ім’я.', ccSetup: 'Для C&C потрібно оновити схему бази даних (supabase/schema.sql).', grpCandidate: 'Кандидати', candidateTitle: 'Щиро дякуємо за твій інтерес', candidateMsg: 'Твій запит розглядають наші адміністратори.', mGroupActive: 'Зробити активним членом', mGroupPassive: 'Зробити пасивним членом', mGroupGuest: 'Зробити гостем', mGroupOther: 'Перевести у Friends & Family', mGroupCandidate: 'Зробити кандидатом', groupChanged: 'Групу змінено', jsEternal: 'Вічний рейтинг', jsEternalHint: 'За останні {n} завершених раундів', jsEternalRounds: '{n} раундів', jsEternalRound: '1 раунд', jsVisibleHint: 'Без позначки цей раунд бачать лише Admin і Jass Manager', evEdit: 'Змінити подію', evManagePeople: 'Керувати учасниками', grpSupporter: 'Friends & Family', mMakeSupporter: 'Перевести у Friends & Family', supporterSet: 'Віднесено до Friends & Family', pinLampOk: 'Вже змінив(ла) PIN-код', pinLampNo: 'Ще користується стандартним PIN-кодом', pinBannerMsg: 'Будь ласка, встанови свій особистий PIN-код, щоб розблокувати всі функції.', pinBannerBtn: 'Встановити PIN', ccPublicLabel: 'Видно всім активним і пасивним членам', ccPublicOn: 'C&C тепер видно всім (лише перегляд)', ccPublicOff: 'C&C знову видно лише Admin, Chilbi Manager і Chränzli Manager', ccCopySuffix: 'копія', ccPrint: 'Поділитися PDF', jsPrint: 'Огляд Jassmasters як PDF', ccPdfBuilding: 'Створення PDF…', ccPdfFailed: 'Не вдалося створити PDF.',
      mMakeAdmin: 'Призначити адміністратором', mRevokeAdmin: 'Забрати права адміністратора', mMakeEm: 'Призначити менеджером подій', mRevokeEm: 'Забрати права менеджера подій', mMakeGuest: 'Зробити гостем', mMakeMember: 'Зробити членом клубу', mEdit: 'Змінити ім’я та номер мобільного', mEditNote: 'З новим номером знову діє PIN за замовчуванням: останні 6 цифр нового номера.', mSaved: 'Збережено', mDelete: 'Видалити учасника', mPhoneTaken: 'Цей номер мобільного вже належить іншій особі.',
      navJass: 'Джас', jsParticipants: 'Учасники', jsSchedule: 'Розклад ігор', jsRanking: 'Рейтинг дня', jsRound: 'Раунд {n}', jsTable: 'Стіл {t}', jsTeam1: 'Команда I', jsTeam2: 'Команда II', jsPlayer: 'Гравець {n}', jsFree: 'вільно', jsEmpty: 'Jassmasters ще немає.', jsNoDays: 'Дати ще немає.', jsAddSeries: 'Додати Jassmasters', jsAddDay: 'Додати дату', jsLvlSeries: 'Jassmasters', jsLvlDay: 'День джасу', jsPick: 'Вибрати гравця {n}', jsClear: 'Звільнити місце', jsAlready: 'уже гравець {n}', jsPoints: 'Очки', jsGames: 'Ігор: {n}', jsPtsAbbr: 'очк.', jsGame: 'Ігор: {n}', jsNoPoints: 'Очок ще немає.', jsHint: 'Вкажіть очки команди-переможця. Інша команда автоматично отримує їх зі знаком мінус.', jsSetup: 'Для джасу потрібно оновити схему бази даних (supabase/schema.sql).', jsFinish: 'Завершити Jassmaster', jsConfirmFinish: 'Завершити «{name}»? Його буде переміщено до минулих Jassmasters і надалі буде видно лише рейтинг. Продовжити?', jsFinished: 'Позначено як завершене', jsEditRanking: 'Редагувати рейтинг', jsRankName: 'Ім\'я', jsRankPoints: 'Очки', jsAddRow: 'Додати рядок', jsNoRows: 'Ще нікого не додано.',
      jmTag: 'Менеджер Jass', mMakeJm: 'Призначити менеджером Jass', mRevokeJm: 'Скасувати права менеджера Jass', jmGranted: 'Призначено менеджером Jass', jmRevoked: 'Права менеджера Jass скасовано', cmTag: 'Менеджер Chilbi', crmTag: 'Менеджер Chränzli', mMakeCm: 'Призначити менеджером Chilbi', mRevokeCm: 'Скасувати права менеджера Chilbi', mMakeCrm: 'Призначити менеджером Chränzli', mRevokeCrm: 'Скасувати права менеджера Chränzli', cmGranted: 'Призначено менеджером Chilbi', cmRevoked: 'Права менеджера Chilbi скасовано', crmGranted: 'Призначено менеджером Chränzli', crmRevoked: 'Права менеджера Chränzli скасовано', grpActive: 'Активні члени', grpPassive: 'Пасивні члени', mMakePassive: 'Зробити пасивним членом', mMakeActive: 'Зробити активним членом', passiveSet: 'Призначено пасивним членом', activeSet: 'Призначено активним членом', jsUpcoming: 'Майбутній Jassmaster', jsPast: 'Минулі Jassmasters'
    },

    bar: {
      wd0: 'Sunda', wd1: 'Mondog', wd2: 'Irda', wd3: 'Migga', wd4: 'Pfinzda', wd5: 'Freida', wd6: 'Samsda',
      navTrainings: 'Trainings', navEvents: 'Events', navAdmin: 'Admin', navProfile: 'Profil',
      titleTrainings: 'Trainingsplan', titleEvents: 'Vereinsanlässe',
      subTrainings: 'De nächstn {n} Termine', subEvents: 'De Vereinsveranstoitungen, de gplant san', moreDates: 'Weitere Termine ({n})',
      emptyTrTitle: 'Es san no koane Trainings gplant.', emptyTrAdmin: 'Leg im Bereich «Verwoitn» an Trainingstag fest.', emptyTrMember: 'De Admins legn de Trainingstag fest.',
      emptyEvTitle: 'Im Moment san koane Events gplant.', emptyEvAdmin: 'Leg im Bereich «Verwoitn» an Event o.', emptyEvMember: 'De Admins legn neie Events o.',
      trainingWord: 'Training', trCancelled: 'Training abgsogt', yes: 'Dabei', no: 'Ned dabei', participants: 'Teilnehmer',
      ariaTr: '{yes} Teilnehmer, {no} ned dabei. Teilnehmerlistn {action}', ariaEv: '{n} Teilnehmer. Teilnehmerlistn {action}',
      listOpen: 'aufmachn', listClose: 'zumachn',
      hYes: 'Dabei ({n})', hNo: 'Ned dabei ({n})', hOpen: 'No koa Antwort ({n})', hSolo: 'Alloa dabei ({n})', hDuo: 'Zu zweit dabei ({n} Mitglieder, {p} Leit)',
      nobody: 'Koaner', you: '(du)', cancelledTag: 'Abgsogt', cancelledLow: 'abgsogt', changedLow: 'gändert',
      timePlace: '{time} Uhr, {place}', atTime: '{time} Uhr', calAdd: 'Im Kalenda speichan', solo: 'Alloa', duo: 'Zu zweit',
      secRules: 'Standard Training', secExtra: 'Extra Training', secUpcoming: 'Trainingsplan vawoitn', secEvents: 'Events', secMembers: 'Gruppn',
      addNew: 'Neu erfassn', addClose: 'Erfassung zumachn',
      adminTitle: 'Admin Console', titleCC: 'Chilbi & Chränzli', titleJass: 'Jass-Masters', adminSub: 'Bloß für Admins sichtbar', rulesIntro: 'Standard-Trainings pro Woch',
      weekday: 'Wochentag', time: 'Uhrzeit', place: 'Ort', date: 'Datum', label: 'Bezeichnung',
      phPlaceTraining: 'z. B. Turnhalle Schulhaus Nord', addRule: 'Trainingstag dazuadoa',
      edit: 'Bearbeitn', remove: 'Wegdoa', cancel: 'Absagn', reactivate: 'Wieda aktivieren', del: 'Löschn', save: 'Speichan', dismiss: 'Abbrecha', reset: 'Zruckstelln',
      editNote: 'Gilt bloß für den Termin. De Antwortn vo de Mitglieder bleibn erhaltn.',
      rulesEmpty: 'No koa fester Trainingstag. Tipp auf «+», um oan z erfassn.',
      extraIntro: 'De zusätzlichn Trainings san gplant', extraEmpty: 'Koane zusätzlichn Trainings gplant.', extraDefaultTitle: 'Zusatztraining',
      phPlaceExtra: 'z. B. Sportanlage Süd', addExtra: 'A weiters Training dazuadoa', upcomingEmpty: 'Koane kemmandn Trainings.',
      phEventTitle: 'z. B. Fondue-Abend', phEventPlace: 'z. B. Vereinsheim', addEvent: 'Event dazuadoa', rsvpRequired: 'Anmeldung erforderlich',
      eventsEmpty: 'No koane Events. Tipp auf «+», um den erstn z erfassn.',
      membersIntro: 'Tipp bei ana Person auf de drei Punkt, um Rolln, Gruppn, PIN, Nama oder Handynummer z ändern oder sie z löschn. Zahnradl = Admin, Stern = Event-Manager, Glasl = Chilbi/Chränzli Manager, Pokal = Jass Manager. Gäst und Friends & Family segn nur eigschränkte Inhoit (schau Gruppn untn).',
      memberAdd: 'Mitglied dazuadoa', fullName: 'Vor- und Nachname', phone: 'Handynummer',
      memberAddNote: 'Des Mitglied meldt se bloß mit da Handynummer o. Da PIN san de letztn 6 Ziffern.',
      selfAdmin: 'Du bist Admin. Du konnst da d Rechte ned söiba entziehn.', revokeAdmin: 'Admin-Rechte entziehn: {name}', makeAdmin: 'Zum Admin macha: {name}',
      adminTag: 'Admin', resetPin: 'PIN zruckstelln',
      profileTitle: 'Mein Profil', nameLabel: 'Name',
      installTitle: 'App installiern', installHint: 'Leg d App auf dein Startbildschirm, nacha geht s im Vollbild auf.', installBtn: 'Auf m Startbildschirm speichan',
      installIos: 'Tipp unten in Safari auf «Teilen» und nacha auf «Zum Home-Bildschirm». Danach geht d App im Vollbild auf.',
      nameChange: 'Name ändern', nameSave: 'Name speichan',
      pinChange: 'PIN ändern', pinIntro: 'Standardmäßig san s de letztn 6 Ziffern vo deiner Handynummer. Wennst den PIN änderst, muasst eam beim Anmelden eigebn.',
      pinNew: 'Neier PIN (6 Ziffern)', pinSave: 'PIN speichan', pinDefault: 'Auf Standard-PIN zruckstelln', logout: 'Abmelden',
      language: 'Sprach', languageHint: 'Such da d Sprach aus, in dera du d App benutzn mogst.', themeTitle: 'Darstejlung', themeHint: 'Wähl aus, wia de App ausschaugn soi.', themeLight: 'Hej', themeDark: 'Dunkel', themeAuto: 'Automatisch',
      loginSub: 'App',
      loginLeadReg: 'Leg dein Konto o mit Name, Handynummer und Vereinscode. Dei PIN san de letztn 6 Ziffern vo deiner Handynummer.',
      loginLead: 'Meld di mit deiner Handynummer o.', pinOptional: 'PIN (bloß nötig, wennst n gändert host)', clubCode: 'Vereinscode',
      register: 'Konto anlegn', signIn: 'Anmelden', haveAccount: 'I hob scho a Konto', firstTime: 'Des erste Mal do? Konto anlegn',
      setupTitle: 'Einrichtung nötig', setupLead: 'D App is no ned mit Supabase verbundn.',
      setupStep1: 'Mach de Datei <code>config.js</code> auf.', setupStep2: 'Trag <code>SUPABASE_URL</code> und <code>SUPABASE_ANON_KEY</code> aus deim Supabase-Projekt ei.',
      setupStep3: 'Lad d Seitn neu.', setupNote: 'De genaue Anleitung steht in da Datei README.md.',
      loading: 'Lädt …',
      errFailed: 'Des hod ned gfunktioniert', respWithdrawn: 'Antwort zruckzogn', youIn: 'Du bist dabei', youOut: 'Du bist ned dabei', youSolo: 'Du kimmst alloa', youDuo: 'Du kimmst zu zweit',
      phoneCountry: 'Land', phoneOther: 'Andere (+…)', phoneInvalid: 'Bitte gib a gültige Handynummer ei, z. B. 079 123 45 67.', alreadyReg: 'De Nummer is scho registriert.',
      memberAdded: '{name} is dazuakemma.', addFailed: 'Dazuadoa ned möglich: {reason}', unknownError: 'Unbekannter Fehler',
      authInvalid: 'Handynummer oder PIN stimmt ned. Wennst dein PIN gändert host, trag eam im Feld PIN ei.',
      authAlready: 'De Nummer is scho registriert. Bitte meld di o.', authCode: 'Registrierung ned möglich. Bitte prüf den Vereinscode.',
      authRate: 'Zvui Versuche. Bitte wart an Moment.', authPin: 'Da PIN muass aus 6 Ziffern bestehn.', authFail: 'Anmeldung gscheitert. Bitte probier s no amoi.',
      pinExact: 'Da PIN muass aus genau 6 Ziffern bestehn.', confirmEmailOff: 'Bitte schalt in Supabase «Confirm email» aus (siehe README).',
      loadFail: 'D Daten hamma ned laden kinna. Is s Datenbank-Schema ausgführt worn?',
      calFile: 'Mach de Datei «{name}» auf, um den Termin im Kalenda z speichan.', calFail: 'Da Kalendereintrag hod ned erstellt werdn kinna.',
      pinResetOk: 'PIN auf Standard zruckgstellt', pinResetFail: 'Da PIN hod ned zruckgstellt werdn kinna.',
      confirmDelRule: 'Den Trainingstag entfernen? Alle kemmandn Termine vo da Serie verschwindn.', ruleRemoved: 'Trainingstag entfernt',
      confirmDelExtra: 'Des Training löschn?', extraDeleted: 'Training glöscht',
      confirmDelEvent: 'Den Event löschn? Aa olle Antwortn wern glöscht.', eventDeleted: 'Event glöscht',
      trReactivated: 'Training wieda aktiv', trCancelledMsg: 'Training abgsogt', evReactivated: 'Event wieda aktiv', evCancelledMsg: 'Event abgsogt',
      changeReset: 'Änderung zruckgsetzt', confirmResetPin: 'Den PIN vo {name} auf de letztn 6 Ziffern vo da Handynummer zruckstelln?', thisMemberDat: 'dem Mitglied',
      pinReset: 'PIN zruckgstellt', confirmRemove: '{name} entfernen? Des Konto und olle Antwortn wern glöscht.', thisMember: 'Des Mitglied', memberRemoved: 'Mitglied entfernt',
      adminGranted: 'Admin-Rechte vagebn', adminRevoked: 'Admin-Rechte entzogn', nameSaved: 'Name gspeichert', pinChanged: 'PIN gändert', pinChangeFail: 'Da PIN hod ned gändert werdn kinna.',
      ruleAdded: 'Trainingstag dazuakemma', extraAdded: 'Training dazuakemma', eventAdded: 'Event dazuakemma',
      ruleChanged: 'Trainingstag gändert', trChanged: 'Training gändert', eventChanged: 'Event gändert', langSaved: 'Sprach gspeichert',
      guestTag: 'Gast', makeGuest: 'Als Gast festlegn: {name}', revokeGuest: 'Gast-Status entfernen: {name}', guestGranted: 'Als Gast festgelegt', guestRevoked: 'Gast-Status entfernt',
      guestCheck: 'Als Gast dazuadoa (sicht bloß Trainings und Profil)', guestInfo: 'Du hast an Gast-Zugang. Du siehst de Trainings und dei Profil.', supporterInfo: 'Du bist bei Friends & Family. Du siehgst de Trainings, \'s Jass und dei Profil.',
      memberTag: 'Mitglied', emTag: 'Event-Manager', makeEm: 'Zum Event-Manager macha: {name}', revokeEm: 'Event-Manager-Rechte entziehn: {name}', emGranted: 'Als Event-Manager festgelegt', emRevoked: 'Event-Manager-Rechte entzogn', confirmGuestLoses: 'Da {name} hod Admin-, Event-Manager-, Chilbi Manager-, Chränzli Manager- oda Jass Manager-Rechte. Dej Änderung nimmt eam de Rechte weg. Weitamacha?', selfMember: 'Du bist Mitglied. Du konnst di ned söiba zum Gast macha.', rolesTitle: 'Rollen', emSub: 'Do verwoitst du de Events.', ccManagerSub: 'C&C vawoitst in da Reitn «C&C».',
      infoShow: 'Erklärung anzoagn', infoHide: 'Erklärung wegdoa',
      ok: 'OK',
      navCC: 'C&C', ccMembers: 'Mitglieder', ccGuests: 'Gäst', ccOthers: 'Andere', ccEmpty: 'No koane Veranstoitungen.', ccNoDays: 'No koane Tog.', ccSummary: '{s} Schichtn · {r} Rolln', ccLvlAll: 'Chränzli und Chilbi', ccLvlEvent: 'Veranstoitung', ccLvlDay: 'Tog', ccLvlShift: 'Schicht', ccLvlRole: 'Rolle', ccActions: 'Aktionen', ccAddEvent: 'Veranstoitung dazuadoa', ccAddDay: 'Tog dazuadoa', ccAddShift: 'Schicht dazuadoa', ccAddRole: 'Rolle dazuadoa', ccChange: 'Ändern', ccCopy: 'Kopiern', ccClose: 'Zumachn', ccNameOpt: 'Nama (freiwillig)', ccStart: 'Ofang', ccEnd: 'End', ccActive: 'Aktiv', ccPersons: 'Verantwortliche', ccSearch: 'Nama suacha', ccOtherPerson: 'Andere Person (ned in da App)', ccAdd: 'Dazuadoa', ccDidYouMean: 'Moanst du {name}?', ccNobody: 'No koana', ccConfirmDel: '«{name}» löschn? Ois, wos drunter erfasst is, werd aa glöscht.', ccConfirmDelRole: '«{name}» löschn?', ccCopyEventNote: 'De Kopie is zerst inaktiv. Olle Tog wern um 52 Wochn verschobn, damit de Wochentog gleich bleibn.', ccCopyDayNote: 'Schichtn und Rolln wern mit de Verantwortlichn kopiert.', ccSaved: 'Gspeichert', ccCopied: 'Kopiert', ccDeleted: 'Glöscht', ccNotInApp: '{name} is no ned in da App. Mit da Handynummer konnst de Person ois Gast dazuadoa.', ccAsGuest: 'Ois Gast dazuadoa', ccNeedName: 'Gib an Nama ei.', ccSetup: 'Für C&C muass s Datenbank-Schema aktualisiert wern (supabase/schema.sql).', grpCandidate: 'Kandidaten', candidateTitle: 'Vergejt\'s Good fia dei Interesse', candidateMsg: 'Dei Åfroog werd vo unsane Administratorn gschaugt.', mGroupActive: 'Zum Aktivmitglied mocha', mGroupPassive: 'Zum Passivmitglied mocha', mGroupGuest: 'Zum Gost mocha', mGroupOther: 'Zu Friends & Family mocha', mGroupCandidate: 'Zum Kandidat mocha', groupChanged: 'Gruppn gändat', jsEternal: 'Ewige Rangliste', jsEternalHint: 'Übas de letztn {n} fertign Rundn', jsEternalRounds: '{n} Rundn', jsEternalRound: '1 Rund', jsVisibleHint: 'Ohne\'s Häkerl siehgt des nur da Admin und da Jass Manager', evEdit: 'Event ändan', evManagePeople: 'Teilnehma vawoitn', grpSupporter: 'Friends & Family', mMakeSupporter: 'Zu Friends & Family mocha', supporterSet: 'Als Friends & Family eigordnet', pinLampOk: 'Hod sein PIN scho gändat', pinLampNo: 'Nutzt no den Standard-PIN', pinBannerMsg: 'Bitte setz deinen persönlichn PIN-Code, um olle Funktionen freizschoitn.', pinBannerBtn: 'PIN jetzt setzn', ccPublicLabel: 'Sichtbar fia ale Aktiv- und Passivmitglieda', ccPublicOn: 'C&C is jetzt fia ale sichtbar (nur zum Lesn)', ccPublicOff: 'C&C is jetzt wieda nur fia Admin, Chilbi Manager und Chränzli Manager sichtbar', ccCopySuffix: 'Kopie', ccPrint: 'PDF teiln', jsPrint: 'Jassmasters-Überblick als PDF', ccPdfBuilding: 'PDF werd erstejt…', ccPdfFailed: 'PDF håt ned erstejt wean kinna.',
      mMakeAdmin: 'Zum Admin macha', mRevokeAdmin: 'Admin-Rechte entziehn', mMakeEm: 'Zum Event-Manager macha', mRevokeEm: 'Event-Manager-Rechte entziehn', mMakeGuest: 'Zum Gast macha', mMakeMember: 'Zum Mitglied macha', mEdit: 'Nama und Handynummer ändern', mEditNote: 'Mit ana neia Handynummer gilt wieda da Standard-PIN: de letztn 6 Ziffern vo da neia Nummer.', mSaved: 'Gspeichert', mDelete: 'Mitglied löschn', mPhoneTaken: 'De Handynummer ghört scho wem andern.',
      navJass: 'Jass', jsParticipants: 'Teilnehmer', jsSchedule: 'Spuiplan', jsRanking: 'Tagesranglistn', jsRound: 'Rundn {n}', jsTable: 'Tisch {t}', jsTeam1: 'Team I', jsTeam2: 'Team II', jsPlayer: 'Spuier {n}', jsFree: 'frei', jsEmpty: 'No koa Jassmasters.', jsNoDays: 'No koa Datum.', jsAddSeries: 'Jassmasters dazuadoa', jsAddDay: 'Datum dazuadoa', jsLvlSeries: 'Jassmasters', jsLvlDay: 'Jasstog', jsPick: 'Spuier {n} aussuacha', jsClear: 'Platz freigebn', jsAlready: 'scho Spuier {n}', jsPoints: 'Punkt', jsGames: '{n} Spuie', jsPtsAbbr: 'Pkt.', jsGame: '{n} Spui', jsNoPoints: 'No koane Punkt.', jsHint: 'Trag de Punkt beim Siegerteam ei. Des andere Team kriagt s automatisch negativ.', jsSetup: 'Für Jass muass s Datenbank-Schema aktualisiert wern (supabase/schema.sql).', jsFinish: 'Jassmaster åbschliassn', jsConfirmFinish: '«{name}» åbschliassn? Kummt unta Vergangene Jassmasters und is nacha nur no as Rangliste z\'sehgn. Weitamacha?', jsFinished: 'Als åbgschlossn markiat', jsEditRanking: 'Rangliste bearbeitn', jsRankName: 'Nam', jsRankPoints: 'Punkt', jsAddRow: 'Zein dazuafügn', jsNoRows: 'No niemand eigem.',
      jmTag: 'Jass Manager', mMakeJm: 'Zum Jass Manager mocha', mRevokeJm: 'Jass Manager-Rechte wegnehma', jmGranted: 'Als Jass Manager festgsetzt', jmRevoked: 'Jass Manager-Rechte wegnumma', cmTag: 'Chilbi Manager', crmTag: 'Chränzli Manager', mMakeCm: 'Zum Chilbi Manager mocha', mRevokeCm: 'Chilbi Manager-Rechte wegnehma', mMakeCrm: 'Zum Chränzli Manager mocha', mRevokeCrm: 'Chränzli Manager-Rechte wegnehma', cmGranted: 'Als Chilbi Manager festgsetzt', cmRevoked: 'Chilbi Manager-Rechte wegnumma', crmGranted: 'Als Chränzli Manager festgsetzt', crmRevoked: 'Chränzli Manager-Rechte wegnumma', grpActive: 'Aktivmitglieda', grpPassive: 'Passivmitglieda', mMakePassive: 'Zum Passivmitglied mocha', mMakeActive: 'Zum Aktivmitglied mocha', passiveSet: 'Als Passivmitglied festgsetzt', activeSet: 'Als Aktivmitglied festgsetzt', jsUpcoming: 'Åstejads Jassmaster', jsPast: 'Vagangane Jassmasters'
    }
  };

  var lang = detectLang();

  function detectLang() {
    try { var s = localStorage.getItem('fbro-lang'); if (s && LANGS.indexOf(s) > -1) return s; } catch (e) { /* ignorieren */ }
    var n = String(navigator.language || 'de').toLowerCase().slice(0, 2);
    return ['de', 'fr', 'en', 'it', 'uk'].indexOf(n) > -1 ? n : 'de';
  }
  function L(key, p) {
    var s = (DICT[lang] && DICT[lang][key]) || DICT.de[key] || key;
    if (p) s = s.replace(/\{(\w+)\}/g, function (m, k) { return p[k] != null ? p[k] : m; });
    return s;
  }
  function setLang(l) {
    if (LANGS.indexOf(l) === -1) return;
    lang = l;
    try { localStorage.setItem('fbro-lang', l); } catch (e) { /* ignorieren */ }
    document.documentElement.lang = LANG_HTML[l];
  }

  /* ---------- Darstellung: Hell / Dunkel / Automatisch ---------- */
  // '' bedeutet automatisch (folgt der Geräteeinstellung); so früh wie möglich angewendet,
  // damit die Seite nicht kurz im falschen Modus aufblitzt.
  function detectTheme() {
    try { var t = localStorage.getItem('fbro-theme'); if (t === 'light' || t === 'dark') return t; } catch (e) { /* ignorieren */ }
    return '';
  }
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  var theme = detectTheme();
  applyTheme(theme);
  function setTheme(t) {
    theme = (t === 'light' || t === 'dark') ? t : '';
    try { if (theme) localStorage.setItem('fbro-theme', theme); else localStorage.removeItem('fbro-theme'); } catch (e) { /* ignorieren */ }
    applyTheme(theme);
  }
  function saveTheme() {
    if (!sb || !S.me) return;
    try { sb.from('profiles').update({ theme: theme || null }).eq('id', S.me.id).then(function () {}, function () {}); } catch (e) { /* ignorieren */ }
  }
  function themeSelect() {
    var opts = [
      { v: 'light', label: L('themeLight'), icon: ICON.sun },
      { v: 'dark', label: L('themeDark'), icon: ICON.moon },
      { v: '', label: L('themeAuto'), icon: ICON.auto }
    ];
    return '<div class="segctl" role="group" aria-label="' + esc(L('themeTitle')) + '">' + opts.map(function (o) {
      return '<button type="button" class="segbtn' + (theme === o.v ? ' on' : '') + '" data-act="set-theme" data-val="' + o.v + '" aria-pressed="' + (theme === o.v) + '">' + o.icon + '<span>' + o.label + '</span></button>';
    }).join('') + '</div>';
  }
  function langSelect() {
    return '<select class="input langsel" data-lang aria-label="Sprache / Language">' + LANGS.map(function (l) {
      return '<option value="' + l + '"' + (l === lang ? ' selected' : '') + '>' + esc(LANG_NAMES[l]) + '</option>';
    }).join('') + '</select>';
  }

  // Datumsformat: Für die Mundarten gibt es keine Intl-Sprache, daher eigene Namen
  var CUSTOM_DATES = {
    gsw: {
      // Fix 2: longDays für fullDate (weekday:'long')
      longDays: ['Sunntig', 'Mäntig', 'Zischtig', 'Mittwuch', 'Dunnschtig', 'Friitig', 'Samschtig'],
      days: ['Su', 'Mä', 'Zi', 'Mi', 'Du', 'Fr', 'Sa'],
      // Fix 3: Monatskürzel mit Punkt (wie de: «Okt.»)
      months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'Auguscht', 'Septämber', 'Oktober', 'Novämber', 'Dezämber'],
      short: ['Jan.', 'Feb.', 'Mär.', 'Apr.', 'Mai', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.']
    },
    bar: {
      // Fix 2: longDays für fullDate (weekday:'long')
      longDays: ['Sunntog', 'Montog', 'Irntog', 'Mittwoch', 'Pfinschtog', 'Freitog', 'Samstog'],
      days: ['Su', 'Mo', 'Ir', 'Mi', 'Pf', 'Fr', 'Sa'],
      // Fix 3: Monatskürzel mit Punkt
      months: ['Jänner', 'Feber', 'März', 'April', 'Mai', 'Juni', 'Juli', 'Auggust', 'Septemba', 'Oktoba', 'Novemba', 'Dezemba'],
      short: ['Jän.', 'Feb.', 'Mär.', 'Apr.', 'Mai', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.']
    }
  };
  function fmt(d, o) {
    var c = CUSTOM_DATES[lang];
    if (c) {
      var dm = [];
      if (o.day) dm.push(d.getDate() + '.');
      if (o.month) dm.push(o.month === 'long' ? c.months[d.getMonth()] : c.short[d.getMonth()]);
      if (o.year) dm.push(d.getFullYear());
      var main = dm.join(' ');
      // Fix 2: weekday:'long' → Langname; weekday:'short' → Kurzname
      var wd = o.weekday ? (o.weekday === 'long' ? c.longDays[d.getDay()] : c.days[d.getDay()]) : null;
      return wd ? wd + (main ? ', ' + main : '') : main;
    }
    return d.toLocaleDateString(LANG_LOCALE[lang] || 'de-CH', o);
  }

  // Akzeptiert 079 123 45 67, +41 79 123 45 67, 0041 79 …; Leerschläge werden ignoriert.
  // Intern gespeichert wird immer das internationale Format (+41791234567).
  function normPhone(raw) {
    var d = String(raw).replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
    if (d.indexOf('00') === 0) d = '+' + d.slice(2);
    else if (d.indexOf('0') === 0) d = '+41' + d.slice(1);
    else if (d.indexOf('+') !== 0) d = '+' + d;
    return /^\+\d{9,15}$/.test(d) ? d : null;
  }
  // Anzeige: Schweizer Nummern immer als 079 123 45 67
  function fmtPhone(p) {
    if (/^\+41\d{9}$/.test(p)) return '0' + p.slice(3, 5) + ' ' + p.slice(5, 8) + ' ' + p.slice(8, 10) + ' ' + p.slice(10);
    if (/^\+49\d{10,11}$/.test(p)) return '+49 ' + p.slice(3, 6) + ' ' + p.slice(6);
    return p;
  }
  function defaultPin(p) { return String(p).replace(/\D/g, '').slice(-6); }

  /* Handynummer-Eingabe: Länderauswahl (CH/DE/Andere) + Nummer ohne führende Null.
     Gespeichert wird weiterhin das internationale Format (+41791234567). */
  var PHONE_CC = [{ c: '41', l: 'CH +41', ph: '79 123 45 67' }, { c: '49', l: 'DE +49', ph: '176 12345678' }];
  function ccInfo(c) { return PHONE_CC.filter(function (x) { return x.c === c; })[0] || null; }
  function fmtNational(cc, n) {
    n = String(n).replace(/\D/g, '');
    if (cc === '41') return [n.slice(0, 2), n.slice(2, 5), n.slice(5, 7), n.slice(7, 9)].filter(Boolean).join(' ');
    if (cc === '49') return [n.slice(0, 3), n.slice(3)].filter(Boolean).join(' ');
    return n;
  }
  // '+41796232345' → { cc: '41', nat: '79 623 23 45' }; unbekanntes Land → { cc: '', nat: '+43…' }
  function phoneParts(intl) {
    var raw = String(intl || '');
    var d = raw.replace(/\D/g, '');
    if (/^\+\d/.test(raw.replace(/\s/g, ''))) {
      for (var i = 0; i < PHONE_CC.length; i++) {
        if (d.indexOf(PHONE_CC[i].c) === 0) return { cc: PHONE_CC[i].c, nat: fmtNational(PHONE_CC[i].c, d.slice(PHONE_CC[i].c.length)) };
      }
      return { cc: '', nat: raw.replace(/\s/g, '') };
    }
    return { cc: '41', nat: fmtNational('41', d.replace(/^0+/, '')) };
  }
  // Länderwahl + Eingabe → Nummer für normPhone(). Eine vollständig internationale Eingabe (+… / 00…) gilt immer.
  function composePhone(cc, raw) {
    raw = String(raw || '').trim();
    if (/^(\+|00)/.test(raw.replace(/\s/g, ''))) return raw;
    if (!cc) return raw;
    var d = raw.replace(/\(0\)/g, '').replace(/\D/g, '');
    if (cc === '41' && d.length === 11 && d.indexOf('41') === 0) d = d.slice(2);   // «41 79 …» ohne +
    d = d.replace(/^0+/, '');
    return d ? '+' + cc + d : '';
  }
  function phoneField(intl, autoc) {
    var pp = phoneParts(intl), info = ccInfo(pp.cc);
    return '<div class="phonerow">' +
      '<select class="input phonecc" name="phonecc" aria-label="' + esc(L('phoneCountry')) + '">' +
      PHONE_CC.map(function (x) { return '<option value="' + x.c + '"' + (pp.cc === x.c ? ' selected' : '') + '>' + x.l + '</option>'; }).join('') +
      '<option value=""' + (pp.cc === '' ? ' selected' : '') + '>' + esc(L('phoneOther')) + '</option></select>' +
      '<input class="input" name="phone" type="tel" inputmode="tel" autocomplete="' + (autoc || 'off') + '" placeholder="' + esc(info ? info.ph : '+43 …') + '" value="' + esc(pp.nat) + '" required></div>';
  }
  function phoneToEmail(p) { return p.replace('+', '') + '@' + (cfg.EMAIL_DOMAIN || 'phone-login.app'); }

  /* ---------- Zustand ---------- */
  function freshState() {
    return {
      step: 'loading', mode: 'login', tab: 'trainings', phone: '', err: '', info: '',
      session: null, me: null, members: [],
      rules: [], extras: [], overrides: {}, cancelled: {}, events: [],
      tr: {}, ev: {}, open: {}, edit: null, busy: false, sec: {}, add: {}, info: {}, showMore: false,
      cc: { events: [], days: [], shifts: [], roles: [] }, ccErr: false, ccFold: {}, ccLegend: false,
      js: { series: [], days: [] }, jsErr: false, jsFold: {}
    };
  }
  var S = freshState();
  var installPrompt = null;

  /* ---------- Daten laden ---------- */
  async function loadAll() {
    var tables = ['profiles', 'training_rules', 'training_extras', 'training_overrides', 'training_cancellations', 'events', 'training_responses', 'event_responses'];
    var res = await Promise.all(tables.map(function (t) { return sb.from(t).select('*'); }));
    var bad = res.filter(function (r) { return r.error; })[0];
    if (bad) throw bad.error;
    var d = res.map(function (r) { return r.data || []; });

    S.members = d[0].map(function (r) { return { id: r.id, name: r.name, phone: r.phone, isAdmin: r.is_admin, isGuest: r.is_guest === true, isPassive: r.is_passive === true, isSupporter: r.is_supporter === true, isCandidate: r.is_candidate === true, isEventManager: r.is_event_manager === true, isChilbiManager: r.is_chilbi_manager === true, isChraenzliManager: r.is_chraenzli_manager === true, isJassMaster: r.is_jass_master === true, pinChanged: r.pin_changed === true, language: r.language || null, theme: r.theme || null }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'de'); });
    S.rules = d[1].map(function (r) { return { id: r.id, wd: r.weekday, time: hhmm(r.start_time), place: r.place }; })
      .sort(function (a, b) { return ((a.wd + 6) % 7) - ((b.wd + 6) % 7) || (a.time < b.time ? -1 : 1); });
    S.extras = d[2].map(function (r) { return { id: r.id, title: r.title, date: r.event_date, time: hhmm(r.start_time), place: r.place }; });
    S.overrides = {};
    d[3].forEach(function (r) { S.overrides[r.training_key] = { date: r.new_date, time: hhmm(r.new_time), place: r.new_place }; });
    S.cancelled = {};
    d[4].forEach(function (r) { S.cancelled[r.training_key] = true; });
    S.events = d[5].map(function (r) { return { id: r.id, title: r.title, date: r.event_date, time: hhmm(r.start_time), place: r.place, cancelled: r.cancelled, rsvp: r.rsvp_required === true }; });
    S.tr = {};
    d[6].forEach(function (r) { (S.tr[r.training_key] = S.tr[r.training_key] || {})[r.user_id] = r.status; });
    S.ev = {};
    d[7].forEach(function (r) { (S.ev[r.event_id] = S.ev[r.event_id] || {})[r.user_id] = r.status; });
    if (S.session) S.me = S.members.filter(function (m) { return m.id === S.session.user.id; })[0] || null;

    // Jass separat laden (für alle angemeldeten Personen sichtbar)
    S.js = { series: [], days: [] };
    S.jsErr = false;
    if (S.me) {
      var jr = await Promise.all(['jass_series', 'jass_days'].map(function (t) { return sb.from(t).select('*'); }));
      if (jr.some(function (r) { return r.error; })) S.jsErr = true;
      else { S.js.series = jr[0].data || []; S.js.days = jr[1].data || []; }
    }

    // C&C separat laden: ein fehlendes Schema soll den Rest der App nicht blockieren
    S.cc = { events: [], days: [], shifts: [], roles: [] };
    S.ccErr = false;
    S.ccPublic = false;   // wird nach dem Laden gesetzt: true wenn mind. 1 Anlass aktiv ist
    if (canCC()) {
      // Admins und Manager laden immer alle C&C-Daten (aktiv + inaktiv)
      var cr = await Promise.all(['cc_events', 'cc_days', 'cc_shifts', 'cc_roles'].map(function (t) { return sb.from(t).select('*'); }));
      if (cr.some(function (r) { return r.error; })) S.ccErr = true;
      else {
        S.cc.events = cr[0].data || [];
        S.cc.days = cr[1].data || [];
        S.cc.shifts = (cr[2].data || []).map(function (x) { x.start_time = hhmm(x.start_time); x.end_time = hhmm(x.end_time); return x; });
        S.cc.roles = cr[3].data || [];
      }
      // C&C-Tab für normale Mitglieder sichtbar, wenn mind. 1 Anlass aktiv ist
      S.ccPublic = S.cc.events.some(function (e) { return e.active; });
    } else {
      // Normales Mitglied: nur laden wenn mind. 1 aktiver Anlass existiert (Lesezugriff via RLS)
      var evR = await sb.from('cc_events').select('*').eq('active', true);
      if (!evR.error && evR.data && evR.data.length > 0) {
        S.ccPublic = true;
        var cr2 = await Promise.all(['cc_days', 'cc_shifts', 'cc_roles'].map(function (t) { return sb.from(t).select('*'); }));
        S.cc.events = evR.data;
        if (!cr2.some(function (r) { return r.error; })) {
          S.cc.days = cr2[0].data || [];
          S.cc.shifts = (cr2[1].data || []).map(function (x) { x.start_time = hhmm(x.start_time); x.end_time = hhmm(x.end_time); return x; });
          S.cc.roles = cr2[2].data || [];
        }
      }
    }
  }

  /* ---------- Trainings berechnen ---------- */
  function prefix() { return cfg.CLUB_SHORT || 'FBRO'; }

  // Alle künftigen Termine: Serien-Termine für die nächsten 12 Monate, Spezial-Trainings ohne Zeitgrenze
  function getTrainings() {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var todayIso = iso(today);
    var nowT = pad(now.getHours()) + ':' + pad(now.getMinutes());
    var months = cfg.TRAININGS_HORIZON_MONTHS || 12;
    var last = new Date(today.getFullYear(), today.getMonth() + months + 1, 0);
    var span = Math.round((last - today) / 864e5);
    var list = [];
    var add = function (t) {
      var ov = S.overrides[t.key];
      if (ov) { t.iso = ov.date; t.time = ov.time; t.place = ov.place; t.changed = true; }
      t.date = parseIso(t.iso);
      if (t.iso < todayIso) return;                       // vergangene Termine ausblenden
      if (t.iso === todayIso && t.time < nowT) return;    // heute bereits begonnene ebenfalls
      list.push(t);
    };
    for (var i = 0; i <= span; i++) {
      var d = new Date(today); d.setDate(today.getDate() + i);
      var di = iso(d);
      S.rules.forEach(function (r) {
        if (r.wd === d.getDay()) add({ key: di + '#' + r.id, iso: di, time: r.time, place: r.place, title: L('trainingWord'), ruleId: r.id });
      });
    }
    S.extras.forEach(function (x) {
      add({ key: 'x#' + x.id, iso: x.date, time: x.time, place: x.place, title: x.title, extraId: x.id });
    });
    list.sort(function (a, b) { return (a.iso + a.time) < (b.iso + b.time) ? -1 : 1; });
    return list;
  }

  function getEvents() {
    var now = new Date();
    var todayIso = iso(now);
    var nowT = pad(now.getHours()) + ':' + pad(now.getMinutes());
    return S.events.filter(function (e) { return e.date > todayIso || (e.date === todayIso && e.time >= nowT); })
      .sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  }

  /* ---------- Icons ---------- */
  var ICON = {
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 4.3c.4-1.8 2.9-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.8.4 1.8 2.9 0 3.4a1.7 1.7 0 0 0-1 2.6c.9 1.5-.8 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1c-.4 1.8-2.9 1.8-3.4 0a1.7 1.7 0 0 0-2.6-1c-1.5.9-3.3-.8-2.4-2.4a1.7 1.7 0 0 0-1-2.6c-1.8-.4-1.8-2.9 0-3.4a1.7 1.7 0 0 0 1-2.5c-.9-1.6.8-3.3 2.4-2.4c1 .6 2.3 0 2.6-1.1z"/><circle class="hole" cx="12" cy="12" r="3"/></svg>',
    laurel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 20.5C5.4 19.2 3.2 15.9 3.2 12c0-2.3.7-4.4 2-6.1"/><path d="M15 20.5c3.6-1.3 5.8-4.6 5.8-8.5 0-2.3-.7-4.4-2-6.1"/><path d="M5.2 5.9C4.9 4.5 5.6 3.2 6.9 2.8c.3 1.4-.4 2.7-1.7 3.1z"/><path d="M3.4 10.1C2.5 9 2.6 7.5 3.6 6.6c.9 1.1.8 2.6-.2 3.5z"/><path d="M3.6 14.6c-1.2-.5-1.9-1.9-1.5-3.2 1.3.4 2 1.8 1.5 3.2z"/><path d="M5.6 18.3c-1.3-.1-2.3-1.2-2.3-2.5 1.4 0 2.4 1.1 2.3 2.5z"/><path d="M18.8 5.9c.3-1.4-.4-2.7-1.7-3.1-.3 1.4.4 2.7 1.7 3.1z"/><path d="M20.6 10.1c.9-1.1.8-2.6-.2-3.5-.9 1.1-.8 2.6.2 3.5z"/><path d="M20.4 14.6c1.2-.5 1.9-1.9 1.5-3.2-1.3.4-2 1.8-1.5 3.2z"/><path d="M18.4 18.3c1.3-.1 2.3-1.2 2.3-2.5-1.4 0-2.4 1.1-2.3 2.5z"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M6 14h12v7H6z"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4"/><path d="M13.5 6.5l4 4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    crown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6l4 6l5-4l-2 10H5L3 8l5 4z"/><circle cx="12" cy="4" r="1"/><circle cx="3" cy="6" r="1"/><circle cx="21" cy="6" r="1"/></svg>',
    candidate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5"/><path d="M12 17h.01"/></svg>',
    groupA: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><text x="12" y="16.5" text-anchor="middle" font-size="12" font-weight="700" font-family="sans-serif" fill="#fff" stroke="none">A</text></svg>',
    groupP: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><text x="12" y="16.5" text-anchor="middle" font-size="11" font-weight="700" font-family="sans-serif" fill="currentColor" stroke="none">P</text></svg>',
    groupG: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2.2 2.2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><text x="12" y="16.5" text-anchor="middle" font-size="11" font-weight="700" font-family="sans-serif" fill="currentColor" stroke="none" stroke-dasharray="0">G</text></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.6-9.5 9-9.5 9z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><circle cx="18" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
    glass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="liq" d="M6.3 10.6a5 5 0 0 1 5.7-.6a5 5 0 0 0 5.7.6c-.4 2.6-2.8 4.4-5.7 4.4s-5.3-1.8-5.7-4.4z" stroke="none"/><path d="M8 21h8"/><path d="M12 15v6"/><path d="M17 3l1 7c0 3-2.7 5-6 5s-6-2-6-5l1-7z"/><path d="M6.2 10a5 5 0 0 1 5.8 0a5 5 0 0 0 5.8 0"/></svg>',
    dialpad: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><circle cx="6" cy="4" r="1.8"/><circle cx="12" cy="4" r="1.8"/><circle cx="18" cy="4" r="1.8"/><circle cx="6" cy="10" r="1.8"/><circle cx="12" cy="10" r="1.8"/><circle cx="18" cy="10" r="1.8"/><circle cx="6" cy="16" r="1.8"/><circle cx="12" cy="16" r="1.8"/><circle cx="18" cy="16" r="1.8"/><circle cx="12" cy="21.5" r="1.8"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>',
    one: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6"/></svg>',
    two: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3.5"/><circle cx="17" cy="9" r="3"/><path d="M2 20c0-3.5 2.5-5.5 6-5.5s6 2 6 5.5M15 15c3.5 0 7 1.5 7 5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    calplus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    calcard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15.5" r="2" fill="currentColor" stroke="none"/></svg>',
    dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="8" width="3" height="8" rx="1"/><rect x="5.5" y="6" width="2.5" height="12" rx="1"/><path d="M8 12h8"/><rect x="16" y="6" width="2.5" height="12" rx="1"/><rect x="18.5" y="8" width="3" height="8" rx="1"/></svg>',
    cog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chev: '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
  };

  /* ---------- Formular-Bausteine ---------- */
  function fld(label, inner) { return '<label class="field"><span>' + label + '</span>' + inner + '</label>'; }
  function grid(a, b) { return '<div class="grid2">' + a + b + '</div>'; }
  function wdOptions(sel) {
    return WEEKDAYS.map(function (w) { return '<option value="' + w + '"' + (w === sel ? ' selected' : '') + '>' + wdName(w) + '</option>'; }).join('');
  }
  var inTime = function (v) { return '<input class="input" type="time" name="time" value="' + esc(v) + '" required>'; };
  var inPlace = function (v, ph) { return '<input class="input" name="place" value="' + esc(v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' required>'; };
  var inDate = function (v) { return '<input class="input" type="date" name="date" value="' + esc(v) + '" required>'; };
  var inTitle = function (v, ph) { return '<input class="input" name="title" value="' + esc(v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' required>'; };
  function editRow(kind, id, body, note, extraBtn) {
    return '<li class="editrow"><form class="editform" data-form="' + kind + '" data-id="' + esc(id) + '">' + body +
      (note ? '<p class="small muted" style="margin:-4px 0 12px">' + note + '</p>' : '') +
      '<div class="editbtns"><button class="btn inline" type="submit">' + L('save') + '</button>' +
      '<button class="btn ghost inline" type="button" data-act="edit-cancel">' + L('dismiss') + '</button>' + (extraBtn || '') +
      '</div></form></li>';
  }

  /* ---------- Kalender-Export (.ics) ---------- */
  function icsText(t) {
    return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function icsLocal(d) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  }
  function buildGoogleCalUrl(e) {
    var p = e.date.split('-').map(Number), tm = e.time.split(':').map(Number);
    var start = new Date(p[0], p[1] - 1, p[2], tm[0], tm[1]);
    var end = new Date(start.getTime() + (cfg.EVENT_DURATION_MIN || 120) * 60000);
    function fmt(d) {
      return d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
    }
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(e.title) +
      '&dates=' + fmt(start) + '/' + fmt(end) +
      '&location=' + encodeURIComponent(e.place || '') +
      '&details=' + encodeURIComponent((cfg.CLUB_NAME ? cfg.CLUB_NAME + ': ' : '') + e.title);
  }
  function buildIcs(e) {
    var p = e.date.split('-').map(Number), tm = e.time.split(':').map(Number);
    var start = new Date(p[0], p[1] - 1, p[2], tm[0], tm[1]);
    var end = new Date(start.getTime() + (cfg.EVENT_DURATION_MIN || 120) * 60000);
    var n = new Date();
    var stamp = n.getUTCFullYear() + pad(n.getUTCMonth() + 1) + pad(n.getUTCDate()) + 'T' + pad(n.getUTCHours()) + pad(n.getUTCMinutes()) + pad(n.getUTCSeconds()) + 'Z';
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Vereins-Training//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + e.id + '@vereins-training',
      'DTSTAMP:' + stamp,
      'DTSTART:' + icsLocal(start),   // ohne Zeitzone: gilt in der Zeitzone des Handys
      'DTEND:' + icsLocal(end),
      'SUMMARY:' + icsText(e.title),
      'LOCATION:' + icsText(e.place),
      'DESCRIPTION:' + icsText((cfg.CLUB_NAME ? cfg.CLUB_NAME + ': ' : '') + e.title),
      'BEGIN:VALARM',
      'TRIGGER:-PT60M',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + icsText(e.title),
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n') + '\r\n';
  }
  async function addToCalendar(e) {
    var ics = buildIcs(e);
    var name = (e.title.replace(/[^\w\-äöüÄÖÜéèà ]+/g, '').trim().replace(/\s+/g, '-') || 'Event') + '.ics';
    var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // iPhone / iPad: data:-URI direkt öffnen — iOS erkennt text/calendar und bietet
    // «Zum Kalender hinzufügen» an, ohne dass Web Share API oder File System nötig ist.
    if (isIos) {
      var uri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
      var a = document.createElement('a');
      a.href = uri;
      // Kein «download»-Attribut: iOS öffnet den Link direkt im Kalender-Dialog.
      document.body.appendChild(a); a.click(); a.remove();
      return;
    }

    // Chrome / Firefox / Edge und alle anderen: Blob-URL + download-Attribut.
    // Chrome öffnet .ics-Dateien nach dem Download nicht automatisch — deshalb
    // zusätzlich den webcal:-Link als Alternative anbieten (öffnet direkt Kalender-App).
    // Zuerst versuchen wir den Blob-Download:
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a2 = document.createElement('a');
    a2.href = url; a2.download = name;
    document.body.appendChild(a2); a2.click(); a2.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    toast(L('calFile', { name: name }));
  }

  /* ---------- Views ---------- */
  function viewSetup() {
    return '<div class="login"><div class="langbar">' + langSelect() + '</div><h1>' + L('setupTitle') + '</h1>' +
      '<p class="lead">' + L('setupLead') + '</p>' +
      '<ol class="steps"><li>' + L('setupStep1') + '</li><li>' + L('setupStep2') + '</li><li>' + L('setupStep3') + '</li></ol>' +
      '<p class="small muted">' + L('setupNote') + '</p></div>';
  }

  function viewCandidate() {
    return '<div class="login candidatescreen">' +
      '<img class="loginlogo" src="icons/logo.png" alt="' + esc(cfg.CLUB_NAME || 'FBRO') + '">' +
      '<p class="lead">' + L('candidateTitle') + '</p>' +
      '<p class="lead">' + L('candidateMsg') + '</p></div>';
  }

  function viewLogin() {
    var reg = S.mode === 'register';
    var needCode = reg && cfg.CLUB_CODE_REQUIRED !== false;
    return '<div class="login"><div class="loginhead"><h1>' + esc(cfg.CLUB_NAME || 'Training') + '<br>' + L('loginSub') + '</h1>' +
      '<img class="loginlogo" src="icons/logo.png" alt="' + esc(cfg.CLUB_NAME || 'FBRO') + '"></div>' +
      '<p class="lead">' + (reg ? L('loginLeadReg') : L('loginLead')) + '</p>' +
      '<form data-form="auth">' +
      (reg ? fld(L('fullName'), '<input class="input" name="name" autocomplete="name" required>') : '') +
      fld(L('phone'), phoneField(S.phone, 'tel')) +
      (reg ? '' : fld(L('pinOptional'), '<input class="input pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="current-password" placeholder="······">')) +
      (needCode ? fld(L('clubCode'), '<input class="input" name="code" autocomplete="off" required>') : '') +
      (S.err ? '<p class="err">' + esc(S.err) + '</p>' : '') +
      '<button class="btn" type="submit"' + (S.busy ? ' disabled' : '') + '>' + (reg ? L('register') : L('signIn')) + '</button>' +
      '</form>' +
      '<button type="button" class="linkbtn" data-act="mode" style="margin-top:12px">' + (reg ? L('haveAccount') : L('firstTime')) + '</button>' +
      '</div>';
  }

  function monthList(items, cardFn) {
    var html = '', last = '';
    items.forEach(function (t) {
      var label = fmt(t.date, { month: 'long', year: 'numeric' });
      if (label !== last) { html += '<div class="week">' + esc(label) + '</div>'; last = label; }
      html += cardFn(t);
    });
    return html;
  }

  function viewTrainings() {
    var list = getTrainings();
    var n = cfg.TRAININGS_VISIBLE || 20;
    var first = list.slice(0, n), rest = list.slice(n);
    var html = '<div class="top"><div><h1 class="pagetitle">' + L('titleTrainings') + '</h1></div></div>';
    if (!list.length) {
      return html + '<div class="empty"><p><b>' + L('emptyTrTitle') + '</b></p><p>' + (S.me.isAdmin ? L('emptyTrAdmin') : L('emptyTrMember')) + '</p></div>';
    }
    html += monthList(first, cardHtml);
    if (rest.length) {
      html += '<button type="button" class="morebtn" data-act="more-tr" aria-expanded="' + S.showMore + '"><span>' + L('moreDates', { n: rest.length }) + '</span>' + ICON.chev + '</button>';
      if (S.showMore) html += monthList(rest, cardHtml);
    }
    return html;
  }

  function cardHtml(t) {
    var r = S.tr[t.key] || {};
    var off = !!S.cancelled[t.key];
    var yes = [], no = [], open = [];
    S.members.forEach(function (m) { (r[m.id] === 'yes' ? yes : r[m.id] === 'no' ? no : open).push(m); });
    var mine = r[S.me.id];
    var isOpen = !!S.open[t.key];
    var cls = yes.length < 8 ? 'low' : yes.length < 13 ? 'ok' : 'high';
    if (off) {
      return '<article class="ccel off" title="' + esc(t.title) + '">' +
        '<div class="cceh grey"><b>' + fullDate(t.date) + ' (' + L('cancelledLow') + ')</b></div>' +
      '</article>';
    }
    return '<article class="ccel" title="' + esc(t.title + ', ' + L('timePlace', { time: t.time, place: t.place })) + '">' +
      '<div class="cceh"><b>' + fullDate(t.date) + '</b></div>' +
      '<div class="ccbody">' +
        '<div class="actrow3">' +
          '<button type="button" class="resp yes" data-act="resp" data-val="yes" data-key="' + esc(t.key) + '" aria-pressed="' + (mine === 'yes') + '">' + ICON.check + L('yes') + '</button>' +
          '<button type="button" class="resp no" data-act="resp" data-val="no" data-key="' + esc(t.key) + '" aria-pressed="' + (mine === 'no') + '">' + ICON.x + L('no') + '</button>' +
          '<button type="button" class="resp cntbtn ' + cls + (isOpen ? ' is-open' : '') + '" data-act="who" data-key="' + esc(t.key) + '" aria-expanded="' + isOpen + '" aria-label="' + esc(L('ariaTr', { yes: yes.length, no: no.length, action: isOpen ? L('listClose') : L('listOpen') })) + '"><b>' + yes.length + '</b>&nbsp;' + L('participants') + ICON.chev + '</button>' +
        '</div>' +
        (isOpen ? whoBlock([
          { label: L('hYes', { n: yes.length }), arr: yes },
          { label: L('hNo', { n: no.length }), arr: no }
        ].concat(S.me.isGuest ? [] : [{ label: L('hOpen', { n: open.length }), arr: open }])) : '') +
      '</div>' +
    '</article>';
  }

  function shortDate(d) {
    // Punkt nach Tageszahl nur für Sprachen, die ihn grammatisch verwenden (de, gsw, bar)
    var dayDot = (lang === 'de' || lang === 'gsw' || lang === 'bar') ? '. ' : ' ';
    // Wochentag-Kurzname: trailing Punkt entfernen (de liefert «Mo.», custom-Sprachen brauchen keinen)
    var wd = fmt(d, { weekday: 'short' }).replace(/\.$/, '');
    // Monatsname: Punkt BEHALTEN für alle Sprachen (de=«Okt.», gsw/bar=«Okt.», fix 3)
    var mo = fmt(d, { month: 'short' });
    return esc(wd) + ' ' + d.getDate() + dayDot + esc(mo);
  }
  function z2(n) { return n < 10 ? '0' + n : '' + n; }
  function fullDate(d) {
    return esc(fmt(d, { weekday: 'long' })) + ', ' + z2(d.getDate()) + '.' + z2(d.getMonth() + 1) + '.' + d.getFullYear();
  }
  function fullDateIso(iso) { return fullDate(parseIso(iso)); }
  function monthYear(isoDay) {
    var d = parseIso(isoDay);
    return esc(fmt(d, { month: 'long' })) + ' ' + d.getFullYear();
  }
  function whoBlock(items) {
    return '<div class="who">' + items.map(function (it) {
      return '<div><h4>' + it.label + '</h4><div class="chips">' + chips(it.arr, !!it.plus) + '</div></div>';
    }).join('') + '</div>';
  }
  function openSimpleMenu(items) {
    closeSimpleMenu();
    var wrap = document.createElement('div');
    wrap.id = 'simplemenu';
    wrap.className = 'ccsheet';
    wrap.innerHTML = '<div class="ccsheetcard">' + items.map(function (it, i) {
      return '<button type="button" class="ccact" data-smi="' + i + '">' + it.icon + '<span>' + it.label + '</span></button>';
    }).join('') + '<button type="button" class="ccact close" data-smi="close">' + L('ccClose') + '</button></div>';
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) { closeSimpleMenu(); return; }
      var b = e.target.closest('[data-smi]');
      if (!b) return;
      if (b.dataset.smi === 'close') { closeSimpleMenu(); return; }
      var it = items[Number(b.dataset.smi)];
      closeSimpleMenu();
      if (it && it.onClick) it.onClick();
    });
    document.addEventListener('keydown', simpleMenuKey, true);
    document.body.appendChild(wrap);
    var first = wrap.querySelector('button');
    if (first) { try { first.focus({ preventScroll: true }); } catch (x) { first.focus(); } }
  }
  function simpleMenuKey(e) { if (e.key === 'Escape') { e.preventDefault(); closeSimpleMenu(); } }
  function closeSimpleMenu() {
    var el = document.getElementById('simplemenu');
    if (el) el.remove();
    document.removeEventListener('keydown', simpleMenuKey, true);
  }
  function chips(arr, plus) {
    return arr.length ? arr.map(function (m) {
      var me = m.id === S.me.id, k = m.isGuest ? 'g' : 'm';
      return '<span class="ccp cc-' + k + (me ? ' ccme' : '') + '">' + esc(m.name) + (plus ? ' +1' : '') + (me ? ' ' + L('you') : '') + '</span>';
    }).join('') : '<span class="small muted">' + L('nobody') + '</span>';
  }

  function viewEvents() {
    var list = getEvents();
    var html = '<div class="top"><div><h1 class="pagetitle">' + L('titleEvents') + '</h1></div></div>';
    if (!list.length) {
      return html + '<div class="empty"><p><b>' + L('emptyEvTitle') + '</b></p><p>' + (S.me.isAdmin ? L('emptyEvAdmin') : L('emptyEvMember')) + '</p></div>';
    }
    html += monthList(list.map(function (e) { return { e: e, date: parseIso(e.date) }; }), function (w) { return eventCardHtml(w.e); });
    return html;
  }

  function eventCardHtml(e) {
    var r = S.ev[e.id] || {};
    var solo = [], duo = [], no = [], open = [];
    S.members.forEach(function (m) {
      (r[m.id] === 'solo' ? solo : r[m.id] === 'duo' ? duo : r[m.id] === 'no' ? no : open).push(m);
    });
    var persons = solo.length + 2 * duo.length;
    var mine = r[S.me.id];
    var isOpen = !!S.open['ev:' + e.id];
    var btn = function (val, cls, icon, label) {
      return '<button type="button" class="resp ' + cls + '" data-act="resp-ev" data-val="' + val + '" data-id="' + e.id + '" aria-pressed="' + (mine === val) + '">' + icon + label + '</button>';
    };
    if (e.cancelled) {
      return '<article class="ccel off" title="' + esc(e.title) + '">' +
        '<div class="cceh grey"><b>' + fullDate(parseIso(e.date)) + ' \u2013 ' + esc(e.title) + ' (' + L('cancelledLow') + ')</b></div>' +
      '</article>';
    }
    return '<article class="ccel">' +
      '<div class="cceh"><b>' + fullDate(parseIso(e.date)) + ' \u2013 ' + esc(e.title) + '</b>' +
      (canManageEvents() ? '<button type="button" class="ccdots" data-act="ev-menu" data-id="' + e.id + '" aria-label="' + esc(L('ccActions') + ': ' + e.title) + '" title="' + esc(L('ccActions')) + '">' + ICON.dots + '</button>' : '') +
      '</div>' +
      '<div class="ccbody">' +
        '<p class="muted small">' + esc(L('timePlace', { time: e.time, place: e.place })) + '</p>' +
        (e.rsvp ? (
          '<div class="actrow4">' +
            btn('solo', 'yes', ICON.one, L('solo')) + btn('duo', 'yes', ICON.two, L('duo')) + btn('no', 'no', '', L('no')) +
            '<button type="button" class="resp cntbtn' + (isOpen ? ' is-open' : '') + '" data-act="who-ev" data-id="' + e.id + '" aria-expanded="' + isOpen + '" aria-label="' + esc(L('ariaEv', { n: persons, action: isOpen ? L('listClose') : L('listOpen') })) + '"><b>' + persons + '</b>&nbsp;' + L('participants') + ICON.chev + '</button>' +
          '</div>' +
          (isOpen ? whoBlock([
            { label: L('hSolo', { n: solo.length }), arr: solo },
            { label: L('hDuo', { n: duo.length, p: duo.length * 2 }), arr: duo, plus: true },
            { label: L('hNo', { n: no.length }), arr: no },
            { label: L('hOpen', { n: open.length }), arr: open }
          ]) : '')
        ) : '') +
      '</div>' +
    '</article>';
  }

  // Merkt sich pro Abschnitt, ob ein «+»-Formular und/oder eine Erklärung verfügbar sind,
  // damit das Drei-Punkte-Menü weiss, welche Einträge es anbieten soll.
  var ACC_META = {};
  function accordion(id, title, count, body, canAdd, info) {
    ACC_META[id] = { canAdd: !!canAdd, info: info || null };
    var open = !!S.sec[id], showInfo = !!S.info[id];
    var hasMenu = canAdd || info;
    // Einheitlich wie bei C&C und Jass: Titel links (klappt auf/zu), Drei-Punkte-Menü, Pfeil ganz rechts
    return '<section class="ccel"><div class="cceh">' +
      '<button type="button" class="cct" data-act="sec" data-id="' + id + '" aria-expanded="' + open + '">' +
      title + (count != null ? ' <span class="cnt">(' + count + ')</span>' : '') + '</button>' +
      (hasMenu ? '<button type="button" class="ccdots" data-act="acc-menu" data-id="' + id + '" aria-label="' + esc(L('ccActions')) + '" title="' + esc(L('ccActions')) + '">' + ICON.dots + '</button>' : '') +
      '<button type="button" class="ccfold' + (open ? ' open' : '') + '" data-act="sec" data-id="' + id + '" aria-hidden="true" tabindex="-1">' + ICON.chev + '</button>' +
      '</div>' + (open ? '<div class="ccbody">' + (info && showInfo ? '<p class="infotext">' + info + '</p>' : '') + body + '</div>' : '') + '</section>';
  }

  // Zeile (oder Bearbeiten-Formular) für einen einzelnen Trainingstermin
  function trRow(t) {
    var off = !!S.cancelled[t.key];
    if (S.edit === 'tr:' + t.key) {
      var body = (t.extraId ? fld(L('label'), inTitle(t.title)) : '') + grid(fld(L('date'), inDate(t.iso)), fld(L('time'), inTime(t.time))) + fld(L('place'), inPlace(t.place));
      var reset = S.overrides[t.key] ? '<button class="btn ghost inline" type="button" data-act="reset-tr" data-key="' + esc(t.key) + '">' + L('reset') + '</button>' : '';
      return editRow('edit-tr', t.key, body, t.extraId ? '' : L('editNote'), reset);
    }
    return '<li><div class="l"><b>' + esc(fmt(t.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })) + ', ' + esc(t.time) + '</b>' +
      '<span>' + esc(t.title) + ', ' + esc(t.place) + (t.changed ? ' · ' + L('changedLow') : '') + (off ? ' · ' + L('cancelledLow') : '') + '</span></div>' +
      '<div class="btnrow"><button type="button" class="mini" data-act="edit" data-target="tr:' + esc(t.key) + '">' + L('edit') + '</button>' +
      '<button type="button" class="mini" data-act="cancel" data-key="' + esc(t.key) + '">' + (off ? L('reactivate') : L('cancel')) + '</button>' +
      (t.extraId ? '<button type="button" class="mini del" data-act="del-extra" data-id="' + t.extraId + '">' + L('del') + '</button>' : '') + '</div></li>';
  }

  function viewAdmin() {
    var all = getTrainings();
    var series = all.filter(function (t) { return !t.extraId; });
    var extras = all.filter(function (t) { return !!t.extraId; });
    var isAdm = S.me.isAdmin;
    var adminSubKey = isAdm ? 'adminSub' : S.me.isEventManager ? 'emSub' : 'ccManagerSub';
    var html = '<div class="top"><div><h1 class="pagetitle">' + L('adminTitle') + '</h1><p>' + L(adminSubKey) + '</p></div></div>';
    var b;

    /* Montag Trainings */
    b = '';
    if (S.add.rules) {
      b += '<form class="addform" data-form="rule">' + grid(fld(L('weekday'), '<select class="input" name="wd">' + wdOptions(1) + '</select>'), fld(L('time'), inTime('19:00'))) +
        fld(L('place'), inPlace('', L('phPlaceTraining'))) +
        '<button class="btn" type="submit">' + L('addRule') + '</button></form>';
    }
    b += S.rules.length ? '<ul class="list">' + S.rules.map(function (r) {
      if (S.edit === 'rule:' + r.id) {
        return editRow('edit-rule', r.id, grid(fld(L('weekday'), '<select class="input" name="wd">' + wdOptions(r.wd) + '</select>'), fld(L('time'), inTime(r.time))) + fld(L('place'), inPlace(r.place)));
      }
      return '<li><div class="l"><b>' + wdName(r.wd) + ', ' + esc(L('atTime', { time: r.time })) + '</b><span>' + esc(r.place) + '</span></div>' +
        '<div class="btnrow"><button type="button" class="mini" data-act="edit" data-target="rule:' + r.id + '">' + L('edit') + '</button>' +
        '<button type="button" class="mini del" data-act="del-rule" data-id="' + r.id + '">' + L('remove') + '</button></div></li>';
    }).join('') + '</ul>' : '<p class="muted">' + L('rulesEmpty') + '</p>';
    if (isAdm) html += accordion('rules', L('secRules'), S.rules.length, b, true, L('rulesIntro'));

    /* Weitere Trainings (zusätzliche Termine) */
    b = '';
    b += extras.length ? '<ul class="list scroll" data-sc="extras">' + extras.map(trRow).join('') + '</ul>' : '<p class="muted">' + L('extraEmpty') + '</p>';
    b += '<form class="addbox" data-form="extra">' + fld(L('label'), inTitle(L('extraDefaultTitle'))) +
      grid(fld(L('date'), '<input class="input" type="date" name="date" required>'), fld(L('time'), inTime('18:00'))) +
      fld(L('place'), inPlace('', L('phPlaceExtra'))) +
      '<button class="btn" type="submit">' + L('addExtra') + '</button></form>';
    if (isAdm) html += accordion('extra', L('secExtra'), extras.length, b, false, L('extraIntro'));

    /* Kommende Trainings (Termine der Serie) */
    b = series.length ? '<ul class="list scroll" data-sc="upcoming">' + series.map(trRow).join('') + '</ul>' : '<p class="muted">' + L('upcomingEmpty') + '</p>';
    if (isAdm) html += accordion('upcoming', L('secUpcoming'), series.length, b);

    /* Events */
    var evs = getEvents();
    b = '';
    if (S.add.events) {
      b += '<form class="addform" data-form="event">' + fld(L('label'), inTitle('', L('phEventTitle'))) +
        grid(fld(L('date'), '<input class="input" type="date" name="date" required>'), fld(L('time'), inTime('18:00'))) +
        fld(L('place'), inPlace('', L('phEventPlace'))) +
        fld('', '<label class="check"><input type="checkbox" name="rsvp"><span>' + L('rsvpRequired') + '</span></label>') +
        '<button class="btn" type="submit">' + L('addEvent') + '</button></form>';
    }
    b += evs.length ? '<ul class="list scroll" data-sc="events">' + evs.map(function (e) {
      if (S.edit === 'ev:' + e.id) {
        return editRow('edit-ev', e.id, fld(L('label'), inTitle(e.title)) + grid(fld(L('date'), inDate(e.date)), fld(L('time'), inTime(e.time))) + fld(L('place'), inPlace(e.place)) + fld('', '<label class="check"><input type="checkbox" name="rsvp"' + (e.rsvp ? ' checked' : '') + '><span>' + L('rsvpRequired') + '</span></label>'));
      }
      return '<li><div class="l"><b>' + esc(e.title) + '</b><span>' + esc(fmt(parseIso(e.date), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })) + ', ' + esc(e.time) + ', ' + esc(e.place) + (e.cancelled ? ' · ' + L('cancelledLow') : '') + '</span></div>' +
        '<div class="btnrow"><button type="button" class="mini" data-act="edit" data-target="ev:' + e.id + '">' + L('edit') + '</button>' +
        '<button type="button" class="mini" data-act="cancel-ev" data-id="' + e.id + '">' + (e.cancelled ? L('reactivate') : L('cancel')) + '</button>' +
        '<button type="button" class="mini del" data-act="del-ev" data-id="' + e.id + '">' + L('del') + '</button></div></li>';
    }).join('') + '</ul>' : '<p class="muted">' + L('eventsEmpty') + '</p>';
    if (isAdm || S.me.isEventManager) html += accordion('events', L('secEvents'), evs.length, b, true, L('subEvents'));

    /* Mitglieder */
    b = '';
    if (S.add.members) {
      b += '<form class="addform" data-form="member"><h3 style="margin-bottom:10px">' + L('memberAdd') + '</h3>' +
        fld(L('fullName'), '<input class="input" name="name" autocomplete="off" required>') +
        fld(L('phone'), phoneField('')) +
        '<p class="small muted" style="margin:-4px 0 12px">' + L('memberAddNote') + '</p>' +
        '<label class="check"><input type="checkbox" name="guest" value="1"><span>' + L('guestCheck') + '</span></label>' +
        '<button class="btn" type="submit">' + L('memberAdd') + '</button></form>';
    }
    var mbRow = function (m) {
      var self = m.id === S.me.id;
      return '<li class="mbrow">' +
        '<div class="l"><b>' + esc(m.name) + ' <span class="pinlamp ' + (m.pinChanged ? 'ok' : 'no') + '" title="' + esc(m.pinChanged ? L('pinLampOk') : L('pinLampNo')) + '" aria-label="' + esc(m.pinChanged ? L('pinLampOk') : L('pinLampNo')) + '"></span>' + (self ? ' <span class="mbyou">' + L('you') + '</span>' : '') + '</b><span>' + esc(fmtPhone(m.phone)) + '</span></div>' +
        '<span class="mbicons">' +
          (m.isAdmin ? '<span class="mbic adm" title="' + esc(L('adminTag')) + '" aria-label="' + esc(L('adminTag')) + '">' + ICON.gear + '</span>' : '') +
          (m.isEventManager ? '<span class="mbic em" title="' + esc(L('emTag')) + '" aria-label="' + esc(L('emTag')) + '">' + ICON.star + '</span>' : '') +
          (m.isChilbiManager ? '<span class="mbic em" title="' + esc(L('cmTag')) + '" aria-label="' + esc(L('cmTag')) + '">' + ICON.glass + '</span>' : '') +
          (m.isChraenzliManager ? '<span class="mbic em" title="' + esc(L('crmTag')) + '" aria-label="' + esc(L('crmTag')) + '">' + ICON.glass + '</span>' : '') +
          (m.isJassMaster ? '<span class="mbic jm" title="' + esc(L('jmTag')) + '" aria-label="' + esc(L('jmTag')) + '">' + ICON.trophy + '</span>' : '') +
        '</span>' +
        '<button type="button" class="ccdots" data-act="mb-menu" data-id="' + esc(m.id) + '" aria-label="' + esc(L('ccActions') + ': ' + m.name) + '" title="' + esc(L('ccActions')) + '">' + ICON.dots + '</button></li>';
    };
    var mbGroup = function (key, label, list, guestStyle, icon) {
      var open = S.sec[key] === true;
      return '<div class="mbgrp"><button type="button" class="mbgh" data-act="mb-grp" data-id="' + key + '" aria-expanded="' + open + '">' +
        '<span class="mbcrown' + (guestStyle ? ' g' : '') + '">' + (icon || ICON.crown) + '</span><span>' + label + ' <span class="cnt">(' + list.length + ')</span></span>' +
        '<span class="sp"></span><span class="ccfold' + (open ? ' open' : '') + '">' + ICON.chev + '</span></button>' +
        (open ? (list.length ? '<ul class="list">' + list.map(mbRow).join('') + '</ul>' : '<p class="ccsum" style="padding:6px 0 10px">' + L('nobody') + '</p>') : '') + '</div>';
    };
    // Fünf sich gegenseitig ausschliessende Gruppen; Reihenfolge der Prüfung = Priorität
    b += mbGroup('mg-a', L('grpActive'), S.members.filter(function (m) { return !m.isGuest && !m.isCandidate && !m.isPassive && !m.isSupporter; }), false, ICON.groupA) +
         mbGroup('mg-p', L('grpPassive'), S.members.filter(function (m) { return !m.isGuest && !m.isCandidate && m.isPassive && !m.isSupporter; }), false, ICON.groupP) +
         mbGroup('mg-s', L('grpSupporter'), S.members.filter(function (m) { return !m.isGuest && !m.isCandidate && m.isSupporter; }), true, ICON.heart) +
         mbGroup('mg-g', L('ccGuests'), S.members.filter(function (m) { return m.isGuest && !m.isCandidate; }), true, ICON.groupG) +
         mbGroup('mg-c', L('grpCandidate'), S.members.filter(function (m) { return m.isCandidate; }), true, ICON.candidate);
    if (isAdm) html += accordion('members', L('secMembers'), S.members.length, b, true, L('membersIntro'));
    return html;
  }

  // Eigene Gruppe (Aktiv/Passiv/Friends & Family/Gast/Kandidat) mit demselben Icon/Text wie
  // in der Admin-Mitgliederliste, damit die Profilseite immer zur echten Einordnung passt.
  function meGroupIcon() {
    return S.me.isCandidate ? ICON.candidate : S.me.isGuest ? ICON.groupG : S.me.isSupporter ? ICON.heart : S.me.isPassive ? ICON.groupP : ICON.groupA;
  }
  function meGroupLabel() {
    return L(S.me.isCandidate ? 'grpCandidate' : S.me.isGuest ? 'ccGuests' : S.me.isSupporter ? 'grpSupporter' : S.me.isPassive ? 'grpPassive' : 'grpActive');
  }

  function viewProfile() {
    var iosHint = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
    var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    var install = '';
    if (!standalone) {
      if (installPrompt) install = '<section class="panel"><h2>' + L('installTitle') + '</h2><p>' + L('installHint') + '</p><button type="button" class="btn" data-act="install">' + L('installBtn') + '</button></section>';
      else if (iosHint) install = '<section class="panel"><h2>' + L('installTitle') + '</h2><p>' + L('installIos') + '</p></section>';
    }
    return '<div class="top"><div><h1 class="pagetitle">' + L('profileTitle') + '</h1></div></div>' +
      '<section class="panel"><div class="profile-row"><span class="muted">' + L('nameLabel') + '</span><b>' + esc(S.me.name) + '</b></div>' +
      '<div class="profile-row"><span class="muted">' + L('phone') + '</span><b>' + esc(fmtPhone(S.me.phone)) + '</b></div></section>' +
      '<section class="panel"><h2>' + L('rolesTitle') + '</h2>' +
        '<div class="rolerow"><span class="mbcrown" style="width:40px;height:40px">' + meGroupIcon() + '</span><span>' + meGroupLabel() + '</span></div>' +
        (S.me.isAdmin ? '<div class="rolerow"><span class="rolebtn star on">' + ICON.gear + '</span><span>' + L('adminTag') + '</span></div>' : '') +
        (S.me.isEventManager ? '<div class="rolerow"><span class="rolebtn glass on">' + ICON.star + '</span><span>' + L('emTag') + '</span></div>' : '') +
        (S.me.isChilbiManager ? '<div class="rolerow"><span class="rolebtn glass on">' + ICON.glass + '</span><span>' + L('cmTag') + '</span></div>' : '') +
        (S.me.isChraenzliManager ? '<div class="rolerow"><span class="rolebtn glass on">' + ICON.glass + '</span><span>' + L('crmTag') + '</span></div>' : '') +
        (S.me.isJassMaster ? '<div class="rolerow"><span class="rolebtn glass on">' + ICON.trophy + '</span><span>' + L('jmTag') + '</span></div>' : '') +
        (S.me.isGuest ? '<p class="small muted" style="margin:10px 0 0">' + L('guestInfo') + '</p>' : '') +
        (S.me.isSupporter ? '<p class="small muted" style="margin:10px 0 0">' + L('supporterInfo') + '</p>' : '') +
      '</section>' +
      '<section class="panel"><h2>' + L('language') + '</h2><p>' + L('languageHint') + '</p>' + langSelect() + '</section>' +
      '<section class="panel"><h2>' + L('themeTitle') + '</h2><p>' + L('themeHint') + '</p>' + themeSelect() + '</section>' +
      install +
      '<section class="panel"><h2>' + L('nameChange') + '</h2><form data-form="name">' + fld(L('fullName'), '<input class="input" name="name" value="' + esc(S.me.name) + '" required>') +
      '<button class="btn" type="submit">' + L('nameSave') + '</button></form></section>' +
      '<section class="panel"><h2>' + L('pinChange') + '</h2><p>' + L('pinIntro') + '</p><form data-form="pin">' +
      fld(L('pinNew'), '<input class="input pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" required>') +
      '<button class="btn" type="submit">' + L('pinSave') + '</button></form>' +
      '<button type="button" class="linkbtn" data-act="pin-default" style="margin-top:10px">' + L('pinDefault') + '</button></section>' +
      '<button type="button" class="btn dangerbtn" data-act="logout">' + ICON.logout + L('logout') + '</button>';
  }

  function renderNav() {
    var nav = document.getElementById('nav');
    if (S.step !== 'app' || (S.me && S.me.isCandidate)) { nav.hidden = true; return; }
    nav.hidden = false;
    // Admin ist immer von der Einschränkung ausgenommen (z. B. falls ein Admin zusätzlich bei
    // Gast/Friends and Family eingeteilt ist). Gast & Friends and Family: nur Trainings und Profil.
    var restricted = (S.me.isGuest || S.me.isSupporter) && !S.me.isAdmin;
    var noJass = S.me.isGuest && !S.me.isAdmin;   // Jass bleibt für Friends and Family zusätzlich sichtbar
    var tabs = [{ id: 'trainings', label: L('navTrainings'), icon: ICON.dumbbell }];
    if (!restricted) tabs.push({ id: 'events', label: L('navEvents'), icon: ICON.star });
    if (!noJass) tabs.push({ id: 'jass', label: L('navJass'), icon: ICON.trophy });
    if (!restricted && (canCC() || S.ccPublic)) tabs.push({ id: 'cc', label: L('navCC'), icon: ICON.glass });
    if (S.me.isAdmin) tabs.push({ id: 'admin', label: L('navAdmin'), icon: ICON.gear });
    tabs.push({ id: 'profile', label: L('navProfile'), icon: ICON.user });
    nav.innerHTML = '<div class="in">' + tabs.map(function (t) {
      return '<button type="button" class="tab" data-act="tab" data-tab="' + t.id + '"' + (S.tab === t.id ? ' aria-current="page"' : '') + '>' + t.icon + '<span>' + t.label + '</span></button>';
    }).join('') + '</div>';
  }

  function render() {
    var app = document.getElementById('app');
    var y = window.scrollY;
    var lts = {};
    document.querySelectorAll('.list.scroll').forEach(function (x) { lts[x.dataset.sc] = x.scrollTop; });
    if (S.step === 'setup') app.innerHTML = viewSetup();
    else if (S.step === 'loading') app.innerHTML = '<div class="login"><p class="muted">' + L('loading') + '</p></div>';
    else if (S.step === 'login') app.innerHTML = viewLogin();
    else if (S.me && S.me.isCandidate) {
      app.innerHTML = viewCandidate();
      renderNav();
      window.scrollTo(0, y);
      return;
    }
    else {
      if (S.tab === 'admin' && !S.me.isAdmin) S.tab = 'trainings';
      if ((S.tab === 'events' || S.tab === 'cc') && (S.me.isGuest || S.me.isSupporter) && !S.me.isAdmin) S.tab = 'trainings';
      if (S.tab === 'jass' && S.me.isGuest && !S.me.isAdmin) S.tab = 'trainings';
      if (S.tab === 'cc' && !(canCC() || S.ccPublic)) S.tab = 'trainings';
      var pageHtml = S.tab === 'jass' ? viewJass() : S.tab === 'cc' ? viewCC() : S.tab === 'admin' ? viewAdmin() : S.tab === 'events' ? viewEvents() : S.tab === 'profile' ? viewProfile() : viewTrainings();
      // PIN-Banner: nur für Aktiv-/Passivmitglieder (nicht Gast, Supporter, Kandidat, Admin) ohne gesetzten PIN
      var pinBanner = '';
      if (S.me && !S.me.pinChanged && !S.me.isAdmin && !S.me.isGuest && !S.me.isSupporter && !S.me.isCandidate) {
        pinBanner = '<div class="pinbanner" role="alert">' +
          '<span>' + esc(L('pinBannerMsg')) + '</span>' +
          '<button type="button" class="btn inline" data-act="tab" data-tab="profile">' + esc(L('pinBannerBtn')) + '</button>' +
          '</div>';
      }
      app.innerHTML = pinBanner + pageHtml;
    }
    renderNav();
    fitTitles();
    window.scrollTo(0, y);
    document.querySelectorAll('.list.scroll').forEach(function (x) { if (lts[x.dataset.sc]) x.scrollTop = lts[x.dataset.sc]; });
  }

  // Seitentitel verkleinern, bis sie auf einer Zeile Platz haben (statt umzubrechen)
  function fitTitles() {
    document.querySelectorAll('.pagetitle').forEach(function (el) {
      el.style.fontSize = '';
      var max = parseFloat(getComputedStyle(el).fontSize);
      var min = 15;   // Minimalgrösse in px, darunter lieber nicht weiter schrumpfen
      var size = max;
      while (el.scrollWidth > el.clientWidth + 1 && size > min) {
        size -= 1;
        el.style.fontSize = size + 'px';
      }
    });
  }

  // Aktualisiert im Hintergrund, ohne eine laufende Eingabe zu stören
  function softRender() {
    var a = document.activeElement;
    if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && document.getElementById('app').contains(a)) return;
    render();
  }

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.toggle('nonav', S.step !== 'app');
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ---------- C&C: Chränzli und Chilbi ---------- */
  // Anlass > Tag > Schicht > Rolle. Sichtbar für Admins und Event-Manager.
  function canCC() { return !!(S.me && (S.me.isAdmin || S.me.isChilbiManager || S.me.isChraenzliManager)); }
  function canManageEvents() { return !!(S.me && (S.me.isAdmin || S.me.isEventManager)); }
  function ccNorm(n) { return String(n || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function ccMap() { var m = {}; S.members.forEach(function (p) { m[ccNorm(p.name)] = p; }); return m; }
  function ccMember(id) { return S.members.filter(function (x) { return x.id === id; })[0] || null; }

  // Person auflösen: über die ID oder den Namen einem Mitglied/Gast zuordnen, sonst «Andere»
  function ccResolve(pe, map) {
    var p = pe.id ? ccMember(pe.id) : null;
    if (!p && pe.name) p = map[ccNorm(pe.name)] || null;
    if (p) return { name: p.name, kind: p.isGuest ? 'g' : 'm', id: p.id };
    return { name: pe.name || '?', kind: 'x', id: null };
  }
  function ccKindLabel(k) { return k === 'm' ? L('ccMembers') : k === 'g' ? L('ccGuests') : L('ccOthers'); }
  function ccChip(pe, map) {
    var r = ccResolve(pe, map);
    var tap = r.kind === 'x' && S.me.isAdmin;   // Admins können «Andere» als Gast übernehmen
    var inner = esc(r.name);
    var title = esc(r.name + ' · ' + ccKindLabel(r.kind));
    return tap
      ? '<button type="button" class="ccp cc-x" data-act="cc-guest" data-name="' + esc(r.name) + '" title="' + title + '">' + inner + '</button>'
      : '<span class="ccp cc-' + r.kind + '" title="' + title + '">' + inner + '</span>';
  }
  function ccDate(isoDay) {
    var d = parseIso(isoDay);
    return fmt(d, { weekday: 'short' }).replace(/\.$/, '') + ' ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
  }
  function ccOvernight(s) { return s.end_time <= s.start_time; }
  function ccEndKey(s) { return (ccOvernight(s) ? '1' : '0') + s.end_time; }   // Ende am Folgetag kommt nach allen Enden am selben Tag
  function ccTimePlain(s) { return s.start_time + ' – ' + s.end_time; }
  function ccTime(s) { return esc(ccTimePlain(s)); }
  function ccAddDays(isoDay, n) { var d = parseIso(isoDay); d.setDate(d.getDate() + n); return iso(d); }
  function ccByCreated(a, b) { return String(a.created_at || '') < String(b.created_at || '') ? -1 : String(a.created_at || '') > String(b.created_at || '') ? 1 : 0; }

  function ccTree() {
    var C = S.cc;
    return C.events.slice().sort(ccByCreated).map(function (e) {
      var days = C.days.filter(function (d) { return d.event_id === e.id; })
        .sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : ccByCreated(a, b); })
        .map(function (d) {
          var shifts = C.shifts.filter(function (s) { return s.day_id === d.id; })
            .sort(function (a, b) { var ea = ccEndKey(a), eb = ccEndKey(b); return a.start_time < b.start_time ? -1 : a.start_time > b.start_time ? 1 : (ea < eb ? -1 : ea > eb ? 1 : ccByCreated(a, b)); })
            .map(function (s) {
              return { s: s, roles: C.roles.filter(function (r) { return r.shift_id === s.id; }).sort(function (a, b) { return (a.sort - b.sort) || ccByCreated(a, b); }) };
            });
          return { d: d, shifts: shifts };
        });
      return { e: e, days: days };
    });
  }
  function ccIsFolded(id) {
    if (S.ccFold[id] != null) return S.ccFold[id];
    var e = S.cc.events.filter(function (x) { return x.id === id; })[0];
    return e ? !e.active : false;   // inaktive Anlässe starten eingeklappt
  }
  function ccDots(lvl, id, label) {
    return '<button type="button" class="ccdots" data-act="cc-menu" data-lvl="' + lvl + '"' + (id ? ' data-id="' + esc(id) + '"' : '') +
      ' aria-label="' + esc(L('ccActions') + (label ? ': ' + label : '')) + '" title="' + esc(L('ccActions')) + '">' + ICON.dots + '</button>';
  }

  /* ---------- C&C: Einsatzplan als PDF teilen ---------- */
  var LOGO_DATAURL = null;
  async function ensureLogoDataUrl() {
    if (LOGO_DATAURL) return LOGO_DATAURL;
    try {
      var resp = await fetch('icons/logo.png');
      var blob = await resp.blob();
      LOGO_DATAURL = await new Promise(function (res, rej) {
        var fr = new FileReader();
        fr.onload = function () { res(fr.result); };
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      });
    } catch (e) { LOGO_DATAURL = null; }
    return LOGO_DATAURL;
  }

  async function ccExportPdf(eventId) {
    var ev = S.cc.events.filter(function (x) { return x.id === eventId; })[0];
    if (!ev || !window.jspdf) { toast(L('ccPdfFailed')); return; }
    toast(L('ccPdfBuilding'));

    var days = S.cc.days.filter(function (d) { return d.event_id === eventId; })
      .sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : 0; });
    var dayData = days.map(function (d) {
      var shifts = S.cc.shifts.filter(function (s) { return s.day_id === d.id; })
        .sort(function (a, b) { return a.start_time < b.start_time ? -1 : a.start_time > b.start_time ? 1 : 0; })
        .map(function (s) {
          var roles = S.cc.roles.filter(function (r) { return r.shift_id === s.id; })
            .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
          return { s: s, roles: roles };
        });
      return { d: d, shifts: shifts };
    });

    // Chilbi- bzw. Chränzli Manager ermitteln (ohne Admins)
    var nameLower = (ev.name || '').toLowerCase();
    var wantChilbi = nameLower.indexOf('chilbi') > -1;
    var wantChraenzli = nameLower.indexOf('chränzli') > -1 || nameLower.indexOf('chraenzli') > -1;
    var mgrs = S.members.filter(function (m) {
      if (m.isAdmin) return false;
      if (wantChilbi && m.isChilbiManager) return true;
      if (wantChraenzli && m.isChraenzliManager) return true;
      if (!wantChilbi && !wantChraenzli && (m.isChilbiManager || m.isChraenzliManager)) return true;
      return false;
    }).map(function (m) { return m.name; });
    var mgrLabel = (wantChilbi ? L('cmTag') : wantChraenzli ? L('crmTag') : L('ccActions')) + ': ' + (mgrs.length ? mgrs.join(', ') : '\u2013');

    var jsPDFCtor = window.jspdf.jsPDF;
    var doc = new jsPDFCtor({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    var PAGE_W = doc.internal.pageSize.getWidth(), PAGE_H = doc.internal.pageSize.getHeight();
    var MARGIN = 12, GAP = 8, COLW = (PAGE_W - 2 * MARGIN - GAP) / 2;
    var BLUE = [48, 124, 192], BLUE_DARK = [11, 47, 94], BLUE_SOFT = [227, 239, 249], GREY = [93, 103, 122], INK = [22, 35, 59], LINE = [218, 222, 214];

    function wrap(text, size, maxW, style) {
      doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size);
      return doc.splitTextToSize(String(text), maxW);
    }
    function dateLabel(isoDay, name) {
      var d = parseIso(isoDay);
      var wd = fmt(d, { weekday: 'long' });
      var s = wd + ', ' + z2(d.getDate()) + '.' + z2(d.getMonth() + 1) + '.' + d.getFullYear();
      return name ? s + ' (' + name + ')' : s;
    }
    function measureCard(day, w) {
      var titleLines = wrap(dateLabel(day.d.day, day.d.name), 12.5, w - 10, 'bold');
      var h = 9.5 + (titleLines.length - 1) * 5 + 3;
      var valueW = w - 44;
      day.shifts.forEach(function (sh) {
        var t = sh.s.start_time + '\u2013' + sh.s.end_time + (sh.s.name ? '  \u2013  ' + sh.s.name : '');
        h += wrap(t, 9.3, w - 8, 'bold').length * 4.8;
        sh.roles.forEach(function (r) {
          var nm = (r.persons || []).map(function (p) { return p.name; }).join(', ') || '\u2013';
          h += Math.max(wrap(nm, 9.3, valueW, 'normal').length, 1) * 4.3;
        });
        h += 2;
      });
      return h + 3.5;
    }
    function drawCard(day, x, yTop, w) {
      // jsPDF zählt Y nach unten (0 = oben); die Karte wächst daher von yTop aus nach unten.
      var h = measureCard(day, w), yBottom = yTop + h;
      doc.setFillColor(255, 255, 255); doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.3);
      doc.roundedRect(x, yTop, w, h, 3, 3, 'FD');
      var titleLines = wrap(dateLabel(day.d.day, day.d.name), 12.5, w - 10, 'bold');
      var headH = 9.5 + (titleLines.length - 1) * 5;
      doc.setFillColor(BLUE_SOFT[0], BLUE_SOFT[1], BLUE_SOFT[2]);
      doc.roundedRect(x, yTop, w, headH, 3, 3, 'F');
      doc.rect(x, yTop + headH / 2, w, headH / 2, 'F');
      doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5);
      var ty = yTop + 5.5;
      titleLines.forEach(function (ln) { doc.text(ln, x + 5, ty); ty += 5; });
      var cy = yTop + headH + 5, valueW = w - 44;
      day.shifts.forEach(function (sh) {
        var t = sh.s.start_time + '\u2013' + sh.s.end_time + (sh.s.name ? '  \u2013  ' + sh.s.name : '');
        doc.setTextColor(INK[0], INK[1], INK[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.3);
        wrap(t, 9.3, w - 8, 'bold').forEach(function (ln) { doc.text(ln, x + 5, cy); cy += 4.8; });
        sh.roles.forEach(function (r) {
          var nm = (r.persons || []).map(function (p) { return p.name; }).join(', ') || '\u2013';
          doc.setTextColor(GREY[0], GREY[1], GREY[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.6);
          doc.text(String(r.name) + ':', x + 8, cy);
          doc.setTextColor(INK[0], INK[1], INK[2]); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.3);
          var ty2 = cy;
          wrap(nm, 9.3, valueW, 'normal').forEach(function (ln) { doc.text(ln, x + 44, ty2); ty2 += 4.3; });
          cy = ty2;
        });
        cy += 2;
      });
      return yBottom;
    }

    // Spalten chronologisch ausbalanciert befüllen
    var heights = dayData.map(function (d) { return measureCard(d, COLW); });
    var total = heights.reduce(function (a, b) { return a + b; }, 0) + dayData.length * 6;
    var target = total / 2, cols = [[], []], curH = 0, curCol = 0;
    dayData.forEach(function (d, i) {
      if (curCol === 0 && curH > target && cols[0].length) { curCol = 1; curH = 0; }
      cols[curCol].push(d); curH += heights[i] + 6;
    });

    var logo = await ensureLogoDataUrl();
    function drawHeader() {
      doc.setFillColor(BLUE_DARK[0], BLUE_DARK[1], BLUE_DARK[2]);
      doc.rect(0, 0, PAGE_W, 24, 'F');
      if (logo) { try { doc.addImage(logo, 'PNG', MARGIN, 4, 13.5, 15.5); } catch (e) { /* Logo optional */ } }
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
      doc.text('Einsatzplan \u00b7 ' + ev.name, MARGIN + 18, 11.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(207, 224, 242);
      doc.text(mgrLabel, MARGIN + 18, 17);
      doc.text('Version', PAGE_W - MARGIN, 9.5, { align: 'right' });
      doc.text(fullDate(new Date()).split(', ')[1] || '', PAGE_W - MARGIN, 14, { align: 'right' });
    }
    function drawFooter() {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(ev.name, MARGIN, PAGE_H - 6);
      doc.text('Seite 1', PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
    }

    drawHeader();
    if (!dayData.length) {
      doc.setTextColor(GREY[0], GREY[1], GREY[2]); doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      doc.text(L('ccNoDays'), MARGIN, PAGE_H / 2);
    } else {
      var colX = [MARGIN, MARGIN + COLW + GAP];
      var colY = [30, 30];
      for (var ci = 0; ci < 2; ci++) {
        cols[ci].forEach(function (day) { colY[ci] = drawCard(day, colX[ci], colY[ci], COLW) + 6; });
      }
    }
    drawFooter();

    var fname = 'Einsatzplan_' + String(ev.name).replace(/[^\w\u00C0-\u017F]+/g, '_') + '.pdf';
    var blob = doc.output('blob');
    try {
      var file = new File([blob], fname, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Einsatzplan ' + ev.name });
        return;
      }
    } catch (e) { /* Teilen abgebrochen oder nicht verfügbar: als Download anbieten */ }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function viewCC() {
    var map = ccMap(), ed = canCC();
    var html = '<div class="top"><div><h1 class="pagetitle">' + L('titleCC') + '</h1></div></div>';
    // ccPublic-Toggle entfernt auf Wunsch (war: «Für alle Aktiv- und Passivmitglieder sichtbar»)
    if (S.ccErr) return html + '<div class="empty"><p>' + L('ccSetup') + '</p></div>';
    var tree = ccTree();
    if (!tree.length) return html + '<div class="empty"><p>' + L('ccEmpty') + '</p>' + (ed ? '<button type="button" class="btn inline" data-act="cc-addevent" style="margin-top:12px">' + L('ccAddEvent') + '</button>' : '') + '</div>';
    tree.forEach(function (E) {
      var e = E.e, folded = ccIsFolded(e.id);
      html += '<section class="ccel' + (e.active ? '' : ' ccoff') + '"><div class="cceh">' +
        (ed ? '<input type="checkbox" class="ccck" data-ccactive="' + esc(e.id) + '"' + (e.active ? ' checked' : '') + ' aria-label="' + esc(e.name + ': ' + L('ccActive')) + '" title="' + esc(L('ccActive')) + '">' : '') +
        '<button type="button" class="cct" data-act="cc-fold" data-id="' + esc(e.id) + '" aria-expanded="' + !folded + '">' + esc(e.name) + '</button>' +
        (ed ? ccDots('event', e.id, e.name) : '') +
        '<button type="button" class="ccdots" data-act="cc-print" data-id="' + esc(e.id) + '" aria-label="' + esc(L('ccPrint') + ': ' + e.name) + '" title="' + esc(L('ccPrint')) + '">' + ICON.print + '</button>' +
        '<button type="button" class="ccfold' + (folded ? '' : ' open') + '" data-act="cc-fold" data-id="' + esc(e.id) + '" aria-expanded="' + !folded + '" aria-label="' + esc(e.name) + '">' + ICON.chev + '</button></div>';
      if (!folded) {
        html += '<div class="ccbody">';
        if (!E.days.length) html += '<p class="ccsum" style="padding-top:10px">' + L('ccNoDays') + '</p>';
        E.days.forEach(function (D) {
          var d = D.d, df = !!S.ccFold[d.id];
          var nRoles = D.shifts.reduce(function (n, x) { return n + x.roles.length; }, 0);
          var dayLabel = ccDate(d.day) + (d.name ? ' – ' + d.name : '');
          html += '<div class="ccday"><div class="ccdh">' +
            '<button type="button" class="ccdt" data-act="cc-fold" data-id="' + esc(d.id) + '" aria-expanded="' + !df + '"><b>' + esc(ccDate(d.day)) + (d.name ? ' - ' + esc(d.name) : '') + '</b></button>' +
            (ed ? ccDots('day', d.id, dayLabel) : '') +
            '<button type="button" class="ccfold ccfold-day' + (df ? '' : ' open') + '" data-act="cc-fold" data-id="' + esc(d.id) + '" aria-expanded="' + !df + '" aria-label="' + esc(dayLabel) + '">' + ICON.chev + '</button></div>';
          if (df) {
            html += '<div class="ccsum">' + L('ccSummary', { s: D.shifts.length, r: nRoles }) + '</div>';
          } else {
            D.shifts.forEach(function (Sh) {
              var s = Sh.s;
              html += '<div class="ccsh"><div class="ccshh">' + ICON.clock + '<span class="cctm">' + ccTime(s) + '</span>' +
                (s.name ? '<span class="ccsn">' + esc(s.name) + '</span>' : '') + '<span class="sp"></span>' +
                (ed ? ccDots('shift', s.id, ccTimePlain(s)) : '') + '</div>';
              Sh.roles.forEach(function (r) {
                var ps = Array.isArray(r.persons) ? r.persons : [];
                html += '<div class="ccro"><span class="ccrn">' + esc(r.name) + '</span><span class="ccps">' +
                  (ps.length ? ps.map(function (p) { return ccChip(p, map); }).join('') : '<span class="ccsum">' + L('ccNobody') + '</span>') +
                  '</span>' + (ed ? ccDots('role', r.id, r.name) : '') + '</div>';
              });
              html += '</div>';
            });
          }
          html += '</div>';
        });
        html += '</div>';
      }
      html += '</section>';
    });
    return html;
  }

  /* ---------- C&C: Aktionsfenster ---------- */
  var ccSheet = null;   // { lvl, id, mode, persons, name }
  var CC_TABLE = { event: 'cc_events', day: 'cc_days', shift: 'cc_shifts', role: 'cc_roles' };
  var CC_SUB = { root: 'event', event: 'day', day: 'shift', shift: 'role' };
  var CC_LVL = { root: 'ccLvlAll', event: 'ccLvlEvent', day: 'ccLvlDay', shift: 'ccLvlShift', role: 'ccLvlRole' };
  var CC_ADD = { event: 'ccAddEvent', day: 'ccAddDay', shift: 'ccAddShift', role: 'ccAddRole' };
  var CC_LIST = { event: 'events', day: 'days', shift: 'shifts', role: 'roles' };

  function ccObj(lvl, id) {
    var list = CC_LIST[lvl] ? S.cc[CC_LIST[lvl]] : null;
    return list ? list.filter(function (x) { return x.id === id; })[0] || null : null;
  }
  function ccTitle(lvl, o) {
    if (lvl === 'root') return L('ccLvlAll');
    if (!o) return '';
    if (lvl === 'event') return o.name;
    if (lvl === 'day') return ccDate(o.day) + (o.name ? ' – ' + o.name : '');
    if (lvl === 'shift') return ccTimePlain(o) + (o.name ? ' – ' + o.name : '');
    return o.name;
  }
  function ccOpen(lvl, id, mode, extra) {
    ccSheet = { lvl: lvl, id: id || null, mode: mode || 'menu' };
    if (extra) for (var k in extra) ccSheet[k] = extra[k];
    ccDrawSheet();
  }
  function ccKey(e) { if (e.key === 'Escape' && !document.getElementById('dlg')) { e.preventDefault(); ccCloseSheet(); } }
  function ccCloseSheet() {
    var el = document.getElementById('ccsheet');
    if (el) el.remove();
    ccSheet = null;
    document.removeEventListener('keydown', ccKey, true);
  }
  function ccActBtn(a, icon, label, cls) {
    return '<button type="button" class="ccact' + (cls ? ' ' + cls : '') + '" data-cca="' + a + '">' + icon + '<span>' + label + '</span></button>';
  }
  function ccBtns(saveLabel) {
    return '<p class="err" data-ccerr hidden></p><div class="dlgbtns">' +
      '<button type="button" class="btn ghost inline" data-cca="close">' + L('dismiss') + '</button>' +
      '<button type="submit" class="btn inline">' + (saveLabel || L('save')) + '</button></div>';
  }

  function ccForm(kind, o, isNew) {
    var h = '<p class="cck">' + L(CC_LVL[kind]) + '</p><h3>' + esc(isNew ? L(CC_ADD[kind]) : ccTitle(kind, o)) + '</h3>' +
      '<form data-ccform="' + kind + '" novalidate>';
    if (kind === 'event') {
      h += fld(L('nameLabel'), '<input class="input" name="name" value="' + esc(o ? o.name : '') + '" placeholder="Chilbi 2028" required>') +
        '<label class="check"><input type="checkbox" name="active"' + (!o || o.active ? ' checked' : '') + '><span>' + L('ccActive') + '</span></label>';
    } else if (kind === 'day') {
      h += grid(fld(L('date'), '<input class="input" type="date" name="date" value="' + esc(o ? o.day : '') + '" required>'),
                fld(L('ccNameOpt'), '<input class="input" name="name" value="' + esc(o && o.name ? o.name : '') + '" placeholder="Premiere">'));
    } else if (kind === 'shift') {
      h += grid(fld(L('ccStart'), '<input class="input" type="time" name="start" value="' + esc(o ? o.start_time : '') + '" required>'),
                fld(L('ccEnd'), '<input class="input" type="time" name="end" value="' + esc(o ? o.end_time : '') + '" required>')) +
        fld(L('ccNameOpt'), '<input class="input" name="name" value="' + esc(o && o.name ? o.name : '') + '" placeholder="Abendschicht">');
    } else if (kind === 'role') {
      h += fld(L('nameLabel'), '<input class="input" name="name" value="' + esc(o ? o.name : '') + '" placeholder="Bar" required>') +
        '<span class="cclabel">' + L('ccPersons') + '</span><div class="ccsel" id="ccsel"></div>' +
        '<input class="input" name="q" placeholder="' + esc(L('ccSearch')) + '" autocomplete="off">' +
        '<div class="ccplist" id="ccplist"></div>' +
        '<span class="cclabel">' + L('ccOtherPerson') + '</span>' +
        '<div class="ccother"><input class="input" name="other" autocomplete="off"><button type="button" class="btn ghost inline" data-cca="other">' + L('ccAdd') + '</button></div>' +
        '<div class="ccsug" id="ccsug"></div><div style="height:14px"></div>';
    }
    return h + ccBtns() + '</form>';
  }
  function ccCopyForm(lvl, o) {
    var h = '<p class="cck">' + L(CC_LVL[lvl]) + '</p><h3>' + L('ccCopy') + ': ' + esc(ccTitle(lvl, o)) + '</h3><form data-ccform="copy-' + lvl + '" novalidate>';
    if (lvl === 'event') {
      var nn = /\b(19|20)\d{2}\b/.test(o.name) ? o.name.replace(/\b((19|20)\d{2})\b/, function (y) { return String(Number(y) + 1); }) : o.name + ' (' + L('ccCopySuffix') + ')';
      h += fld(L('nameLabel'), '<input class="input" name="name" value="' + esc(nn) + '" required>') + '<p class="ccnote">' + L('ccCopyEventNote') + '</p>';
    } else {
      h += grid(fld(L('date'), '<input class="input" type="date" name="date" value="' + esc(ccAddDays(o.day, 1)) + '" required>'),
                fld(L('ccNameOpt'), '<input class="input" name="name" value="' + esc(o.name || '') + '">')) + '<p class="ccnote">' + L('ccCopyDayNote') + '</p>';
    }
    return h + ccBtns(L('ccCopy')) + '</form>';
  }
  function ccGuestForm(name) {
    return '<p class="cck">' + L('ccOthers') + '</p><h3>' + esc(name) + '</h3><p class="ccnote" style="margin-top:0">' + L('ccNotInApp', { name: name }) + '</p>' +
      '<form data-ccform="guest" novalidate>' +
      fld(L('fullName'), '<input class="input" name="name" value="' + esc(name) + '" required>') +
      fld(L('phone'), phoneField('')) +
      ccBtns(L('ccAsGuest')) + '</form>';
  }

  function ccDrawSheet() {
    var st = ccSheet;
    if (!st) return;
    var o = st.lvl === 'root' || st.lvl === 'guest' ? null : ccObj(st.lvl, st.id);
    if (st.lvl !== 'root' && st.lvl !== 'guest' && !o) { ccCloseSheet(); return; }   // inzwischen gelöscht
    var body;
    if (st.mode === 'menu') {
      var sub = CC_SUB[st.lvl];
      body = '<p class="cck">' + L(CC_LVL[st.lvl]) + '</p><h3>' + esc(ccTitle(st.lvl, o)) + '</h3>' +
        (st.lvl !== 'root' ? ccActBtn('edit', ICON.pencil, L('ccChange')) + ccActBtn('copy', ICON.copy, L('ccCopy')) : '') +
        (sub ? ccActBtn('add', ICON.plus, L(CC_ADD[sub])) : '') +
        (st.lvl === 'event' ? ccActBtn('addevent', ICON.plus, L('ccAddEvent')) : '') +
        (st.lvl !== 'root' ? ccActBtn('del', ICON.trash, L('del'), 'del') : '') +
        '<button type="button" class="ccact close" data-cca="close">' + L('ccClose') + '</button>';
    } else if (st.mode === 'edit') body = ccForm(st.lvl, o, false);
    else if (st.mode === 'add') body = ccForm(CC_SUB[st.lvl], null, true);
    else if (st.mode === 'copy') body = ccCopyForm(st.lvl, o);
    else body = ccGuestForm(st.name || '');

    var wrap = document.getElementById('ccsheet');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'ccsheet';
      wrap.className = 'ccsheet';
      wrap.addEventListener('click', ccSheetClick);
      wrap.addEventListener('submit', ccSheetSubmit);
      wrap.addEventListener('input', ccSheetInput);
      wrap.addEventListener('change', ccSheetChange);
      document.body.appendChild(wrap);
      document.addEventListener('keydown', ccKey, true);
    }
    wrap.innerHTML = '<div class="ccsheetcard" role="dialog" aria-modal="true" aria-label="' + esc(L(CC_LVL[st.lvl] || 'ccOthers')) + '">' + body + '</div>';
    if (st.mode === 'edit' && st.lvl === 'role' || st.mode === 'add' && CC_SUB[st.lvl] === 'role') { ccDrawSel(); ccDrawList(); }
    var first = wrap.querySelector('form .input');
    if (first) { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }
    else { var b = wrap.querySelector('button'); if (b) b.focus(); }
  }

  /* Personen-Auswahl in einer Rolle */
  function ccChosenIds() {
    var map = ccMap();
    return ccSheet.persons.map(function (p) { return ccResolve(p, map).id; }).filter(Boolean);
  }
  function ccDrawSel() {
    var box = document.getElementById('ccsel');
    if (!box) return;
    var map = ccMap();
    box.innerHTML = ccSheet.persons.length ? ccSheet.persons.map(function (p, i) {
      var r = ccResolve(p, map);
      return '<span class="ccp cc-' + r.kind + '">' + esc(r.name) +
        '<button type="button" class="ccx" data-cca="rm" data-i="' + i + '" aria-label="' + esc(L('remove') + ': ' + r.name) + '">×</button></span>';
    }).join('') : '<span class="ccsum">' + L('ccNobody') + '</span>';
  }
  function ccDrawList() {
    var box = document.getElementById('ccplist');
    if (!box) return;
    var q = ccNorm(ccSheet.q || '');
    var chosen = ccChosenIds();
    var list = S.members.filter(function (m) { return !m.isCandidate && (!q || ccNorm(m.name).indexOf(q) > -1); });
    box.innerHTML = list.length ? list.map(function (m) {
      var k = m.isGuest ? 'g' : 'm';
      return '<label class="ccpick"><span class="ccp cc-' + k + '">' + esc(m.name) + '</span>' +
        '<input type="checkbox" data-ccpick="' + esc(m.id) + '"' + (chosen.indexOf(m.id) > -1 ? ' checked' : '') + ' aria-label="' + esc(m.name) + '"></label>';
    }).join('') : '<p class="ccsum" style="padding:10px 12px;margin:0">' + L('nobody') + '</p>';
  }
  // Ähnliche Namen finden, z. B. «Dani» und «Daniel Oetterli» oder «Ruedi» und «Ruedi Bachmann»
  function ccSimilar(a, b) {
    var x = ccNorm(a).split(' '), y = ccNorm(b).split(' ');
    if (!x[0] || ccNorm(a) === ccNorm(b)) return false;
    if (x.length > 1 && y.length > 1 && x[x.length - 1] === y[y.length - 1]) return x[0].slice(0, 3) === y[0].slice(0, 3);
    if (x.length === 1) return y[0] === x[0];
    return false;
  }
  function ccDrawSug(val) {
    var box = document.getElementById('ccsug');
    if (!box) return;
    var v = String(val || '').trim();
    var hits = v.length < 2 ? [] : S.members.filter(function (m) { return ccSimilar(v, m.name); }).slice(0, 3);
    box.innerHTML = hits.map(function (m) {
      return '<div>' + esc(L('ccDidYouMean', { name: m.name })) + '<button type="button" class="btn ghost inline" data-cca="usesug" data-id="' + esc(m.id) + '">' + L('ccAdd') + '</button></div>';
    }).join('');
  }
  function ccAddPerson(pe) {
    var map = ccMap(), r = ccResolve(pe, map);
    var dup = ccSheet.persons.some(function (p) { var q = ccResolve(p, map); return r.id ? q.id === r.id : ccNorm(q.name) === ccNorm(r.name); });
    if (!dup) ccSheet.persons.push(r.id ? { id: r.id, name: r.name } : { name: r.name });
  }

  function ccSheetInput(e) {
    var t = e.target;
    if (t.name === 'q') { ccSheet.q = t.value; ccDrawList(); }
    else if (t.name === 'other') ccDrawSug(t.value);
  }
  function ccSheetChange(e) {
    var t = e.target;
    if (!t.dataset || !t.dataset.ccpick) return;
    var id = t.dataset.ccpick, m = ccMember(id), map = ccMap();
    if (t.checked && m) ccAddPerson({ id: id, name: m.name });
    else ccSheet.persons = ccSheet.persons.filter(function (p) { return ccResolve(p, map).id !== id; });
    ccDrawSel();
  }
  async function ccSheetClick(e) {
    var wrap = document.getElementById('ccsheet');
    if (e.target === wrap) { ccCloseSheet(); return; }
    var b = e.target.closest('[data-cca]');
    if (!b) return;
    var a = b.dataset.cca, st = ccSheet;
    if (!st) return;
    var o = ccObj(st.lvl, st.id);
    if (a === 'close') { ccCloseSheet(); return; }
    if (a === 'edit') {
      st.mode = 'edit';
      if (st.lvl === 'role') { st.persons = (o.persons || []).map(function (p) { return { id: p.id, name: p.name }; }); st.q = ''; }
      ccDrawSheet(); return;
    }
    if (a === 'addevent') { st.lvl = 'root'; st.id = null; st.mode = 'add'; ccDrawSheet(); return; }
    if (a === 'add') {
      st.mode = 'add';
      if (CC_SUB[st.lvl] === 'role') { st.persons = []; st.q = ''; }
      ccDrawSheet(); return;
    }
    if (a === 'copy') {
      if (st.lvl === 'event' || st.lvl === 'day') { st.mode = 'copy'; ccDrawSheet(); return; }
      ccCloseSheet();
      if (st.lvl === 'shift') return act(function () { return ccCopyShift(o, o.day_id); }, L('ccCopied'));
      return act(function () { return ccInsertRoles([o], o.shift_id, ccNextSort(o.shift_id)); }, L('ccCopied'));
    }
    if (a === 'del') {
      var title = ccTitle(st.lvl, o), table = CC_TABLE[st.lvl], id = o.id;
      ccCloseSheet();
      if (!(await askConfirm(L('del'), L(st.lvl === 'role' ? 'ccConfirmDelRole' : 'ccConfirmDel', { name: title }), true))) return;
      return act(function () { return sb.from(table).delete().eq('id', id); }, L('ccDeleted'));
    }
    if (a === 'rm') { st.persons.splice(Number(b.dataset.i), 1); ccDrawSel(); ccDrawList(); return; }
    if (a === 'usesug') {
      var m = ccMember(b.dataset.id);
      if (m) ccAddPerson({ id: m.id, name: m.name });
      var oi = wrap.querySelector('input[name="other"]'); if (oi) oi.value = '';
      ccDrawSug(''); ccDrawSel(); ccDrawList(); return;
    }
    if (a === 'other') {
      var inp = wrap.querySelector('input[name="other"]');
      var v = inp ? inp.value.trim() : '';
      if (!v) { ccErr(L('ccNeedName')); if (inp) inp.focus(); return; }
      ccErr('');
      ccAddPerson({ name: v });
      inp.value = ''; ccDrawSug(''); ccDrawSel(); ccDrawList(); inp.focus();
    }
  }
  function ccErr(msg) {
    var el = document.querySelector('#ccsheet [data-ccerr]');
    if (!el) return;
    el.textContent = msg; el.hidden = !msg;
  }

  /* ---------- C&C: Speichern und Kopieren ---------- */
  function ccNextSort(shiftId) {
    return S.cc.roles.filter(function (r) { return r.shift_id === shiftId; }).reduce(function (n, r) { return Math.max(n, r.sort || 0); }, -1) + 1;
  }
  async function ccIns(table, row) {
    var r = await sb.from(table).insert(row).select('id').single();
    if (r.error) throw r.error;
    return r.data.id;
  }
  async function ccInsertRoles(roles, toShift, startSort) {
    if (!roles.length) return;
    var r = await sb.from('cc_roles').insert(roles.map(function (x, i) {
      return { shift_id: toShift, name: x.name, persons: x.persons || [], sort: startSort == null ? (x.sort || 0) : startSort + i };
    }));
    if (r.error) throw r.error;
  }
  async function ccCopyShift(s, toDay) {
    var id = await ccIns('cc_shifts', { day_id: toDay, start_time: s.start_time, end_time: s.end_time, name: s.name || null });
    await ccInsertRoles(S.cc.roles.filter(function (r) { return r.shift_id === s.id; }), id, null);
  }
  async function ccCopyDay(d, toEvent, newDate, newName) {
    var id = await ccIns('cc_days', { event_id: toEvent, day: newDate, name: newName || null });
    var shifts = S.cc.shifts.filter(function (s) { return s.day_id === d.id; });
    for (var i = 0; i < shifts.length; i++) await ccCopyShift(shifts[i], id);
  }
  async function ccCopyEvent(e, newName) {
    var id = await ccIns('cc_events', { name: newName, active: false });
    var days = S.cc.days.filter(function (d) { return d.event_id === e.id; });
    // 52 Wochen = 364 Tage: der Wochentag bleibt gleich
    for (var i = 0; i < days.length; i++) await ccCopyDay(days[i], id, ccAddDays(days[i].day, 364), days[i].name);
  }

  async function ccSheetSubmit(e) {
    e.preventDefault();
    var f = e.target, st = ccSheet;
    if (!st || !f.dataset.ccform) return;
    var kind = f.dataset.ccform;
    var fd = new FormData(f);
    var g = function (k) { if (k === 'phone' && fd.has('phonecc')) return composePhone(fd.get('phonecc'), fd.get('phone')); return String(fd.get(k) || '').trim(); };
    var o = ccObj(st.lvl, st.id);
    var isNew = st.mode === 'add';
    var ok = false;

    if (kind === 'guest') {
      if (!g('name')) { ccErr(L('ccNeedName')); return; }
      if (!normPhone(g('phone'))) { ccErr(L('phoneInvalid')); return; }
      S.busy = true;
      ok = await addMember(g('name'), g('phone'), true);
      S.busy = false;
      if (ok) ccCloseSheet();
      return;
    }
    if ((kind === 'event' || kind === 'role' || kind === 'copy-event') && !g('name')) { ccErr(L('ccNeedName')); return; }
    if ((kind === 'day' || kind === 'copy-day') && !g('date')) { ccErr(L('date') + '?'); return; }
    if (kind === 'shift' && (!g('start') || !g('end'))) { ccErr(L('time') + '?'); return; }
    ccCloseSheet();

    if (kind === 'event') {
      var ev = { name: g('name'), active: !!fd.get('active') };
      ok = await act(function () { return isNew ? sb.from('cc_events').insert(ev) : sb.from('cc_events').update(ev).eq('id', o.id); }, L('ccSaved'));
    } else if (kind === 'day') {
      var dy = { day: g('date'), name: g('name') || null };
      if (isNew) dy.event_id = st.id;
      ok = await act(function () { return isNew ? sb.from('cc_days').insert(dy) : sb.from('cc_days').update(dy).eq('id', o.id); }, L('ccSaved'));
    } else if (kind === 'shift') {
      var sh = { start_time: g('start'), end_time: g('end'), name: g('name') || null };
      if (isNew) sh.day_id = st.id;
      ok = await act(function () { return isNew ? sb.from('cc_shifts').insert(sh) : sb.from('cc_shifts').update(sh).eq('id', o.id); }, L('ccSaved'));
    } else if (kind === 'role') {
      var ro = { name: g('name'), persons: st.persons || [] };
      if (isNew) { ro.shift_id = st.id; ro.sort = ccNextSort(st.id); }
      ok = await act(function () { return isNew ? sb.from('cc_roles').insert(ro) : sb.from('cc_roles').update(ro).eq('id', o.id); }, L('ccSaved'));
    } else if (kind === 'copy-event') {
      var nm = g('name');
      ok = await act(function () { return ccCopyEvent(o, nm); }, L('ccCopied'));
    } else if (kind === 'copy-day') {
      var nd = g('date'), nn = g('name');
      ok = await act(function () { return ccCopyDay(o, o.event_id, nd, nn); }, L('ccCopied'));
    }
    return ok;
  }

  /* ---------- Jass: Jassmasters mit Teilnehmern, Spielplan und Tagesrangliste ---------- */
  // Fester Spielplan für 8 Spieler: 4 Runden, je 2 Tische. Zahlen = Platz in der Teilnehmerliste.
  var JS_PLAN = [
    [['A', [1, 2], [7, 8]], ['B', [3, 4], [5, 6]]],
    [['A', [5, 7], [6, 8]], ['B', [1, 3], [2, 4]]],
    [['A', [1, 6], [2, 5]], ['B', [3, 8], [4, 7]]],
    [['A', [2, 7], [4, 5]], ['B', [1, 8], [3, 6]]]
  ];
  function jsEdit() { return !!(S.me && (S.me.isAdmin || S.me.isJassMaster)); }   // Admins und Jass-Master bearbeiten
  function jsPlayers(d) {
    var a = Array.isArray(d.players) ? d.players.slice(0, 8) : [];
    while (a.length < 8) a.push(null);
    return a.map(function (p) { return p && (p.id || p.name) ? p : null; });
  }
  function jsScores(d) { return d.scores && typeof d.scores === 'object' ? d.scores : {}; }
  function jsName(P, slot, map) {
    var p = P[slot - 1];
    return p ? ccResolve(p, map).name : L('jsPlayer', { n: slot });
  }
  function jsFmt(v) { return v == null ? '–' : (v > 0 ? '+' + v : String(v)); }
  function jsCls(v) { return v == null || v === 0 ? '' : v > 0 ? ' pos' : ' neg'; }
  function jsDots(lvl, id, label) {
    return '<button type="button" class="ccdots" data-act="js-menu" data-lvl="' + lvl + '" data-id="' + esc(id) + '" aria-label="' + esc(L('ccActions') + ': ' + label) + '" title="' + esc(L('ccActions')) + '">' + ICON.dots + '</button>';
  }
  function jsFoldBtn(id, folded, label, small) {
    return '<button type="button" class="ccfold' + (small ? ' ccfold-day' : '') + (folded ? '' : ' open') + '" data-act="js-fold" data-id="' + esc(id) + '" aria-expanded="' + !folded + '" aria-label="' + esc(label) + '">' + ICON.chev + '</button>';
  }

  // Tagesrangliste: jeder Spieler erhält die Punkte seines Teams aus jedem Spiel
  function jsRanking(d) {
    var sc = jsScores(d), tot = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    JS_PLAN.forEach(function (round, ri) {
      round.forEach(function (g) {
        var v = sc[(ri + 1) + g[0]];
        if (typeof v !== 'number') return;
        g[1].forEach(function (s) { tot[s] += v; });
        g[2].forEach(function (s) { tot[s] -= v; });
      });
    });
    var rows = [1, 2, 3, 4, 5, 6, 7, 8].map(function (s) { return { slot: s, pts: tot[s] }; });
    rows.sort(function (a, b) { return b.pts - a.pts || a.slot - b.slot; });
    var rank = 0, last = null;
    rows.forEach(function (r, i) { if (r.pts !== last) { rank = i + 1; last = r.pts; } r.rank = rank; });
    // Rangpunkte: 1. Platz 32, danach je 4 weniger, mindestens 4
    rows.forEach(function (r) { r.standing = Math.max(4, 32 - 4 * (r.rank - 1)); });
    return rows;
  }

  function viewJass() {
    var topHtml = '<div class="top"><div><h1 class="pagetitle">' + L('titleJass') + '</h1></div></div>';
    if (S.jsErr) return topHtml + '<div class="empty"><p>' + L('jsSetup') + '</p></div>';
    var ed = jsEdit(), map = ccMap(), html = topHtml;
    var all = S.js.days.slice().sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : ccByCreated(a, b); });
    var upcoming = all.filter(function (d) { return !d.closed; });
    var past = all.filter(function (d) { return d.closed; }).reverse();   // neuste zuerst
    html += jsFolder('jsUp', L('jsUpcoming'), upcoming, true, ed, map);
    html += jsFolder('jsPast', L('jsPast'), past, false, ed, map);
    html += jsEternalFolder(past);
    return html;
  }

  // Punkte einer Person in einer abgeschlossenen Runde ermitteln (für die ewige Rangliste):
  // bei von Hand gepflegten Ranglisten direkt die eingetragenen Punkte, sonst die berechneten
  // Rangpunkte (32, 28, 24 … bis 4). Der Schlüssel ist die Profil-ID, sonst der normierte Name.
  function jsEternalEntries(d, map) {
    if (Array.isArray(d.manual_ranking) && d.manual_ranking.length) {
      return d.manual_ranking.map(function (r) {
        var nm = r.id && ccMember(r.id) ? ccMember(r.id).name : r.name;
        return { key: r.id || ('n:' + ccNorm(r.name || '')), name: nm, points: r.points || 0 };
      });
    }
    var sc = jsScores(d);
    if (!Object.keys(sc).some(function (k) { return typeof sc[k] === 'number'; })) return [];
    var P = jsPlayers(d);
    return jsRanking(d).map(function (r) {
      var nm = jsName(P, r.slot, map), p = P[r.slot - 1];
      var rid = p ? ccResolve(p, map).id : null;
      return { key: rid || ('n:' + ccNorm(nm)), name: nm, points: r.standing };
    });
  }

  // Ewige Rangliste über die letzten 10 abgeschlossenen Runden (neuste zuerst, dann summiert)
  function jsEternalRows(past, map) {
    var last10 = past.slice(0, 10);   // past ist bereits neuste zuerst sortiert
    var totals = {};
    last10.forEach(function (d) {
      jsEternalEntries(d, map).forEach(function (e) {
        if (!totals[e.key]) totals[e.key] = { name: e.name, points: 0, rounds: 0 };
        totals[e.key].points += e.points;
        totals[e.key].rounds += 1;
      });
    });
    var rows = Object.keys(totals).map(function (k) { return totals[k]; });
    rows.sort(function (a, b) { return b.points - a.points; });
    var rank = 0, last = null;
    rows.forEach(function (r, i) { if (r.points !== last) { rank = i + 1; last = r.points; } r.rank = rank; });
    return { rows: rows, n: last10.length };
  }

  async function jsPrintMatrix() {
    toast(L('ccPdfBuilding'));
    var map = ccMap();
    var all = S.js.days.slice().sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : 0; });
    var past = all.filter(function (d) { return d.closed; });
    if (!past.length) { toast('Keine abgeschlossenen Runden.'); return; }
    var rounds = past; // chronologisch älteste zuerst

    // Spieler aus ALLEN Runden – «Uralt Spieler» (nur in Runde 20) herausfiltern:
    // Einträge ohne echtes Profil (id = null, key beginnt mit 'n:') die NUR in einer
    // einzigen Runde auftauchen und keiner App-Person zugeordnet sind, werden ausgeblendet.
    var totals = {};
    past.forEach(function (d) {
      jsEternalEntries(d, map).forEach(function (e) {
        if (!totals[e.key]) totals[e.key] = { name: e.name, total: 0, rounds: 0, hasProfile: e.key.charAt(0) !== 'n' };
        totals[e.key].total += e.points;
        totals[e.key].rounds += 1;
      });
    });
    var players = Object.keys(totals)
      .filter(function (k) {
        // Einträge ohne App-Profil, die nur in einer Runde vorkommen: ausblenden
        return totals[k].hasProfile || totals[k].rounds > 1;
      })
      .map(function (k) { return { key: k, name: totals[k].name, total: totals[k].total }; });
    players.sort(function (a, b) { return b.total - a.total; });

    var logo = await ensureLogoDataUrl();
    var jsPDFCtor = window.jspdf.jsPDF;
    var doc = new jsPDFCtor({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    var PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
    var M = 12;
    var BLUE = [48, 124, 192], BLUE_DARK = [11, 47, 94], BLUE_SOFT = [227, 239, 249];
    var INK = [22, 35, 59], LINE = [218, 222, 214], WHITE = [255, 255, 255];
    var GOLD_FILL = [212, 170, 40], SILVER = [130, 138, 148];

    // Layout
    var RANK_COL = 8;    // Rang
    var NAME_COL = 34;   // Spielername
    var TOTAL_COL = 14;  // Total rechts
    var nRounds = rounds.length;
    var available = PW - 2 * M - RANK_COL - NAME_COL - TOTAL_COL;
    var COL = Math.max(8, Math.min(18, available / Math.max(nRounds, 1)));
    var tableW = RANK_COL + NAME_COL + nRounds * COL + TOTAL_COL;
    var ROW_H = 7;
    var HDR_H1 = 5.5;  // erste Kopfzeile (Runde/Titel)
    var HDR_H2 = 5.5;  // zweite Kopfzeile (Nummer)
    var HDR_H = HDR_H1 + HDR_H2;
    var FS = 6.5;     // Schriftgrösse in Zellen
    function cellTextY(midY) { return midY + FS * 0.132; }

    function drawCell(cx, cy, pts2) {
      var midY = cy + ROW_H / 2;
      var ty = cellTextY(midY);
      if (pts2 === 32) {
        // Schwarz, fett, in Klammern
        doc.setTextColor.apply(doc, [0, 0, 0]); doc.setFont('helvetica', 'bold'); doc.setFontSize(FS);
        doc.text('(' + pts2 + ')', cx, ty, { align: 'center' });
      } else if (pts2 === 28) {
        // Schwarz, normal, in Klammern
        doc.setTextColor.apply(doc, [0, 0, 0]); doc.setFont('helvetica', 'normal'); doc.setFontSize(FS);
        doc.text('(' + pts2 + ')', cx, ty, { align: 'center' });
      } else if (pts2 === 24) {
        // Dunkelblau, normal, in Klammern
        doc.setTextColor.apply(doc, INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(FS);
        doc.text('(' + pts2 + ')', cx, ty, { align: 'center' });
      } else {
        // 4–20: dunkelblau, normal, ohne Klammern
        doc.setTextColor.apply(doc, INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(FS);
        doc.text(String(pts2), cx, ty, { align: 'center' });
      }
    }

    // Seitenkopf (identisches Layout zum Chilbi-Plan)
    var HDR_PAGE = 24;
    function drawHeader() {
      doc.setFillColor.apply(doc, BLUE_DARK); doc.rect(0, 0, PW, HDR_PAGE, 'F');
      if (logo) { try { doc.addImage(logo, 'PNG', M, 4, 13.5, 15.5); } catch (e) {} }
      doc.setTextColor.apply(doc, WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
      doc.text('Jassmasters Übersicht', M + 18, 11.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(207, 224, 242);
      doc.text(rounds.length + ' Runden · ' + players.length + ' Spieler', M + 18, 17);
      doc.text(new Date().toLocaleDateString('de-CH'), PW - M, 14, { align: 'right' });
    }
    function drawFooter(page) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(93, 103, 122);
      doc.text('Jassmasters Übersicht', M, PH - 6);
      doc.text('Seite ' + page, PW - M, PH - 6, { align: 'right' });
    }

    // Tabellen-Kopf: zweizeilig (Zeile 1: «Runde X», Zeile 2: Rundennummer/Jahr)
    function drawTableHeader(yy) {
      // Hintergrund
      doc.setFillColor.apply(doc, BLUE_DARK); doc.rect(M, yy, tableW, HDR_H, 'F');
      doc.setDrawColor.apply(doc, BLUE); doc.setLineWidth(0.1);

      // Rang + Spieler-Header
      doc.setTextColor.apply(doc, WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
      doc.text('#', M + RANK_COL / 2, yy + HDR_H1 + HDR_H2 / 2 + 6 * 0.132, { align: 'center' });
      doc.text('Spieler', M + RANK_COL + 2, yy + HDR_H1 + HDR_H2 / 2 + 6 * 0.132);

      // Runden-Spalten: Zeile 1 = «Runde X», Zeile 2 = Jahr/Kurzname
      rounds.forEach(function (d, ci) {
        var cx = M + RANK_COL + NAME_COL + ci * COL + COL / 2;
        // Zeile 1: Rundenname (z. B. «Runde 36»)
        var lbl1 = d.name ? d.name.split(' ')[0] : 'Runde';
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(lbl1, cx, yy + HDR_H1 / 2 + 6.5 * 0.132, { align: 'center', maxWidth: COL - 0.5 });
        // Zeile 2: Nummer oder Jahr
        var lbl2 = d.name ? (d.name.split(' ')[1] || '') : monthYear(d.day).split(' ')[1] || '';
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(lbl2, cx, yy + HDR_H1 + HDR_H2 / 2 + 6.5 * 0.132, { align: 'center', maxWidth: COL - 0.5 });
        // Trennlinie
        doc.line(M + RANK_COL + NAME_COL + ci * COL, yy, M + RANK_COL + NAME_COL + ci * COL, yy + HDR_H);
      });

      // Total-Header
      var tx = M + RANK_COL + NAME_COL + nRounds * COL + TOTAL_COL / 2;
      doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('Total', tx, yy + HDR_H1 / 2 + 6.5 * 0.132, { align: 'center' });
      doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('Pkt', tx, yy + HDR_H1 + HDR_H2 / 2 + 6.5 * 0.132, { align: 'center' });
    }

    drawHeader();
    var y = HDR_PAGE + 2;
    var page = 1;
    drawTableHeader(y);
    y += HDR_H;

    // Rang berechnen (ex aequo)
    var rank = 0, lastTotal = null;
    players.forEach(function (pl, ri) { if (pl.total !== lastTotal) { rank = ri + 1; lastTotal = pl.total; } pl.rank = rank; });

    // Spieler-Zeilen
    players.forEach(function (pl, ri) {
      if (y + ROW_H > PH - 14) {
        drawFooter(page); doc.addPage(); page++;
        drawHeader(); y = HDR_PAGE + 2;
        drawTableHeader(y); y += HDR_H;
      }
      var bg = ri % 2 === 0 ? WHITE : BLUE_SOFT;
      doc.setFillColor.apply(doc, bg); doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.12);
      doc.rect(M, y, tableW, ROW_H, 'FD');

      var midY = y + ROW_H / 2;

      // Rang
      doc.setTextColor.apply(doc, [130, 138, 148]); doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
      doc.text(String(pl.rank), M + RANK_COL / 2, midY + 6 * 0.132, { align: 'center' });

      // Trennlinie Rang/Name
      doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.2);
      doc.line(M + RANK_COL, y, M + RANK_COL, y + ROW_H);

      // Spielername
      doc.setTextColor.apply(doc, INK);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.text(pl.name, M + RANK_COL + 2, midY + 7 * 0.132, { maxWidth: NAME_COL - 3 });

      // Trennlinie Name/Runden
      doc.setLineWidth(0.2);
      doc.line(M + RANK_COL + NAME_COL, y, M + RANK_COL + NAME_COL, y + ROW_H);

      // Runden-Zellen
      var rowTotal = 0;
      rounds.forEach(function (d, ci) {
        var entries = jsEternalEntries(d, map);
        var byKey = {};
        entries.forEach(function (e) { byKey[e.key] = e.points; });
        var pts2 = byKey[pl.key];
        var cx = M + RANK_COL + NAME_COL + ci * COL + COL / 2;
        if (pts2 != null) {
          rowTotal += pts2;
          drawCell(cx, y, pts2);
        } else {
          doc.setTextColor.apply(doc, LINE); doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
          doc.text('–', cx, midY + FS * 0.132, { align: 'center' });
        }
        doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.1);
        doc.line(M + RANK_COL + NAME_COL + (ci + 1) * COL, y, M + RANK_COL + NAME_COL + (ci + 1) * COL, y + ROW_H);
      });

      // Total
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor.apply(doc, BLUE);
      doc.text(String(pl.total), M + RANK_COL + NAME_COL + nRounds * COL + TOTAL_COL / 2, midY + 7.5 * 0.132, { align: 'center' });
      y += ROW_H;
    });

    drawFooter(page);

    // Teilen/Speichern
    var blob = doc.output('blob');
    var fname = 'Jassmasters-' + new Date().getFullYear() + '.pdf';
    try {
      var file = new File([blob], fname, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Jassmasters Übersicht' }); return;
      }
    } catch (e) {}
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  function jsEternalFolder(past) {
    var key = 'jsEternal', folded = S.jsFold[key] !== true;   // Standard: zugeklappt
    var map = ccMap(), res = jsEternalRows(past, map);
    var html = '<section class="ccel"><div class="cceh">' +
      '<button type="button" class="cct" data-act="js-fold" data-id="' + key + '" aria-expanded="' + !folded + '">' + esc(L('jsEternal')) + '</button>' +
      jsFoldBtn(key, folded, L('jsEternal'), false) + '</div>';
    if (!folded) {
      html += '<div class="ccbody">';
      if (!res.rows.length) {
        html += '<p class="ccsum" style="padding-top:10px">' + L('jsNoPoints') + '</p>';
      } else {
        html += '<p class="ccsum" style="padding:10px 0 4px">' + L('jsEternalHint', { n: res.n }) + '</p>' +
          '<ol class="jsrank">' + res.rows.map(function (r) {
            return '<li><span class="jsrk">' + r.rank + '.</span><span class="jsrn">' + esc(r.name) + '</span><span class="jsstp">' + L(r.rounds === 1 ? 'jsEternalRound' : 'jsEternalRounds', { n: r.rounds }) + '</span><span class="jsrp">' + r.points + '</span></li>';
          }).join('') + '</ol>';
      }
      html += '</div>';
    }
    html += '</section>';
    return html;
  }

  // Ein fester Ordner (Anstehend/Vergangen) mit eigenem Auf-/Zuklapp-Zustand
  function jsFolder(key, title, days, isUpcoming, ed, map) {
    // Anstehend ist standardmässig offen, Vergangen standardmässig zu.
    var folded = isUpcoming ? (S.jsFold[key] === true) : (S.jsFold[key] !== true);
    var html = '<section class="ccel"><div class="cceh">' +
      '<button type="button" class="cct" data-act="js-fold" data-id="' + key + '" aria-expanded="' + !folded + '">' + esc(title) + ' <span class="cnt">(' + days.length + ')</span></button>' +
      (isUpcoming && ed ? '<button type="button" class="plusbtn" data-act="js-addday" aria-label="' + esc(L('jsAddDay')) + '" title="' + esc(L('jsAddDay')) + '"><span>+</span></button>' : '') +
      (!isUpcoming && days.length ? '<button type="button" class="ccdots" data-act="js-print-past" title="' + esc(L('jsPrint')) + '" aria-label="' + esc(L('jsPrint')) + '">' + ICON.print + '</button>' : '') +
      jsFoldBtn(key, folded, title, false) + '</div>';
    if (!folded) {
      html += '<div class="ccbody">';
      if (!days.length) html += '<p class="ccsum" style="padding-top:10px">' + L('jsNoDays') + '</p>';
      days.forEach(function (d) { html += jsDayHtml(d, ed, map, isUpcoming); });
      html += '</div>';
    }
    html += '</section>';
    return html;
  }

  function jsSub(key, title, body) {
    var folded = !!S.jsFold[key];
    return '<div class="jssub"><div class="jssh"><button type="button" class="jsst" data-act="js-fold" data-id="' + esc(key) + '" aria-expanded="' + !folded + '">' + title + '</button>' +
      jsFoldBtn(key, folded, title, true) + '</div>' + (folded ? '' : '<div class="jssb">' + body + '</div>') + '</div>';
  }

  // Rangliste darstellen: entweder die von Hand gepflegte (manual_ranking) oder die aus den
  // Spiel-Punkten berechnete. Die von Hand gepflegte zeigt nur einen Punktewert pro Person.
  function jsRankingHtml(d, P, map) {
    if (Array.isArray(d.manual_ranking) && d.manual_ranking.length) {
      var rows = d.manual_ranking.slice().sort(function (a, b) { return (b.points || 0) - (a.points || 0); });
      var rank = 0, last = null;
      rows.forEach(function (r, i) { if (r.points !== last) { rank = i + 1; last = r.points; } r.rank = rank; });
      return '<ol class="jsrank">' + rows.map(function (r) {
        var nm = r.id ? (ccMember(r.id) ? ccMember(r.id).name : r.name) : r.name;
        var diff = r.gamePts != null ? (r.gamePts >= 0 ? '(+' + r.gamePts + ')' : '(' + r.gamePts + ')') : '';
      return '<li><span class="jsrk">' + r.rank + '.</span><span class="jsrn">' + esc(nm) + '</span>' + (diff ? '<span class="jsdiff">' + diff + '</span>' : '') + '<span class="jsrp">' + (r.points == null ? '\u2013' : r.points) + '</span></li>';
      }).join('') + '</ol>';
    }
    var sc = jsScores(d), any = Object.keys(sc).some(function (k) { return typeof sc[k] === 'number'; });
    if (!any) return '<p class="ccsum">' + L('jsNoPoints') + '</p>';
    var rows2 = jsRanking(d);
    return '<ol class="jsrank">' + rows2.map(function (r) {
      var diff = jsFmt(r.pts);   // z. B. "+157" oder "-23"
      return '<li><span class="jsrk">' + r.rank + '.</span><span class="jsrn">' + esc(jsName(P, r.slot, map)) + '</span><span class="jsdiff' + jsCls(r.pts) + '">(' + diff + ')</span><span class="jsrpn">' + r.standing + '</span></li>';
    }).join('') + '</ol>';
  }

  function jsDayHtml(d, ed, map, isUpcoming) {
    var df = !!S.jsFold[d.id], P = jsPlayers(d), sc = jsScores(d);
    var label = (isUpcoming ? fullDateIso(d.day) : monthYear(d.day)) + (d.name ? ' (' + esc(d.name) + ')' : '');
    var h = '<div class="ccday"><div class="ccdh">' +
      (isUpcoming && ed ? '<input type="checkbox" class="ccck" data-jsactive="' + esc(d.id) + '"' + (d.active !== false ? ' checked' : '') + ' aria-label="' + esc(label + ': ' + L('ccActive')) + '" title="' + esc(L('jsVisibleHint')) + '">' : '') +
      '<button type="button" class="ccdt" data-act="js-fold" data-id="' + esc(d.id) + '" aria-expanded="' + !df + '"><b>' + label + '</b></button>' +
      (ed ? jsDots('day', d.id, label) : '') + jsFoldBtn(d.id, df, label, true) + '</div>';
    if (df) return h + '</div>';

    // Teilnehmer 1–8: nur für Jass Manager und Admin sichtbar
    var tp = ed ? P.map(function (p, i) {
      var inner = '<span class="jsnr">' + (i + 1) + '</span>' + (p ? ccChip(p, map) : '<span class="ccsum">' + L('jsFree') + '</span>');
      return '<button type="button" class="jsp" data-act="js-pick" data-id="' + esc(d.id) + '" data-slot="' + (i + 1) + '" aria-label="' + esc(L('jsPick', { n: i + 1 })) + '">' + inner + '<span class="sp"></span>' + ICON.pencil + '</button>';
    }).join('') : '';

    // Spielplan (der Hinweistext steckt hinter dem Info-Symbol)
    var showHint = !!S.info['jsh:' + d.id];
    var sp = ed ? '<button type="button" class="ccinfo' + (showHint ? ' on' : '') + '" data-act="js-hint" data-id="' + esc(d.id) + '" aria-pressed="' + showHint + '" aria-label="' + esc(showHint ? L('infoHide') : L('infoShow')) + '" title="' + esc(showHint ? L('infoHide') : L('infoShow')) + '">' + ICON.info + '</button>' +
      (showHint ? '<p class="ccnote" style="margin:8px 0">' + L('jsHint') + '</p>' : '') : '';
    JS_PLAN.forEach(function (round, ri) {
      sp += '<div class="jsround">' + L('jsRound', { n: ri + 1 }) + '</div>';
      round.forEach(function (g) {
        var key = (ri + 1) + g[0], v = typeof sc[key] === 'number' ? sc[key] : null;
        var team = function (nr, slots, val) {
          var names = slots.map(function (s) { return '<span class="jsnm">' + esc(jsName(P, s, map)) + '</span>'; }).join('<span class="jsamp">&amp;</span>');
          var cell = ed
            ? '<input class="jspts' + jsCls(val) + '" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-jsscore="' + esc(d.id) + '" data-game="' + key + '" data-team="' + nr + '" value="' + (val == null ? '' : val) + '" aria-label="' + esc(L('jsRound', { n: ri + 1 }) + ' ' + g[0] + ', ' + L('jsPoints')) + '">'
            : '<span class="jspv' + jsCls(val) + '">' + jsFmt(val) + '</span>';
          return '<div class="jsteam"><span class="jsnames">' + names + '</span>' + cell + '</div>';
        };
        sp += '<div class="jsgame">' + team(1, g[1], v) + team(2, g[2], v == null ? null : -v) + '</div>';
      });
    });

    var rk = jsRankingHtml(d, P, map);

    h += isUpcoming
      ? (ed ? jsSub(d.id + ':p', L('jsParticipants'), '<div class="jsplist">' + tp + '</div>') : '') +
        jsSub(d.id + ':s', L('jsSchedule'), sp) +
        jsSub(d.id + ':r', L('jsRanking'), rk)
      : rk;   // Vergangene Jassmasters: nur die Tagesrangliste, direkt sichtbar
    return h + '</div>';
  }

  /* Punkte speichern: Team I erhält v, Team II −v */
  async function jsSaveScore(inp) {
    var raw = String(inp.value || '').trim().replace(/[^\d-]/g, '');
    var n = raw === '' || raw === '-' ? null : parseInt(raw, 10);
    if (n != null && isNaN(n)) n = null;
    var v = n == null ? null : (inp.dataset.team === '2' ? -n : n);
    var d = S.js.days.filter(function (x) { return x.id === inp.dataset.jsscore; })[0];
    if (!d) return;
    var sc = Object.assign({}, jsScores(d));
    if (v == null) delete sc[inp.dataset.game]; else sc[inp.dataset.game] = v;
    d.scores = sc;   // sofort anzeigen
    render();
    var r = await sb.rpc('jass_set_score', { p_day: d.id, p_game: inp.dataset.game, p_pts: v });
    if (r.error) { console.error(r.error); toast(L('errFailed') + ': ' + String(r.error.message || '').slice(0, 100)); }
    try { await loadAll(); softRender(); } catch (e) { console.error(e); }
  }
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.dataset && t.dataset.jsscore && jsEdit()) jsSaveScore(t);
  });
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key === 'Enter' && t && t.dataset && t.dataset.jsscore) { e.preventDefault(); t.blur(); }
  });

  /* ---------- Jass: Aktionsfenster ---------- */
  var jsSheet = null;   // { lvl, id, mode, slot, q }
  function jsKey(e) { if (e.key === 'Escape' && !document.getElementById('dlg')) { e.preventDefault(); jsClose(); } }
  function jsClose() {
    var el = document.getElementById('jssheet');
    if (el) el.remove();
    jsSheet = null;
    document.removeEventListener('keydown', jsKey, true);
  }
  function jsOpen(o) { jsSheet = o; jsDraw(); }
  function jsFind(lvl, id) {
    return S.js.days.filter(function (x) { return x.id === id; })[0] || null;
  }
  // Liefert die ID einer (impliziten) Jass-Serie, legt bei Bedarf eine an. Die Serie ist
  // in der Oberfläche nicht sichtbar, wird aber als Fremdschlüssel für jass_days gebraucht.
  async function jsEnsureSeries() {
    if (S.js.series.length) return S.js.series[0].id;
    var r = await sb.from('jass_series').insert({ name: 'Jassmasters' }).select('id').single();
    if (r.error) throw r.error;
    return r.data.id;
  }
  function jsDraw() {
    var st = jsSheet;
    if (!st) return;
    var o = st.id ? jsFind(st.lvl, st.id) : null;
    if (st.id && !o) { jsClose(); return; }
    var body = '';
    var btn = function (a, icon, label, cls) { return '<button type="button" class="ccact' + (cls ? ' ' + cls : '') + '" data-jsa="' + a + '">' + icon + '<span>' + label + '</span></button>'; };
    var formEnd = '<p class="err" data-jserr hidden></p><div class="dlgbtns"><button type="button" class="btn ghost inline" data-jsa="close">' + L('dismiss') + '</button><button type="submit" class="btn inline">' + L('save') + '</button></div></form>';
    if (st.mode === 'menu') {
      var dLabel = (o.closed ? monthYear(o.day) : fullDateIso(o.day)) + (o.name ? ' (' + esc(o.name) + ')' : '');
      body = '<p class="cck">' + L('jsLvlDay') + '</p><h3>' + dLabel + '</h3>' +
        btn('edit', ICON.pencil, L('ccChange')) +
        btn('edit-ranking', ICON.pencil, L('jsEditRanking')) +
        (!o.closed ? btn('finish', ICON.check, L('jsFinish')) : '') +
        btn('del', ICON.trash, L('del'), 'del') +
        '<button type="button" class="ccact close" data-jsa="close">' + L('ccClose') + '</button>';
    } else if (st.mode === 'day-form') {
      body = '<p class="cck">' + L('jsLvlDay') + '</p><h3>' + esc(o ? (o.closed ? monthYear(o.day) : fullDateIso(o.day)) : L('jsAddDay')) + '</h3><form data-jsform="day" novalidate>' +
        fld(L('date'), '<input class="input" type="date" name="date" value="' + esc(o ? o.day : '') + '" required>') +
        fld(L('ccNameOpt'), '<input class="input" name="name" value="' + esc(o && o.name ? o.name : '') + '" placeholder="32. Jassmasters">') + formEnd;
    } else if (st.mode === 'rank-form') {
      if (!st.rows) st.rows = (o.manual_ranking || []).map(function (r) { return { name: r.name, points: r.points, id: r.id || null }; });
      body = '<p class="cck">' + L('jsRanking') + '</p><h3>' + esc((o.closed ? monthYear(o.day) : fullDateIso(o.day)) + (o.name ? ' (' + o.name + ')' : '')) + '</h3>' +
        '<form data-jsform="rank" novalidate><div id="jsrankrows">' + jsRankRowsHtml(st.rows) + '</div>' +
        '<button type="button" class="btn ghost inline" data-jsa="rank-add" style="margin:4px 0 10px">' + ICON.plus + ' ' + L('jsAddRow') + '</button>' +
        formEnd;
    } else if (st.mode === 'pick') {
      var P = jsPlayers(o), cur = P[st.slot - 1];
      var curFree = cur && !cur.id ? cur.name : '';
      body = '<p class="cck">' + L('jsParticipants') + '</p><h3>' + esc(L('jsPick', { n: st.slot })) + '</h3>' +
        '<input class="input" name="q" placeholder="' + esc(L('ccSearch')) + '" autocomplete="off" value="' + esc(st.q || '') + '">' +
        '<div class="ccplist" id="jsplist"></div>' +

        (cur ? btn('clear', ICON.trash, L('jsClear'), 'del') : '') +
        '<button type="button" class="ccact close" data-jsa="close">' + L('ccClose') + '</button>';
    }
    var wrap = document.getElementById('jssheet');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'jssheet';
      wrap.className = 'ccsheet';
      wrap.addEventListener('click', jsClick);
      wrap.addEventListener('submit', jsSubmit);
      wrap.addEventListener('input', function (e) { if (e.target.name === 'q' && jsSheet) { jsSheet.q = e.target.value; jsDrawPick(); } });
      document.body.appendChild(wrap);
      document.addEventListener('keydown', jsKey, true);
    }
    wrap.innerHTML = '<div class="ccsheetcard" role="dialog" aria-modal="true" aria-label="' + esc(L('navJass')) + '">' + body + '</div>';
    if (st.mode === 'pick') jsDrawPick();
    var first = wrap.querySelector('.input') || wrap.querySelector('button');
    if (first) { try { first.focus({ preventScroll: true }); } catch (x) { first.focus(); } }
  }
  function jsRankRowsHtml(rows) {
    if (!rows.length) rows = [{ name: '', points: '' }];
    var html = rows.map(function (r, i) {
      return '<div class="jsrankrow"><input class="input" list="jsmemberlist" name="rn' + i + '" value="' + esc(r.name || '') + '" placeholder="' + esc(L('jsRankName')) + '">' +
        '<input class="input jsrankpts" type="text" inputmode="numeric" pattern="-?[0-9]*" name="rp' + i + '" value="' + (r.points == null || r.points === '' ? '' : r.points) + '" placeholder="' + esc(L('jsRankPoints')) + '">' +
        '<button type="button" class="ccx" data-jsa="rank-remove" data-idx="' + i + '" aria-label="' + esc(L('remove')) + '">\u00d7</button></div>';
    }).join('');
    html += '<datalist id="jsmemberlist">' + S.members.filter(function (m) { return !m.isGuest && !m.isCandidate; }).map(function (m) { return '<option value="' + esc(m.name) + '">'; }).join('') + '</datalist>';
    return html;
  }
  function jsDrawPick() {
    var box = document.getElementById('jsplist');
    if (!box || !jsSheet) return;
    var d = jsFind('day', jsSheet.id), P = jsPlayers(d), map = ccMap();
    var used = {};
    P.forEach(function (p, i) { if (p && i !== jsSheet.slot - 1) { var r = ccResolve(p, map); if (r.id) used[r.id] = i + 1; } });
    var q = ccNorm(jsSheet.q || '');
    var list = S.members.filter(function (m) { return !m.isCandidate && (!q || ccNorm(m.name).indexOf(q) > -1); });
    var avail = list.filter(function (m) { return !used[m.id]; });
    box.innerHTML = avail.length ? avail.map(function (m) {
      var k = m.isGuest ? 'g' : 'm';
      return '<button type="button" class="ccpick jspick" data-jsa="choose" data-pid="' + esc(m.id) + '">' +
        '<span class="ccp cc-' + k + '">' + esc(m.name) + '</span></button>';
    }).join('') : '<p class="ccsum" style="padding:10px 12px;margin:0">' + L('nobody') + '</p>';
  }
  async function jsSetPlayer(dayId, slot, person) {
    var d = jsFind('day', dayId);
    if (!d) return;
    var P = jsPlayers(d);
    P[slot - 1] = person;
    jsClose();
    await act(function () { return sb.from('jass_days').update({ players: P }).eq('id', dayId); }, L('ccSaved'));
  }
  function jsSyncRankRows() {
    var st = jsSheet, wrap = document.getElementById('jssheet');
    if (!st || !st.rows || !wrap) return;
    st.rows.forEach(function (r, i) {
      var ni = wrap.querySelector('[name="rn' + i + '"]'), pi = wrap.querySelector('[name="rp' + i + '"]');
      if (ni) r.name = ni.value;
      if (pi) r.points = pi.value;
    });
  }
  async function jsClick(e) {
    var wrap = document.getElementById('jssheet');
    if (e.target === wrap) { jsClose(); return; }
    var b = e.target.closest('[data-jsa]');
    if (!b || !jsSheet) return;
    var a = b.dataset.jsa, st = jsSheet, o = st.id ? jsFind(st.lvl, st.id) : null;
    if (a === 'close') { jsClose(); return; }
    if (a === 'edit') { st.mode = 'day-form'; jsDraw(); return; }
    if (a === 'edit-ranking') { st.mode = 'rank-form'; st.rows = null; jsDraw(); return; }
    if (a === 'finish') {
      var flabel = (o.closed ? monthYear(o.day) : fullDateIso(o.day)) + (o.name ? ' (' + o.name + ')' : '');
      jsClose();
      if (!(await askConfirm(L('jsFinish'), L('jsConfirmFinish', { name: flabel }), false))) return;
      return act(function () { return sb.from('jass_days').update({ closed: true }).eq('id', o.id); }, L('jsFinished'));
    }
    if (a === 'rank-add') { jsSyncRankRows(); st.rows.push({ name: '', points: '', id: null }); jsDraw(); return; }
    if (a === 'rank-remove') { jsSyncRankRows(); st.rows.splice(Number(b.dataset.idx), 1); jsDraw(); return; }
    if (a === 'del') {
      var title = ccDate(o.day), id = o.id;
      jsClose();
      if (!(await askConfirm(L('del'), L('ccConfirmDel', { name: title }), true))) return;
      return act(function () { return sb.from('jass_days').delete().eq('id', id); }, L('ccDeleted'));
    }
    if (a === 'clear') return jsSetPlayer(st.id, st.slot, null);
    if (a === 'choose') {
      var m = ccMember(b.dataset.pid);
      if (m) return jsSetPlayer(st.id, st.slot, { id: m.id, name: m.name });
    }
    if (a === 'other') {
      var inp = wrap.querySelector('input[name="other"]');
      var v = inp ? inp.value.trim() : '';
      if (!v) { return; }
      return jsSetPlayer(st.id, st.slot, { name: v });
    }
  }
  async function jsSubmit(e) {
    e.preventDefault();
    var f = e.target, st = jsSheet;
    if (!st || !f.dataset.jsform) return;
    var fd = new FormData(f), g = function (k) { return String(fd.get(k) || '').trim(); };
    var err = function (m) { var el = f.querySelector('[data-jserr]'); if (el) { el.textContent = m; el.hidden = false; } };
    if (f.dataset.jsform === 'day') {
      if (!g('date')) { err(L('date') + '?'); return; }
      var dt = g('date'), nm = g('name') || null, isEdit = st.id != null, id = st.id;
      jsClose();
      if (isEdit) return act(function () { return sb.from('jass_days').update({ day: dt, name: nm }).eq('id', id); }, L('ccSaved'));
      return act(async function () {
        var sid = await jsEnsureSeries();
        return sb.from('jass_days').insert({ series_id: sid, day: dt, name: nm, active: false, players: [null, null, null, null, null, null, null, null], scores: {} });
      }, L('ccSaved'));
    }
    if (f.dataset.jsform === 'rank') {
      var byName = {};
      S.members.forEach(function (m) { if (!m.isGuest) byName[ccNorm(m.name)] = m; });
      var out = [];
      (st.rows || []).forEach(function (r, i) {
        var nm2 = String(fd.get('rn' + i) || '').trim();
        var ptsRaw = String(fd.get('rp' + i) || '').trim();
        if (!nm2 || ptsRaw === '') return;   // leere Zeilen überspringen
        var pts = parseInt(ptsRaw, 10);
        if (isNaN(pts)) return;
        var match = byName[ccNorm(nm2)];
        out.push({ name: match ? match.name : nm2, id: match ? match.id : null, points: pts });
      });
      var dayId = st.id;
      jsClose();
      return act(function () { return sb.from('jass_days').update({ manual_ranking: out }).eq('id', dayId); }, L('ccSaved'));
    }
  }

  /* ---------- Aktionsfenster Mitglied (Verwaltung) ---------- */
  var mbSheet = null;
  function mbKey(e) { if (e.key === 'Escape' && !document.getElementById('dlg')) { e.preventDefault(); mbClose(); } }
  function mbClose() {
    var el = document.getElementById('mbsheet');
    if (el) el.remove();
    mbSheet = null;
    document.removeEventListener('keydown', mbKey, true);
  }
  function mbOpen(id, mode) { mbSheet = { id: id, mode: mode || 'menu' }; mbDraw(); }
  function mbBtn(act, id, val, icon, label, cls) {
    return '<button type="button" class="ccact' + (cls ? ' ' + cls : '') + '" data-act="' + act + '" data-id="' + esc(id) + '"' + (val !== '' ? ' data-val="' + val + '"' : '') + '>' + icon + '<span>' + label + '</span></button>';
  }
  function mbDraw() {
    var m = mbSheet ? ccMember(mbSheet.id) : null;
    if (!m) { mbClose(); return; }
    var self = m.id === S.me.id, body;
    var grp = m.isCandidate ? 'candidate' : m.isGuest ? 'guest' : m.isSupporter ? 'other' : m.isPassive ? 'passive' : 'active';
    var member = grp === 'active' || grp === 'passive' || grp === 'other';   // nur diese drei dürfen Rollen tragen
    var grpTagKey = { active: 'grpActive', passive: 'grpPassive', other: 'grpSupporter', guest: 'ccGuests', candidate: 'grpCandidate' }[grp];
    var GROUPS = [
      { key: 'active', label: 'mGroupActive', icon: ICON.groupA },
      { key: 'passive', label: 'mGroupPassive', icon: ICON.groupP },
      { key: 'other', label: 'mGroupOther', icon: ICON.heart },
      { key: 'guest', label: 'mGroupGuest', icon: ICON.groupG, noSelf: true },
      { key: 'candidate', label: 'mGroupCandidate', icon: ICON.candidate, noSelf: true },
    ];
    if (mbSheet.mode === 'menu') {
      body = '<p class="cck">' + L(grpTagKey) + ' · ' + esc(fmtPhone(m.phone)) + '</p><h3>' + esc(m.name) + '</h3>' +
        (member && !self ? mbBtn('set-admin', m.id, m.isAdmin ? '0' : '1', ICON.gear, L(m.isAdmin ? 'mRevokeAdmin' : 'mMakeAdmin'), 'cat-admin') : '') +
        (member ? mbBtn('set-em', m.id, m.isEventManager ? '0' : '1', ICON.star, L(m.isEventManager ? 'mRevokeEm' : 'mMakeEm'), 'cat-manager') : '') +
        (member ? mbBtn('set-cm', m.id, m.isChilbiManager ? '0' : '1', ICON.glass, L(m.isChilbiManager ? 'mRevokeCm' : 'mMakeCm'), 'cat-manager') : '') +
        (member ? mbBtn('set-crm', m.id, m.isChraenzliManager ? '0' : '1', ICON.glass, L(m.isChraenzliManager ? 'mRevokeCrm' : 'mMakeCrm'), 'cat-manager') : '') +
        (member ? mbBtn('set-jm', m.id, m.isJassMaster ? '0' : '1', ICON.trophy, L(m.isJassMaster ? 'mRevokeJm' : 'mMakeJm'), 'cat-manager') : '') +
        GROUPS.filter(function (g) { return g.key !== grp && !(g.noSelf && self); })
          .map(function (g) { return mbBtn('set-group', m.id, g.key, g.icon, L(g.label), 'cat-role'); }).join('') +
        (!self ? mbBtn('reset-pin', m.id, '', ICON.dialpad, L('resetPin'), 'cat-other') : '') +
        '<button type="button" class="ccact cat-other" data-mb="edit">' + ICON.pencil + '<span>' + L('mEdit') + '</span></button>' +
        (!self ? mbBtn('remove-member', m.id, '', ICON.trash, L('mDelete'), 'del') : '') +
        '<button type="button" class="ccact close" data-mb="close">' + L('ccClose') + '</button>';
    } else {
      body = '<p class="cck">' + L('mEdit') + '</p><h3>' + esc(m.name) + '</h3>' +
        '<form data-form="member-edit" data-id="' + esc(m.id) + '" novalidate>' +
        fld(L('fullName'), '<input class="input" name="name" value="' + esc(m.name) + '" autocomplete="off" required>') +
        fld(L('phone'), phoneField(m.phone)) +
        '<p class="ccnote">' + L('mEditNote') + '</p>' +
        '<div class="dlgbtns"><button type="button" class="btn ghost inline" data-mb="close">' + L('dismiss') + '</button><button type="submit" class="btn inline">' + L('save') + '</button></div></form>';
    }
    var wrap = document.getElementById('mbsheet');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'mbsheet';
      wrap.className = 'ccsheet';
      wrap.addEventListener('click', function (e) {
        if (e.target === wrap) { mbClose(); return; }
        var b = e.target.closest('[data-mb]');
        if (b) {
          if (b.dataset.mb === 'edit') { mbSheet.mode = 'edit'; mbDraw(); }
          else mbClose();
          return;
        }
        // Aktionen mit data-act laufen über den allgemeinen Klick-Handler weiter; das Fenster schliesst sich vorher
        if (e.target.closest('[data-act]')) mbClose();
      });
      document.body.appendChild(wrap);
      document.addEventListener('keydown', mbKey, true);
    }
    wrap.innerHTML = '<div class="ccsheetcard" role="dialog" aria-modal="true" aria-label="' + esc(m.name) + '">' + body + '</div>';
    var first = wrap.querySelector('form .input') || wrap.querySelector('button');
    if (first) { try { first.focus({ preventScroll: true }); } catch (x) { first.focus(); } }
  }

  /* ---------- Bestätigungsdialog ---------- */
  // Zeigt eine Rückfrage mit «Abbrechen» und «OK». Liefert true, wenn mit OK bestätigt wurde.
  function askConfirm(title, message, danger) {
    return new Promise(function (resolve) {
      var old = document.getElementById('dlg');
      if (old) old.remove();
      var prevFocus = document.activeElement;
      var wrap = document.createElement('div');
      wrap.id = 'dlg';
      wrap.className = 'dlg';
      wrap.innerHTML =
        '<div class="dlgcard" role="alertdialog" aria-modal="true" aria-labelledby="dlgT" aria-describedby="dlgM">' +
          '<h3 id="dlgT">' + esc(title) + '</h3>' +
          '<p id="dlgM">' + esc(message) + '</p>' +
          '<div class="dlgbtns">' +
            '<button type="button" class="btn ghost inline" data-dlg="0">' + L('dismiss') + '</button>' +
            '<button type="button" class="btn inline' + (danger ? ' dangerbtn' : '') + '" data-dlg="1">' + L('ok') + '</button>' +
          '</div>' +
        '</div>';
      var done = function (v) {
        document.removeEventListener('keydown', onKey, true);
        wrap.remove();
        try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) { /* ignorieren */ }
        resolve(v);
      };
      var onKey = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); done(false); }
        if (e.key === 'Tab') {   // Fokus im Dialog halten
          var b = wrap.querySelectorAll('button');
          if (e.shiftKey && document.activeElement === b[0]) { e.preventDefault(); b[b.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === b[b.length - 1]) { e.preventDefault(); b[0].focus(); }
        }
      };
      wrap.addEventListener('click', function (e) {
        e.stopPropagation();
        var t = e.target.closest('[data-dlg]');
        if (t) done(t.dataset.dlg === '1');
        else if (e.target === wrap) done(false);
      });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(wrap);
      wrap.querySelector('[data-dlg="0"]').focus();   // Sicherer Standard: Abbrechen hat den Fokus
    });
  }

  /* ---------- Speichern ---------- */
  async function act(fn, okMsg) {
    try {
      var res = await fn();
      if (res && res.error) throw res.error;
      if (okMsg) toast(okMsg);
      return true;
    } catch (e) {
      console.error(e);
      toast(L('errFailed') + (e && e.message ? ': ' + String(e.message).slice(0, 100) : '') + '.');
      return false;
    } finally {
      try { await loadAll(); render(); } catch (e2) { console.error(e2); }
    }
  }

  async function setResponse(table, keyCol, keyVal, val, msg) {
    var store = table === 'training_responses' ? S.tr : S.ev;
    var mine = (store[keyVal] || {})[S.me.id];
    store[keyVal] = store[keyVal] || {};
    var row = { user_id: S.me.id, status: val, updated_at: new Date().toISOString() };
    row[keyCol] = keyVal;
    if (mine === val) {
      delete store[keyVal][S.me.id];
      render();
      await act(function () { return sb.from(table).delete().eq(keyCol, keyVal).eq('user_id', S.me.id); }, L('respWithdrawn'));
    } else {
      store[keyVal][S.me.id] = val;
      render();
      await act(function () { return sb.from(table).upsert(row); }, msg);
    }
  }

  /* ---------- Events: Bearbeiten im Drei-Punkte-Menü (nur Event-Manager/Admin) ---------- */
  var evSheet = null;   // { id, mode: 'menu' | 'edit' | 'people', q }
  function evKey(e) { if (e.key === 'Escape' && !document.getElementById('dlg')) { e.preventDefault(); evClose(); } }
  function evClose() {
    var el = document.getElementById('evsheet');
    if (el) el.remove();
    evSheet = null;
    document.removeEventListener('keydown', evKey, true);
  }
  function evOpen(id, mode) { evSheet = { id: id, mode: mode || 'menu', q: '' }; evDraw(); }

  // Antwort einer beliebigen Person setzen (für Event-Manager/Admin). Im Unterschied zu
  // setResponse() betrifft dies nicht zwingend die eigene Antwort.
  async function setResponseFor(eventId, userId, val) {
    var cur = (S.ev[eventId] || {})[userId];
    S.ev[eventId] = S.ev[eventId] || {};
    if (cur === val) {
      delete S.ev[eventId][userId];
      render(); if (evSheet) evDraw();
      return act(function () { return sb.from('event_responses').delete().eq('event_id', eventId).eq('user_id', userId); }, L('ccSaved'));
    }
    S.ev[eventId][userId] = val;
    render(); if (evSheet) evDraw();
    return act(function () {
      return sb.from('event_responses').upsert({ event_id: eventId, user_id: userId, status: val, updated_at: new Date().toISOString() });
    }, L('ccSaved'));
  }

  function evPeopleList(ev) {
    var q = ccNorm(evSheet.q || '');
    var pool = S.members.filter(function (m) { return !m.isGuest && !m.isSupporter && !m.isCandidate; });
    if (q) pool = pool.filter(function (m) { return ccNorm(m.name).indexOf(q) > -1; });
    var r = S.ev[ev.id] || {};
    var rows = pool.map(function (m) {
      var val = r[m.id];
      var b = function (v, cls, label) {
        return '<button type="button" class="resp ' + cls + (val === v ? ' on' : '') + '" data-eva="setresp" data-uid="' + esc(m.id) + '" data-val="' + v + '">' + label + '</button>';
      };
      return '<div class="evprow"><span class="evpn">' + esc(m.name) + '</span><div class="evpbtns">' +
        b('solo', 'yes', L('solo')) + b('duo', 'yes', L('duo')) + b('no', 'no', L('no')) + '</div></div>';
    }).join('');
    // Nicht-Mitglieder: bestehende Freitext-Einträge + ein leeres Feld zum Hinzufügen
    var extras = Object.keys(r).filter(function (k) { return k.startsWith('x:'); }).map(function (k) {
      var nm = k.slice(2), val = r[k];
      var b = function (v, cls, label) {
        return '<button type="button" class="resp ' + cls + (val === v ? ' on' : '') + '" data-eva="setresp" data-uid="' + esc(k) + '" data-val="' + v + '">' + label + '</button>';
      };
      return '<div class="evprow"><span class="evpn evpext">' + esc(nm) + '</span><div class="evpbtns">' +
        b('solo', 'yes', L('solo')) + b('duo', 'yes', L('duo')) + b('no', 'no', L('no')) + '</div></div>';
    }).join('');
    var addExtra = '<div class="evprow evpaddrow"><input class="input evpextra" name="evpextra" placeholder="' + esc(L('ccOtherPerson')) + '" autocomplete="off"><button type="button" class="btn inline" data-eva="addextra">' + L('ccAdd') + '</button></div>';
    if (!rows && !extras) return '<p class="ccsum" style="padding:10px 0">' + L('nobody') + '</p>' + addExtra;
    return '<div class="evpeople">' + rows + extras + '</div>' + addExtra;
  }

  function evDraw() {
    var st = evSheet;
    if (!st) return;
    var ev = S.events.filter(function (x) { return x.id === st.id; })[0];
    if (!ev) { evClose(); return; }
    var body;
    if (st.mode === 'menu') {
      body = '<p class="cck">' + L('navEvents') + '</p><h3>' + esc(ev.title) + '</h3>' +
        '<button type="button" class="ccact" data-eva="edit">' + ICON.pencil + '<span>' + L('evEdit') + '</span></button>' +
        '<button type="button" class="ccact" data-eva="people">' + ICON.pencil + '<span>' + L('evManagePeople') + '</span></button>' +
        '<button type="button" class="ccact" data-eva="cancel">' + ICON.trash + '<span>' + (ev.cancelled ? L('reactivate') : L('cancel')) + '</span></button>' +
        '<button type="button" class="ccact del" data-eva="del">' + ICON.trash + '<span>' + L('del') + '</span></button>' +
        '<button type="button" class="ccact close" data-eva="close">' + L('ccClose') + '</button>';
    } else if (st.mode === 'edit') {
      body = '<p class="cck">' + L('evEdit') + '</p><h3>' + esc(ev.title) + '</h3>' +
        '<form data-form="edit-ev" data-id="' + esc(ev.id) + '" novalidate>' +
        fld(L('label'), inTitle(ev.title)) +
        grid(fld(L('date'), inDate(ev.date)), fld(L('time'), inTime(ev.time))) +
        fld(L('place'), inPlace(ev.place)) +
        fld('', '<label class="check"><input type="checkbox" name="rsvp"' + (ev.rsvp ? ' checked' : '') + '><span>' + L('rsvpRequired') + '</span></label>') +
        '<div class="dlgbtns"><button type="button" class="btn ghost inline" data-eva="close">' + L('dismiss') + '</button><button type="button" class="btn inline" data-eva="save-ev">' + L('save') + '</button></div></form>';
    } else if (st.mode === 'people') {
      body = '<p class="cck">' + L('evManagePeople') + '</p><h3>' + esc(ev.title) + '</h3>' +
        '<input class="input" name="q" placeholder="' + esc(L('ccSearch')) + '" autocomplete="off" value="' + esc(st.q || '') + '" style="margin-bottom:10px">' +
        '<div id="evpeoplebox">' + evPeopleList(ev) + '</div>' +
        '<div class="dlgbtns" style="margin-top:12px"><button type="button" class="btn inline" data-eva="close">' + L('ccClose') + '</button></div>';
    }
    var wrap = document.getElementById('evsheet');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'evsheet';
      wrap.className = 'ccsheet';
      wrap.addEventListener('click', evClick);
      wrap.addEventListener('input', function (e) {
        if (e.target.name === 'q' && evSheet) {
          evSheet.q = e.target.value;
          var box = document.getElementById('evpeoplebox');
          if (box) box.innerHTML = evPeopleList(ev);
        }
      });
      document.body.appendChild(wrap);
      document.addEventListener('keydown', evKey, true);
    }
    wrap.innerHTML = '<div class="ccsheetcard" role="dialog" aria-modal="true" aria-label="' + esc(ev.title) + '">' + body + '</div>';
    var first = wrap.querySelector('.input') || wrap.querySelector('button');
    if (first) { try { first.focus({ preventScroll: true }); } catch (x) { first.focus(); } }
  }

  async function evClick(e) {
    var wrap = document.getElementById('evsheet');
    if (e.target === wrap) { evClose(); return; }
    var b = e.target.closest('[data-eva]');
    if (b) {
      var a = b.dataset.eva, st = evSheet;
      if (a === 'close') { evClose(); return; }
      if (a === 'edit') { st.mode = 'edit'; evDraw(); return; }
      if (a === 'people') { st.mode = 'people'; evDraw(); return; }
      if (a === 'setresp') { return setResponseFor(st.id, b.dataset.uid, b.dataset.val); }
      // Speichern-Knopf im Edit-Sheet: Formular direkt hier abhandeln
      if (a === 'save-ev') {
        var form = wrap.querySelector('[data-form="edit-ev"]');
        if (!form) return;
        var g2 = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
        var rsvpV = !!(form.querySelector('[name=rsvp]') && form.querySelector('[name=rsvp]').checked);
        var evId = form.dataset.id;
        evClose();
        await act(function () { return sb.from('events').update({ title: g2('title'), event_date: g2('date'), start_time: g2('time'), place: g2('place'), rsvp_required: rsvpV }).eq('id', evId); }, L('eventChanged'));
        try { await loadAll(); } catch (e2) { console.error(e2); }
        render();
        return;
      }
      if (a === 'addextra') {
        var inp = document.querySelector('#evsheet .evpextra');
        var nm = (inp ? inp.value : '').trim();
        if (!nm) { toast(L('ccNeedName')); return; }
        var key = 'x:' + nm;
        return setResponseFor(st.id, key, 'solo');
      }
      if (a === 'cancel') {
        var ev1 = S.events.filter(function (x) { return x.id === st.id; })[0];
        evClose();
        return act(function () { return sb.from('events').update({ cancelled: !ev1.cancelled }).eq('id', ev1.id); }, ev1.cancelled ? L('evReactivated') : L('evCancelledMsg'));
      }
      if (a === 'del') {
        var id = st.id, title = (S.events.filter(function (x) { return x.id === id; })[0] || {}).title || '';
        evClose();
        if (!(await askConfirm(L('del'), L('confirmDelEvent'), true))) return;
        return act(function () { return sb.from('events').delete().eq('id', id); }, L('eventDeleted'));
      }
      return;
    }
  }

  async function addMember(name, phoneRaw, asGuest) {
    var phone = normPhone(phoneRaw);
    if (!phone) { toast(L('phoneInvalid')); return false; }
    if (S.members.some(function (m) { return m.phone === phone; })) { toast(L('alreadyReg')); return false; }
    try {
      var code = await sb.rpc('get_club_code');
      if (code.error) throw code.error;
      // Eigener, kurzlebiger Client: die Sitzung des Admins bleibt unverändert
      var tmp = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      var r = await tmp.auth.signUp({
        email: phoneToEmail(phone), password: defaultPin(phone),
        options: { data: { name: name, phone: phone, club_code: code.data || '', created_by_admin: 'true' } }
      });
      if (r.error) throw r.error;
      if (asGuest && r.data && r.data.user) {
        var gr = await sb.rpc('set_guest', { target: r.data.user.id, make_guest: true });
        if (gr.error) throw gr.error;
      }
      toast(L('memberAdded', { name: name }));
      return true;
    } catch (e) {
      console.error(e);
      toast(L('addFailed', { reason: /already/i.test(String(e.message)) ? L('alreadyReg') : String(e.message || L('unknownError')).slice(0, 100) }));
      return false;
    } finally {
      try { await loadAll(); render(); } catch (e2) { console.error(e2); }
    }
  }

  /* ---------- Anmeldung ---------- */
  function authError(e) {
    var m = String((e && e.message) || '');
    if (/invalid login/i.test(m)) return L('authInvalid');
    if (/already registered|already been registered/i.test(m)) return L('authAlready');
    if (/database error|Ungültiger Vereinscode/i.test(m)) return L('authCode');
    if (/rate limit|too many/i.test(m)) return L('authRate');
    if (/password/i.test(m)) return L('authPin');
    return L('authFail');
  }

  async function handleAuth(g) {
    var phone = normPhone(g('phone'));
    S.phone = g('phone');
    if (!phone) { S.err = L('phoneInvalid'); render(); return; }
    var custom = g('pin');
    if (custom && !/^\d{6}$/.test(custom)) { S.err = L('pinExact'); render(); return; }
    var pin = (S.mode === 'login' && custom) ? custom : defaultPin(phone);
    S.busy = true; S.err = ''; render();
    try {
      var res;
      if (S.mode === 'register') {
        res = await sb.auth.signUp({
          email: phoneToEmail(phone), password: pin,
          options: { data: { name: g('name'), phone: phone, club_code: g('code'), language: lang } }
        });
        if (!res.error && !res.data.session) {
          throw new Error('CONFIRM_EMAIL');
        }
      } else {
        res = await sb.auth.signInWithPassword({ email: phoneToEmail(phone), password: pin });
      }
      if (res.error) throw res.error;
      S.busy = false;
      await enter(res.data.session);
    } catch (e) {
      console.error(e);
      S.busy = false;
      S.err = e.message === 'CONFIRM_EMAIL' ? L('confirmEmailOff') : authError(e);
      S.step = 'login';
      render();
    }
  }

  async function enter(session) {
    S.session = session;
    S.step = 'loading'; render();
    try {
      await loadAll();
      if (!S.me) throw new Error('Kein Profil gefunden');
      if (S.me.language && LANGS.indexOf(S.me.language) > -1) setLang(S.me.language);
      else saveLang();   // Sprache dieses Geräts im Profil merken
      if (S.me.theme === 'light' || S.me.theme === 'dark') setTheme(S.me.theme);
      else if (theme) saveTheme();   // Darstellung dieses Geräts im Profil merken
      S.step = 'app'; S.tab = 'trainings'; S.err = '';
      subscribe();
      render();
      window.scrollTo(0, 0);
    } catch (e) {
      console.error(e);
      S.step = 'login';
      S.err = L('loadFail');
      render();
    }
  }

  // Gewählte Sprache im Profil speichern (schlägt still fehl, falls die Datenbank noch nicht aktualisiert wurde)
  function saveLang() {
    if (!sb || !S.me) return;
    try { sb.from('profiles').update({ language: lang }).eq('id', S.me.id).then(function () {}, function () {}); } catch (e) { /* ignorieren */ }
  }
  document.addEventListener('change', function (e) {
    var cb = e.target;
    if (cb && cb.dataset && cb.dataset.ccactive) {
      var cid = cb.dataset.ccactive, on = cb.checked;
      delete S.ccFold[cid];
      act(function () { return sb.from('cc_events').update({ active: on }).eq('id', cid); }, L('ccSaved'));
      return;
    }
    if (cb && cb.dataset && cb.dataset.act === 'cc-toggle-public') {
      var pub = cb.checked;
      act(function () { return sb.rpc('set_cc_public', { make_public: pub }); }, pub ? L('ccPublicOn') : L('ccPublicOff'));
      return;
    }
    if (cb && cb.dataset && cb.dataset.jsactive) {
      var jid = cb.dataset.jsactive, jon = cb.checked;
      act(function () { return sb.from('jass_days').update({ active: jon }).eq('id', jid); }, L('ccSaved'));
      return;
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el || !el.hasAttribute || !el.hasAttribute('data-lang')) return;
    setLang(el.value);
    if (S.step === 'app' && S.me) { S.me.language = lang; saveLang(); render(); toast(L('langSaved')); }
    else render();
  });

  /* ---------- Live-Aktualisierung ---------- */
  var channel = null, reloadTimer;
  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async function () {
      if (S.step !== 'app') return;
      try { await loadAll(); softRender(); if (ccSheet && ccSheet.mode === 'menu') ccDrawSheet(); } catch (e) { console.error(e); }
    }, 400);
  }
  function subscribe() {
    if (channel || !sb) return;
    try {
      channel = sb.channel('vereins-daten').on('postgres_changes', { event: '*', schema: 'public' }, scheduleReload).subscribe();
    } catch (e) { console.error(e); }
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') scheduleReload(); });

  /* ---------- Klicks ---------- */
  document.addEventListener('click', async function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act_ = el.dataset.act;
    var D = el.dataset;

    if (act_ === 'mode') { S.mode = S.mode === 'login' ? 'register' : 'login'; S.err = ''; render(); return; }
    if (act_ === 'tab') { S.tab = D.tab; S.edit = null; render(); window.scrollTo(0, 0); return; }
    if (act_ === 'who') { S.open[D.key] = !S.open[D.key]; render(); return; }
    if (act_ === 'js-fold') { S.jsFold[D.id] = !S.jsFold[D.id]; render(); return; }
    if (act_ === 'js-print-past') { try { await jsPrintMatrix(); } catch (err) { console.error(err); toast(L('ccPdfFailed')); } return; }
    if (act_ === 'js-hint') { S.info['jsh:' + D.id] = !S.info['jsh:' + D.id]; render(); return; }
    if (act_ === 'js-menu') { if (jsEdit()) jsOpen({ lvl: D.lvl, id: D.id, mode: 'menu' }); return; }
    if (act_ === 'js-pick') { if (jsEdit()) jsOpen({ lvl: 'day', id: D.id, mode: 'pick', slot: Number(D.slot), q: '' }); return; }
    if (act_ === 'js-addday') { if (jsEdit()) jsOpen({ lvl: 'day', id: null, mode: 'day-form' }); return; }
    if (act_ === 'mb-menu') { if (S.me && S.me.isAdmin) mbOpen(D.id); return; }
    if (act_ === 'mb-grp') { S.sec[D.id] = S.sec[D.id] !== true; render(); return; }
    if (act_ === 'cc-addevent') { if (canCC()) ccOpen('root', null, 'add'); return; }
    if (act_ === 'cc-fold') { S.ccFold[D.id] = !ccIsFolded(D.id); render(); return; }
    if (act_ === 'cc-menu') { if (canCC()) ccOpen(D.lvl, D.id || null, 'menu'); return; }
    if (act_ === 'cc-print') { ccExportPdf(D.id); return; }
    if (act_ === 'ev-menu') { if (canManageEvents()) evOpen(D.id, 'menu'); return; }
    if (act_ === 'cc-guest') { if (S.me && S.me.isAdmin) ccOpen('guest', null, 'guest', { name: D.name }); return; }
    if (act_ === 'who-ev') { S.open['ev:' + D.id] = !S.open['ev:' + D.id]; render(); return; }
    if (act_ === 'sec') { S.sec[D.id] = !S.sec[D.id]; render(); return; }
    if (act_ === 'info-toggle') {
      S.info[D.id] = !S.info[D.id];
      if (S.info[D.id]) S.sec[D.id] = true;
      render();
      return;
    }
    if (act_ === 'add-toggle') {
      S.add[D.id] = !S.add[D.id];
      if (S.add[D.id]) S.sec[D.id] = true;
      render();
      var af = document.querySelector('.addform');
      if (S.add[D.id] && af) af.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (act_ === 'acc-menu') {
      var mid = D.id, meta = ACC_META[mid] || {};
      var items = [];
      if (meta.info) items.push({
        icon: ICON.info, label: S.info[mid] ? L('infoHide') : L('infoShow'),
        onClick: function () { S.info[mid] = !S.info[mid]; if (S.info[mid]) S.sec[mid] = true; render(); }
      });
      if (meta.canAdd) items.push({
        icon: ICON.plus, label: S.add[mid] ? L('addClose') : L('addNew'),
        onClick: function () {
          S.add[mid] = !S.add[mid]; if (S.add[mid]) S.sec[mid] = true; render();
          var af = document.querySelector('.addform');
          if (S.add[mid] && af) af.scrollIntoView({ block: 'nearest' });
        }
      });
      openSimpleMenu(items);
      return;
    }
    if (act_ === 'more-tr') { S.showMore = !S.showMore; render(); return; }
    if (act_ === 'edit') {
      S.edit = D.target;
      S.sec[D.target.indexOf('rule:') === 0 ? 'rules' : D.target.indexOf('ev:') === 0 ? 'events' : D.target.indexOf('tr:x#') === 0 ? 'extra' : 'upcoming'] = true;
      render();
      var ef = document.querySelector('.editform');
      if (ef) ef.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (act_ === 'edit-cancel') { S.edit = null; render(); return; }
    if (act_ === 'install') {
      if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(); }
      return;
    }
    if (act_ === 'logout') {
      ccCloseSheet();
      mbClose();
      jsClose();
      closeSimpleMenu();
      evClose();
      try { await sb.auth.signOut(); } catch (err) { console.error(err); }
      if (channel) { try { sb.removeChannel(channel); } catch (err2) { /* ignorieren */ } channel = null; }
      S = freshState(); S.step = 'login'; render(); window.scrollTo(0, 0);
      return;
    }

    if (act_ === 'resp') return setResponse('training_responses', 'training_key', D.key, D.val, D.val === 'yes' ? L('youIn') : L('youOut'));
    if (act_ === 'resp-ev') return setResponse('event_responses', 'event_id', D.id, D.val, D.val === 'solo' ? L('youSolo') : D.val === 'duo' ? L('youDuo') : L('youOut'));

    if (act_ === 'cal') {
      var ce = S.events.filter(function (x) { return x.id === D.id; })[0];
      if (ce) { try { await addToCalendar(ce); } catch (err) { console.error(err); toast(L('calFail')); } }
      return;
    }
    if (act_ === 'set-theme') {
      setTheme(D.val);
      S.me.theme = theme || null;
      saveTheme();
      render();
      return;
    }
    if (act_ === 'pin-default') {
      try {
        var pr = await sb.auth.updateUser({ password: defaultPin(S.me.phone) });
        if (pr.error) throw pr.error;
        toast(L('pinResetOk'));
        S.me.pinChanged = false;
        try { await sb.from('profiles').update({ pin_changed: false }).eq('id', S.me.id); } catch (e3) { console.error(e3); }
      } catch (err) { console.error(err); toast(L('pinResetFail')); }
      return;
    }

    /* Event-Aktionen: Admins und Event-Manager */
    if (canManageEvents()) {
      if (act_ === 'del-ev') {
        if (!(await askConfirm(L('del'), L('confirmDelEvent'), true))) return;
        return act(function () { return sb.from('events').delete().eq('id', D.id); }, L('eventDeleted'));
      }
      if (act_ === 'cancel-ev') {
        var evx = S.events.filter(function (x) { return x.id === D.id; })[0];
        if (!evx) return;
        return act(function () { return sb.from('events').update({ cancelled: !evx.cancelled }).eq('id', D.id); }, evx.cancelled ? L('evReactivated') : L('evCancelledMsg'));
      }
    }

    /* Training absagen / reaktivieren (nur Admin) */
    if (act_ === 'cancel') {
      if (!S.me || !S.me.isAdmin) return;
      var off = !!S.cancelled[D.key];
      if (off) {
        return act(function () { return sb.from('training_cancellations').delete().eq('training_key', D.key); }, L('trReactivated'));
      } else {
        return act(function () { return sb.from('training_cancellations').insert({ training_key: D.key }); }, L('trCancelledMsg'));
      }
    }

    /* Admin-Aktionen */
    if (!S.me || !S.me.isAdmin) return;
    if (act_ === 'del-rule') {
      if (!(await askConfirm(L('remove'), L('confirmDelRule'), true))) return;
      return act(function () { return sb.from('training_rules').delete().eq('id', D.id); }, L('ruleRemoved'));
    }
    if (act_ === 'del-extra') {
      if (!(await askConfirm(L('del'), L('confirmDelExtra'), true))) return;
      return act(function () { return sb.from('training_extras').delete().eq('id', D.id); }, L('extraDeleted'));
    }
    if (act_ === 'reset-tr') {
      S.edit = null;
      return act(function () { return sb.from('training_overrides').delete().eq('training_key', D.key); }, L('changeReset'));
    }
    if (act_ === 'reset-pin') {
      var who = S.members.filter(function (m) { return m.id === D.id; })[0];
      if (!(await askConfirm(L('resetPin'), L('confirmResetPin', { name: who ? who.name : L('thisMemberDat') }), false))) return;
      return act(function () { return sb.rpc('reset_pin', { target: D.id }); }, L('pinReset'));
    }
    if (act_ === 'remove-member') {
      var rm = S.members.filter(function (m) { return m.id === D.id; })[0];
      if (!(await askConfirm(L('remove'), L('confirmRemove', { name: rm ? rm.name : L('thisMember') }), true))) return;
      return act(function () { return sb.rpc('remove_member', { target: D.id }); }, L('memberRemoved'));
    }
    if (act_ === 'set-group') {
      var tg = S.members.filter(function (m) { return m.id === D.id; })[0];
      if ((D.val === 'guest' || D.val === 'candidate') && tg && (tg.isAdmin || tg.isEventManager || tg.isChilbiManager || tg.isChraenzliManager || tg.isJassMaster) &&
          !(await askConfirm(L(D.val === 'guest' ? 'guestTag' : 'grpCandidate'), L('confirmGuestLoses', { name: tg.name }), false))) return;
      return act(function () { return sb.rpc('set_member_group', { target: D.id, grp: D.val }); }, L('groupChanged'));
    }
    if (act_ === 'set-em') {
      return act(function () { return sb.rpc('set_event_manager', { target: D.id, make_manager: D.val === '1' }); }, D.val === '1' ? L('emGranted') : L('emRevoked'));
    }
    if (act_ === 'set-jm') {
      return act(function () { return sb.rpc('set_jass_master', { target: D.id, make_master: D.val === '1' }); }, D.val === '1' ? L('jmGranted') : L('jmRevoked'));
    }
    if (act_ === 'set-cm') {
      return act(function () { return sb.rpc('set_chilbi_manager', { target: D.id, make_manager: D.val === '1' }); }, D.val === '1' ? L('cmGranted') : L('cmRevoked'));
    }
    if (act_ === 'set-crm') {
      return act(function () { return sb.rpc('set_chraenzli_manager', { target: D.id, make_manager: D.val === '1' }); }, D.val === '1' ? L('crmGranted') : L('crmRevoked'));
    }
    if (act_ === 'set-admin') {
      return act(function () { return sb.rpc('set_admin', { target: D.id, make_admin: D.val === '1' }); }, D.val === '1' ? L('adminGranted') : L('adminRevoked'));
    }
  });

  /* ---------- Formulare ---------- */
  document.addEventListener('submit', async function (e) {
    var form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    if (S.busy) return;
    var f = new FormData(form);
    var kind = form.dataset.form;
    var id = form.dataset.id;
    var g = function (k) { if (k === 'phone' && f.has('phonecc')) return composePhone(f.get('phonecc'), f.get('phone')); return String(f.get(k) || '').trim(); };
    var ok;

    if (kind === 'auth') return handleAuth(g);
    if (!S.me) return;

    if (kind === 'name') {
      return act(function () { return sb.from('profiles').update({ name: g('name') }).eq('id', S.me.id); }, L('nameSaved'));
    }
    if (kind === 'pin') {
      if (!/^\d{6}$/.test(g('pin'))) { toast(L('pinExact')); return; }
      try {
        var r = await sb.auth.updateUser({ password: g('pin') });
        if (r.error) throw r.error;
        form.reset(); toast(L('pinChanged'));
        S.me.pinChanged = true;
        try { await sb.from('profiles').update({ pin_changed: true }).eq('id', S.me.id); } catch (e2) { console.error(e2); }
      } catch (err) { console.error(err); toast(L('pinChangeFail')); }
      return;
    }
    if (!S.me.isAdmin && !(S.me.isEventManager && (kind === 'event' || kind === 'edit-ev' || kind === 'ev-resp'))) return;

    if (kind === 'member-edit') {
      var nph = normPhone(g('phone'));
      if (!g('name')) { toast(L('ccNeedName')); return; }
      if (!nph) { toast(L('phoneInvalid')); return; }
      S.busy = true;
      var ur = await sb.rpc('admin_update_member', { target: form.dataset.id, new_name: g('name'), new_phone: nph });
      S.busy = false;
      if (ur.error) {
        console.error(ur.error);
        toast(/PHONE_TAKEN|duplicate|unique/i.test(ur.error.message || '') ? L('mPhoneTaken') : L('errFailed') + ': ' + String(ur.error.message || '').slice(0, 100));
        return;
      }
      mbClose();
      toast(L('mSaved'));
      try { await loadAll(); render(); } catch (x) { console.error(x); }
      return;
    }
    if (kind === 'member') {
      S.busy = true;
      var added = await addMember(g('name'), g('phone'), !!f.get('guest'));
      S.busy = false;
      if (added) { S.add.members = false; render(); }
      return;
    }
    if (kind === 'rule') {
      ok = await act(function () { return sb.from('training_rules').insert({ weekday: Number(g('wd')), start_time: g('time'), place: g('place') }); }, L('ruleAdded'));
    } else if (kind === 'extra') {
      ok = await act(function () { return sb.from('training_extras').insert({ title: g('title'), event_date: g('date'), start_time: g('time'), place: g('place') }); }, L('extraAdded'));
    } else if (kind === 'event') {
      var rsvpNew = !!(form.querySelector('[name=rsvp]') && form.querySelector('[name=rsvp]').checked);
      ok = await act(function () { return sb.from('events').insert({ title: g('title'), event_date: g('date'), start_time: g('time'), place: g('place'), rsvp_required: rsvpNew }); }, L('eventAdded'));
    } else if (kind === 'edit-rule') {
      ok = await act(function () { return sb.from('training_rules').update({ weekday: Number(g('wd')), start_time: g('time'), place: g('place') }).eq('id', id); }, L('ruleChanged'));
      if (ok) S.edit = null;
    } else if (kind === 'edit-tr') {
      if (id.indexOf('x#') === 0) {
        ok = await act(function () { return sb.from('training_extras').update({ title: g('title'), event_date: g('date'), start_time: g('time'), place: g('place') }).eq('id', id.slice(2)); }, L('trChanged'));
      } else {
        ok = await act(function () { return sb.from('training_overrides').upsert({ training_key: id, new_date: g('date'), new_time: g('time'), new_place: g('place') }); }, L('trChanged'));
      }
      if (ok) S.edit = null;
    } else if (kind === 'edit-ev') {
      var rsvpEdit = !!(form.querySelector('[name=rsvp]') && form.querySelector('[name=rsvp]').checked);
      ok = await act(function () { return sb.from('events').update({ title: g('title'), event_date: g('date'), start_time: g('time'), place: g('place'), rsvp_required: rsvpEdit }).eq('id', id); }, L('eventChanged'));
      if (ok) { S.edit = null; if (evSheet && evSheet.id === id) evClose(); }
    }
    if (ok && kind === 'rule') S.add.rules = false;
    if (ok && kind === 'event') S.add.events = false;
    if (ok) {
      // Nach Event anlegen/bearbeiten: Daten neu laden damit rsvp_required sofort korrekt ist.
      if (kind === 'event' || kind === 'edit-ev') {
        try { await loadAll(); } catch (e2) { console.error(e2); }
      }
      render();
      if (/^(extra)$/.test(kind)) { var nf = document.querySelector('[data-form="' + kind + '"]'); if (nf) nf.reset(); }
    }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || (t.name !== 'phone' && t.name !== 'phonecc') || !t.closest('[data-form="auth"],[data-form="member"],[data-ccform="guest"],[data-form="member-edit"]')) return;
    var row = t.closest('.phonerow');
    if (!row) return;
    var sel = row.querySelector('select'), inp = row.querySelector('input');
    var pos = inp.selectionStart, atEnd = pos === inp.value.length;
    var before = inp.value.slice(0, pos).replace(/\D/g, '').length;
    var v = inp.value;
    // Vollständig internationale Eingabe (+49 … / 0041 …): Land automatisch wählen
    var m = v.replace(/\s/g, '').match(/^(?:\+|00)(\d+)/);
    if (m) {
      var hit = PHONE_CC.filter(function (x) { return m[1].indexOf(x.c) === 0; })[0];
      if (hit) { sel.value = hit.c; v = fmtNational(hit.c, m[1].slice(hit.c.length)); atEnd = true; }
      else { sel.value = ''; v = '+' + m[1]; }
    } else if (sel.value) {
      v = fmtNational(sel.value, v.replace(/\D/g, '').replace(/^0+/, ''));
    }
    var info = ccInfo(sel.value);
    inp.placeholder = info ? info.ph : '+43 …';
    if (v === inp.value) return;
    inp.value = v;
    if (atEnd) pos = v.length;
    else { var c = 0; pos = 0; while (pos < v.length && c < before) { if (/\d/.test(v.charAt(pos))) c++; pos++; } }
    try { inp.setSelectionRange(pos, pos); } catch (x) { /* ignorieren */ }
  });

  /* ---------- Installation & Start ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); installPrompt = e;
    if (S.step === 'app' && S.tab === 'profile') softRender();
  });

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* ignorieren */ }); });
  }

  async function init() {
    document.documentElement.lang = LANG_HTML[lang];
    if (!sb) { S.step = 'setup'; render(); return; }
    render();
    try {
      var res = await sb.auth.getSession();
      if (res.data && res.data.session) { await enter(res.data.session); }
      else { S.step = 'login'; render(); }
    } catch (e) { console.error(e); S.step = 'login'; render(); }
    sb.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT' && S.step === 'app') { S = freshState(); S.step = 'login'; render(); }
    });
  }
  init();
})();
