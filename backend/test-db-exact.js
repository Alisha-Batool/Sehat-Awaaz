const db = require('./src/config/database');
const { v4: uuidv4 } = require('uuid');

async function test() {
  const sessionId = uuidv4();
  const text = 'pet dard hai';
  const language = 'ur-roman';
  const userId = null;

  console.log('insert', sessionId);
  await db.query(
    'INSERT INTO sessions (id, user_id, language, status) VALUES ($1, $2, $3, $4)',
    [sessionId, userId, language, 'active']
  );

  const delay = parseInt(process.argv[2] || '120', 10);
  console.log('waiting', delay, 's...');
  await new Promise((r) => setTimeout(r, delay * 1000));

  const symptomProfile = {
    symptoms: [text],
    symptom_keys: ['abdominal_pain'],
  };
  console.log('update');
  await db.query(
    'UPDATE sessions SET symptom_profile = $1, input_text = $2, updated_at = NOW() WHERE id = $3',
    [JSON.stringify(symptomProfile), text, sessionId]
  );
  console.log('done');
  await db.pool.end();
}

test().catch((e) => {
  console.error('ERROR:', e.message);
  db.pool.end();
});
