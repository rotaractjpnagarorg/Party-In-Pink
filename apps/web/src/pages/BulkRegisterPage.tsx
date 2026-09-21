import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building,
  ArrowRight,
  Loader2,
  User,
  XCircle,
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import {
  AffiliationTypes,
  RotaryFamilyAffiliations,
  formatINR,
  bulkOrderCreateSchema,
  parseBulkRegistrationXlsx,
  generateBulkRegistrationTemplateBuffer,
  type BulkAttendeeRowInput,
} from '@pip/shared';
import { functions } from '../services/firebase.js';
import { httpsCallable } from 'firebase/functions';

export const BulkRegisterPage: React.FC = () => {
  const { event, isRegistrationOpen } = useEvent();
  const navigate = useNavigate();

  // Wizard step: 1 = Org details, 2 = Upload & Review
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Organisation & Contact State
  const [orgType, setOrgType] = useState<string>(AffiliationTypes.ROTARACT_CLUB);
  const [orgName, setOrgName] = useState('');
  const [riDistrict, setRiDistrict] = useState('3191');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [whatsappSame, setWhatsappSame] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [initialCount, setInitialCount] = useState<number>(5);

  // Order state after creation
  const [statusToken, setStatusToken] = useState<string | null>(null);
  const [publicReference, setPublicReference] = useState<string | null>(null);

  // Step 2: File upload & parsed state
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedAttendees, setParsedAttendees] = useState<BulkAttendeeRowInput[]>([]);
  const [validationErrors, setValidationErrors] = useState<
    Array<{ rowNumber: number; field: string; message: string }>
  >([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isRotary = RotaryFamilyAffiliations.includes(orgType as any);

  // Handle Download Template
  const handleDownloadTemplate = async () => {
    const buffer = await generateBulkRegistrationTemplateBuffer();
    const blob = new Blob([buffer as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PiP5_Bulk_Registration_Template.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Step 1 Submission: Create draft bulk order
  const handleCreateDraftOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    const payload = {
      organisationType: orgType as any,
      organisationName: orgName.trim(),
      riDistrict: isRotary ? riDistrict.trim() : undefined,
      primaryContact: {
        fullName: contactName.trim(),
        email: contactEmail.trim(),
        mobileNumber: contactMobile.trim(),
        whatsappSameAsMobile: whatsappSame,
        whatsappNumber: whatsappSame ? undefined : whatsappNumber.trim(),
      },
      participantCount: initialCount,
    };

    const validation = bulkOrderCreateSchema.safeParse(payload);
    if (!validation.success) {
      setGlobalError(
        validation.error.issues[0]?.message || 'Please fill in all required organisation fields.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      interface CreateBulkResponse {
        success: boolean;
        statusToken: string;
        orderReference: string;
      }
      const createBulkCallable = httpsCallable<typeof payload, CreateBulkResponse>(
        functions,
        'createBulkOrder'
      );
      const response = await createBulkCallable(payload);

      setStatusToken(response.data.statusToken);
      setPublicReference(response.data.orderReference);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      console.error('Create bulk order error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to initialize bulk registration. Please try again.';
      setGlobalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Handle File Drop / Select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGlobalError(null);
    setFileName(file.name);
    setIsParsing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await parseBulkRegistrationXlsx(arrayBuffer);

      if (result.valid) {
        setParsedAttendees(result.attendees);
        setValidationErrors([]);
      } else {
        setParsedAttendees(result.attendees);
        setValidationErrors(result.errors);
      }
    } catch (err: any) {
      console.error('Parse XLSX error:', err);
      setGlobalError(
        'Failed to parse spreadsheet. Please ensure it is a valid, uncorrupted Excel file.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  // Step 2 Submission: Commit attendees
  const handleCommitAttendees = async () => {
    if (!statusToken) {
      setGlobalError('Session expired. Please restart the bulk registration flow.');
      return;
    }

    if (parsedAttendees.length < 5) {
      setGlobalError(
        'You must provide at least 5 valid participants to benefit from bulk pricing.'
      );
      return;
    }

    if (validationErrors.length > 0) {
      setGlobalError(
        'Please resolve all spreadsheet errors or upload a corrected file before submitting.'
      );
      return;
    }

    setIsSubmitting(true);
    setGlobalError(null);

    try {
      interface CommitResponse {
        success: boolean;
        message: string;
      }
      const commitCallable = httpsCallable<
        { statusToken: string; attendees: typeof parsedAttendees },
        CommitResponse
      >(functions, 'commitBulkAttendees');
      await commitCallable({
        statusToken,
        attendees: parsedAttendees,
      });

      // Redirect to payment page
      navigate(`/pay?token=${statusToken}`);
    } catch (err: unknown) {
      console.error('Commit bulk attendees error:', err);
      const msg =
        err instanceof Error ? err.message : 'Failed to commit attendees. Please try again.';
      setGlobalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isRegistrationOpen) {
    return (
      <div className="py-20 bg-slate-50 min-h-screen">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
            <h2 className="text-xl font-bold">Bulk Registrations Paused</h2>
            <p className="text-sm text-amber-700 leading-relaxed">
              Registrations for Party In Pink {event.edition} will open shortly.
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center px-5 py-2.5 bg-pip-600 text-white font-bold rounded-xl text-xs"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bulkPrice = event.pricesPaise.bulkPass; // ₹149
  const singlePrice = event.pricesPaise.singlePass; // ₹199
  const countToDisplay = parsedAttendees.length > 0 ? parsedAttendees.length : initialCount;
  const totalAmountPaise = countToDisplay * bulkPrice;
  const savingsPaise = countToDisplay * (singlePrice - bulkPrice);

  return (
    <div className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-pip-700 bg-pip-50 px-3 py-1 rounded-full mb-2 border border-pip-200">
            <Users className="w-3.5 h-3.5" />
            <span>
              Group & Corporate Registration • {formatINR(bulkPrice)}/pass (Min.{' '}
              {event.pricesPaise.bulkMinParticipants} attendees)
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Group & Corporate Registration
          </h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            Register your Rotaract club, Rotary club, college batch, corporate team, or NGO with
            discounted group pricing and convenient spreadsheet upload.
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div
            className={`p-4 rounded-2xl border flex items-center space-x-3 ${
              step === 1
                ? 'bg-white border-pip-500 shadow-sm'
                : 'bg-slate-100 border-slate-200 opacity-60'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 1 ? 'bg-pip-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {step === 2 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Step 1
              </div>
              <div className="text-sm font-bold text-slate-900">Organisation Details</div>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border flex items-center space-x-3 ${
              step === 2
                ? 'bg-white border-pip-500 shadow-sm'
                : 'bg-slate-100 border-slate-200 opacity-60'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 2 ? 'bg-pip-600 text-white' : 'bg-slate-300 text-slate-600'
              }`}
            >
              2
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Step 2
              </div>
              <div className="text-sm font-bold text-slate-900">Upload XLSX & Review</div>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Attention Required</p>
              <p className="mt-0.5 text-rose-700">{globalError}</p>
            </div>
          </div>
        )}

        {/* Step 1: Organisation & Contact Form */}
        {step === 1 && (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <form onSubmit={handleCreateDraftOrder} className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <Building className="w-5 h-5 text-pip-600" />
                    <h2 className="text-lg font-bold text-slate-900">Organisation Profile</h2>
                  </div>

                  <div>
                    <label
                      htmlFor="orgType"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Organisation / Group Type *
                    </label>
                    <select
                      id="orgType"
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500 bg-white"
                    >
                      <option value={AffiliationTypes.ROTARACT_CLUB}>Rotaract Club</option>
                      <option value={AffiliationTypes.ROTARY_CLUB}>Rotary Club</option>
                      <option value={AffiliationTypes.INTERACT_CLUB}>Interact Club</option>
                      <option value={AffiliationTypes.COMPANY}>Company / Corporate Team</option>
                      <option value={AffiliationTypes.NGO_ASSOCIATION}>
                        NGO / Non-Profit Association
                      </option>
                      <option value={AffiliationTypes.OTHER_ORGANISATION}>
                        College / Educational Institution
                      </option>
                    </select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="orgName"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Organisation / Club Name *
                      </label>
                      <input
                        id="orgName"
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Rotaract Bangalore South"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />
                    </div>

                    {isRotary && (
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
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="initialCount"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Estimated Participant Count (Min. 5) *
                    </label>
                    <input
                      id="initialCount"
                      type="number"
                      min={5}
                      max={500}
                      required
                      value={initialCount}
                      onChange={(e) => setInitialCount(Math.max(5, parseInt(e.target.value) || 5))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      You will upload the exact list of participants in Step 2.
                    </p>
                  </div>
                </div>

                {/* Primary Contact Person */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <User className="w-5 h-5 text-pip-600" />
                    <h2 className="text-lg font-bold text-slate-900">Lead / Primary Contact</h2>
                  </div>

                  <div>
                    <label
                      htmlFor="contactName"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Contact Person Full Name *
                    </label>
                    <input
                      id="contactName"
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="contactEmail"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Email Address (for Invoice & Status) *
                      </label>
                      <input
                        id="contactEmail"
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="rahul@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="contactMobile"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Mobile Number (10 Digits) *
                      </label>
                      <input
                        id="contactMobile"
                        type="tel"
                        maxLength={10}
                        required
                        value={contactMobile}
                        onChange={(e) => setContactMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappSame}
                        onChange={(e) => setWhatsappSame(e.target.checked)}
                        className="rounded border-slate-300 text-pip-600 focus:ring-pip-500 w-4 h-4"
                      />
                      <span>WhatsApp number is the same as mobile number</span>
                    </label>

                    {!whatsappSame && (
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
                          required={!whatsappSame}
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="9876543210"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl bg-pip-600 hover:bg-pip-700 text-white font-bold text-base shadow-lg shadow-pip-600/30 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Bulk Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Participant Upload</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Price Preview Card */}
            <div className="lg:col-span-4">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm sticky top-28 space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Bulk Group Discount
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-2">Special Group Tier</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Party In Pink {event.edition} • 5+ Attendees
                  </p>
                </div>

                <div className="space-y-3 text-sm text-slate-600 border-t border-b border-slate-100 py-4">
                  <div className="flex justify-between">
                    <span>Discounted Pass</span>
                    <span className="font-bold text-slate-900">{formatINR(bulkPrice)} / pass</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Standard Individual Rate</span>
                    <span className="line-through">{formatINR(singlePrice)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                    <span>Group Savings per Pass</span>
                    <span>Save {formatINR(singlePrice - bulkPrice)}</span>
                  </div>
                  <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between text-base font-extrabold text-slate-900">
                    <span>Estimated Total</span>
                    <span className="font-mono text-pip-600 text-lg">
                      {formatINR(totalAmountPaise)}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-pink-50 rounded-2xl border border-pink-200 text-xs text-pink-900 space-y-1">
                  <p className="font-bold">Attire Notice</p>
                  <p className="text-pink-800">
                    All attendees come dressed in pink clothing. Complimentary T-shirts are not
                    included; please wear your favorite pink attire for the event.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Spreadsheet Upload & Review */}
        {step === 2 && (
          <div className="space-y-8">
            {/* Header info banner with public reference */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold text-pip-700 bg-pip-50 px-3 py-1 rounded-full border border-pip-200">
                  {publicReference}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">{orgName}</h2>
                <p className="text-xs text-slate-500">
                  Contact: {contactName} ({contactEmail})
                </p>
              </div>

              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Download XLSX Template</span>
              </button>
            </div>

            {/* Upload Zone */}
            <div className="bg-white p-8 sm:p-12 rounded-3xl border-2 border-dashed border-slate-300 hover:border-pip-400 transition text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-pip-50 text-pip-600 flex items-center justify-center">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Upload Completed Participant Spreadsheet
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Upload your completed <code>.xlsx</code> file based on the template. Must contain
                  at least 5 rows with Name, Email, and 10-digit Mobile.
                </p>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-pip-600 hover:bg-pip-700 text-white text-sm font-bold cursor-pointer transition shadow">
                  <Upload className="w-4 h-4" />
                  <span>{fileName ? 'Choose Different File' : 'Select Spreadsheet (.xlsx)'}</span>
                  <input
                    type="file"
                    accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {fileName && (
                <p className="text-xs font-mono text-slate-600 pt-2">
                  Loaded file: <strong className="text-slate-900">{fileName}</strong>
                </p>
              )}
            </div>

            {isParsing && (
              <div className="py-8 text-center text-slate-500 flex items-center justify-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-pip-600" />
                <span className="text-sm">Validating spreadsheet rows...</span>
              </div>
            )}

            {/* Validation Errors Notice */}
            {validationErrors.length > 0 && (
              <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 space-y-3">
                <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Found {validationErrors.length} Issue(s) in Spreadsheet</span>
                </div>
                <p className="text-xs text-rose-700">
                  Please fix the issues in your Excel file and upload it again, or review the rows
                  below:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                  {validationErrors.map((err, i) => (
                    <div
                      key={i}
                      className="text-xs text-rose-800 bg-white/80 p-2 rounded-lg border border-rose-200"
                    >
                      {err.rowNumber > 0 && (
                        <span className="font-bold">Row {err.rowNumber}: </span>
                      )}
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Valid Attendees Preview Table */}
            {parsedAttendees.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-lg text-slate-900">
                      {parsedAttendees.length} Participants Ready
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Total: {formatINR(totalAmountPaise)}
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Full Name</th>
                        <th className="px-4 py-3">Email Address</th>
                        <th className="px-4 py-3">Mobile</th>
                        <th className="px-4 py-3">City</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedAttendees.map((attendee, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">
                            {attendee.fullName}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 font-mono">{attendee.email}</td>
                          <td className="px-4 py-2.5 text-slate-600 font-mono">
                            {attendee.mobileNumber}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {attendee.city || 'Bengaluru'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Final Order Confirmation & Commit Button */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Consolidated Total
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                      {formatINR(totalAmountPaise)}
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                      Total savings of {formatINR(savingsPaise)} applied!
                    </div>
                  </div>

                  <button
                    onClick={handleCommitAttendees}
                    disabled={
                      isSubmitting || validationErrors.length > 0 || parsedAttendees.length < 5
                    }
                    className="flex items-center space-x-2 px-8 py-4 rounded-xl bg-pip-600 hover:bg-pip-700 text-white font-bold text-base shadow-lg shadow-pip-600/30 transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Confirming Group...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Attendees & Proceed to Payment</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
