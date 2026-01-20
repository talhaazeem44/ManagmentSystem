import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Sale, Bike, Customer, DeliveryOrder } from '@/models';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const body = await request.json();
        const {
            bikeId,
            customer,
            price,
            advanceAmount,
            receivedCash,
            balance,
            registrationCost,
            paymentMode,
            receiptNumber
        } = body;

        // Validate required fields
        if (!bikeId || !customer || !price) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if bike exists and is available
        const bike = await Bike.findById(bikeId);

        if (!bike) {
            return NextResponse.json(
                { message: 'Bike not found' },
                { status: 404 }
            );
        }

        if (bike.status === 'SOLD') {
            return NextResponse.json(
                { message: 'Bike is already sold' },
                { status: 400 }
            );
        }

        // Create or find customer
        let customerRecord = await Customer.findOne({ cnic: customer.cnic });

        if (!customerRecord) {
            customerRecord = await Customer.create({
                cnic: customer.cnic,
                name: customer.name,
                fatherName: customer.fatherName,
                address: customer.address,
                mobile: customer.mobile
            });
        }

        // Create sale
        const sale = await Sale.create({
            bikeId: bike._id,
            customerId: customerRecord._id,
            price: parseFloat(price),
            advanceAmount: advanceAmount || 0,
            receivedCash: receivedCash ? parseFloat(receivedCash) : 0,
            balance: balance ? parseFloat(balance) : 0,
            registrationCost: registrationCost ? parseFloat(registrationCost) : undefined,
            paymentMode: paymentMode || 'CASH',
            receiptNumber
        });

        // Update bike status
        bike.status = 'SOLD';
        await bike.save();

        // Fetch related data for response
        const deliveryOrder = await DeliveryOrder.findById(bike.deliveryOrderId);

        return NextResponse.json({
            ...sale.toObject(),
            id: sale._id.toString(),
            bike: {
                ...bike.toObject(),
                deliveryOrder
            },
            customer: customerRecord
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating sale:', error);

        if (error.code === 11000) {
            return NextResponse.json(
                { message: 'Duplicate entry: This bike is already sold or CNIC already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { message: 'Failed to create sale', error: error.message },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const cnic = searchParams.get('cnic');
        const engineNumber = searchParams.get('engineNumber');
        const chassisNumber = searchParams.get('chassisNumber');
        const doNumber = searchParams.get('doNumber');

        // Build filters
        let bikeFilter: any = {};
        if (engineNumber) bikeFilter.engineNumber = new RegExp(engineNumber, 'i');
        if (chassisNumber) bikeFilter.chassisNumber = new RegExp(chassisNumber, 'i');

        if (doNumber) {
            const deliveryOrder = await DeliveryOrder.findOne({ doNumber: new RegExp(doNumber, 'i') });
            if (deliveryOrder) {
                bikeFilter.deliveryOrderId = deliveryOrder._id;
            } else {
                // If DO number provided but not found, return empty results early
                return NextResponse.json([]);
            }
        }

        let customerFilter: any = {};
        if (cnic) customerFilter.cnic = new RegExp(cnic, 'i');

        // Find relevant bikes and customers first to filter sales
        const filteredBikes = await Bike.find(bikeFilter).lean();
        const filteredCustomers = await Customer.find(customerFilter).lean();

        const bikeIds = filteredBikes.map(b => b._id);
        const customerIds = filteredCustomers.map(c => c._id);

        let saleFilter: any = {};
        if (Object.keys(bikeFilter).length > 0) saleFilter.bikeId = { $in: bikeIds };
        if (Object.keys(customerFilter).length > 0) saleFilter.customerId = { $in: customerIds };

        const sales = await Sale.find(saleFilter).sort({ saleDate: -1 }).lean();

        // Fetch remaining details for response
        const allBikes = await Bike.find({ _id: { $in: sales.map(s => s.bikeId) } }).lean();
        const allCustomers = await Customer.find({ _id: { $in: sales.map(s => s.customerId) } }).lean();
        const doIds = allBikes.map(b => b.deliveryOrderId);
        const allDOs = await DeliveryOrder.find({ _id: { $in: doIds } }).lean();

        const salesWithRelations = sales.map(sale => {
            const bike = allBikes.find(b => b._id.toString() === sale.bikeId.toString());
            const customer = allCustomers.find(c => c._id.toString() === sale.customerId.toString());
            const deliveryOrder = bike ? allDOs.find(d => d._id.toString() === bike.deliveryOrderId.toString()) : null;

            return {
                ...sale,
                id: sale._id.toString(),
                bike: bike ? { ...bike, deliveryOrder } : null,
                customer
            };
        });

        return NextResponse.json(salesWithRelations);
    } catch (error: any) {
        console.error('Error fetching sales:', error);
        return NextResponse.json(
            { message: 'Failed to fetch sales', error: error.message },
            { status: 500 }
        );
    }
}
