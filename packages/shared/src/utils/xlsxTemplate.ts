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

  const sampleParticipants: BulkAttendeeRow[] = [
    {
      'Sl. No.': 1,
      'Full Name': 'Ananya Sharma',
      'Email Address': 'ananya.sharma@example.com',
      'Mobile Number': '9876543210',
      'WhatsApp Number': '9876543210',
      City: 'Bengaluru',
    },
    {
      'Sl. No.': 2,
      'Full Name': 'Karthik Raja',
      'Email Address': 'karthik.raja@example.com',
      'Mobile Number': '9845012345',
      'WhatsApp Number': '9845012345',
      City: 'Bengaluru',
    },
    {
      'Sl. No.': 3,
      'Full Name': 'Pooja Hegde',
      'Email Address': 'pooja.hegde@example.com',
      'Mobile Number': '9731298765',
      'WhatsApp Number': '',
      City: 'Mysuru',
    },
    {
      'Sl. No.': 4,
      'Full Name': 'Rohan Sen',
      'Email Address': 'rohan.sen@example.com',
      'Mobile Number': '9900112233',
      'WhatsApp Number': '9900112233',
      City: 'Bengaluru',
    },
    {
      'Sl. No.': 5,
      'Full Name': 'Sneha Rao',
      'Email Address': 'sneha.rao@example.com',
      'Mobile Number': '9880054321',
      'WhatsApp Number': '9880054321',
      City: 'Bengaluru',
    },
  ];
  sampleParticipants.forEach((participant) => participants.addRow(participant));
  participants.autoFilter = 'A1:F1';

  const instructions = workbook.addWorksheet('Instructions');
  instructions.getColumn(1).width = 100;
  [
    'PARTY IN PINK 5.0 — BULK GROUP REGISTRATION INSTRUCTIONS',
    'Organized by: Rotaract Club of Bangalore JP Nagar (RI District 3191)',
    '',
    'IMPORTANT RULES & GUIDELINES:',
    '1. Minimum Participants: Bulk group pricing (₹219/pass) applies for 5 or more attendees.',
    '2. Mandatory Columns: Full Name, Email Address, and 10-Digit Mobile Number are required for every participant.',
    '3. Unique Email: Each attendee receives an individual digital ticket & entry pass via email.',
    '4. Column Headers: Please DO NOT rename, reorder, or delete column headers on the "Participants" sheet.',
    '5. Attire Note: Wear pink clothing! No complimentary T-shirts are provided to maximize direct cancer screening donations.',
    '6. Payment: Group lead submits payment once for the total count via direct UPI or SBI Bank Transfer.',
    '7. Need Assistance? Contact our volunteer desk: partyinpink.rotaract@gmail.com',
  ].forEach((line) => instructions.addRow([line]));
  instructions.getRow(1).font = { bold: true, size: 14 };
  instructions.getRow(4).font = { bold: true };

  return workbook;
}

/** Returns an XLSX byte buffer suitable for browser downloads or validation. */
export async function generateBulkRegistrationTemplateBuffer(): Promise<Uint8Array> {
  const workbook = generateBulkRegistrationTemplateWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
