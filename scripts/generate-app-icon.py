"""One-off: build a proper app icon (white Honda wing mark on a red gradient,
rounded square) to replace the placeholder "NA" text icon, and a matching
splash-screen source image. Run with: python3 scripts/generate-app-icon.py
"""
from PIL import Image, ImageDraw, ImageFilter

SRC = 'public/honda-logo.png'
OUT_DIR = 'public'

def extract_wing_silhouette():
    im = Image.open(SRC).convert('RGB')
    w, h = im.size
    px = im.load()

    # Logo is a red mark on a solid white background (no real alpha channel).
    # Treat "redness" (distance from white) as alpha so we get a clean cutout
    # with the original anti-aliasing preserved as a soft edge.
    alpha_img = Image.new('L', (w, h))
    apx = alpha_img.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            apx[x, y] = 255 - min(r, g, b)

    # Source is a 4-bit (16-color) palette PNG, so its anti-aliased edges are
    # dithered — a noisy checker mix of red/white pixels rather than a smooth
    # gradient. That noise reads as faint stray alpha everywhere, which then
    # shows up as a visible checkerboard once blurred for the drop shadow
    # below. Threshold it away, then re-blur just enough to smooth the real
    # edge back out.
    alpha_img = alpha_img.point(lambda a: 0 if a < 60 else 255)
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(1.2))

    # The wing mark and the "HONDA" wordmark below it are separated by a gap
    # around y=264 (found by scanning row coverage) — keep only the wing.
    wing_alpha = alpha_img.crop((0, 0, w, 264))
    bbox = wing_alpha.getbbox()
    wing_alpha = wing_alpha.crop(bbox)

    silhouette = Image.new('RGBA', wing_alpha.size, (255, 255, 255, 0))
    silhouette.putalpha(wing_alpha)
    return silhouette

def rounded_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask

def diagonal_gradient(size, top_left, bottom_right):
    grad = Image.new('RGB', (size, size))
    gpx = grad.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            r = round(top_left[0] + (bottom_right[0] - top_left[0]) * t)
            g = round(top_left[1] + (bottom_right[1] - top_left[1]) * t)
            b = round(top_left[2] + (bottom_right[2] - top_left[2]) * t)
            gpx[x, y] = (r, g, b)
    return grad

def build_icon(wing, size, rounded=True, radius_frac=0.22):
    # Stay in plain opaque RGB for every layer until the very last step, where
    # the only transparency introduced is the outer rounded-corner mask.
    canvas = diagonal_gradient(size, (239, 68, 68), (69, 10, 10))  # brand red -> deep maroon

    # Soft top-left highlight for depth.
    glow_mask = Image.new('L', (size, size), 0)
    gdraw = ImageDraw.Draw(glow_mask)
    gdraw.ellipse((-size * 0.3, -size * 0.3, size * 0.75, size * 0.75), fill=60)
    glow_mask = glow_mask.filter(ImageFilter.GaussianBlur(size * 0.12))
    white_rgb = Image.new('RGB', (size, size), (255, 255, 255))
    canvas = Image.composite(white_rgb, canvas, glow_mask)

    target_w = int(size * 0.60)
    scale = target_w / wing.width
    target_h = int(wing.height * scale)
    wing_resized = wing.resize((target_w, target_h), Image.LANCZOS)
    px = (size - target_w) // 2
    py = (size - target_h) // 2 - int(size * 0.02)

    # Soft drop shadow: a blurred black silhouette, offset slightly, blended
    # onto the background using its own alpha (scaled down) as the mix mask —
    # stays within RGB the whole time, no stray alpha channel involved.
    shadow_mask = Image.new('L', (size, size), 0)
    wing_alpha_only = wing_resized.split()[3].point(lambda a: int(a * 0.4))
    shadow_mask.paste(wing_alpha_only, (px + int(size * 0.015), py + int(size * 0.02)))
    shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(size * 0.015))
    black_rgb = Image.new('RGB', (size, size), (0, 0, 0))
    canvas = Image.composite(black_rgb, canvas, shadow_mask)

    canvas = canvas.convert('RGBA')
    canvas.paste(wing_resized, (px, py), wing_resized)

    if rounded:
        mask = rounded_mask(size, int(size * radius_frac))
        out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        out.paste(canvas, (0, 0), mask)
        canvas = out

    return canvas

if __name__ == '__main__':
    wing = extract_wing_silhouette()

    # Standalone transparent wing mark (no background baked in) — used on the
    # full-bleed splash screen, where the gradient fills the whole viewport
    # instead of sitting inside a smaller rounded square.
    wing_w = 800
    wing_scale = wing_w / wing.width
    wing_export = wing.resize((wing_w, int(wing.height * wing_scale)), Image.LANCZOS)
    wing_export.save(f'{OUT_DIR}/wing-mark.png', optimize=True)

    icon_512 = build_icon(wing, 512, rounded=False)
    icon_512.save(f'{OUT_DIR}/icon-512.png', optimize=True)

    icon_192 = build_icon(wing, 192, rounded=False)
    icon_192.save(f'{OUT_DIR}/icon-192.png', optimize=True)

    apple_touch = build_icon(wing, 180, rounded=True, radius_frac=0.22)
    apple_touch.convert('RGB').save(f'{OUT_DIR}/apple-touch-icon.png', optimize=True)

    print('Done.')
