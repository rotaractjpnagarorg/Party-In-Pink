import { render, screen, waitFor } from '@testing-library/react';
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
  paymentDisplayConfig: {
    upiVpa: 'racjpn2425@ybl',
    payeeName: 'Rotaract Club of Bangalore JP Nagar',
    bankName: 'State Bank of India',
    accountNumber: '12345678901',
    ifscCode: 'SBIN0040333',
    branch: 'JP Nagar Branch',
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

  it('renders UPI QR code and payment proof upload when session loads', async () => {
    const mockCallable = vi.fn().mockResolvedValue({ data: mockSessionData });
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    renderWithProviders(<PaymentPage />, '/payment?token=valid_test_token');

    // Wait for session to load
    await waitFor(() => {
      expect(screen.getByText(/Scan & Pay via UPI/i)).toBeInTheDocument();
    });

    // Check merchant reference and amount
    expect(screen.getByText('PIP-TEST-001')).toBeInTheDocument();
    expect(screen.getByText('₹499')).toBeInTheDocument();

    // Verify UPI VPA display
    expect(screen.getByText('racjpn2425@ybl')).toBeInTheDocument();

    // Verify upload proof dropzone and submit button
    expect(screen.getByText(/Upload Payment Proof/i)).toBeInTheDocument();
    expect(screen.getByText(/Tap or drag payment screenshot/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gallery/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /camera/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /files/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm & Submit Proof/i })).toBeInTheDocument();
  });
});
