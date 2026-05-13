import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';

await db.execute(sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'super_admin'`);
await db.execute(sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
await db.execute(sql`CREATE TABLE IF NOT EXISTS user_business_access (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
)`);

const cols = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name='admin_users' ORDER BY column_name`);
console.log('columns query executed');
console.log(cols?.rows ?? cols);
process.exit(0);
