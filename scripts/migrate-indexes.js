/*
  Migration: Fix Employee indexes to support multi-company users

  - Drops legacy unique indexes on userId and email (if present)
  - Creates compound unique indexes: { userId, companyId } and { email, companyId }
*/

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection;
  const col = db.collection('employees');

  try {
    const indexes = await col.indexes();
    const names = indexes.map(i => i.name);
    console.log('Current employee indexes:', names);

    // Drop legacy single-field unique indexes if they exist
    const toDrop = ['userId_1', 'email_1'];
    for (const name of toDrop) {
      if (names.includes(name)) {
        console.log(`Dropping index: ${name}`);
        try {
          await col.dropIndex(name);
        } catch (e) {
          console.warn(`Could not drop index ${name}:`, e.message);
        }
      }
    }

    // Check for duplicates that would block unique index creation
    console.log('Checking for duplicates on { userId, companyId } ...');
    const dupUserCompany = await col.aggregate([
      { $group: { _id: { userId: '$userId', companyId: '$companyId' }, count: { $sum: 1 }, docs: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 10 }
    ]).toArray();

    if (dupUserCompany.length > 0) {
      console.error('Duplicate rows for (userId, companyId) found. You must resolve these before creating a unique index. Sample:', dupUserCompany);
      process.exit(2);
    }

    console.log('Checking for duplicates on { email, companyId } ...');
    const dupEmailCompany = await col.aggregate([
      { $group: { _id: { email: '$email', companyId: '$companyId' }, count: { $sum: 1 }, docs: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 10 }
    ]).toArray();

    if (dupEmailCompany.length > 0) {
      console.error('Duplicate rows for (email, companyId) found. You must resolve these before creating a unique index. Sample:', dupEmailCompany);
      process.exit(2);
    }

    // Helper to ensure unique index by keys, reusing existing if present
    async function ensureUniqueIndex(keys, desiredName) {
      const existing = indexes.find(ix => {
        const k = ix.key || {};
        const keysJson = JSON.stringify(keys);
        const kJson = JSON.stringify(k);
        return keysJson === kJson;
      });

      if (existing) {
        console.log(`Found existing index for ${JSON.stringify(keys)}: ${existing.name}, unique=${!!existing.unique}`);
        if (!existing.unique) {
          console.log(`Dropping non-unique index ${existing.name} to recreate as unique`);
          await col.dropIndex(existing.name);
        } else {
          // Already unique, nothing to do
          return;
        }
      }

      console.log(`Creating unique index ${desiredName} on ${JSON.stringify(keys)}`);
      await col.createIndex(keys, { unique: true, name: desiredName });
    }

    console.log('Ensuring compound unique indexes...');
    await ensureUniqueIndex({ userId: 1, companyId: 1 }, 'user_company_unique');
    await ensureUniqueIndex({ email: 1, companyId: 1 }, 'email_company_unique');

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();


