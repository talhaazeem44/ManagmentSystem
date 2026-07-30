import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Sale, Bike, Customer, DeliveryOrder, Counter } from '@/models';

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
            taxAmount,
            paymentMode,
            bankTransferAmount,
            receiptColour,
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

        const parsedPrice = parseFloat(price);
        const parsedReceived = receivedCash ? parseFloat(receivedCash) : 0;
        const parsedBank = bankTransferAmount ? parseFloat(bankTransferAmount) : 0;
        const parsedBalance = balance ? parseFloat(balance) : 0;
        // For credit sales: if balance wasn't provided, auto-calculate it
        const finalBalance = (paymentMode === 'CREDIT' && parsedBalance === 0)
            ? Math.max(0, parsedPrice - parsedReceived - parsedBank)
            : parsedBalance;

        // Auto-increment receipt number
        const counter = await Counter.findByIdAndUpdate(
            'saleReceipt',
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const autoReceiptNumber = String(counter.seq);

        // Create sale
        const sale = await Sale.create({
            bikeId: bike._id,
            customerId: customerRecord._id,
            price: parsedPrice,
            advanceAmount: advanceAmount || 0,
            receivedCash: parsedReceived,
            balance: finalBalance,
            registrationCost: registrationCost ? parseFloat(registrationCost) : undefined,
            taxAmount: taxAmount ? parseFloat(taxAmount) : 0,
            paymentMode: paymentMode || 'CASH',
            bankTransferAmount: parsedBank,
            receiptNumber: autoReceiptNumber,
            receiptColour: receiptColour || undefined,
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
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

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

        // Run bike + customer filters in parallel
        const [filteredBikes, filteredCustomers] = await Promise.all([
            Bike.find(bikeFilter).lean(),
            Customer.find(customerFilter).lean(),
        ]);

        const bikeIds = filteredBikes.map(b => b._id);
        const customerIds = filteredCustomers.map(c => c._id);

        let saleFilter: any = {};
        if (Object.keys(bikeFilter).length > 0) saleFilter.bikeId = { $in: bikeIds };
        if (Object.keys(customerFilter).length > 0) saleFilter.customerId = { $in: customerIds };
        if (startDate || endDate) {
            saleFilter.saleDate = {};
            if (startDate) saleFilter.saleDate.$gte = new Date(startDate);
            if (endDate) saleFilter.saleDate.$lte = new Date(endDate);
        }

        const sales = await Sale.find(saleFilter).sort({ saleDate: -1 }).lean();

        // Fetch all related data in parallel
        const bikeIdsInSales = sales.map(s => s.bikeId.toString());
        const customerIdsInSales = sales.map(s => s.customerId.toString());
        const [allBikes, allCustomers] = await Promise.all([
            Bike.find({ _id: { $in: bikeIdsInSales } }).lean(),
            Customer.find({ _id: { $in: customerIdsInSales } }).lean(),
        ]);
        const doIds = allBikes.map(b => b.deliveryOrderId.toString());
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
