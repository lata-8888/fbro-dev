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
  var LANGS = ['de', 'fr', 'en', 'it', 'gsw', 'uk', 'bar', 'cs', 'nl'];
  var LANG_NAMES = { de: 'Deutsch', fr: 'Français', en: 'English', it: 'Italiano', gsw: 'Züridütsch', uk: 'Українська', bar: 'Boarisch', cs: 'Čeština', nl: 'Nederlands' };
  var LANG_LOCALE = { de: 'de-CH', fr: 'fr-CH', en: 'en-GB', it: 'it-CH', uk: 'uk-UA', cs: 'cs-CZ', nl: 'nl-NL' };
  var LANG_HTML = { de: 'de-CH', fr: 'fr-CH', en: 'en', it: 'it-CH', gsw: 'gsw', uk: 'uk', bar: 'bar', cs: 'cs', nl: 'nl' };

  var DICT = {
    de: {
      wd0: 'Sonntag', wd1: 'Montag', wd2: 'Dienstag', wd3: 'Mittwoch', wd4: 'Donnerstag', wd5: 'Freitag', wd6: 'Samstag',
      navTrainings: 'Trainings', navEvents: 'Events', navAdmin: 'Verwalten', navProfile: 'Profil',
      titleTrainings: '{club}-Trainings', titleEvents: '{club}-Events',
      subTrainings: 'Die nächsten {n} Termine', subEvents: 'Folgende Vereinsanlässe sind geplant', moreDates: 'Weitere Termine ({n})',
      emptyTrTitle: 'Noch keine Trainings geplant.', emptyTrAdmin: 'Lege im Bereich «Verwalten» einen Trainingstag fest.', emptyTrMember: 'Die Admins legen die Trainingstage fest.',
      emptyEvTitle: 'Aktuell sind keine Events geplant.', emptyEvAdmin: 'Lege im Bereich «Verwalten» einen Event an.', emptyEvMember: 'Die Admins legen neue Events an.',
      trainingWord: 'Training', trCancelled: 'Training abgesagt', yes: 'Dabei', no: 'Nicht dabei', participants: 'Teilnehmer',
      ariaTr: '{yes} Teilnehmer, {no} nicht dabei. Teilnehmerliste {action}', ariaEv: '{n} Teilnehmer. Teilnehmerliste {action}',
      listOpen: 'öffnen', listClose: 'schliessen',
      hYes: 'Dabei ({n})', hNo: 'Nicht dabei ({n})', hOpen: 'Noch keine Antwort ({n})', hSolo: 'Allein dabei ({n})', hDuo: 'Zu zweit dabei ({n} Mitglieder, {p} Personen)',
      nobody: 'Niemand', you: '(du)', cancelledTag: 'Abgesagt', cancelledLow: 'abgesagt', changedLow: 'geändert',
      timePlace: '{time} Uhr, {place}', atTime: '{time} Uhr', calAdd: 'Im Kalender speichern', solo: 'Allein', duo: 'Zu zweit',
      secRules: 'Montag Trainings', secExtra: 'Weitere Trainings', secUpcoming: 'Kommende Trainings', secEvents: 'Events', secMembers: 'Mitglieder',
      addNew: 'Neu erfassen', addClose: 'Erfassung schliessen',
      adminTitle: 'Verwalten', adminSub: 'Nur für Admins sichtbar', rulesIntro: 'Standard-Trainings pro Woche',
      weekday: 'Wochentag', time: 'Uhrzeit', place: 'Ort', date: 'Datum', label: 'Bezeichnung',
      phPlaceTraining: 'z. B. Turnhalle Schulhaus Nord', addRule: 'Trainingstag hinzufügen',
      edit: 'Bearbeiten', remove: 'Entfernen', cancel: 'Absagen', reactivate: 'Reaktivieren', del: 'Löschen', save: 'Speichern', dismiss: 'Abbrechen', reset: 'Zurücksetzen',
      editNote: 'Gilt nur für diesen Termin. Die Antworten der Mitglieder bleiben erhalten.',
      rulesEmpty: 'Noch kein fester Trainingstag. Tippe auf «+», um einen zu erfassen.',
      extraIntro: 'Folgende zusätzliche Trainings sind geplant', extraEmpty: 'Keine zusätzlichen Trainings geplant.', extraDefaultTitle: 'Zusatztraining',
      phPlaceExtra: 'z. B. Sportanlage Süd', addExtra: 'Weiteres Training hinzufügen', upcomingEmpty: 'Keine kommenden Trainings.',
      phEventTitle: 'z. B. Fondue-Plausch', phEventPlace: 'z. B. Vereinshaus', addEvent: 'Event hinzufügen',
      eventsEmpty: 'Noch keine Events. Tippe auf «+», um den ersten zu erfassen.',
      membersIntro: 'Krone: Mitglied oder Gast (leere Krone). Stern: Admin. Weinglas: Event-Manager. Diese Rollen können nur Admins ändern. Gäste sehen nur Trainings und Profil, keine Events. Der Standard-PIN sind die letzten 6 Ziffern der Handynummer.',
      memberAdd: 'Mitglied hinzufügen', fullName: 'Vor- und Nachname', phone: 'Handynummer',
      memberAddNote: 'Das Mitglied meldet sich nur mit der Handynummer an. Der PIN sind die letzten 6 Ziffern.',
      selfAdmin: 'Du bist Admin. Du kannst dir die Rechte nicht selbst entziehen.', revokeAdmin: 'Admin-Rechte entziehen: {name}', makeAdmin: 'Zum Admin machen: {name}',
      adminTag: 'Admin', resetPin: 'PIN zurücksetzen',
      profileTitle: 'Profil', nameLabel: 'Name',
      installTitle: 'App installieren', installHint: 'Lege die App auf deinen Startbildschirm, dann öffnet sie sich im Vollbild.', installBtn: 'Auf dem Startbildschirm speichern',
      installIos: 'Tippe unten in Safari auf «Teilen» und dann auf «Zum Home-Bildschirm». Danach öffnet sich die App im Vollbild.',
      nameChange: 'Name ändern', nameSave: 'Name speichern',
      pinChange: 'PIN ändern', pinIntro: 'Standardmässig sind es die letzten 6 Ziffern deiner Handynummer. Wenn du den PIN änderst, musst du ihn bei der Anmeldung eintragen.',
      pinNew: 'Neuer PIN (6 Ziffern)', pinSave: 'PIN speichern', pinDefault: 'Auf Standard-PIN zurücksetzen', logout: 'Abmelden',
      language: 'Sprache', languageHint: 'Wähle die Sprache, in der du die App nutzen möchtest.',
      loginSub: 'Teilnahme',
      loginLeadReg: 'Erstelle dein Konto mit Name, Handynummer und Vereinscode. Dein PIN sind die letzten 6 Ziffern deiner Handynummer.',
      loginLead: 'Melde dich mit deiner Handynummer an.', pinOptional: 'PIN (nur nötig, wenn du ihn geändert hast)', clubCode: 'Vereinscode',
      register: 'Konto erstellen', signIn: 'Anmelden', haveAccount: 'Ich habe schon ein Konto', firstTime: 'Zum ersten Mal hier? Konto erstellen',
      setupTitle: 'Einrichtung nötig', setupLead: 'Die App ist noch nicht mit Supabase verbunden.',
      setupStep1: 'Öffne die Datei <code>config.js</code>.', setupStep2: 'Trage <code>SUPABASE_URL</code> und <code>SUPABASE_ANON_KEY</code> aus deinem Supabase-Projekt ein.',
      setupStep3: 'Lade die Seite neu.', setupNote: 'Die genaue Anleitung steht in der Datei README.md.',
      loading: 'Lade …',
      errFailed: 'Das hat nicht geklappt', respWithdrawn: 'Antwort zurückgezogen', youIn: 'Du bist dabei', youOut: 'Du bist nicht dabei', youSolo: 'Du kommst allein', youDuo: 'Du kommst zu zweit',
      phoneInvalid: 'Bitte gib eine gültige Handynummer ein, z. B. 079 123 45 67.', alreadyReg: 'Diese Nummer ist schon registriert.',
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
      guestCheck: 'Als Gast hinzufügen (sieht nur Trainings und Profil)', guestInfo: 'Du hast Gast-Zugang. Du siehst die Trainings und dein Profil.',
      memberTag: 'Mitglied', emTag: 'Event-Manager', makeEm: 'Zum Event-Manager machen: {name}', revokeEm: 'Event-Manager-Rechte entziehen: {name}', emGranted: 'Als Event-Manager festgelegt', emRevoked: 'Event-Manager-Rechte entzogen', confirmGuestLoses: '{name} hat Admin- oder Event-Manager-Rechte. Als Gast festlegen entzieht diese Rechte. Fortfahren?', selfMember: 'Du bist Mitglied. Du kannst dich nicht selbst zum Gast machen.', rolesTitle: 'Rollen', emSub: 'Hier verwaltest du die Events.',
      infoShow: 'Erklärung anzeigen', infoHide: 'Erklärung ausblenden'
    },

    fr: {
      wd0: 'Dimanche', wd1: 'Lundi', wd2: 'Mardi', wd3: 'Mercredi', wd4: 'Jeudi', wd5: 'Vendredi', wd6: 'Samedi',
      navTrainings: 'Entraînements', navEvents: 'Événements', navAdmin: 'Gérer', navProfile: 'Profil',
      titleTrainings: 'Entraînements {club}', titleEvents: 'Événements {club}',
      subTrainings: 'Les {n} prochaines séances', subEvents: 'Voici les événements du club prévus', moreDates: 'Autres dates ({n})',
      emptyTrTitle: 'Aucun entraînement prévu pour le moment.', emptyTrAdmin: 'Définis un jour d’entraînement dans la section « Gérer ».', emptyTrMember: 'Les admins définissent les jours d’entraînement.',
      emptyEvTitle: 'Aucun événement prévu actuellement.', emptyEvAdmin: 'Crée un événement dans la section « Gérer ».', emptyEvMember: 'Les admins créent les nouveaux événements.',
      trainingWord: 'Entraînement', trCancelled: 'Entraînement annulé', yes: 'Présent', no: 'Absent', participants: 'Participants',
      ariaTr: '{yes} participants, {no} absents. {action} la liste des participants', ariaEv: '{n} participants. {action} la liste des participants',
      listOpen: 'Ouvrir', listClose: 'Fermer',
      hYes: 'Présents ({n})', hNo: 'Absents ({n})', hOpen: 'Pas encore de réponse ({n})', hSolo: 'Seul(e) ({n})', hDuo: 'À deux ({n} membres, {p} personnes)',
      nobody: 'Personne', you: '(toi)', cancelledTag: 'Annulé', cancelledLow: 'annulé', changedLow: 'modifié',
      timePlace: '{time}, {place}', atTime: '{time}', calAdd: 'Ajouter au calendrier', solo: 'Seul(e)', duo: 'À deux',
      secRules: 'Entraînements du lundi', secExtra: 'Autres entraînements', secUpcoming: 'Entraînements à venir', secEvents: 'Événements', secMembers: 'Membres',
      addNew: 'Ajouter', addClose: 'Fermer le formulaire',
      adminTitle: 'Gérer', adminSub: 'Visible uniquement pour les admins', rulesIntro: 'Entraînements standard par semaine',
      weekday: 'Jour de la semaine', time: 'Heure', place: 'Lieu', date: 'Date', label: 'Désignation',
      phPlaceTraining: 'p. ex. salle de gym de l’école Nord', addRule: 'Ajouter un jour d’entraînement',
      edit: 'Modifier', remove: 'Retirer', cancel: 'Annuler', reactivate: 'Réactiver', del: 'Supprimer', save: 'Enregistrer', dismiss: 'Fermer', reset: 'Réinitialiser',
      editNote: 'Ne concerne que cette date. Les réponses des membres sont conservées.',
      rulesEmpty: 'Aucun jour d’entraînement fixe. Touche « + » pour en ajouter un.',
      extraIntro: 'Les entraînements supplémentaires suivants sont prévus', extraEmpty: 'Aucun entraînement supplémentaire prévu.', extraDefaultTitle: 'Entraînement supplémentaire',
      phPlaceExtra: 'p. ex. centre sportif Sud', addExtra: 'Ajouter un entraînement', upcomingEmpty: 'Aucun entraînement à venir.',
      phEventTitle: 'p. ex. soirée fondue', phEventPlace: 'p. ex. maison du club', addEvent: 'Ajouter un événement',
      eventsEmpty: 'Aucun événement pour l’instant. Touche « + » pour créer le premier.',
      membersIntro: 'Couronne : membre ou invité (couronne vide). Étoile : admin. Verre à vin : responsable des événements. Seuls les admins peuvent modifier ces rôles. Les invités ne voient que les entraînements et le profil, pas les événements. Le PIN par défaut correspond aux 6 derniers chiffres du numéro de mobile.',
      memberAdd: 'Ajouter un membre', fullName: 'Prénom et nom', phone: 'Numéro de mobile',
      memberAddNote: 'Le membre se connecte uniquement avec son numéro de mobile. Le PIN correspond aux 6 derniers chiffres.',
      selfAdmin: 'Tu es admin. Tu ne peux pas te retirer tes droits toi-même.', revokeAdmin: 'Retirer les droits d’admin : {name}', makeAdmin: 'Nommer admin : {name}',
      adminTag: 'Admin', resetPin: 'Réinitialiser le PIN',
      profileTitle: 'Profil', nameLabel: 'Nom',
      installTitle: 'Installer l’application', installHint: 'Place l’application sur ton écran d’accueil, elle s’ouvrira alors en plein écran.', installBtn: 'Ajouter à l’écran d’accueil',
      installIos: 'Dans Safari, touche « Partager » en bas, puis « Sur l’écran d’accueil ». L’application s’ouvrira ensuite en plein écran.',
      nameChange: 'Modifier le nom', nameSave: 'Enregistrer le nom',
      pinChange: 'Modifier le PIN', pinIntro: 'Par défaut, ce sont les 6 derniers chiffres de ton numéro de mobile. Si tu modifies le PIN, tu devras le saisir lors de la connexion.',
      pinNew: 'Nouveau PIN (6 chiffres)', pinSave: 'Enregistrer le PIN', pinDefault: 'Rétablir le PIN par défaut', logout: 'Se déconnecter',
      language: 'Langue', languageHint: 'Choisis la langue dans laquelle tu souhaites utiliser l’application.',
      loginSub: 'Participation',
      loginLeadReg: 'Crée ton compte avec ton nom, ton numéro de mobile et le code du club. Ton PIN correspond aux 6 derniers chiffres de ton numéro de mobile.',
      loginLead: 'Connecte-toi avec ton numéro de mobile.', pinOptional: 'PIN (uniquement si tu l’as modifié)', clubCode: 'Code du club',
      register: 'Créer un compte', signIn: 'Se connecter', haveAccount: 'J’ai déjà un compte', firstTime: 'Première visite ? Créer un compte',
      setupTitle: 'Configuration nécessaire', setupLead: 'L’application n’est pas encore reliée à Supabase.',
      setupStep1: 'Ouvre le fichier <code>config.js</code>.', setupStep2: 'Saisis <code>SUPABASE_URL</code> et <code>SUPABASE_ANON_KEY</code> de ton projet Supabase.',
      setupStep3: 'Recharge la page.', setupNote: 'Les instructions détaillées se trouvent dans le fichier README.md.',
      loading: 'Chargement …',
      errFailed: 'Cela n’a pas fonctionné', respWithdrawn: 'Réponse retirée', youIn: 'Tu es présent(e)', youOut: 'Tu es absent(e)', youSolo: 'Tu viens seul(e)', youDuo: 'Tu viens à deux',
      phoneInvalid: 'Saisis un numéro de mobile valide, p. ex. 079 123 45 67.', alreadyReg: 'Ce numéro est déjà enregistré.',
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
      guestCheck: 'Ajouter comme invité (ne voit que les entraînements et le profil)', guestInfo: 'Tu as un accès invité. Tu vois les entraînements et ton profil.',
      memberTag: 'Membre', emTag: 'Responsable des événements', makeEm: 'Nommer responsable des événements : {name}', revokeEm: 'Retirer les droits de responsable des événements : {name}', emGranted: 'Défini comme responsable des événements', emRevoked: 'Droits de responsable des événements retirés', confirmGuestLoses: '{name} a des droits d’admin ou de responsable des événements. Le définir comme invité les retire. Continuer ?', selfMember: 'Tu es membre. Tu ne peux pas te définir toi-même comme invité.', rolesTitle: 'Rôles', emSub: 'Ici, tu gères les événements.',
      infoShow: 'Afficher l’explication', infoHide: 'Masquer l’explication'
    },

    en: {
      wd0: 'Sunday', wd1: 'Monday', wd2: 'Tuesday', wd3: 'Wednesday', wd4: 'Thursday', wd5: 'Friday', wd6: 'Saturday',
      navTrainings: 'Trainings', navEvents: 'Events', navAdmin: 'Manage', navProfile: 'Profile',
      titleTrainings: '{club} Trainings', titleEvents: '{club} Events',
      subTrainings: 'The next {n} sessions', subEvents: 'The following club events are planned', moreDates: 'More dates ({n})',
      emptyTrTitle: 'No trainings planned yet.', emptyTrAdmin: 'Set a training day in the “Manage” section.', emptyTrMember: 'The admins set the training days.',
      emptyEvTitle: 'No events planned at the moment.', emptyEvAdmin: 'Create an event in the “Manage” section.', emptyEvMember: 'The admins create new events.',
      trainingWord: 'Training', trCancelled: 'Training cancelled', yes: 'Attending', no: 'Not attending', participants: 'Participants',
      ariaTr: '{yes} participants, {no} not attending. {action} participant list', ariaEv: '{n} participants. {action} participant list',
      listOpen: 'Open', listClose: 'Close',
      hYes: 'Attending ({n})', hNo: 'Not attending ({n})', hOpen: 'No reply yet ({n})', hSolo: 'Attending alone ({n})', hDuo: 'Attending as a pair ({n} members, {p} people)',
      nobody: 'Nobody', you: '(you)', cancelledTag: 'Cancelled', cancelledLow: 'cancelled', changedLow: 'changed',
      timePlace: '{time}, {place}', atTime: '{time}', calAdd: 'Add to calendar', solo: 'Alone', duo: 'As a pair',
      secRules: 'Monday trainings', secExtra: 'More trainings', secUpcoming: 'Upcoming trainings', secEvents: 'Events', secMembers: 'Members',
      addNew: 'Add new', addClose: 'Close form',
      adminTitle: 'Manage', adminSub: 'Visible to admins only', rulesIntro: 'Standard trainings per week',
      weekday: 'Weekday', time: 'Time', place: 'Place', date: 'Date', label: 'Title',
      phPlaceTraining: 'e.g. North School gym', addRule: 'Add training day',
      edit: 'Edit', remove: 'Remove', cancel: 'Cancel', reactivate: 'Reactivate', del: 'Delete', save: 'Save', dismiss: 'Discard', reset: 'Reset',
      editNote: 'Applies to this date only. Members’ replies are kept.',
      rulesEmpty: 'No fixed training day yet. Tap “+” to add one.',
      extraIntro: 'The following additional trainings are planned', extraEmpty: 'No additional trainings planned.', extraDefaultTitle: 'Extra training',
      phPlaceExtra: 'e.g. South sports ground', addExtra: 'Add another training', upcomingEmpty: 'No upcoming trainings.',
      phEventTitle: 'e.g. Fondue evening', phEventPlace: 'e.g. Club house', addEvent: 'Add event',
      eventsEmpty: 'No events yet. Tap “+” to add the first one.',
      membersIntro: 'Crown: member or guest (empty crown). Star: admin. Wine glass: event manager. Only admins can change these roles. Guests see only the trainings and the profile, no events. The default PIN is the last 6 digits of the mobile number.',
      memberAdd: 'Add member', fullName: 'First and last name', phone: 'Mobile number',
      memberAddNote: 'The member signs in with the mobile number only. The PIN is the last 6 digits.',
      selfAdmin: 'You are an admin. You cannot remove your own rights.', revokeAdmin: 'Remove admin rights: {name}', makeAdmin: 'Make admin: {name}',
      adminTag: 'Admin', resetPin: 'Reset PIN',
      profileTitle: 'Profile', nameLabel: 'Name',
      installTitle: 'Install app', installHint: 'Add the app to your home screen and it opens in full screen.', installBtn: 'Add to home screen',
      installIos: 'In Safari, tap “Share” at the bottom, then “Add to Home Screen”. The app then opens in full screen.',
      nameChange: 'Change name', nameSave: 'Save name',
      pinChange: 'Change PIN', pinIntro: 'By default it is the last 6 digits of your mobile number. If you change the PIN, you must enter it when signing in.',
      pinNew: 'New PIN (6 digits)', pinSave: 'Save PIN', pinDefault: 'Reset to default PIN', logout: 'Sign out',
      language: 'Language', languageHint: 'Choose the language you would like to use the app in.',
      loginSub: 'Attendance',
      loginLeadReg: 'Create your account with your name, mobile number and club code. Your PIN is the last 6 digits of your mobile number.',
      loginLead: 'Sign in with your mobile number.', pinOptional: 'PIN (only needed if you changed it)', clubCode: 'Club code',
      register: 'Create account', signIn: 'Sign in', haveAccount: 'I already have an account', firstTime: 'First time here? Create an account',
      setupTitle: 'Setup required', setupLead: 'The app is not connected to Supabase yet.',
      setupStep1: 'Open the file <code>config.js</code>.', setupStep2: 'Enter <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> from your Supabase project.',
      setupStep3: 'Reload the page.', setupNote: 'Detailed instructions are in the file README.md.',
      loading: 'Loading …',
      errFailed: 'That did not work', respWithdrawn: 'Reply withdrawn', youIn: 'You are attending', youOut: 'You are not attending', youSolo: 'You are coming alone', youDuo: 'You are coming as a pair',
      phoneInvalid: 'Please enter a valid mobile number, e.g. 079 123 45 67.', alreadyReg: 'This number is already registered.',
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
      guestCheck: 'Add as guest (sees only trainings and profile)', guestInfo: 'You have guest access. You can see the trainings and your profile.',
      memberTag: 'Member', emTag: 'Event manager', makeEm: 'Make event manager: {name}', revokeEm: 'Remove event manager rights: {name}', emGranted: 'Set as event manager', emRevoked: 'Event manager rights removed', confirmGuestLoses: '{name} has admin or event manager rights. Setting as guest removes these rights. Continue?', selfMember: 'You are a member. You cannot set yourself as a guest.', rolesTitle: 'Roles', emSub: 'Here you manage the events.',
      infoShow: 'Show explanation', infoHide: 'Hide explanation'
    },

    it: {
      wd0: 'Domenica', wd1: 'Lunedì', wd2: 'Martedì', wd3: 'Mercoledì', wd4: 'Giovedì', wd5: 'Venerdì', wd6: 'Sabato',
      navTrainings: 'Allenamenti', navEvents: 'Eventi', navAdmin: 'Gestione', navProfile: 'Profilo',
      titleTrainings: 'Allenamenti {club}', titleEvents: 'Eventi {club}',
      subTrainings: 'I prossimi {n} appuntamenti', subEvents: 'Sono previsti i seguenti eventi del club', moreDates: 'Altri appuntamenti ({n})',
      emptyTrTitle: 'Nessun allenamento in programma.', emptyTrAdmin: 'Definisci un giorno di allenamento nella sezione «Gestione».', emptyTrMember: 'Gli admin definiscono i giorni di allenamento.',
      emptyEvTitle: 'Al momento non ci sono eventi in programma.', emptyEvAdmin: 'Crea un evento nella sezione «Gestione».', emptyEvMember: 'Gli admin creano i nuovi eventi.',
      trainingWord: 'Allenamento', trCancelled: 'Allenamento annullato', yes: 'Presente', no: 'Assente', participants: 'Partecipanti',
      ariaTr: '{yes} partecipanti, {no} assenti. {action} elenco partecipanti', ariaEv: '{n} partecipanti. {action} elenco partecipanti',
      listOpen: 'Apri', listClose: 'Chiudi',
      hYes: 'Presenti ({n})', hNo: 'Assenti ({n})', hOpen: 'Ancora nessuna risposta ({n})', hSolo: 'Da solo/a ({n})', hDuo: 'In due ({n} soci, {p} persone)',
      nobody: 'Nessuno', you: '(tu)', cancelledTag: 'Annullato', cancelledLow: 'annullato', changedLow: 'modificato',
      timePlace: 'ore {time}, {place}', atTime: 'ore {time}', calAdd: 'Aggiungi al calendario', solo: 'Da solo/a', duo: 'In due',
      secRules: 'Allenamenti del lunedì', secExtra: 'Altri allenamenti', secUpcoming: 'Prossimi allenamenti', secEvents: 'Eventi', secMembers: 'Soci',
      addNew: 'Aggiungi', addClose: 'Chiudi il modulo',
      adminTitle: 'Gestione', adminSub: 'Visibile solo agli admin', rulesIntro: 'Allenamenti standard settimanali',
      weekday: 'Giorno della settimana', time: 'Ora', place: 'Luogo', date: 'Data', label: 'Denominazione',
      phPlaceTraining: 'ad es. palestra scuola Nord', addRule: 'Aggiungi giorno di allenamento',
      edit: 'Modifica', remove: 'Rimuovi', cancel: 'Annulla', reactivate: 'Riattiva', del: 'Elimina', save: 'Salva', dismiss: 'Chiudi', reset: 'Ripristina',
      editNote: 'Vale solo per questo appuntamento. Le risposte dei soci vengono mantenute.',
      rulesEmpty: 'Nessun giorno di allenamento fisso. Tocca «+» per aggiungerne uno.',
      extraIntro: 'Sono previsti i seguenti allenamenti aggiuntivi', extraEmpty: 'Nessun allenamento aggiuntivo in programma.', extraDefaultTitle: 'Allenamento aggiuntivo',
      phPlaceExtra: 'ad es. impianto sportivo Sud', addExtra: 'Aggiungi allenamento', upcomingEmpty: 'Nessun allenamento in arrivo.',
      phEventTitle: 'ad es. serata fonduta', phEventPlace: 'ad es. sede del club', addEvent: 'Aggiungi evento',
      eventsEmpty: 'Ancora nessun evento. Tocca «+» per crearne uno.',
      membersIntro: 'Corona: socio od ospite (corona vuota). Stella: admin. Calice: responsabile eventi. Solo gli admin possono modificare questi ruoli. Gli ospiti vedono solo gli allenamenti e il profilo, non gli eventi. Il PIN predefinito corrisponde alle ultime 6 cifre del numero di cellulare.',
      memberAdd: 'Aggiungi socio', fullName: 'Nome e cognome', phone: 'Numero di cellulare',
      memberAddNote: 'Il socio accede solo con il numero di cellulare. Il PIN corrisponde alle ultime 6 cifre.',
      selfAdmin: 'Sei admin. Non puoi revocarti i diritti da solo.', revokeAdmin: 'Revoca i diritti di admin: {name}', makeAdmin: 'Rendi admin: {name}',
      adminTag: 'Admin', resetPin: 'Reimposta PIN',
      profileTitle: 'Profilo', nameLabel: 'Nome',
      installTitle: 'Installa l’app', installHint: 'Aggiungi l’app alla schermata Home: si aprirà a schermo intero.', installBtn: 'Aggiungi alla schermata Home',
      installIos: 'In Safari tocca «Condividi» in basso, poi «Aggiungi alla schermata Home». L’app si aprirà a schermo intero.',
      nameChange: 'Cambia nome', nameSave: 'Salva nome',
      pinChange: 'Cambia PIN', pinIntro: 'Per impostazione predefinita sono le ultime 6 cifre del tuo numero di cellulare. Se cambi il PIN, dovrai inserirlo al momento dell’accesso.',
      pinNew: 'Nuovo PIN (6 cifre)', pinSave: 'Salva PIN', pinDefault: 'Ripristina il PIN predefinito', logout: 'Esci',
      language: 'Lingua', languageHint: 'Scegli la lingua in cui vuoi usare l’app.',
      loginSub: 'Partecipazione',
      loginLeadReg: 'Crea il tuo account con nome, numero di cellulare e codice del club. Il tuo PIN corrisponde alle ultime 6 cifre del tuo numero di cellulare.',
      loginLead: 'Accedi con il tuo numero di cellulare.', pinOptional: 'PIN (necessario solo se lo hai cambiato)', clubCode: 'Codice del club',
      register: 'Crea account', signIn: 'Accedi', haveAccount: 'Ho già un account', firstTime: 'Prima volta qui? Crea un account',
      setupTitle: 'Configurazione necessaria', setupLead: 'L’app non è ancora collegata a Supabase.',
      setupStep1: 'Apri il file <code>config.js</code>.', setupStep2: 'Inserisci <code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code> del tuo progetto Supabase.',
      setupStep3: 'Ricarica la pagina.', setupNote: 'Le istruzioni dettagliate si trovano nel file README.md.',
      loading: 'Caricamento …',
      errFailed: 'Non ha funzionato', respWithdrawn: 'Risposta ritirata', youIn: 'Sei presente', youOut: 'Sei assente', youSolo: 'Vieni da solo/a', youDuo: 'Vieni in due',
      phoneInvalid: 'Inserisci un numero di cellulare valido, ad es. 079 123 45 67.', alreadyReg: 'Questo numero è già registrato.',
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
      guestCheck: 'Aggiungi come ospite (vede solo allenamenti e profilo)', guestInfo: 'Hai un accesso come ospite. Vedi gli allenamenti e il tuo profilo.',
      memberTag: 'Socio', emTag: 'Responsabile eventi', makeEm: 'Nomina responsabile eventi: {name}', revokeEm: 'Revoca i diritti di responsabile eventi: {name}', emGranted: 'Impostato come responsabile eventi', emRevoked: 'Diritti di responsabile eventi revocati', confirmGuestLoses: '{name} ha i diritti di admin o di responsabile eventi. Impostarlo come ospite li revoca. Continuare?', selfMember: 'Sei socio. Non puoi impostarti da solo come ospite.', rolesTitle: 'Ruoli', emSub: 'Qui gestisci gli eventi.',
      infoShow: 'Mostra la spiegazione', infoHide: 'Nascondi la spiegazione'
    },

    gsw: {
      wd0: 'Sunntig', wd1: 'Mäntig', wd2: 'Ziischtig', wd3: 'Mittwuch', wd4: 'Dunnschtig', wd5: 'Fritig', wd6: 'Samschtig',
      navTrainings: 'Trainings', navEvents: 'Events', navAdmin: 'Verwalte', navProfile: 'Profil',
      titleTrainings: '{club}-Trainings', titleEvents: '{club}-Events',
      subTrainings: 'Di nächschte {n} Termin', subEvents: 'Die Vereinsaalässe sind planet', moreDates: 'Wiitere Termin ({n})',
      emptyTrTitle: 'Es sind no kei Trainings planet.', emptyTrAdmin: 'Leg im Bereich «Verwalte» en Trainingstag fescht.', emptyTrMember: 'D Admins leged d Trainingstäg fescht.',
      emptyEvTitle: 'Im Momänt sind kei Events planet.', emptyEvAdmin: 'Leg im Bereich «Verwalte» en Event aa.', emptyEvMember: 'D Admins leged neui Events aa.',
      trainingWord: 'Training', trCancelled: 'Training abgsait', yes: 'Debii', no: 'Nöd debii', participants: 'Teilnehmer',
      ariaTr: '{yes} Teilnehmer, {no} nöd debii. Teilnehmerlischte {action}', ariaEv: '{n} Teilnehmer. Teilnehmerlischte {action}',
      listOpen: 'ufmache', listClose: 'zuemache',
      hYes: 'Debii ({n})', hNo: 'Nöd debii ({n})', hOpen: 'No kei Antwort ({n})', hSolo: 'Elei debii ({n})', hDuo: 'Zu zwöit debii ({n} Mitglieder, {p} Persone)',
      nobody: 'Niemer', you: '(du)', cancelledTag: 'Abgsait', cancelledLow: 'abgsait', changedLow: 'gänderet',
      timePlace: '{time} Uhr, {place}', atTime: '{time} Uhr', calAdd: 'Im Kaländer spichere', solo: 'Elei', duo: 'Zu zwöit',
      secRules: 'Mäntig-Trainings', secExtra: 'Wiitere Trainings', secUpcoming: 'Kommendi Trainings', secEvents: 'Events', secMembers: 'Mitglieder',
      addNew: 'Neu erfasse', addClose: 'Erfassig zuemache',
      adminTitle: 'Verwalte', adminSub: 'Nur für Admins sichtbar', rulesIntro: 'Standard-Trainings pro Wuche',
      weekday: 'Wuchetag', time: 'Uhrziit', place: 'Ort', date: 'Datum', label: 'Bezeichnig',
      phPlaceTraining: 'z. B. Turnhalle Schuelhuus Nord', addRule: 'Trainingstag hinzuefüege',
      edit: 'Bearbeite', remove: 'Entferne', cancel: 'Absäge', reactivate: 'Reaktivierä', del: 'Lösche', save: 'Spichere', dismiss: 'Abbräche', reset: 'Zruggsetze',
      editNote: 'Gilt nur für dä Termin. D Antworte vo de Mitglieder bliibed erhalte.',
      rulesEmpty: 'No kein fester Trainingstag. Tipp uf «+», zum eine z erfasse.',
      extraIntro: 'Die zuesätzliche Trainings sind planet', extraEmpty: 'Kei zuesätzlichi Trainings planet.', extraDefaultTitle: 'Zuesatztraining',
      phPlaceExtra: 'z. B. Sportaalag Süd', addExtra: 'Es wiiters Training hinzuefüege', upcomingEmpty: 'Kei kommendi Trainings.',
      phEventTitle: 'z. B. Fondue-Plausch', phEventPlace: 'z. B. Vereinshuus', addEvent: 'Event hinzuefüege',
      eventsEmpty: 'No kei Events. Tipp uf «+», zum de erscht z erfasse.',
      membersIntro: 'Chrone: Mitglied oder Gascht (leeri Chrone). Stärn: Admin. Wiiglas: Event-Manager. Die Rolle chönd nur Admins ändere. Gäscht gsehnd nur d Trainings und s Profil, kei Events. De Standard-PIN sind di letschte 6 Ziffere vo de Handynummere.',
      memberAdd: 'Mitglied hinzuefüege', fullName: 'Vor- und Nachname', phone: 'Handynummere',
      memberAddNote: 'S Mitglied meldet sich nur mit de Handynummere aa. De PIN sind di letschte 6 Ziffere.',
      selfAdmin: 'Du bisch Admin. Du chasch dir d Rächt nöd säber entzieh.', revokeAdmin: 'Admin-Rächt entzieh: {name}', makeAdmin: 'Zum Admin mache: {name}',
      adminTag: 'Admin', resetPin: 'PIN zruggsetze',
      profileTitle: 'Profil', nameLabel: 'Name',
      installTitle: 'App installiere', installHint: 'Leg d App uf dä Startbildschirm, denn öffnet si sich im Vollbild.', installBtn: 'Uf em Startbildschirm spichere',
      installIos: 'Tipp z underscht i Safari uf «Teile» und denn uf «Zum Home-Bildschirm». Danach öffnet sich d App im Vollbild.',
      nameChange: 'Name ändere', nameSave: 'Name spichere',
      pinChange: 'PIN ändere', pinIntro: 'Standardmässig sind es di letschte 6 Ziffere vo dinere Handynummere. Wenn du de PIN änderisch, muesch en bim Aamälde igäh.',
      pinNew: 'Neue PIN (6 Ziffere)', pinSave: 'PIN spichere', pinDefault: 'Uf Standard-PIN zruggsetze', logout: 'Abmälde',
      language: 'Sprach', languageHint: 'Wähl d Sprach, i dere du d App bruuche wottsch.',
      loginSub: 'Teilnahm',
      loginLeadReg: 'Erstell dis Konto mit Name, Handynummere und Vereinscode. Din PIN sind di letschte 6 Ziffere vo dinere Handynummere.',
      loginLead: 'Mäld di mit dinere Handynummere aa.', pinOptional: 'PIN (nur nötig, wenn du en gänderet hesch)', clubCode: 'Vereinscode',
      register: 'Konto erstelle', signIn: 'Aamälde', haveAccount: 'Ich han scho es Konto', firstTime: 'Zum erschte Mal da? Konto erstelle',
      setupTitle: 'Iirichtig nötig', setupLead: 'D App isch no nöd mit Supabase verbunde.',
      setupStep1: 'Öffne d Datei <code>config.js</code>.', setupStep2: 'Träg <code>SUPABASE_URL</code> und <code>SUPABASE_ANON_KEY</code> us dim Supabase-Projekt ii.',
      setupStep3: 'Lad d Site neu.', setupNote: 'D genau Aaleitig staht i de Datei README.md.',
      loading: 'Am Lade …',
      errFailed: 'Das hät nöd klappt', respWithdrawn: 'Antwort zruggzoge', youIn: 'Du bisch debii', youOut: 'Du bisch nöd debii', youSolo: 'Du chunsch elei', youDuo: 'Du chunsch zu zwöit',
      phoneInvalid: 'Bitte gib e gültigi Handynummere ii, z. B. 079 123 45 67.', alreadyReg: 'Die Nummere isch scho registriert.',
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
      guestCheck: 'Als Gascht hinzuefüege (gseht nur Trainings und Profil)', guestInfo: 'Du hesch en Gascht-Zuegang. Du gsehsch d Trainings und dis Profil.',
      memberTag: 'Mitglied', emTag: 'Event-Manager', makeEm: 'Zum Event-Manager mache: {name}', revokeEm: 'Event-Manager-Rächt entzieh: {name}', emGranted: 'Als Event-Manager festgleit', emRevoked: 'Event-Manager-Rächt entzoge', confirmGuestLoses: '{name} hät Admin- oder Event-Manager-Rächt. Als Gascht festlege entzieht die Rächt. Wiiter?', selfMember: 'Du bisch Mitglied. Du chasch di nöd säber zum Gascht mache.', rolesTitle: 'Rolle', emSub: 'Do verwaltisch du d Events.',
      infoShow: 'Erklärig aazeige', infoHide: 'Erklärig verstecke'
    },

    uk: {
      wd0: 'Неділя', wd1: 'Понеділок', wd2: 'Вівторок', wd3: 'Середа', wd4: 'Четвер', wd5: 'П’ятниця', wd6: 'Субота',
      navTrainings: 'Тренування', navEvents: 'Події', navAdmin: 'Керування', navProfile: 'Профіль',
      titleTrainings: 'Тренування {club}', titleEvents: 'Події {club}',
      subTrainings: 'Найближчі {n} занять', subEvents: 'Заплановані заходи клубу', moreDates: 'Інші дати ({n})',
      emptyTrTitle: 'Тренувань поки не заплановано.', emptyTrAdmin: 'Встановіть день тренування в розділі «Керування».', emptyTrMember: 'Дні тренувань визначають адміністратори.',
      emptyEvTitle: 'Наразі подій не заплановано.', emptyEvAdmin: 'Створіть подію в розділі «Керування».', emptyEvMember: 'Нові події створюють адміністратори.',
      trainingWord: 'Тренування', trCancelled: 'Тренування скасовано', yes: 'Буду', no: 'Не буду', participants: 'Учасники',
      ariaTr: '{yes} учасників, {no} не буде. {action} список учасників', ariaEv: '{n} учасників. {action} список учасників',
      listOpen: 'Відкрити', listClose: 'Закрити',
      hYes: 'Будуть ({n})', hNo: 'Не будуть ({n})', hOpen: 'Ще немає відповіді ({n})', hSolo: 'Самі ({n})', hDuo: 'Удвох ({n} учасників, {p} осіб)',
      nobody: 'Нікого', you: '(ви)', cancelledTag: 'Скасовано', cancelledLow: 'скасовано', changedLow: 'змінено',
      timePlace: '{time}, {place}', atTime: '{time}', calAdd: 'Додати до календаря', solo: 'Сам(а)', duo: 'Удвох',
      secRules: 'Тренування по понеділках', secExtra: 'Додаткові тренування', secUpcoming: 'Найближчі тренування', secEvents: 'Події', secMembers: 'Учасники клубу',
      addNew: 'Додати', addClose: 'Закрити форму',
      adminTitle: 'Керування', adminSub: 'Видно лише адміністраторам', rulesIntro: 'Стандартні тренування щотижня',
      weekday: 'День тижня', time: 'Час', place: 'Місце', date: 'Дата', label: 'Назва',
      phPlaceTraining: 'напр. спортзал школи «Північ»', addRule: 'Додати день тренування',
      edit: 'Редагувати', remove: 'Прибрати', cancel: 'Скасувати', reactivate: 'Відновити', del: 'Видалити', save: 'Зберегти', dismiss: 'Відміна', reset: 'Скинути',
      editNote: 'Діє лише для цієї дати. Відповіді учасників зберігаються.',
      rulesEmpty: 'Постійного дня тренування ще немає. Натисніть «+», щоб додати.',
      extraIntro: 'Заплановані додаткові тренування', extraEmpty: 'Додаткових тренувань не заплановано.', extraDefaultTitle: 'Додаткове тренування',
      phPlaceExtra: 'напр. спортивний комплекс «Південь»', addExtra: 'Додати тренування', upcomingEmpty: 'Найближчих тренувань немає.',
      phEventTitle: 'напр. вечір фондю', phEventPlace: 'напр. клубний будинок', addEvent: 'Додати подію',
      eventsEmpty: 'Подій ще немає. Натисніть «+», щоб додати першу.',
      membersIntro: 'Корона: член клубу або гість (порожня корона). Зірочка: адміністратор. Келих: менеджер подій. Змінювати ці ролі можуть лише адміністратори. Гості бачать лише тренування та профіль, без подій. PIN за замовчуванням — останні 6 цифр номера мобільного.',
      memberAdd: 'Додати учасника', fullName: 'Ім’я та прізвище', phone: 'Номер мобільного',
      memberAddNote: 'Учасник входить лише за номером мобільного. PIN — останні 6 цифр.',
      selfAdmin: 'Ви адміністратор. Ви не можете забрати права в себе самі.', revokeAdmin: 'Забрати права адміністратора: {name}', makeAdmin: 'Призначити адміністратором: {name}',
      adminTag: 'Адмін', resetPin: 'Скинути PIN',
      profileTitle: 'Профіль', nameLabel: 'Ім’я',
      installTitle: 'Встановити застосунок', installHint: 'Додайте застосунок на головний екран, і він відкриватиметься на весь екран.', installBtn: 'Додати на головний екран',
      installIos: 'У Safari натисніть внизу «Поділитися», потім «На початковий екран». Після цього застосунок відкриватиметься на весь екран.',
      nameChange: 'Змінити ім’я', nameSave: 'Зберегти ім’я',
      pinChange: 'Змінити PIN', pinIntro: 'За замовчуванням це останні 6 цифр вашого номера мобільного. Якщо ви змінюєте PIN, його потрібно вводити під час входу.',
      pinNew: 'Новий PIN (6 цифр)', pinSave: 'Зберегти PIN', pinDefault: 'Повернути PIN за замовчуванням', logout: 'Вийти',
      language: 'Мова', languageHint: 'Оберіть мову, якою ви хочете користуватися застосунком.',
      loginSub: 'Участь',
      loginLeadReg: 'Створіть обліковий запис, вказавши ім’я, номер мобільного та код клубу. Ваш PIN — останні 6 цифр номера мобільного.',
      loginLead: 'Увійдіть за номером мобільного.', pinOptional: 'PIN (потрібен, лише якщо ви його змінювали)', clubCode: 'Код клубу',
      register: 'Створити обліковий запис', signIn: 'Увійти', haveAccount: 'У мене вже є обліковий запис', firstTime: 'Вперше тут? Створіть обліковий запис',
      setupTitle: 'Потрібне налаштування', setupLead: 'Застосунок ще не підключено до Supabase.',
      setupStep1: 'Відкрийте файл <code>config.js</code>.', setupStep2: 'Внесіть <code>SUPABASE_URL</code> і <code>SUPABASE_ANON_KEY</code> зі свого проєкту Supabase.',
      setupStep3: 'Оновіть сторінку.', setupNote: 'Детальна інструкція є у файлі README.md.',
      loading: 'Завантаження …',
      errFailed: 'Не вдалося', respWithdrawn: 'Відповідь скасовано', youIn: 'Ви будете', youOut: 'Ви не будете', youSolo: 'Ви прийдете самі', youDuo: 'Ви прийдете удвох',
      phoneInvalid: 'Введіть дійсний номер мобільного, напр. 079 123 45 67.', alreadyReg: 'Цей номер уже зареєстровано.',
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
      guestCheck: 'Додати як гостя (бачить лише тренування та профіль)', guestInfo: 'У вас гостьовий доступ. Ви бачите тренування та свій профіль.',
      memberTag: 'Член клубу', emTag: 'Менеджер подій', makeEm: 'Призначити менеджером подій: {name}', revokeEm: 'Забрати права менеджера подій: {name}', emGranted: 'Призначено менеджером подій', emRevoked: 'Права менеджера подій забрано', confirmGuestLoses: '{name} має права адміністратора або менеджера подій. Призначення гостем забирає ці права. Продовжити?', selfMember: 'Ви член клубу. Ви не можете призначити себе гостем.', rolesTitle: 'Ролі', emSub: 'Тут ви керуєте подіями.',
      infoShow: 'Показати пояснення', infoHide: 'Сховати пояснення'
    },

    bar: {
      wd0: 'Sunda', wd1: 'Mondog', wd2: 'Irda', wd3: 'Migga', wd4: 'Pfinzda', wd5: 'Freida', wd6: 'Samsda',
      navTrainings: 'Trainings', navEvents: 'Events', navAdmin: 'Verwoitn', navProfile: 'Profil',
      titleTrainings: '{club}-Trainings', titleEvents: '{club}-Events',
      subTrainings: 'De nächstn {n} Termine', subEvents: 'De Vereinsveranstoitungen, de gplant san', moreDates: 'Weitere Termine ({n})',
      emptyTrTitle: 'Es san no koane Trainings gplant.', emptyTrAdmin: 'Leg im Bereich «Verwoitn» an Trainingstag fest.', emptyTrMember: 'De Admins legn de Trainingstag fest.',
      emptyEvTitle: 'Im Moment san koane Events gplant.', emptyEvAdmin: 'Leg im Bereich «Verwoitn» an Event o.', emptyEvMember: 'De Admins legn neie Events o.',
      trainingWord: 'Training', trCancelled: 'Training abgsogt', yes: 'Dabei', no: 'Ned dabei', participants: 'Teilnehmer',
      ariaTr: '{yes} Teilnehmer, {no} ned dabei. Teilnehmerlistn {action}', ariaEv: '{n} Teilnehmer. Teilnehmerlistn {action}',
      listOpen: 'aufmachn', listClose: 'zumachn',
      hYes: 'Dabei ({n})', hNo: 'Ned dabei ({n})', hOpen: 'No koa Antwort ({n})', hSolo: 'Alloa dabei ({n})', hDuo: 'Zu zweit dabei ({n} Mitglieder, {p} Leit)',
      nobody: 'Koaner', you: '(du)', cancelledTag: 'Abgsogt', cancelledLow: 'abgsogt', changedLow: 'gändert',
      timePlace: '{time} Uhr, {place}', atTime: '{time} Uhr', calAdd: 'Im Kalenda speichan', solo: 'Alloa', duo: 'Zu zweit',
      secRules: 'Mondog-Trainings', secExtra: 'Weitere Trainings', secUpcoming: 'Kemmande Trainings', secEvents: 'Events', secMembers: 'Mitglieder',
      addNew: 'Neu erfassn', addClose: 'Erfassung zumachn',
      adminTitle: 'Verwoitn', adminSub: 'Bloß für Admins sichtbar', rulesIntro: 'Standard-Trainings pro Woch',
      weekday: 'Wochentag', time: 'Uhrzeit', place: 'Ort', date: 'Datum', label: 'Bezeichnung',
      phPlaceTraining: 'z. B. Turnhalle Schulhaus Nord', addRule: 'Trainingstag dazuadoa',
      edit: 'Bearbeitn', remove: 'Wegdoa', cancel: 'Absagn', reactivate: 'Wieda aktivieren', del: 'Löschn', save: 'Speichan', dismiss: 'Abbrecha', reset: 'Zruckstelln',
      editNote: 'Gilt bloß für den Termin. De Antwortn vo de Mitglieder bleibn erhaltn.',
      rulesEmpty: 'No koa fester Trainingstag. Tipp auf «+», um oan z erfassn.',
      extraIntro: 'De zusätzlichn Trainings san gplant', extraEmpty: 'Koane zusätzlichn Trainings gplant.', extraDefaultTitle: 'Zusatztraining',
      phPlaceExtra: 'z. B. Sportanlage Süd', addExtra: 'A weiters Training dazuadoa', upcomingEmpty: 'Koane kemmandn Trainings.',
      phEventTitle: 'z. B. Fondue-Abend', phEventPlace: 'z. B. Vereinsheim', addEvent: 'Event dazuadoa',
      eventsEmpty: 'No koane Events. Tipp auf «+», um den erstn z erfassn.',
      membersIntro: 'Kron: Mitglied oder Gast (leere Kron). Stern: Admin. Weiglas: Event-Manager. De Rolln kinna bloß Admins ändern. Gäst sehn bloß de Trainings und des Profil, koane Events. Da Standard-PIN san de letztn 6 Ziffern vo da Handynummer.',
      memberAdd: 'Mitglied dazuadoa', fullName: 'Vor- und Nachname', phone: 'Handynummer',
      memberAddNote: 'Des Mitglied meldt se bloß mit da Handynummer o. Da PIN san de letztn 6 Ziffern.',
      selfAdmin: 'Du bist Admin. Du konnst da d Rechte ned söiba entziehn.', revokeAdmin: 'Admin-Rechte entziehn: {name}', makeAdmin: 'Zum Admin macha: {name}',
      adminTag: 'Admin', resetPin: 'PIN zruckstelln',
      profileTitle: 'Profil', nameLabel: 'Name',
      installTitle: 'App installiern', installHint: 'Leg d App auf dein Startbildschirm, nacha geht s im Vollbild auf.', installBtn: 'Auf m Startbildschirm speichan',
      installIos: 'Tipp unten in Safari auf «Teilen» und nacha auf «Zum Home-Bildschirm». Danach geht d App im Vollbild auf.',
      nameChange: 'Name ändern', nameSave: 'Name speichan',
      pinChange: 'PIN ändern', pinIntro: 'Standardmäßig san s de letztn 6 Ziffern vo deiner Handynummer. Wennst den PIN änderst, muasst eam beim Anmelden eigebn.',
      pinNew: 'Neier PIN (6 Ziffern)', pinSave: 'PIN speichan', pinDefault: 'Auf Standard-PIN zruckstelln', logout: 'Abmelden',
      language: 'Sprach', languageHint: 'Such da d Sprach aus, in dera du d App benutzn mogst.',
      loginSub: 'Teilnahme',
      loginLeadReg: 'Leg dein Konto o mit Name, Handynummer und Vereinscode. Dei PIN san de letztn 6 Ziffern vo deiner Handynummer.',
      loginLead: 'Meld di mit deiner Handynummer o.', pinOptional: 'PIN (bloß nötig, wennst n gändert host)', clubCode: 'Vereinscode',
      register: 'Konto anlegn', signIn: 'Anmelden', haveAccount: 'I hob scho a Konto', firstTime: 'Des erste Mal do? Konto anlegn',
      setupTitle: 'Einrichtung nötig', setupLead: 'D App is no ned mit Supabase verbundn.',
      setupStep1: 'Mach de Datei <code>config.js</code> auf.', setupStep2: 'Trag <code>SUPABASE_URL</code> und <code>SUPABASE_ANON_KEY</code> aus deim Supabase-Projekt ei.',
      setupStep3: 'Lad d Seitn neu.', setupNote: 'De genaue Anleitung steht in da Datei README.md.',
      loading: 'Lädt …',
      errFailed: 'Des hod ned gfunktioniert', respWithdrawn: 'Antwort zruckzogn', youIn: 'Du bist dabei', youOut: 'Du bist ned dabei', youSolo: 'Du kimmst alloa', youDuo: 'Du kimmst zu zweit',
      phoneInvalid: 'Bitte gib a gültige Handynummer ei, z. B. 079 123 45 67.', alreadyReg: 'De Nummer is scho registriert.',
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
      guestCheck: 'Als Gast dazuadoa (sicht bloß Trainings und Profil)', guestInfo: 'Du hast an Gast-Zugang. Du siehst de Trainings und dei Profil.',
      memberTag: 'Mitglied', emTag: 'Event-Manager', makeEm: 'Zum Event-Manager macha: {name}', revokeEm: 'Event-Manager-Rechte entziehn: {name}', emGranted: 'Als Event-Manager festgelegt', emRevoked: 'Event-Manager-Rechte entzogn', confirmGuestLoses: '{name} hod Admin- oder Event-Manager-Rechte. Als Gast festlegn entzieht de Rechte. Weiter?', selfMember: 'Du bist Mitglied. Du konnst di ned söiba zum Gast macha.', rolesTitle: 'Rollen', emSub: 'Do verwoitst du de Events.',
      infoShow: 'Erklärung anzoagn', infoHide: 'Erklärung wegdoa'
    },

    cs: {
      wd0: 'Neděle', wd1: 'Pondělí', wd2: 'Úterý', wd3: 'Středa', wd4: 'Čtvrtek', wd5: 'Pátek', wd6: 'Sobota',
      navTrainings: 'Tréninky', navEvents: 'Akce', navAdmin: 'Správa', navProfile: 'Profil',
      titleTrainings: 'Tréninky {club}', titleEvents: 'Akce {club}',
      subTrainings: 'Následujících {n} termínů', subEvents: 'Plánované akce klubu', moreDates: 'Další termíny ({n})',
      emptyTrTitle: 'Zatím nejsou naplánovány žádné tréninky.', emptyTrAdmin: 'Nastav v části «Správa» tréninkový den.', emptyTrMember: 'Tréninkové dny určují správci.',
      emptyEvTitle: 'Momentálně nejsou naplánovány žádné akce.', emptyEvAdmin: 'Vytvoř v části «Správa» novou akci.', emptyEvMember: 'Nové akce vytvářejí správci.',
      trainingWord: 'Trénink', trCancelled: 'Trénink zrušen', yes: 'Přijdu', no: 'Nepřijdu', participants: 'Účastníci',
      ariaTr: '{yes} účastníků, {no} nepřijde. {action} seznam účastníků', ariaEv: '{n} účastníků. {action} seznam účastníků',
      listOpen: 'Otevřít', listClose: 'Zavřít',
      hYes: 'Přijdou ({n})', hNo: 'Nepřijdou ({n})', hOpen: 'Zatím bez odpovědi ({n})', hSolo: 'Sám/sama ({n})', hDuo: 'Ve dvou ({n} členů, {p} osob)',
      nobody: 'Nikdo', you: '(ty)', cancelledTag: 'Zrušeno', cancelledLow: 'zrušeno', changedLow: 'změněno',
      timePlace: '{time}, {place}', atTime: '{time}', calAdd: 'Přidat do kalendáře', solo: 'Sám/sama', duo: 'Ve dvou',
      secRules: 'Pondělní tréninky', secExtra: 'Další tréninky', secUpcoming: 'Nadcházející tréninky', secEvents: 'Akce', secMembers: 'Členové',
      addNew: 'Přidat', addClose: 'Zavřít formulář',
      adminTitle: 'Správa', adminSub: 'Viditelné pouze pro správce', rulesIntro: 'Standardní tréninky každý týden',
      weekday: 'Den v týdnu', time: 'Čas', place: 'Místo', date: 'Datum', label: 'Název',
      phPlaceTraining: 'např. tělocvična školy Sever', addRule: 'Přidat tréninkový den',
      edit: 'Upravit', remove: 'Odebrat', cancel: 'Zrušit', reactivate: 'Obnovit', del: 'Smazat', save: 'Uložit', dismiss: 'Zahodit', reset: 'Vrátit zpět',
      editNote: 'Platí jen pro tento termín. Odpovědi členů zůstanou zachovány.',
      rulesEmpty: 'Zatím žádný pevný tréninkový den. Klepni na «+» a přidej ho.',
      extraIntro: 'Naplánované jsou tyto další tréninky', extraEmpty: 'Žádné další tréninky nejsou naplánovány.', extraDefaultTitle: 'Přídavný trénink',
      phPlaceExtra: 'např. sportovní areál Jih', addExtra: 'Přidat trénink', upcomingEmpty: 'Žádné nadcházející tréninky.',
      phEventTitle: 'např. fondue večer', phEventPlace: 'např. klubovna', addEvent: 'Přidat akci',
      eventsEmpty: 'Zatím žádné akce. Klepni na «+» a přidej první.',
      membersIntro: 'Koruna: člen nebo host (prázdná koruna). Hvězdička: správce. Sklenice na víno: správce akcí. Tyto role mohou měnit jen správci. Hosté vidí jen tréninky a profil, žádné akce. Výchozí PIN tvoří posledních 6 číslic čísla mobilu.',
      memberAdd: 'Přidat člena', fullName: 'Jméno a příjmení', phone: 'Číslo mobilu',
      memberAddNote: 'Člen se přihlašuje pouze číslem mobilu. PIN tvoří posledních 6 číslic.',
      selfAdmin: 'Jsi správce. Sám sobě práva odebrat nemůžeš.', revokeAdmin: 'Odebrat práva správce: {name}', makeAdmin: 'Udělat správcem: {name}',
      adminTag: 'Správce', resetPin: 'Obnovit PIN',
      profileTitle: 'Profil', nameLabel: 'Jméno',
      installTitle: 'Nainstalovat aplikaci', installHint: 'Přidej aplikaci na plochu, pak se otevře na celou obrazovku.', installBtn: 'Přidat na plochu',
      installIos: 'V Safari klepni dole na «Sdílet» a potom na «Přidat na plochu». Aplikace se pak otevře na celou obrazovku.',
      nameChange: 'Změnit jméno', nameSave: 'Uložit jméno',
      pinChange: 'Změnit PIN', pinIntro: 'Ve výchozím nastavení je to posledních 6 číslic tvého čísla mobilu. Pokud PIN změníš, musíš ho při přihlášení zadat.',
      pinNew: 'Nový PIN (6 číslic)', pinSave: 'Uložit PIN', pinDefault: 'Vrátit výchozí PIN', logout: 'Odhlásit se',
      language: 'Jazyk', languageHint: 'Vyber jazyk, ve kterém chceš aplikaci používat.',
      loginSub: 'Účast',
      loginLeadReg: 'Vytvoř si účet pomocí jména, čísla mobilu a kódu klubu. Tvůj PIN tvoří posledních 6 číslic čísla mobilu.',
      loginLead: 'Přihlaš se svým číslem mobilu.', pinOptional: 'PIN (jen pokud jsi ho změnil/a)', clubCode: 'Kód klubu',
      register: 'Vytvořit účet', signIn: 'Přihlásit se', haveAccount: 'Už mám účet', firstTime: 'Jsi tu poprvé? Vytvoř si účet',
      setupTitle: 'Je potřeba nastavení', setupLead: 'Aplikace ještě není propojena se Supabase.',
      setupStep1: 'Otevři soubor <code>config.js</code>.', setupStep2: 'Vyplň <code>SUPABASE_URL</code> a <code>SUPABASE_ANON_KEY</code> ze svého projektu Supabase.',
      setupStep3: 'Načti stránku znovu.', setupNote: 'Podrobný návod najdeš v souboru README.md.',
      loading: 'Načítání …',
      errFailed: 'To se nepovedlo', respWithdrawn: 'Odpověď stažena', youIn: 'Přijdeš', youOut: 'Nepřijdeš', youSolo: 'Přijdeš sám/sama', youDuo: 'Přijdeš ve dvou',
      phoneInvalid: 'Zadej platné číslo mobilu, např. 079 123 45 67.', alreadyReg: 'Toto číslo je již zaregistrováno.',
      memberAdded: 'Člen {name} byl přidán.', addFailed: 'Přidání se nezdařilo: {reason}', unknownError: 'Neznámá chyba',
      authInvalid: 'Číslo mobilu nebo PIN nesouhlasí. Pokud jsi PIN změnil/a, zadej ho do pole PIN.',
      authAlready: 'Toto číslo je již zaregistrováno. Přihlas se.', authCode: 'Registrace není možná. Zkontroluj kód klubu.',
      authRate: 'Příliš mnoho pokusů. Chvíli počkej.', authPin: 'PIN musí mít 6 číslic.', authFail: 'Přihlášení se nezdařilo. Zkus to znovu.',
      pinExact: 'PIN musí mít přesně 6 číslic.', confirmEmailOff: 'Vypni v Supabase volbu «Confirm email» (viz README).',
      loadFail: 'Data se nepodařilo načíst. Bylo spuštěno schéma databáze?',
      calFile: 'Otevři soubor «{name}» a ulož termín do kalendáře.', calFail: 'Položku kalendáře se nepodařilo vytvořit.',
      pinResetOk: 'PIN vrácen na výchozí', pinResetFail: 'PIN se nepodařilo vrátit.',
      confirmDelRule: 'Odebrat tento tréninkový den? Všechny budoucí termíny série zmizí.', ruleRemoved: 'Tréninkový den odebrán',
      confirmDelExtra: 'Smazat tento trénink?', extraDeleted: 'Trénink smazán',
      confirmDelEvent: 'Smazat tuto akci? Smažou se i všechny odpovědi.', eventDeleted: 'Akce smazána',
      trReactivated: 'Trénink je opět aktivní', trCancelledMsg: 'Trénink zrušen', evReactivated: 'Akce je opět aktivní', evCancelledMsg: 'Akce zrušena',
      changeReset: 'Změna vrácena', confirmResetPin: 'Vrátit PIN člena {name} na posledních 6 číslic čísla mobilu?', thisMemberDat: 'tohoto člena',
      pinReset: 'PIN obnoven', confirmRemove: 'Odebrat člena {name}? Účet i všechny odpovědi budou smazány.', thisMember: 'Tento člen', memberRemoved: 'Člen odebrán',
      adminGranted: 'Práva správce udělena', adminRevoked: 'Práva správce odebrána', nameSaved: 'Jméno uloženo', pinChanged: 'PIN změněn', pinChangeFail: 'PIN se nepodařilo změnit.',
      ruleAdded: 'Tréninkový den přidán', extraAdded: 'Trénink přidán', eventAdded: 'Akce přidána',
      ruleChanged: 'Tréninkový den změněn', trChanged: 'Trénink změněn', eventChanged: 'Akce změněna', langSaved: 'Jazyk uložen',
      guestTag: 'Host', makeGuest: 'Nastavit jako hosta: {name}', revokeGuest: 'Odebrat status hosta: {name}', guestGranted: 'Nastaveno jako host', guestRevoked: 'Status hosta odebrán',
      guestCheck: 'Přidat jako hosta (vidí jen tréninky a profil)', guestInfo: 'Máš přístup jako host. Vidíš tréninky a svůj profil.',
      memberTag: 'Člen', emTag: 'Správce akcí', makeEm: 'Udělat správcem akcí: {name}', revokeEm: 'Odebrat práva správce akcí: {name}', emGranted: 'Nastaveno jako správce akcí', emRevoked: 'Práva správce akcí odebrána', confirmGuestLoses: '{name} má práva správce nebo správce akcí. Nastavení jako host tato práva odebere. Pokračovat?', selfMember: 'Jsi člen. Sám sebe hostem udělat nemůžeš.', rolesTitle: 'Role', emSub: 'Tady spravuješ akce.',
      infoShow: 'Zobrazit vysvětlení', infoHide: 'Skrýt vysvětlení'
    },

    nl: {
      wd0: 'Zondag', wd1: 'Maandag', wd2: 'Dinsdag', wd3: 'Woensdag', wd4: 'Donderdag', wd5: 'Vrijdag', wd6: 'Zaterdag',
      navTrainings: 'Trainingen', navEvents: 'Evenementen', navAdmin: 'Beheer', navProfile: 'Profiel',
      titleTrainings: '{club} Trainingen', titleEvents: '{club} Evenementen',
      subTrainings: 'De eerstvolgende {n} data', subEvents: 'De volgende clubevenementen staan gepland', moreDates: 'Meer data ({n})',
      emptyTrTitle: 'Er zijn nog geen trainingen gepland.', emptyTrAdmin: 'Stel bij «Beheer» een trainingsdag in.', emptyTrMember: 'De beheerders bepalen de trainingsdagen.',
      emptyEvTitle: 'Er zijn momenteel geen evenementen gepland.', emptyEvAdmin: 'Maak bij «Beheer» een evenement aan.', emptyEvMember: 'De beheerders maken nieuwe evenementen aan.',
      trainingWord: 'Training', trCancelled: 'Training geannuleerd', yes: 'Aanwezig', no: 'Afwezig', participants: 'Deelnemers',
      ariaTr: '{yes} deelnemers, {no} afwezig. {action} deelnemerslijst', ariaEv: '{n} deelnemers. {action} deelnemerslijst',
      listOpen: 'Openen', listClose: 'Sluiten',
      hYes: 'Aanwezig ({n})', hNo: 'Afwezig ({n})', hOpen: 'Nog geen antwoord ({n})', hSolo: 'Alleen ({n})', hDuo: 'Met z’n tweeën ({n} leden, {p} personen)',
      nobody: 'Niemand', you: '(jij)', cancelledTag: 'Geannuleerd', cancelledLow: 'geannuleerd', changedLow: 'gewijzigd',
      timePlace: '{time}, {place}', atTime: '{time}', calAdd: 'Toevoegen aan agenda', solo: 'Alleen', duo: 'Met z’n tweeën',
      secRules: 'Maandagtrainingen', secExtra: 'Extra trainingen', secUpcoming: 'Komende trainingen', secEvents: 'Evenementen', secMembers: 'Leden',
      addNew: 'Nieuw toevoegen', addClose: 'Formulier sluiten',
      adminTitle: 'Beheer', adminSub: 'Alleen zichtbaar voor beheerders', rulesIntro: 'Standaardtrainingen per week',
      weekday: 'Weekdag', time: 'Tijd', place: 'Plaats', date: 'Datum', label: 'Naam',
      phPlaceTraining: 'bijv. gymzaal Schulhaus Nord', addRule: 'Trainingsdag toevoegen',
      edit: 'Bewerken', remove: 'Verwijderen', cancel: 'Annuleren', reactivate: 'Heractiveren', del: 'Verwijderen', save: 'Opslaan', dismiss: 'Verwerpen', reset: 'Herstellen',
      editNote: 'Geldt alleen voor deze datum. De antwoorden van de leden blijven bewaard.',
      rulesEmpty: 'Nog geen vaste trainingsdag. Tik op «+» om er een toe te voegen.',
      extraIntro: 'De volgende extra trainingen staan gepland', extraEmpty: 'Geen extra trainingen gepland.', extraDefaultTitle: 'Extra training',
      phPlaceExtra: 'bijv. sportpark Zuid', addExtra: 'Training toevoegen', upcomingEmpty: 'Geen komende trainingen.',
      phEventTitle: 'bijv. fonduavond', phEventPlace: 'bijv. clubhuis', addEvent: 'Evenement toevoegen',
      eventsEmpty: 'Nog geen evenementen. Tik op «+» om het eerste toe te voegen.',
      membersIntro: 'Kroon: lid of gast (lege kroon). Ster: beheerder. Wijnglas: evenementmanager. Alleen beheerders kunnen deze rollen wijzigen. Gasten zien alleen de trainingen en het profiel, geen evenementen. De standaard-PIN zijn de laatste 6 cijfers van het mobiele nummer.',
      memberAdd: 'Lid toevoegen', fullName: 'Voor- en achternaam', phone: 'Mobiel nummer',
      memberAddNote: 'Het lid logt alleen in met het mobiele nummer. De PIN zijn de laatste 6 cijfers.',
      selfAdmin: 'Je bent beheerder. Je kunt je eigen rechten niet intrekken.', revokeAdmin: 'Beheerdersrechten intrekken: {name}', makeAdmin: 'Beheerder maken: {name}',
      adminTag: 'Beheerder', resetPin: 'PIN resetten',
      profileTitle: 'Profiel', nameLabel: 'Naam',
      installTitle: 'App installeren', installHint: 'Zet de app op je beginscherm, dan opent hij op volledig scherm.', installBtn: 'Toevoegen aan beginscherm',
      installIos: 'Tik in Safari onderaan op «Deel» en daarna op «Zet op beginscherm». De app opent dan op volledig scherm.',
      nameChange: 'Naam wijzigen', nameSave: 'Naam opslaan',
      pinChange: 'PIN wijzigen', pinIntro: 'Standaard zijn het de laatste 6 cijfers van je mobiele nummer. Als je de PIN wijzigt, moet je hem bij het inloggen invoeren.',
      pinNew: 'Nieuwe PIN (6 cijfers)', pinSave: 'PIN opslaan', pinDefault: 'Terug naar standaard-PIN', logout: 'Uitloggen',
      language: 'Taal', languageHint: 'Kies de taal waarin je de app wilt gebruiken.',
      loginSub: 'Aanwezigheid',
      loginLeadReg: 'Maak je account aan met je naam, mobiele nummer en clubcode. Je PIN zijn de laatste 6 cijfers van je mobiele nummer.',
      loginLead: 'Log in met je mobiele nummer.', pinOptional: 'PIN (alleen nodig als je hem hebt gewijzigd)', clubCode: 'Clubcode',
      register: 'Account aanmaken', signIn: 'Inloggen', haveAccount: 'Ik heb al een account', firstTime: 'Voor het eerst hier? Maak een account aan',
      setupTitle: 'Instellen vereist', setupLead: 'De app is nog niet met Supabase verbonden.',
      setupStep1: 'Open het bestand <code>config.js</code>.', setupStep2: 'Vul <code>SUPABASE_URL</code> en <code>SUPABASE_ANON_KEY</code> uit je Supabase-project in.',
      setupStep3: 'Laad de pagina opnieuw.', setupNote: 'De uitgebreide handleiding staat in het bestand README.md.',
      loading: 'Laden …',
      errFailed: 'Dat is niet gelukt', respWithdrawn: 'Antwoord ingetrokken', youIn: 'Je bent erbij', youOut: 'Je bent er niet bij', youSolo: 'Je komt alleen', youDuo: 'Je komt met z’n tweeën',
      phoneInvalid: 'Voer een geldig mobiel nummer in, bijv. 079 123 45 67.', alreadyReg: 'Dit nummer is al geregistreerd.',
      memberAdded: '{name} is toegevoegd.', addFailed: 'Toevoegen niet mogelijk: {reason}', unknownError: 'Onbekende fout',
      authInvalid: 'Mobiel nummer of PIN klopt niet. Als je je PIN hebt gewijzigd, vul hem in bij PIN.',
      authAlready: 'Dit nummer is al geregistreerd. Log in.', authCode: 'Registreren niet mogelijk. Controleer de clubcode.',
      authRate: 'Te veel pogingen. Wacht even.', authPin: 'De PIN moet uit 6 cijfers bestaan.', authFail: 'Inloggen mislukt. Probeer het opnieuw.',
      pinExact: 'De PIN moet uit precies 6 cijfers bestaan.', confirmEmailOff: 'Zet in Supabase «Confirm email» uit (zie README).',
      loadFail: 'De gegevens konden niet worden geladen. Is het databaseschema uitgevoerd?',
      calFile: 'Open het bestand «{name}» om de afspraak in je agenda op te slaan.', calFail: 'De agenda-afspraak kon niet worden gemaakt.',
      pinResetOk: 'PIN teruggezet naar standaard', pinResetFail: 'De PIN kon niet worden teruggezet.',
      confirmDelRule: 'Deze trainingsdag verwijderen? Alle komende data van de reeks verdwijnen.', ruleRemoved: 'Trainingsdag verwijderd',
      confirmDelExtra: 'Deze training verwijderen?', extraDeleted: 'Training verwijderd',
      confirmDelEvent: 'Dit evenement verwijderen? Ook alle antwoorden worden verwijderd.', eventDeleted: 'Evenement verwijderd',
      trReactivated: 'Training weer actief', trCancelledMsg: 'Training geannuleerd', evReactivated: 'Evenement weer actief', evCancelledMsg: 'Evenement geannuleerd',
      changeReset: 'Wijziging ongedaan gemaakt', confirmResetPin: 'De PIN van {name} terugzetten naar de laatste 6 cijfers van het mobiele nummer?', thisMemberDat: 'dit lid',
      pinReset: 'PIN gereset', confirmRemove: '{name} verwijderen? Het account en alle antwoorden worden verwijderd.', thisMember: 'Dit lid', memberRemoved: 'Lid verwijderd',
      adminGranted: 'Beheerdersrechten toegekend', adminRevoked: 'Beheerdersrechten ingetrokken', nameSaved: 'Naam opgeslagen', pinChanged: 'PIN gewijzigd', pinChangeFail: 'De PIN kon niet worden gewijzigd.',
      ruleAdded: 'Trainingsdag toegevoegd', extraAdded: 'Training toegevoegd', eventAdded: 'Evenement toegevoegd',
      ruleChanged: 'Trainingsdag gewijzigd', trChanged: 'Training gewijzigd', eventChanged: 'Evenement gewijzigd', langSaved: 'Taal opgeslagen',
      guestTag: 'Gast', makeGuest: 'Als gast instellen: {name}', revokeGuest: 'Gaststatus intrekken: {name}', guestGranted: 'Als gast ingesteld', guestRevoked: 'Gaststatus ingetrokken',
      guestCheck: 'Als gast toevoegen (ziet alleen trainingen en profiel)', guestInfo: 'Je hebt gasttoegang. Je ziet de trainingen en je profiel.',
      memberTag: 'Lid', emTag: 'Evenementmanager', makeEm: 'Evenementmanager maken: {name}', revokeEm: 'Rechten van evenementmanager intrekken: {name}', emGranted: 'Als evenementmanager ingesteld', emRevoked: 'Rechten van evenementmanager ingetrokken', confirmGuestLoses: '{name} heeft beheerders- of evenementmanagerrechten. Als gast instellen trekt deze rechten in. Doorgaan?', selfMember: 'Je bent lid. Je kunt jezelf niet tot gast maken.', rolesTitle: 'Rollen', emSub: 'Hier beheer je de evenementen.',
      infoShow: 'Uitleg tonen', infoHide: 'Uitleg verbergen'
    }
  };

  var lang = detectLang();

  function detectLang() {
    try { var s = localStorage.getItem('fbro-lang'); if (s && LANGS.indexOf(s) > -1) return s; } catch (e) { /* ignorieren */ }
    var n = String(navigator.language || 'de').toLowerCase().slice(0, 2);
    return ['de', 'fr', 'en', 'it', 'uk', 'cs', 'nl'].indexOf(n) > -1 ? n : 'de';
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
  function langSelect() {
    return '<select class="input langsel" data-lang aria-label="Sprache / Language">' + LANGS.map(function (l) {
      return '<option value="' + l + '"' + (l === lang ? ' selected' : '') + '>' + esc(LANG_NAMES[l]) + '</option>';
    }).join('') + '</select>';
  }

  // Datumsformat: Für die Mundarten gibt es keine Intl-Sprache, daher eigene Namen
  var CUSTOM_DATES = {
    gsw: {
      days: ['Su', 'Mä', 'Zi', 'Mi', 'Du', 'Fr', 'Sa'],
      months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'Auguscht', 'Septämber', 'Oktober', 'Novämber', 'Dezämber'],
      short: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    },
    bar: {
      days: ['Su', 'Mo', 'Ir', 'Mi', 'Pf', 'Fr', 'Sa'],
      months: ['Jänner', 'Feber', 'März', 'April', 'Mai', 'Juni', 'Juli', 'Auggust', 'Septemba', 'Oktoba', 'Novemba', 'Dezemba'],
      short: ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
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
      return o.weekday ? c.days[d.getDay()] + (main ? ', ' + main : '') : main;
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
    return p;
  }
  // Formatierung während der Eingabe im Feld
  function formatPhoneTyping(raw) {
    var v = String(raw).replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
    if (v.indexOf('+41') === 0) v = '0' + v.slice(3);
    else if (v.indexOf('0041') === 0) v = '0' + v.slice(4);
    if (v.charAt(0) === '0' && v.charAt(1) !== '0') {
      var d = v.replace(/\D/g, '').slice(0, 10);
      return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(' ');
    }
    return v;
  }
  function defaultPin(p) { return String(p).replace(/\D/g, '').slice(-6); }
  function phoneToEmail(p) { return p.replace('+', '') + '@' + (cfg.EMAIL_DOMAIN || 'phone-login.app'); }

  /* ---------- Zustand ---------- */
  function freshState() {
    return {
      step: 'loading', mode: 'login', tab: 'trainings', phone: '', err: '', info: '',
      session: null, me: null, members: [],
      rules: [], extras: [], overrides: {}, cancelled: {}, events: [],
      tr: {}, ev: {}, open: {}, edit: null, busy: false, sec: {}, add: {}, info: {}, showMore: false
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

    S.members = d[0].map(function (r) { return { id: r.id, name: r.name, phone: r.phone, isAdmin: r.is_admin, isGuest: r.is_guest === true, isEventManager: r.is_event_manager === true, language: r.language || null }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'de'); });
    S.rules = d[1].map(function (r) { return { id: r.id, wd: r.weekday, time: hhmm(r.start_time), place: r.place }; })
      .sort(function (a, b) { return ((a.wd + 6) % 7) - ((b.wd + 6) % 7) || (a.time < b.time ? -1 : 1); });
    S.extras = d[2].map(function (r) { return { id: r.id, title: r.title, date: r.event_date, time: hhmm(r.start_time), place: r.place }; });
    S.overrides = {};
    d[3].forEach(function (r) { S.overrides[r.training_key] = { date: r.new_date, time: hhmm(r.new_time), place: r.new_place }; });
    S.cancelled = {};
    d[4].forEach(function (r) { S.cancelled[r.training_key] = true; });
    S.events = d[5].map(function (r) { return { id: r.id, title: r.title, date: r.event_date, time: hhmm(r.start_time), place: r.place, cancelled: r.cancelled }; });
    S.tr = {};
    d[6].forEach(function (r) { (S.tr[r.training_key] = S.tr[r.training_key] || {})[r.user_id] = r.status; });
    S.ev = {};
    d[7].forEach(function (r) { (S.ev[r.event_id] = S.ev[r.event_id] || {})[r.user_id] = r.status; });
    if (S.session) S.me = S.members.filter(function (m) { return m.id === S.session.user.id; })[0] || null;
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
    crown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6l4 6l5-4l-2 10H5L3 8l5 4z"/><circle cx="12" cy="4" r="1"/><circle cx="3" cy="6" r="1"/><circle cx="21" cy="6" r="1"/></svg>',
    glass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8l-.5 5.5a3.5 3.5 0 0 1-7 0z"/><path d="M12 12v8"/><path d="M8.5 21h7"/></svg>',
    one: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6"/></svg>',
    two: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3.5"/><circle cx="17" cy="9" r="3"/><path d="M2 20c0-3.5 2.5-5.5 6-5.5s6 2 6 5.5M15 15c3.5 0 7 1.5 7 5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    calplus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
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
    var name = (e.title.replace(/[^\w\-äöüÄÖÜéèà ]+/g, '').trim().replace(/\s+/g, '-') || 'Event') + '.ics';
    var file = new File([buildIcs(e)], name, { type: 'text/calendar' });
    var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // iPhone: über das Teilen-Menü («Zum Kalender hinzufügen»)
    if (isIos && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: e.title }); return; }
      catch (err) { if (err && err.name === 'AbortError') return; /* sonst Download versuchen */ }
    }
    // Android und übrige: Datei laden, das Handy bietet dann «Kalender» zum Öffnen an
    var url = URL.createObjectURL(file);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
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

  function viewLogin() {
    var reg = S.mode === 'register';
    var needCode = reg && cfg.CLUB_CODE_REQUIRED !== false;
    return '<div class="login"><div class="langbar">' + langSelect() + '</div>' +
      '<h1>' + esc(cfg.CLUB_NAME || 'Training') + '<br>' + L('loginSub') + '</h1>' +
      '<p class="lead">' + (reg ? L('loginLeadReg') : L('loginLead')) + '</p>' +
      '<form data-form="auth">' +
      (reg ? fld(L('fullName'), '<input class="input" name="name" autocomplete="name" required>') : '') +
      fld(L('phone'), '<input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="079 123 45 67" value="' + esc(S.phone) + '" required>') +
      (reg ? '' : fld(L('pinOptional'), '<input class="input pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="current-password" placeholder="······">')) +
      (needCode ? fld(L('clubCode'), '<input class="input" name="code" autocomplete="off" required>') : '') +
      (S.err ? '<p class="err">' + esc(S.err) + '</p>' : '') +
      '<button class="btn" type="submit"' + (S.busy ? ' disabled' : '') + '>' + (reg ? L('register') : L('signIn')) + '</button>' +
      '</form>' +
      '<button class="linkbtn" data-act="mode" style="margin-top:12px">' + (reg ? L('haveAccount') : L('firstTime')) + '</button>' +
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
    var html = '<div class="top"><div><h1>' + L('titleTrainings', { club: prefix() }) + '</h1><p>' + L('subTrainings', { n: n }) + '</p></div></div>';
    if (!list.length) {
      return html + '<div class="empty"><p><b>' + L('emptyTrTitle') + '</b></p><p>' + (S.me.isAdmin ? L('emptyTrAdmin') : L('emptyTrMember')) + '</p></div>';
    }
    html += monthList(first, cardHtml);
    if (rest.length) {
      html += '<button class="morebtn" data-act="more-tr" aria-expanded="' + S.showMore + '"><span>' + L('moreDates', { n: rest.length }) + '</span>' + ICON.chev + '</button>';
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
    return '<article class="card' + (off ? ' cancelled' : '') + '" title="' + esc(t.title + ', ' + L('timePlace', { time: t.time, place: t.place })) + '">' +
      '<div class="row">' + dateBlock(t.date) +
      (off ? '<div class="off">' + L('trCancelled') + '</div>' :
        '<div class="acts">' +
          '<button class="resp yes" data-act="resp" data-val="yes" data-key="' + esc(t.key) + '" aria-pressed="' + (mine === 'yes') + '">' + ICON.check + L('yes') + '</button>' +
          '<button class="resp no" data-act="resp" data-val="no" data-key="' + esc(t.key) + '" aria-pressed="' + (mine === 'no') + '">' + ICON.x + L('no') + '</button>' +
        '</div>' +
        '<button class="count' + (isOpen ? ' is-open' : '') + '" data-act="who" data-key="' + esc(t.key) + '" aria-expanded="' + isOpen + '" aria-label="' + esc(L('ariaTr', { yes: yes.length, no: no.length, action: isOpen ? L('listClose') : L('listOpen') })) + '"><b>' + yes.length + '</b><small>' + L('participants') + '</small>' + ICON.chev + '</button>') +
      '</div>' +
      (!off && isOpen ? '<div class="who">' +
        '<div><h4>' + L('hYes', { n: yes.length }) + '</h4><div class="chips">' + chips(yes, false) + '</div></div>' +
        '<div><h4>' + L('hNo', { n: no.length }) + '</h4><div class="chips">' + chips(no, false) + '</div></div>' +
        '<div><h4>' + L('hOpen', { n: open.length }) + '</h4><div class="chips">' + chips(open, false) + '</div></div>' +
      '</div>' : '') +
    '</article>';
  }

  function dateBlock(d) {
    return '<div class="date"><span class="wd">' + esc(fmt(d, { weekday: 'short' }).replace('.', '')) + '</span><span class="dn">' + d.getDate() + '</span><span class="mo">' + esc(fmt(d, { month: 'short' }).replace('.', '')) + '</span></div>';
  }
  function chips(arr, plus) {
    return arr.length ? arr.map(function (m) {
      var me = m.id === S.me.id;
      return '<span class="chip' + (me ? ' me' : '') + '">' + esc(m.name) + (plus ? ' +1' : '') + (me ? ' ' + L('you') : '') + '</span>';
    }).join('') : '<span class="small muted">' + L('nobody') + '</span>';
  }

  function viewEvents() {
    var list = getEvents();
    var html = '<div class="top"><div><h1>' + L('titleEvents', { club: prefix() }) + '</h1><p>' + L('subEvents') + '</p></div></div>';
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
      return '<button class="resp ' + cls + '" data-act="resp-ev" data-val="' + val + '" data-id="' + e.id + '" aria-pressed="' + (mine === val) + '">' + icon + label + '</button>';
    };
    return '<article class="card ev' + (e.cancelled ? ' cancelled' : '') + '">' +
      '<div class="row">' + dateBlock(parseIso(e.date)) +
        '<div class="einfo"><h3><span class="t">' + esc(e.title) + '</span>' + (e.cancelled ? '<span class="tag off">' + L('cancelledTag') + '</span>' : '') + '</h3>' +
        '<p class="muted small">' + esc(L('timePlace', { time: e.time, place: e.place })) + '</p>' +
        (e.cancelled ? '' : '<button class="calbtn" data-act="cal" data-id="' + e.id + '">' + ICON.calplus + L('calAdd') + '</button>') + '</div>' +
        (e.cancelled ? '' : '<button class="count' + (isOpen ? ' is-open' : '') + '" data-act="who-ev" data-id="' + e.id + '" aria-expanded="' + isOpen + '" aria-label="' + esc(L('ariaEv', { n: persons, action: isOpen ? L('listClose') : L('listOpen') })) + '"><b>' + persons + '</b><small>' + L('participants') + '</small>' + ICON.chev + '</button>') +
      '</div>' +
      (e.cancelled ? '' :
        '<div class="acts3">' + btn('solo', 'yes', ICON.one, L('solo')) + btn('duo', 'yes', ICON.two, L('duo')) + btn('no', 'no', '', L('no')) + '</div>' +
        (isOpen ? '<div class="who">' +
          '<div><h4>' + L('hSolo', { n: solo.length }) + '</h4><div class="chips">' + chips(solo, false) + '</div></div>' +
          '<div><h4>' + L('hDuo', { n: duo.length, p: duo.length * 2 }) + '</h4><div class="chips">' + chips(duo, true) + '</div></div>' +
          '<div><h4>' + L('hNo', { n: no.length }) + '</h4><div class="chips">' + chips(no, false) + '</div></div>' +
          '<div><h4>' + L('hOpen', { n: open.length }) + '</h4><div class="chips">' + chips(open, false) + '</div></div>' +
        '</div>' : '')) +
    '</article>';
  }

  function accordion(id, title, count, body, canAdd, info) {
    var open = !!S.sec[id], adding = !!S.add[id], showInfo = !!S.info[id];
    var addLabel = adding ? L('addClose') : L('addNew');
    var infoLabel = showInfo ? L('infoHide') : L('infoShow');
    // Reihenfolge: Titel links, dann Info-Symbol, «+» (falls vorhanden) und ganz rechts der Pfeil zum Ein-/Ausklappen
    return '<section class="panel acc"><div class="acchead">' +
      '<button class="acctoggle" data-act="sec" data-id="' + id + '" aria-expanded="' + open + '">' +
      '<span class="t">' + title + (count != null ? ' <span class="cnt">(' + count + ')</span>' : '') + '</span></button>' +
      (info ? '<button class="plusbtn infobtn" data-act="info-toggle" data-id="' + id + '" aria-pressed="' + showInfo + '" aria-label="' + infoLabel + '" title="' + infoLabel + '">' + ICON.info + '</button>' : '') +
      (canAdd ? '<button class="plusbtn" data-act="add-toggle" data-id="' + id + '" aria-pressed="' + adding + '" aria-label="' + addLabel + '" title="' + addLabel + '"><span>+</span></button>' : '') +
      '<button class="accchev' + (open ? ' open' : '') + '" data-act="sec" data-id="' + id + '" aria-hidden="true" tabindex="-1">' + ICON.chev + '</button>' +
      '</div>' + (open ? '<div class="accbody">' + (info && showInfo ? '<p class="infotext">' + info + '</p>' : '') + body + '</div>' : '') + '</section>';
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
      '<div class="btnrow"><button class="mini" data-act="edit" data-target="tr:' + esc(t.key) + '">' + L('edit') + '</button>' +
      '<button class="mini" data-act="cancel" data-key="' + esc(t.key) + '">' + (off ? L('reactivate') : L('cancel')) + '</button>' +
      (t.extraId ? '<button class="mini del" data-act="del-extra" data-id="' + t.extraId + '">' + L('del') + '</button>' : '') + '</div></li>';
  }

  function viewAdmin() {
    var all = getTrainings();
    var series = all.filter(function (t) { return !t.extraId; });
    var extras = all.filter(function (t) { return !!t.extraId; });
    var isAdm = S.me.isAdmin;
    var html = '<div class="top"><div><h1>' + L('adminTitle') + '</h1><p>' + L(isAdm ? 'adminSub' : 'emSub') + '</p></div></div>';
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
        '<div class="btnrow"><button class="mini" data-act="edit" data-target="rule:' + r.id + '">' + L('edit') + '</button>' +
        '<button class="mini del" data-act="del-rule" data-id="' + r.id + '">' + L('remove') + '</button></div></li>';
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
        '<button class="btn" type="submit">' + L('addEvent') + '</button></form>';
    }
    b += evs.length ? '<ul class="list scroll" data-sc="events">' + evs.map(function (e) {
      if (S.edit === 'ev:' + e.id) {
        return editRow('edit-ev', e.id, fld(L('label'), inTitle(e.title)) + grid(fld(L('date'), inDate(e.date)), fld(L('time'), inTime(e.time))) + fld(L('place'), inPlace(e.place)));
      }
      return '<li><div class="l"><b>' + esc(e.title) + '</b><span>' + esc(fmt(parseIso(e.date), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })) + ', ' + esc(e.time) + ', ' + esc(e.place) + (e.cancelled ? ' · ' + L('cancelledLow') : '') + '</span></div>' +
        '<div class="btnrow"><button class="mini" data-act="edit" data-target="ev:' + e.id + '">' + L('edit') + '</button>' +
        '<button class="mini" data-act="cancel-ev" data-id="' + e.id + '">' + (e.cancelled ? L('reactivate') : L('cancel')) + '</button>' +
        '<button class="mini del" data-act="del-ev" data-id="' + e.id + '">' + L('del') + '</button></div></li>';
    }).join('') + '</ul>' : '<p class="muted">' + L('eventsEmpty') + '</p>';
    html += accordion('events', L('secEvents'), evs.length, b, true, L('subEvents'));

    /* Mitglieder */
    b = '';
    if (S.add.members) {
      b += '<form class="addform" data-form="member"><h3 style="margin-bottom:10px">' + L('memberAdd') + '</h3>' +
        fld(L('fullName'), '<input class="input" name="name" autocomplete="off" required>') +
        fld(L('phone'), '<input class="input" name="phone" type="tel" inputmode="tel" autocomplete="off" placeholder="079 123 45 67" required>') +
        '<p class="small muted" style="margin:-4px 0 12px">' + L('memberAddNote') + '</p>' +
        '<label class="check"><input type="checkbox" name="guest" value="1"><span>' + L('guestCheck') + '</span></label>' +
        '<button class="btn" type="submit">' + L('memberAdd') + '</button></form>';
    }
    b += '<ul class="list scroll" data-sc="members">' + S.members.map(function (m) {
      var self = m.id === S.me.id;
      var member = !m.isGuest;
      // Krone: gefüllt = Mitglied, leer = Gast
      var crownLabel = self ? L('selfMember') : L(member ? 'makeGuest' : 'revokeGuest', { name: m.name });
      var starLabel = self ? L('selfAdmin') : L(m.isAdmin ? 'revokeAdmin' : 'makeAdmin', { name: m.name });
      var glassLabel = L(m.isEventManager ? 'revokeEm' : 'makeEm', { name: m.name });
      var roleBtn = function (cls, act, val, on, label, icon, disabled) {
        return '<button class="rolebtn ' + cls + (on ? ' on' : '') + '" data-act="' + act + '" data-id="' + m.id + '" data-val="' + val + '" aria-pressed="' + on + '" aria-label="' + esc(label) + '" title="' + esc(label) + '"' + (disabled ? ' disabled' : '') + '>' + icon + '</button>';
      };
      return '<li><div class="l"><b>' + esc(m.name) + '</b><span>' + esc(fmtPhone(m.phone)) + '</span></div>' +
        '<div class="btnrow">' +
        roleBtn('crown', 'set-guest', member ? '1' : '0', member, crownLabel, ICON.crown, self) +
        (member ? roleBtn('star', 'set-admin', m.isAdmin ? '0' : '1', m.isAdmin, starLabel, ICON.star, self) : '') +
        (member ? roleBtn('glass', 'set-em', m.isEventManager ? '0' : '1', m.isEventManager, glassLabel, ICON.glass, false) : '') +
        (self ? '' : '<button class="mini" data-act="reset-pin" data-id="' + m.id + '">' + L('resetPin') + '</button><button class="mini del" data-act="remove-member" data-id="' + m.id + '">' + L('remove') + '</button>') +
        '</div></li>';
    }).join('') + '</ul>';
    if (isAdm) html += accordion('members', L('secMembers'), S.members.length, b, true, L('membersIntro'));
    return html;
  }

  function viewProfile() {
    var iosHint = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
    var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    var install = '';
    if (!standalone) {
      if (installPrompt) install = '<section class="panel"><h2>' + L('installTitle') + '</h2><p>' + L('installHint') + '</p><button class="btn" data-act="install">' + L('installBtn') + '</button></section>';
      else if (iosHint) install = '<section class="panel"><h2>' + L('installTitle') + '</h2><p>' + L('installIos') + '</p></section>';
    }
    return '<div class="top"><div><h1>' + L('profileTitle') + '</h1></div></div>' +
      '<section class="panel"><div class="profile-row"><span class="muted">' + L('nameLabel') + '</span><b>' + esc(S.me.name) + '</b></div>' +
      '<div class="profile-row"><span class="muted">' + L('phone') + '</span><b>' + esc(fmtPhone(S.me.phone)) + '</b></div></section>' +
      '<section class="panel"><h2>' + L('rolesTitle') + '</h2>' +
        '<div class="rolerow"><span class="rolebtn crown' + (S.me.isGuest ? '' : ' on') + '">' + ICON.crown + '</span><span>' + L(S.me.isGuest ? 'guestTag' : 'memberTag') + '</span></div>' +
        (S.me.isAdmin ? '<div class="rolerow"><span class="rolebtn star on">' + ICON.star + '</span><span>' + L('adminTag') + '</span></div>' : '') +
        (S.me.isEventManager ? '<div class="rolerow"><span class="rolebtn glass on">' + ICON.glass + '</span><span>' + L('emTag') + '</span></div>' : '') +
        (S.me.isGuest ? '<p class="small muted" style="margin:10px 0 0">' + L('guestInfo') + '</p>' : '') +
      '</section>' +
      '<section class="panel"><h2>' + L('language') + '</h2><p>' + L('languageHint') + '</p>' + langSelect() + '</section>' +
      install +
      '<section class="panel"><h2>' + L('nameChange') + '</h2><form data-form="name">' + fld(L('fullName'), '<input class="input" name="name" value="' + esc(S.me.name) + '" required>') +
      '<button class="btn" type="submit">' + L('nameSave') + '</button></form></section>' +
      '<section class="panel"><h2>' + L('pinChange') + '</h2><p>' + L('pinIntro') + '</p><form data-form="pin">' +
      fld(L('pinNew'), '<input class="input pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" required>') +
      '<button class="btn" type="submit">' + L('pinSave') + '</button></form>' +
      '<button class="linkbtn" data-act="pin-default" style="margin-top:10px">' + L('pinDefault') + '</button></section>' +
      '<button class="btn ghost" data-act="logout">' + L('logout') + '</button>';
  }

  function renderNav() {
    var nav = document.getElementById('nav');
    if (S.step !== 'app') { nav.hidden = true; return; }
    nav.hidden = false;
    var tabs = [{ id: 'trainings', label: L('navTrainings'), icon: ICON.cal }];
    if (!S.me.isGuest) tabs.push({ id: 'events', label: L('navEvents'), icon: ICON.star });
    if (S.me.isAdmin || S.me.isEventManager) tabs.push({ id: 'admin', label: L('navAdmin'), icon: ICON.cog });
    tabs.push({ id: 'profile', label: L('navProfile'), icon: ICON.user });
    nav.innerHTML = '<div class="in">' + tabs.map(function (t) {
      return '<button class="tab" data-act="tab" data-tab="' + t.id + '"' + (S.tab === t.id ? ' aria-current="page"' : '') + '>' + t.icon + '<span>' + t.label + '</span></button>';
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
    else {
      if (S.tab === 'admin' && !(S.me.isAdmin || S.me.isEventManager)) S.tab = 'trainings';
      if (S.tab === 'events' && S.me.isGuest) S.tab = 'trainings';
      app.innerHTML = S.tab === 'admin' ? viewAdmin() : S.tab === 'events' ? viewEvents() : S.tab === 'profile' ? viewProfile() : viewTrainings();
    }
    renderNav();
    window.scrollTo(0, y);
    document.querySelectorAll('.list.scroll').forEach(function (x) { if (lts[x.dataset.sc]) x.scrollTop = lts[x.dataset.sc]; });
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
        options: { data: { name: name, phone: phone, club_code: code.data || '' } }
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
      try { await loadAll(); softRender(); } catch (e) { console.error(e); }
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
    if (act_ === 'pin-default') {
      try {
        var pr = await sb.auth.updateUser({ password: defaultPin(S.me.phone) });
        if (pr.error) throw pr.error;
        toast(L('pinResetOk'));
      } catch (err) { console.error(err); toast(L('pinResetFail')); }
      return;
    }

    /* Event-Aktionen: Admins und Event-Manager */
    if (S.me && (S.me.isAdmin || S.me.isEventManager)) {
      if (act_ === 'del-ev') {
        if (!confirm(L('confirmDelEvent'))) return;
        return act(function () { return sb.from('events').delete().eq('id', D.id); }, L('eventDeleted'));
      }
      if (act_ === 'cancel-ev') {
        var evx = S.events.filter(function (x) { return x.id === D.id; })[0];
        if (!evx) return;
        return act(function () { return sb.from('events').update({ cancelled: !evx.cancelled }).eq('id', D.id); }, evx.cancelled ? L('evReactivated') : L('evCancelledMsg'));
      }
    }

    /* Admin-Aktionen */
    if (!S.me || !S.me.isAdmin) return;
    if (act_ === 'del-rule') {
      if (!confirm(L('confirmDelRule'))) return;
      return act(function () { return sb.from('training_rules').delete().eq('id', D.id); }, L('ruleRemoved'));
    }
    if (act_ === 'del-extra') {
      if (!confirm(L('confirmDelExtra'))) return;
      return act(function () { return sb.from('training_extras').delete().eq('id', D.id); }, L('extraDeleted'));
    }
    if (act_ === 'reset-tr') {
      S.edit = null;
      return act(function () { return sb.from('training_overrides').delete().eq('training_key', D.key); }, L('changeReset'));
    }
    if (act_ === 'reset-pin') {
      var who = S.members.filter(function (m) { return m.id === D.id; })[0];
      if (!confirm(L('confirmResetPin', { name: who ? who.name : L('thisMemberDat') }))) return;
      return act(function () { return sb.rpc('reset_pin', { target: D.id }); }, L('pinReset'));
    }
    if (act_ === 'remove-member') {
      var rm = S.members.filter(function (m) { return m.id === D.id; })[0];
      if (!confirm(L('confirmRemove', { name: rm ? rm.name : L('thisMember') }))) return;
      return act(function () { return sb.rpc('remove_member', { target: D.id }); }, L('memberRemoved'));
    }
    if (act_ === 'set-guest') {
      var tg = S.members.filter(function (m) { return m.id === D.id; })[0];
      if (D.val === '1' && tg && (tg.isAdmin || tg.isEventManager) && !confirm(L('confirmGuestLoses', { name: tg.name }))) return;
      return act(function () { return sb.rpc('set_guest', { target: D.id, make_guest: D.val === '1' }); }, D.val === '1' ? L('guestGranted') : L('guestRevoked'));
    }
    if (act_ === 'set-em') {
      return act(function () { return sb.rpc('set_event_manager', { target: D.id, make_manager: D.val === '1' }); }, D.val === '1' ? L('emGranted') : L('emRevoked'));
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
    var g = function (k) { return String(f.get(k) || '').trim(); };
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
      } catch (err) { console.error(err); toast(L('pinChangeFail')); }
      return;
    }
    if (!S.me.isAdmin && !(S.me.isEventManager && (kind === 'event' || kind === 'edit-ev'))) return;

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
      ok = await act(function () { return sb.from('events').insert({ title: g('title'), event_date: g('date'), start_time: g('time'), place: g('place') }); }, L('eventAdded'));
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
      ok = await act(function () { return sb.from('events').update({ title: g('title'), event_date: g('date'), start_time: g('time'), place: g('place') }).eq('id', id); }, L('eventChanged'));
      if (ok) S.edit = null;
    }
    if (ok && kind === 'rule') S.add.rules = false;
    if (ok && kind === 'event') S.add.events = false;
    if (ok) { render(); if (/^(extra)$/.test(kind)) { var nf = document.querySelector('[data-form="' + kind + '"]'); if (nf) nf.reset(); } }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || t.name !== 'phone' || !t.closest('[data-form="auth"],[data-form="member"]')) return;
    var pos = t.selectionStart, atEnd = pos === t.value.length;
    var before = t.value.slice(0, pos).replace(/\D/g, '').length;
    var f = formatPhoneTyping(t.value);
    if (f === t.value) return;
    t.value = f;
    if (atEnd) pos = f.length;
    else { var c = 0; pos = 0; while (pos < f.length && c < before) { if (/\d/.test(f.charAt(pos))) c++; pos++; } }
    try { t.setSelectionRange(pos, pos); } catch (x) { /* ignorieren */ }
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
