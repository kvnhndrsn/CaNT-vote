-- Run this in Supabase SQL Editor to add new poll features

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS options TEXT[] DEFAULT '{"Yes","No","Abstain"}';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS voting_type VARCHAR(20) DEFAULT 'standard';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS allow_split BOOLEAN DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS snapshot_block BIGINT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS min_balance NUMERIC(40,0) DEFAULT 0;

ALTER TABLE votes ADD COLUMN IF NOT EXISTS split_weights JSONB;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS delegate_to VARCHAR(255);

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_address VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delegations table (skip if you don't need delegation yet)
-- CREATE TABLE IF NOT EXISTS delegations (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     delegator VARCHAR(255) NOT NULL,
--     delegate VARCHAR(255) NOT NULL,
--     poll_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_delegations_unique ON delegations(delegator, COALESCE(poll_id, '00000000-0000-0000-0000-000000000000'));
-- CREATE INDEX IF NOT EXISTS idx_delegations_delegator ON delegations(delegator);
-- CREATE INDEX IF NOT EXISTS idx_delegations_delegate ON delegations(delegate);
