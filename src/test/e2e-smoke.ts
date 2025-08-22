/**
 * E2E Smoke Test Script for Staff POS
 * 
 * This script tests the basic payment flow end-to-end:
 * 1. Create a pending transaction
 * 2. Validate it via Staff POS
 * 3. Confirm cash collection
 * 
 * Run with: npm run test:e2e
 */

interface TestConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  merchantId: string;
  testAmount: number;
}

interface PendingTransactionResponse {
  transactionId: string;
  paymentCode: string;
  expiresAt: string;
  merchantName: string;
  originalAmount: number;
  finalAmount: number;
}

class StaffPOSSmokeTest {
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;
  }

  private async callSupabaseFunction(functionName: string, body: any): Promise<any> {
    const response = await fetch(`${this.config.supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async createTestTransaction(): Promise<PendingTransactionResponse> {
    console.log('📝 Creating test transaction...');
    
    const response = await this.callSupabaseFunction('createPendingTransaction', {
      merchantId: this.config.merchantId,
      originalAmount: this.config.testAmount,
      anonymousUserId: 'test-user-' + Date.now(),
      localCreditsUsed: 0,
      networkCreditsUsed: 0,
    });

    console.log(`✅ Transaction created: ${response.paymentCode}`);
    return response;
  }

  async validateTransaction(paymentCode: string): Promise<any> {
    console.log(`🔍 Validating transaction: ${paymentCode}`);
    
    const response = await this.callSupabaseFunction('validatePendingTransaction', {
      paymentCode,
      merchantId: this.config.merchantId,
      captureNow: false,
    });

    console.log('✅ Transaction validated successfully');
    return response;
  }

  async confirmCashCollection(paymentCode: string): Promise<any> {
    console.log(`💰 Confirming cash collection: ${paymentCode}`);
    
    const response = await this.callSupabaseFunction('confirmCashCollection', {
      paymentCode,
      merchantId: this.config.merchantId,
    });

    console.log('✅ Cash collection confirmed');
    return response;
  }

  async runSmokeTest(): Promise<void> {
    try {
      console.log('🚀 Starting Staff POS E2E Smoke Test\n');

      // Step 1: Create transaction
      const transaction = await this.createTestTransaction();
      
      // Step 2: Validate transaction (simulating Staff POS)
      const validationResult = await this.validateTransaction(transaction.paymentCode);
      
      // Verify validation response
      if (validationResult.originalAmount !== this.config.testAmount) {
        throw new Error(`Amount mismatch: expected ${this.config.testAmount}, got ${validationResult.originalAmount}`);
      }

      // Step 3: Confirm cash collection
      await this.confirmCashCollection(transaction.paymentCode);

      console.log('\n🎉 All tests passed! Staff POS flow is working correctly.');

    } catch (error) {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    }
  }
}

// Test configuration - update these values for your environment
const testConfig: TestConfig = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'https://imqdasdegvltcgzklbtj.supabase.co',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltcWRhc2RlZ3ZsdGNnemtsYnRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzA4NTMsImV4cCI6MjA3MTAwNjg1M30.cYM4Mb0xMkqVsJmvXNmS7CgNPiWlk2x1mMOIWbGc_aY',
  merchantId: process.env.TEST_MERCHANT_ID || '550e8400-e29b-41d4-a716-446655440001', // Update with valid merchant ID
  testAmount: 25.50,
};

// Run the test
const smokeTest = new StaffPOSSmokeTest(testConfig);
smokeTest.runSmokeTest();