// PDF generation utilities for session plans
// Requires pdf-lib package: npm install pdf-lib

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Color definitions matching the branding
const GRANGE_GREEN = rgb(0.4, 0.7, 0.3);
const GRANGE_DARK_GREEN = rgb(0.2, 0.5, 0.2);
const WHITE = rgb(1, 1, 1);
const GRAY = rgb(0.5, 0.5, 0.5);

/**
 * Generate PDF for AI Session Plan
 */
export async function generateSessionPlanPDF(sessionPlanData: {
  teamName: string;
  sessionPlan: string;
  sport: string;
  ageGroup: string;
  playerCount: number;
}): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  let yPos = height - 50;
  const leftMargin = 50;
  const rightMargin = width - 50;
  const maxWidth = rightMargin - leftMargin;

  // Header with green background
  page.drawRectangle({
    x: 0,
    y: yPos - 70,
    width,
    height: 90,
    color: GRANGE_GREEN,
  });

  // Title
  page.drawText(`Training Session Plan - ${sessionPlanData.teamName}`, {
    x: leftMargin,
    y: yPos - 25,
    size: 18,
    font: helveticaBold,
    color: WHITE,
  });

  page.drawText(
    `${sessionPlanData.sport} | ${sessionPlanData.ageGroup} | ${sessionPlanData.playerCount} Players`,
    {
      x: leftMargin,
      y: yPos - 50,
      size: 12,
      font: helvetica,
      color: WHITE,
    }
  );

  page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
    x: leftMargin,
    y: yPos - 65,
    size: 10,
    font: helvetica,
    color: rgb(0.9, 0.9, 0.9),
  });

  yPos -= 100;

  // Process the session plan text
  const lines = sessionPlanData.sessionPlan.split("\n");

  for (const line of lines) {
    // Check if we need a new page
    if (yPos < 80) {
      page = pdfDoc.addPage([595, 842]);
      yPos = height - 50;

      // Add continuation header
      page.drawText(
        `${sessionPlanData.teamName} - Training Session (continued)`,
        {
          x: leftMargin,
          y: yPos,
          size: 10,
          font: helvetica,
          color: GRAY,
        }
      );
      yPos -= 30;
    }

    const trimmedLine = line.trim();

    // Skip empty lines but add spacing
    if (!trimmedLine) {
      yPos -= 8;
      continue;
    }

    // Detect headers (lines starting with ## or bold markers)
    if (trimmedLine.startsWith("##")) {
      yPos -= 5;
      const headerText = trimmedLine.replace(/^##\s*/, "").replace(/\*\*/g, "");
      page.drawText(headerText, {
        x: leftMargin,
        y: yPos,
        size: 13,
        font: helveticaBold,
        color: GRANGE_DARK_GREEN,
      });
      yPos -= 20;
    } else if (trimmedLine.startsWith("#")) {
      // Main title
      yPos -= 5;
      const titleText = trimmedLine.replace(/^#\s*/, "").replace(/\*\*/g, "");
      page.drawText(titleText, {
        x: leftMargin,
        y: yPos,
        size: 16,
        font: helveticaBold,
        color: GRANGE_DARK_GREEN,
      });
      yPos -= 25;
    } else if (trimmedLine.startsWith("-") || trimmedLine.startsWith("*")) {
      // Bullet points
      const bulletText = trimmedLine
        .replace(/^[-*]\s*/, "")
        .replace(/\*\*/g, "");
      // Wrap text if needed
      const words = bulletText.split(" ");
      let currentLine = "";
      const lineHeight = 14;
      const fontSize = 10;

      for (const word of words) {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        const textWidth = helvetica.widthOfTextAtSize(testLine, fontSize);

        if (textWidth > maxWidth && currentLine) {
          page.drawText(`• ${currentLine}`, {
            x: leftMargin + 10,
            y: yPos,
            size: fontSize,
            font: helvetica,
            color: rgb(0, 0, 0),
          });
          yPos -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        page.drawText(`• ${currentLine}`, {
          x: leftMargin + 10,
          y: yPos,
          size: fontSize,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
        yPos -= lineHeight;
      }
    } else {
      // Regular text
      const text = trimmedLine.replace(/\*\*/g, "");
      // Simple text wrapping
      const words = text.split(" ");
      let currentLine = "";
      const lineHeight = 12;
      const fontSize = 10;

      for (const word of words) {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        const textWidth = helvetica.widthOfTextAtSize(testLine, fontSize);

        if (textWidth > maxWidth && currentLine) {
          page.drawText(currentLine, {
            x: leftMargin,
            y: yPos,
            size: fontSize,
            font: helvetica,
            color: rgb(0, 0, 0),
          });
          yPos -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        page.drawText(currentLine, {
          x: leftMargin,
          y: yPos,
          size: fontSize,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
        yPos -= lineHeight;
      }
    }
  }

  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();

  // Convert to Blob
  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * Download PDF file
 */
export async function downloadPDF(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Share PDF via email
 */
export async function shareViaEmail(
  blob: Blob,
  teamName: string
): Promise<void> {
  const subject = encodeURIComponent(`Training Session Plan - ${teamName}`);
  const body = encodeURIComponent(
    `Please find attached the training session plan for ${teamName}.`
  );

  // Create a data URL for the PDF
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    // Note: Most email clients don't support data URLs in mailto links
    // This is a simplified version - in production, you'd upload to a server
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };
  reader.readAsDataURL(blob);
}

/**
 * Share PDF via WhatsApp
 */
export async function shareViaWhatsApp(
  blob: Blob,
  teamName: string
): Promise<void> {
  // Create a data URL for the PDF
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    const message = encodeURIComponent(`Training Session Plan for ${teamName}`);
    // Note: WhatsApp Web doesn't support direct file sharing via URL
    // This opens WhatsApp with a message - user would need to attach file manually
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };
  reader.readAsDataURL(blob);
}

/**
 * Share PDF using native share API (if available)
 */
export async function shareViaNative(
  blob: Blob,
  teamName: string
): Promise<void> {
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], `${teamName}_Session_Plan.pdf`, {
      type: "application/pdf",
    });

    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Training Session Plan - ${teamName}`,
          text: `Training session plan for ${teamName}`,
          files: [file],
        });
      } catch (error) {
        console.error("Error sharing:", error);
        // Fallback to download
        await downloadPDF(blob, `${teamName}_Session_Plan.pdf`);
      }
    } else {
      // Fallback to download
      await downloadPDF(blob, `${teamName}_Session_Plan.pdf`);
    }
  } else {
    // Fallback to download
    await downloadPDF(blob, `${teamName}_Session_Plan.pdf`);
  }
}
