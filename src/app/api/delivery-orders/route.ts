import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { DeliveryOrder, Bike } from '@/models';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const body = await request.json();
        const { doNumber, date, dealerName, dealerAddress, bikes } = body;

        // Validate required fields
        if (!doNumber || !date || !dealerName || !dealerAddress || !bikes || bikes.length === 0) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Catch duplicate/blank engine or chassis numbers within this same batch before touching the DB,
        // so a bad row in a large upload gives a precise message instead of an opaque bulk-write failure.
        const seenEngine = new Map<string, number>();
        const seenChassis = new Map<string, number>();
        const batchIssues: string[] = [];
        bikes.forEach((bike: any, i: number) => {
            const rowNum = i + 1;
            const engine = (bike.engineNumber || '').trim();
            const chassis = (bike.chassisNumber || '').trim();
            if (!engine) batchIssues.push(`Row ${rowNum}: engine number is blank`);
            if (!chassis) batchIssues.push(`Row ${rowNum}: chassis number is blank`);
            if (engine) {
                if (seenEngine.has(engine)) batchIssues.push(`Row ${rowNum}: engine number "${engine}" is duplicated (also row ${seenEngine.get(engine)})`);
                else seenEngine.set(engine, rowNum);
            }
            if (chassis) {
                if (seenChassis.has(chassis)) batchIssues.push(`Row ${rowNum}: chassis number "${chassis}" is duplicated (also row ${seenChassis.get(chassis)})`);
                else seenChassis.set(chassis, rowNum);
            }
        });
        if (batchIssues.length > 0) {
            return NextResponse.json(
                { message: `Fix these rows before submitting: ${batchIssues.slice(0, 8).join('; ')}${batchIssues.length > 8 ? ` (+${batchIssues.length - 8} more)` : ''}` },
                { status: 400 }
            );
        }

        // Check against bikes already in the database too (e.g. re-uploading a DO, or an engine/chassis
        // number reused from stock received earlier).
        const existingBikes = await Bike.find({
            $or: [
                { engineNumber: { $in: Array.from(seenEngine.keys()) } },
                { chassisNumber: { $in: Array.from(seenChassis.keys()) } },
            ],
        }).select('engineNumber chassisNumber').lean();
        if (existingBikes.length > 0) {
            const conflicts = existingBikes.map(b => `${b.engineNumber} / ${b.chassisNumber}`).slice(0, 8).join(', ');
            return NextResponse.json(
                { message: `${existingBikes.length} bike(s) already exist in inventory with these engine/chassis numbers: ${conflicts}${existingBikes.length > 8 ? '…' : ''}` },
                { status: 409 }
            );
        }

        const existingDO = await DeliveryOrder.findOne({ doNumber }).lean();
        if (existingDO) {
            return NextResponse.json({ message: `Delivery Order number "${doNumber}" already exists` }, { status: 409 });
        }

        // Create delivery order
        const deliveryOrder = await DeliveryOrder.create({
            doNumber,
            date: new Date(date),
            dealerName,
            dealerAddress,
        });

        // Create bikes — if this fails partway through, delete the delivery order we just created
        // instead of leaving it orphaned (which would otherwise block retrying with the same DO number).
        try {
            const createdBikes = await Bike.insertMany(
                bikes.map((bike: any) => ({
                    model: bike.model,
                    color: bike.color,
                    engineNumber: bike.engineNumber,
                    chassisNumber: bike.chassisNumber,
                    purchasePrice: Number(bike.purchasePrice) || 0,
                    status: 'AVAILABLE',
                    deliveryOrderId: deliveryOrder._id,
                })),
                { ordered: true }
            );

            return NextResponse.json({
                ...deliveryOrder.toObject(),
                bikes: createdBikes
            }, { status: 201 });
        } catch (bikeError: any) {
            await DeliveryOrder.findByIdAndDelete(deliveryOrder._id);
            throw bikeError;
        }
    } catch (error: any) {
        console.error('Error creating delivery order:', error);

        if (error.code === 11000) {
            return NextResponse.json(
                { message: 'Duplicate entry: DO number, engine number, or chassis number already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { message: 'Failed to create delivery order', error: error.message },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        await dbConnect();

        const deliveryOrders = await DeliveryOrder.find().sort({ createdAt: -1 }).lean();
        const bikes = await Bike.find().lean();

        // Group bikes by delivery order
        const ordersWithBikes = deliveryOrders.map(order => ({
            ...order,
            bikes: bikes.filter(bike => bike.deliveryOrderId.toString() === order._id.toString())
        }));

        return NextResponse.json(ordersWithBikes);
    } catch (error: any) {
        console.error('Error fetching delivery orders:', error);
        return NextResponse.json(
            { message: 'Failed to fetch delivery orders', error: error.message },
            { status: 500 }
        );
    }
}
