import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const record = {
  cashAmount: 14850,
  bankAmount: 0,
  asOfDate: new Date(),
  note: 'Real cash count',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const result = await db.collection('workshopcashbalances').insertOne(record);
console.log('Inserted:', JSON.stringify({ ...record, _id: result.insertedId.toString() }));

await mongoose.disconnect();
process.exit(0);
