import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
        return null;
    }
    return session;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    try {
        await dbConnect();
        const { id } = await context.params;
        const { name, role, permissions, password } = await request.json();

        const set: any = {};
        if (name !== undefined) set.name = name;
        if (role !== undefined) set.role = role;
        // permissions only makes sense for role 'user' — clear it for admin/workshop so a role
        // change doesn't leave a stale, meaningless restriction sitting on the account.
        if (role === 'user' && Array.isArray(permissions)) {
            set.permissions = permissions;
        } else if (role !== undefined && role !== 'user') {
            set.permissions = undefined;
        }
        if (password) {
            set.password = await bcrypt.hash(password, 10);
        }

        const user = await User.findByIdAndUpdate(id, { $set: set }, { new: true }).select('-password');
        if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });
        return NextResponse.json(user);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to update user', error: error.message }, { status: 500 });
    }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    try {
        await dbConnect();
        const { id } = await context.params;

        // Never allow deleting your own logged-in account (avoids accidentally locking
        // yourself out), and never allow removing the last remaining admin.
        if ((session.user as any)?.id === id) {
            return NextResponse.json({ message: "You can't delete your own account while logged in as it" }, { status: 400 });
        }
        const target = await User.findById(id);
        if (!target) return NextResponse.json({ message: 'User not found' }, { status: 404 });
        if (target.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return NextResponse.json({ message: 'Cannot delete the last remaining admin account' }, { status: 400 });
            }
        }

        await User.findByIdAndDelete(id);
        return NextResponse.json({ message: 'User deleted' });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to delete user', error: error.message }, { status: 500 });
    }
}
