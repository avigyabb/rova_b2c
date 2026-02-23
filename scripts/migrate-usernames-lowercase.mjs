/**
 * Migration: add `username_lowercase` field to every user.
 *
 * Run with:
 *   node scripts/migrate-usernames-lowercase.mjs
 *
 * Safe to re-run — only writes to users that are missing the field or where
 * the stored value is out of sync with the current username.
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAHmo5zkdpph4xa-CgO2eWrwpq56tzC9hE",
  authDomain: "swing-b2c.firebaseapp.com",
  databaseURL: "https://swing-b2c-default-rtdb.firebaseio.com",
  projectId: "swing-b2c",
  storageBucket: "swing-b2c.appspot.com",
  messagingSenderId: "186422493109",
  appId: "1:186422493109:web:efb53f7ebd48aacbf2e3fc",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function main() {
  console.log('Fetching all users from Firebase...');
  const snapshot = await get(ref(db, 'users'));

  if (!snapshot.exists()) {
    console.log('No users found.');
    process.exit(0);
  }

  const users = snapshot.val();
  const entries = Object.entries(users);
  console.log(`Found ${entries.length} users.\n`);

  const toUpdate = [];
  const skipped = [];

  for (const [userId, data] of entries) {
    if (!data.username) {
      skipped.push(userId);
      continue;
    }
    const expected = data.username.toLowerCase();
    if (data.username_lowercase !== expected) {
      toUpdate.push({ userId, username: data.username, expected });
    }
  }

  if (skipped.length > 0) {
    console.warn(`⚠️  ${skipped.length} user(s) have no username field and will be skipped:`);
    skipped.forEach(id => console.warn(`   ${id}`));
    console.warn('');
  }

  if (toUpdate.length === 0) {
    console.log('✅  All users already have an up-to-date username_lowercase field.');
    process.exit(0);
  }

  console.log(`${toUpdate.length} user(s) to update:\n`);
  toUpdate.forEach(({ username, expected }) =>
    console.log(`   "${username}"  →  username_lowercase: "${expected}"`)
  );

  const updates = {};
  for (const { userId, expected } of toUpdate) {
    updates[`users/${userId}/username_lowercase`] = expected;
  }

  console.log('\nApplying update...');
  await update(ref(db), updates);
  console.log(`\n✅  Done — username_lowercase set for ${toUpdate.length} user(s).`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
