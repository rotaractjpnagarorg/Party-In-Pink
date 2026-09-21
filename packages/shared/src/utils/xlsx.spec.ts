import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import {
  generateBulkRegistrationTemplateBuffer,
  generateBulkRegistrationTemplateWorkbook,
} from './xlsxTemplate.js';
import { parseBulkRegistrationXlsx, sanitizeCellString } from './xlsxParser.js';

async function workbookBuffer(rows: Record<string, unknown>[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Participants');
  const headers = Object.keys(rows[0] ?? {});
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(headers.map((header) => row[header])));
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

describe('Phase 4: Bulk XLSX Engine & Sanitization', () => {
  it('generates official template workbook with Participants and Instructions sheets', () => {
    const workbook = generateBulkRegistrationTemplateWorkbook();
    expect(workbook.getWorksheet('Participants')).toBeDefined();
    expect(workbook.getWorksheet('Instructions')).toBeDefined();
    const sheet = workbook.getWorksheet('Participants')!;
    expect(sheet.rowCount).toBe(6);
    expect(sheet.getRow(1).values).toContain('Full Name');
  });

  it('parses valid template buffer without errors', async () => {
    const result = await parseBulkRegistrationXlsx(await generateBulkRegistrationTemplateBuffer());
    expect(result.valid).toBe(true);
    expect(result.validAttendeesCount).toBe(5);
    expect(result.errors).toHaveLength(0);
    expect(result.attendees[0]?.fullName).toBe('Ananya Sharma');
  });

  it('sanitizes formula injection operators', () => {
    expect(sanitizeCellString('=SUM(A1:A10)')).toBe('SUM(A1:A10)');
    expect(sanitizeCellString('+cmd|/c calc')).toBe('cmd|/c calc');
    expect(sanitizeCellString('-12345')).toBe('12345');
    expect(sanitizeCellString('@evil.com')).toBe('evil.com');
    expect(sanitizeCellString('Normal Name')).toBe('Normal Name');
  });

  it('detects duplicate emails within the upload', async () => {
    const rows = [
      ['Attendee One', 'duplicate@example.com', '9876543210'],
      ['Attendee Two', 'duplicate@example.com', '9876543211'],
      ['Attendee Three', 'three@example.com', '9876543212'],
      ['Attendee Four', 'four@example.com', '9876543213'],
      ['Attendee Five', 'five@example.com', '9876543214'],
    ].map(([name, email, mobile]) => ({
      'Full Name': name,
      'Email Address': email,
      'Mobile Number': mobile,
    }));
    const result = await parseBulkRegistrationXlsx(await workbookBuffer(rows));
    expect(result.valid).toBe(false);
    expect(result.duplicateEmails).toContain('duplicate@example.com');
  });

  it('enforces minimum participant count', async () => {
    const result = await parseBulkRegistrationXlsx(
      await workbookBuffer([
        {
          'Full Name': 'Only One',
          'Email Address': 'one@example.com',
          'Mobile Number': '9876543210',
        },
      ])
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.field === 'participantCount')).toBe(true);
  });
});
