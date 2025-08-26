/**
 * Format currency values consistently across the app
 */
export function formatCurrency(cents: number | undefined | null, currency: string = '₹'): string {
  if (cents === undefined || cents === null) return `${currency}0.00`;
  
  const amount = cents / 100;
  return `${currency}${amount.toFixed(2)}`;
}

/**
 * Format currency for display (no decimal places for whole numbers)
 */
export function formatCurrencyDisplay(cents: number | undefined | null, currency: string = '₹'): string {
  if (cents === undefined || cents === null) return `${currency}0`;
  
  const amount = cents / 100;
  
  // Show decimals only if there are fractional parts
  if (amount % 1 === 0) {
    return `${currency}${Math.floor(amount)}`;
  }
  
  return `${currency}${amount.toFixed(2)}`;
}