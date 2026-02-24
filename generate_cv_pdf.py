#!/usr/bin/env python3
"""Generate a styled CV PDF from cv.txt.

The output is a simple, printable PDF with a clean visual theme:
- dark background
- decorative rings/stars
- hero card with contact line
- metric cards
- sectioned text content
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import textwrap


PAGE_WIDTH = 595
PAGE_HEIGHT = 842
MARGIN_X = 36
CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_X


def pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap_text(text: str, width: float, font_size: float, bold: bool = False) -> list[str]:
    if not text:
        return [""]
    char_factor = 0.56 if bold else 0.53
    max_chars = max(12, int(width / (font_size * char_factor)))
    return textwrap.wrap(text, width=max_chars, break_long_words=False, break_on_hyphens=False) or [text]


def circle_path(cx: float, cy: float, radius: float) -> str:
    # Cubic Bezier circle approximation.
    kappa = 0.5522847498
    c = radius * kappa
    return (
        f"{cx + radius:.2f} {cy:.2f} m "
        f"{cx + radius:.2f} {cy + c:.2f} {cx + c:.2f} {cy + radius:.2f} {cx:.2f} {cy + radius:.2f} c "
        f"{cx - c:.2f} {cy + radius:.2f} {cx - radius:.2f} {cy + c:.2f} {cx - radius:.2f} {cy:.2f} c "
        f"{cx - radius:.2f} {cy - c:.2f} {cx - c:.2f} {cy - radius:.2f} {cx:.2f} {cy - radius:.2f} c "
        f"{cx + c:.2f} {cy - radius:.2f} {cx + radius:.2f} {cy - c:.2f} {cx + radius:.2f} {cy:.2f} c "
    )


@dataclass
class Theme:
    bg: tuple[float, float, float] = (0.03, 0.06, 0.14)
    panel: tuple[float, float, float] = (0.07, 0.13, 0.28)
    panel_alt: tuple[float, float, float] = (0.06, 0.11, 0.24)
    border: tuple[float, float, float] = (0.22, 0.33, 0.50)
    text: tuple[float, float, float] = (0.90, 0.95, 0.99)
    muted: tuple[float, float, float] = (0.77, 0.84, 0.91)
    accent: tuple[float, float, float] = (0.91, 0.76, 0.50)
    accent_alt: tuple[float, float, float] = (0.56, 0.44, 0.74)


class StyledPdf:
    def __init__(self) -> None:
        self.theme = Theme()
        self.page_streams: list[str] = []
        self.current_stream: list[str] = []
        self.page_no = 0

    def cmd(self, line: str) -> None:
        self.current_stream.append(line + "\n")

    def color_fill(self, rgb: tuple[float, float, float]) -> None:
        self.cmd(f"{rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} rg")

    def color_stroke(self, rgb: tuple[float, float, float]) -> None:
        self.cmd(f"{rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} RG")

    def rect(
        self,
        x: float,
        y: float,
        w: float,
        h: float,
        *,
        fill: tuple[float, float, float] | None = None,
        stroke: tuple[float, float, float] | None = None,
        line_width: float = 1.0,
    ) -> None:
        if fill is not None:
            self.color_fill(fill)
        if stroke is not None:
            self.color_stroke(stroke)
            self.cmd(f"{line_width:.2f} w")
        self.cmd(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re")
        if fill is not None and stroke is not None:
            self.cmd("B")
        elif fill is not None:
            self.cmd("f")
        else:
            self.cmd("S")

    def text(self, x: float, y: float, value: str, *, size: float = 11, font: str = "F1", color: tuple[float, float, float] | None = None) -> None:
        if color is not None:
            self.color_fill(color)
        self.cmd("BT")
        self.cmd(f"/{font} {size:.2f} Tf")
        self.cmd(f"1 0 0 1 {x:.2f} {y:.2f} Tm")
        self.cmd(f"({pdf_escape(value)}) Tj")
        self.cmd("ET")

    def draw_decor(self) -> None:
        # Base dark background.
        self.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=self.theme.bg)

        # Soft corner glows as simple circles.
        self.color_fill((0.08, 0.18, 0.30))
        self.cmd(circle_path(40, PAGE_HEIGHT - 40, 170) + "f")
        self.color_fill((0.12, 0.10, 0.24))
        self.cmd(circle_path(PAGE_WIDTH - 60, 120, 200) + "f")

        # Top decorative rings.
        self.color_stroke(self.theme.border)
        self.cmd("1.25 w")
        self.cmd(circle_path(PAGE_WIDTH - 78, PAGE_HEIGHT - 66, 24) + "S")
        self.cmd(circle_path(PAGE_WIDTH - 78, PAGE_HEIGHT - 66, 40) + "S")

        # Star dots.
        self.color_fill((0.82, 0.92, 1.0))
        for i in range(24):
            x = 20 + (i * 23) % (PAGE_WIDTH - 40)
            y = 90 + (i * 67) % (PAGE_HEIGHT - 140)
            size = 1.2 if i % 3 else 1.8
            self.rect(x, y, size, size, fill=(0.82, 0.92, 1.0))

    def begin_page(self, name: str, subtitle: str, *, first_page: bool) -> None:
        self.page_no += 1
        self.current_stream = []
        self.draw_decor()

        header_h = 86 if first_page else 56
        header_y = PAGE_HEIGHT - 36 - header_h
        self.rect(
            MARGIN_X,
            header_y,
            CONTENT_WIDTH,
            header_h,
            fill=self.theme.panel,
            stroke=self.theme.border,
            line_width=1.1,
        )

        self.text(MARGIN_X + 16, header_y + header_h - 32, name, size=24 if first_page else 18, font="F2", color=self.theme.accent)
        self.text(MARGIN_X + 16, header_y + header_h - 52, subtitle, size=11, font="F1", color=self.theme.text)

        if not first_page:
            self.text(PAGE_WIDTH - 102, header_y + 12, f"Page {self.page_no}", size=9.5, font="F1", color=self.theme.muted)

    def finish_page(self) -> None:
        self.page_streams.append("".join(self.current_stream))
        self.current_stream = []

    def write_pdf(self, path: Path) -> None:
        objects: dict[int, bytes] = {
            1: b"<< /Type /Catalog /Pages 2 0 R >>",
            3: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            4: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
        }

        page_object_ids: list[int] = []
        next_id = 5

        for stream in self.page_streams:
            page_id = next_id
            content_id = next_id + 1
            next_id += 2
            page_object_ids.append(page_id)

            stream_bytes = stream.encode("latin-1", errors="replace")
            objects[content_id] = (
                f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("ascii")
                + stream_bytes
                + b"endstream"
            )

            objects[page_id] = (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
                f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {content_id} 0 R >>"
            ).encode("ascii")

        kids = " ".join(f"{n} 0 R" for n in page_object_ids)
        objects[2] = f"<< /Type /Pages /Count {len(page_object_ids)} /Kids [{kids}] >>".encode("ascii")

        ordered = sorted(objects)
        output_parts: list[bytes] = [b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"]
        offsets = {0: 0}

        for obj_id in ordered:
            offsets[obj_id] = sum(len(p) for p in output_parts)
            output_parts.append(f"{obj_id} 0 obj\n".encode("ascii"))
            output_parts.append(objects[obj_id])
            output_parts.append(b"\nendobj\n")

        xref_pos = sum(len(p) for p in output_parts)
        max_id = max(ordered)
        xref = [f"xref\n0 {max_id + 1}\n".encode("ascii"), b"0000000000 65535 f \n"]
        for i in range(1, max_id + 1):
            xref.append(f"{offsets.get(i, 0):010d} 00000 n \n".encode("ascii"))

        trailer = (
            f"trailer\n<< /Size {max_id + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode("ascii")

        path.write_bytes(b"".join(output_parts + xref + [trailer]))


def load_cv_lines(path: Path) -> tuple[str, str, list[str]]:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    non_empty = [ln.strip() for ln in lines if ln.strip()]
    name = non_empty[0] if non_empty else "Iro Karavasili"
    subtitle = non_empty[1] if len(non_empty) > 1 else "Atlassian Engineer - Service Delivery - Process Design"

    # Preserve original spacing but skip first two non-empty lines (name + subtitle).
    skipped = 0
    remaining: list[str] = []
    for ln in lines:
        if ln.strip():
            skipped += 1
            if skipped <= 2:
                continue
        remaining.append(ln.rstrip())
    return name, subtitle, remaining


def generate() -> None:
    src = Path("cv.txt")
    out = Path("cv.pdf")

    name, subtitle, lines = load_cv_lines(src)
    pdf = StyledPdf()
    pdf.begin_page(name, subtitle, first_page=True)

    # Header contact line.
    contact_line = "Email: iro-k@outlook.com  |  LinkedIn: linkedin.com/in/iro-karavasili-37379ab8  |  Location: Greece"
    pdf.text(MARGIN_X + 16, PAGE_HEIGHT - 118, contact_line, size=9.2, font="F1", color=pdf.theme.muted)

    # Metrics row.
    metrics = [
        ("7+", "Years in Atlassian environments"),
        ("5", "Enterprise environments supported"),
        ("10+", "Atlassian Marketplace apps"),
        ("Cloud & DC", "Platform expertise"),
    ]
    container_y = PAGE_HEIGHT - 216
    pdf.rect(MARGIN_X, container_y, CONTENT_WIDTH, 88, fill=pdf.theme.panel_alt, stroke=pdf.theme.border, line_width=1.0)
    gap = 8
    card_w = (CONTENT_WIDTH - gap * 5) / 4
    for idx, (value, label) in enumerate(metrics):
        x = MARGIN_X + gap + idx * (card_w + gap)
        y = container_y + 12
        pdf.rect(x, y, card_w, 64, fill=(0.08, 0.14, 0.30), stroke=pdf.theme.border, line_width=0.8)
        pdf.text(x + 8, y + 38, value, size=16 if idx < 3 else 13.5, font="F2", color=pdf.theme.accent)
        wrapped = wrap_text(label, card_w - 14, 8.8, bold=False)
        text_y = y + 18
        for line in wrapped[:2]:
            pdf.text(x + 8, text_y, line, size=8.8, font="F1", color=pdf.theme.muted)
            text_y -= 10

    headings = {
        "Contact",
        "Languages",
        "Professional Summary",
        "Current Focus",
        "Core Strengths",
        "Tools and Platforms",
        "Atlassian Ecosystem",
        "Delivery and Operations",
        "Process and Governance",
        "Experience",
        "Education",
        "Certifications",
        "Interests",
    }

    x_text = MARGIN_X + 12
    y = container_y - 18
    bottom_limit = 56

    def new_page() -> float:
        pdf.finish_page()
        pdf.begin_page(name, subtitle, first_page=False)
        return PAGE_HEIGHT - 112

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            y -= 7
            if y < bottom_limit:
                y = new_page()
            continue

        is_heading = line in headings and not line.startswith("-")
        is_bullet = line.startswith("- ")

        if is_heading:
            y -= 6
            if y < bottom_limit + 16:
                y = new_page()
            pdf.text(x_text, y, line.upper(), size=11, font="F2", color=pdf.theme.accent)
            y -= 14
            continue

        if is_bullet:
            item = line[2:].strip()
            wrapped = wrap_text(item, CONTENT_WIDTH - 38, 9.6, bold=False)
            for i, part in enumerate(wrapped):
                if y < bottom_limit + 10:
                    y = new_page()
                prefix = "- " if i == 0 else "  "
                pdf.text(x_text + 8, y, f"{prefix}{part}", size=9.6, font="F1", color=pdf.theme.text)
                y -= 12
            continue

        wrapped = wrap_text(line, CONTENT_WIDTH - 24, 9.8, bold=False)
        for part in wrapped:
            if y < bottom_limit + 10:
                y = new_page()
            pdf.text(x_text, y, part, size=9.8, font="F1", color=pdf.theme.text)
            y -= 12

    pdf.finish_page()
    pdf.write_pdf(out)
    print(f"Generated {out} with {len(pdf.page_streams)} page(s).")


if __name__ == "__main__":
    generate()
