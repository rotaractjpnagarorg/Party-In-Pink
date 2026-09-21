import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('Party In Pink 5.0 App Shell & Routing', () => {
  it('renders Party In Pink branding and hero registration CTAs', () => {
    render(<App />);
    expect(screen.getAllByText(/Party In Pink/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5\.0/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dance for a Cause/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Support Breast Cancer Care\./i)).toBeInTheDocument();
    expect(screen.getAllByText(/Register Individual/i).length).toBeGreaterThan(0);
    expect(document.querySelector('img[loading="eager"]')).toHaveAttribute(
      'src',
      '/assets/images/pip4/contribution-team.jpg'
    );
    expect(screen.getAllByRole('button', { name: /Show event photo/i })).toHaveLength(4);
  });

  it('renders legal and policy navigation in footer', () => {
    render(<App />);
    expect(screen.getByText(/Terms & Conditions/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/Refunds & Cancellations/i)).toBeInTheDocument();
  });

  it('changes the home navigation from transparent to solid after scrolling', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    const { container } = render(<App />);
    const header = container.querySelector('header');

    expect(header).toHaveClass('bg-transparent');
    window.scrollY = 100;
    fireEvent.scroll(window);
    expect(header).toHaveClass('bg-white/95');

    window.scrollY = 0;
    fireEvent.scroll(window);
  });
});
