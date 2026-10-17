-- Rückgängig PRD v109 (Medien-Spalten der Akte bleiben, da von v98/v101 stammend)
alter table public.show_acts drop column if exists is_hint;
