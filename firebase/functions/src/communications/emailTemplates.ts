export interface EmailTemplateData {
  recipientName: string;
  reference: string;
  amountFormatted?: string;
  ticketCount?: number;
  statusUrl?: string;
  pan?: string | null;
  utr?: string | null;
  registrationId?: string | null;
  ticketPdfUrl?: string | null;
  bookingId?: string | null;
  konfhubEventId?: string | null;
  reason?: string | null;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderEmail(
  templateKey: string,
  data: EmailTemplateData
): { subject: string; html: string; text: string } {
  const safe = {
    recipientName: escapeHtml(data.recipientName),
    reference: escapeHtml(data.reference),
    amountFormatted: escapeHtml(data.amountFormatted),
    ticketCount: escapeHtml(data.ticketCount || 1),
    statusUrl: escapeHtml(data.statusUrl || 'https://pip.rotaractjpnagar.org/status'),
    pan: escapeHtml(data.pan),
    utr: escapeHtml(data.utr || 'Screenshot uploaded'),
    registrationId: escapeHtml(data.registrationId || data.reference),
    ticketPdfUrl: data.ticketPdfUrl ? escapeHtml(data.ticketPdfUrl) : null,
    reason: escapeHtml(data.reason || 'Payment transaction could not be reconciled with bank statements'),
  };
  const baseLayout = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #db2777, #f43f5e); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 24px; line-height: 1.6; font-size: 14px; }
    .badge { display: inline-block; background: #fdf2f8; color: #db2777; font-weight: 700; padding: 4px 12px; border-radius: 9999px; font-size: 12px; margin-bottom: 12px; }
    .details-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 13px; }
    .button { display: inline-block; background: #db2777; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 12px; font-size: 13px; margin: 16px 0; text-align: center; }
    .footer { padding: 20px 24px; background: #f1f5f9; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Party In Pink 5.0</h1>
      <p>Rotaract Club of Bangalore JP Nagar • RI District 3191</p>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>Party In Pink 5.0 raises breast cancer awareness and funds for care through Sri Shankara Cancer Foundation.</p>
      <p>© 2026 Rotaract Club of Bangalore JP Nagar. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  if (templateKey === 'TICKET_ISSUED') {
    const subject = `🎟️ Your Passes for Party In Pink 5.0 are Confirmed! (${data.reference})`;
    let cleanPassId = data.registrationId || data.reference;

    if (cleanPassId.startsWith('PIP5-S-')) {
      cleanPassId = cleanPassId.replace('PIP5-S-', 'PIP5-REG-');
    } else if (cleanPassId.startsWith('PIP5-B-')) {
      cleanPassId = cleanPassId.replace('PIP5-B-', 'PIP5-BUL-');
    } else if (cleanPassId.startsWith('PIP5-D-')) {
      cleanPassId = cleanPassId.replace('PIP5-D-', 'PIP5-DON-');
    } else if (cleanPassId.startsWith('KH-EXISTING') || !cleanPassId.startsWith('PIP5-')) {
      cleanPassId = data.reference
        .replace(/^PIP5-S-/, 'PIP5-REG-')
        .replace(/^PIP5-B-/, 'PIP5-BUL-')
        .replace(/^PIP5-D-/, 'PIP5-DON-');
    }
    cleanPassId = cleanPassId.replace(/-TKT(?=-|$)/i, '');

    const safePassId = escapeHtml(cleanPassId);
    const eventId = data.konfhubEventId || '9f4df047-f684-4ded-af0d-96e8f0459604';
    const qrPayload = data.bookingId
      ? `id:${data.bookingId}|n:${data.recipientName}|eid:${eventId}`
      : cleanPassId;
    const qrData = encodeURIComponent(qrPayload);
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${qrData}`;

    const html = baseLayout(
      subject,
      `
      <span class="badge">Passes Confirmed</span>
      <h2>Hello ${safe.recipientName},</h2>
      <p>Your registration for <strong>Party In Pink 5.0</strong> has been verified and your passes are confirmed!</p>

      <div style="background: #fdf2f8; border: 2px dashed #f472b6; border-radius: 16px; padding: 24px 16px; text-align: center; margin: 24px 0;">
        <div style="font-size: 11px; font-weight: 800; color: #db2777; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Official Entry Pass QR</div>
        <img src="${qrImgUrl}" alt="Entry Pass QR Code" style="display: block; margin: 0 auto 12px auto; border-radius: 8px; border: 4px solid #ffffff; box-shadow: 0 4px 10px rgba(219,39,119,0.15);" width="180" height="180" />
        <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #831843; letter-spacing: 2px;">
          PASS #${safePassId}
        </div>
        <div style="font-size: 12px; color: #9d174d; margin-top: 6px;">
          Show this QR code at the venue gate for instant check-in on <strong>11 October 2026, 7:30 AM</strong>.
        </div>
      </div>

      <div class="details-box">
        <strong>Booking Reference:</strong> ${safe.reference}<br>
        <strong>Ticket Pass ID:</strong> ${safePassId}<br>
        <strong>Number of Passes:</strong> ${safe.ticketCount}<br>
        <strong>Event Date:</strong> Sunday, 11 October 2026<br>
        <strong>Event Time:</strong> 7:30 AM onwards<br>
        <strong>Venue:</strong> SSMRV College, Jayanagar 4th T Block, Bengaluru
      </div>

      ${
        safe.ticketPdfUrl
          ? `
      <div style="text-align: center; margin: 20px 0;">
        <a href="${safe.ticketPdfUrl}" class="button" style="color: #ffffff; background: #db2777; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; display: inline-block;">
          🎟️ Download Official Ticket (PDF)
        </a>
      </div>
      <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: -8px;">
        Your official ticket PDF has also been attached directly to this email.
      </p>
      `
          : ''
      }

      <div style="background: #fdf2f8; border-left: 4px solid #db2777; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
        <strong style="color: #db2777;">Dress Code Notice:</strong>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #831843;">
          Please wear your favourite <strong>pink clothing or accessories</strong> to stand in solidarity with breast cancer fighters and survivors!
        </p>
      </div>

      <p>You can track your live entry pass and order status anytime using your secure link:</p>
      <p style="text-align: center;">
        <a href="${safe.statusUrl}" class="button" style="color: #ffffff;">View Registration Status</a>
      </p>
      <p>Thank you for joining the movement to save lives through early detection!</p>
      `
    );
    const text = `Hello ${data.recipientName},\n\nYour passes for Party In Pink 5.0 are confirmed!\nBooking Reference: ${data.reference}\nPass ID: ${cleanPassId}\nPasses: ${data.ticketCount || 1}\n\nDress Code: Please wear pink attire!\nTrack status: ${data.statusUrl}\n\nRotaract Club of Bangalore JP Nagar`;
    return { subject, html, text };
  }

  if (templateKey === 'PAYMENT_SUBMITTED') {
    const subject = `💳 Payment Details Received — Party In Pink 5.0 (${data.reference})`;
    const html = baseLayout(
      subject,
      `
      <span class="badge">Payment Received • Verification in Progress</span>
      <h2>Hello ${safe.recipientName},</h2>
      <p>Thank you for registering for <strong>Party In Pink 5.0</strong>! We have received your payment details for booking reference <strong>${safe.reference}</strong>.</p>

      <div class="details-box">
        <strong>Booking Reference:</strong> ${safe.reference}<br>
        <strong>Amount:</strong> ${safe.amountFormatted || 'N/A'}<br>
        <strong>Transaction Ref (UTR):</strong> ${safe.utr}<br>
        <strong>Status:</strong> Under Verification
      </div>

      <p>Our team is currently verifying the transaction with the bank. Once confirmed (typically within 2 to 4 hours), your official entry pass with your unique QR code will be automatically issued to your email.</p>

      <p>You can track your live registration and pass status anytime:</p>
      <p style="text-align: center;">
        <a href="${safe.statusUrl}" class="button" style="color: #ffffff;">View Registration Status</a>
      </p>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        Have a question or need assistance? Reply directly to this email or reach us on WhatsApp at <strong>+91 83103 98636</strong>.
      </p>
      `
    );
    const text = `Hello ${data.recipientName},\n\nThank you for registering for Party In Pink 5.0! We have received your payment details for booking ${data.reference}.\n\nBooking Reference: ${data.reference}\nAmount: ${data.amountFormatted || 'N/A'}\nTransaction Ref (UTR): ${data.utr || 'Submitted'}\nStatus: Under Verification\n\nOur team is verifying the transaction with the bank. Once confirmed, your official entry pass with your QR code will be sent to your email automatically.\n\nTrack status: ${data.statusUrl}\n\nRotaract Club of Bangalore JP Nagar`;
    return { subject, html, text };
  }

  if (templateKey === 'DONATION_THANK_YOU') {
    const subject = `💖 Thank You for Supporting Breast Cancer Care — Party In Pink 5.0 (${data.reference})`;
    const hasPasses = Boolean(data.ticketCount && data.ticketCount > 0);
    const html = baseLayout(
      subject,
      `
      <span class="badge">Heartfelt Gratitude</span>
      <h2>Dear ${safe.recipientName},</h2>
      <p>Thank you so much for your kind contribution of <strong>${safe.amountFormatted}</strong> towards Party In Pink 5.0.</p>
      <p>Your contribution supports breast cancer care and surgeries through Sri Shankara Cancer Foundation.</p>

      <div class="details-box">
        <strong>Donation Reference:</strong> ${safe.reference}<br>
        <strong>Contributed Amount:</strong> ${safe.amountFormatted || 'N/A'}<br>
        ${hasPasses ? `<strong>Complimentary Passes:</strong> ${safe.ticketCount} Passes Included<br>` : ''}
        ${data.pan ? `<strong>PAN Number:</strong> ${safe.pan}<br>` : ''}
        <strong>80G Notice:</strong> The event payment accounts do not provide an 80G certificate
      </div>

      ${
        hasPasses
          ? `
      <div style="background: #fdf2f8; border-left: 4px solid #db2777; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
        <strong style="color: #db2777; font-size: 14px;">🎟️ Your Complimentary Passes:</strong>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #831843; line-height: 1.5;">
          As part of your sponsorship tier, <strong>${safe.ticketCount} complimentary passes</strong> have been allocated to you! Your official entry passes and QR codes are being issued to your email.
        </p>
      </div>
      `
          : ''
      }

      <p>If you require an 80G certificate, contact the organizing team before making a donation so they can guide you through the appropriate eligible process.</p>
      <p>With warm regards,<br><strong>Rotaract Club of Bangalore JP Nagar & Rotary Bangalore South</strong></p>
      `
    );
    const text = `Dear ${data.recipientName},\n\nThank you for your generous contribution of ${data.amountFormatted} to Party In Pink 5.0 (Ref: ${data.reference}). Your contribution supports breast cancer care and surgeries through Sri Shankara Cancer Foundation.\n\n${hasPasses ? `Complimentary Passes: ${data.ticketCount} Passes Included (Official tickets with QR codes sent in a separate email).\n\n` : ''}The event payment accounts do not provide an 80G certificate. Contact the organizing team before donating if you require an eligible receipt.\n\nRotaract Club of Bangalore JP Nagar`;
    return { subject, html, text };
  }

  if (templateKey === 'PAYMENT_REJECTED') {
    const subject = `⚠️ Action Needed: Payment Verification for Party In Pink 5.0 (${data.reference})`;
    const html = baseLayout(
      subject,
      `
      <span class="badge" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">Payment Verification Unsuccessful</span>
      <h2>Dear ${safe.recipientName},</h2>
      <p>We are reaching out regarding your booking <strong>${safe.reference}</strong> for Party In Pink 5.0.</p>
      <p>Our volunteer finance team reviewed the payment reference submitted for your registration, but could not reconcile it with our bank records.</p>

      <div class="details-box" style="border-left: 4px solid #dc2626; background: #fff5f5;">
        <strong>Booking Reference:</strong> ${safe.reference}<br>
        <strong>Amount:</strong> ${safe.amountFormatted || 'N/A'}<br>
        <strong>Reason:</strong> ${safe.reason}<br>
        <strong>Current Status:</strong> Payment Rejected
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <strong style="color: #0f172a; font-size: 14px;">Next Steps / What to do:</strong>
        <p style="margin: 8px 0 12px 0; font-size: 13px; color: #475569; line-height: 1.6;">
          If you have already completed the transfer and believe this is an error, please contact our organizing and finance team immediately with your transaction screenshot or bank statement so we can manually confirm your passes:
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.8;">
          <li><strong>Email:</strong> <a href="mailto:pip@rotaractjpnagar.org" style="color: #db2777; font-weight: bold;">pip@rotaractjpnagar.org</a></li>
          <li><strong>WhatsApp / Help Desk:</strong> +91 91082 94252 / +91 99029 45788</li>
          <li><strong>Reference to quote:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${safe.reference}</code></li>
        </ul>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${safe.statusUrl}" class="button" style="background: #e11d48;">View Booking Status</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">
        If you have not yet completed the transfer, you may restart your registration on our website at any time.
      </p>

      <p>With warm regards,<br><strong>Organizing Committee • Party In Pink 5.0</strong><br>Rotaract Club of Bangalore JP Nagar</p>
      `
    );
    const text = `Dear ${data.recipientName},\n\nWe are writing regarding your booking ${data.reference} for Party In Pink 5.0.\n\nOur finance team reviewed your submitted payment reference, but could not reconcile it with bank records.\n\nBooking Reference: ${data.reference}\nAmount: ${data.amountFormatted || 'N/A'}\nReason: ${data.reason || 'Payment could not be reconciled'}\nStatus: Payment Rejected\n\nWHAT TO DO NEXT:\nIf you have already transferred the amount, please contact our team with your payment proof:\n- Email: pip@rotaractjpnagar.org\n- WhatsApp/Phone: +91 91082 94252 / +91 99029 45788\n- Quote your booking reference: ${data.reference}\n\nTrack status: ${data.statusUrl}\n\nRotaract Club of Bangalore JP Nagar`;
    return { subject, html, text };
  }

  // Fallback template
  return {
    subject: `Update on Party In Pink 5.0 (${data.reference})`,
    html: baseLayout(
      'Party In Pink 5.0',
      `<p>Hello ${safe.recipientName},</p><p>We have an update regarding your registration ${safe.reference}. Please visit <a href="${safe.statusUrl}">your status page</a> for details.</p>`
    ),
    text: `Hello ${data.recipientName},\n\nUpdate on ${data.reference}: ${data.statusUrl}`,
  };
}
