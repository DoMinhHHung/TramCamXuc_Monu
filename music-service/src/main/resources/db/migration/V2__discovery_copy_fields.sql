-- Migration: Add Discovery Copy fields to albums and playlists
ALTER TABLE albums ADD COLUMN is_discovery_copy BOOLEAN DEFAULT FALSE;
ALTER TABLE albums ADD COLUMN discovery_source_id UUID;
ALTER TABLE albums ADD COLUMN discovery_source_type VARCHAR(20);
ALTER TABLE albums ADD COLUMN discovery_source_name VARCHAR(255);

ALTER TABLE playlists ADD COLUMN is_discovery_copy BOOLEAN DEFAULT FALSE;
ALTER TABLE playlists ADD COLUMN discovery_source_id UUID;
ALTER TABLE playlists ADD COLUMN discovery_source_type VARCHAR(20);
ALTER TABLE playlists ADD COLUMN discovery_source_name VARCHAR(255);
