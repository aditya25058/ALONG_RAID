-- ALONG Protocol: The Second Judge (Persistence Layer)
-- Schema of Truth & State Enforcement Guards

-- 1. EXTENSIONS & ENUMS
CREATE TYPE ride_status_enum AS ENUM (
  'IDLE',
  'SOLO_ACTIVE',
  'POOL_CANDIDATE',
  'CONSENT_PENDING',
  'POOLED_ACTIVE',
  'COMPLETED',
  'ABORTED'
);

-- 2. CORE TABLES
CREATE TABLE rides (
  ride_id UUID PRIMARY KEY,
  status ride_status_enum NOT NULL DEFAULT 'IDLE',
  city_id TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  route_hash TEXT NOT NULL,
  pricing_json JSONB NOT NULL,
  simulation_seed BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Resurrection Guard: Prevent resurrection of terminal states
  CONSTRAINT resurrection_guard CHECK (
    NOT (status IN ('COMPLETED', 'ABORTED')) -- This is handled more dynamically in triggers but good as a base
  )
);

CREATE TABLE ride_transitions (
  id BIGSERIAL PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(ride_id),
  from_status ride_status_enum,
  to_status ride_status_enum NOT NULL,
  command_id UUID NOT NULL,
  actor TEXT NOT NULL,
  txn_id BIGINT DEFAULT txid_current(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(ride_id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  txn_id BIGINT DEFAULT txid_current(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE processed_commands (
  command_id UUID PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(ride_id),
  command_hash TEXT NOT NULL, -- Prevents payload tampering on replay
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. THE IMMUTABLE STATE GRAPH
CREATE TABLE allowed_transitions (
  from_status ride_status_enum,
  to_status ride_status_enum,
  PRIMARY KEY (from_status, to_status)
);

-- Populate the directed graph of legal reality
INSERT INTO allowed_transitions (from_status, to_status) VALUES
  (NULL, 'IDLE'),
  ('IDLE', 'SOLO_ACTIVE'),
  ('SOLO_ACTIVE', 'POOL_CANDIDATE'),
  ('POOL_CANDIDATE', 'CONSENT_PENDING'),
  ('CONSENT_PENDING', 'POOLED_ACTIVE'),
  ('CONSENT_PENDING', 'ABORTED'),
  ('POOLED_ACTIVE', 'COMPLETED'),
  ('SOLO_ACTIVE', 'ABORTED'),
  ('POOL_CANDIDATE', 'ABORTED'),
  ('POOLED_ACTIVE', 'ABORTED');

-- REVOKE mutation rights to ensure laws, not configuration
-- Commented out for migration script but mandatory in production role setup:
-- REVOKE INSERT, UPDATE, DELETE ON allowed_transitions FROM app_role;

-- 4. THE TRIGGER GUARD (THE SECOND JUDGE)
CREATE OR REPLACE FUNCTION enforce_ride_transition()
RETURNS trigger AS $$
BEGIN
  -- A. Check if the transition is defined in our legal graph
  IF NOT EXISTS (
    SELECT 1 FROM allowed_transitions
    WHERE (from_status = OLD.status OR (OLD.status IS NULL AND from_status IS NULL))
      AND to_status = NEW.status
  ) THEN
    RAISE EXCEPTION 'Illegal ride transition: % -> %', COALESCE(OLD.status::text, 'NULL'), NEW.status::text;
  END IF;

  -- B. Resurrection Guard (Extra Layer)
  IF OLD.status IN ('COMPLETED', 'ABORTED') THEN
    RAISE EXCEPTION 'Terminal State Resurrection Guard: Cannot transition from %', OLD.status;
  END IF;

  -- C. Automatic Audit: Record the transition
  -- This assumes 'current_command_id' and 'current_actor' are set in the session or via a variable
  -- In this implementation, we will expect the backend to provide these details if possible,
  -- or we use a fallback for internal transitions.
  INSERT INTO ride_transitions (ride_id, from_status, to_status, command_id, actor)
  VALUES (NEW.ride_id, OLD.status, NEW.status, 
          COALESCE(current_setting('along.command_id', true)::UUID, '00000000-0000-0000-0000-000000000000'::UUID),
          COALESCE(current_setting('along.actor', true), 'SYSTEM'));

  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ride_status_enforcer
BEFORE UPDATE ON rides
FOR EACH ROW
EXECUTE FUNCTION enforce_ride_transition();

COMMENT ON TABLE allowed_transitions IS 'Immutable state graph. Do not modify at runtime.';
