import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Users, Sparkles, MapPin, Calendar, Clock, ChevronDown } from 'lucide-react';
import { useEvent } from '../../context/EventContext.js';
import { formatINR } from '@pip/shared';

const HERO_IMAGES = [
  '/assets/images/pip4/contribution-team.jpg',
  '/assets/images/pip4/zumba-wide.jpg',
  '/assets/images/pip4/community-group.jpg',
  '/assets/images/pip4/community-at-ssmrv.jpg',
] as const;

export const HeroSection: React.FC = () => {
  const { event, isRegistrationOpen, isAnnounced, isCompleted } = useEvent();
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const targetDate = new Date(event.eventDate).getTime();

    const updateCountdown = () => {
      const distance = targetDate - Date.now();
      if (distance <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [event.eventDate]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroImageIndex((current) => (current + 1) % HERO_IMAGES.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  const eventFormattedDate = new Date(event.eventDate).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const eventFormattedTime = new Date(event.eventDate).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <section className="relative isolate -mt-16 flex min-h-screen min-h-dvh flex-col justify-center overflow-hidden bg-slate-950 pb-8 pt-16 text-white sm:-mt-20 sm:min-h-[760px] sm:pb-16 sm:pt-36 lg:min-h-[820px] lg:pb-20 lg:pt-40">
      <div className="absolute inset-0 -z-20" aria-hidden="true">
        {HERO_IMAGES.map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            loading={index === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 motion-reduce:transition-none ${
              index === heroImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>
      <div className="absolute inset-0 -z-10 bg-slate-950/55" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/10 via-slate-950/20 to-slate-950/75" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-4 text-center sm:space-y-6">
          <div className="hidden max-w-full items-center justify-center space-x-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-center text-xs font-bold text-pink-100 shadow-sm backdrop-blur-md sm:inline-flex sm:text-sm">
            <Sparkles className="h-4 w-4 shrink-0 fill-pink-300 text-pink-300" />
            <span className="whitespace-normal leading-snug">
              Zumba Fundraiser for Breast Cancer Awareness • Dance for a Cause
            </span>
          </div>

          <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
            Dance for a Cause.{' '}
            <span className="bg-gradient-to-r from-pink-200 via-pink-300 to-rose-300 bg-clip-text text-transparent">
              Support Breast Cancer Care.
            </span>
          </h1>

          <p className="mx-auto hidden max-w-3xl text-xl font-normal leading-relaxed text-white/85 drop-shadow-md sm:block">
            Join hundreds of energetic dancers, citizens, and supporters for{' '}
            <span className="font-semibold text-white">Party In Pink {event.edition}</span>. A
            high-energy Zumba fundraiser raising awareness and funds for{' '}
            <span className="font-semibold text-pink-300">breast cancer care</span> through{' '}
            <span className="font-semibold text-white">Sri Shankara Cancer Foundation</span>.
          </p>

          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-md sm:hidden">
            <Calendar className="h-3.5 w-3.5 text-pink-300" />
            <span>11 October 2026</span>
            <span className="text-white/40">•</span>
            <MapPin className="h-3.5 w-3.5 text-pink-300" />
            <span>SSMRV College</span>
          </div>

          <div className="hidden flex-wrap items-center justify-center gap-3 pt-1 text-xs font-medium text-white sm:flex sm:text-sm">
            <div className="flex items-center space-x-1.5 rounded-lg border border-white/20 bg-slate-950/45 px-3 py-1.5 shadow-sm backdrop-blur-md">
              <Calendar className="h-4 w-4 text-pink-300" />
              <span>{eventFormattedDate}</span>
            </div>
            <div className="hidden items-center space-x-1.5 rounded-lg border border-white/20 bg-slate-950/45 px-3 py-1.5 shadow-sm backdrop-blur-md sm:flex">
              <Clock className="h-4 w-4 text-pink-300" />
              <span>{eventFormattedTime} onwards</span>
            </div>
            <div className="flex items-center space-x-1.5 rounded-lg border border-white/20 bg-slate-950/45 px-3 py-1.5 shadow-sm backdrop-blur-md">
              <MapPin className="h-4 w-4 text-pink-300" />
              <span>SSMRV College, Jayanagar</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3.5 pt-2 sm:flex-row sm:pt-4">
            {isRegistrationOpen && (
              <>
                <Link
                  to="/register"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-pip-600 to-pink-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-pip-950/40 transition-all hover:-translate-y-0.5 hover:from-pip-700 hover:to-pink-600 hover:shadow-xl active:translate-y-0 sm:w-auto"
                >
                  <span>Register Individual — {formatINR(event.pricesPaise.singlePass)}</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>

                <Link
                  to="/bulk"
                  className="hidden w-full items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-base font-bold text-white shadow-sm backdrop-blur-md transition-all hover:border-pink-300 hover:bg-white/20 hover:shadow sm:inline-flex sm:w-auto"
                >
                  <Users className="mr-2 h-4 w-4 text-pink-300" />
                  <span>Group Booking ({formatINR(event.pricesPaise.bulkPass)}/pass)</span>
                </Link>
              </>
            )}

            {isAnnounced && (
              <div className="rounded-xl border border-amber-200/30 bg-amber-400/15 p-4 text-sm font-semibold text-amber-100 backdrop-blur-md">
                Registrations opening shortly. Mark your calendar for {eventFormattedDate}!
              </div>
            )}

            {isCompleted && (
              <div className="rounded-xl border border-emerald-200/30 bg-emerald-400/15 p-4 text-sm font-semibold text-emerald-100 backdrop-blur-md">
                Party In Pink {event.edition} has concluded. Thank you for your incredible support!
              </div>
            )}

            <Link
              to="/donate"
              className="hidden w-full items-center justify-center rounded-xl border border-pink-300/20 bg-pink-500/20 px-5 py-3.5 text-base font-semibold text-pink-100 backdrop-blur-md transition-colors hover:bg-pink-500/30 sm:inline-flex sm:w-auto"
            >
              <Heart className="mr-1.5 h-4 w-4 fill-pink-300 text-pink-300" />
              <span>Donate Directly</span>
            </Link>
          </div>

          <div className="mx-auto hidden max-w-lg pt-8 sm:block">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/60">
              Event Countdown
            </p>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: 'Days', val: timeLeft.days },
                { label: 'Hours', val: timeLeft.hours },
                { label: 'Minutes', val: timeLeft.minutes },
                { label: 'Seconds', val: timeLeft.seconds },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/20 bg-slate-950/45 p-2.5 text-center shadow-sm backdrop-blur-md sm:p-3.5"
                >
                  <div className="font-mono text-2xl font-extrabold text-pink-300 sm:text-3xl">
                    {String(item.val).padStart(2, '0')}
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 sm:pt-1" aria-label="Hero photo">
            {HERO_IMAGES.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setHeroImageIndex(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === heroImageIndex ? 'w-8 bg-pink-300' : 'w-4 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Show event photo ${index + 1}`}
                aria-current={index === heroImageIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Subtle mobile scroll indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none text-white/40 sm:hidden">
        <ChevronDown className="h-4 w-4 animate-bounce text-pink-300/80" />
      </div>
    </section>
  );
};
