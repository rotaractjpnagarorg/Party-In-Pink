import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { DonatePage } from './DonatePage';
import { EventProvider } from '../context/EventContext';

vi.mock('../services/firebase', () => ({
  functions: {},
  storage: {},
  db: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn()),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <EventProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </EventProvider>
  );
};

describe('DonatePage Component', () => {
  it('renders donation preset amounts, donor form, and complimentary passes notice', () => {
    renderWithProviders(<DonatePage />);

    expect(screen.getByText(/Select Donation Amount/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Platinum/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Gold/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Silver/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Wellwisher/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/Full Name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address \*/i)).toBeInTheDocument();
    expect(screen.getByText(/80G Certificate Notice/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Need an 80G certificate\? Do not pay these accounts/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Complimentary Passes Included/i)[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Proceed to Donate/i })).toBeInTheDocument();
  });
});
