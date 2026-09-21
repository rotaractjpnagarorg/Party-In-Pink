import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      question: 'What is Party In Pink?',
      answer:
        'Party In Pink is a high-energy Zumba fundraiser dedicated to breast cancer awareness and treatment support, organized by the Rotaract Club of Bangalore JP Nagar (RI District 3191). We bring together dancers, fitness enthusiasts, families, and supporters for a vibrant morning of dance and purpose.',
    },
    {
      question: 'Where do the proceeds go?',
      answer:
        'Funds raised through Party In Pink support breast cancer care and surgeries through Sri Shankara Cancer Foundation, our beneficiary organization.',
    },
    {
      question: 'Do I need prior Zumba or dance experience to participate?',
      answer:
        'Not at all! Party In Pink is about purpose, energy, and community—not perfection. Our certified Zumba instructors lead simple, uplifting routines that everyone from absolute beginners to regular fitness enthusiasts can enjoy.',
    },
    {
      question: 'Are T-shirts provided with registration?',
      answer:
        'Physical T-shirts are not included with registration. We warmly encourage every participant to wear a favorite pink top, T-shirt, or other pink attire on event morning.',
    },
    {
      question: 'How do I pay for my pass?',
      answer:
        'PiP Pay enables direct payment to our official State Bank of India (SBI) account via UPI (Google Pay, PhonePe, Paytm, BHIM) or Direct Bank Transfer (NEFT/IMPS/RTGS). After completing payment in your bank app, upload your receipt screenshot or enter your UTR number for prompt approval.',
    },
    {
      question: 'Can organizations or colleges register in bulk?',
      answer:
        'Yes! We offer a dedicated Group / Bulk Registration option for colleges, corporate teams, and clubs (minimum 5 attendees). You can download our Excel template, fill in your group participants, upload it, and make a single consolidated payment at a discounted rate.',
    },
    {
      question: 'Where can I see photos from past editions?',
      answer:
        'You can view highlights right here on our Event Photos page or explore the complete 500+ photo album on our official Kwikpic gallery drive.',
    },
  ];

  return (
    <section className="py-16 bg-slate-50" id="faqs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pip-100 text-pip-800 text-xs font-semibold mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-slate-600 text-base">
            Everything you need to know about participating in Party In Pink.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-all shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full text-left px-6 py-4.5 flex items-center justify-between gap-4 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-slate-900 text-base sm:text-lg">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-pip-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm sm:text-base text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
