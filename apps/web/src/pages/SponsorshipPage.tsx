import React from 'react';
import {
  ArrowRight,
  BadgeIndianRupee,
  Check,
  Gift,
  Handshake,
  Mail,
  Phone,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const packages = [
  {
    name: 'Platinum',
    amount: '₹20,000',
    accent: 'border-pip-500 bg-pip-50',
    benefits: [
      'Major Donor recognition',
      'Logo on the event backdrop, social media, and certificates',
      '5 minutes of stage time',
      'Recognition and MC shout-out',
      '7 complimentary passes',
      'Distribution of sponsor deliverables or pamphlets',
    ],
  },
  {
    name: 'Gold',
    amount: '₹15,000',
    accent: 'border-amber-300 bg-amber-50',
    benefits: [
      'Major Donor recognition',
      'Logo on the event backdrop, social media, and certificates',
      '3 minutes of stage time',
      'Recognition and MC shout-out',
      '5 complimentary passes',
      'Distribution of sponsor deliverables or pamphlets',
    ],
  },
  {
    name: 'Silver',
    amount: '₹10,000',
    accent: 'border-slate-300 bg-slate-50',
    benefits: [
      'Major Donor recognition',
      'Logo on the event backdrop, social media, and certificates',
      'Recognition and MC shout-out',
      '2 complimentary passes',
      'Distribution of sponsor deliverables or pamphlets',
    ],
  },
];

const organizers = [
  ['Rtr. Manish S Chikmath', 'Project Chair'],
  ['Rtr. Karthik M S', 'Project Co-Chair'],
  ['Rtr. Drishti Mishra', 'Project Co-Chair'],
  ['Rtr. Anarghya Suvin', 'President 2026–27'],
  ['Rtr. Adithya N', 'Secretary 2026–27'],
  ['Rtr. Vignesh V', 'Director, Community Service 2026–27'],
  ['Rtr. Sumukha', 'Director, Community Service 2026–27'],
];

export const SponsorshipPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pip-200 bg-pip-50 px-4 py-1.5 text-xs font-bold text-pip-700">
            <Handshake className="h-4 w-4" />
            <span>Partner with Party In Pink 5.0</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Sponsorship Opportunities
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            Help us promote breast cancer awareness, bring the community together through fitness,
            and raise funds for Sri Shankara Cancer Foundation.
          </p>
        </header>

        <section aria-labelledby="packages-heading">
          <div className="mb-7 text-center">
            <h2
              id="packages-heading"
              className="text-2xl font-extrabold text-slate-900 sm:text-3xl"
            >
              Sponsorship packages
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Choose a package or speak with the organizing team about an in-kind contribution.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {packages.map((item) => (
              <article
                key={item.name}
                className={`rounded-3xl border-2 p-6 shadow-sm ${item.accent}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                      {item.name}
                    </p>
                    <p className="mt-1 text-3xl font-extrabold text-slate-900">{item.amount}</p>
                  </div>
                  <BadgeIndianRupee className="h-7 w-7 text-pip-600" />
                </div>
                <ul className="mt-6 space-y-3">
                  {item.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-pip-600" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-pink-200 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-extrabold text-slate-900">Wellwisher — ₹5,000</p>
              <p className="mt-1 text-sm text-slate-600">
                The sponsorship deck lists this contribution tier separately. Contact the team for
                its recognition details and available deliverables.
              </p>
            </div>
            <a
              href="https://wa.me/918618066508?text=Hi%2C%20I%20would%20like%20to%20know%20about%20the%20Party%20In%20Pink%20Wellwisher%20package."
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-xl bg-pip-600 px-5 py-3 text-sm font-bold text-white hover:bg-pip-700 sm:mt-0"
            >
              Ask about Wellwisher <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-pip-50 p-2.5 text-pip-600">
                <Gift className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">In-kind contributions</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              The event also welcomes useful products and services that improve the participant
              experience.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {['Caps', 'Refreshments', 'Keychains or wristbands', 'Mementos'].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-pink-100 bg-pink-50/60 px-4 py-3 text-sm font-bold text-slate-800"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-pip-700 to-pink-700 p-7 text-white shadow-lg">
            <h2 className="text-2xl font-extrabold">Discuss a partnership</h2>
            <p className="mt-3 text-sm leading-relaxed text-pink-100">
              Contact Rtr. Anarghya Suvin, President 2026–27, for sponsorships, contributions, and
              collaboration opportunities.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <a
                href="tel:+918618066508"
                className="flex items-center gap-3 font-bold hover:text-pink-100"
              >
                <Phone className="h-5 w-5" /> +91 86180 66508
              </a>
              <a
                href="mailto:rotaractjpnagar@gmail.com"
                className="flex items-center gap-3 font-bold hover:text-pink-100"
              >
                <Mail className="h-5 w-5" /> rotaractjpnagar@gmail.com
              </a>
            </div>
            <p className="mt-6 rounded-xl border border-white/20 bg-white/10 p-4 text-xs leading-relaxed text-pink-50">
              Need an 80G certificate? Do not transfer to the displayed event UPI or bank account.
              Contact the organizing team before donating for the appropriate eligible process.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-pip-50 p-2.5 text-pip-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Organizing team</h2>
              <p className="mt-1 text-sm text-slate-600">
                Party In Pink 5.0 project and club leadership
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {organizers.map(([name, role]) => (
              <div key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-bold text-slate-900">{name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{role}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center">
          <Link
            to="/donate"
            className="inline-flex items-center gap-2 text-sm font-bold text-pip-700 hover:text-pip-900"
          >
            Looking to make an individual donation? Visit the donation page{' '}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
