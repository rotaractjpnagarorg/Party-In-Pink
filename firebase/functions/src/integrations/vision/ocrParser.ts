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

  // 1. Extract 12-digit UTR / RRN / UPI Ref
  // Many apps place the label and digits on the same line or next line,
  // and mobile apps often format the 12 digits with spaces (e.g. 4268 2910 4821).
  const labeledRegex =
    /(?:UTR|RRN|UPI\s*(?:Transaction|Txn|Ref|Reference)?\s*(?:ID|Id|No|Number)?|Bank\s*(?:Ref|Reference)?\s*(?:No|Id)?|Transaction\s*(?:ID|Id|Ref)?|Ref\s*(?:No|Id|Number)?|Txn\s*(?:ID|Id)?)\s*[:#-]?\s*([0-9][0-9\s-]{10,16}[0-9])/i;
  
  const labeledMatch = rawText.match(labeledRegex);
  if (labeledMatch && labeledMatch[1]) {
    const candidate = labeledMatch[1].replace(/[\s-]/g, '');
    if (candidate.length === 12 && /^[0-9]{12}$/.test(candidate)) {
      transactionReference = candidate;
      confidence += 0.6;
    }
  }

  // Secondary fallback for 12-digit sequences with standard 4-4-4 spacing or pure 12 digits
  if (!transactionReference) {
    // 4-4-4 spacing: e.g. 4268 2910 4821
    const spacedMatch = rawText.match(/\b([0-9]{4})\s+([0-9]{4})\s+([0-9]{4})\b/);
    if (spacedMatch) {
      transactionReference = `${spacedMatch[1]}${spacedMatch[2]}${spacedMatch[3]}`;
      confidence += 0.45;
    }
  }

  // Tertiary fallback: pure standalone 12 digits
  if (!transactionReference) {
    const standalone12Regex = /\b([0-9]{12})\b/g;
    const standaloneMatches = [...rawText.matchAll(standalone12Regex)];
    if (standaloneMatches.length > 0 && standaloneMatches[0]?.[1]) {
      transactionReference = standaloneMatches[0][1];
      confidence += 0.35;
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

  // 3. Extract Status Keyword (prioritizing strong confirmations)
  const strongStatusRegex =
    /\b(Transaction\s+Successful|Payment\s+Successful|Transfer\s+Successful|Paid\s+Successfully|Money\s+Sent\s+Successfully|Completed|Successful|Success)\b/i;
  const strongMatch = rawText.match(strongStatusRegex);
  if (strongMatch && strongMatch[1]) {
    paymentStatusText = strongMatch[1];
    confidence += 0.1;
  } else {
    const fallbackStatusRegex = /\b(Paid)\b/i;
    const fallbackMatch = rawText.match(fallbackStatusRegex);
    if (fallbackMatch && fallbackMatch[1]) {
      paymentStatusText = fallbackMatch[1];
      confidence += 0.05;
    }
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
