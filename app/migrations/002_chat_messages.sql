-- Chat history per Loop (for /api/chat context)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id),
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_chat_messages_loop_id ON chat_messages(loop_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(loop_id, created_at DESC);
