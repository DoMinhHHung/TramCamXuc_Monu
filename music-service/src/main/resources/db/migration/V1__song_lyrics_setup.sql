-- ============================================================================
-- Migration: Song Lyrics - Full-text search + Trigram search
-- Chạy script này trên Supabase SQL Editor SAU KHI Hibernate đã tạo bảng
-- song_lyrics (ddl-auto: update).
-- ============================================================================

-- 1. Bật extensions cần thiết (Supabase thường đã có sẵn, nhưng chạy cho chắc)
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm  SCHEMA public;

-- 2. Đảm bảo cột search_vector tồn tại (nếu Hibernate chưa tạo đúng type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'song_lyrics' AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE song_lyrics ADD COLUMN search_vector tsvector;
    END IF;
END $$;

-- 3. Tạo trigger function tự động cập nhật search_vector khi insert/update
CREATE OR REPLACE FUNCTION song_lyrics_search_vector_update()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector(
        'simple',
        unaccent(coalesce(NEW.search_content, ''))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Tạo trigger
DROP TRIGGER IF EXISTS trg_lyrics_search_vector ON song_lyrics;

CREATE TRIGGER trg_lyrics_search_vector
    BEFORE INSERT OR UPDATE OF search_content
    ON song_lyrics
    FOR EACH ROW
    EXECUTE FUNCTION song_lyrics_search_vector_update();

-- 5. Xoá index B-tree cũ mà Hibernate có thể đã tạo (không phù hợp cho tsvector)
DROP INDEX IF EXISTS idx_lyrics_search_vector;

-- 6. Tạo GIN index cho full-text search (tsvector)
CREATE INDEX IF NOT EXISTS idx_lyrics_search_vector_gin
    ON song_lyrics USING GIN (search_vector);

-- 7. Tạo GIN trigram index cho fuzzy/ILIKE search
CREATE INDEX IF NOT EXISTS idx_lyrics_search_content_trgm
    ON song_lyrics USING GIN (search_content gin_trgm_ops);

-- 8. Backfill search_vector cho các dòng đã có dữ liệu (nếu có)
UPDATE song_lyrics
SET search_vector = to_tsvector('simple', unaccent(coalesce(search_content, '')))
WHERE search_vector IS NULL AND search_content IS NOT NULL;
