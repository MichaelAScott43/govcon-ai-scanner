import { createRequire } from "module";
const require = createRequire(import.meta.url);

/**
 * Parse a document buffer and return its text content.
 * Supports PDF (application/pdf) and plain text (text/plain).
 * DOCX support requires the optional `mammoth` package.
 */
export async function parseDocument(buffer, mimetype = "", filename = "") {
  const type = mimetype.toLowerCase();
  const name = filename.toLowerCase();

  // PDF
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text || "";
  }

  // DOCX (requires mammoth — optional)
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } catch (err) {
      if (err.code === "ERR_MODULE_NOT_FOUND" || err.message?.includes("Cannot find")) {
        throw new Error(
          "DOCX parsing requires the 'mammoth' package. Install it with: npm install mammoth"
        );
      }
      throw new Error(`Failed to parse DOCX file: ${err.message}`);
    }
  }

  // Plain text
  if (type.startsWith("text/") || name.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error(
    `Unsupported file type: ${mimetype || filename}. Upload a PDF, DOCX, or TXT file.`
  );
}
