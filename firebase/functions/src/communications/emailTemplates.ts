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
    const rawPassId = data.registrationId || data.reference;
    const cleanPassId =
      rawPassId && !rawPassId.startsWith('KH-EXISTING')
        ? rawPassId
        : data.reference;
    const safePassId = escapeHtml(cleanPassId);
    const qrData = encodeURIComponent(cleanPassId);
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
