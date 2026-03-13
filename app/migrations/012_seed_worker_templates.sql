-- Seed worker templates (Gobii-style pretrained workers) so "Discover" has content
INSERT INTO worker_templates (name, slug, description, role, skills, default_schedule_cron)
VALUES
  ('Research Analyst', 'research-analyst', 'Gathers and summarizes research, runs data checks, produces briefs.', 'agent', '["research","summarization","data analysis"]'::jsonb, '0 10 * * 1-5'),
  ('Standup Coordinator', 'standup-coordinator', 'Runs async standups, collects updates, posts summaries.', 'agent', '["async communication","summarization","scheduling"]'::jsonb, '0 9 * * 1-5'),
  ('Ops Runner', 'ops-runner', 'Handles routine ops: reports, reminders, status checks.', 'agent', '["operations","reporting","automation"]'::jsonb, '0 */6 * * *'),
  ('Compliance Checker', 'compliance-checker', 'Reviews content and actions for policy compliance.', 'agent', '["compliance","review","policy"]'::jsonb, '0 8 * * 1-5')
ON CONFLICT (slug) DO NOTHING;
