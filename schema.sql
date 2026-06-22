CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    target_policy_id VARCHAR(64) NOT NULL,
    target_asset_name VARCHAR(128) NOT NULL DEFAULT '',
    target_fingerprint VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    snapshot_block BIGINT NOT NULL,
    snapshot_slot BIGINT NOT NULL DEFAULT 0,
    creator_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_address VARCHAR(255) NOT NULL,
    vote_choice TEXT NOT NULL,
    signature_hex TEXT NOT NULL,
    key_hex TEXT NOT NULL DEFAULT '',
    stake_weight NUMERIC(40, 0) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(proposal_id, voter_address)
);

CREATE INDEX idx_votes_proposal_id ON votes(proposal_id);
CREATE INDEX idx_proposals_target_asset ON proposals(target_policy_id, target_asset_name);
CREATE INDEX idx_proposals_status ON proposals(status);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view proposals"
    ON proposals FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create proposals"
    ON proposals FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Public can view votes"
    ON votes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert votes"
    ON votes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
