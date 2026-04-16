import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json({ message: 'No image provided' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');

        // Determine media type
        let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
        if (file.type === 'image/png') mediaType = 'image/png';
        else if (file.type === 'image/webp') mediaType = 'image/webp';

        const response = await client.messages.create({
            model: 'claude-opus-4-6',
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: { type: 'base64', media_type: mediaType, data: base64 }
                        },
                        {
                            type: 'text',
                            text: `This is a Honda motorcycle Delivery Order (DO) document. Extract ALL bike entries from it.

For each bike, extract:
- orderNumber (order/booking number, e.g. AHL/MC/2349)
- model (e.g. CD70, CG 125, CB150F, PRIDOR, DREAM, CG125S.SE, CB125F.SE)
- color (e.g. BLK=Black, RED=Red, BLUE=Blue, SLV/SILVER=Silver, WHT=White)
- engineNumber (engine no / eng no)
- chassisNumber (chassis no / frame no)
- purchasePrice (unit price / ex-factory price, numbers only)

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

If a field is not visible, leave it as empty string. Extract every row you can see.`
                        }
                    ]
                }
            ]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';

        // Extract JSON from response
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
