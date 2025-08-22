import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import StaffPOS from '../StaffPOS'

// Mock router params
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ merchantId: 'test-merchant-id' })
  }
})

// Mock Supabase
const mockInvoke = vi.fn()
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke
    }
  }
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

const renderStaffPOS = () => {
  return render(
    <BrowserRouter>
      <StaffPOS />
    </BrowserRouter>
  )
}

describe('StaffPOS', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('renders the payment terminal interface', () => {
    renderStaffPOS()
    
    expect(screen.getByText('Payment Terminal')).toBeInTheDocument()
    expect(screen.getByText('Enter 6-digit payment code')).toBeInTheDocument()
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument()
  })

  it('displays keypad numbers', () => {
    renderStaffPOS()
    
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: i.toString() })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('handles keypad input correctly', async () => {
    const user = userEvent.setup()
    renderStaffPOS()
    
    // Click some numbers
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    
    // Check if code display shows the input
    expect(screen.getByText('123•••')).toBeInTheDocument()
  })

  it('limits input to 6 digits', async () => {
    const user = userEvent.setup()
    renderStaffPOS()
    
    // Try to input 7 digits
    for (let i = 1; i <= 7; i++) {
      await user.click(screen.getByRole('button', { name: i.toString() }))
    }
    
    // Should only show 6 digits
    expect(screen.getByText('123456')).toBeInTheDocument()
  })

  it('handles delete button', async () => {
    const user = userEvent.setup()
    renderStaffPOS()
    
    // Input some digits
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    
    expect(screen.getByText('123•••')).toBeInTheDocument()
    
    // Delete one digit
    await user.click(screen.getByRole('button', { name: /delete/i }))
    
    expect(screen.getByText('12••••')).toBeInTheDocument()
  })

  it('validates code when 6 digits are entered', async () => {
    const user = userEvent.setup()
    mockInvoke.mockResolvedValueOnce({
      data: {
        originalAmount: 100,
        finalAmount: 80,
        cashbackAmount: 5,
        merchantName: 'Test Merchant'
      },
      error: null
    })
    
    renderStaffPOS()
    
    // Input 6 digits
    for (let i = 1; i <= 6; i++) {
      await user.click(screen.getByRole('button', { name: i.toString() }))
    }
    
    // Wait a bit for the effect to trigger
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(mockInvoke).toHaveBeenCalledWith('validatePendingTransaction', {
      body: { paymentCode: '123456', merchantId: 'test-merchant-id', captureNow: false }
    })
  })

  it('shows confirmation screen after successful validation', async () => {
    const user = userEvent.setup()
    mockInvoke.mockResolvedValueOnce({
      data: {
        originalAmount: 100,
        finalAmount: 80,
        cashbackAmount: 5,
        merchantName: 'Test Merchant'
      },
      error: null
    })
    
    renderStaffPOS()
    
    // Input 6 digits to trigger validation
    for (let i = 1; i <= 6; i++) {
      await user.click(screen.getByRole('button', { name: i.toString() }))
    }
    
    // Wait a bit for the effect to trigger and state to update
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(screen.getByText('Confirm Payment')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument() // Bill amount
    expect(screen.getByText('$80.00')).toBeInTheDocument() // Customer pays
    expect(screen.getByText('$5.00')).toBeInTheDocument() // Credits to issue
  })

  it('shows QR scanner when scan button is clicked', async () => {
    const user = userEvent.setup()
    renderStaffPOS()
    
    await user.click(screen.getByRole('button', { name: /scan qr code/i }))
    
    expect(screen.getByText('Scan Payment QR Code')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel scan/i })).toBeInTheDocument()
  })

  it('cancels QR scan and returns to main screen', async () => {
    const user = userEvent.setup()
    renderStaffPOS()
    
    // Start scanning
    await user.click(screen.getByRole('button', { name: /scan qr code/i }))
    expect(screen.getByText('Scan Payment QR Code')).toBeInTheDocument()
    
    // Cancel scanning
    await user.click(screen.getByRole('button', { name: /cancel scan/i }))
    
    // Should be back to main screen
    expect(screen.getByText('Payment Terminal')).toBeInTheDocument()
    expect(screen.getByText('Enter 6-digit payment code')).toBeInTheDocument()
  })
})