#!/usr/bin/env python3
"""Generate 1024x1024 app icon for StoryForge Shorts."""
from PIL import Image, ImageDraw, ImageFont
import math

SIZE = 1024
PURPLE = "#2D1B69"
ORANGE = "#FF6B35"
DARK = "#1a1025"

img = Image.new("RGB", (SIZE, SIZE), PURPLE)
draw = ImageDraw.Draw(img)

# Gradient background: dark purple at top to purple at bottom
for y in range(SIZE):
    t = y / SIZE
    r = int(26 + (45 - 26) * t)
    g = int(16 + (27 - 16) * t)
    b = int(37 + (105 - 37) * t)
    draw.line([(0, y), (SIZE, y)], fill=(r, g, b))

# Draw a stylized open book / flame shape in orange
cx, cy = SIZE // 2, SIZE // 2 + 40

# Book base - two angled rectangles forming an open book
def draw_book(draw, cx, cy):
    # Left page
    left_page = [
        (cx - 20, cy - 80),
        (cx - 200, cy - 120),
        (cx - 200, cy + 140),
        (cx - 20, cy + 100),
    ]
    # Right page
    right_page = [
        (cx + 20, cy - 80),
        (cx + 200, cy - 120),
        (cx + 200, cy + 140),
        (cx + 20, cy + 100),
    ]
    draw.polygon(left_page, fill="#3d2880")
    draw.polygon(right_page, fill="#3d2880")

    # Page lines on left
    for i in range(5):
        yoff = -60 + i * 40
        x1, y1 = cx - 180, cy + yoff - 8
        x2, y2 = cx - 40, cy + yoff + 4
        draw.line([(x1, y1), (x2, y2)], fill="#5a3fa0", width=3)

    # Page lines on right
    for i in range(5):
        yoff = -60 + i * 40
        x1, y1 = cx + 40, cy + yoff + 4
        x2, y2 = cx + 180, cy + yoff - 8
        draw.line([(x1, y1), (x2, y2)], fill="#5a3fa0", width=3)

draw_book(draw, cx, cy)

# Flame / forge spark rising from the book spine
def draw_flame(draw, cx, top_y):
    """Draw a stylized flame using overlapping ellipses and polygons."""
    # Outer flame (orange)
    flame_pts = []
    for i in range(100):
        t = i / 99.0
        # Flame shape parametric
        y = top_y + 260 * t
        width = 70 * math.sin(t * math.pi) * (1 - 0.3 * t)
        flame_pts.append((cx - width, y))
    for i in range(99, -1, -1):
        t = i / 99.0
        y = top_y + 260 * t
        width = 70 * math.sin(t * math.pi) * (1 - 0.3 * t)
        flame_pts.append((cx + width, y))

    draw.polygon(flame_pts, fill=ORANGE)

    # Inner flame (lighter)
    inner_pts = []
    for i in range(100):
        t = i / 99.0
        y = top_y + 40 + 200 * t
        width = 35 * math.sin(t * math.pi) * (1 - 0.3 * t)
        inner_pts.append((cx - width, y))
    for i in range(99, -1, -1):
        t = i / 99.0
        y = top_y + 40 + 200 * t
        width = 35 * math.sin(t * math.pi) * (1 - 0.3 * t)
        inner_pts.append((cx + width, y))

    draw.polygon(inner_pts, fill="#FFB347")

    # Core
    core_pts = []
    for i in range(100):
        t = i / 99.0
        y = top_y + 80 + 140 * t
        width = 15 * math.sin(t * math.pi) * (1 - 0.2 * t)
        core_pts.append((cx - width, y))
    for i in range(99, -1, -1):
        t = i / 99.0
        y = top_y + 80 + 140 * t
        width = 15 * math.sin(t * math.pi) * (1 - 0.2 * t)
        core_pts.append((cx + width, y))

    draw.polygon(core_pts, fill="#FFDD88")

draw_flame(draw, cx, cy - 280)

# Sparks / particles
import random
random.seed(42)
for _ in range(12):
    sx = cx + random.randint(-120, 120)
    sy = cy - 280 + random.randint(-60, 30)
    sr = random.randint(3, 8)
    alpha = random.choice(["#FF6B35", "#FFB347", "#FFDD88"])
    draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=alpha)

# Text "SF" large and bold at bottom
font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
try:
    font_big = ImageFont.truetype(font_path, 180)
except:
    font_big = ImageFont.load_default()

# Draw "SF" text centered below the book
text = "SF"
bbox = draw.textbbox((0, 0), text, font=font_big)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
tx = cx - tw // 2
ty = cy + 160

# Text shadow
draw.text((tx + 4, ty + 4), text, fill="#1a1025", font=font_big)
# Main text
draw.text((tx, ty), text, fill=ORANGE, font=font_big)

# Rounded corners mask
mask = Image.new("L", (SIZE, SIZE), 0)
mask_draw = ImageDraw.Draw(mask)
radius = 180
mask_draw.rounded_rectangle([0, 0, SIZE, SIZE], radius=radius, fill=255)
# Apply rounded corners
bg = Image.new("RGB", (SIZE, SIZE), (0, 0, 0))
img = Image.composite(img, bg, mask)

output = "/mnt/nvme/pipeline_01/storyforgesshorts.com/app_icon.png"
img.save(output, "PNG")
print(f"Saved {output}")
