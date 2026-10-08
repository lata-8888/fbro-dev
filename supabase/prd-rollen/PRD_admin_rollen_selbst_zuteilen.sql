-- Optional: dir selbst (als Admin) die Manager-Rollen geben, falls du sie in der App noch nicht zugeteilt hast.
-- Telefonnummer anpassen (internationales Format, z. B. +4179...). Nur die Rollen auf true lassen, die du brauchst.
update public.profiles
set is_event_manager = true,
    is_chilbi_manager = true,
    is_chraenzli_manager = true,
    is_jass_master = true
where phone = '+41…' and is_admin;
