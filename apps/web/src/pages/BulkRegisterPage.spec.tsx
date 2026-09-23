import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { BulkRegisterPage } from './BulkRegisterPage';
import { EventProvider } from '../context/EventContext';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <EventProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </EventProvider>
  );
};

describe('BulkRegisterPage Component', () => {
  it('renders Step 1 organisation details and bulk pricing card', () => {
    renderWithProviders(<BulkRegisterPage />);

    expect(screen.getAllByText(/Group & Corporate Registration/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Organisation \/ Group Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organisation \/ Club Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Participant Count/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Person Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Continue to Participant Upload/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Proceed to Payment/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Special Group Tier/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹219/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('option', { name: /Rotaract Club - University Based \(Min\. 15 passes • ₹219\/pass\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /Rotaract Club - Community Based \(Min\. 10 passes • ₹219\/pass\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /Rotary Club \(Min\. 10 passes • ₹599\/pass\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /Company \/ Corporate Team \(Min\. 10 passes • ₹399\/pass\)/i })
    ).toBeInTheDocument();
  });
});
