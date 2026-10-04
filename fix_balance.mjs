import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const latest = await db.collection('workshopcashbalances').find().sort({ asOfDate: -1 }).limit(1).toArray();
console.log('Current latest opening balance:', JSON.stringify(latest[0]));

const record = {
  cashAmount: latest[0].cashAmount, // unchanged — user only confirmed the bank figure
  bankAmount: 6450,
  asOfDate: new Date(),
  note: 'Corrected to include Rs. 6,450 bank credit payment received this morning before the balance was set',
  createdAt: new Date(),
  updatedAt: new Date(),
};
console.log('\nWill insert:', JSON.stringify(record));
