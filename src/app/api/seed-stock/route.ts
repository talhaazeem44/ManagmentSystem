import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { WorkshopStock } from '@/models';

const PARTS = [
    { name: 'Head Light Assy CD70N',           productCode: '33100-088-02K',   category: 'Parts',       retailPrice: 1149.88, customerPrice: 1149.88, quantity: 10  },
    { name: 'Tail Light Assy CD70',            productCode: '63701-GGJ-97K0',  category: 'Parts',       retailPrice: 330.00,  customerPrice: 330.00,  quantity: 20  },
    { name: 'Unit Tail Light',                 productCode: '63701-K0K-A01',   category: 'Parts',       retailPrice: 1290.00, customerPrice: 1290.00, quantity: 1   },
    { name: 'Mudguard Front Fender CD70N',     productCode: '61123-088-02K',   category: 'Parts',       retailPrice: 60.20,   customerPrice: 60.20,   quantity: 100 },
    { name: 'Mudguard Front Fender CG125P',    productCode: '81121-KCS-02K',   category: 'Parts',       retailPrice: 64.73,   customerPrice: 64.73,   quantity: 100 },
    { name: 'Lever Handle Set CD70',           productCode: '53175-GGJ-90K0',  category: 'Parts',       retailPrice: 410.00,  customerPrice: 410.00,  quantity: 20  },
    { name: 'Lever Handle Set CG125',          productCode: '53175-KYH-60K0',  category: 'Parts',       retailPrice: 350.00,  customerPrice: 350.00,  quantity: 20  },
    { name: 'Element Comp Air/C CB-150',       productCode: '17211-KYA-700',   category: 'Filter',      retailPrice: 1750.46, customerPrice: 1750.46, quantity: 5   },
    { name: 'Element A & B Air Cleaner CG125', productCode: '17250-397-00K',   category: 'Filter',      retailPrice: 760.03,  customerPrice: 760.03,  quantity: 20  },
    { name: 'Mudguard Rear Fender CD70',       productCode: '80121-088-02K',   category: 'Parts',       retailPrice: 75.25,   customerPrice: 75.25,   quantity: 100 },
    { name: 'Mudguard Rear Fender CG125P',     productCode: '80121-397-00K',   category: 'Parts',       retailPrice: 75.25,   customerPrice: 75.25,   quantity: 100 },
    { name: 'Cushion Assy Rear Black CD70N',   productCode: '52400-068-74KZA', category: 'Parts',       retailPrice: 2149.85, customerPrice: 2149.85, quantity: 10  },
    { name: 'Cushion Assy Rear CG125P',        productCode: '52400-KY0-68K',   category: 'Parts',       retailPrice: 2570.49, customerPrice: 2570.49, quantity: 10  },
    { name: 'Front Fork R/L Set CD70',         productCode: '5140A-088-060',   category: 'Parts',       retailPrice: 6450.41, customerPrice: 6450.41, quantity: 4   },
    { name: 'Front Fork R/L Set CG125',        productCode: '5140A-KCS-671',   category: 'Parts',       retailPrice: 7099.95, customerPrice: 7099.95, quantity: 4   },
    { name: 'Seat Assy CD70',                  productCode: '77200-088-06K',   category: 'Parts',       retailPrice: 2879.58, customerPrice: 2879.58, quantity: 2   },
    { name: 'Seat Assy Double CD70',           productCode: '77200-GGJ-A000',  category: 'Parts',       retailPrice: 2400.00, customerPrice: 2400.00, quantity: 2   },
    { name: 'Seat Assy CG125P',                productCode: '77200-KCS-02K',   category: 'Parts',       retailPrice: 3550.00, customerPrice: 3550.00, quantity: 2   },
    { name: 'Seat Assy CG125',                 productCode: '77200-KYH-91K2',  category: 'Parts',       retailPrice: 3779.32, customerPrice: 3779.32, quantity: 2   },
    { name: 'Helmet Full Face Large Black',    productCode: 'D8HFF-LAB-6000',  category: 'Accessories', retailPrice: 3100.39, customerPrice: 3100.39, quantity: 2   },
    { name: 'Helmet Full Face Pridex Red',     productCode: '09HFF-LAR-PRI',   category: 'Accessories', retailPrice: 2490.24, customerPrice: 2490.24, quantity: 2   },
    { name: 'Helmet Full Face Pridex Black',   productCode: '08HFF-LBL-PRI',   category: 'Accessories', retailPrice: 2490.24, customerPrice: 2490.24, quantity: 2   },
    { name: 'Cap Assy Noise SU CD70',          productCode: '30700-GN5-901',   category: 'Parts',       retailPrice: 240.00,  customerPrice: 240.00,  quantity: 50  },
    { name: 'Chain Sprocket Kit CD70',         productCode: '41200-088-11K2',  category: 'Parts',       retailPrice: 2099.54, customerPrice: 2099.54, quantity: 10  },
    { name: 'Chain Sprocket Set CB125F',       productCode: '4120A-K0K-A00',   category: 'Parts',       retailPrice: 6200.00, customerPrice: 6200.00, quantity: 1   },
    { name: 'Chain Sprocket Set CB150F',       productCode: '4120A-KYA-600',   category: 'Parts',       retailPrice: 6100.00, customerPrice: 6100.00, quantity: 1   },
    { name: 'Pipe Strg Handle',                productCode: '53100-KYH-950',   category: 'Parts',       retailPrice: 1200.00, customerPrice: 1200.00, quantity: 4   },
    { name: 'Key Set CD70',                    productCode: '35010-088-06K',   category: 'Accessories', retailPrice: 2390.00, customerPrice: 2390.00, quantity: 10  },
    { name: 'Key Set CG125P',                  productCode: '35010-KCS-67K',   category: 'Accessories', retailPrice: 2830.00, customerPrice: 2830.00, quantity: 10  },
    { name: 'Battery Comp CB-150F',            productCode: '31500-K79-L02',   category: 'Parts',       retailPrice: 6849.81, customerPrice: 6849.81, quantity: 1   },
    { name: 'Battery GM7BL-A CG125 S',         productCode: '31500-KYH-AH1M1', category: 'Parts',      retailPrice: 3799.68, customerPrice: 3799.68, quantity: 2   },
    { name: 'Plate Clutch Common',             productCode: '22311-KN4-12K3',  category: 'Parts',       retailPrice: 89.78,   customerPrice: 89.78,   quantity: 150 },
    { name: 'Tyre With Tube GT-70 FR CD70',    productCode: '14711-041-15K4',  category: 'Parts',       retailPrice: 2234.85, customerPrice: 2234.85, quantity: 12  },
    { name: 'Tyre With Tube GT-125 FR CG125',  productCode: '44711-KCS-67K1',  category: 'Parts',       retailPrice: 2624.71, customerPrice: 2624.71, quantity: 12  },
    { name: 'Clutch Housing Assy Pridor',      productCode: '2212A-KVW-600',   category: 'Parts',       retailPrice: 1850.00, customerPrice: 1850.00, quantity: 1   },
    { name: 'Winker Assy FR-L Gold CG125 S',   productCode: '33450-KYH-AJ1M1', category: 'Parts',      retailPrice: 520.00,  customerPrice: 520.00,  quantity: 8   },
    { name: 'Winker Assy L Front R Rear CD70', productCode: '33450-GGJ-970',   category: 'Parts',       retailPrice: 390.00,  customerPrice: 390.00,  quantity: 50  },
];

export async function GET() {
    await dbConnect();
    let inserted = 0;
    let updated = 0;
    const results: string[] = [];

    for (const part of PARTS) {
        const existing = await WorkshopStock.findOne({ name: part.name });
        if (existing) {
            // Update productCode if missing
            await WorkshopStock.updateOne({ name: part.name }, { $set: { productCode: part.productCode } });
            updated++;
            results.push(`UPDATED code: ${part.name} → ${part.productCode}`);
        } else {
            await WorkshopStock.create(part);
            inserted++;
            results.push(`ADDED: ${part.name}`);
        }
    }

    return NextResponse.json({ inserted, updated, results });
}
