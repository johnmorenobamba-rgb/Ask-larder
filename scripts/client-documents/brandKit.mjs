// Shared styling for every Larder business document (CSA, Order Form,
// Pricing Schedule, Invoice) -- keeps all four visually consistent and
// reuses the exact palette/type system from src/app/globals.css and
// CLAUDE.md's Branding Kit, not generic Word theme colors.
//
// Fonts: Word renders whatever font is installed on the reader's machine
// and falls back silently if it isn't -- Space Grotesk/Inter/IBM Plex Mono
// are real, freely available Google Fonts, so this is the same tradeoff
// every branded Word template makes, not a broken document if a recipient
// lacks them installed.
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  VerticalAlign,
  LevelFormat,
  convertInchesToTwip,
  ImageRun,
} from "docx";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const BULLET_LIST_REFERENCE = "brand-bullet-list";

// Rendered by render-brand-assets.mjs from the real ChitMark idle-state
// math (LARDER_MARK_PATH + the same 22%-of-path glow-segment fraction the
// app uses), frozen at one position rather than animated -- "looks like
// it's moving, but it isn't," per instruction. Re-run that script if the
// banner copy or colors ever need to change; these two PNGs are generated
// artifacts, not hand-drawn assets.
const HEADER_BAND_PATH = path.join(__dirname, "assets/header-band.png");
const FOOTER_BAND_PATH = path.join(__dirname, "assets/footer-band.png");

// Source assets are rendered at 1286x260 / 1286x46 (2x) for print
// crispness; placed at half that pixel size here so they're sharp without
// being physically oversized on the page.
const HEADER_BAND_ASPECT = 260 / 1286;
const FOOTER_BAND_ASPECT = 46 / 1286;

export const COLORS = {
  ink: "1F1B16",
  parchment: "F2E9D8",
  preserveRed: "B23A2C",
  saffron: "E8A93B",
  bayGreen: "55603C",
  clayBrown: "7A5C43",
  white: "FFFFFF",
};

export const FONTS = {
  display: "Space Grotesk",
  body: "Inter",
  mono: "IBM Plex Mono",
};

// DXA page setup, A4 with generous margins for a printable legal document.
// HEADER_DISTANCE/FOOTER_DISTANCE are how far the header/footer band sits
// from the physical page edge; the body TOP/BOTTOM margins are set wide
// enough to clear the banner art so it never overlaps body text.
const HEADER_DISTANCE = 320;
const FOOTER_DISTANCE = 320;
export const PAGE = {
  size: { width: 11906, height: 16838 }, // A4 in DXA
  margins: { top: 2350, bottom: 1550, left: 1418, right: 1418, header: HEADER_DISTANCE, footer: FOOTER_DISTANCE },
};

// Content width = page width minus left/right margins -- every table's
// column widths must sum to exactly this, and it's what the header/footer
// banner images are sized to, so both line up with the page's actual
// printable edges instead of guessing a round number.
export const CONTENT_WIDTH_DXA = PAGE.size.width - PAGE.margins.left - PAGE.margins.right;

export const numberingConfig = {
  config: [
    {
      reference: BULLET_LIST_REFERENCE,
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: { indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.2) } },
            run: { color: COLORS.preserveRed },
          },
        },
      ],
    },
  ],
};

export function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: BULLET_LIST_REFERENCE, level: 0 },
    spacing: { after: opts.after ?? 100 },
    children: [new TextRun({ text, font: FONTS.body, color: COLORS.ink, size: 21 })],
  });
}

// Real Word Header/Footer (repeats every page), not body content -- the
// old letterhead() paragraphs only ever appeared once, at the top of page
// 1. The banner art is pre-rendered (render-brand-assets.mjs) since docx-js
// has no diagonal-clip shape primitive; ImageRun just places the PNG.
export function makeHeader() {
  const width = Math.round((CONTENT_WIDTH_DXA / 1440) * 96);
  const height = Math.round(width * HEADER_BAND_ASPECT);
  return new Header({
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new ImageRun({
            type: "png",
            data: readFileSync(HEADER_BAND_PATH),
            transformation: { width, height },
          }),
        ],
      }),
    ],
  });
}

export function docTitle(title, subtitle) {
  const paras = [
    new Paragraph({
      spacing: { after: subtitle ? 40 : 200 },
      children: [new TextRun({ text: title, font: FONTS.display, bold: true, color: COLORS.ink, size: 44 })],
    }),
  ];
  if (subtitle) {
    paras.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: subtitle, font: FONTS.mono, color: COLORS.clayBrown, size: 18 })],
      }),
    );
  }
  return paras;
}

export function label(text) {
  return new Paragraph({
    spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: text.toUpperCase(), font: FONTS.mono, color: COLORS.clayBrown, size: 15 })],
  });
}

export function clauseHeading(numberAndTitle) {
  return new Paragraph({
    spacing: { before: 260, after: 100 },
    children: [
      new TextRun({ text: numberAndTitle, font: FONTS.display, bold: true, color: COLORS.ink, size: 24 }),
    ],
  });
}

export function subclause(text) {
  return new Paragraph({
    spacing: { after: 120 },
    indent: { left: 260 },
    children: [new TextRun({ text, font: FONTS.body, color: COLORS.ink, size: 21 })],
  });
}

export function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120 },
    children: [
      new TextRun({ text, font: FONTS.body, color: COLORS.ink, size: opts.size ?? 21, bold: opts.bold ?? false }),
    ],
  });
}

// A blank fill-in line: a label above a bottom-bordered paragraph, the
// classic printed-form technique (avoids the underscore-run approach, which
// reflows unevenly across viewers).
export function fillLine(fieldLabel, opts = {}) {
  return [
    new Paragraph({
      spacing: { before: 160, after: 20 },
      children: [new TextRun({ text: fieldLabel.toUpperCase(), font: FONTS.mono, color: COLORS.clayBrown, size: 14 })],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.clayBrown, space: 4 } },
      spacing: { after: opts.after ?? 40 },
      children: [new TextRun({ text: opts.prefill ?? " ", font: FONTS.body, color: COLORS.ink, size: 21 })],
    }),
  ];
}

export function checkboxOption(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 200 },
    children: [
      new TextRun({ text: "☐  ", font: FONTS.body, color: COLORS.ink, size: 21 }),
      new TextRun({ text, font: FONTS.body, color: COLORS.ink, size: 21, bold: opts.bold ?? false }),
    ],
  });
}

export function sectionRule() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.clayBrown, space: 4 } },
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: "", size: 2 })],
  });
}

// columnWidths in DXA, must sum to exactly CONTENT_WIDTH_DXA. Header row gets a Parchment-tinted
// shaded background (ShadingType.CLEAR, per the skill's own gotcha --
// SOLID renders black).
export function simpleTable(headers, rows, columnWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h, i) =>
        new TableCell({
          width: { size: columnWidths[i], type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: COLORS.parchment },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, font: FONTS.mono, bold: true, color: COLORS.ink, size: 16 })],
            }),
          ],
        }),
    ),
  });

  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell, i) =>
            new TableCell({
              width: { size: columnWidths[i], type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 90, bottom: 90, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(cell), font: FONTS.body, color: COLORS.ink, size: 20 })],
                }),
              ],
            }),
        ),
      }),
  );

  return new Table({
    width: { size: columnWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths,
    rows: [headerRow, ...bodyRows],
  });
}

export function makeFooter(docLabel) {
  const width = Math.round((CONTENT_WIDTH_DXA / 1440) * 96);
  const height = Math.round(width * FOOTER_BAND_ASPECT);
  return new Footer({
    children: [
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new ImageRun({ type: "png", data: readFileSync(FOOTER_BAND_PATH), transformation: { width, height } }),
        ],
      }),
      new Paragraph({
        tabStops: [{ type: "right", position: CONTENT_WIDTH_DXA }],
        children: [
          new TextRun({ text: `Larder — ${docLabel}`, font: FONTS.mono, color: COLORS.clayBrown, size: 14 }),
          new TextRun({ text: "\t", font: FONTS.mono, size: 14 }),
          new TextRun({ text: "Page ", font: FONTS.mono, color: COLORS.clayBrown, size: 14 }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONTS.mono, color: COLORS.clayBrown, size: 14 }),
          new TextRun({ text: " of ", font: FONTS.mono, color: COLORS.clayBrown, size: 14 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONTS.mono, color: COLORS.clayBrown, size: 14 }),
        ],
      }),
    ],
  });
}

export function makeDocument({ title, subtitle, sections, docLabel }) {
  return new Document({
    numbering: numberingConfig,
    styles: {
      default: {
        document: { run: { font: FONTS.body, size: 21, color: COLORS.ink } },
      },
    },
    sections: [
      {
        properties: { page: { size: PAGE.size, margin: PAGE.margins } },
        headers: { default: makeHeader() },
        footers: { default: makeFooter(docLabel) },
        children: [...docTitle(title, subtitle), ...sections],
      },
    ],
  });
}

export {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  VerticalAlign,
};
