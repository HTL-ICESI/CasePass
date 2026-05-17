CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS legal_role VARCHAR(50)
  CHECK (legal_role IN (
    'solicitor_on_record',
    'local_agent',
    'advocate_hearing_only',
    'internal_fee_earner',
    'counsel'
  ));

DROP TABLE IF EXISTS cases CASCADE;
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  case_title VARCHAR(255) NOT NULL,
  claim_number VARCHAR(100),
  claimant VARCHAR(255) NOT NULL,
  defendant VARCHAR(255) NOT NULL,
  appellant VARCHAR(255),

  forum VARCHAR(50) NOT NULL CHECK (forum IN (
    'county_court',
    'high_court_kbd',
    'high_court_chancery',
    'high_court_family',
    'court_of_appeal_civil',
    'employment_tribunal',
    'upper_tribunal',
    'magistrates_court',
    'other_tribunal'
  )),
  court_name VARCHAR(255),
  division_or_list VARCHAR(255),
  ruleset VARCHAR(50) CHECK (ruleset IN ('CPR', 'FPR', 'Tribunal_Rules', 'Other')),
  tribunal_chamber VARCHAR(255),

  claim_type VARCHAR(100),
  part7_or_part8 VARCHAR(10) CHECK (part7_or_part8 IN ('Part7', 'Part8', 'NA')),
  appeal_flag BOOLEAN DEFAULT FALSE,
  pre_action_protocol VARCHAR(100),

  track VARCHAR(50) CHECK (track IN (
    'small_claims',
    'fast_track',
    'intermediate_track',
    'multi_track',
    'unallocated'
  )),
  complexity_band VARCHAR(10),
  cmc_flag BOOLEAN DEFAULT FALSE,
  ptr_flag BOOLEAN DEFAULT FALSE,

  issue_date DATE,
  service_method VARCHAR(50),
  aos_due DATE,
  defence_due DATE,

  next_hearing_type VARCHAR(100),
  next_hearing_date DATE,
  hearing_mode VARCHAR(20) CHECK (hearing_mode IN (
    'in_person', 'remote', 'hybrid', 'on_papers'
  )),
  bundle_due DATE,
  skeleton_due DATE,

  disclosure_regime VARCHAR(50) CHECK (disclosure_regime IN (
    'Part31_standard',
    'PD57AD_extended',
    'train_of_inquiry',
    'none'
  )),
  pd57ad_flag BOOLEAN DEFAULT FALSE,
  n265_status VARCHAR(50),

  witness_statements_status VARCHAR(50),
  pd57ac_flag BOOLEAN DEFAULT FALSE,
  expert_permission BOOLEAN DEFAULT FALSE,

  costs_regime VARCHAR(50) CHECK (costs_regime IN (
    'standard_basis',
    'indemnity_basis',
    'fixed_recoverable',
    'FRC',
    'no_order'
  )),
  frc_flag BOOLEAN DEFAULT FALSE,
  qocs_flag BOOLEAN DEFAULT FALSE,
  part36_offer_flag BOOLEAN DEFAULT FALSE,

  solicitor_on_record_id UUID REFERENCES users(id),
  n434_status VARCHAR(50) CHECK (n434_status IN (
    'not_required', 'pending', 'filed', 'served'
  )) DEFAULT 'not_required',

  human_verified BOOLEAN DEFAULT FALSE,
  last_verified_by UUID REFERENCES users(id),
  last_verified_at TIMESTAMPTZ,

  forum_uncertain BOOLEAN DEFAULT FALSE,
  bundle_noncompliance_risk BOOLEAN DEFAULT FALSE,
  recording_risk_flag BOOLEAN DEFAULT FALSE,

  solicitor_notes TEXT,
  strategic_notes TEXT,
  most_recent_operative_event TEXT,
  next_procedural_step TEXT,
  urgency VARCHAR(20) CHECK (urgency IN (
    'routine', 'elevated', 'urgent', 'critical'
  )) DEFAULT 'routine',

  created_by UUID NOT NULL REFERENCES users(id),
  share_token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS handoffs CASCADE;
CREATE TABLE handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sending_solicitor_id UUID NOT NULL REFERENCES users(id),
  receiving_solicitor_id UUID REFERENCES users(id),

  handoff_type VARCHAR(50) CHECK (handoff_type IN (
    'internal_reassignment',
    'external_agent',
    'advocacy_hearing_only',
    'full_solicitor_change'
  )),

  rights_of_audience_verified BOOLEAN DEFAULT FALSE,
  rights_of_audience_forum VARCHAR(50),

  notice_of_change_required BOOLEAN DEFAULT FALSE,
  n434_triggered BOOLEAN DEFAULT FALSE,
  n434_filed_at TIMESTAMPTZ,

  clearance_result VARCHAR(20) CHECK (clearance_result IN (
    'approved', 'rejected', 'pending'
  )) DEFAULT 'pending',
  clearance_notes TEXT,
  clearance_completed_at TIMESTAMPTZ,
  compliance_hold_reason TEXT,

  intended_task TEXT NOT NULL,
  task_scope VARCHAR(20) CHECK (task_scope IN ('limited', 'continuing')),

  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'clearance_pending',
    'clearance_failed',
    'compliance_hold',
    'file_upload_open',
    'pack_building',
    'pack_review',
    'pack_released',
    'accepted',
    'task_in_progress',
    'post_action_pending',
    'update_draft',
    'update_verified',
    'routed',
    'completed',
    'escalated'
  )),

  routing_outcome VARCHAR(50) CHECK (routing_outcome IN (
    'returned',
    'limited_followon',
    'new_instructed_solicitor',
    'escalated'
  )),

  recording_risk_acknowledged BOOLEAN DEFAULT FALSE,
  hearing_note_type VARCHAR(50) CHECK (hearing_note_type IN (
    'typed_attendance_note',
    'post_hearing_dictation',
    'official_transcript_import',
    'none'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS documents CASCADE;
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  handoff_id UUID REFERENCES handoffs(id),

  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  doc_type VARCHAR(50) CHECK (doc_type IN (
    'pleading', 'order', 'sealed_order', 'correspondence',
    'evidence', 'hearing_notice', 'draft', 'prior_note',
    'attendance_note', 'transcript', 'post_action_doc',
    'n434_notice', 'other'
  )),

  source_status VARCHAR(20) CHECK (source_status IN (
    'original', 'copy', 'draft', 'certified', 'sealed'
  )) DEFAULT 'original',
  sealed_flag BOOLEAN DEFAULT FALSE,
  privilege_flag BOOLEAN DEFAULT FALSE,
  confidentiality_flag BOOLEAN DEFAULT FALSE,

  version_number INTEGER DEFAULT 1,
  superseded_by UUID REFERENCES documents(id),

  status VARCHAR(20) CHECK (status IN (
    'pending', 'indexing', 'indexed', 'error'
  )) DEFAULT 'pending',
  chunks_count INTEGER DEFAULT 0,
  index_error TEXT,
  page_count INTEGER,

  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handover_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id UUID NOT NULL REFERENCES handoffs(id) ON DELETE CASCADE,
  ai_draft JSONB,
  ai_generated_at TIMESTAMPTZ,
  ai_token_count INTEGER,
  solicitor_edited JSONB,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  version_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_action_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id UUID NOT NULL REFERENCES handoffs(id) ON DELETE CASCADE,
  what_was_done TEXT,
  what_happened TEXT,
  what_follows TEXT,
  ai_draft JSONB,
  ai_generated_at TIMESTAMPTZ,
  verified_version JSONB,
  new_procedural_status TEXT,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  actor_id UUID REFERENCES users(id),
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matter_status_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id),
  handoff_id UUID REFERENCES handoffs(id),
  operative_event TEXT,
  next_procedural_step TEXT,
  live_deadlines JSONB DEFAULT '[]',
  urgent_flags JSONB DEFAULT '[]',
  source_register JSONB DEFAULT '[]',
  snapshot_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  due_date DATE,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_links (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by);
CREATE INDEX IF NOT EXISTS idx_cases_forum ON cases(forum);
CREATE INDEX IF NOT EXISTS idx_cases_track ON cases(track);
CREATE INDEX IF NOT EXISTS idx_cases_claim_number ON cases(claim_number);
CREATE INDEX IF NOT EXISTS idx_handoffs_case_id ON handoffs(case_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_status ON handoffs(status);
CREATE INDEX IF NOT EXISTS idx_handoffs_sending ON handoffs(sending_solicitor_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_receiving ON handoffs(receiving_solicitor_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_handoff_id ON documents(handoff_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_matter_status_case ON matter_status_snapshots(case_id);
