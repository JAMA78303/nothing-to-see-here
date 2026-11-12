"""YouTube channel banner for the Max channel: 2560x1440, with everything that matters inside the 1546x423 area every
device shows. usage: python publish/banner.py out/banner/   (needs max_tall.png and w_chicago.png from render/render.js)"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

out = Path(sys.argv[1]); W, H = 2560, 1440; SAFE = (507, 508, 2053, 931)
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; F = lambda px: ImageFont.truetype(BOLD, px)

# background: the Chicago street with the hotel up on its jackscrews, softened and darkened so the text reads
bg = Image.open(out / "w_chicago.png").convert("RGB").resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(3))
bg = Image.blend(bg, Image.new("RGB", (W, H), (10, 12, 24)), 0.42)
band = Image.new("RGBA", (W, H), (0, 0, 0, 0)); bd = ImageDraw.Draw(band)
bd.rectangle([0, SAFE[1] - 10, W, SAFE[3] + 10], fill=(8, 10, 20, 150))
bg = Image.alpha_composite(bg.convert("RGBA"), band)

# Max, cut out of the green screen: head and body, standing up from the bottom of the safe area
m = np.asarray(Image.open(out / "max_tall.png").convert("RGB")).astype(int); r, g, b = m[..., 0], m[..., 1], m[..., 2]
alpha = np.where((g > 90) & (g > r * 1.35) & (g > b * 1.35), 0, 255).astype(np.uint8)
mx = Image.fromarray(m.astype(np.uint8)); mx.putalpha(Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)))
ys, xs = np.nonzero(alpha); top, left, right = ys.min(), xs.min(), xs.max(); waist = top + int((ys.max() - top) * 0.58)
mx = mx.crop((left - 10, top - 10, right + 10, waist)); sc = 415 / mx.height; mx = mx.resize((int(mx.width * sc), 415), Image.LANCZOS)
bg.alpha_composite(mx, (SAFE[0] + 30, SAFE[3] - 415))

d = ImageDraw.Draw(bg); cx = (SAFE[0] + 30 + mx.width + SAFE[2]) // 2
d.text((cx, SAFE[1] + 135), "WEIRD TRUE STORIES", font=F(84), fill=(255, 255, 255), anchor="mm", stroke_width=10, stroke_fill=(0, 0, 0))
d.text((cx, SAFE[1] + 240), "you never knew, animated", font=F(58), fill=(255, 212, 0), anchor="mm", stroke_width=7, stroke_fill=(0, 0, 0))
pill = (cx - 330, SAFE[1] + 300, cx + 330, SAFE[1] + 380)
d.rounded_rectangle(pill, 40, fill=(255, 212, 0), outline=(0, 0, 0), width=6)
d.text((cx, (pill[1] + pill[3]) // 2 + 2), "NEW STORY EVERY DAY", font=F(42), fill=(17, 17, 17), anchor="mm")
bg.convert("RGB").save(out / "banner.png", optimize=True)

# previews of what each device shows: TV (all), desktop (full width, middle strip), phone (safe area)
pv = bg.convert("RGB")
pv.crop((0, 508, 2560, 931)).resize((1280, 212)).save(out / "preview_desktop.png")
pv.crop(SAFE).save(out / "preview_phone.png")
print("banner.png", Path(out / "banner.png").stat().st_size // 1024, "KB")
