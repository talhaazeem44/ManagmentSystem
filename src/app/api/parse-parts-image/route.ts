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
            `This is a Honda motorcycle spare part box or sticker/label. Extract the part details.

Return ONLY a valid JSON object, no explanation, no markdown:
{
  "name": "full part name (e.g. Honda CD70 Air Filter, Engine Oil 10W-30, Visor Front Plate Pridor)",
  "partNumber": "part number if visible, else empty string",
  "category": "one of: Oil, Filter, Parts, Accessories, Consumable, Other",
  "price": "total MRP price in numbers only if visible (e.g. 600), else empty string"
}

Guidelines:
- name: be descriptive, include bike model if shown (e.g. CD70, CG125, Pridor)
- category: Oil for lubricants/engine oil, Filter for air/oil filters, Parts for mechanical parts, Consumable for chains/plugs/bulbs
- price: use the final total MRP (e.g. if shown as 512.82+87.18=Rs.600 then use 600)`
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ message: 'Could not read label', raw: text }, { status: 422 });
        }

        const part = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ part });

    } catch (error: any) {
        console.error('parse-parts-image error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
