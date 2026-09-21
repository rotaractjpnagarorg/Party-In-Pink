export interface OcrExtractionResult {
  rawText: string;
  transactionReference: string | null;
  extractedAmountPaise: number | null;
  paymentStatusText: string | null;
  confidence: number; // 0.0 to 1.0
}

/**
 * Parses raw OCR text from an Indian UPI or Bank Transfer receipt.
 * Application-agnostic (GPay, PhonePe, Paytm, BHIM, Cred, SBI YONO).
 */
export function parseReceiptOcrText(
  rawText: string,
  expectedAmountPaise?: number
): OcrExtractionResult {
  if (!rawText || rawText.trim().length === 0) {
    return {
      rawText: '',
      transactionReference: null,
      extractedAmountPaise: null,
      paymentStatusText: null,
      confidence: 0,
    };
  }

  let transactionReference: string | null = null;
  let extractedAmountPaise: number | null = null;
  let paymentStatusText: string | null = null;
  let confidence = 0;

  // 1. Extract 12-digit UTR / RRN
  // Primary regex: looks for explicit UTR/RRN/Ref labels followed by 12 digits
  const utrLabeledRegex =
    /(?:UTR|RRN|UPI\s*(?:Ref|Reference|Id)?|Txn\s*(?:Id|Ref)?|Ref\s*(?:No)?|Transaction\s*ID)[:\s#-]*([0-9]{12})\b/i;
  const labeledMatch = rawText.match(utrLabeledRegex);

  if (labeledMatch && labeledMatch[1]) {
    transactionReference = labeledMatch[1];
    confidence += 0.55;
  } else {
    // Secondary fallback: find any standalone 12-digit number (common for UPI UTRs)
    const standalone12Regex = /\b([0-9]{12})\b/g;
    const standaloneMatches = [...rawText.matchAll(standalone12Regex)];
    if (standaloneMatches.length > 0) {
      // Pick the first 12-digit sequence
      transactionReference = standaloneMatches[0]?.[1] || null;
      if (transactionReference) {
        confidence += 0.35;
      }
    }
  }

  // 2. Extract Amount
  // Look for currency symbol or INR/Rs followed by digits
  const amountRegex = /(?:₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
  const amountMatch = rawText.match(amountRegex);

  if (amountMatch && amountMatch[1]) {
    const cleanNumStr = amountMatch[1].replace(/,/g, '');
    const num = parseFloat(cleanNumStr);
    if (!isNaN(num) && num > 0) {
      extractedAmountPaise = Math.round(num * 100);
      confidence += 0.25;

      // Bonus confidence if extracted amount matches expected amount exactly
      if (expectedAmountPaise && extractedAmountPaise === expectedAmountPaise) {
        confidence += 0.15;
      }
    }
  }

  // 3. Extract Status Keyword
  const statusRegex =
    /\b(Transaction\s+Successful|Payment\s+Successful|Transfer\s+Successful|Paid\s+Successfully|Completed|Successful|Success|Paid)\b/i;
  const statusMatch = rawText.match(statusRegex);
  if (statusMatch && statusMatch[1]) {
    paymentStatusText = statusMatch[1];
    confidence += 0.1;
  }

  // Clamp confidence to 1.0
  confidence = Math.min(1.0, Math.round(confidence * 100) / 100);

  return {
    rawText,
    transactionReference,
    extractedAmountPaise,
    paymentStatusText,
    confidence,
  };
}
