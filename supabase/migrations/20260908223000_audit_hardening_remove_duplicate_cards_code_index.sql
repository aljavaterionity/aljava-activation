-- Audit hardening: remove a proven duplicate index.
-- Cards_card_code_key is UNIQUE(card_code), so idx_cards_card_code
-- duplicated the same single-column btree access path.
drop index if exists public.idx_cards_card_code;
