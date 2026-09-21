import React from 'react';
import { MapPin, Activity, Heart, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { useEvent } from '../../context/EventContext.js';

export const EventDetailsBar: React.FC = () => {
  const { event } = useEvent();

  const features = [
    {
      icon: Activity,
      title: 'Group Zumba Sessions',
      description:
        'Energetic routines led by certified Zumba instructors. Perfect for both beginners and experienced dancers.',
    },
    {
      icon: Sparkles,
      title: 'Inspiring Stories',
      description:
        'Hear brave breast cancer survivors and fighters share powerful stories of hope and resilience.',
    },
    {
      icon: Heart,
      title: 'Community Celebration',
      description:
        'An inclusive gathering where families, students, and clubs dance and stand together for a cause.',
    },
    {
      icon: ShieldCheck,
      title: 'Supporting Cancer Care',
      description:
        'Funds raised support breast cancer care and surgeries through Sri Shankara Cancer Foundation.',
    },
  ];

  return (
    <section className="border-y border-slate-200/80 bg-white py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="group rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4 transition-all hover:border-pip-200 hover:bg-pip-50/30 sm:p-5"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-pip-100 text-pip-600 transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="text-sm font-bold leading-snug text-slate-900 sm:mb-1 sm:text-base">
                {item.title}
              </h3>
              <p className="hidden text-xs leading-relaxed text-slate-600 sm:block sm:text-sm">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Venue Maps Anchor */}
        <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-xl border border-pip-200/60 bg-gradient-to-r from-pip-50 to-pink-50 p-4 sm:mt-8 sm:flex-row sm:gap-4">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="p-2 rounded-lg bg-pip-600 text-white shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{event.venue}</p>
              <p className="text-xs text-slate-600">
                Jayanagar 4th T Block, Bengaluru, Karnataka • Starts at 7:30 AM onwards
              </p>
            </div>
          </div>
          <a
            href={event.venueMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-xs sm:text-sm font-bold text-pip-700 hover:text-pip-900 transition-colors shrink-0"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};
