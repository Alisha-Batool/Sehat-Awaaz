-- Sehat Awaaz Database Schema
-- Migration 001: Initial schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  preferred_language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table (supports both authenticated and guest users)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'en',
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Red-flag rules (safety-critical, versioned, clinician-approved)
CREATE TABLE IF NOT EXISTS red_flag_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version INTEGER NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'emergency',
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  reviewed_by VARCHAR(100),
  rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(version, name)
);

CREATE INDEX IF NOT EXISTS idx_rules_active ON red_flag_rules(is_active) WHERE is_active = true;

-- Triage results
CREATE TABLE IF NOT EXISTS triage_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL,
  rule_id UUID REFERENCES red_flag_rules(id),
  rationale TEXT,
  confidence DECIMAL(4,3) DEFAULT 0.000,
  explanation TEXT,
  rule_version INTEGER,
  model_version VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_session ON triage_results(session_id);

-- Audit logs (immutable safety records)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID,
  action VARCHAR(100) NOT NULL,
  input_hash VARCHAR(64),
  rule_path VARCHAR(20),
  output_tier VARCHAR(20),
  confidence DECIMAL(4,3),
  rule_version INTEGER,
  model_version VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- Healthcare facilities
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(300) NOT NULL,
  type VARCHAR(50),
  province VARCHAR(100),
  district VARCHAR(100),
  address TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  phone VARCHAR(30),
  emergency_capable BOOLEAN DEFAULT false,
  last_verified DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facilities_location ON facilities(lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facilities_province ON facilities(province);

-- Emergency numbers by region
CREATE TABLE IF NOT EXISTS emergency_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  province VARCHAR(100),
  city VARCHAR(100),
  number VARCHAR(20) NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT false
);

-- Clarification question bank
CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symptom_category VARCHAR(100) NOT NULL,
  question_key VARCHAR(100) NOT NULL,
  question_text JSONB NOT NULL,
  options JSONB,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Explanation templates
CREATE TABLE IF NOT EXISTS explanation_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier VARCHAR(20) NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  text JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
