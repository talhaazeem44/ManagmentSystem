const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/honda_dms';

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'admin' },
}, {
    timestamps: true
});

async function createUser() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.model('User', UserSchema);

        // Check if user already exists
        const existing = await User.findOne({ email: 'admin@naeem-autos.com' });
        if (existing) {
            console.log('✅ User already exists!');
            console.log('Email:', existing.email);
            console.log('Password: admin123');
            process.exit(0);
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const user = await User.create({
            email: 'admin@naeem-autos.com',
            password: hashedPassword,
            name: 'Admin User',
            role: 'admin'
        });

        console.log('✅ User created successfully!');
        console.log('Email:', user.email);
        console.log('Password: admin123');
        console.log('\nYou can now login at http://localhost:3000/login');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating user:', error);
        process.exit(1);
    }
}

createUser();
