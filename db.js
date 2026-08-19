import pg from "pg";
const {Pool}=pg;
export const pool=new Pool({connectionString:process.env.DATABASE_URL});

export async function initDb(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS conversations(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT,
      is_group BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS conversation_members(
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      PRIMARY KEY(conversation_id,user_id)
    );
    CREATE TABLE IF NOT EXISTS messages(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id UUID,
      kind TEXT DEFAULT 'text',
      body TEXT,
      media_url TEXT,
      reply_to UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      read_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS media_assets(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      kind TEXT NOT NULL,
      provider TEXT,
      prompt TEXT,
      style TEXT,
      status TEXT DEFAULT 'queued',
      url TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
      ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_sender
      ON messages(sender_id);
  `);
}
