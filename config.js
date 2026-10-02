// Konfiguration der App.
// Die Werte findest du in Supabase unter «Project Settings» → «API».
// Der «anon public»-Schlüssel ist für den Einsatz im Browser gedacht und darf öffentlich sein.
// Den «service_role»-Schlüssel darfst du hier NIE eintragen.
window.APP_CONFIG = {
  SUPABASE_URL: 'https://hshchitgcweewnantxbs.supabase.co/rest/v1/',
  SUPABASE_ANON_KEY: 'sb_publishable_ohykf3XmZGt86oykIe2Ujw_m9U-km8k',

  // Kurzname für die Titel «FBRO-Trainings» und «FBRO-Events»
  CLUB_SHORT: 'FBRO',

  // Anzahl Trainings, die direkt sichtbar sind (der Rest steht unter «Weitere Trainings»)
  TRAININGS_VISIBLE: 20,

  // Name des Vereins auf der Anmeldeseite
  CLUB_NAME: 'FBRO',

  // true = bei der Registrierung wird ein Vereinscode verlangt (empfohlen)
  CLUB_CODE_REQUIRED: true,

  // Dauer eines Events in Minuten für den Kalendereintrag (Events haben keine Endzeit)
  EVENT_DURATION_MIN: 120

  // Optional: Domain für die intern verwendeten Login-Adressen.
  // Nur ändern, wenn Supabase die Standard-Domain ablehnt.
  // EMAIL_DOMAIN: 'phone-login.app'
};
