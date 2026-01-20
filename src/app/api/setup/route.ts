import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        // Check if any users exist
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            return NextResponse.json(
                { message: 'Setup already completed. Users exist in the database.' },
                { status: 400 }
            );
        }

        // Create default admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const user = await User.create({
            email: 'admin@naeem-autos.com',
            password: hashedPassword,
            name: 'Admin User',
            role: 'admin'
        });

        return NextResponse.json({
            message: 'Setup completed successfully!',
            user: {
                email: user.email,
                name: user.name,
                role: user.role
            },
            credentials: {
                email: 'admin@naeem-autos.com',
                password: 'admin123'
            }
        }, { status: 201 });
    } catch (error: any) {
        console.error('Setup error:', error);

        if (error.message?.includes('connect')) {
            return NextResponse.json(
                {
                    message: 'Cannot connect to MongoDB. Please ensure MongoDB is running.',
                    error: 'Start MongoDB with: docker compose up -d',
                    details: error.message
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { message: 'Setup failed', error: error.message },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        await dbConnect();
        const userCount = await User.countDocuments();

        return NextResponse.json({
            setupComplete: userCount > 0,
            userCount,
            message: userCount > 0
                ? 'Setup is complete. You can login.'
                : 'Setup required. POST to this endpoint to create admin user.'
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                setupComplete: false,
                error: 'Cannot connect to MongoDB',
                message: 'Please start MongoDB with: docker compose up -d'
            },
            { status: 503 }
        );
    }
}
