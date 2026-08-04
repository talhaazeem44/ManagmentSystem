import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { DeliveryOrder, Bike } from '@/models';

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const deliveryOrder = await DeliveryOrder.findById(id);
        if (!deliveryOrder) {
            return NextResponse.json({ message: 'Delivery order not found' }, { status: 404 });
        }

        const bikes = await Bike.find({ deliveryOrderId: id }).lean();
        const soldBikes = bikes.filter((b: any) => b.status === 'SOLD');
        if (soldBikes.length > 0) {
            return NextResponse.json(
                { message: `Cannot delete — ${soldBikes.length} bike(s) from this delivery order have already been sold. Delete those sales first.` },
                { status: 400 }
            );
        }

        await Bike.deleteMany({ deliveryOrderId: id });
        await DeliveryOrder.findByIdAndDelete(id);

        return NextResponse.json({ message: `Delivery order and ${bikes.length} bike(s) deleted successfully` });
    } catch (error: any) {
        console.error('Error deleting delivery order:', error);
        return NextResponse.json(
            { message: 'Failed to delete delivery order', error: error.message },
            { status: 500 }
        );
    }
}
