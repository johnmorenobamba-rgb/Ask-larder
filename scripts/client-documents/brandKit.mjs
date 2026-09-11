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
} from "docx";

export const BULLET_LIST_REFERENCE = "brand-bullet-list";

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
export const PAGE = {
  size: { width: 11906, height: 16838 }, // A4 in DXA
  margins: { top: 1418, bottom: 1418, left: 1418, right: 1418 }, // ~1in
};

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

export function letterhead() {
  return [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: "LARDER", font: FONTS.display, bold: true, color: COLORS.preserveRed, size: 32 }),
      ],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.ink, space: 6 } },
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "YOUR SOPS, ALWAYS ON SHIFT",
          font: FONTS.mono,
          color: COLORS.clayBrown,
          size: 14,
        }),
      ],
    }),
  ];
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

// columnWidths in DXA, must sum to the content width used below (9638 --
// A4 minus 1in margins each side). Header row gets a Parchment-tinted
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
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.clayBrown, space: 6 } },
        tabStops: [{ type: "right", position: 9638 }],
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
        footers: { default: makeFooter(docLabel) },
        children: [...letterhead(), ...docTitle(title, subtitle), ...sections],
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
