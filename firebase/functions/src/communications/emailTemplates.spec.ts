import { describe, it, expect } from 'vitest';
import { renderEmail } from './emailTemplates.js';

describe('Email Templates Engine', () => {
  it('renders TICKET_ISSUED template with correct data and dress code notice', () => {
    const rendered = renderEmail('TICKET_ISSUED', {
      recipientName: 'Aarav Sharma',
      reference: 'PIP5-S-TEST1234',
      ticketCount: 2,
      statusUrl: 'https://party-in-pink-5.netlify.app/status?token=token123',
    });

    expect(rendered.subject).toContain('PIP5-S-TEST1234');
    expect(rendered.subject).toContain('Confirmed');
    expect(rendered.html).toContain('Aarav Sharma');
    expect(rendered.html).toContain('PIP5-S-TEST1234');
    expect(rendered.html).toContain('pink clothing or accessories');
    expect(rendered.text).toContain('Aarav Sharma');
  });

  it('renders PAYMENT_SUBMITTED template with reference and UTR', () => {
    const rendered = renderEmail('PAYMENT_SUBMITTED', {
      recipientName: 'Pooja Hegde',
      reference: 'PIP5-S-POOJA1',
      amountFormatted: '₹199',
      utr: '428812345678',
      statusUrl: 'https://party-in-pink-5.netlify.app/status?token=token456',
    });

    expect(rendered.subject).toContain('PIP5-S-POOJA1');
    expect(rendered.html).toContain('428812345678');
    expect(rendered.html).toContain('₹199');
    expect(rendered.html).toContain('Verification in Progress');
    expect(rendered.html).toContain('Under Verification');
  });

  it('renders DONATION_THANK_YOU template with 80G tax exemption info', () => {
    const rendered = renderEmail('DONATION_THANK_YOU', {
      recipientName: 'Suresh Kumar',
      reference: 'PIP5-D-DON1234',
      amountFormatted: '₹5,000',
      pan: 'ABCDE1234F',
    });

    expect(rendered.subject).toContain('PIP5-D-DON1234');
    expect(rendered.html).toContain('₹5,000');
    expect(rendered.html).toContain('80G Notice:');
    expect(rendered.html).toContain('ABCDE1234F');
    expect(rendered.text).toContain('breast cancer care and surgeries');
    expect(rendered.text).toContain('do not provide an 80G certificate');
  });

  it('renders DONATION_THANK_YOU template with complimentary passes when ticketCount > 0', () => {
    const rendered = renderEmail('DONATION_THANK_YOU', {
      recipientName: 'Silver Sponsor',
      reference: 'PIP5-D-SLV1234',
      amountFormatted: '₹10,000',
      ticketCount: 2,
    });

    expect(rendered.subject).toContain('PIP5-D-SLV1234');
    expect(rendered.html).toContain('Complimentary Passes:');
    expect(rendered.html).toContain('2 Passes Included');
    expect(rendered.text).toContain('Complimentary Passes: 2 Passes Included');
  });

  it('escapes untrusted recipient content in HTML emails', () => {
    const rendered = renderEmail('TICKET_ISSUED', {
      recipientName: '<img src=x onerror=alert(1)>',
      reference: 'PIP5-S-SAFE',
      statusUrl: 'https://pip.rotaractjpnagar.org/status/token',
    });

    expect(rendered.html).not.toContain('<img src=x');
    expect(rendered.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('formats PASS IDs correctly with PIP5-REG, PIP5-BUL, and PIP5-DON prefixes', () => {
    const regular = renderEmail('TICKET_ISSUED', {
      recipientName: 'Single Attendee',
      reference: 'PIP5-S-ABC123',
    });
    expect(regular.html).toContain('PASS #PIP5-REG-ABC123');

    const bulk = renderEmail('TICKET_ISSUED', {
      recipientName: 'Bulk Attendee',
      reference: 'PIP5-B-XYZ789',
      registrationId: 'PIP5-BUL-XYZ789-P02',
    });
    expect(bulk.html).toContain('PASS #PIP5-BUL-XYZ789-P02');

    const donor = renderEmail('TICKET_ISSUED', {
      recipientName: 'Donor Guest',
      reference: 'PIP5-D-DON999',
      registrationId: 'PIP5-DON-DON999-P01',
    });
    expect(donor.html).toContain('PASS #PIP5-DON-DON999-P01');
  });

  it('formats QR payload with KonfHub checkin app spec when bookingId is present', () => {
    const rendered = renderEmail('TICKET_ISSUED', {
      recipientName: 'Checkin Attendee',
      reference: 'PIP5-S-SCAN1',
      bookingId: '7f43c912',
      konfhubEventId: '9f4df047-f684-4ded-af0d-96e8f0459604',
    });

    const expectedPayload = 'id:7f43c912|n:Checkin Attendee|eid:9f4df047-f684-4ded-af0d-96e8f0459604';
    expect(rendered.html).toContain(encodeURIComponent(expectedPayload));
    expect(rendered.html).toContain('PASS #PIP5-REG-SCAN1');
  });
});
