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

-- SURF protocol snapshots (time-series aggregate data for graphs)
CREATE TABLE IF NOT EXISTS surf_protocol_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_pools INT NOT NULL DEFAULT 0,
    total_positions INT NOT NULL DEFAULT 0,
    positions_healthy INT NOT NULL DEFAULT 0,
    positions_at_risk INT NOT NULL DEFAULT 0,
    positions_liquidatable INT NOT NULL DEFAULT 0,
    healthy_value_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    at_risk_value_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    liquidatable_value_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
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

-- Add health value columns (if table already exists from previous migration)
ALTER TABLE surf_protocol_snapshots ADD COLUMN IF NOT EXISTS healthy_value_usd DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE surf_protocol_snapshots ADD COLUMN IF NOT EXISTS at_risk_value_usd DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE surf_protocol_snapshots ADD COLUMN IF NOT EXISTS liquidatable_value_usd DOUBLE PRECISION NOT NULL DEFAULT 0;

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

-- Activities table (aggregated from on-chain data, deduplicated by tx_hash)
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

-- Clean up old snapshots older than 90 days (keep detailed data for graphs)
-- Run manually or via a separate cleanup job:
-- DELETE FROM surf_protocol_snapshots WHERE snapshot_at < NOW() - INTERVAL '90 days';
-- DELETE FROM surf_pool_snapshots WHERE snapshot_at < NOW() - INTERVAL '90 days';
-- DELETE FROM surf_position_snapshots WHERE snapshot_at < NOW() - INTERVAL '90 days';
