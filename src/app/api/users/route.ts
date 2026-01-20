import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { email, password, name } = await request.json();

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { message: 'User already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            name,
            role: 'admin' // First user is admin
        });

        return NextResponse.json(
            { message: 'User created successfully', userId: user._id },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { message: 'Failed to create user', error: error.message },
            { status: 500 }
        );
    }
}
