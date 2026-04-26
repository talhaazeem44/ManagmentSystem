import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();
        if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 });

        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(5000),
        });

        const html = await res.text();

        // Extract part name from common HTML patterns
        const patterns = [
            /<title[^>]*>([^<]+)<\/title>/i,
            /part[_\- ]?name["'\s:=]+([A-Z0-9 \-()]+)/i,
            /description["'\s:=]+([A-Z0-9 \-()]+)/i,
            /<h1[^>]*>([^<]+)<\/h1>/i,
            /<h2[^>]*>([^<]+)<\/h2>/i,
        ];

        let name = '';
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match?.[1]) {
                name = match[1].trim().replace(/Honda|Atlas|Genuine|Parts?/gi, '').trim();
                if (name.length > 3) break;
            }
        }

        // Extract part number from URL or HTML
        const partNoMatch = (url + html).match(/[A-Z0-9]{4,6}-[A-Z0-9]{3,4}-[A-Z0-9]{3,4}/i);
        const partNumber = partNoMatch ? partNoMatch[0].toUpperCase() : '';

        // Extract price
        const priceMatch = html.match(/Rs\.?\s*([0-9,]+)/i);
        const price = priceMatch ? priceMatch[1].replace(/,/g, '') : '';

        return NextResponse.json({ name, partNumber, price });
    } catch {
        return NextResponse.json({ name: '', partNumber: '', price: '' });
    }
}
