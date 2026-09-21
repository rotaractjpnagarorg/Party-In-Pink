import React from 'react';

interface BrandLogoProps {
  tone?: 'light-surface' | 'dark-surface';
  className?: string;
}

/**
 * Displays the supplied PiP 5.0 horizontal artwork while cropping only its
 * large transparent canvas. The logo pixels themselves are never stretched.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ tone = 'light-surface', className = '' }) => {
  const isDark = tone === 'dark-surface';
  return (
    <div
      className={`flex items-center shrink-0 ${className}`}
      role="img"
      aria-label="Party In Pink 5.0 — A Zumba Fundraiser for Breast Cancer Awareness"
    >
      <img
        src={isDark ? '/assets/5.0%20Logos/pip-mark-dark.png' : '/assets/5.0%20Logos/pip-mark-light.png'}
        alt="Party In Pink 5.0"
        className="h-8 sm:h-9 w-auto object-contain transition-opacity duration-200"
      />
    </div>
  );
};
