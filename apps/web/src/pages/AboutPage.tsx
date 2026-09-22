import React from 'react';
import { Users, Globe, BookOpen, ShieldCheck, Mail, ArrowRight, Sparkles, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="py-12 sm:py-16 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-pip-100 text-pip-800 text-xs font-bold mb-3">
            <Sparkles className="w-4 h-4 text-pip-600" />
            <span>Rotaract Club of Bangalore JP Nagar</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            About Us
          </h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Understanding our mission, community values, and the heart behind Party In Pink.
          </p>
        </div>

        {/* Section 1: What is Rotary? */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm mb-10 space-y-4">
          <div className="inline-flex items-center space-x-2 text-pip-600 text-xs font-bold uppercase tracking-wider">
            <Globe className="w-4 h-4" />
            <span>Global Fellowship</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">What is Rotary?</h2>
          <p className="text-slate-600 leading-relaxed text-base sm:text-lg">
            Rotary began in Chicago in 1905 when attorney Paul Harris brought professionals together
            in service and fellowship. Today, it connects about 1.4 million members across more than
            200 countries and geographical areas.
          </p>
          <div className="p-5 rounded-2xl bg-gradient-to-r from-pip-50 to-pink-50 border-l-4 border-pip-600 mt-4">
            <p className="font-bold text-pip-900 text-base">Rotary's Motto: "Service Above Self"</p>
            <p className="text-sm text-slate-700 mt-1">
              Alongside the Four-Way Test, this principle guides Rotarians as they serve and
              strengthen communities around the world.
            </p>
          </div>
        </div>

        {/* Section 2: What is Rotaract? */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm mb-10 space-y-4">
          <div className="inline-flex items-center space-x-2 text-pip-600 text-xs font-bold uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>Youth Leadership</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">What is Rotaract?</h2>
          <p className="text-slate-600 leading-relaxed text-base sm:text-lg">
            Rotaract is Rotary's global movement for adults aged 18 and above. It helps members
            develop leadership skills, undertake service projects, build professional networks, and
            form lasting friendships while creating positive change.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm mb-1">💡 Leadership Growth</div>
              <p className="text-xs text-slate-600">
                Developing project planning and public speaking through community initiatives.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm mb-1">🤝 Lifelong Fellowship</div>
              <p className="text-xs text-slate-600">
                Building meaningful friendships with passionate individuals across the globe.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm mb-1">🌍 Measurable Impact</div>
              <p className="text-xs text-slate-600">
                Executing grassroots social campaigns that deliver lasting solutions.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm mb-1">📚 Professional Network</div>
              <p className="text-xs text-slate-600">
                Connecting with senior Rotarians, industry leaders, and entrepreneurs.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Rotaract Club of Bangalore JP Nagar */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm mb-10 space-y-6">
          <div className="inline-flex items-center space-x-2 text-pip-600 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>RI District 3191</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Rotaract Club of Bangalore JP Nagar
          </h2>
          <p className="text-slate-600 leading-relaxed text-base sm:text-lg">
            Chartered in 2021, the Rotaract Club of Bangalore JP Nagar brings young professionals
            and students together to serve the community. Across five years of service, the club has
            completed more than 300 projects, contributed over 7,500 volunteer hours, and received
            40 awards.
          </p>

          <h3 className="text-xl font-bold text-slate-900 pt-2">Our Key Focus Areas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-pink-50/50 border border-pink-100 space-y-2">
              <div className="text-3xl">🏥</div>
              <h4 className="font-bold text-slate-900 text-sm">Healthcare & Wellness</h4>
              <p className="text-xs text-slate-600">
                Advancing healthcare access, awareness, and community wellbeing.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-pink-50/50 border border-pink-100 space-y-2">
              <div className="text-3xl">👥</div>
              <h4 className="font-bold text-slate-900 text-sm">Community Service</h4>
              <p className="text-xs text-slate-600">
                Supporting education and meaningful community-development initiatives.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-pink-50/50 border border-pink-100 space-y-2">
              <div className="text-3xl">🎓</div>
              <h4 className="font-bold text-slate-900 text-sm">Menstrual Hygiene</h4>
              <p className="text-xs text-slate-600">
                Building awareness and access through practical, dignity-led initiatives.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-pink-50/50 border border-pink-100 space-y-2">
              <div className="text-3xl">🌱</div>
              <h4 className="font-bold text-slate-900 text-sm">Environment</h4>
              <p className="text-xs text-slate-600">
                Promoting responsible environmental action and sustainable practices.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Why Party In Pink? */}
        <div className="bg-gradient-to-br from-pip-600 via-pink-600 to-rose-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl mb-12 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Why Party In Pink?</h2>
          <p className="text-pink-100 leading-relaxed text-base sm:text-lg">
            Party In Pink is a Zumba-based initiative that raises breast cancer awareness and funds.
            It promotes early detection and prevention, while contributions help support breast
            cancer surgeries through Sri Shankara Cancer Foundation.
          </p>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-pink-300" />
              <span>Our Sacred Commitments</span>
            </h3>
            <ul className="space-y-2 text-sm text-pink-100">
              <li className="flex items-center space-x-2">
                <span className="text-pink-300">✓</span>
                <span>
                  Funds raised support <strong>Sri Shankara Cancer Foundation</strong>, the event's
                  beneficiary organization.
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-pink-300">✓</span>
                <span>
                  Emphasis on <strong>early detection awareness</strong> to save lives.
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-pink-300">✓</span>
                <span>Support for breast cancer surgeries and the wider continuum of care.</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-pink-300">✓</span>
                <span>Building a compassionate, active, and united community.</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-bold text-slate-900 bg-white hover:bg-pink-50 transition-all shadow-md text-sm"
            >
              <span>Get Passes</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
            <Link
              to="/donate"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-semibold text-white bg-white/20 hover:bg-white/30 border border-white/20 transition-all text-sm"
            >
              Support the Cause
            </Link>
          </div>
        </div>

        {/* Section 5: Organizing Leadership & Committee */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm mb-12 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center space-x-2 text-pip-600 text-xs font-bold uppercase tracking-wider mb-1">
                <Users className="w-4 h-4" />
                <span>Leadership & Organizing Committee</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                The Team Behind Party In Pink 5.0
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Dedicated Rotaractors steering project management, community partnerships, and clinical beneficiary alignment.
            </p>
          </div>

          {/* Project Leadership */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Project Chairs & Co-Chairs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-pip-50 to-pink-50 border border-pip-200 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-pip-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  MC
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-base">Rtr. Manish S Chikmath</div>
                  <div className="text-xs font-bold text-pip-700">Project Chair</div>
                </div>
                <p className="text-xs text-slate-500 pt-1">Overall project direction, operational leadership & beneficiary coordination.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                  KM
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-base">Rtr. Karthik M S</div>
                  <div className="text-xs font-bold text-slate-600">Project Co-Chair</div>
                </div>
                <p className="text-xs text-slate-500 pt-1">Logistics, venue management, sound & participant experience.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                  DM
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-base">Rtr. Drishti Mishra</div>
                  <div className="text-xs font-bold text-slate-600">Project Co-Chair</div>
                </div>
                <p className="text-xs text-slate-500 pt-1">Public relations, marketing, sponsor outreach & registrations.</p>
              </div>
            </div>
          </div>

          {/* Club Executive Leadership */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Rotaract Club of Bangalore JP Nagar — Executive Leadership (2026–27)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">Rtr. Anarghya Suvin</div>
                <div className="text-xs font-semibold text-pip-700">President (2026–27)</div>
                <div className="pt-2">
                  <a
                    href="https://wa.me/918618066508"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-[11px] font-bold text-slate-600 hover:text-pip-700"
                  >
                    <Phone className="w-3 h-3 mr-1 text-pip-600" />
                    +91 86180 66508
                  </a>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">Rtr. Adithya N</div>
                <div className="text-xs font-semibold text-slate-600">Secretary (2026–27)</div>
                <p className="text-[11px] text-slate-400 pt-1">Secretarial administration & governance</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">Rtr. Vignesh V</div>
                <div className="text-xs font-semibold text-slate-600">Director, Community Service</div>
                <p className="text-[11px] text-slate-400 pt-1">Community outreach & service initiatives</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">Rtr. Sumukha</div>
                <div className="text-xs font-semibold text-slate-600">Director, Community Service</div>
                <p className="text-[11px] text-slate-400 pt-1">Community outreach & service initiatives</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Block */}
        <div className="text-center text-slate-600 text-sm space-y-2">
          <p>Have questions about joining Rotaract or partnering with us?</p>
          <div className="flex items-center justify-center space-x-4">
            <a
              href="mailto:rotaractjpnagar@gmail.com"
              className="inline-flex items-center space-x-1.5 text-pip-600 hover:text-pip-700 font-bold"
            >
              <Mail className="w-4 h-4" />
              <span>rotaractjpnagar@gmail.com</span>
            </a>
            <span className="text-slate-300">•</span>
            <a
              href="https://wa.me/918618066508"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pip-600 hover:text-pip-700 font-bold"
            >
              Rtr. Anarghya Suvin: +91 86180 66508
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
