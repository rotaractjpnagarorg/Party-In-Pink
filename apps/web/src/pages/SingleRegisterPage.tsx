import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  Heart,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import {
  AffiliationTypes,
  RotaryFamilyAffiliations,
  OrganisationRequiredAffiliations,
  formatINR,
  singleRegistrationSchema,
} from '@pip/shared';
import { functions } from '../services/firebase.js';
import { httpsCallable } from 'firebase/functions';

export const SingleRegisterPage: React.FC = () => {
  const { event, isRegistrationOpen } = useEvent();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsappSameAsMobile, setWhatsappSameAsMobile] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [city, setCity] = useState('Bengaluru');

  const [affiliationType, setAffiliationType] = useState<string>(AffiliationTypes.INDEPENDENT);
  const [clubName, setClubName] = useState('');
  const [riDistrict, setRiDistrict] = useState('3191');
  const [organisationName, setOrganisationName] = useState('');
  const [departmentOrTeam, setDepartmentOrTeam] = useState('');
  const [discoverySource, setDiscoverySource] = useState('Instagram');

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [photoConsentAccepted, setPhotoConsentAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);

  const isRotaryFamily = RotaryFamilyAffiliations.includes(affiliationType as any);
  const isOrgRequired = OrganisationRequiredAffiliations.includes(affiliationType as any);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Client-side schema validation
    const payload = {
      fullName,
      email,
      mobileNumber,
      whatsappSameAsMobile,
      whatsappNumber: whatsappSameAsMobile ? mobileNumber : whatsappNumber,
      city,
      affiliationType: affiliationType as any,
      clubName: isRotaryFamily ? clubName : undefined,
      riDistrict: isRotaryFamily ? riDistrict : undefined,
      organisationName: isOrgRequired ? organisationName : undefined,
      departmentOrTeam: isOrgRequired ? departmentOrTeam : undefined,
      discoverySource,
      consents: {
        termsAndParticipation: termsAccepted,
        photoVideoAcknowledgement: photoConsentAccepted,
        marketingUpdates: marketingAccepted,
      },
    };

    const validation = singleRegistrationSchema.safeParse(payload);
    if (!validation.success) {
      const formattedErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path.join('.');
        if (!formattedErrors[fieldName]) {
          formattedErrors[fieldName] = issue.message;
        }
      });
      setFieldErrors(formattedErrors);
      setErrorMessage('Please fix the highlighted errors before proceeding.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);

    try {
      // Call Cloud Function: createSingleOrder
      interface CreateOrderResponse {
        success: boolean;
        orderId: string;
        publicReference: string;
        statusToken: string;
        totalAmountPaise: number;
      }
      const createOrderCallable = httpsCallable<typeof payload, CreateOrderResponse>(
        functions,
        'createSingleOrder'
      );
      const response = await createOrderCallable(payload);

      const data = response.data;
      if (data?.statusToken) {
        // Navigate directly to payment page with token
        navigate(`/pay?token=${data.statusToken}`);
      } else {
        throw new Error('Invalid response from registration service');
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const msg =
        err instanceof Error ? err.message : 'Failed to complete registration. Please try again.';
      setErrorMessage(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (!isRegistrationOpen) {
    return (
      <div className="py-20 bg-slate-50 min-h-screen">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
            <h2 className="text-xl font-bold">Registrations Not Currently Open</h2>
            <p className="text-sm text-amber-700 leading-relaxed">
              Registrations for Party In Pink {event.edition} are scheduled to open soon. Follow our
              updates or donate to the cause!
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center px-5 py-2.5 bg-pip-600 text-white font-bold rounded-xl text-xs hover:bg-pip-700 transition"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-pip-700 bg-pip-50 px-3 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Individual Registration • Party In Pink {event.edition}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Register for Party In Pink {event.edition}
          </h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            Join us for high-energy Zumba fitness sessions, inspiring survivor stories, wholesome
            breakfast, and community celebration in support of Sri Shankara Cancer Foundation.
          </p>
        </div>

        {/* Global Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Registration Alert</p>
              <p className="mt-0.5 text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Registration Form */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Personal Details */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <User className="w-5 h-5 text-pip-600" />
                  <h2 className="text-lg font-bold text-slate-900">Personal Details</h2>
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-xs font-bold text-slate-700 mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aditi Sharma"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                      fieldErrors['fullName']
                        ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-pip-500'
                    }`}
                  />
                  {fieldErrors['fullName'] && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors['fullName']}</p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address (for Ticket & Pass) *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="aditi@example.com"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                          fieldErrors['email']
                            ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/30'
                            : 'border-slate-300 focus:ring-pip-500'
                        }`}
                      />
                    </div>
                    {fieldErrors['email'] && (
                      <p className="text-xs text-rose-600 mt-1">{fieldErrors['email']}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="mobileNumber"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Mobile Number (10 Digits) *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        id="mobileNumber"
                        type="tel"
                        required
                        maxLength={10}
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                          fieldErrors['mobileNumber']
                            ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/30'
                            : 'border-slate-300 focus:ring-pip-500'
                        }`}
                      />
                    </div>
                    {fieldErrors['mobileNumber'] && (
                      <p className="text-xs text-rose-600 mt-1">{fieldErrors['mobileNumber']}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappSameAsMobile}
                      onChange={(e) => setWhatsappSameAsMobile(e.target.checked)}
                      className="rounded border-slate-300 text-pip-600 focus:ring-pip-500 w-4 h-4"
                    />
                    <span>My WhatsApp number is the same as my mobile number</span>
                  </label>

                  {!whatsappSameAsMobile && (
                    <div>
                      <label
                        htmlFor="whatsappNumber"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        WhatsApp Number *
                      </label>
                      <input
                        id="whatsappNumber"
                        type="tel"
                        maxLength={10}
                        required={!whatsappSameAsMobile}
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                          fieldErrors['whatsappNumber']
                            ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/30'
                            : 'border-slate-300 focus:ring-pip-500'
                        }`}
                      />
                      {fieldErrors['whatsappNumber'] && (
                        <p className="text-xs text-rose-600 mt-1">
                          {fieldErrors['whatsappNumber']}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="city" className="block text-xs font-bold text-slate-700 mb-1">
                    City of Residence
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bengaluru"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                  />
                </div>
              </div>

              {/* Section 2: Affiliation & Community */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <Building className="w-5 h-5 text-pip-600" />
                  <h2 className="text-lg font-bold text-slate-900">Affiliation & Representation</h2>
                </div>

                <div>
                  <label
                    htmlFor="affiliationType"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    I am participating as *
                  </label>
                  <select
                    id="affiliationType"
                    value={affiliationType}
                    onChange={(e) => setAffiliationType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500 bg-white"
                  >
                    <option value={AffiliationTypes.INDEPENDENT}>
                      Independent Citizen / Public Participant
                    </option>
                    <option value={AffiliationTypes.ROTARACT_CLUB}>Rotaract Club Member</option>
                    <option value={AffiliationTypes.ROTARY_CLUB}>Rotary Club Member</option>
                    <option value={AffiliationTypes.INTERACT_CLUB}>Interact Club Member</option>
                    <option value={AffiliationTypes.ROTARY_ALUMNI}>Rotary / Rotaract Alumni</option>
                    <option value={AffiliationTypes.COMPANY}>Corporate / Company Employee</option>
                    <option value={AffiliationTypes.NGO_ASSOCIATION}>
                      NGO / Social Association
                    </option>
                      <option value={AffiliationTypes.OTHER_ORGANISATION}>Other Organisation</option>
                  </select>
                </div>

                {/* Conditional Rotary Fields */}
                {isRotaryFamily && (
                  <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-pip-50/50 border border-pip-100">
                    <div>
                      <label
                        htmlFor="clubName"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Club Name (Optional)
                      </label>
                      <input
                        id="clubName"
                        type="text"
                        value={clubName}
                        onChange={(e) => setClubName(e.target.value)}
                        placeholder="e.g. Rotaract Bangalore South"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500 bg-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="riDistrict"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        RI District
                      </label>
                      <input
                        id="riDistrict"
                        type="text"
                        value={riDistrict}
                        onChange={(e) => setRiDistrict(e.target.value)}
                        placeholder="3191"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Conditional Organization Fields */}
                {isOrgRequired && (
                  <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <label
                        htmlFor="organisationName"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Organisation / College Name *
                      </label>
                      <input
                        id="organisationName"
                        type="text"
                        required={isOrgRequired}
                        value={organisationName}
                        onChange={(e) => setOrganisationName(e.target.value)}
                        placeholder="e.g. Infosys Ltd / Jain University"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white ${
                          fieldErrors['organisationName']
                            ? 'border-rose-300 focus:ring-rose-400'
                            : 'border-slate-300 focus:ring-pip-500'
                        }`}
                      />
                      {fieldErrors['organisationName'] && (
                        <p className="text-xs text-rose-600 mt-1">
                          {fieldErrors['organisationName']}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="departmentOrTeam"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Department / Team (Optional)
                      </label>
                      <input
                        id="departmentOrTeam"
                        type="text"
                        value={departmentOrTeam}
                        onChange={(e) => setDepartmentOrTeam(e.target.value)}
                        placeholder="e.g. CSR / Marketing"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="discoverySource"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    How did you hear about Party In Pink?
                  </label>
                  <select
                    id="discoverySource"
                    value={discoverySource}
                    onChange={(e) => setDiscoverySource(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500 bg-white"
                  >
                    <option value="Instagram">Instagram / Social Media</option>
                    <option value="Rotaract Club">Rotaract / Rotary Club Announcement</option>
                    <option value="Friend or Colleague">Friend or Colleague</option>
                    <option value="College Campus">College Campus Poster</option>
                    <option value="Past Participant">Past Party In Pink Edition</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Section 3: Mandatory Consents */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <Shield className="w-5 h-5 text-pip-600" />
                  <h2 className="text-lg font-bold text-slate-900">Mandatory Consents</h2>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-start space-x-3 text-xs sm:text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="rounded border-slate-300 text-pip-600 focus:ring-pip-500 w-4 h-4 mt-0.5 shrink-0"
                    />
                    <span>
                      I have read and agree to the{' '}
                      <Link
                        to="/terms"
                        target="_blank"
                        className="text-pip-600 underline font-semibold"
                      >
                        Terms & Conditions of Participation
                      </Link>
                      , confirming that I am medically fit for the Zumba fitness session. *
                    </span>
                  </label>
                  {fieldErrors['consents.termsAndParticipation'] && (
                    <p className="text-xs text-rose-600 pl-7">
                      {fieldErrors['consents.termsAndParticipation']}
                    </p>
                  )}

                  <label className="flex items-start space-x-3 text-xs sm:text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={photoConsentAccepted}
                      onChange={(e) => setPhotoConsentAccepted(e.target.checked)}
                      className="rounded border-slate-300 text-pip-600 focus:ring-pip-500 w-4 h-4 mt-0.5 shrink-0"
                    />
                    <span>
                      I acknowledge that official photographers and media volunteers will capture
                      photos and videos during the event for non-commercial awareness promotion. *
                    </span>
                  </label>
                  {fieldErrors['consents.photoVideoAcknowledgement'] && (
                    <p className="text-xs text-rose-600 pl-7">
                      {fieldErrors['consents.photoVideoAcknowledgement']}
                    </p>
                  )}

                  <label className="flex items-start space-x-3 text-xs sm:text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketingAccepted}
                      onChange={(e) => setMarketingAccepted(e.target.checked)}
                      className="rounded border-slate-300 text-pip-600 focus:ring-pip-500 w-4 h-4 mt-0.5 shrink-0"
                    />
                    <span>
                      Send me occasional WhatsApp/Email updates regarding future community service
                      drives by the Rotaract Club of Bangalore JP Nagar.
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button (Mobile view) */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl bg-pip-600 hover:bg-pip-700 text-white font-bold text-base shadow-lg shadow-pip-600/30 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Registration...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Payment ({formatINR(event.pricesPaise.singlePass)})</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="lg:col-span-4">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm sticky top-28 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-pip-600 bg-pip-50 px-2.5 py-1 rounded-full">
                  Order Summary
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">Individual Pass</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Party In Pink {event.edition} • 1 Attendee
                </p>
              </div>

              <div className="space-y-3 text-sm text-slate-600 border-t border-b border-slate-100 py-4">
                <div className="flex justify-between">
                  <span>Entry Pass (1 Person)</span>
                  <span className="font-semibold text-slate-900">
                    {formatINR(event.pricesPaise.singlePass)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Taxes & GST</span>
                  <span>Included</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Platform Fee</span>
                  <span className="text-emerald-600 font-semibold">₹0 (Waived)</span>
                </div>
                <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between text-base font-extrabold text-slate-900">
                  <span>Total Amount</span>
                  <span className="font-mono text-pip-600 text-lg">
                    {formatINR(event.pricesPaise.singlePass)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>High-Energy Zumba Masterclass</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Inspiring Survivor Stories & Dialogue</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Wholesome Morning Breakfast & Hydration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Digital Participation Certificate</span>
                </div>
              </div>

              <div className="hidden lg:block pt-2">
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl bg-pip-600 hover:bg-pip-700 text-white font-bold text-base shadow-lg shadow-pip-600/30 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Registration...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Payment</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center space-x-2">
                <Heart className="w-4 h-4 text-pip-500 shrink-0" />
                <span>Event proceeds support Sri Shankara Cancer Foundation.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
