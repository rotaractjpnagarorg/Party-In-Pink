import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SponsorshipPage } from './SponsorshipPage';

describe('SponsorshipPage', () => {
  it('shows every deck-backed sponsorship tier and contact', () => {
    render(
      <MemoryRouter>
        <SponsorshipPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Platinum')).toBeInTheDocument();
    expect(screen.getByText('₹20,000')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
    expect(screen.getByText('Silver')).toBeInTheDocument();
    expect(screen.getByText('₹10,000')).toBeInTheDocument();
    expect(screen.getByText(/Wellwisher — ₹5,000/i)).toBeInTheDocument();
    expect(screen.getByText('+91 86180 66508')).toBeInTheDocument();
  });

  it('does not invent benefits for the Wellwisher tier', () => {
    render(
      <MemoryRouter>
        <SponsorshipPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Contact the team for its recognition details/i)).toBeInTheDocument();
  });
});
