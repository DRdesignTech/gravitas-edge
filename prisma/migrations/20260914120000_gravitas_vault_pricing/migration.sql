-- =============================================================================
-- Gravitas Edge: Vault-Based Pricing Catalog (data migration)
--
-- Idempotent, safe, non-destructive. Re-runnable (guarded upserts).
--
-- WHAT THIS DOES
--   * Renames/creates the 6 canonical business vaults
--       Remote Access Vault, UAE & Global Access Vault, Executive Access Vault,
--       Leadership Access Vault, Management Access Vault, Early Career Access Vault
--   * Creates/updates the 18 purchasable plans (6 vaults x 3 durations) using
--     deterministic plan ids and unique plan names:
--       "{Vault} · Monthly"    (30 days)
--       "{Vault} · 3 Months"   (90 days)
--       "{Vault} · 6 Months"   (180 days)
--   * Links every catalog plan to exactly one vault via "PlanVault"
--   * Archives (soft, never deletes) the legacy plans
--       India Access Plan, Global Access Plan, All Access Plan
--     and any legacy vaults (India Career, India Professional, ...)
--
-- WHAT THIS DOES NOT DO
--   * Never deletes subscriptions, payments, user vault access snapshots or
--     the vaults/plans they reference (soft archive only, FK-safe).
--   * Does not modify the schema.
-- =============================================================================

DO $$
DECLARE
  v_name text[];
  v_desc text[];
  v_type text[];
  v_sort int[];
  offer_label text[] := ARRAY['Monthly', '3 Months', '6 Months'];
  offer_dur  int[] := ARRAY[30, 90, 180];
  price_val text[] := ARRAY[
    -- Remote Access
    '1499','4999','10299',
    -- UAE & Global Access
    '1999','5999','11999',
    -- Executive Access
    '2499','7499','15499',
    -- Leadership Access
    '999','3499','6999',
    -- Management Access
    '599','1949','3699',
    -- Early Career Access
    '299','999','2199'
  ];
  i int;
  o int;
  idx int;
  v_id text;
  p_id text;
  link_id text;
  p_name text;
BEGIN
  v_name := ARRAY[
    'Remote Access Vault',
    'UAE & Global Access Vault',
    'Executive Access Vault',
    'Leadership Access Vault',
    'Management Access Vault',
    'Early Career Access Vault'
  ];
  v_desc := ARRAY[
    'Curated remote and cross-border roles from international companies.',
    'Premium opportunities across the UAE, GCC and global markets.',
    'Executive search and C-suite opportunities.',
    'Senior leadership and management roles.',
    'Mid-level and management track opportunities.',
    'Foundational roles for early-career professionals.'
  ];
  v_type := ARRAY['INTERNATIONAL', 'MIDDLE_EAST', 'INDIA', 'INDIA', 'INDIA', 'INDIA'];
  v_sort := ARRAY[1, 2, 3, 4, 5, 6];

  FOR i IN 1..6 LOOP
    v_id := '11111111-1111-4111-8111-11111111' || lpad(i::text, 3, '0') || '1';

    -- Rename the legacy/aliased vault to its canonical name (only when the
    -- canonical name is not already taken, to stay unique-name safe). The
    -- LOWER(BTRIM(...)) match absorbs production names that carry a trailing
    -- space (e.g. "Executive Access ").
    IF i = 1 THEN
      UPDATE "Vault"
      SET name = v_name[1], description = v_desc[1], status = 'ACTIVE',
          type = v_type[1]::"VaultType", "sortOrder" = v_sort[1], "deletedAt" = NULL, "updatedAt" = now()
      WHERE LOWER(BTRIM(name)) = 'remote access'
        AND name IS DISTINCT FROM v_name[1]
        AND NOT EXISTS (SELECT 1 FROM "Vault" WHERE name = v_name[1]);
    ELSIF i = 2 THEN
      UPDATE "Vault"
      SET name = v_name[2], description = v_desc[2], status = 'ACTIVE',
          type = v_type[2]::"VaultType", "sortOrder" = v_sort[2], "deletedAt" = NULL, "updatedAt" = now()
      WHERE LOWER(BTRIM(name)) IN ('uae & gcc access', 'uae & global access')
        AND name IS DISTINCT FROM v_name[2]
        AND NOT EXISTS (SELECT 1 FROM "Vault" WHERE name = v_name[2]);
    ELSIF i = 3 THEN
      UPDATE "Vault"
      SET name = v_name[3], description = v_desc[3], status = 'ACTIVE',
          type = v_type[3]::"VaultType", "sortOrder" = v_sort[3], "deletedAt" = NULL, "updatedAt" = now()
      WHERE LOWER(BTRIM(name)) = 'executive access'
        AND name IS DISTINCT FROM v_name[3]
        AND NOT EXISTS (SELECT 1 FROM "Vault" WHERE name = v_name[3]);
    ELSIF i = 4 THEN
      UPDATE "Vault"
      SET name = v_name[4], description = v_desc[4], status = 'ACTIVE',
          type = v_type[4]::"VaultType", "sortOrder" = v_sort[4], "deletedAt" = NULL, "updatedAt" = now()
      WHERE LOWER(BTRIM(name)) = 'leadership access'
        AND name IS DISTINCT FROM v_name[4]
        AND NOT EXISTS (SELECT 1 FROM "Vault" WHERE name = v_name[4]);
    ELSIF i = 5 THEN
      UPDATE "Vault"
      SET name = v_name[5], description = v_desc[5], status = 'ACTIVE',
          type = v_type[5]::"VaultType", "sortOrder" = v_sort[5], "deletedAt" = NULL, "updatedAt" = now()
      WHERE LOWER(BTRIM(name)) = 'management access'
        AND name IS DISTINCT FROM v_name[5]
        AND NOT EXISTS (SELECT 1 FROM "Vault" WHERE name = v_name[5]);
    ELSIF i = 6 THEN
      UPDATE "Vault"
      SET name = v_name[6], description = v_desc[6], status = 'ACTIVE',
          type = v_type[6]::"VaultType", "sortOrder" = v_sort[6], "deletedAt" = NULL, "updatedAt" = now()
      WHERE LOWER(BTRIM(name)) = 'early career access'
        AND name IS DISTINCT FROM v_name[6]
        AND NOT EXISTS (SELECT 1 FROM "Vault" WHERE name = v_name[6]);
    END IF;

    -- Upsert the canonical vault (deterministic id; updates any existing row).
    INSERT INTO "Vault" (id, name, description, status, type, "sortOrder", "createdAt", "updatedAt")
    VALUES (v_id, v_name[i], v_desc[i], 'ACTIVE', v_type[i]::"VaultType", v_sort[i], now(), now())
    ON CONFLICT (name) DO UPDATE SET
      description = EXCLUDED.description,
      status = 'ACTIVE',
      type = EXCLUDED.type,
      "sortOrder" = EXCLUDED."sortOrder",
      "deletedAt" = NULL,
      "updatedAt" = now();

    -- 3 duration offers per vault (18 plans total).
    FOR o IN 1..3 LOOP
      idx := (i - 1) * 3 + o;
      p_id := '22222222-2222-4222-8222-222222' || lpad(i::text, 3, '0') || lpad(o::text, 3, '0');
      p_name := v_name[i] || ' · ' || offer_label[o];

      INSERT INTO "SubscriptionPlan" (id, name, description, price, currency, "durationDays", "isActive", "createdAt", "updatedAt")
      VALUES (
        p_id,
        p_name,
        offer_label[o] || ' access to the ' || v_name[i] || '.',
        price_val[idx]::numeric,
        'INR',
        offer_dur[o],
        true,
        now(),
        now()
      )
      ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        currency = 'INR',
        "durationDays" = EXCLUDED."durationDays",
        "isActive" = true,
        "deletedAt" = NULL,
        "updatedAt" = now();

      -- Ensure exactly one plan-vault link (idempotent, uses row ids).
      link_id := '33333333-3333-4333-8333-333333' || lpad(i::text, 3, '0') || lpad(o::text, 3, '0');
      INSERT INTO "PlanVault" (id, "planId", "vaultId")
      SELECT link_id, pl.id, v.id
      FROM "SubscriptionPlan" pl
      JOIN "Vault" v ON v.name = v_name[i]
      WHERE pl.name = p_name
      ON CONFLICT ("planId", "vaultId") DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Archive (never delete) legacy plans that are not part of the new catalog.
-- ---------------------------------------------------------------------------
UPDATE "SubscriptionPlan"
SET "isActive" = false,
    "deletedAt" = now(),
    "updatedAt" = now()
WHERE name IN ('India Access Plan', 'Global Access Plan', 'All Access Plan')
  AND "deletedAt" IS NULL;

-- ---------------------------------------------------------------------------
-- Archive (never delete) legacy vaults that are not part of the new catalog.
-- "India Career" was already archived in production; this is a safety net for
-- other environments and leaves its FK references intact.
-- ---------------------------------------------------------------------------
UPDATE "Vault"
SET status = 'ARCHIVED',
    "deletedAt" = now(),
    "updatedAt" = now()
WHERE LOWER(BTRIM(name)) IN (
  'india career',
  'india professional',
  'india leadership',
  'india executive',
  'global access',
  'middle east opportunities',
  'international opportunities',
  'india access'
)
  AND "deletedAt" IS NULL;