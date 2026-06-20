-- Eski 4-slot şemasından 10-slot şemasına item taşıma (idempotent).
-- db push'tan SONRA çalışır (yeni enum değerleri o aşamada mevcut olur).
-- HEAD→Kask, BODY→Zırh, ACCESSORY→Kolye. WEAPON aynı kalır.
UPDATE "ArenaItem" SET slot = 'HELMET'   WHERE slot = 'HEAD';
UPDATE "ArenaItem" SET slot = 'ARMOR'    WHERE slot = 'BODY';
UPDATE "ArenaItem" SET slot = 'NECKLACE' WHERE slot = 'ACCESSORY';
