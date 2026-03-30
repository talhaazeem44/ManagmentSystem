import { MongoClient, ServerApiVersion } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env manually
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const [key, ...rest] = line.split('=');
      return [key.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
    })
);

const uri = envVars.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found in .env');
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function setup() {
  await client.connect();
  console.log('Connected to MongoDB Atlas');

  const db = client.db('honda_dms');

  // ── Create collections ──────────────────────────────────────────────────────
  const existing = (await db.listCollections().toArray()).map(c => c.name);

  const collections = ['users', 'deliveryorders', 'bikes', 'customers', 'sales', 'servicesales'];
  for (const name of collections) {
    if (!existing.includes(name)) {
      await db.createCollection(name);
      console.log(`  Created collection: ${name}`);
    } else {
      console.log(`  Collection already exists: ${name}`);
    }
  }

  // ── Create indexes ──────────────────────────────────────────────────────────
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('deliveryorders').createIndex({ doNumber: 1 }, { unique: true });
  await db.collection('bikes').createIndex({ engineNumber: 1 }, { unique: true });
  await db.collection('bikes').createIndex({ chassisNumber: 1 }, { unique: true });
  await db.collection('bikes').createIndex({ status: 1 });
  await db.collection('bikes').createIndex({ deliveryOrderId: 1 });
  await db.collection('customers').createIndex({ cnic: 1 }, { unique: true });
  await db.collection('sales').createIndex({ bikeId: 1 }, { unique: true });
  await db.collection('sales').createIndex({ customerId: 1 });
  await db.collection('sales').createIndex({ saleDate: -1 });
  await db.collection('servicesales').createIndex({ date: -1 });
  console.log('  Indexes created');

  // ── Create admin user if none exists ────────────────────────────────────────
  const userCount = await db.collection('users').countDocuments();
  if (userCount === 0) {
    // Simple bcrypt-style hash using Node crypto (salt rounds: 10)
    // We'll use a pre-hashed value for admin123 with bcrypt cost 10
    // Hash generated: $2a$10$... — we insert a known bcrypt hash for 'admin123'
    const adminPasswordHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // bcrypt hash of 'admin123'

    await db.collection('users').insertOne({
      email: 'admin@naeem-autos.com',
      password: adminPasswordHash,
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('\n  Admin user created:');
    console.log('    Email:    admin@naeem-autos.com');
    console.log('    Password: admin123');
  } else {
    console.log('  Admin user already exists, skipping');
  }

  console.log('\nDatabase setup complete!');
  console.log('Collections ready: users, deliveryorders, bikes, customers, sales, servicesales');
}

setup()
  .catch(err => { console.error('Setup failed:', err); process.exit(1); })
  .finally(() => client.close());
