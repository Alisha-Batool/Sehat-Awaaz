const db = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');

async function test() {
  const id = uuidv4();
  console.log('insert', id);
  await db.query(
    'INSERT INTO sessions (id, user_id, language, status) VALUES ($1, $2, $3, $4)',
    [id, null, 'ur-roman', 'active']
  );
  const delay = parseInt(process.argv[2] || '30', 10);
  console.log('waiting', delay, 's...');
  await new Promise((r) => setTimeout(r, delay * 1000));
  console.log('update');
  await db.query('UPDATE sessions SET symptom_profile = $1 WHERE id = $2', [
    '{}',
    id,
  ]);
  console.log('done');
  await db.pool.end();
}

test().catch((e) => {
  console.error('ERROR:', e.message);
  db.pool.end();
});
