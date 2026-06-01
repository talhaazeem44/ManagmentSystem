import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { WorkshopStock } from '@/models';

const PARTS = [
    { name: 'Head Light Assy CD70N',           category: 'Parts',       retailPrice: 1149.88, customerPrice: 1149.88, quantity: 10  },
    { name: 'Tail Light Assy CD70',            category: 'Parts',       retailPrice: 330.00,  customerPrice: 330.00,  quantity: 20  },
    { name: 'Unit Tail Light',                 category: 'Parts',       retailPrice: 1290.00, customerPrice: 1290.00, quantity: 1   },
    { name: 'Mudguard Front Fender CD70N',     category: 'Parts',       retailPrice: 60.20,   customerPrice: 60.20,   quantity: 100 },
    { name: 'Mudguard Front Fender CG125P',    category: 'Parts',       retailPrice: 64.73,   customerPrice: 64.73,   quantity: 100 },
    { name: 'Lever Handle Set CD70',           category: 'Parts',       retailPrice: 410.00,  customerPrice: 410.00,  quantity: 20  },
    { name: 'Lever Handle Set CG125',          category: 'Parts',       retailPrice: 350.00,  customerPrice: 350.00,  quantity: 20  },
    { name: 'Element Comp Air/C CB-150',       category: 'Filter',      retailPrice: 1750.46, customerPrice: 1750.46, quantity: 5   },
    { name: 'Element A & B Air Cleaner CG125', category: 'Filter',      retailPrice: 760.03,  customerPrice: 760.03,  quantity: 20  },
    { name: 'Mudguard Rear Fender CD70',       category: 'Parts',       retailPrice: 75.25,   customerPrice: 75.25,   quantity: 100 },
    { name: 'Mudguard Rear Fender CG125P',     category: 'Parts',       retailPrice: 75.25,   customerPrice: 75.25,   quantity: 100 },
    { name: 'Cushion Assy Rear Black CD70N',   category: 'Parts',       retailPrice: 2149.85, customerPrice: 2149.85, quantity: 10  },
    { name: 'Cushion Assy Rear CG125P',        category: 'Parts',       retailPrice: 2570.49, customerPrice: 2570.49, quantity: 10  },
    { name: 'Front Fork R/L Set CD70',         category: 'Parts',       retailPrice: 6450.41, customerPrice: 6450.41, quantity: 4   },
    { name: 'Front Fork R/L Set CG125',        category: 'Parts',       retailPrice: 7099.95, customerPrice: 7099.95, quantity: 4   },
    { name: 'Seat Assy CD70',                  category: 'Parts',       retailPrice: 2879.58, customerPrice: 2879.58, quantity: 2   },
    { name: 'Seat Assy Double CD70',           category: 'Parts',       retailPrice: 2400.00, customerPrice: 2400.00, quantity: 2   },
    { name: 'Seat Assy CG125P',                category: 'Parts',       retailPrice: 3550.00, customerPrice: 3550.00, quantity: 2   },
    { name: 'Seat Assy CG125',                 category: 'Parts',       retailPrice: 3779.32, customerPrice: 3779.32, quantity: 2   },
    { name: 'Helmet Full Face Large Black',    category: 'Accessories', retailPrice: 3100.39, customerPrice: 3100.39, quantity: 2   },
    { name: 'Helmet Full Face Pridex Red',     category: 'Accessories', retailPrice: 2490.24, customerPrice: 2490.24, quantity: 2   },
    { name: 'Helmet Full Face Pridex Black',   category: 'Accessories', retailPrice: 2490.24, customerPrice: 2490.24, quantity: 2   },
    { name: 'Cap Assy Noise SU CD70',          category: 'Parts',       retailPrice: 240.00,  customerPrice: 240.00,  quantity: 50  },
    { name: 'Chain Sprocket Kit CD70',         category: 'Parts',       retailPrice: 2099.54, customerPrice: 2099.54, quantity: 10  },
    { name: 'Chain Sprocket Set CB125F',       category: 'Parts',       retailPrice: 6200.00, customerPrice: 6200.00, quantity: 1   },
    { name: 'Chain Sprocket Set CB150F',       category: 'Parts',       retailPrice: 6100.00, customerPrice: 6100.00, quantity: 1   },
    { name: 'Pipe Strg Handle',                category: 'Parts',       retailPrice: 1200.00, customerPrice: 1200.00, quantity: 4   },
    { name: 'Key Set CD70',                    category: 'Accessories', retailPrice: 2390.00, customerPrice: 2390.00, quantity: 10  },
    { name: 'Key Set CG125P',                  category: 'Accessories', retailPrice: 2830.00, customerPrice: 2830.00, quantity: 10  },
    { name: 'Battery Comp CB-150F',            category: 'Parts',       retailPrice: 6849.81, customerPrice: 6849.81, quantity: 1   },
    { name: 'Battery GM7BL-A CG125 S',         category: 'Parts',       retailPrice: 3799.68, customerPrice: 3799.68, quantity: 2   },
    { name: 'Plate Clutch Common',             category: 'Parts',       retailPrice: 89.78,   customerPrice: 89.78,   quantity: 150 },
    { name: 'Tyre With Tube GT-70 FR CD70',    category: 'Parts',       retailPrice: 2234.85, customerPrice: 2234.85, quantity: 12  },
    { name: 'Tyre With Tube GT-125 FR CG125',  category: 'Parts',       retailPrice: 2624.71, customerPrice: 2624.71, quantity: 12  },
    { name: 'Clutch Housing Assy Pridor',      category: 'Parts',       retailPrice: 1850.00, customerPrice: 1850.00, quantity: 1   },
    { name: 'Winker Assy FR-L Gold CG125 S',   category: 'Parts',       retailPrice: 520.00,  customerPrice: 520.00,  quantity: 8   },
    { name: 'Winker Assy L Front R Rear CD70', category: 'Parts',       retailPrice: 390.00,  customerPrice: 390.00,  quantity: 50  },
];

export async function GET() {
    await dbConnect();
    let inserted = 0;
    let skipped = 0;
    const results: string[] = [];

    for (const part of PARTS) {
        const existing = await WorkshopStock.findOne({ name: part.name });
        if (existing) {
            skipped++;
            results.push(`SKIP: ${part.name}`);
        } else {
            await WorkshopStock.create(part);
            inserted++;
            results.push(`ADDED: ${part.name}`);
        }
    }

    return NextResponse.json({ inserted, skipped, results });
}
