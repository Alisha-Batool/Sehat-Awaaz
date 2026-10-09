const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const p = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'sehat_awaaz',
  user: 'sehat_admin',
  password: 'sehat_dev_password',
  max: 10,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false,
});

async function test() {
  const id = uuidv4();
  console.log('insert', id);
  await p.query(
    'INSERT INTO sessions (id, user_id, language, status) VALUES ($1, $2, $3, $4)',
    [id, null, 'ur-roman', 'active']
  );
  console.log('waiting 5s...');
  await new Promise((r) => setTimeout(r, 5000));
  console.log('update');
  await p.query('UPDATE sessions SET symptom_profile = $1 WHERE id = $2', [
    '{}',
    id,
  ]);
  console.log('done');
  await p.end();
}

test().catch((e) => {
  console.error(e.message);
  p.end();
});
