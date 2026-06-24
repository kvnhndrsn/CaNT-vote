CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Polls (renamed from proposals, keeping table name for compat)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS options TEXT[] DEFAULT '{"Yes","No","Abstain"}';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS voting_type VARCHAR(20) DEFAULT 'standard';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS allow_split BOOLEAN DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS snapshot_block BIGINT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS min_balance NUMERIC(40,0) DEFAULT 0;

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_address VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delegations table (uncomment when delegation feature is wired)
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

ALTER TABLE votes ADD COLUMN IF NOT EXISTS split_weights JSONB;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS delegate_to VARCHAR(255);

-- Original tables (already exist from first run)
-- Keeping for backwards compatibility
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    target_policy_id VARCHAR(64) NOT NULL,
    target_asset_name VARCHAR(128) NOT NULL DEFAULT '',
    target_fingerprint VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creator_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS votes (
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

CREATE INDEX IF NOT EXISTS idx_votes_proposal_id ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposals_target_asset ON proposals(target_policy_id, target_asset_name);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- Surf tables (unchanged)
CREATE TABLE IF NOT EXISTS surf_pools (
    pool_id VARCHAR(100) PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL DEFAULT '',
    policy_id VARCHAR(64) NOT NULL DEFAULT '',
    asset_name VARCHAR(128) NOT NULL DEFAULT '',
    decimals INT NOT NULL DEFAULT 0,
    price DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_supplied NUMERIC(30,0) NOT NULL DEFAULT 0,
    total_borrowed NUMERIC(30,0) NOT NULL DEFAULT 0,
    reserve NUMERIC(30,0) NOT NULL DEFAULT 0,
    reserve_factor DOUBLE PRECISION NOT NULL DEFAULT 0,
    supply_apy DOUBLE PRECISION NOT NULL DEFAULT 0,
    borrow_apr DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_ctoken NUMERIC(30,0) NOT NULL DEFAULT 0,
    ctoken_policy_id VARCHAR(64) NOT NULL DEFAULT '',
    ctoken_asset_name VARCHAR(128) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS surf_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    principal NUMERIC(30,0) NOT NULL DEFAULT 0,
    principal_policy_id VARCHAR(64) NOT NULL DEFAULT '',
    principal_asset_name VARCHAR(128) NOT NULL DEFAULT '',
    collateral NUMERIC(30,0) NOT NULL DEFAULT 0,
    collateral_policy_id VARCHAR(64) NOT NULL DEFAULT '',
    collateral_asset_name VARCHAR(128) NOT NULL DEFAULT '',
    interest_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    start_time TIMESTAMPTZ,
    ltv DOUBLE PRECISION NOT NULL DEFAULT 0,
    borrow_tx_hash VARCHAR(64) NOT NULL DEFAULT '',
    borrow_output_index INT NOT NULL DEFAULT 0,
    out_tx_hash VARCHAR(64) NOT NULL DEFAULT '',
    out_output_index INT NOT NULL DEFAULT 0,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(pool_id, borrow_tx_hash, borrow_output_index)
);

CREATE TABLE IF NOT EXISTS surf_position_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES surf_positions(id) ON DELETE CASCADE,
    principal NUMERIC(30,0) NOT NULL DEFAULT 0,
    collateral NUMERIC(30,0) NOT NULL DEFAULT 0,
    interest_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    ltv DOUBLE PRECISION NOT NULL DEFAULT 0,
    accrued_interest DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_owed NUMERIC(30,0) NOT NULL DEFAULT 0,
    principal_price_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    collateral_price_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    net_value_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS surf_wallet_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address VARCHAR(255) NOT NULL,
    policy_id VARCHAR(64) NOT NULL DEFAULT '',
    asset_name VARCHAR(128) NOT NULL DEFAULT '',
    balance NUMERIC(30,0) NOT NULL DEFAULT 0,
    price_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    value_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surf_positions_address ON surf_positions(address);
CREATE INDEX IF NOT EXISTS idx_surf_positions_pool ON surf_positions(pool_id);
CREATE INDEX IF NOT EXISTS idx_surf_snapshots_position ON surf_position_snapshots(position_id);
CREATE INDEX IF NOT EXISTS idx_surf_snapshots_time ON surf_position_snapshots(snapshot_at);
CREATE INDEX IF NOT EXISTS idx_surf_wallet_address ON surf_wallet_snapshots(address);

-- SURF protocol snapshots (time-series aggregate data for graphs)
CREATE TABLE IF NOT EXISTS surf_protocol_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_pools INT NOT NULL DEFAULT 0,
    total_positions INT NOT NULL DEFAULT 0,
    positions_healthy INT NOT NULL DEFAULT 0,
    positions_at_risk INT NOT NULL DEFAULT 0,
    positions_liquidatable INT NOT NULL DEFAULT 0,
    total_supplied_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_borrowed_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_collateral_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_net_value_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_reserve_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_unpaid_interest_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_ltv DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_borrow_apr DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_supply_apy DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_volume_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    ltv_buckets JSONB,
    pool_breakdown JSONB,
    surf_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    surf_price_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    ada_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    fetch_duration_ms INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_surf_protocol_snapshots_time ON surf_protocol_snapshots(snapshot_at);

-- SURF pool snapshots (per-pool time-series data)
CREATE TABLE IF NOT EXISTS surf_pool_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id VARCHAR(100) NOT NULL,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ticker VARCHAR(20) NOT NULL DEFAULT '',
    policy_id VARCHAR(64) NOT NULL DEFAULT '',
    asset_name VARCHAR(128) NOT NULL DEFAULT '',
    decimals INT NOT NULL DEFAULT 0,
    price_ada DOUBLE PRECISION NOT NULL DEFAULT 0,
    price_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_supplied NUMERIC(30,0) NOT NULL DEFAULT 0,
    total_borrowed NUMERIC(30,0) NOT NULL DEFAULT 0,
    reserve NUMERIC(30,0) NOT NULL DEFAULT 0,
    total_supplied_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_borrowed_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    reserve_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    supply_apy DOUBLE PRECISION NOT NULL DEFAULT 0,
    borrow_apr DOUBLE PRECISION NOT NULL DEFAULT 0,
    utilization_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_ctoken NUMERIC(30,0) NOT NULL DEFAULT 0,
    total_unpaid_interest NUMERIC(30,0) NOT NULL DEFAULT 0,
    total_unpaid_interest_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_ltv DOUBLE PRECISION NOT NULL DEFAULT 0,
    liq_threshold_ltv DOUBLE PRECISION NOT NULL DEFAULT 0,
    recommended_ltv DOUBLE PRECISION NOT NULL DEFAULT 0,
    positions_in_pool INT NOT NULL DEFAULT 0,
    total_volume_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    historical_apy DOUBLE PRECISION NOT NULL DEFAULT 0,
    collateral_assets JSONB
);

CREATE INDEX IF NOT EXISTS idx_surf_pool_snapshots_pool_time ON surf_pool_snapshots(pool_id, snapshot_at);

-- Surf activities (aggregated on-chain events, deduplicated by tx_hash)
CREATE TABLE IF NOT EXISTS surf_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL DEFAULT '',
    amount NUMERIC(40,0) NOT NULL DEFAULT 0,
    asset VARCHAR(128) NOT NULL DEFAULT '',
    collateral_amount NUMERIC(40,0) NOT NULL DEFAULT 0,
    collateral_asset VARCHAR(128) NOT NULL DEFAULT '',
    pool_id VARCHAR(100) NOT NULL DEFAULT '',
    tx_hash VARCHAR(128) NOT NULL,
    activity_time BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_surf_activities_tx ON surf_activities(tx_hash);
CREATE INDEX IF NOT EXISTS idx_surf_activities_time ON surf_activities(activity_time DESC);
CREATE INDEX IF NOT EXISTS idx_surf_activities_type ON surf_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_surf_activities_address ON surf_activities(address);

-- Cleanup (optional, run manually):
-- DELETE FROM surf_protocol_snapshots WHERE snapshot_at < NOW() - INTERVAL '90 days';
-- DELETE FROM surf_pool_snapshots WHERE snapshot_at < NOW() - INTERVAL '90 days';
-- DELETE FROM surf_position_snapshots WHERE snapshot_at < NOW() - INTERVAL '90 days';
