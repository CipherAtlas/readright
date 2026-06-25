import type { EvidenceTopic } from "../../types/evidence";
import type { Branch, ReasonNode, Tone, Workspace, WorkspaceSource } from "./types";
import { confidenceLabels } from "./labels";
import { getBranchReasonNodes, getSourceRecords } from "./workspace";

export function exportSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return slug || "readright-export";
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportRows(workspace: Workspace, topic: EvidenceTopic) {
  const branchRows = [
    ...workspace.supports.map((branch) => ["For", branch] as const),
    ...workspace.opposes.map((branch) => ["Against", branch] as const),
    ...workspace.neutral.map((branch) => ["Neutral", branch] as const),
  ].flatMap(([stance, branch]) => [
    {
      section: stance,
      type: "Argument",
      title: branch.title,
      detail: branch.rationale,
      evidence: branch.studiesLabel,
      confidence: branch.confidence,
      sources: branch.sourceIds.join(", "),
    },
	    ...getBranchReasonNodes(branch).map((reason) => ({
      section: stance,
      type: "Reason",
      title: reason.title,
      detail: reason.detail,
      evidence: reason.badge,
      confidence: branch.confidence,
      sources: reason.sourceIds.join(", "),
    })),
  ]);

  const sourceRows = workspace.sources.map((source) => ({
    section: "Sources",
    type: source.type,
    title: source.title,
    detail: source.takeaway,
    evidence: source.direction,
    confidence: confidenceLabels[source.quality],
    sources: source.url || source.id,
  }));

  return [
    {
      section: "Claim",
      type: "Verdict",
      title: workspace.claim,
      detail: topic.verdict.summary,
      evidence: `${topic.claims.length} claim assessment${topic.claims.length === 1 ? "" : "s"}`,
      confidence: confidenceLabels[workspace.confidence],
      sources: topic.sources.length.toString(),
    },
    {
      section: "Claim",
      type: "Responsible wording",
      title: workspace.normalizedClaim,
      detail: workspace.summary,
      evidence: "",
      confidence: confidenceLabels[workspace.confidence],
      sources: "",
    },
    ...branchRows,
    ...sourceRows,
  ];
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(workspace: Workspace, topic: EvidenceTopic) {
  const headers = ["Section", "Type", "Title", "Detail", "Evidence", "Confidence", "Sources"];
  const rows = exportRows(workspace, topic).map((row) => [
    row.section,
    row.type,
    row.title,
    row.detail,
    row.evidence,
    row.confidence,
    row.sources,
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function zipFiles(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    localParts.push(local, contentBytes);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);
    offset += local.length + contentBytes.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, offset, true);
  return concatBytes([...localParts, centralDirectory, end]);
}

function docxParagraph(text: unknown, style?: string) {
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

export function buildDocx(workspace: Workspace, topic: EvidenceTopic) {
  const rows = exportRows(workspace, topic);
  const body = [
    docxParagraph("ReadRight Evidence Review", "Title"),
    docxParagraph(workspace.claim, "Heading1"),
    docxParagraph(`Verdict: ${confidenceLabels[workspace.confidence]}`),
    docxParagraph(topic.verdict.summary),
    docxParagraph("Responsible wording", "Heading1"),
    docxParagraph(workspace.normalizedClaim),
    docxParagraph("Arguments and Evidence", "Heading1"),
    ...rows.slice(2).flatMap((row) => [
      docxParagraph(`${row.section} - ${row.type}: ${row.title}`, "Heading2"),
      docxParagraph(row.detail),
      docxParagraph(`Evidence: ${row.evidence || "n/a"} | Confidence: ${row.confidence || "n/a"}`),
      row.sources ? docxParagraph(`Sources: ${row.sources}`) : "",
    ]),
  ].join("");

  return zipFiles([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    {
      name: "word/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`,
    },
    {
      name: "word/document.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>`,
    },
  ]);
}

function spreadsheetCell(value: unknown) {
  return `<c t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

export function buildXlsx(workspace: Workspace, topic: EvidenceTopic) {
  const rows = [
    ["Section", "Type", "Title", "Detail", "Evidence", "Confidence", "Sources"],
    ...exportRows(workspace, topic).map((row) => [
      row.section,
      row.type,
      row.title,
      row.detail,
      row.evidence,
      row.confidence,
      row.sources,
    ]),
  ];
  const sheetRows = rows
    .map((row, index) => `<row r="${index + 1}">${row.map(spreadsheetCell).join("")}</row>`)
    .join("");

  return zipFiles([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Evidence map" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
    },
  ]);
}

type PdfToneStyle = {
  accent: string;
  fill: string;
  label: string;
  soft: string;
  stroke: string;
};

const pdfTonePalette: Record<Tone, PdfToneStyle> = {
  claim: {
    accent: "#b7811c",
    fill: "#fffaf0",
    label: "Claim",
    soft: "#fff8e8",
    stroke: "#e1c079",
  },
  support: {
    accent: "#5d855e",
    fill: "#f2f8ef",
    label: "Supports",
    soft: "#e7f2e2",
    stroke: "#9ab894",
  },
  oppose: {
    accent: "#e7664f",
    fill: "#fff4ef",
    label: "Opposes",
    soft: "#ffe4dc",
    stroke: "#efa08f",
  },
  evidence: {
    accent: "#d99a18",
    fill: "#fff8e9",
    label: "Evidence",
    soft: "#ffedbd",
    stroke: "#e3ba67",
  },
  assumption: {
    accent: "#9a9a90",
    fill: "#ffffff",
    label: "Assumption",
    soft: "#eee9df",
    stroke: "#e7e1d7",
  },
  neutral: {
    accent: "#9a9a90",
    fill: "#ffffff",
    label: "Neutral",
    soft: "#eee9df",
    stroke: "#e7e1d7",
  },
};

const montserratSemiBoldUrl = new URL("../../assets/fonts/Montserrat-SemiBold.ttf", import.meta.url).href;
const montserratBoldUrl = new URL("../../assets/fonts/Montserrat-Bold.ttf", import.meta.url).href;

function pdfTextTone(source: WorkspaceSource): Tone {
  if (source.direction === "Supports") return "support";
  if (source.direction === "Opposes") return "oppose";
  return "neutral";
}

function normalizePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "?");
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}

let pdfFontLoadPromise: Promise<{ bold: string; semibold: string }> | null = null;

function loadPdfFonts() {
  pdfFontLoadPromise ??= Promise.all([
    fetch(montserratSemiBoldUrl).then((response) => response.arrayBuffer()),
    fetch(montserratBoldUrl).then((response) => response.arrayBuffer()),
  ]).then(([semibold, bold]) => ({
    bold: arrayBufferToBase64(bold),
    semibold: arrayBufferToBase64(semibold),
  }));
  return pdfFontLoadPromise;
}

export async function buildPdf(workspace: Workspace, topic: EvidenceTopic) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 22;
  const colors = {
    border: "#e8dfd0",
    ink: "#10100e",
    muted: "#6d6a61",
    panel: "#fffdf7",
    surface: "#f7f2e8",
  };
  let y = margin;

  try {
    const fonts = await loadPdfFonts();
    doc.addFileToVFS("Montserrat-SemiBold.ttf", fonts.semibold);
    doc.addFont("Montserrat-SemiBold.ttf", "Montserrat", "normal");
    doc.addFileToVFS("Montserrat-Bold.ttf", fonts.bold);
    doc.addFont("Montserrat-Bold.ttf", "Montserrat", "bold");
  } catch {
    // The export still works with built-in fonts if the bundled font asset cannot be read.
  }

  const hasMontserrat = doc.getFontList().Montserrat;

  function headingFont(style: "normal" | "bold" = "bold") {
    doc.setFont(hasMontserrat ? "Montserrat" : "helvetica", style);
  }

  function bodyFont(style: "normal" | "bold" = "normal") {
    doc.setFont("helvetica", style);
  }

  function text(value: unknown, x: number, top: number, {
    align = "left",
    color = colors.ink,
    fontSize = 9.5,
    font = "body",
    lineGap = 4.4,
    maxWidth,
    style = "normal",
  }: {
    align?: "left" | "center" | "right";
    color?: string;
    fontSize?: number;
    font?: "body" | "heading";
    lineGap?: number;
    maxWidth?: number;
    style?: "normal" | "bold";
  } = {}) {
    if (font === "heading") headingFont(style);
    else bodyFont(style);
    doc.setFontSize(fontSize);
    doc.setTextColor(color);
    const lines = maxWidth
      ? doc.splitTextToSize(normalizePdfText(value), maxWidth)
      : [normalizePdfText(value)];
    doc.text(lines, x, top, { align });
    return top + lines.length * lineGap;
  }

  function estimateTextHeight(value: unknown, maxWidth: number, fontSize = 9.5, lineGap = 4.4, font: "body" | "heading" = "body") {
    if (font === "heading") headingFont("bold");
    else bodyFont();
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(normalizePdfText(value), maxWidth).length * lineGap;
  }

  function fillRoundedRect(x: number, top: number, width: number, height: number, fill: string, stroke?: string, radius = 3) {
    doc.setFillColor(fill);
    if (stroke) {
      doc.setDrawColor(stroke);
      doc.setLineWidth(0.35);
      doc.roundedRect(x, top, width, height, radius, radius, "FD");
    } else {
      doc.roundedRect(x, top, width, height, radius, radius, "F");
    }
  }

  function ensureSpace(height: number) {
    if (y + height <= pageHeight - bottomMargin) return;
    doc.addPage();
    y = margin + 8;
  }

  function addPill(label: string, x: number, top: number, tone: Tone, width?: number) {
    const palette = pdfTonePalette[tone];
    const pillWidth = width ?? Math.max(23, doc.getTextWidth(label) + 10);
    fillRoundedRect(x, top, pillWidth, 7, palette.fill, palette.stroke, 3.5);
    text(label, x + pillWidth / 2, top + 4.8, {
      align: "center",
      color: palette.accent,
      font: "heading",
      fontSize: 6.9,
      lineGap: 3,
      style: "bold",
    });
    return pillWidth;
  }

  function sectionHeading(label: string, tone: Tone = "neutral") {
    ensureSpace(16);
    const palette = pdfTonePalette[tone];
    doc.setFillColor(palette.accent);
    doc.roundedRect(margin, y + 1.5, 2.2, 10, 1, 1, "F");
    y = text(label, margin + 5.5, y + 9.2, {
      color: palette.accent,
      font: "heading",
      fontSize: 14,
      lineGap: 7,
      maxWidth: contentWidth - 8,
      style: "bold",
    });
    y += 2;
  }

  function addMetricCard(label: string, value: string, tone: Tone, x: number, top: number, width: number) {
    const palette = pdfTonePalette[tone];
    fillRoundedRect(x, top, width, 20, palette.fill, palette.stroke, 4);
    text(value, x + 5, top + 8.8, {
      color: palette.accent,
      font: "heading",
      fontSize: 14,
      lineGap: 6,
      style: "bold",
    });
    text(label, x + 5, top + 15.6, {
      color: colors.muted,
      font: "heading",
      fontSize: 6.8,
      lineGap: 4,
      style: "normal",
    });
  }

  function addSummaryPage() {
    doc.setFillColor(colors.surface);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    fillRoundedRect(margin, margin, contentWidth, 49, colors.panel, colors.border, 5);
    addPill("READRIGHT", margin + 8, margin + 7, "claim", 29);
    text("Evidence Review", margin + 8, margin + 25, {
      font: "heading",
      fontSize: 22,
      lineGap: 10,
      maxWidth: contentWidth - 16,
      style: "bold",
    });
    text(`Generated report - ${topic.id}`, margin + 8, margin + 35.5, {
      color: colors.muted,
      font: "heading",
      fontSize: 7.8,
      lineGap: 4,
      maxWidth: contentWidth - 16,
    });

    y = margin + 59;
    fillRoundedRect(margin, y, contentWidth, 48, "#ffffff", colors.border, 5);
    addPill("CLAIM", margin + 8, y + 8, "claim", 22);
    text(workspace.claim, margin + 8, y + 24, {
      color: pdfTonePalette.claim.accent,
      font: "heading",
      fontSize: 13.5,
      lineGap: 6,
      maxWidth: contentWidth - 16,
      style: "bold",
    });
    text(`Verdict: ${confidenceLabels[workspace.confidence]}`, margin + 8, y + 36.5, {
      color: colors.ink,
      font: "heading",
      fontSize: 8.8,
      lineGap: 4,
      style: "normal",
    });

    y += 58;
    const metricGap = 4;
    const metricWidth = (contentWidth - metricGap * 3) / 4;
    addMetricCard("For", String(workspace.supports.length), "support", margin, y, metricWidth);
    addMetricCard("Against", String(workspace.opposes.length), "oppose", margin + metricWidth + metricGap, y, metricWidth);
    addMetricCard("Neutral", String(workspace.neutral.length), "neutral", margin + (metricWidth + metricGap) * 2, y, metricWidth);
    addMetricCard("Sources", String(workspace.sources.length), "evidence", margin + (metricWidth + metricGap) * 3, y, metricWidth);

    y += 30;
    sectionHeading("Main overview", "claim");
    fillRoundedRect(margin, y, contentWidth, 35, "#ffffff", colors.border, 4);
    text(topic.verdict.summary, margin + 7, y + 9.5, {
      color: colors.ink,
      fontSize: 10,
      lineGap: 5.2,
      maxWidth: contentWidth - 14,
    });
    y += 45;

    sectionHeading("Colour key", "evidence");
    const keyWidth = (contentWidth - 9) / 4;
    ([
      ["Supports", "support"],
      ["Opposes", "oppose"],
      ["Evidence", "evidence"],
      ["Assumption", "assumption"],
    ] as Array<[string, Tone]>).forEach(([label, tone], index) => {
      const x = margin + index * (keyWidth + 3);
      const palette = pdfTonePalette[tone];
      fillRoundedRect(x, y, keyWidth, 18, palette.fill, palette.stroke, 4);
      doc.setFillColor(palette.accent);
      doc.circle(x + 6, y + 9, 2, "F");
      text(label, x + 11, y + 10.8, {
        color: palette.accent,
        font: "heading",
        fontSize: 7.2,
        lineGap: 4,
        maxWidth: keyWidth - 14,
        style: "bold",
      });
    });
    y += 28;

    sectionHeading("Responsible wording", "claim");
    const wordingHeight = Math.max(21, estimateTextHeight(workspace.normalizedClaim, contentWidth - 14, 10.2, 5.2) + 14);
    fillRoundedRect(margin, y, contentWidth, wordingHeight, "#ffffff", colors.border, 4);
    text(workspace.normalizedClaim, margin + 7, y + 10, {
      color: colors.ink,
      fontSize: 10.2,
      lineGap: 5.2,
      maxWidth: contentWidth - 14,
    });
    y += wordingHeight + 6;
  }

  function addBranchCard(branch: Branch, index: number) {
    const palette = pdfTonePalette[branch.tone];
    const bodyWidth = contentWidth - 24;
    const titleHeight = estimateTextHeight(`${index + 1}. ${branch.title}`, bodyWidth, 9.6, 4.8, "heading");
    const rationaleHeight = Math.min(22, estimateTextHeight(branch.rationale, bodyWidth, 8.5, 4.4));
    const cardHeight = Math.max(39, titleHeight + rationaleHeight + 21);
    ensureSpace(cardHeight + 5);

    fillRoundedRect(margin, y, contentWidth, cardHeight, palette.fill, palette.stroke, 4);
    doc.setFillColor(palette.accent);
    doc.roundedRect(margin, y, 3, cardHeight, 1.5, 1.5, "F");
    addPill(branch.status, margin + 8, y + 7, branch.tone, 24);
    text(`${index + 1}. ${branch.title}`, margin + 36, y + 12.3, {
      color: palette.accent,
      font: "heading",
      fontSize: 9.6,
      lineGap: 4.8,
      maxWidth: contentWidth - 45,
      style: "bold",
    });
    text(`${branch.confidence} confidence  |  ${branch.reasonsLabel}  |  ${branch.studiesLabel}`, margin + 8, y + 22.8, {
      color: colors.muted,
      font: "heading",
      fontSize: 7.1,
      lineGap: 3.8,
      maxWidth: bodyWidth,
    });
    text(branch.rationale, margin + 8, y + 31.5, {
      color: colors.ink,
      fontSize: 8.5,
      lineGap: 4.4,
      maxWidth: bodyWidth,
    });
    y += cardHeight + 5;
  }

  function addBranchGroup(label: string, branches: Branch[], tone: Tone) {
    sectionHeading(`${label} (${branches.length})`, tone);
    if (!branches.length) {
      ensureSpace(18);
      fillRoundedRect(margin, y, contentWidth, 16, "#ffffff", colors.border, 4);
      text("No branches in this group.", margin + 7, y + 10.5, { color: colors.muted, fontSize: 8.8 });
      y += 22;
      return;
    }
    branches.forEach(addBranchCard);
  }

  function addReasonCard(reason: ReasonNode, index: number) {
    const palette = pdfTonePalette[reason.tone];
    const bodyWidth = contentWidth - 18;
    const detailHeight = estimateTextHeight(reason.detail, bodyWidth, 8.3, 4.3);
    const cardHeight = Math.max(31, detailHeight + 23);
    ensureSpace(cardHeight + 5);

    fillRoundedRect(margin, y, contentWidth, cardHeight, palette.fill, palette.stroke, 4);
    doc.setFillColor(palette.accent);
    doc.rect(margin, y, 2.6, cardHeight, "F");
    text(`${index + 1}. ${reason.title}`, margin + 7, y + 9.5, {
      color: palette.accent,
      font: "heading",
      fontSize: 8.8,
      lineGap: 4.4,
      maxWidth: bodyWidth,
      style: "bold",
    });
    text(`${reason.badge}  |  ${pdfTonePalette[reason.tone].label}`, margin + 7, y + 17.2, {
      color: colors.muted,
      font: "heading",
      fontSize: 6.9,
      lineGap: 3.6,
      maxWidth: bodyWidth,
    });
    text(reason.detail, margin + 7, y + 25, {
      color: colors.ink,
      fontSize: 8.3,
      lineGap: 4.3,
      maxWidth: bodyWidth,
    });
    y += cardHeight + 5;
  }

  function addSourceCard(source: WorkspaceSource, index: number) {
    const tone = pdfTextTone(source);
    const palette = pdfTonePalette[tone];
    const bodyWidth = contentWidth - 18;
    const titleHeight = estimateTextHeight(`${index + 1}. ${source.title}`, contentWidth - 25, 8.4, 4, "heading");
    const takeawayHeight = estimateTextHeight(source.takeaway, bodyWidth, 8.1, 4.2);
    const urlHeight = source.url ? estimateTextHeight(source.url, bodyWidth, 6.8, 3.5) : 0;
    const cardHeight = Math.max(34, titleHeight + takeawayHeight + urlHeight + 25);
    ensureSpace(cardHeight + 5);

    fillRoundedRect(margin, y, contentWidth, cardHeight, "#ffffff", colors.border, 4);
    doc.setFillColor(palette.soft);
    doc.roundedRect(margin + 4, y + 5, 9, 9, 2, 2, "F");
    doc.setFillColor(palette.accent);
    doc.circle(margin + 8.5, y + 9.5, 1.7, "F");
    text(`${index + 1}. ${source.title}`, margin + 17, y + 10.2, {
      color: palette.accent,
      font: "heading",
      fontSize: 8.4,
      lineGap: 4,
      maxWidth: contentWidth - 25,
      style: "bold",
    });
    const metaY = y + 10.2 + titleHeight + 2.5;
    text(`${source.type}  |  ${source.direction}  |  ${confidenceLabels[source.quality]}${source.year ? `  |  ${source.year}` : ""}`, margin + 17, metaY, {
      color: colors.muted,
      font: "heading",
      fontSize: 6.8,
      lineGap: 3.5,
      maxWidth: contentWidth - 25,
    });
    let nextY = text(source.takeaway, margin + 17, metaY + 7.5, {
      color: colors.ink,
      fontSize: 8.1,
      lineGap: 4.2,
      maxWidth: contentWidth - 25,
    });
    if (source.url) {
      text(source.url, margin + 17, nextY + 1.5, {
        color: colors.muted,
        fontSize: 6.8,
        lineGap: 3.5,
        maxWidth: contentWidth - 25,
      });
    }
    y += cardHeight + 5;
  }

  function addBranchDetail(branch: Branch, section: string, index: number) {
    doc.addPage();
    y = margin + 8;
    const palette = pdfTonePalette[branch.tone];
    const titleX = margin + 48;
    const titleWidth = contentWidth - 58;
    const titleHeight = estimateTextHeight(branch.title, titleWidth, 13.5, 6, "heading");
    const headerHeight = Math.max(42, titleHeight + 26);
    fillRoundedRect(margin, y, contentWidth, headerHeight, palette.fill, palette.stroke, 5);
    addPill(section, margin + 8, y + 8, branch.tone, section.length > 8 ? 34 : 25);
    text(`Branch ${index + 1}`, margin + 8, y + 23, {
      color: colors.muted,
      font: "heading",
      fontSize: 7,
      lineGap: 4,
      style: "normal",
    });
    text(branch.title, titleX, y + 15, {
      color: palette.accent,
      font: "heading",
      fontSize: 13.5,
      lineGap: 6,
      maxWidth: titleWidth,
      style: "bold",
    });
    text(`${branch.status}  |  ${branch.confidence} confidence  |  ${branch.reasonsLabel}  |  ${branch.studiesLabel}`, titleX, y + 17 + titleHeight, {
      color: colors.muted,
      font: "heading",
      fontSize: 7.3,
      lineGap: 4,
      maxWidth: titleWidth,
    });
    y += headerHeight + 12;

    sectionHeading("Rationale", branch.tone);
    const rationaleHeight = estimateTextHeight(branch.rationale, contentWidth - 14, 9, 4.8) + 13;
    ensureSpace(rationaleHeight);
    fillRoundedRect(margin, y, contentWidth, rationaleHeight, "#ffffff", colors.border, 4);
    text(branch.rationale, margin + 7, y + 10, {
      color: colors.ink,
      fontSize: 9,
      lineGap: 4.8,
      maxWidth: contentWidth - 14,
    });
    y += rationaleHeight + 7;

    if (branch.counterpoint) {
      sectionHeading("Counterpoint / reviewer note", "assumption");
      const counterpointHeight = estimateTextHeight(branch.counterpoint, contentWidth - 14, 8.8, 4.6) + 13;
      ensureSpace(counterpointHeight);
      fillRoundedRect(margin, y, contentWidth, counterpointHeight, pdfTonePalette.assumption.fill, pdfTonePalette.assumption.stroke, 4);
      text(branch.counterpoint, margin + 7, y + 10, {
        color: colors.ink,
        fontSize: 8.8,
        lineGap: 4.6,
        maxWidth: contentWidth - 14,
      });
      y += counterpointHeight + 7;
    }

    sectionHeading("Reasons", "evidence");
    getBranchReasonNodes(branch).forEach(addReasonCard);

    const attachedSources = getSourceRecords(workspace, branch.sourceIds);
    if (attachedSources.length) {
      sectionHeading("Attached sources", "evidence");
      attachedSources.forEach(addSourceCard);
    }
  }

  addSummaryPage();
  addBranchGroup("For", workspace.supports, "support");
  addBranchGroup("Against", workspace.opposes, "oppose");
  addBranchGroup("Neutral / Mixed", workspace.neutral, "neutral");

  const allBranches = [
    ...workspace.supports.map((branch) => ({ branch, section: "For" })),
    ...workspace.opposes.map((branch) => ({ branch, section: "Against" })),
    ...workspace.neutral.map((branch) => ({ branch, section: "Neutral / Mixed" })),
  ];
  allBranches.forEach(({ branch, section }, index) => addBranchDetail(branch, section, index));

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    bodyFont();
    doc.setDrawColor(colors.border);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    text("ReadRight Evidence Review", margin, pageHeight - 8.2, {
      color: colors.muted,
      font: "heading",
      fontSize: 6.8,
      lineGap: 3,
    });
    text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 8.2, {
      align: "right",
      color: colors.muted,
      fontSize: 6.8,
      lineGap: 3,
    });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

