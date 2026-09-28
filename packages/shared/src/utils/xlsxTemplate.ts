import ExcelJS from 'exceljs';

export interface BulkAttendeeRow {
  'Sl. No.'?: number | string;
  'Full Name': string;
  'Email Address': string;
  'Mobile Number': string;
  'WhatsApp Number'?: string;
  City?: string;
}

const PARTICIPANT_HEADERS = [
  'Sl. No.',
  'Full Name',
  'Email Address',
  'Mobile Number',
  'WhatsApp Number',
  'City',
] as const;

/** Generates the official Party In Pink 5.0 bulk-registration workbook. */
export function generateBulkRegistrationTemplateWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Party In Pink 5.0';
  workbook.created = new Date();

  // Sheet 1: Instructions
  const instructions = workbook.addWorksheet('Instructions');
  instructions.getColumn(1).width = 110;
  [
    'PARTY IN PINK 5.0 — BULK GROUP REGISTRATION INSTRUCTIONS',
    'Organized by: Rotaract Club of Bangalore JP Nagar (RI District 3191)',
    '',
    'PLEASE READ CAREFULLY BEFORE FILLING:',
    '1. Sheet 2 is for Participants: Click on the "Participants" tab at the bottom to add attendee details.',
    '2. DO NOT delete, rename, or reorder any column headers or sheets in this workbook.',
    '3. DO NOT delete Row 1 (Header row). Only enter attendee details starting from Row 2 downwards.',
    '4. Group Size: Bulk registration applies for 5 or more registrations.',
    '5. Mandatory Fields: "Full Name", "Email Address", and 10-digit "Mobile Number" are mandatory for every attendee.',
    '6. Unique Email Required: Every attendee receives their individual entry pass and QR code directly on their registered email.',
    '7. Upload: Once details are filled, save this Excel file and upload it on the Party In Pink bulk registration page.',
    '8. Need Assistance? Contact our volunteer support desk: partyinpink.rotaract@gmail.com',
  ].forEach((line) => instructions.addRow([line]));
  instructions.getRow(1).font = { bold: true, size: 14, color: { argb: 'FFE91E63' } };
  instructions.getRow(4).font = { bold: true, size: 11 };

  // Sheet 2: Participants (Headers only)
  const participants = workbook.addWorksheet('Participants', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  participants.columns = PARTICIPANT_HEADERS.map((header, index) => ({
    header,
    key: header,
    width: [8, 26, 32, 16, 18, 18][index],
  }));
  participants.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  participants.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE91E63' },
  };

  participants.autoFilter = 'A1:F1';

  return workbook;
}

/** Returns an XLSX byte buffer suitable for browser downloads or validation. */
export async function generateBulkRegistrationTemplateBuffer(): Promise<Uint8Array> {
  const workbook = generateBulkRegistrationTemplateWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
