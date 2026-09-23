import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SponsorshipPage } from './SponsorshipPage';
import { EventProvider } from '../context/EventContext';
import { vi } from 'vitest';

vi.mock('../services/firebase', () => ({ functions: {}, storage: {}, db: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn(() => vi.fn()) }));

const renderPage = () =>
  render(
    <EventProvider>
      <MemoryRouter>
        <SponsorshipPage />
      </MemoryRouter>
    </EventProvider>
  );

describe('SponsorshipPage', () => {
  it('shows every deck-backed sponsorship tier and contact', () => {
    renderPage();

    expect(screen.getByText('Platinum')).toBeInTheDocument();
    expect(screen.getByText('₹20,000')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
    expect(screen.getByText('Silver')).toBeInTheDocument();
    expect(screen.getByText('₹10,000')).toBeInTheDocument();
    expect(screen.getByText(/Wellwisher — ₹5,000/i)).toBeInTheDocument();
    expect(screen.getByText('+91 86180 66508')).toBeInTheDocument();
  });

  it('shows 1 complimentary pass for the Wellwisher tier', () => {
    renderPage();

    expect(screen.getByText('1 Complimentary Pass')).toBeInTheDocument();
  });
});
