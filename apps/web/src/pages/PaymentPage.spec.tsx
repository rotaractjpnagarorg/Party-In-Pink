import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PaymentPage } from './PaymentPage';
import { EventProvider } from '../context/EventContext';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase functions and storage
vi.mock('../services/firebase', () => ({
  functions: {},
  storage: {},
  db: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
}));

const mockSessionData = {
  sessionId: 'sess_123',
  entityType: 'ORDER',
  merchantReference: 'PIP-TEST-001',
  amountPaise: 49900,
  currency: 'INR',
  status: 'PENDING_PAYMENT',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  upi: {
    pa: 'rotaract@upi',
    pn: 'Rotaract Club',
    am: '499.00',
    cu: 'INR',
    tn: 'PIP-TEST-001',
    intentUrl: 'upi://pay?pa=rotaract@upi&pn=Rotaract&am=499.00&cu=INR&tn=PIP-TEST-001',
  },
  bankAccount: {
    accountName: 'Rotaract Club of JP Nagar',
    bankName: 'Canara Bank',
    accountNumber: '1234567890',
    ifscCode: 'CNRB0001234',
    branch: 'JP Nagar Bangalore',
  },
};

const renderWithProviders = (ui: React.ReactElement, initialEntry = '/') => {
  return render(
    <EventProvider>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </EventProvider>
  );
};

describe('PaymentPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders error notice when accessed without order status token', () => {
    renderWithProviders(<PaymentPage />, '/payment');

    expect(screen.getByText(/Unable to Load Payment/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing order status token/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to Status Page/i })).toBeInTheDocument();
  });

  it('renders Option A / Option B proof toggle when payment session loads', async () => {
    const mockCallable = vi.fn().mockResolvedValue({ data: mockSessionData });
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    renderWithProviders(<PaymentPage />, '/payment?token=valid_test_token');

    // Wait for session to load
    await waitFor(() => {
      expect(screen.getByText(/Confirm Payment/i)).toBeInTheDocument();
    });

    // Verify Option A and Option B toggle buttons exist
    const screenshotTab = screen.getByRole('button', { name: /Upload Screenshot/i });
    const utrTab = screen.getByRole('button', { name: /Enter 12-Digit UTR/i });
    expect(screenshotTab).toBeInTheDocument();
    expect(utrTab).toBeInTheDocument();

    // Default is Option A (Screenshot)
    expect(screen.getByText(/Tap to upload screenshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Cloud Vision will detect your UTR/i)).toBeInTheDocument();

    // Click Option B (Manual UTR)
    fireEvent.click(utrTab);

    // Verify Option B UI elements
    expect(screen.getByLabelText(/12-Digit Bank Reference \/ UPI UTR/i)).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 12 digits/i)).toBeInTheDocument();
    expect(screen.getByText(/Where do I find my 12-digit UTR\?/i)).toBeInTheDocument();

    // Type 12 digits and check counter
    const utrInput = screen.getByLabelText(/12-Digit Bank Reference \/ UPI UTR/i);
    fireEvent.change(utrInput, { target: { value: '429218273849' } });
    expect(screen.getByText(/12 \/ 12 digits/i)).toBeInTheDocument();

    // Click Option A again to switch back
    fireEvent.click(screenshotTab);
    expect(screen.getByText(/Tap to upload screenshot/i)).toBeInTheDocument();
  });
});
