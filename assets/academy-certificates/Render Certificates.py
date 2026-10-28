"""Typeset original, print-ready Academy awards using local licensed fonts.

Personalized student names are supplied at render time and never kept in source.
Run with the bundled Python runtime, which includes ReportLab.
"""
from pathlib import Path
import argparse
import math

from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[2]
WIDTH, HEIGHT = 792, 612  # US Letter, landscape, with a generous print-safe border.
FONT_FILES = {
    "Display": ("Supplemental/Didot.ttc", 0),
    "Display Italic": ("Supplemental/Didot.ttc", 1),
    "Serif": ("Supplemental/Baskerville.ttc", 0),
    "Serif Bold": ("Supplemental/Baskerville.ttc", 1),
    "Serif Italic": ("Supplemental/Baskerville.ttc", 2),
    "Script": ("Supplemental/SnellRoundhand.ttc", 1),
    "Sans": ("Avenir Next.ttc", 7),
    "Sans Medium": ("Avenir Next.ttc", 5),
    "Sans Demi": ("Avenir Next.ttc", 2),
}
for face, (filename, index) in FONT_FILES.items():
    pdfmetrics.registerFont(TTFont(face, "/System/Library/Fonts/" + filename, subfontIndex=index))

THEMES = {
    "Brothers": dict(ink="#143B45", accent="#24716F", gold="#A77935", light="#E7F0ED", paper="#FFFCF5", frame="#123B45", fold="#397C77"),
    "Sisters": dict(ink="#633549", accent="#A14E70", gold="#A77B48", light="#F6E7E9", paper="#FFF9F5", frame="#64364C", fold="#B56984"),
}


def colour(value):
    return HexColor(value)


def polygon(c, points, fill=None, stroke=None, width=0.5):
    p = c.beginPath()
    p.moveTo(*points[0])
    for point in points[1:]:
        p.lineTo(*point)
    p.close()
    if fill:
        c.setFillColor(colour(fill))
    if stroke:
        c.setStrokeColor(colour(stroke))
    c.setLineWidth(width)
    c.drawPath(p, fill=bool(fill), stroke=bool(stroke))


def tracked(c, text, x, y, face, size, fill, tracking=1.5):
    span = pdfmetrics.stringWidth(text, face, size) + tracking * max(0, len(text) - 1)
    c.saveState()
    t = c.beginText(x - span / 2, y)
    t.setFont(face, size)
    t.setFillColor(colour(fill))
    t.setCharSpace(tracking)
    t.textOut(text)
    c.drawText(t)
    c.restoreState()


def centred(c, text, y, face, size, fill):
    assert pdfmetrics.stringWidth(text, face, size) <= WIDTH - 160, text
    c.setFont(face, size)
    c.setFillColor(colour(fill))
    c.drawCentredString(WIDTH / 2, y, text)


def arc_label(c, text, radius, size, centre_angle, reverse=False, tracking=0.5):
    """Optically centred real type on a mathematical circular baseline."""
    advances = [pdfmetrics.stringWidth(glyph, "Serif Bold", size) for glyph in text]
    length = sum(advances) + tracking * (len(text) - 1)
    span = length / radius
    direction = 1 if reverse else -1
    angle = math.radians(centre_angle) - direction * span / 2
    for glyph, width in zip(text, advances):
        middle = angle + direction * width / (2 * radius)
        c.saveState()
        c.translate(radius * math.cos(middle), radius * math.sin(middle))
        c.rotate(math.degrees(middle) + (90 if reverse else -90))
        c.setFont("Serif Bold", size)
        c.drawCentredString(0, 0, glyph)
        c.restoreState()
        angle += direction * (width + tracking) / radius


def academy_seal(c, x=396, y=527):
    """Concentric vector rim and type, with the unchanged official emblem."""
    c.saveState()
    c.translate(x, y)
    c.setFillColor(colour("#12303E"))
    c.circle(0, 0, 40.6, fill=1, stroke=0)
    c.setStrokeColor(colour("#C5A15A"))
    c.setLineWidth(0.48)
    c.circle(0, 0, 38.5, stroke=1, fill=0)
    c.setLineWidth(0.22)
    c.circle(0, 0, 39.7, stroke=1, fill=0)
    c.setFillColor(colour("#E0C17D"))
    arc_label(c, "HBIC QUR’AN ACADEMY", 30.5, 5.2, 90, tracking=0.48)
    arc_label(c, "MASJID BILAL · CALGARY", 34.4, 4.65, 270, reverse=True, tracking=0.43)
    c.setFillColor(colour("#FFFCF5"))
    c.circle(0, 0, 19.2, fill=1, stroke=0)
    c.saveState()
    clip = c.beginPath()
    clip.circle(0, 0, 18.1)
    c.clipPath(clip, stroke=0, fill=0)
    logo = ROOT / "apps/public-web/public/brand/hbic-logo.png"
    c.drawImage(ImageReader(str(logo)), -18, -18, width=36, height=36, mask="auto")
    c.restoreState()
    c.restoreState()


def star(c, x, y, r, fill=None, stroke=None, points=8, inner=0.47):
    vertices = []
    for i in range(points * 2):
        a = math.pi / 2 + i * math.pi / points
        radius = r if i % 2 == 0 else r * inner
        vertices.append((x + radius * math.cos(a), y + radius * math.sin(a)))
    polygon(c, vertices, fill, stroke)


def corner(c, x, y, angle, theme, sister):
    """Fine engraved geometry, or a botanical arabesque, at each frame corner."""
    c.saveState()
    c.translate(x, y)
    c.rotate(angle)
    c.setStrokeColor(colour(theme["gold"]))
    c.setLineWidth(0.45)
    for inset in (0, 5):
        p = c.beginPath()
        p.moveTo(inset, 73)
        p.lineTo(inset, inset + 19)
        p.curveTo(inset, inset + 7, inset + 7, inset, inset + 19, inset)
        p.lineTo(73, inset)
        c.drawPath(p)
    if sister:
        p = c.beginPath()
        p.moveTo(12, 59)
        p.curveTo(12, 25, 25, 12, 59, 12)
        c.drawPath(p)
        for n in range(5):
            a = 0.24 + n * 0.27
            px, py = 15 + 27 * math.sin(a), 15 + 27 * math.cos(a)
            c.saveState()
            c.translate(px, py)
            c.rotate(-a * 180 / math.pi - 25)
            p = c.beginPath()
            p.moveTo(0, 0)
            p.curveTo(-5, 5, -4, 12, 0, 15)
            p.curveTo(4, 10, 4, 5, 0, 0)
            c.drawPath(p)
            c.restoreState()
        star(c, 17, 17, 6, theme["gold"], points=4)
    else:
        for offset in (0, 10, 20):
            polygon(c, [(11 + offset, 11), (43 + offset, 43), (43 + offset, 53)], stroke=theme["gold"], width=0.4)
            polygon(c, [(11, 11 + offset), (43, 43 + offset), (53, 43 + offset)], stroke=theme["gold"], width=0.4)
        star(c, 25, 25, 11, theme["paper"], theme["gold"], inner=0.66)
        c.setFillColor(colour(theme["gold"]))
        c.circle(25, 25, 2, fill=1, stroke=0)
    c.restoreState()


def rosette(c, theme, sister):
    x, y, outer = WIDTH / 2, 137, 43
    # Tail folds and scalloped foil use only vector geometry.
    polygon(c, [(x - 31, y - 21), (x - 40, y - 74), (x - 19, y - 63), (x - 5, y - 79), (x + 3, y - 23)], theme["accent"])
    polygon(c, [(x + 1, y - 23), (x + 15, y - 78), (x + 30, y - 60), (x + 47, y - 69), (x + 29, y - 20)], theme["frame"])
    c.setStrokeColor(colour(theme["gold"]))
    c.setLineWidth(0.6)
    c.line(x - 24, y - 39, x - 29, y - 61)
    c.line(x + 24, y - 40, x + 31, y - 58)
    folds = 32 if sister else 24
    for i in range(folds):
        a = 2 * math.pi * i / folds
        b = a + math.pi / folds
        d = a + 2 * math.pi / folds
        point = lambda theta, r: (x + math.cos(theta) * r, y + math.sin(theta) * r)
        radius = outer - (2 if sister else 5)
        polygon(c, [(x, y), point(a, outer), point(b, radius)], "#D5B576")
        polygon(c, [(x, y), point(b, radius), point(d, outer)], theme["gold"])
    c.setFillColor(colour(theme["paper"]))
    c.circle(x, y, 31.8, fill=1, stroke=0)
    c.setStrokeColor(colour(theme["gold"]))
    c.setLineWidth(0.6)
    c.circle(x, y, 28.8, stroke=1, fill=0)
    c.setLineWidth(0.28)
    c.circle(x, y, 26.5, stroke=1, fill=0)
    star(c, x, y + 8, 13.3, theme["gold"], points=5, inner=0.46)
    tracked(c, "STAR OF", x, y - 10, "Sans Demi", 4.9, theme["ink"], 0.8)
    tracked(c, "THE MONTH", x, y - 17, "Sans Demi", 4.9, theme["ink"], 0.5)


def render(edition, name, directory):
    theme = THEMES[edition]
    sister = edition == "Sisters"
    stem = "Star of the Month - " + edition
    path = directory / (stem + ".pdf")
    c = canvas.Canvas(str(path), pagesize=(WIDTH, HEIGHT), pageCompression=1)
    c.setTitle("Star of the Month | HBIC Qur’an Academy | " + edition)
    c.setAuthor("HBIC Qur’an Academy")
    c.setSubject("October 2026 award for Qur’an learning, character and respect")
    c.setFillColor(colour(theme["paper"]))
    c.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    # A narrow outer frame is inside the printable area on ordinary Letter printers.
    c.setFillColor(colour(theme["frame"]))
    c.rect(18, 18, WIDTH - 36, HEIGHT - 36, fill=1, stroke=0)
    c.setStrokeColor(colour(theme["gold"]))
    c.setLineWidth(0.7)
    c.rect(24, 24, WIDTH - 48, HEIGHT - 48, stroke=1, fill=0)
    c.setFillColor(colour(theme["paper"]))
    c.rect(31, 31, WIDTH - 62, HEIGHT - 62, fill=1, stroke=0)
    c.setStrokeColor(colour(theme["gold"]))
    c.setLineWidth(0.45)
    c.rect(38, 38, WIDTH - 76, HEIGHT - 76, stroke=1, fill=0)
    for x, y, angle in [(47, 47, 0), (745, 47, 90), (745, 565, 180), (47, 565, 270)]:
        corner(c, x, y, angle, theme, sister)
    # Side ornaments balance the central typography without crossing its safe bounds.
    for x in (58, WIDTH - 58):
        c.setStrokeColor(colour(theme["gold"]))
        c.setLineWidth(0.35)
        c.line(x, 185, x, 278)
        c.line(x, 334, x, 427)
        star(c, x, 306, 8.5, theme["paper"], theme["gold"], points=8, inner=0.66)
        c.circle(x, 306, 2, stroke=1, fill=0)
    academy_seal(c)
    tracked(c, "HBIC QUR’AN ACADEMY", 396, 468, "Sans Demi", 10.5, theme["ink"], 1.5)
    # A restrained engraved divider beneath the identity.
    c.setStrokeColor(colour(theme["gold"]))
    c.setLineWidth(0.45)
    c.line(255, 449, 377, 449)
    c.line(415, 449, 537, 449)
    star(c, 396, 449, 4.5, theme["gold"], points=4)
    tracked(c, "CERTIFICATE OF EXCELLENCE", 396, 420, "Sans Medium", 8, theme["accent"], 2.2)
    centred(c, "Star of the Month", 379, "Display", 40, theme["ink"])
    tracked(c, "PROUDLY PRESENTED TO", 396, 351, "Sans", 7.5, theme["ink"], 1.7)
    if name:
        size = 49
        while pdfmetrics.stringWidth(name, "Script", size) > 490:
            size -= 1
        # Leave clearance for descending calligraphic strokes above the rule.
        centred(c, name, 308, "Script", size, theme["ink"])
    c.setStrokeColor(colour(theme["gold"]))
    c.setLineWidth(0.65)
    c.line(190, 288, 602, 288)
    for x in (183, 609):
        star(c, x, 288, 3.1, theme["gold"], points=4)
    lines = [
        "For excellence in Qur’an reading and recitation,",
        "and for showing kindness, good character and respect",
        "towards classmates and teachers throughout the month.",
    ]
    for i, line in enumerate(lines):
        centred(c, line, 266 - i * 17, "Serif", 13.2, theme["ink"])
    tracked(c, "OCTOBER 2026", 396, 209, "Sans Demi", 8.3, theme["accent"], 2)
    centred(c, "May Allah increase you in knowledge and love for the Qur’an.", 190, "Serif Italic", 10.3, theme["accent"])
    rosette(c, theme, sister)
    # Blank, real signing areas rather than simulated signatures.
    for left, right, label in [(105, 279, "ACADEMY TEACHER"), (513, 687, "MASJID DIRECTOR")]:
        c.setStrokeColor(colour(theme["gold"]))
        c.setLineWidth(0.55)
        c.line(left, 106, right, 106)
        tracked(c, label, (left + right) / 2, 91, "Sans", 6.5, theme["ink"], 1.2)
    tracked(c, "29 OCTOBER 2026", 396, 45, "Sans Medium", 6.5, theme["ink"], 1.2)
    c.showPage()
    c.save()
    return path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--brothers-name", default="")
    parser.add_argument("--sisters-name", default="")
    parser.add_argument("--output", type=Path, default=ROOT / "output/pdf/Academy Certificates")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for edition, name in [("Brothers", args.brothers_name), ("Sisters", args.sisters_name)]:
        print(render(edition, name.strip(), args.output))
