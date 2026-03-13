-- Loops can take any form or title (researcher, assistant, writer, etc.), not just buyer/seller/both.
ALTER TABLE loops DROP CONSTRAINT IF EXISTS loops_role_check;
ALTER TABLE loops ALTER COLUMN role SET DEFAULT 'agent';
COMMENT ON COLUMN loops.role IS 'Free-form: buyer, seller, both, researcher, assistant, writer, or any other title.';
