"""A cartoon-accurate Earth for the series: Africa, Europe, Arabia and South America on a lit globe with clouds,
a night side and a thin atmosphere. earth(size) returns an RGBA image (cached)."""
import math
from functools import lru_cache
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

LAND = {  # rough coastlines, (longitude, latitude) in degrees
    "africa": [(-17, 21), (-16, 12), (-13, 8), (-8, 4), (-2, 5), (8, 4), (9, 0), (12, -6), (13, -12), (12, -18), (15, -27), (18, -34), (22, -34), (27, -33),
               (32, -28), (35, -23), (40, -15), (40, -10), (39, -4), (42, 0), (46, 3), (51, 11), (43, 12), (39, 16), (35, 24), (33, 31), (25, 32), (20, 31),
               (11, 33), (10, 37), (-1, 35), (-6, 35), (-10, 29), (-13, 27)],
    "europe": [(-9, 37), (-9, 44), (-4, 48), (2, 51), (8, 54), (10, 58), (6, 62), (16, 69), (28, 71), (40, 66), (40, 45), (28, 41), (24, 38), (18, 40),
               (12, 44), (8, 44), (3, 42), (-2, 37)],
    "britain": [(-5, 50), (1, 51), (0, 54), (-3, 58), (-6, 57), (-4, 54)],
    "arabia": [(35, 32), (39, 30), (48, 30), (52, 25), (57, 24), (59, 22), (52, 16), (44, 12), (42, 16), (39, 22), (35, 28)],
    "samerica": [(-80, 9), (-75, 11), (-62, 10), (-50, 0), (-35, -6), (-40, -22), (-48, -27), (-58, -38), (-65, -55), (-72, -50), (-75, -15), (-81, -5)],
    "madagascar": [(44, -13), (50, -15), (47, -25), (44, -22)],
}

@lru_cache(maxsize=8)
def earth(size, lon0=12.0, lat0=12.0):
    # land mask on a world map, 2 px per degree
    m = Image.new("L", (720, 360), 0); md = ImageDraw.Draw(m)
    for pts in LAND.values(): md.polygon([((lo + 180) * 2, (90 - la) * 2) for lo, la in pts], fill=255)
    m = np.asarray(m.filter(ImageFilter.GaussianBlur(1.2))) > 110
    n = size; y, x = np.mgrid[-1:1:n * 1j, -1:1:n * 1j]; r2 = x * x + y * y; inside = r2 < 1
    z = np.sqrt(np.clip(1 - r2, 0, 1))
    # rotate the view so lon0/lat0 faces us
    t = math.radians(lat0); yy, zz = -y * math.cos(t) + z * math.sin(t), y * math.sin(t) + z * math.cos(t)
    lat = np.degrees(np.arcsin(np.clip(yy, -1, 1))); lon = np.degrees(np.arctan2(x, zz)) + lon0
    mi, mj = np.clip(((90 - lat) * 2).astype(int), 0, 359), np.clip(((lon + 180) % 360 * 2).astype(int), 0, 719)
    land = m[mi, mj]
    ocean = np.stack([20 + 30 * z, 70 + 60 * z, 150 + 70 * z], -1)
    dry = np.clip(np.exp(-((lat - 23) / 8.5) ** 2) * 1.3 + 0.5 * np.exp(-((lat + 24) / 7) ** 2), 0, 1)[..., None]   # deserts around the tropics
    green = np.stack([60 + 40 * z, 130 + 40 * z, 60 + 20 * z], -1); sand = np.stack([200 + 20 * z, 170 + 20 * z, 110 + 10 * z], -1)
    col = np.where(land[..., None], green * (1 - dry) + sand * dry, ocean)
    col = np.where((np.abs(lat) > 66)[..., None], 235, col)                          # ice caps
    cl = np.sin(np.radians(lon) * 3 + np.sin(np.radians(lat) * 6) * 2.5) * np.sin(np.radians(lat) * 11 + 1.3) + 0.45 * np.sin(np.radians(lon * 2 + lat * 5))
    cloud = np.clip((cl - 0.75) * 2.0, 0, 0.7)[..., None]
    col = col * (1 - cloud) + 245 * cloud
    lx, ly, lz = -0.55, -0.45, 0.70; lnorm = math.sqrt(lx * lx + ly * ly + lz * lz)
    sh = np.clip((x * lx + y * ly + z * lz) / lnorm, 0, 1); light = (0.18 + 0.82 * sh ** 0.8)[..., None]
    col = col * light
    rim = np.clip((r2 - 0.86) / 0.14, 0, 1)[..., None]; col = col * (1 - rim * 0.35) + np.array([120, 170, 255]) * rim * 0.35
    a = np.where(inside, 255, 0).astype(np.uint8)
    img = Image.fromarray(np.dstack([col.clip(0, 255).astype(np.uint8), a]), "RGBA")
    glow = Image.new("RGBA", (int(n * 1.05), int(n * 1.05)), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse([0, 0, glow.width - 1, glow.height - 1], fill=(90, 150, 255, 70)); glow = glow.filter(ImageFilter.GaussianBlur(n * 0.012))
    glow.alpha_composite(img, ((glow.width - n) // 2, (glow.height - n) // 2))
    return glow

if __name__ == "__main__":
    earth(700).save("/tmp/claude-0/-home-user-nothing-to-see-here/c2f9c5b3-f85d-5cbc-ad64-e94ed7b9b82b/scratchpad/earth.png")
