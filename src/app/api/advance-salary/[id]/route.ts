import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { AdvanceSalary } from '@/models';

// PATCH /api/advance-salary/[id] — mark as recovered, or update fields
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    await dbConnect();
    const body = await req.json();
    const update: Record<string, any> = {};

    if (body.recovered === true) {
        update.recovered = true;
        update.recoveredAt = body.recoveredAt ? new Date(body.recoveredAt) : new Date();
        if (body.recoveredNote) update.recoveredNote = body.recoveredNote;
    } else if (body.recovered === false) {
        update.recovered = false;
        update.recoveredAt = undefined;
        update.recoveredNote = undefined;
    }

    const record = await AdvanceSalary.findByIdAndUpdate(params.id, { $set: update }, { new: true });
    if (!record) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(record);
}

// DELETE /api/advance-salary/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    await dbConnect();
    const record = await AdvanceSalary.findByIdAndDelete(params.id);
    if (!record) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
}
