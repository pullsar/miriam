import os
import sys
from pathlib import Path
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE = Path(__file__).resolve().parent.parent
PUBLIC = BASE / 'public'
OUT = PUBLIC / 'downloads' / 'programme-of-events.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)

ROYAL = colors.HexColor('#1e3a5f')
GOLD = colors.HexColor('#c9a86c')
CREAM = colors.HexColor('#fbf9f4')
SKY = colors.HexColor('#8fb4d6')
MUTED = colors.HexColor('#5a6775')

FONT_DIR = Path('C:/Windows/Fonts')

def register_font(name, file):
    path = FONT_DIR / file
    if path.exists():
        pdfmetrics.registerFont(TTFont(name, str(path)))
        return True
    return False

# Prefer Arial for broad Unicode support (Naira sign); fall back to Helvetica
if register_font('Arial', 'arial.ttf') and register_font('Arial-Bold', 'arialbd.ttf'):
    BODY = 'Arial'
    BOLD = 'Arial-Bold'
else:
    BODY = 'Helvetica'
    BOLD = 'Helvetica-Bold'

register_font('Times-Bold', 'timesbd.ttf') or register_font('Times-Bold', 'times.ttf')
TITLE = BOLD if not register_font('Times-Bold', 'timesbd.ttf') else 'Times-Bold'

def style(name, fontName=BODY, fontSize=11, leading=15, textColor=ROYAL, alignment=0, spaceAfter=8, **kw):
    return ParagraphStyle(name, fontName=fontName, fontSize=fontSize, leading=leading,
                          textColor=textColor, alignment=alignment, spaceAfter=spaceAfter, **kw)

styles = getSampleStyleSheet()
N = style('Normal', fontSize=11, leading=15, textColor=ROYAL)
H1 = style('H1', fontName=TITLE, fontSize=36, leading=40, textColor=GOLD, alignment=1, spaceAfter=18)
H2 = style('H2', fontName=BOLD, fontSize=20, leading=24, textColor=ROYAL, spaceAfter=14)
H3 = style('H3', fontName=BOLD, fontSize=14, leading=18, textColor=ROYAL, spaceAfter=6)
SUB = style('Sub', fontSize=13, leading=18, textColor=CREAM, alignment=1, spaceAfter=24)
DATE = style('Date', fontName=BOLD, fontSize=13, leading=16, textColor=ROYAL, spaceAfter=2)
DETAIL = style('Detail', fontSize=10, leading=14, textColor=MUTED, spaceAfter=10)
FOOT = style('Foot', fontSize=9, leading=12, textColor=MUTED, alignment=1)

def sized_image(path, max_width, max_height):
    if not path.exists():
        return None
    with PILImage.open(path) as img:
        w, h = img.size
    ratio = min(max_width / w, max_height / h)
    return Image(str(path), width=w * ratio, height=h * ratio)

def cover_page():
    story = []
    story.append(Spacer(1, 0.8 * inch))
    story.append(Paragraph("In Christ,", H1))
    h1b = ParagraphStyle('H1b', parent=H1, textColor=CREAM)
    story.append(Paragraph("In Glory", h1b))
    story.append(Paragraph("A Celebration of Life", SUB))

    # Main photo with soft border effect simulated by a table
    img = sized_image(PUBLIC / 'images' / 'main.jpeg', 4.2 * inch, 3.6 * inch)
    if img:
        photo_table = Table([[img]], colWidths=[4.2 * inch])
        photo_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 2, CREAM),
            ('BACKGROUND', (0, 0), (-1, -1), CREAM),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(photo_table)
    story.append(Spacer(1, 0.35 * inch))

    story.append(Paragraph("20th August 2026 — Wake Keep / Service of Songs", DATE))
    story.append(Paragraph("21st August 2026 — Burial / Funeral Mass", DATE))
    story.append(Spacer(1, 0.2 * inch))
    verse = style('Verse', fontName=BODY, fontSize=11, leading=16, textColor=CREAM, alignment=1, spaceAfter=6)
    story.append(Paragraph('"All things work together for good to them that love God." Romans 8:28', verse))
    return story

def programme_page():
    story = []
    story.append(Paragraph("Programme of Events", H2))
    story.append(Spacer(1, 0.1 * inch))

    events = [
        ("Wake Keep / Service of Songs at Enugu", "Evening of songs and Scripture", "Thursday, 20th August 2026"),
        ("Funeral Mass and Internment", "Mass, commendation, and burial", "Friday, 21st August 2026"),
        ("Wake Keep at Mgbagbuowa", "Family village gathering", "Date and time to be announced"),
        ("Senate Seating / Roll Call", "Colleagues and friends in council", "Date and time to be announced"),
        ("Wake Keep at Igbariam", "Community vigil", "Date and time to be announced"),
        ("Thanksgiving — Igbariam / Enugu", "A service of gratitude", "Date and time to be announced"),
    ]

    data = []
    for title, desc, date in events:
        row = [
            Paragraph(f"<b>{title}</b><br/><font size=9 color='#5a6775'>{desc}</font>", N),
            Paragraph(f"<b>{date}</b>", DETAIL),
        ]
        data.append(row)

    t = Table(data, colWidths=[4.0 * inch, 2.0 * inch])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#e0d8c8')),
        ('BACKGROUND', (0, 0), (-1, -1), CREAM),
    ]))
    story.append(t)
    return story

def venues_page():
    story = []
    story.append(Paragraph("Where We Gather", H2))
    story.append(Spacer(1, 0.1 * inch))

    venue_data = [
        [Paragraph("<b>Mgbagbuowa</b>", N), Paragraph("Family home and village square", DETAIL)],
        [Paragraph("<b>Enugu</b>", N), Paragraph("Wake keep and service of songs venue", DETAIL)],
        [Paragraph("<b>Igbariam</b>", N), Paragraph("Wake keep, funeral mass, and thanksgiving", DETAIL)],
    ]
    t = Table(venue_data, colWidths=[2.0 * inch, 4.0 * inch])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#e0d8c8')),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Family Colours", H2))
    story.append(Paragraph("<b>What to wear:</b> Blue and sky blue Ankara. White is also welcome.", N))
    story.append(Paragraph("Medium-grade Ankara. Groups will be connected directly with the vendor for ordering and delivery.", DETAIL))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Contributions", H2))
    story.append(Paragraph("Donations are received towards funeral expenses, catering, accommodation, transport, and souvenirs.", N))
    story.append(Spacer(1, 0.1 * inch))
    acct = [
        ["Bank", "First Bank"],
        ["Account Number", "3032732260"],
        ["Account Name", "Opata Diayne Nkechinyelu"],
    ]
    a = Table(acct, colWidths=[2.0 * inch, 4.0 * inch])
    a.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f4f8')),
        ('FONTNAME', (0, 0), (-1, -1), BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), ROYAL),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d0d8e0')),
    ]))
    story.append(a)
    return story

def souvenirs_page():
    story = []
    story.append(Paragraph("Gifts of Remembrance", H2))
    story.append(Paragraph("Choose an item to sponsor. Market-based unit prices are shown.", N))
    story.append(Spacer(1, 0.1 * inch))

    data = [["Item", "Unit Price"]]
    for item, price in [
        ("Temperature-sensitive mugs", "4,500"),
        ("Thermo mugs", "3,500"),
        ("Towels", "3,000"),
        ("Jotters", "2,000"),
        ("Bags", "4,500"),
        ("Handfans", "1,000"),
    ]:
        data.append([item, f"\u20a6{price}"])

    t = Table(data, colWidths=[4.5 * inch, 1.5 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ROYAL),
        ('TEXTCOLOR', (0, 0), (-1, 0), CREAM),
        ('FONTNAME', (0, 0), (-1, 0), BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d0d8e0')),
        ('BACKGROUND', (0, 1), (-1, -1), CREAM),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.25 * inch))

    qr = sized_image(PUBLIC / 'qrcode.png', 1.4 * inch, 1.4 * inch)
    if qr:
        qr_table = Table([[qr, Paragraph("Scan to visit<br/>miriamngo.com", DETAIL)]], colWidths=[1.6 * inch, 2.0 * inch])
        qr_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(qr_table)

    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("For tributes and updates, visit miriamngo.com", FOOT))
    return story

def draw_background(canvas, doc):
    canvas.setFillColor(ROYAL)
    canvas.rect(0, 0, A4[0], A4[1], fill=True, stroke=False)

def draw_footer(canvas, doc):
    canvas.setFillColor(GOLD)
    canvas.setFont(BODY, 8)
    canvas.drawCentredString(A4[0] / 2, 0.5 * inch, "miriamngo.com")

def build():
    doc = SimpleDocTemplate(str(OUT), pagesize=A4,
                            rightMargin=0.65 * inch, leftMargin=0.65 * inch,
                            topMargin=0.65 * inch, bottomMargin=0.65 * inch)
    story = []
    story.extend(cover_page())
    story.append(PageBreak())
    story.extend(programme_page())
    story.append(PageBreak())
    story.extend(venues_page())
    story.append(PageBreak())
    story.extend(souvenirs_page())
    doc.build(story, onFirstPage=lambda c, d: (draw_background(c, d), draw_footer(c, d)),
              onLaterPages=lambda c, d: (draw_footer(c, d)))
    print(f"Created {OUT}")

if __name__ == '__main__':
    build()
