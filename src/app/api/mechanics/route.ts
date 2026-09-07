import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Mechanic } from '@/models';

export async function GET() {
    await dbConnect();
    const mechanics = await Mechanic.find({ active: true }).sort({ name: 1 }).lean();
    return NextResponse.json(mechanics);
}

export async function POST(req: NextRequest) {
    await dbConnect();
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ message: 'Name is required' }, { status: 400 });

    const existing = await Mechanic.findOne({ name: name.trim() });
    if (existing) return NextResponse.json({ message: 'Mechanic already exists' }, { status: 409 });

    const mechanic = await Mechanic.create({ name: name.trim(), active: true });
    return NextResponse.json(mechanic, { status: 201 });
}

export async function DELETE(req: NextRequest) {
    await dbConnect();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 });
    await Mechanic.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
}
