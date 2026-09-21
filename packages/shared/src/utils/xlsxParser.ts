import ExcelJS from 'exceljs';
import { bulkAttendeeRowSchema, type BulkAttendeeRowInput } from '../schemas/index.js';

const MAX_XLSX_BYTES = 2 * 1024 * 1024;
const MAX_UNCOMPRESSED_XLSX_BYTES = 20 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 200;
const MAX_WORKSHEET_ROWS = 501;
const MAX_WORKSHEET_COLUMNS = 20;

export interface RowError {
  rowNumber: number;
  field: string;
  message: string;
}
export interface ParseBulkXlsxResult {
  valid: boolean;
  totalRowsFound: number;
  validAttendeesCount: number;
  attendees: BulkAttendeeRowInput[];
  errors: RowError[];
  duplicateEmails: string[];
}

export function sanitizeCellString(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value).trim();
  if (/^[=+\-@\t\r]/.test(text)) text = text.replace(/^[=+\-@\t\r]+/, '').trim();
  return text;
}

export function escapeCsvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function emptyResult(message: string, field = 'file'): ParseBulkXlsxResult {
  return {
    valid: false,
    totalRowsFound: 0,
    validAttendeesCount: 0,
    attendees: [],
    errors: [{ rowNumber: 0, field, message }],
    duplicateEmails: [],
  };
}

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value && typeof value === 'object' && 'formula' in value) {
    const formulaValue = value as ExcelJS.CellFormulaValue;
    return sanitizeCellString(formulaValue.result ?? cell.text);
  }
  return sanitizeCellString(cell.text || value);
}

function validateXlsxArchive(bytes: Uint8Array): string | null {
  if (bytes.byteLength > MAX_XLSX_BYTES) return 'Excel file must be 2 MB or smaller.';
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumEocdSize = 22;
  let eocdOffset = -1;
  for (
    let offset = bytes.byteLength - minimumEocdSize;
    offset >= Math.max(0, bytes.byteLength - 65_557);
    offset -= 1
  ) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) return 'The uploaded file is not a valid XLSX archive.';
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  if (entryCount === 0xffff || centralDirectoryOffset === 0xffffffff)
    return 'ZIP64 workbooks are not supported.';
  if (entryCount > MAX_ZIP_ENTRIES) return 'Excel file contains too many internal entries.';

  let offset = centralDirectoryOffset;
  let totalUncompressedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== 0x02014b50)
      return 'The XLSX archive directory is invalid.';
    const uncompressedSize = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    if (uncompressedSize === 0xffffffff) return 'ZIP64 workbook entries are not supported.';
    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > MAX_UNCOMPRESSED_XLSX_BYTES)
      return 'Excel file expands beyond the 20 MB safety limit.';
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return null;
}

/** Parses and validates an uploaded Party In Pink bulk XLSX workbook. */
export async function parseBulkRegistrationXlsx(
  data: ArrayBuffer | Uint8Array | string
): Promise<ParseBulkXlsxResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    const bytes =
      typeof data === 'string'
        ? Uint8Array.from(atob(data), (char) => char.charCodeAt(0))
        : new Uint8Array(data);
    const archiveError = validateXlsxArchive(bytes);
    if (archiveError) return emptyResult(archiveError);
    await workbook.xlsx.load(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    );
  } catch {
    return emptyResult(
      'Failed to read Excel file. Please ensure it is a valid, unencrypted .xlsx spreadsheet.'
    );
  }

  const worksheet =
    workbook.worksheets.find((sheet) => sheet.name.toLowerCase() === 'participants') ??
    workbook.worksheets[0];
  if (!worksheet) return emptyResult('No valid worksheet found in workbook.', 'sheet');
  if (
    worksheet.rowCount > MAX_WORKSHEET_ROWS ||
    worksheet.actualColumnCount > MAX_WORKSHEET_COLUMNS
  )
    return emptyResult(
      'Workbook exceeds the limit of 500 participant rows and 20 columns.',
      'sheet'
    );
  if (worksheet.rowCount < 2)
    return emptyResult(
      'No participant rows found. Please enter at least 5 participants in the template.',
      'rows'
    );

  const headers = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, column) => headers.set(cellText(cell).toLowerCase(), column));
  const findColumn = (names: string[]): number | undefined =>
    names.map((name) => headers.get(name.toLowerCase())).find((column) => column !== undefined);
  const fieldColumns = {
    fullName: findColumn(['Full Name', 'Name', 'FullName', 'Participant Name']),
    email: findColumn(['Email Address', 'Email', 'EmailAddress']),
    mobile: findColumn(['Mobile Number', 'Mobile', 'Phone', 'PhoneNumber']),
    whatsapp: findColumn(['WhatsApp Number', 'WhatsApp', 'WhatsappNumber']),
    city: findColumn(['City', 'Town', 'Location']),
    slNo: findColumn(['Sl. No.', 'Sl No', 'S.No', 'Serial']),
  };
  if (!fieldColumns.fullName || !fieldColumns.email || !fieldColumns.mobile) {
    return emptyResult(
      'Required columns are missing. Use the official template without renaming its headers.',
      'headers'
    );
  }

  const errors: RowError[] = [];
  const attendees: BulkAttendeeRowInput[] = [];
  const seenEmails = new Set<string>();
  const duplicateEmails: string[] = [];
  let nonBlankRows = 0;
  const read = (row: ExcelJS.Row, column?: number): string =>
    column ? cellText(row.getCell(column)) : '';

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const fullName = read(row, fieldColumns.fullName);
    const email = read(row, fieldColumns.email).toLowerCase();
    const mobileNumber = read(row, fieldColumns.mobile);
    if (!fullName && !email && !mobileNumber) return;
    nonBlankRows += 1;
    const result = bulkAttendeeRowSchema.safeParse({
      slNo: read(row, fieldColumns.slNo) || rowNumber - 1,
      fullName,
      email,
      mobileNumber,
      whatsappNumber: read(row, fieldColumns.whatsapp) || undefined,
      city: read(row, fieldColumns.city) || undefined,
    });
    if (!result.success) {
      result.error.issues.forEach((issue) =>
        errors.push({
          rowNumber,
          field: issue.path[0]?.toString() || 'general',
          message: issue.message,
        })
      );
      return;
    }
    if (seenEmails.has(result.data.email)) {
      duplicateEmails.push(result.data.email);
      errors.push({
        rowNumber,
        field: 'email',
        message: `Duplicate email address "${result.data.email}" found within the file. Each participant must have a unique email for ticket dispatch.`,
      });
      return;
    }
    seenEmails.add(result.data.email);
    attendees.push(result.data);
  });

  if (nonBlankRows === 0)
    return emptyResult(
      'No participant rows found. Please enter at least 5 participants in the template.',
      'rows'
    );
  if (attendees.length < 5 && errors.length === 0)
    errors.push({
      rowNumber: 0,
      field: 'participantCount',
      message: `Bulk registration requires a minimum of 5 participants. Found ${attendees.length} valid row(s).`,
    });
  return {
    valid: errors.length === 0,
    totalRowsFound: nonBlankRows,
    validAttendeesCount: attendees.length,
    attendees,
    errors,
    duplicateEmails,
  };
}
