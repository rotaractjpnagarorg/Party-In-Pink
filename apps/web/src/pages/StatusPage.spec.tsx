import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { StatusPage } from './StatusPage';
import { EventProvider } from '../context/EventContext';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <EventProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </EventProvider>
  );
};

describe('StatusPage Component', () => {
  it('renders lookup form when accessed without token', () => {
    renderWithProviders(<StatusPage />);

    expect(screen.getByText(/Order Status Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Find Your Registration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Order Reference/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Registered Email Address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check Order Status/i })).toBeInTheDocument();
  });
});
