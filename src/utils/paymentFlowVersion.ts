/**
 * Payment Flow Version Management
 * Flow 1: Customer enters bill amount (current behavior)
 * Flow 2: Merchant keys in amount during validation
 */

export type PaymentFlowVersion = '1' | '2';

export const getPaymentFlowVersion = (): PaymentFlowVersion => {
  // 1. Check URL parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const flowParam = urlParams.get('flow');
  if (flowParam === '1' || flowParam === '2') {
    return flowParam;
  }
  
  // 2. Check localStorage override
  const localStorageFlow = localStorage.getItem('app.paymentFlowVersion');
  if (localStorageFlow === '1' || localStorageFlow === '2') {
    return localStorageFlow;
  }
  
  // 3. Default to Flow 1 (current behavior)
  return '1';
};

export const setPaymentFlowVersion = (version: PaymentFlowVersion) => {
  localStorage.setItem('app.paymentFlowVersion', version);
};

export const getPaymentFlowDisplayName = (version?: PaymentFlowVersion): string => {
  const flow = version || getPaymentFlowVersion();
  return `Payment Flow ${flow}`;
};