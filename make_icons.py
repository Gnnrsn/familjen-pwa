# Generates simple calendar-style app icons (no external assets).
from PIL import Image, ImageDraw
def icon(size, maskable=False):
    S = size * 4  # supersample
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bg = (37, 99, 235, 255)
    if maskable:
        d.rectangle([0, 0, S, S], fill=bg); pad = int(S * 0.22)
    else:
        d.rectangle([0, 0, S, S], fill=bg); pad = int(S * 0.16)
    # calendar sheet
    x0, y0, x1, y1 = pad, pad + int(S*0.04), S - pad, S - pad + int(S*0.02)
    r = int(S * 0.07)
    d.rounded_rectangle([x0, y0, x1, y1], r, fill=(255, 255, 255, 255))
    hh = int((y1 - y0) * 0.24)
    d.rounded_rectangle([x0, y0, x1, y0 + hh], r, fill=(239, 68, 68, 255))
    d.rectangle([x0, y0 + hh - r, x1, y0 + hh], fill=(239, 68, 68, 255))
    # rings
    rw = int(S * 0.035)
    for fx in (0.32, 0.68):
        cx = int(x0 + (x1 - x0) * fx)
        d.rounded_rectangle([cx - rw, y0 - int(S*0.05), cx + rw, y0 + int(S*0.05)], rw, fill=(30, 41, 59, 255))
    # four family dots: red, green, yellow, purple
    cols = [(229, 72, 77), (48, 164, 108), (245, 196, 0), (110, 86, 207)]
    gy0 = y0 + hh; gh = y1 - gy0; gw = x1 - x0
    rad = int(min(gw, gh) * 0.15)
    pos = [(0.3, 0.32), (0.7, 0.32), (0.3, 0.72), (0.7, 0.72)]
    for c, (fx, fy) in zip(cols, pos):
        cx = int(x0 + gw * fx); cy = int(gy0 + gh * fy)
        d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=c + (255,))
    return img.resize((size, size), Image.LANCZOS)
for s in (180, 192, 512):
    icon(s).save(f"icons/icon-{s}.png")
icon(512, maskable=True).save("icons/icon-maskable-512.png")
icon(32).save("icons/favicon-32.png")
print("ok")
