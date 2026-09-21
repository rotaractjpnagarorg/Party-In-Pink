import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { SingleRegisterPage } from './SingleRegisterPage';
import { EventProvider } from '../context/EventContext';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <EventProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </EventProvider>
  );
};

describe('SingleRegisterPage Component', () => {
  it('renders registration header, form fields, and order summary', () => {
    renderWithProviders(<SingleRegisterPage />);

    expect(screen.getByText(/Register for Party In Pink/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Legal Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile Number \(10 Digits\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/I am participating as/i)).toBeInTheDocument();
    expect(screen.getByText(/Pink Attire Notice/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Order Summary/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹199/i).length).toBeGreaterThan(0);
  });

  it('displays validation alert when submitting form with invalid data', async () => {
    const { container } = renderWithProviders(<SingleRegisterPage />);

    const form = container.querySelector('form');
    expect(form).not.toBeNull();

    // Trigger form submit directly
    fireEvent.submit(form!);

    // Error alert should appear
    expect(await screen.findByText(/Registration Alert/i)).toBeInTheDocument();
  });
});
