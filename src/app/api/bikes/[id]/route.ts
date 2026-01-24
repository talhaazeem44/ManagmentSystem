import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Bike, Sale } from '@/models';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        const bike = await Bike.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!bike) {
            return NextResponse.json(
                { message: 'Bike not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(bike);
    } catch (error: any) {
        console.error('Error updating bike:', error);
        return NextResponse.json(
            { message: 'Failed to update bike', error: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        // Check if bike is sold
        const bike = await Bike.findById(id);
        if (!bike) {
            return NextResponse.json(
                { message: 'Bike not found' },
                { status: 404 }
            );
        }

        if (bike.status === 'SOLD') {
            return NextResponse.json(
                { message: 'Cannot delete a sold bike. Delete the sale record first.' },
                { status: 400 }
            );
        }

        await Bike.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Bike deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting bike:', error);
        return NextResponse.json(
            { message: 'Failed to delete bike', error: error.message },
            { status: 500 }
        );
    }
}
