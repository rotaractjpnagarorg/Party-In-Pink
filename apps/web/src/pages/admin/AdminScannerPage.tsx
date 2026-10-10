import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase.js';
import { useAdminAuth } from '../../context/AdminAuthContext.js';
import {
  Scan,
  Camera,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  Volume2,
  VolumeX,
  UserCheck,
  Building,
  ChevronRight,
  ShieldCheck,
  Clock,
  RotateCcw,
} from 'lucide-react';

export interface ScannableAttendee {
  id: string; // attendee doc ID or custom ID
  orderId: string;
  orderRef: string;
  fullName: string;
  email: string;
  phone: string;
  registrationId: string;
  bookingId?: string;
  type: 'SINGLE' | 'BULK' | 'DONOR_PASS' | 'KONFHUB_DIRECT';
  clubOrOrg?: string;
  ticketStatus: string;
  checkInStatus: 'CHECKED_IN' | 'NOT_CHECKED_IN';
  checkedInAt?: string | null;
  checkedInBy?: string | null;
}

// 11 Direct KonfHub attendees who registered directly on KonfHub without a Firestore order
const DIRECT_KONFHUB_VIP: ScannableAttendee[] = [
  { id: 'kh_544c09f2', orderId: 'KH_DIRECT', orderRef: 'KONFHUB', fullName: 'Rtr. R Jai Akash', email: 'rjakashh10@gmail.com', phone: '', registrationId: 'KH-544c09f2', bookingId: '544c09f2', type: 'KONFHUB_DIRECT', clubOrOrg: 'Rotaract', ticketStatus: 'ISSUED', checkInStatus: 'NOT_CHECKED_IN' },
  { id: 'kh_dc4cce3f', orderId: 'KH_DIRECT', orderRef: 'KONFHUB', fullName: 'Rtr. Aman Agarwal', email: 'rtr.amanagarwal3191@gmail.com', phone: '', registrationId: 'KH-dc4cce3f', bookingId: 'dc4cce3f', type: 'KONFHUB_DIRECT', clubOrOrg: 'Rotaract', ticketStatus: 'ISSUED', checkInStatus: 'NOT_CHECKED_IN' },
  { id: 'kh_30bc1fe3', orderId: 'KH_DIRECT', orderRef: 'KONFHUB', fullName: 'Rtn. Rtr. Gagana M', email: 'rtrgaganam30@gmail.com', phone: '', registrationId: 'KH-30bc1fe3', bookingId: '30bc1fe3', type: 'KONFHUB_DIRECT', clubOrOrg: 'Rotaract', ticketStatus: 'ISSUED', checkInStatus: 'NOT_CHECKED_IN' },
  { id: 'kh_886e61ab', orderId: 'KH_DIRECT', orderRef: 'KONFHUB', fullName: 'Rtr. Yaseer Ahmed', email: 'yaseerahmedkhaja@gmail.com', phone: '', registrationId: 'KH-886e61ab', bookingId: '886e61ab', type: 'KONFHUB_DIRECT', clubOrOrg: 'Rotaract', ticketStatus: 'ISSUED', checkInStatus: 'NOT_CHECKED_IN' },
  { id: 'kh_f96ec557', orderId: 'KH_DIRECT', orderRef: 'KONFHUB', fullName: 'Rtr. Mohamed Faizal', email: 'rtr.mdfaizal@gmail.com', phone: '', registrationId: 'KH-f96ec557', bookingId: 'f96ec557', type: 'KONFHUB_DIRECT', clubOrOrg: 'Rotaract', ticketStatus: 'ISSUED', checkInStatus: 'NOT_CHECKED_IN' },
  { id: 'kh_4d31e996', orderId: 'KH_DIRECT', orderRef: 'KONFHUB', fullName: 'Rtr. Rhea Pillai', email: 'pillai.rhea2005@gmail.com', phone: '', registrationId: 'KH-4d31e996', bookingId: '4d31e996', type: 'KONFHUB_DIRECT', clubOrOrg: 'Rotaract', ticketStatus: 'ISSUED', checkInStatus: 'NOT_CHECKED_IN' },
  { id: 'kh_e8e9714e', orderId: 'KH_DIRECT', orderRef: 'KONFHUB', fullName: 'Rtr. Dhanesh Menon', email: 'rtrdhaneshmenon@gmail.com', phone: '', registrationId: 'KH-e8e9714e', bookingId: 'e8e9714e', type: 'KONFHUB_DIRECT', clubOrOrg: 'Rotaract', ticketStatus: 'ISSUED', checkInStatus: 'NOT_CHECKED_IN' },
  { id: 'kh_ccf8384b', orderId: 'KH_DIRECT', orderRef: 'KONFHUB', fullName: 'PP Rtr. Hemant Chhajer', email: 'hemantchhajer20@gmail.com', phone: '', registrationId: 'KH-ccf8384b', bookingId: 'ccf8384b', type: 'KONFHUB_DIRECT', clubOrOrg: 'Rotaract', ticketStatus: 'ISSUED', checkInStatus: 'NOT_CHECKED_IN' },
  { id: 'kh_43f38fb8', orderId: 'KH_DIRECT', orderRef: 'KONFHUB', fullName: 'PP Rtr. Ram M. Narayanan', email: 'mailrtr.ram@gmail.com', phone: '', registrationId: 'KH-43f38fb8', bookingId: '43f38fb8', type: 'KONFHUB_DIRECT', clubOrOrg: 'Rotaract', ticketStatus: 'ISSUED', checkInStatus: 'NOT_CHECKED_IN' },
  { id: 'kh_4cdff0ea', orderId: 'KH_DIRECT', orderRef: 'KONFHUB', fullName: 'Rtr. Yashik P K', email: 'rtr.yashikpk@gmail.com', phone: '', registrationId: 'KH-4cdff0ea', bookingId: '4cdff0ea', type: 'KONFHUB_DIRECT', clubOrOrg: 'Rotaract', ticketStatus: 'ISSUED', checkInStatus: 'NOT_CHECKED_IN' },
  { id: 'kh_e434a28d', orderId: 'KH_DIRECT', orderRef: 'KONFHUB', fullName: 'Rtr. Jay Gohel', email: 'jaygohel09@gmail.com', phone: '', registrationId: 'KH-e434a28d', bookingId: 'e434a28d', type: 'KONFHUB_DIRECT', clubOrOrg: 'Rotaract', ticketStatus: 'ISSUED', checkInStatus: 'NOT_CHECKED_IN' },
];

const playBeep = (type: 'success' | 'warning' | 'error') => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
      if (navigator.vibrate) navigator.vibrate([70]);
    } else if (type === 'warning') {
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } else {
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
      if (navigator.vibrate) navigator.vibrate([200]);
    }
  } catch {
    // AudioContext blocked or not supported
  }
};

export const AdminScannerPage: React.FC = () => {
  const { profile } = useAdminAuth();
  const [attendees, setAttendees] = useState<ScannableAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scanner UI State
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'SEARCH'>('CAMERA');

  // Active Scanned Result State
  const [scannedResult, setScannedResult] = useState<{
    rawText: string;
    attendee: ScannableAttendee | null;
    status: 'VALID' | 'ALREADY_CHECKED_IN' | 'INVALID';
    message: string;
  } | null>(null);

  const [checkingIn, setCheckingIn] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [recentScans, setRecentScans] = useState<Array<{ attendee: ScannableAttendee; time: string; status: string }>>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // 1. Load All Attendee Records from Firestore & Cache
  const loadDatabase = useCallback(async () => {
    setLoading(true);
    try {
      const cachedLocal = localStorage.getItem('pip5_gate_checkins');
      const localCheckIns: Record<string, { time: string; by: string }> = cachedLocal
        ? JSON.parse(cachedLocal)
        : {};

      const ordersSnap = await getDocs(
        query(collection(db, 'orders'), where('orderStatus', '==', 'CONFIRMED'))
      );

      const items: ScannableAttendee[] = [];

      await Promise.all(
        ordersSnap.docs.map(async (oDoc) => {
          const o = oDoc.data();
          const isDonor = oDoc.id.startsWith('DONOR_') || o.type === 'DONOR';
          const isBulk = o.type === 'BULK';
          const passType: 'SINGLE' | 'BULK' | 'DONOR_PASS' = isDonor
            ? 'DONOR_PASS'
            : isBulk
            ? 'BULK'
            : 'SINGLE';

          try {
            const attsSnap = await getDocs(collection(db, 'orders', oDoc.id, 'attendees'));
            const orderCore = (o.publicReference || oDoc.id).replace(/^PIP5-(S|B|D)-/, '');
            if (!attsSnap.empty) {
              attsSnap.docs.forEach((aDoc, idx) => {
                const a = aDoc.data();
                const attId = aDoc.id;
                const defaultRegId =
                  passType === 'SINGLE'
                    ? `PIP5-REG-${orderCore}`
                    : passType === 'BULK'
                    ? `PIP5-BUL-${orderCore}-P${String(idx + 1).padStart(2, '0')}`
                    : `PIP5-DON-${orderCore}-P${String(idx + 1).padStart(2, '0')}`;
                const regId = a.registrationId || a.passId || defaultRegId;
                const isCheckedIn =
                  a.checkInStatus === 'CHECKED_IN' ||
                  !!localCheckIns[attId] ||
                  !!localCheckIns[regId] ||
                  !!localCheckIns[defaultRegId] ||
                  !!localCheckIns[o.publicReference || ''] ||
                  !!localCheckIns[orderCore];

                items.push({
                  id: attId,
                  orderId: oDoc.id,
                  orderRef: o.publicReference || oDoc.id.slice(0, 10),
                  fullName: a.fullName || a.name || o.buyer?.fullName || 'Attendee',
                  email: a.email || o.buyer?.email || '',
                  phone: a.phone || a.mobileNumber || o.buyer?.mobileNumber || '',
                  registrationId: regId,
                  bookingId: a.bookingId || o.bookingId || undefined,
                  type: passType,
                  clubOrOrg: a.clubName || a.organisationName || o.organisationName || undefined,
                  ticketStatus: a.ticketStatus || 'ISSUED',
                  checkInStatus: isCheckedIn ? 'CHECKED_IN' : 'NOT_CHECKED_IN',
                  checkedInAt: a.checkedInAt || localCheckIns[attId]?.time || localCheckIns[regId]?.time,
                  checkedInBy: a.checkedInBy || localCheckIns[attId]?.by || localCheckIns[regId]?.by,
                });
              });
            } else if (o.buyer) {
              const defaultRegId =
                passType === 'SINGLE'
                  ? `PIP5-REG-${orderCore}`
                  : passType === 'BULK'
                  ? `PIP5-BUL-${orderCore}-P01`
                  : `PIP5-DON-${orderCore}-P01`;
              const regId = defaultRegId;
              const isCheckedIn =
                !!localCheckIns[oDoc.id] ||
                !!localCheckIns[regId] ||
                !!localCheckIns[o.publicReference || ''] ||
                !!localCheckIns[orderCore];
              items.push({
                id: oDoc.id,
                orderId: oDoc.id,
                orderRef: o.publicReference || oDoc.id.slice(0, 10),
                fullName: o.buyer.fullName || 'Attendee',
                email: o.buyer.email || '',
                phone: o.buyer.mobileNumber || '',
                registrationId: regId,
                bookingId: o.bookingId || undefined,
                type: passType,
                clubOrOrg: o.organisationName || undefined,
                ticketStatus: 'ISSUED',
                checkInStatus: isCheckedIn ? 'CHECKED_IN' : 'NOT_CHECKED_IN',
                checkedInAt: localCheckIns[oDoc.id]?.time || localCheckIns[regId]?.time,
                checkedInBy: localCheckIns[oDoc.id]?.by || localCheckIns[regId]?.by,
              });
            }
          } catch (err) {
            console.warn(`Failed reading subcollection attendees for ${oDoc.id}:`, err);
          }
        })
      );

      // Merge Direct KonfHub VIPs
      DIRECT_KONFHUB_VIP.forEach((kh) => {
        const isCheckedIn =
          !!localCheckIns[kh.id] ||
          !!localCheckIns[kh.bookingId || ''] ||
          !!localCheckIns[kh.email];
        items.push({
          ...kh,
          checkInStatus: isCheckedIn ? 'CHECKED_IN' : 'NOT_CHECKED_IN',
          checkedInAt: localCheckIns[kh.id]?.time,
          checkedInBy: localCheckIns[kh.id]?.by,
        });
      });

      setAttendees(items);
    } catch (err) {
      console.error('Failed to load tickets for scanner:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  // Fast In-Memory Lookup Index
  const attendeeIndex = useMemo(() => {
    const map = new Map<string, ScannableAttendee>();

    const indexKey = (key: string | undefined | null, att: ScannableAttendee) => {
      if (!key) return;
      const k = key.toLowerCase().trim();
      if (!k) return;
      map.set(k, att);

      // Map prefixes and canonical variants
      if (k.startsWith('pip5-reg-')) {
        map.set(k.replace('pip5-reg-', 'pip5-s-'), att);
        map.set(k.replace('pip5-reg-', ''), att);
      } else if (k.startsWith('pip5-s-')) {
        map.set(k.replace('pip5-s-', 'pip5-reg-'), att);
        map.set(k.replace('pip5-s-', ''), att);
      } else if (k.startsWith('pip5-bul-')) {
        map.set(k.replace('pip5-bul-', 'pip5-b-').replace(/-p\d+$/, ''), att);
        map.set(k.replace('pip5-bul-', '').replace(/-p\d+$/, ''), att);
      } else if (k.startsWith('pip5-b-')) {
        map.set(k.replace('pip5-b-', 'pip5-bul-'), att);
        map.set(k.replace('pip5-b-', ''), att);
      } else if (k.startsWith('pip5-don-')) {
        map.set(k.replace('pip5-don-', 'pip5-d-').replace(/-p\d+$/, ''), att);
        map.set(k.replace('pip5-don-', '').replace(/-p\d+$/, ''), att);
      } else if (k.startsWith('pip5-d-')) {
        map.set(k.replace('pip5-d-', 'pip5-don-'), att);
        map.set(k.replace('pip5-d-', ''), att);
      }

      // Index 4+ character core alphanumeric identifier
      const core = k.replace(/^pip5-(?:reg|bul|don|s|b|d)-/i, '').replace(/-p\d+$/i, '');
      if (core && core.length >= 4) {
        map.set(core, att);
      }
    };

    attendees.forEach((att) => {
      indexKey(att.registrationId, att);
      indexKey(att.orderRef, att);
      indexKey(att.orderId, att);
      indexKey(att.id, att);
      indexKey(att.bookingId, att);
      indexKey(att.email, att);
      indexKey(att.fullName, att);
      if (att.phone) {
        indexKey(att.phone, att);
        const digits = att.phone.replace(/\D/g, '').slice(-10);
        if (digits) map.set(digits, att);
      }
    });

    return map;
  }, [attendees]);

  // QR Decoder & Extractor
  const resolveScannedPayload = useCallback(
    (decodedText: string): ScannableAttendee | null => {
      const text = decodedText.trim();
      const cleanLower = text.toLowerCase();

      // 1. Direct key match in index (handles regId, orderRef, core, email, phone)
      const direct = attendeeIndex.get(cleanLower);
      if (direct) return direct;

      // 2. KonfHub pipe-delimited format: id:db3e06de|n:Abhay Lohia|eid:...
      if (text.includes('|') || text.startsWith('id:')) {
        const parts = text.split('|');
        for (const p of parts) {
          const [k, v] = p.split(':');
          if (k === 'id' && v) {
            const m = attendeeIndex.get(v.toLowerCase().trim());
            if (m) return m;
          }
          if (k === 'n' && v) {
            const m = attendeeIndex.get(v.toLowerCase().trim());
            if (m) return m;
          }
        }
      }

      // 3. Match any PIP5 pass token: PIP5-REG-XXXX, PIP5-S-XXXX, PIP5-BUL-XXXX, etc.
      const passMatch =
        text.match(/PIP5-(?:REG|BUL|DON|S|B|D)-[A-Z0-9-]+/i) || text.match(/PIP5-[A-Z0-9-]+/i);
      if (passMatch) {
        const matchedStr = passMatch[0].toLowerCase();
        let m = attendeeIndex.get(matchedStr);
        if (m) return m;

        // Try converted forms
        if (matchedStr.startsWith('pip5-reg-')) {
          m =
            attendeeIndex.get(matchedStr.replace('pip5-reg-', 'pip5-s-')) ||
            attendeeIndex.get(matchedStr.replace('pip5-reg-', ''));
          if (m) return m;
        } else if (matchedStr.startsWith('pip5-s-')) {
          m =
            attendeeIndex.get(matchedStr.replace('pip5-s-', 'pip5-reg-')) ||
            attendeeIndex.get(matchedStr.replace('pip5-s-', ''));
          if (m) return m;
        } else if (matchedStr.startsWith('pip5-bul-')) {
          m =
            attendeeIndex.get(matchedStr.replace('pip5-bul-', 'pip5-b-').replace(/-p\d+$/, '')) ||
            attendeeIndex.get(matchedStr.replace('pip5-bul-', '').replace(/-p\d+$/, ''));
          if (m) return m;
        } else if (matchedStr.startsWith('pip5-b-')) {
          m =
            attendeeIndex.get(matchedStr.replace('pip5-b-', 'pip5-bul-')) ||
            attendeeIndex.get(matchedStr.replace('pip5-b-', ''));
          if (m) return m;
        } else if (matchedStr.startsWith('pip5-don-')) {
          m =
            attendeeIndex.get(matchedStr.replace('pip5-don-', 'pip5-d-').replace(/-p\d+$/, '')) ||
            attendeeIndex.get(matchedStr.replace('pip5-don-', '').replace(/-p\d+$/, ''));
          if (m) return m;
        }

        // Try core alphanumeric code
        const core = matchedStr.replace(/^pip5-(?:reg|bul|don|s|b|d)-/, '').replace(/-p\d+$/, '');
        if (core) {
          m = attendeeIndex.get(core);
          if (m) return m;
        }
      }

      // 4. Try extracting 5-8 char alphanumeric core from string (e.g. 55W2SB)
      const coreMatch = text.match(/\b([A-Z0-9]{5,8})\b/i);
      if (coreMatch && coreMatch[1]) {
        const m = attendeeIndex.get(coreMatch[1].toLowerCase());
        if (m) return m;
      }

      // 5. URL format (status or KonfHub)
      try {
        const url = new URL(text);
        const segments = url.pathname.split('/').filter(Boolean);
        for (const seg of segments) {
          const m = attendeeIndex.get(seg.toLowerCase());
          if (m) return m;
        }
      } catch {
        // Not a URL
      }

      // 6. Fuzzy match against all attendees (name, email, phone)
      const fuzzy = attendees.find((a) => {
        const fName = a.fullName ? a.fullName.toLowerCase() : '';
        const fEmail = a.email ? a.email.toLowerCase() : '';
        const fPhone = a.phone ? a.phone.replace(/\D/g, '').slice(-10) : '';

        return (
          (fName && cleanLower.includes(fName)) ||
          (fEmail && cleanLower.includes(fEmail)) ||
          (fPhone && cleanLower.includes(fPhone))
        );
      });

      return fuzzy || null;
    },
    [attendeeIndex, attendees]
  );

  // Handle Scan Event
  const onScanSuccess = useCallback(
    (decodedText: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      const matched = resolveScannedPayload(decodedText);

      if (!matched) {
        if (soundEnabled) playBeep('error');
        setScannedResult({
          rawText: decodedText,
          attendee: null,
          status: 'INVALID',
          message: 'Pass not found or invalid QR code. Direct attendee to Helpdesk.',
        });
      } else if (matched.checkInStatus === 'CHECKED_IN') {
        if (soundEnabled) playBeep('warning');
        setScannedResult({
          rawText: decodedText,
          attendee: matched,
          status: 'ALREADY_CHECKED_IN',
          message: `Already checked in at ${matched.checkedInAt ? new Date(matched.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Gate'} by ${matched.checkedInBy || 'Volunteer'}.`,
        });
      } else {
        if (soundEnabled) playBeep('success');
        setScannedResult({
          rawText: decodedText,
          attendee: matched,
          status: 'VALID',
          message: 'Valid Pass Verified! Ready for gate check-in.',
        });
      }

      // Cooldown before next camera scan to prevent rapid firing
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
    },
    [resolveScannedPayload, soundEnabled]
  );

  // Initialize Camera Scanner
  const startCamera = async (cameraId?: string) => {
    try {
      setCameraError(null);
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('No camera found on this device. Please use manual search.');
        return;
      }

      setCameras(devices);
      const firstCam = devices[0];
      if (!firstCam) {
        setCameraError('No available camera device found.');
        return;
      }

      // Prefer rear/environment camera
      const backCam =
        devices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')) ||
        firstCam;

      const targetId = cameraId || selectedCameraId || backCam.id;
      setSelectedCameraId(targetId);

      const html5QrCode = new Html5Qrcode('qr-reader-viewport', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        targetId,
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (text) => onScanSuccess(text),
        () => {
          // Frame error (normal during camera scanning, ignore)
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setCameraError(err?.message || 'Could not access camera. Please allow camera permissions or use Manual Search.');
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && scanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
      setScanning(false);
      setTorchOn(false);
    }
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (html5QrCodeRef.current && scanning) {
      try {
        const nextState = !torchOn;
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch not supported on this device/camera:', err);
      }
    }
  };

  // Switch Camera
  const switchCamera = async (newId: string) => {
    setSelectedCameraId(newId);
    await stopCamera();
    await startCamera(newId);
  };

  useEffect(() => {
    if (activeTab === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  // Execute Check-in
  const handleConfirmCheckIn = async (override = false) => {
    if (!scannedResult?.attendee) return;
    const att = scannedResult.attendee;

    setCheckingIn(true);
    const nowIso = new Date().toISOString();
    const volunteerName = profile?.displayName || profile?.email || 'Gate Volunteer';

    try {
      // 1. Call server function if in Firestore
      if (att.orderId !== 'KH_DIRECT') {
        const checkInFn = httpsCallable(functions, 'adminCheckInAttendee');
        await checkInFn({
          orderId: att.orderId,
          attendeeId: att.id,
          identifier: att.registrationId || att.bookingId || att.id,
          forceOverride: override,
        });
      }

      // 2. Save in local cache so it works instantly offline/online
      const cached = localStorage.getItem('pip5_gate_checkins');
      const store: Record<string, { time: string; by: string }> = cached ? JSON.parse(cached) : {};
      store[att.id] = { time: nowIso, by: volunteerName };
      if (att.registrationId) store[att.registrationId] = { time: nowIso, by: volunteerName };
      if (att.bookingId) store[att.bookingId] = { time: nowIso, by: volunteerName };
      localStorage.setItem('pip5_gate_checkins', JSON.stringify(store));

      // 3. Update in-memory state
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === att.id || a.registrationId === att.registrationId
            ? { ...a, checkInStatus: 'CHECKED_IN', checkedInAt: nowIso, checkedInBy: volunteerName }
            : a
        )
      );

      // 4. Record to recent scans
      const updatedAttendee: ScannableAttendee = {
        ...att,
        checkInStatus: 'CHECKED_IN',
        checkedInAt: nowIso,
        checkedInBy: volunteerName,
      };

      setRecentScans((prev) => [
        { attendee: updatedAttendee, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'CHECKED_IN' },
        ...prev.slice(0, 9),
      ]);

      if (soundEnabled) playBeep('success');

      setScannedResult({
        rawText: scannedResult.rawText,
        attendee: updatedAttendee,
        status: 'ALREADY_CHECKED_IN',
        message: `✓ Successfully checked in ${att.fullName}! Gate entry permitted.`,
      });
    } catch (err: any) {
      console.error('Check-in error:', err);
      // Fallback: Save locally anyway so the gate is not held up!
      const cached = localStorage.getItem('pip5_gate_checkins');
      const store: Record<string, { time: string; by: string }> = cached ? JSON.parse(cached) : {};
      store[att.id] = { time: nowIso, by: volunteerName };
      localStorage.setItem('pip5_gate_checkins', JSON.stringify(store));

      setAttendees((prev) =>
        prev.map((a) =>
          a.id === att.id ? { ...a, checkInStatus: 'CHECKED_IN', checkedInAt: nowIso, checkedInBy: volunteerName } : a
        )
      );

      setScannedResult({
        rawText: scannedResult.rawText,
        attendee: { ...att, checkInStatus: 'CHECKED_IN', checkedInAt: nowIso, checkedInBy: volunteerName },
        status: 'ALREADY_CHECKED_IN',
        message: `✓ Gate entry approved (Cached locally).`,
      });
    } finally {
      setCheckingIn(false);
    }
  };

  // Manual Search Filter
  const filteredSearchResults = useMemo(() => {
    if (!manualQuery.trim()) return [];
    const q = manualQuery.toLowerCase().trim();
    return attendees
      .filter(
        (a) =>
          a.fullName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.phone.includes(q) ||
          (a.registrationId && a.registrationId.toLowerCase().includes(q)) ||
          (a.bookingId && a.bookingId.toLowerCase().includes(q)) ||
          (a.clubOrOrg && a.clubOrOrg.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [attendees, manualQuery]);

  // Statistics
  const totalCount = attendees.length;
  const checkedInCount = attendees.filter((a) => a.checkInStatus === 'CHECKED_IN').length;
  const checkInPercent = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 text-slate-100">
      {/* Top Header & Real-Time Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-pip-500/20 text-pip-400 border border-pip-500/30">
              <Scan className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">Party In Pink Gate Scanner</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            SSMRV College Gate Entrance • RI District 3191 • Real-Time Pass Validation
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Checked In</div>
            <div className="text-xl font-black text-emerald-400">
              {checkedInCount} <span className="text-xs font-normal text-slate-500">/ {totalCount}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-slate-800 flex items-center justify-center font-bold text-xs text-emerald-400 bg-emerald-950/40">
            {checkInPercent}%
          </div>
          <button
            onClick={() => loadDatabase()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh Attendee Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pip-400' : ''}`} />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition ${
              soundEnabled
                ? 'bg-pip-500/10 border-pip-500/30 text-pip-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title={soundEnabled ? 'Sound On' : 'Sound Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('CAMERA')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'CAMERA'
              ? 'bg-pip-600 text-white shadow-lg shadow-pip-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          Camera Scanner
        </button>
        <button
          onClick={() => setActiveTab('SEARCH')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'SEARCH'
              ? 'bg-pip-600 text-white shadow-lg shadow-pip-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          Manual Lookup ({attendees.length})
        </button>
      </div>

      {/* CAMERA SCANNER TAB */}
      {activeTab === 'CAMERA' && (
        <div className="space-y-4">
          <div className="relative bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4">
            {/* Viewport element for html5-qrcode */}
            <div
              id="qr-reader-viewport"
              className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black min-h-[300px]"
            />

            {/* Camera Controls */}
            <div className="flex items-center justify-between mt-3 px-2">
              {cameras.length > 1 ? (
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => switchCamera(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-pip-500"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${c.id.slice(0, 4)}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Active Camera Feed
                </div>
              )}

              <button
                onClick={toggleTorch}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  torchOn
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
                title="Toggle Flashlight / Torch"
              >
                <Zap className="w-3.5 h-3.5" />
                {torchOn ? 'Torch On' : 'Torch'}
              </button>
            </div>

            {cameraError && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Camera Access Issue</div>
                  <div className="text-xs text-rose-300 mt-1">{cameraError}</div>
                  <button
                    onClick={() => startCamera()}
                    className="mt-2.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition"
                  >
                    Retry Camera
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANUAL SEARCH TAB */}
      {activeTab === 'SEARCH' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Search by name, phone, email, pass ID (PIP5-...), or KonfHub booking ID..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-pip-500 focus:ring-1 focus:ring-pip-500 text-sm shadow-inner"
              autoFocus
            />
            {manualQuery && (
              <button
                onClick={() => setManualQuery('')}
                className="absolute right-3.5 top-3.5 text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800"
              >
                Clear
              </button>
            )}
          </div>

          {filteredSearchResults.length > 0 ? (
            <div className="space-y-2">
              {filteredSearchResults.map((att) => (
                <div
                  key={att.id}
                  onClick={() => onScanSuccess(att.registrationId || att.bookingId || att.email)}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-pip-500/50 hover:bg-slate-850 cursor-pointer transition flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base truncate">{att.fullName}</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          att.type === 'BULK'
                            ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30'
                            : att.type === 'DONOR_PASS'
                            ? 'bg-amber-900/40 text-amber-300 border border-amber-500/30'
                            : 'bg-pip-900/40 text-pip-300 border border-pip-500/30'
                        }`}
                      >
                        {att.type}
                      </span>
                      {att.checkInStatus === 'CHECKED_IN' ? (
                        <span className="text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> In Gate
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                          Ready
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      {att.clubOrOrg && <span className="text-slate-300">{att.clubOrOrg}</span>}
                      {att.phone && <span>{att.phone}</span>}
                      {att.registrationId && <span className="font-mono text-pip-400">{att.registrationId}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-pip-400 transition flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : manualQuery ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60 text-slate-400 text-sm">
              No attendee matching &ldquo;{manualQuery}&rdquo; found.
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
              Type at least 2 characters to search the complete database of 140+ attendees.
            </div>
          )}
        </div>
      )}

      {/* SCANNED PASS POPUP / CARD */}
      {scannedResult && (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {scannedResult.status === 'VALID' && scannedResult.attendee && (
            <div className="bg-gradient-to-br from-emerald-950/80 to-slate-900 border-2 border-emerald-500/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Valid Gate Pass
              </div>

              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <UserCheck className="w-8 h-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-black text-white leading-tight">
                    {scannedResult.attendee.fullName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-900/40 text-emerald-300 border border-emerald-500/30">
                      {scannedResult.attendee.type}
                    </span>
                    {scannedResult.attendee.clubOrOrg && (
                      <span className="text-xs text-slate-300 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {scannedResult.attendee.clubOrOrg}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pass Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-500 block">Pass ID</span>
                  <span className="font-mono font-bold text-pip-400">
                    {scannedResult.attendee.registrationId || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Booking / KonfHub</span>
                  <span className="font-mono text-slate-300">
                    {scannedResult.attendee.bookingId || 'Manual / Brevo'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Order Ref</span>
                  <span className="font-mono text-slate-300">{scannedResult.attendee.orderRef}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mobile</span>
                  <span className="text-slate-200">{scannedResult.attendee.phone || '—'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Email</span>
                  <span className="text-slate-200 truncate block">{scannedResult.attendee.email || '—'}</span>
                </div>
              </div>

              {/* Big Action Button */}
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={() => handleConfirmCheckIn(false)}
                  disabled={checkingIn}
                  className="flex-1 py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {checkingIn ? 'Recording Entry...' : 'CONFIRM GATE ENTRY'}
                </button>
                <button
                  onClick={() => setScannedResult(null)}
                  className="py-4 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-sm transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {scannedResult.status === 'ALREADY_CHECKED_IN' && scannedResult.attendee && (
            <div className="bg-gradient-to-br from-amber-950/80 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-black text-xs px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Already Checked In
              </div>

              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-black text-white leading-tight">
                    {scannedResult.attendee.fullName}
                  </h2>
                  <div className="text-amber-300 font-bold text-sm mt-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {scannedResult.message}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={() => handleConfirmCheckIn(true)}
                  disabled={checkingIn}
                  className="flex-1 py-3 px-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-200 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  {checkingIn ? 'Updating...' : 'Allow Re-Entry (Override)'}
                </button>
                <button
                  onClick={() => setScannedResult(null)}
                  className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {scannedResult.status === 'INVALID' && (
            <div className="bg-gradient-to-br from-rose-950/80 to-slate-900 border-2 border-rose-500/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <XCircle className="w-8 h-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black text-rose-200">Unrecognized / Invalid QR Pass</h2>
                  <p className="text-xs text-rose-300 mt-1">{scannedResult.message}</p>
                  <div className="mt-2 text-xs font-mono bg-slate-950 p-2 rounded-xl text-slate-400 break-all">
                    Raw: {scannedResult.rawText.slice(0, 100)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setScannedResult(null)}
                  className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
                >
                  Close & Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity Log */}
      {recentScans.length > 0 && (
        <div className="mt-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Recent Gate Check-ins</span>
            <span>{recentScans.length} logged</span>
          </div>
          <div className="space-y-2">
            {recentScans.map((r, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-850 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-white truncate">{r.attendee.fullName}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{r.attendee.registrationId}</span>
                </div>
                <div className="text-slate-400 text-[11px] flex-shrink-0">{r.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
