import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { PaymentPage } from './PaymentPage';
import { EventProvider } from '../context/EventContext';

// Mock Firebase functions and storage
vi.mock('../services/firebase', () => ({
  functions: {},
  storage: {},
  db: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn()),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <EventProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </EventProvider>
  );
};

describe('PaymentPage Component', () => {
  it('renders error notice when accessed without order status token', () => {
    renderWithProviders(<PaymentPage />);

    expect(screen.getByText(/Unable to Load Payment/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing order status token/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to Status Page/i })).toBeInTheDocument();
  });
});
