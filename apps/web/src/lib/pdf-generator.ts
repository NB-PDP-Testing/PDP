import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface PassportPDFData {
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
}

export async function generatePassportPDF(data: PassportPDFData): Promise<Uint8Array> {
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
  const drawText = (text: string, x: number, y: number, options: {
    font?: typeof helvetica;
    size?: number;
    color?: typeof textColor;
    maxWidth?: number;
  } = {}) => {
    const { font = helvetica, size = 10, color = textColor, maxWidth } = options;
    
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
  if (data.trainingAttendance !== undefined || data.matchAttendance !== undefined) {
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
    const col1Skills = skillEntries.slice(0, Math.ceil(skillEntries.length / 2));
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

        // Star rating
        const starWidth = 10;
        for (let i = 1; i <= 5; i++) {
          const starX = xStart + 140 + (i - 1) * starWidth;
          page.drawText(i <= rating ? "★" : "☆", {
            x: starX,
            y,
            font: helvetica,
            size: 10,
            color: i <= rating ? accentColor : lightGray,
          });
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

    for (const goal of data.goals.slice(0, 5)) { // Limit to 5 goals
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

    for (const note of data.notes.slice(0, 3)) { // Limit to 3 notes
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
  if (data.hasAllergies || data.hasMedications || data.hasConditions || data.emergencyContact) {
    checkNewPage();
    
    page.drawText("MEDICAL SUMMARY", {
      x: margin,
      y: yPosition,
      font: helveticaBold,
      size: 14,
      color: primaryColor,
    });
    yPosition -= 20;

    const medicalItems = [];
    if (data.hasAllergies) medicalItems.push("⚠️ Has allergies - check medical record");
    if (data.hasMedications) medicalItems.push("💊 Taking medications - check medical record");
    if (data.hasConditions) medicalItems.push("❤️ Medical conditions - check medical record");
    if (data.emergencyContact) medicalItems.push(`📞 Emergency: ${data.emergencyContact}`);

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
