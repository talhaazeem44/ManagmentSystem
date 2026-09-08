// node scripts/list-users.mjs  — DB ke saare users (role/email/name) dikhata hai
import 'dotenv/config';
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const rows = await mongoose.connection.db
    .collection('users')
    .find({}, { projection: { email: 1, name: 1, role: 1 } })
    .toArray();
if (!rows.length) console.log('(koi user nahi — scripts/set-admin.mjs se banayen)');
for (const r of rows) console.log(`${r.role || '-'}\t${r.email}\t${r.name || ''}`);
await mongoose.disconnect();
