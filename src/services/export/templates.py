"""
PDF styling templates and layout configurations.
"""

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.units import inch, cm
from reportlab.lib.pagesizes import letter, A4


# Page configuration
PAGE_SIZE = letter
PAGE_WIDTH, PAGE_HEIGHT = PAGE_SIZE
MARGIN_LEFT = 0.75 * inch
MARGIN_RIGHT = 0.75 * inch
MARGIN_TOP = 0.75 * inch
MARGIN_BOTTOM = 0.75 * inch
CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

# Color palette - Modern professional theme
COLORS = {
    "primary": colors.HexColor("#2563EB"),      # Blue
    "secondary": colors.HexColor("#7C3AED"),    # Purple
    "accent": colors.HexColor("#10B981"),       # Green
    "warning": colors.HexColor("#F59E0B"),      # Amber
    "danger": colors.HexColor("#EF4444"),       # Red
    "dark": colors.HexColor("#1F2937"),         # Dark gray
    "medium": colors.HexColor("#6B7280"),       # Medium gray
    "light": colors.HexColor("#F3F4F6"),        # Light gray
    "white": colors.white,
    "black": colors.black,
}

# Status colors
STATUS_COLORS = {
    "active": COLORS["accent"],
    "completed": COLORS["accent"],
    "pending": COLORS["warning"],
    "in_progress": COLORS["primary"],
    "failed": COLORS["danger"],
    "cancelled": COLORS["medium"],
    "superseded": COLORS["medium"],
    "reverted": COLORS["danger"],
}

# Priority colors
PRIORITY_COLORS = {
    "low": COLORS["medium"],
    "medium": COLORS["primary"],
    "high": COLORS["warning"],
    "urgent": COLORS["danger"],
    "critical": COLORS["danger"],
}

# Category colors
CATEGORY_COLORS = {
    "task": COLORS["primary"],
    "decision": COLORS["secondary"],
    "instruction": COLORS["accent"],
    "note": COLORS["medium"],
    "dependency": COLORS["warning"],
    "prospect": COLORS["primary"],
    "discussion": COLORS["secondary"],
    "announcement": COLORS["accent"],
    "question": COLORS["warning"],
    "other": COLORS["medium"],
}


def get_styles():
    """Get customized paragraph styles for the PDF."""
    styles = getSampleStyleSheet()
    
    # Title style - main document title
    styles.add(ParagraphStyle(
        name='DocTitle',
        parent=styles['Title'],
        fontSize=28,
        leading=34,
        textColor=COLORS["dark"],
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
    ))
    
    # Subtitle style
    styles.add(ParagraphStyle(
        name='DocSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        leading=16,
        textColor=COLORS["medium"],
        spaceAfter=24,
        alignment=TA_CENTER,
        fontName='Helvetica',
    ))
    
    # Section header style
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=COLORS["primary"],
        spaceBefore=24,
        spaceAfter=12,
        fontName='Helvetica-Bold',
        borderPadding=(0, 0, 6, 0),
    ))
    
    # Subsection header style
    styles.add(ParagraphStyle(
        name='SubsectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=COLORS["dark"],
        spaceBefore=16,
        spaceAfter=8,
        fontName='Helvetica-Bold',
    ))
    
    # Item title style (for decisions, tasks, etc.)
    styles.add(ParagraphStyle(
        name='ItemTitle',
        parent=styles['Heading3'],
        fontSize=12,
        leading=16,
        textColor=COLORS["dark"],
        spaceBefore=8,
        spaceAfter=4,
        fontName='Helvetica-Bold',
    ))
    
    # Body text style
    styles.add(ParagraphStyle(
        name='BodyText',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=COLORS["dark"],
        spaceAfter=8,
        alignment=TA_JUSTIFY,
        fontName='Helvetica',
    ))
    
    # Small text style
    styles.add(ParagraphStyle(
        name='SmallText',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=COLORS["medium"],
        spaceAfter=4,
        fontName='Helvetica',
    ))
    
    # Metadata style
    styles.add(ParagraphStyle(
        name='Metadata',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=COLORS["medium"],
        spaceAfter=4,
        fontName='Helvetica-Oblique',
    ))
    
    # Quote/context style
    styles.add(ParagraphStyle(
        name='Quote',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=COLORS["dark"],
        leftIndent=20,
        rightIndent=20,
        spaceBefore=8,
        spaceAfter=8,
        borderColor=COLORS["light"],
        borderWidth=0,
        borderPadding=8,
        backColor=COLORS["light"],
        fontName='Helvetica-Oblique',
    ))
    
    # TOC entry style
    styles.add(ParagraphStyle(
        name='TOCEntry',
        parent=styles['Normal'],
        fontSize=11,
        leading=18,
        textColor=COLORS["dark"],
        fontName='Helvetica',
    ))
    
    # TOC sub-entry style
    styles.add(ParagraphStyle(
        name='TOCSubEntry',
        parent=styles['Normal'],
        fontSize=10,
        leading=16,
        textColor=COLORS["medium"],
        leftIndent=20,
        fontName='Helvetica',
    ))
    
    # Footer style
    styles.add(ParagraphStyle(
        name='Footer',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=COLORS["medium"],
        alignment=TA_CENTER,
        fontName='Helvetica',
    ))
    
    # Tag style
    styles.add(ParagraphStyle(
        name='Tag',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=COLORS["primary"],
        fontName='Helvetica-Bold',
    ))
    
    # Stat number style
    styles.add(ParagraphStyle(
        name='StatNumber',
        parent=styles['Normal'],
        fontSize=24,
        leading=28,
        textColor=COLORS["primary"],
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
    ))
    
    # Stat label style
    styles.add(ParagraphStyle(
        name='StatLabel',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=COLORS["medium"],
        alignment=TA_CENTER,
        fontName='Helvetica',
    ))
    
    return styles


# Table styles
TABLE_STYLE_HEADER = [
    ('BACKGROUND', (0, 0), (-1, 0), COLORS["primary"]),
    ('TEXTCOLOR', (0, 0), (-1, 0), COLORS["white"]),
    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
    ('TOPPADDING', (0, 0), (-1, 0), 12),
]

TABLE_STYLE_BODY = [
    ('BACKGROUND', (0, 1), (-1, -1), COLORS["white"]),
    ('TEXTCOLOR', (0, 1), (-1, -1), COLORS["dark"]),
    ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ('TOPPADDING', (0, 1), (-1, -1), 8),
    ('GRID', (0, 0), (-1, -1), 0.5, COLORS["light"]),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS["white"], COLORS["light"]]),
]

TABLE_STYLE_DEFAULT = TABLE_STYLE_HEADER + TABLE_STYLE_BODY


# Card-like box style for items
CARD_STYLE = {
    "background": COLORS["light"],
    "border_color": COLORS["medium"],
    "border_width": 0.5,
    "padding": 12,
    "corner_radius": 4,
}

