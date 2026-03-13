-- OpenLoop seed: active Loops + transactions so Directory and Activity show data
-- Run after schema: psql $DATABASE_URL -f app/db/seed.sql

-- Insert humans (for claimed Loops)
INSERT INTO humans (id, email) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'marcus@example.com'),
  ('a0000001-0000-4000-8000-000000000002', 'alex@example.com'),
  ('a0000001-0000-4000-8000-000000000003', 'sam@example.com'),
  ('a0000001-0000-4000-8000-000000000004', 'jordan@example.com'),
  ('a0000001-0000-4000-8000-000000000005', 'casey@example.com'),
  ('a0000001-0000-4000-8000-000000000006', 'riley@example.com'),
  ('a0000001-0000-4000-8000-000000000007', 'taylor@example.com'),
  ('a0000001-0000-4000-8000-000000000008', 'quinn@example.com')
ON CONFLICT (email) DO NOTHING;

-- Active Loops (claimed, with loop_tag) — these show in Directory
INSERT INTO loops (id, human_id, loop_tag, email, status, role, trust_score, sandbox_balance_cents, claimed_at, updated_at) VALUES
  ('b0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001', 'Marcus', 'marcus@example.com', 'active', 'buyer', 87, 95000, now() - interval '2 days', now()),
  ('b0000001-0000-4000-8000-000000000002', 'a0000001-0000-4000-8000-000000000002', 'Alex', 'alex@example.com', 'active', 'both', 92, 88000, now() - interval '5 days', now()),
  ('b0000001-0000-4000-8000-000000000003', 'a0000001-0000-4000-8000-000000000003', 'Sam', 'sam@example.com', 'active', 'seller', 78, 92000, now() - interval '1 day', now()),
  ('b0000001-0000-4000-8000-000000000004', 'a0000001-0000-4000-8000-000000000004', 'Jordan', 'jordan@example.com', 'active', 'buyer', 94, 76000, now() - interval '7 days', now()),
  ('b0000001-0000-4000-8000-000000000005', 'a0000001-0000-4000-8000-000000000005', 'Casey', 'casey@example.com', 'active', 'seller', 81, 91000, now() - interval '3 days', now()),
  ('b0000001-0000-4000-8000-000000000006', 'a0000001-0000-4000-8000-000000000006', 'Riley', 'riley@example.com', 'active', 'both', 89, 84000, now() - interval '4 days', now()),
  ('b0000001-0000-4000-8000-000000000007', 'a0000001-0000-4000-8000-000000000007', 'Taylor', 'taylor@example.com', 'active', 'buyer', 75, 98000, now() - interval '6 days', now()),
  ('b0000001-0000-4000-8000-000000000008', 'a0000001-0000-4000-8000-000000000008', 'Quinn', 'quinn@example.com', 'active', 'seller', 96, 72000, now() - interval '1 day', now())
ON CONFLICT (id) DO NOTHING;

-- Unclaimed Loops (for claim flow, with skills)
INSERT INTO loops (id, loop_tag, status, role, trust_score, sandbox_balance_cents, skills) VALUES
  ('c0000001-0000-4000-8000-000000000001', NULL, 'unclaimed', 'buyer', 72, 100000, '["bill_negotiation"]'),
  ('c0000001-0000-4000-8000-000000000002', NULL, 'unclaimed', 'seller', 85, 100000, '["scheduling"]'),
  ('c0000001-0000-4000-8000-000000000003', NULL, 'unclaimed', 'buyer', 68, 100000, '["bill_negotiation","scheduling"]')
ON CONFLICT (id) DO NOTHING;

-- Transactions (completed) — these show in Activity feed and stats
INSERT INTO transactions (buyer_loop_id, seller_loop_id, amount_cents, currency, kind, status, completed_at, created_at) VALUES
  ('b0000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000003', 4750, 'USD', 'sandbox', 'completed', now() - interval '2 min', now() - interval '2 min'),
  ('b0000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000005', 3200, 'USD', 'sandbox', 'completed', now() - interval '5 min', now() - interval '5 min'),
  ('b0000001-0000-4000-8000-000000000004', 'b0000001-0000-4000-8000-000000000008', 8100, 'USD', 'sandbox', 'completed', now() - interval '8 min', now() - interval '8 min'),
  ('b0000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000005', 1890, 'USD', 'sandbox', 'completed', now() - interval '12 min', now() - interval '12 min'),
  ('b0000001-0000-4000-8000-000000000006', 'b0000001-0000-4000-8000-000000000003', 5600, 'USD', 'sandbox', 'completed', now() - interval '15 min', now() - interval '15 min'),
  ('b0000001-0000-4000-8000-000000000007', 'b0000001-0000-4000-8000-000000000008', 4200, 'USD', 'sandbox', 'completed', now() - interval '18 min', now() - interval '18 min'),
  ('b0000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000003', 2900, 'USD', 'sandbox', 'completed', now() - interval '22 min', now() - interval '22 min'),
  ('b0000001-0000-4000-8000-000000000004', 'b0000001-0000-4000-8000-000000000005', 6700, 'USD', 'sandbox', 'completed', now() - interval '25 min', now() - interval '25 min'),
  ('b0000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000008', 3400, 'USD', 'sandbox', 'completed', now() - interval '30 min', now() - interval '30 min'),
  ('b0000001-0000-4000-8000-000000000006', 'b0000001-0000-4000-8000-000000000005', 5100, 'USD', 'sandbox', 'completed', now() - interval '35 min', now() - interval '35 min'),
  ('b0000001-0000-4000-8000-000000000007', 'b0000001-0000-4000-8000-000000000003', 2300, 'USD', 'sandbox', 'completed', now() - interval '40 min', now() - interval '40 min'),
  ('b0000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000008', 7800, 'USD', 'sandbox', 'completed', now() - interval '45 min', now() - interval '45 min'),
  ('b0000001-0000-4000-8000-000000000004', 'b0000001-0000-4000-8000-000000000003', 4100, 'USD', 'sandbox', 'completed', now() - interval '50 min', now() - interval '50 min'),
  ('b0000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000005', 6200, 'USD', 'sandbox', 'completed', now() - interval '55 min', now() - interval '55 min'),
  ('b0000001-0000-4000-8000-000000000006', 'b0000001-0000-4000-8000-000000000008', 3900, 'USD', 'sandbox', 'completed', now() - interval '1 hour', now() - interval '1 hour'),
  ('b0000001-0000-4000-8000-000000000007', 'b0000001-0000-4000-8000-000000000005', 5400, 'USD', 'sandbox', 'completed', now() - interval '1 hour 10 min', now() - interval '1 hour 10 min'),
  ('b0000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000003', 2100, 'USD', 'sandbox', 'completed', now() - interval '1 hour 20 min', now() - interval '1 hour 20 min'),
  ('b0000001-0000-4000-8000-000000000004', 'b0000001-0000-4000-8000-000000000008', 8900, 'USD', 'sandbox', 'completed', now() - interval '1 hour 30 min', now() - interval '1 hour 30 min'),
  ('b0000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000003', 1500, 'USD', 'sandbox', 'completed', now() - interval '1 hour 45 min', now() - interval '1 hour 45 min'),
  ('b0000001-0000-4000-8000-000000000006', 'b0000001-0000-4000-8000-000000000005', 7200, 'USD', 'sandbox', 'completed', now() - interval '2 hours', now() - interval '2 hours');
