import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PaymentPage } from './PaymentPage';
import { EventProvider } from '../context/EventContext';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase functions
vi.mock('../services/firebase', () => ({
  functions: {},
  storage: {},
  db: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

const mockSessionData = {
  sessionId: 'sess_123',
  entityType: 'ORDER',
  merchantReference: 'PIP-TEST-001',
  amountPaise: 49900,
  currency: 'INR',
  status: 'PENDING_PAYMENT',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
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

  it('renders online gateway checkout when payment session loads', async () => {
    const mockCallable = vi.fn().mockResolvedValue({ data: mockSessionData });
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    renderWithProviders(<PaymentPage />, '/payment?token=valid_test_token');

    // Wait for session to load
    await waitFor(() => {
      expect(screen.getByText(/Instant Online Payment/i)).toBeInTheDocument();
    });

    // Check merchant reference and amount
    expect(screen.getByText('PIP-TEST-001')).toBeInTheDocument();
    expect(screen.getByText(/Pay ₹499 Now/i)).toBeInTheDocument();

    // Verify supported methods
    expect(screen.getByText(/UPI Apps/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cards/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/NetBanking/i).length).toBeGreaterThanOrEqual(1);

    // Verify reassurance badges
    expect(screen.getByText(/Payment is routed directly to the organizing committee for instant approval./i)).toBeInTheDocument();
  });
});
