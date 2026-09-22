import https from 'https';
import {
  KONFHUB_ACCESS_CODE_BULK,
  KONFHUB_ACCESS_CODE_FREE,
  KONFHUB_API_KEY,
  KONFHUB_EVENT_ID,
  KONFHUB_INTERNAL_BULK_TICKET_ID,
  KONFHUB_INTERNAL_DONOR_TICKET_ID,
  KONFHUB_INTERNAL_SINGLE_TICKET_ID,
} from '../../config/secrets.js';

export interface KonfHubAttendee {
  id?: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  whatsappNumber?: string | null;
  clubName?: string | null;
  organisationName?: string | null;
}

export interface IssuePassesInput {
  orderType: 'SINGLE' | 'BULK' | 'DONOR';
  orderReference?: string;
  attendees: KonfHubAttendee[];
  organisationName?: string | null;
  onChunkIssued?: (
    attendeeIds: string[],
    details: IssuePassesResult['ticketDetails']
  ) => Promise<void>;
}

export interface IssuePassesResult {
  success: boolean;
  totalAttendees: number;
  issuedCount: number;
  ticketZipUrl?: string | null;
  ticketDetails: Array<{
    attendeeId?: string;
    email: string;
    registrationId?: string;
    bookingId?: string;
    ticketPdfUrl?: string;
  }>;
  errors: Array<{
    chunkIndex: number;
    attendeeIds: string[];
    ambiguous: boolean;
    error: unknown;
  }>;
}

const KONFHUB_ENDPOINT = 'https://api.konfhub.com/event/capture/v2';

export function chunkAttendees(attendees: KonfHubAttendee[], chunkSize = 20): KonfHubAttendee[][] {
  const chunks: KonfHubAttendee[][] = [];
  for (let index = 0; index < attendees.length; index += chunkSize) {
    chunks.push(attendees.slice(index, index + chunkSize));
  }
  return chunks;
}

function postJSON(
  url: string,
  headers: Record<string, string>,
  body: string
): Promise<{ ok: boolean; status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts: https.RequestOptions = {
      method: 'POST',
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(raw);
        } catch {
          json = { raw };
        }
        resolve({
          ok: (res.statusCode ?? 500) >= 200 && (res.statusCode ?? 500) < 300,
          status: res.statusCode ?? 500,
          json,
        });
      });
    });

    req.on('error', reject);

    // 20-second timeout per KonfHub specification
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error('KonfHub API timeout (20s)'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Issues complimentary entry passes via KonfHub Free Capture API v2.
 * Enforces 20-per-call chunking and retry-safe error isolation.
 */
export async function issueKonfHubPasses(input: IssuePassesInput): Promise<IssuePassesResult> {
  const apiKey = KONFHUB_API_KEY.value();
  const eventId = KONFHUB_EVENT_ID.value();

  let primaryTicketId: string;
  let primaryAccessCode: string | undefined;

  if (input.orderType === 'DONOR') {
    primaryTicketId =
      KONFHUB_INTERNAL_DONOR_TICKET_ID.value() ||
      process.env.KONFHUB_INTERNAL_DONOR_TICKET_ID ||
      '121589';
    primaryAccessCode = KONFHUB_ACCESS_CODE_FREE.value() || undefined;
  } else if (input.orderType === 'BULK') {
    primaryTicketId =
      KONFHUB_INTERNAL_BULK_TICKET_ID.value() ||
      process.env.KONFHUB_INTERNAL_BULK_TICKET_ID ||
      '121588';
    primaryAccessCode = KONFHUB_ACCESS_CODE_BULK.value() || undefined;
  } else {
    primaryTicketId =
      KONFHUB_INTERNAL_SINGLE_TICKET_ID.value() ||
      process.env.KONFHUB_INTERNAL_SINGLE_TICKET_ID ||
      '121417';
    primaryAccessCode = KONFHUB_ACCESS_CODE_FREE.value() || undefined;
  }

  const fallbackTicketId = primaryTicketId;
  const fallbackAccessCode = primaryAccessCode;

  if (!apiKey || !eventId || !primaryTicketId) {
    throw new Error('KonfHub secrets are not fully configured.');
  }

  console.log(
    `[KonfHub] Starting pass issuance for ${input.attendees.length} attendees (${input.orderType}, Ticket ID: ${primaryTicketId})`
  );

  const getStandardPassId = (globalIdx: number): string => {
    if (input.orderReference) {
      return input.attendees.length > 1
        ? `${input.orderReference}-P${String(globalIdx + 1).padStart(2, '0')}`
        : input.orderReference;
    }
    return `PIP5-PASS-${Date.now().toString().slice(-6)}-${globalIdx + 1}`;
  };

  const chunkSize = 20;
  const ticketDetails: IssuePassesResult['ticketDetails'] = [];
  const errors: IssuePassesResult['errors'] = [];
  let issuedCount = 0;
  let ticketZipUrl: string | null = null;

  const chunks = chunkAttendees(input.attendees, chunkSize);
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex]!;

    const people = chunk.map((att) => ({
      name: att.fullName.trim(),
      email_id: att.email.toLowerCase().trim(),
      dial_code: '+91',
      country_code: 'in',
      phone_number: att.mobileNumber.replace(/\D/g, '').slice(-10),
      organisation:
        input.organisationName ||
        att.organisationName ||
        att.clubName ||
        'Party In Pink 5.0 Participant',
      designation: 'Delegate',
    }));

    const buildPayload = (ticketId: string) =>
      JSON.stringify({
        event_id: eventId,
        registration_tz: 'Asia/Kolkata',
        registration_details: { [ticketId]: people },
      });

    const buildHeaders = (code?: string) => {
      const h: Record<string, string> = {
        'x-api-key': apiKey,
      };
      if (code) {
        h['x-access-code'] = code;
      }
      return h;
    };

    try {
      // First attempt with primary ticket ID
      let response = await postJSON(
        KONFHUB_ENDPOINT,
        buildHeaders(primaryAccessCode),
        buildPayload(primaryTicketId)
      );

      // Check if ticket is inaccessible and fallback is available
      const isTicketInaccessible =
        response.json?.error?.error_code === 'ASC-20' ||
        response.status === 403 ||
        /ticket is not accessible/i.test(response.json?.error_message || '');

      if (!response.ok && isTicketInaccessible && primaryTicketId !== fallbackTicketId) {
        console.warn(`[KonfHub] Primary ticket inaccessible, retrying with fallback ticket...`);
        response = await postJSON(
          KONFHUB_ENDPOINT,
          buildHeaders(fallbackAccessCode),
          buildPayload(fallbackTicketId)
        );
      }

      if (response.ok) {
        issuedCount += chunk.length;
        const chunkDetails: IssuePassesResult['ticketDetails'] = [];
        const bookingIds: string[] = Array.isArray(response.json?.booking_id)
          ? response.json.booking_id
          : response.json?.booking_id
            ? [response.json.booking_id]
            : [];
        const urlMap = response.json?.url || {};
        if (urlMap.zip) ticketZipUrl = urlMap.zip;

        chunk.forEach((att, idx) => {
          const bookingId = bookingIds[idx] || bookingIds[0];
          const ticketPdfUrl =
            (bookingId && urlMap[bookingId]?.ticket) ||
            urlMap.ticket ||
            null;
          const globalIdx = chunkIndex * chunkSize + idx;
          const defaultRegId = getStandardPassId(globalIdx);
          const rawRegId =
            bookingId ||
            response.json?.registrations?.[idx]?.registration_id ||
            response.json?.registration_id;
          const regId =
            rawRegId && !String(rawRegId).includes('EXISTING')
              ? String(rawRegId)
              : defaultRegId;
          const detail = {
            attendeeId: att.id,
            email: att.email,
            registrationId: regId,
            bookingId: bookingId || undefined,
            ticketPdfUrl: ticketPdfUrl || undefined,
          };
          ticketDetails.push(detail);
          chunkDetails.push(detail);
        });
        if (input.onChunkIssued) {
          await input.onChunkIssued(
            chunk.flatMap((attendee) => (attendee.id ? [attendee.id] : [])),
            chunkDetails
          );
        }
        console.log(`[KonfHub] Chunk ${chunkIndex + 1} (${chunk.length} attendees) fulfilled.`);
      } else if (response.json?.error?.error_code === 'CPTR-4') {
        console.log(
          `[KonfHub] Chunk ${chunkIndex + 1} attendees already registered on KonfHub (CPTR-4 duplicate acknowledged).`
        );
        issuedCount += chunk.length;
        const chunkDetails: IssuePassesResult['ticketDetails'] = [];
        chunk.forEach((att, idx) => {
          const globalIdx = chunkIndex * chunkSize + idx;
          const regId = getStandardPassId(globalIdx);
          const detail = {
            attendeeId: att.id,
            email: att.email,
            registrationId: regId,
          };
          ticketDetails.push(detail);
          chunkDetails.push(detail);
        });
        if (input.onChunkIssued) {
          await input.onChunkIssued(
            chunk.flatMap((attendee) => (attendee.id ? [attendee.id] : [])),
            chunkDetails
          );
        }
      } else {
        console.error(`[KonfHub] Error in chunk ${chunkIndex + 1}:`, response.json);
        errors.push({
          chunkIndex,
          attendeeIds: chunk.flatMap((attendee) => (attendee.id ? [attendee.id] : [])),
          ambiguous: response.status >= 500,
          error: response.json,
        });
      }
    } catch (netErr: any) {
      console.error(`[KonfHub] Network/Timeout error in chunk ${chunkIndex + 1}:`, netErr);
      errors.push({
        chunkIndex,
        attendeeIds: chunk.flatMap((attendee) => (attendee.id ? [attendee.id] : [])),
        ambiguous: true,
        error: netErr?.message || 'Network error',
      });
    }
  }

  const success = errors.length === 0 && issuedCount === input.attendees.length;

  return {
    success,
    totalAttendees: input.attendees.length,
    issuedCount,
    ticketZipUrl,
    ticketDetails,
    errors,
  };
}
