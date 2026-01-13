import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Regex constants for performance
const HEADING_REGEX = /^#+\s*/;
const BULLET_REGEX = /^[-•]\s*/;
const MOBILE_DEVICE_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export type PassportPDFData = {
  // Player Info
  playerName: string;
  dateOfBirth?: string;
  ageGroup?: string;
  sport?: string;
  organization?: string;

  // Skills (Record<skillCode, rating>)
  skills?: Record<string, number>;

  // Goals
  goals?: Array<{
    title: string;
    status: string;
    targetDate?: string;
  }>;

  // Notes (coach feedback)
  notes?: Array<{
    content: string;
    coachName?: string;
    date: string;
  }>;

  // Medical (optional)
  hasAllergies?: boolean;
  hasMedications?: boolean;
  hasConditions?: boolean;
  emergencyContact?: string;

  // Attendance
  trainingAttendance?: number;
  matchAttendance?: number;

  // Performance
  overallScore?: number;
};

export async function generatePassportPDF(
  data: PassportPDFData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page settings
  const pageWidth = 595; // A4 width in points
  const pageHeight = 842; // A4 height in points
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  // Colors
  const primaryColor = rgb(0.05, 0.27, 0.52); // Navy blue
  const accentColor = rgb(0.13, 0.59, 0.42); // Green
  const textColor = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.6, 0.6, 0.6);

  // Helper function to draw text
  const drawText = (
    text: string,
    x: number,
    y: number,
    options: {
      font?: typeof helvetica;
      size?: number;
      color?: typeof textColor;
      maxWidth?: number;
    } = {}
  ) => {
    const {
      font = helvetica,
      size = 10,
      color = textColor,
      maxWidth,
    } = options;

    if (maxWidth && text.length > 0) {
      // Simple text wrapping
      const words = text.split(" ");
      let line = "";
      let currentY = y;

      for (const word of words) {
        const testLine = line + (line ? " " : "") + word;
        const testWidth = font.widthOfTextAtSize(testLine, size);

        if (testWidth > maxWidth && line) {
          page.drawText(line, { x, y: currentY, font, size, color });
          line = word;
          currentY -= size + 4;
        } else {
          line = testLine;
        }
      }

      if (line) {
        page.drawText(line, { x, y: currentY, font, size, color });
        return currentY - size - 4;
      }
      return currentY;
    }

    page.drawText(text, { x, y, font, size, color });
    return y - size - 4;
  };

  // Helper to check and add new page if needed
  const checkNewPage = () => {
    if (yPosition < margin + 100) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
  };

  // ============ HEADER ============
  // Background bar
  page.drawRectangle({
    x: 0,
    y: pageHeight - 80,
    width: pageWidth,
    height: 80,
    color: primaryColor,
  });

  // Title
  page.drawText("PLAYER DEVELOPMENT PASSPORT", {
    x: margin,
    y: pageHeight - 35,
    font: helveticaBold,
    size: 20,
    color: rgb(1, 1, 1),
  });

  // Organization
  if (data.organization) {
    page.drawText(data.organization, {
      x: margin,
      y: pageHeight - 55,
      font: helvetica,
      size: 12,
      color: rgb(0.8, 0.8, 0.8),
    });
  }

  // Date generated
  const generatedDate = new Date().toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  page.drawText(`Generated: ${generatedDate}`, {
    x: margin,
    y: pageHeight - 70,
    font: helvetica,
    size: 9,
    color: rgb(0.7, 0.7, 0.7),
  });

  yPosition = pageHeight - 110;

  // ============ PLAYER INFO SECTION ============
  page.drawText("PLAYER INFORMATION", {
    x: margin,
    y: yPosition,
    font: helveticaBold,
    size: 14,
    color: primaryColor,
  });
  yPosition -= 25;

  // Player name (large)
  page.drawText(data.playerName, {
    x: margin,
    y: yPosition,
    font: helveticaBold,
    size: 22,
    color: textColor,
  });
  yPosition -= 30;

  // Info grid
  const infoItems = [
    { label: "Date of Birth", value: data.dateOfBirth || "Not specified" },
    { label: "Age Group", value: data.ageGroup || "Not specified" },
    { label: "Sport", value: data.sport || "Not specified" },
  ];

  let xOffset = margin;
  for (const item of infoItems) {
    page.drawText(item.label, {
      x: xOffset,
      y: yPosition,
      font: helvetica,
      size: 9,
      color: lightGray,
    });
    page.drawText(item.value, {
      x: xOffset,
      y: yPosition - 14,
      font: helveticaBold,
      size: 11,
      color: textColor,
    });
    xOffset += 160;
  }
  yPosition -= 45;

  // Performance Score (if available)
  if (data.overallScore !== undefined) {
    page.drawText("Overall Performance", {
      x: margin,
      y: yPosition,
      font: helvetica,
      size: 9,
      color: lightGray,
    });

    // Progress bar background
    const barWidth = 200;
    const barHeight = 15;
    page.drawRectangle({
      x: margin,
      y: yPosition - 20,
      width: barWidth,
      height: barHeight,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Progress bar fill
    page.drawRectangle({
      x: margin,
      y: yPosition - 20,
      width: barWidth * (data.overallScore / 100),
      height: barHeight,
      color: accentColor,
    });

    // Score text
    page.drawText(`${Math.round(data.overallScore)}%`, {
      x: margin + barWidth + 10,
      y: yPosition - 16,
      font: helveticaBold,
      size: 12,
      color: textColor,
    });

    yPosition -= 45;
  }

  // Attendance (if available)
  if (
    data.trainingAttendance !== undefined ||
    data.matchAttendance !== undefined
  ) {
    page.drawText("Attendance", {
      x: margin,
      y: yPosition,
      font: helveticaBold,
      size: 12,
      color: primaryColor,
    });
    yPosition -= 20;

    if (data.trainingAttendance !== undefined) {
      page.drawText(`Training: ${data.trainingAttendance}%`, {
        x: margin,
        y: yPosition,
        font: helvetica,
        size: 10,
        color: textColor,
      });
    }
    if (data.matchAttendance !== undefined) {
      page.drawText(`Matches: ${data.matchAttendance}%`, {
        x: margin + 150,
        y: yPosition,
        font: helvetica,
        size: 10,
        color: textColor,
      });
    }
    yPosition -= 30;
  }

  // ============ SKILLS SECTION ============
  if (data.skills && Object.keys(data.skills).length > 0) {
    checkNewPage();

    page.drawText("SKILL RATINGS", {
      x: margin,
      y: yPosition,
      font: helveticaBold,
      size: 14,
      color: primaryColor,
    });
    yPosition -= 25;

    const skillEntries = Object.entries(data.skills);
    const col1Skills = skillEntries.slice(
      0,
      Math.ceil(skillEntries.length / 2)
    );
    const col2Skills = skillEntries.slice(Math.ceil(skillEntries.length / 2));

    const drawSkillColumn = (skills: [string, number][], xStart: number) => {
      let y = yPosition;
      for (const [skillCode, rating] of skills) {
        // Format skill name (snake_case to Title Case)
        const skillName = skillCode
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        page.drawText(skillName, {
          x: xStart,
          y,
          font: helvetica,
          size: 10,
          color: textColor,
        });

        // Rating visualization using filled/empty circles
        const circleRadius = 4;
        const circleSpacing = 12;
        for (let i = 1; i <= 5; i++) {
          const circleX = xStart + 145 + (i - 1) * circleSpacing;
          const circleY = y + 3;

          if (i <= rating) {
            // Filled circle for achieved rating
            page.drawCircle({
              x: circleX,
              y: circleY,
              size: circleRadius,
              color: accentColor,
            });
          } else {
            // Empty circle for remaining
            page.drawCircle({
              x: circleX,
              y: circleY,
              size: circleRadius,
              borderColor: lightGray,
              borderWidth: 1,
            });
          }
        }

        y -= 18;
      }
      return y;
    };

    const y1 = drawSkillColumn(col1Skills, margin);
    const y2 = drawSkillColumn(col2Skills, margin + contentWidth / 2);
    yPosition = Math.min(y1, y2) - 20;
  }

  // ============ GOALS SECTION ============
  if (data.goals && data.goals.length > 0) {
    checkNewPage();

    page.drawText("DEVELOPMENT GOALS", {
      x: margin,
      y: yPosition,
      font: helveticaBold,
      size: 14,
      color: primaryColor,
    });
    yPosition -= 25;

    for (const goal of data.goals.slice(0, 5)) {
      // Limit to 5 goals
      checkNewPage();

      // Goal title
      page.drawText(`• ${goal.title}`, {
        x: margin,
        y: yPosition,
        font: helveticaBold,
        size: 10,
        color: textColor,
      });

      // Status badge
      const statusColors: Record<string, typeof accentColor> = {
        completed: accentColor,
        in_progress: rgb(0.96, 0.62, 0.04),
        not_started: lightGray,
      };
      const statusColor = statusColors[goal.status] || lightGray;

      page.drawText(goal.status.replace("_", " ").toUpperCase(), {
        x: margin + 350,
        y: yPosition,
        font: helvetica,
        size: 8,
        color: statusColor,
      });

      if (goal.targetDate) {
        page.drawText(`Target: ${goal.targetDate}`, {
          x: margin + 20,
          y: yPosition - 14,
          font: helvetica,
          size: 9,
          color: lightGray,
        });
      }

      yPosition -= 35;
    }
  }

  // ============ COACH NOTES SECTION ============
  if (data.notes && data.notes.length > 0) {
    checkNewPage();

    page.drawText("RECENT COACH FEEDBACK", {
      x: margin,
      y: yPosition,
      font: helveticaBold,
      size: 14,
      color: primaryColor,
    });
    yPosition -= 25;

    for (const note of data.notes.slice(0, 3)) {
      // Limit to 3 notes
      checkNewPage();

      // Note border
      page.drawRectangle({
        x: margin,
        y: yPosition - 50,
        width: contentWidth,
        height: 55,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 1,
        color: rgb(0.98, 0.98, 0.98),
      });

      // Note content (with wrapping)
      yPosition = drawText(
        note.content.slice(0, 200) + (note.content.length > 200 ? "..." : ""),
        margin + 10,
        yPosition - 10,
        { size: 9, maxWidth: contentWidth - 20 }
      );

      // Coach and date
      const attribution = `— ${note.coachName || "Coach"}, ${note.date}`;
      page.drawText(attribution, {
        x: margin + 10,
        y: yPosition - 5,
        font: helvetica,
        size: 8,
        color: lightGray,
      });

      yPosition -= 30;
    }
  }

  // ============ MEDICAL SUMMARY (if any) ============
  if (
    data.hasAllergies ||
    data.hasMedications ||
    data.hasConditions ||
    data.emergencyContact
  ) {
    checkNewPage();

    page.drawText("MEDICAL SUMMARY", {
      x: margin,
      y: yPosition,
      font: helveticaBold,
      size: 14,
      color: primaryColor,
    });
    yPosition -= 20;

    const medicalItems: string[] = [];
    if (data.hasAllergies) {
      medicalItems.push("[!] Has allergies - check medical record");
    }
    if (data.hasMedications) {
      medicalItems.push("[Rx] Taking medications - check medical record");
    }
    if (data.hasConditions) {
      medicalItems.push("[+] Medical conditions - check medical record");
    }
    if (data.emergencyContact) {
      medicalItems.push(`[ICE] Emergency: ${data.emergencyContact}`);
    }

    for (const item of medicalItems) {
      page.drawText(item, {
        x: margin,
        y: yPosition,
        font: helvetica,
        size: 10,
        color: textColor,
      });
      yPosition -= 16;
    }
    yPosition -= 10;
  }

  // ============ FOOTER ============
  const footerY = 30;
  page.drawText("Generated by Player Development Passport (PDP)", {
    x: margin,
    y: footerY,
    font: helvetica,
    size: 8,
    color: lightGray,
  });
  page.drawText("Confidential - For authorized use only", {
    x: pageWidth - margin - 150,
    y: footerY,
    font: helvetica,
    size: 8,
    color: lightGray,
  });

  return pdfDoc.save();
}

// Helper to convert Uint8Array to Blob for download
export function pdfToBlob(pdfBytes: Uint8Array): Blob {
  // Create a new ArrayBuffer copy to avoid SharedArrayBuffer issues
  const buffer = new ArrayBuffer(pdfBytes.length);
  const view = new Uint8Array(buffer);
  view.set(pdfBytes);
  return new Blob([buffer], { type: "application/pdf" });
}

// Helper to download PDF
export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = pdfToBlob(pdfBytes);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper to open PDF in new tab for preview
export function previewPDF(pdfBytes: Uint8Array): string {
  const blob = pdfToBlob(pdfBytes);
  return URL.createObjectURL(blob);
}

// ============ SESSION PLAN PDF ============

export type SessionPlanPDFData = {
  teamName: string;
  sessionPlan: string;
  sport?: string;
  ageGroup?: string;
  playerCount?: number;
  organizationName?: string;
  coachName?: string;
  generatedBy?: "ai" | "manual";
};

export async function generateSessionPlanPDF(
  data: SessionPlanPDFData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const _contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  const primaryColor = rgb(0.05, 0.27, 0.52);
  const accentColor = rgb(0.13, 0.59, 0.42);
  const textColor = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.6, 0.6, 0.6);

  // Header with gradient effect
  page.drawRectangle({
    x: 0,
    y: pageHeight - 100,
    width: pageWidth,
    height: 100,
    color: primaryColor,
  });

  // Organization name (top-right if provided)
  if (data.organizationName) {
    const orgWidth = helveticaBold.widthOfTextAtSize(data.organizationName, 12);
    page.drawText(data.organizationName, {
      x: pageWidth - margin - orgWidth,
      y: pageHeight - 30,
      font: helveticaBold,
      size: 12,
      color: rgb(0.9, 0.9, 0.9),
    });
  }

  // Main title
  page.drawText("TRAINING SESSION PLAN", {
    x: margin,
    y: pageHeight - 40,
    font: helveticaBold,
    size: 22,
    color: rgb(1, 1, 1),
  });

  // Team name (emphasized)
  page.drawText(data.teamName, {
    x: margin,
    y: pageHeight - 62,
    font: helveticaBold,
    size: 16,
    color: accentColor,
  });

  const generatedDate = new Date().toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Generation info
  const generatedInfo =
    data.generatedBy === "ai"
      ? `AI-Generated: ${generatedDate}`
      : `Generated: ${generatedDate}`;
  page.drawText(generatedInfo, {
    x: margin,
    y: pageHeight - 82,
    font: helvetica,
    size: 9,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Coach name (if provided)
  if (data.coachName) {
    const coachText = `Coach: ${data.coachName}`;
    const coachWidth = helvetica.widthOfTextAtSize(coachText, 9);
    page.drawText(coachText, {
      x: pageWidth - margin - coachWidth,
      y: pageHeight - 82,
      font: helvetica,
      size: 9,
      color: rgb(0.8, 0.8, 0.8),
    });
  }

  yPosition = pageHeight - 130;

  // Info row
  const infoItems: string[] = [];
  if (data.sport) {
    infoItems.push(`Sport: ${data.sport}`);
  }
  if (data.ageGroup) {
    infoItems.push(`Age Group: ${data.ageGroup}`);
  }
  if (data.playerCount) {
    infoItems.push(`Players: ${data.playerCount}`);
  }

  if (infoItems.length > 0) {
    page.drawText(infoItems.join("  •  "), {
      x: margin,
      y: yPosition,
      font: helvetica,
      size: 10,
      color: lightGray,
    });
    yPosition -= 25;
  }

  // Session plan content
  const lines = data.sessionPlan.split("\n");
  const lineHeight = 14;

  for (const line of lines) {
    if (yPosition < margin + 50) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }

    // Check for headers (lines starting with #)
    if (line.startsWith("##")) {
      yPosition -= 10;
      page.drawText(line.replace(HEADING_REGEX, ""), {
        x: margin,
        y: yPosition,
        font: helveticaBold,
        size: 12,
        color: primaryColor,
      });
      yPosition -= lineHeight + 5;
    } else if (line.startsWith("#")) {
      yPosition -= 15;
      page.drawText(line.replace(HEADING_REGEX, ""), {
        x: margin,
        y: yPosition,
        font: helveticaBold,
        size: 14,
        color: primaryColor,
      });
      yPosition -= lineHeight + 8;
    } else if (line.startsWith("-") || line.startsWith("•")) {
      page.drawText("•", {
        x: margin,
        y: yPosition,
        font: helvetica,
        size: 10,
        color: accentColor,
      });
      page.drawText(line.replace(BULLET_REGEX, ""), {
        x: margin + 15,
        y: yPosition,
        font: helvetica,
        size: 10,
        color: textColor,
      });
      yPosition -= lineHeight;
    } else if (line.trim()) {
      page.drawText(line, {
        x: margin,
        y: yPosition,
        font: helvetica,
        size: 10,
        color: textColor,
      });
      yPosition -= lineHeight;
    } else {
      yPosition -= 8;
    }
  }

  // Footer with branding
  const footerY = 40;
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: footerY + 10,
    color: rgb(0.98, 0.98, 0.98),
  });

  page.drawText("Powered by PlayerARC", {
    x: margin,
    y: footerY,
    font: helveticaBold,
    size: 9,
    color: primaryColor,
  });

  const aiText =
    data.generatedBy === "ai"
      ? "AI-powered coaching insights"
      : "Professional training platform";
  page.drawText(aiText, {
    x: margin,
    y: footerY - 12,
    font: helvetica,
    size: 7,
    color: lightGray,
  });

  // Organization name in footer (if provided)
  if (data.organizationName) {
    const orgFooterWidth = helvetica.widthOfTextAtSize(
      data.organizationName,
      8
    );
    page.drawText(data.organizationName, {
      x: pageWidth - margin - orgFooterWidth,
      y: footerY,
      font: helvetica,
      size: 8,
      color: textColor,
    });
  }

  page.drawText("Confidential - For authorized use only", {
    x: pageWidth - margin - 135,
    y: footerY - 12,
    font: helvetica,
    size: 7,
    color: lightGray,
  });

  return pdfDoc.save();
}

// ============ SHARE HELPERS ============

// Detect if user is on mobile device
function isMobileDevice(): boolean {
  return MOBILE_DEVICE_REGEX.test(navigator.userAgent);
}

// Check if Web Share API is supported with file sharing
function canUseWebShare(file?: File): boolean {
  if (!navigator.share) {
    return false;
  }

  // Check if we can share files (not all browsers support this)
  if (file && navigator.canShare) {
    return navigator.canShare({ files: [file] });
  }

  return true;
}

// Helper to convert Uint8Array to File
function createFileFromBytes(pdfBytes: Uint8Array, filename: string): File {
  const buffer = new ArrayBuffer(pdfBytes.length);
  const view = new Uint8Array(buffer);
  view.set(pdfBytes);
  const blob = new Blob([buffer], { type: "application/pdf" });
  return new File([blob], filename, { type: "application/pdf" });
}

export async function shareViaEmail(
  pdfBytes: Uint8Array,
  name: string
): Promise<void> {
  const filename = `${name.replace(/\s+/g, "_")}_PDP.pdf`;
  const file = createFileFromBytes(pdfBytes, filename);

  // Try Web Share API first (works great on mobile)
  if (await canUseWebShare(file)) {
    try {
      await navigator.share({
        title: `Player Development Passport - ${name}`,
        text: `Player Development Passport for ${name}`,
        files: [file],
      });
      return;
    } catch (err) {
      // User cancelled or share failed, continue to fallback
      if ((err as Error).name !== "AbortError") {
        console.error("Share failed:", err);
      } else {
        return; // User cancelled
      }
    }
  }

  // Fallback to mailto (no attachment support)
  const subject = encodeURIComponent(`Player Development Passport - ${name}`);
  const body = encodeURIComponent(
    `Please find the Player Development Passport for ${name}.\n\n` +
      "Generated from PDP Portal.\n" +
      `Date: ${new Date().toLocaleDateString("en-IE")}\n\n` +
      "Note: Please download the PDF from the portal and attach it to your email."
  );

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

export async function shareViaWhatsApp(
  pdfBytes: Uint8Array,
  name: string
): Promise<{ shared: boolean; method: "native" | "fallback" }> {
  const filename = `${name.replace(/\s+/g, "_")}_PDP.pdf`;
  const file = createFileFromBytes(pdfBytes, filename);

  // Try Web Share API first (works on mobile - opens native share sheet with WhatsApp option)
  if (await canUseWebShare(file)) {
    try {
      await navigator.share({
        title: `Player Development Passport - ${name}`,
        text: `Player Development Passport for ${name}\n\nGenerated from PDP Portal`,
        files: [file],
      });
      return { shared: true, method: "native" };
    } catch (err) {
      // User cancelled or share failed
      if ((err as Error).name === "AbortError") {
        return { shared: false, method: "native" }; // User cancelled
      }
      console.error("Share failed:", err);
      // Fall through to fallback
    }
  }

  // Fallback: Download PDF first, then open WhatsApp with instructions
  downloadPDF(pdfBytes, filename);

  const text = encodeURIComponent(
    `Player Development Passport - ${name}\n` +
      `Generated: ${new Date().toLocaleDateString("en-IE")}\n\n` +
      "[PDF downloaded - please attach it to this message]"
  );

  if (isMobileDevice()) {
    // Use WhatsApp mobile app URL scheme
    window.location.href = `whatsapp://send?text=${text}`;
  } else {
    // Use WhatsApp Web for desktop
    window.open(`https://web.whatsapp.com/send?text=${text}`, "_blank");
  }

  return { shared: true, method: "fallback" };
}

export async function shareViaNative(
  pdfBytes: Uint8Array,
  name: string
): Promise<void> {
  const filename = `${name.replace(/\s+/g, "_")}_PDP.pdf`;
  const file = createFileFromBytes(pdfBytes, filename);

  if (await canUseWebShare(file)) {
    try {
      await navigator.share({
        title: `Player Development Passport - ${name}`,
        text: `Player Development Passport for ${name}`,
        files: [file],
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Share failed:", err);
        // Fallback to download if Web Share API not available
        downloadPDF(pdfBytes, filename);
      }
    }
  } else {
    // Fallback to download if Web Share API not available
    downloadPDF(pdfBytes, filename);
  }
}
