/**
 * Utility functions for parsing payment codes from various QR code formats
 */

/**
 * Extracts a 6-digit payment code from scanned QR text
 * Handles various formats:
 * - Plain 6-digit codes: "123456"
 * - URLs with codes: "https://app.com/pay/123456"
 * - URLs with query params: "https://app.com/pay?code=123456"
 * - Text with embedded codes: "Payment Code: 123456"
 */
export function parsePaymentCode(scannedText: string): string | null {
  if (!scannedText || typeof scannedText !== 'string') {
    return null;
  }

  // Clean and normalize the text
  const cleanText = scannedText.trim();

  // Pattern 1: Direct 6-digit code
  if (/^\d{6}$/.test(cleanText)) {
    return cleanText;
  }

  // Pattern 2: Find any 6-digit sequence in the text
  const sixDigitMatch = cleanText.match(/\b(\d{6})\b/);
  if (sixDigitMatch) {
    return sixDigitMatch[1];
  }

  // Pattern 3: URL path extraction (e.g., /pay/123456, /payment/123456)
  const urlPathMatch = cleanText.match(/\/(?:pay|payment|code)\/(\d{6})\b/i);
  if (urlPathMatch) {
    return urlPathMatch[1];
  }

  // Pattern 4: Query parameter extraction
  const queryParamMatch = cleanText.match(/[?&](?:code|payment|paymentCode)=(\d{6})\b/i);
  if (queryParamMatch) {
    return queryParamMatch[1];
  }

  // Pattern 5: Common text patterns
  const textPatterns = [
    /payment\s*code[:\s]*(\d{6})/i,
    /code[:\s]*(\d{6})/i,
    /pay[:\s]*(\d{6})/i,
    /\#(\d{6})\b/,
  ];

  for (const pattern of textPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validates that a payment code is exactly 6 digits
 */
export function isValidPaymentCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Formats a payment code for display (e.g., "123456" -> "123 456")
 */
export function formatPaymentCode(code: string): string {
  if (!isValidPaymentCode(code)) {
    return code;
  }
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}