import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json({ message: 'No image provided' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = (file.type || 'image/jpeg') as string;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType,
                    data: base64,
                }
            },
            `This is a Honda motorcycle Delivery Order (DO) document from Atlas Honda Pakistan. Extract ALL bike entries from it.

For each bike, extract:
- orderNumber (booking/order number, e.g. AHL/MC/2546)
- model (e.g. CD70, CG125, CG 125, CB150F, PRIDOR, DREAM, CG125S.SE, CB125F.SE — strip color suffix like BLK/RED from model)
- color (BLK=Black, RED=Red, BLUE=Blue, SLV/SILVER=Silver, WHT=White, GOLD=Gold — extract from model column if combined)
- engineNumber (engine no column — alphanumeric, e.g. L026349)
- chassisNumber (chassis no column — full alphanumeric string like ED708356; if only last digits are shown like 013 look for the full number elsewhere in the document)
- purchasePrice (unit/ex-factory price, numbers only, no commas)

Return ONLY a valid JSON array, no explanation, no markdown:
[
  {
    "orderNumber": "",
    "model": "",
    "color": "",
    "engineNumber": "",
    "chassisNumber": "",
    "purchasePrice": ""
  }
]

If a field is not visible, leave it as empty string. Extract every row. The document may be photographed at an angle — read all rows carefully.`
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return NextResponse.json({ message: 'Could not parse response', raw: text }, { status: 422 });
        }

        const bikes = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ bikes });

    } catch (error: any) {
        console.error('parse-do-image error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
