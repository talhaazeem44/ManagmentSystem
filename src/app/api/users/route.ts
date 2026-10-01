import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// This GET handler takes no request-specific input, which Next.js would otherwise treat as
// static and cache — serving a stale value to some clients even after the DB changes.
export const dynamic = 'force-dynamic';

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
        return null;
    }
    return session;
}

export async function GET() {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    try {
        await dbConnect();
        const users = await User.find().select('-password').sort({ createdAt: 1 }).lean();
        return NextResponse.json(users);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch users', error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // Bootstrapping the very first admin account (before anyone can be logged in yet) still
    // goes through /api/setup, which self-guards by only working while the User collection is
    // empty. Every other account creation from here on requires an already-logged-in admin —
    // this endpoint used to have no auth check at all, so anyone who found the URL could create
    // their own admin login.
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    try {
        await dbConnect();
        const { email, password, name, role, permissions } = await request.json();

        if (!email || !password || !name) {
            return NextResponse.json({ message: 'Name, email, and password are required' }, { status: 400 });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            password: hashedPassword,
            name,
            role: role || 'user',
            permissions: role === 'user' && Array.isArray(permissions) ? permissions : undefined,
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
