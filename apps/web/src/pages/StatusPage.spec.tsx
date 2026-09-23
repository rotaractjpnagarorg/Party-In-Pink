import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StatusPage } from './StatusPage';
import { EventProvider } from '../context/EventContext';
import { httpsCallable } from 'firebase/functions';
import { PaymentStatuses, OrderStatuses } from '@pip/shared';

// Mock Firebase services
vi.mock('../services/firebase', () => ({
  functions: {},
  storage: {},
  db: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

const mockOrder = {
  publicReference: 'PIP5-S-TEST01',
  statusToken: 'tok_test123',
  type: 'SINGLE' as const,
  orderStatus: OrderStatuses.PAYMENT_SUBMITTED,
  paymentStatus: PaymentStatuses.PAYMENT_SUBMITTED,
  participantCount: 1,
  totalAmountPaise: 23900,
  currency: 'INR',
  buyerName: 'Ananya Sharma',
  organisationName: null,
  ticketsIssuedCount: 0,
  createdAt: '2026-09-23T10:00:00.000Z',
};

const renderWithProviders = (initialEntries = ['/status']) => {
  return render(
    <EventProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <StatusPage />
      </MemoryRouter>
    </EventProvider>
  );
};

describe('StatusPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders lookup form when accessed without token', () => {
    renderWithProviders(['/status']);

    expect(screen.getByText(/Order Status Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Find Your Registration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Order Reference/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Registered Email Address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check Order Status/i })).toBeInTheDocument();
  });

  it('renders "Payment is being verified" banner when payment is submitted', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        ...mockOrder,
        paymentStatus: PaymentStatuses.PAYMENT_SUBMITTED,
      },
    });
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    renderWithProviders(['/status?token=tok_test123']);

    expect(mockCallable).toHaveBeenCalledWith({ token: 'tok_test123' });

    await waitFor(() => {
      expect(screen.getByText(/Payment is being verified/i)).toBeInTheDocument();
    });

    expect(screen.getByText('PIP5-S-TEST01')).toBeInTheDocument();
    expect(screen.getByText('Ananya Sharma')).toBeInTheDocument();
    expect(
      screen.getByText(/We have received your payment reference and are verifying it/i)
    ).toBeInTheDocument();
    // Verify old volunteer finance desk text is NOT present
    expect(screen.queryByText(/volunteer finance desk/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SBI bank statement/i)).not.toBeInTheDocument();
  });

  it('renders "Awaiting Payment" banner and Pay button when payment has not been submitted', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        ...mockOrder,
        orderStatus: OrderStatuses.AWAITING_PAYMENT,
        paymentStatus: PaymentStatuses.AWAITING_PAYMENT,
      },
    });
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    renderWithProviders(['/status?token=tok_test123']);

    await waitFor(() => {
      expect(screen.getByText(/Awaiting Payment/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /Pay via PiP Pay/i })).toBeInTheDocument();
  });

  it('renders "Payment Verified & Pass Confirmed! 🎉" banner when payment is verified', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        ...mockOrder,
        orderStatus: OrderStatuses.CONFIRMED,
        paymentStatus: PaymentStatuses.VERIFIED,
        ticketsIssuedCount: 1,
      },
    });
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    renderWithProviders(['/status?token=tok_test123']);

    await waitFor(() => {
      expect(screen.getByText(/Payment Verified & Pass Confirmed! 🎉/i)).toBeInTheDocument();
    });
  });

  it('renders "Payment Verification Rejected" banner with resubmit button when payment is rejected', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        ...mockOrder,
        orderStatus: OrderStatuses.AWAITING_PAYMENT,
        paymentStatus: PaymentStatuses.REJECTED,
      },
    });
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    renderWithProviders(['/status?token=tok_test123']);

    await waitFor(() => {
      expect(screen.getByText(/Payment Verification Rejected/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /Resubmit Payment Proof/i })).toBeInTheDocument();
  });

  it('supports manual lookup by Reference and Email', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: mockOrder,
    });
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    renderWithProviders(['/status']);

    fireEvent.change(screen.getByLabelText(/Order Reference/i), {
      target: { value: 'PIP5-S-TEST01' },
    });
    fireEvent.change(screen.getByLabelText(/Registered Email Address/i), {
      target: { value: 'ananya@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Check Order Status/i }));

    expect(mockCallable).toHaveBeenCalledWith({
      reference: 'PIP5-S-TEST01',
      email: 'ananya@example.com',
    });

    await waitFor(() => {
      expect(screen.getByText(/Payment is being verified/i)).toBeInTheDocument();
      expect(screen.getByText('PIP5-S-TEST01')).toBeInTheDocument();
    });
  });
});
