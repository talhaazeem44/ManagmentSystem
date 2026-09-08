// node scripts/set-admin.mjs <email> <password> [name]
// User mojood ho to password reset + role=admin; warna naya admin bana deta hai.
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const [email, password, name] = process.argv.slice(2);
if (!email || !password) {
    console.error('usage: node scripts/set-admin.mjs <email> <password> [name]');
    process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const users = mongoose.connection.db.collection('users');
const hash = await bcrypt.hash(password, 10);
const existing = await users.findOne({ email });

if (existing) {
    await users.updateOne({ email }, { $set: { password: hash, role: 'admin' } });
    console.log(`updated: ${email} → role=admin, password reset`);
} else {
    await users.insertOne({
        email,
        password: hash,
        name: name || 'Admin',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    console.log(`created: ${email} → role=admin`);
}
await mongoose.disconnect();
