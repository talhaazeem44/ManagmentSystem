import { MongoClient, ServerApiVersion } from 'mongodb';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8');
const envVars = Object.fromEntries(
  envContent.split('\n').filter(l => l.includes('=')).map(l => {
    const [k, ...v] = l.split('=');
    return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')];
  })
);

const client = new MongoClient(envVars.MONGODB_URI, {
  serverApi: { version: ServerApiVersion.v1 }
});

async function run() {
  await client.connect();
  const db = client.db('honda_dms');

  // Clear all collections
  await db.collection('users').deleteMany({});
  await db.collection('deliveryorders').deleteMany({});
  await db.collection('bikes').deleteMany({});
  await db.collection('customers').deleteMany({});
  await db.collection('sales').deleteMany({});
  await db.collection('servicesales').deleteMany({});
  await db.collection('workshopstocks').deleteMany({});

  console.log('All collections cleared.');

  // Re-create admin user
  const hash = await bcrypt.hash('admin123', 10);
  await db.collection('users').insertOne({
    email: 'admin@naeem-autos.com',
    password: hash,
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('Database reset complete!');
  console.log('Login → Email: admin@naeem-autos.com | Password: admin123');
}

run().catch(console.error).finally(() => client.close());
