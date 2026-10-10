const mongoose = require('mongoose');
const config = require('../config');

async function ensureSparsePhoneIndex(users) {
  const indexes = await users.indexes();
  const phoneIndexes = indexes.filter(
    (index) => index.key?.phone === 1 && Object.keys(index.key).length === 1
  );
  if (phoneIndexes.some((index) => index.unique && index.sparse)) return;

  const original = phoneIndexes.find((index) => index.unique);
  for (const index of phoneIndexes) {
    await users.dropIndex(index.name);
  }

  try {
    await users.createIndex(
      { phone: 1 },
      { unique: true, sparse: true, name: 'phone_1' }
    );
  } catch (error) {
    if (original) {
      await users.createIndex(
        { phone: 1 },
        { unique: true, name: original.name }
      ).catch(() => {});
    }
    throw error;
  }
}

async function migrateUserAuthIndexes() {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const users = mongoose.connection.collection('users');

  // These index changes preserve every user document; only index definitions change.
  await users.createIndex(
    { email: 1 },
    { unique: true, sparse: true, name: 'email_1' }
  );
  await ensureSparsePhoneIndex(users);
}

migrateUserAuthIndexes()
  .then(async () => {
    console.log('MongoDB user authentication indexes are ready.');
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error('Could not update MongoDB user authentication indexes:', error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
