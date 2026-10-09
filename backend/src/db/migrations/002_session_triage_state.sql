-- Migration 002: Add triage state columns to sessions
-- Stores the original symptom profile, accumulated clarification answers,
-- the original input text, and the authoritative turn counter server-side.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS symptom_profile JSONB,
  ADD COLUMN IF NOT EXISTS clarification_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS input_text TEXT,
  ADD COLUMN IF NOT EXISTS turn_count INTEGER NOT NULL DEFAULT 0;
