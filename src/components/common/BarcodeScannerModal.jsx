import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from '@zxing/library';
import {
  Camera, Flashlight, Keyboard, RefreshCw, RotateCcw, X,
} from 'lucide-react';
import Button from './Button';
import { useToast } from '@/context/ToastContext';
import './BarcodeScannerModal.css';

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
];

/**
 * Progressively more permissive constraint sets.
 * We try #1 first; if the camera rejects the request, we fall back.
 */
const CONSTRAINT_SETS = [
  // Ideal — rear camera at decent resolution
  {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  },
  // Simpler resolution
  {
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  },
  // Any camera
  { video: true, audio: false },
];

export default function BarcodeScannerModal({
  open,
  onClose,
  onScan,
  title = 'Scan barcode',
  subtitle = 'Point the camera at the barcode',
  manualLabel,
  onManualEntry,
}) {
  const toast = useToast();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const readerRef = useRef(null);
  const lastScanRef = useRef({ code: null, at: 0 });
  const scannedRef = useRef(false);
  const streamRef = useRef(null);
  const attemptRef = useRef(0);

  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);

  // ---------- Cleanup helpers ----------
  const stopStream = useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {
      /* ignore */
    }
    controlsRef.current = null;

    try {
      readerRef.current?.reset?.();
    } catch {
      /* ignore */
    }
    readerRef.current = null;

    // Kill any lingering raw stream (getUserMedia pre-flight)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      });
      streamRef.current = null;
    }

    // Also stop whatever ZXing attached to the video element
    const video = videoRef.current;
    if (video?.srcObject) {
      try {
        video.srcObject.getTracks().forEach(t => t.stop());
      } catch {
        /* ignore */
      }
      video.srcObject = null;
    }
  }, []);

  const failWith = (mainMessage, detailMessage = '') => {
    setStatus('error');
    setError(mainMessage);
    setDetail(detailMessage);
  };

  // ---------- Core scanner start ----------
  const startScanner = useCallback(async () => {
    if (!open) return;
    attemptRef.current += 1;
    stopStream();
    setStatus('starting');
    setError('');
    setDetail('');
    setTorchOn(false);
    scannedRef.current = false;

    // --- 1. Secure context check ---
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (!window.isSecureContext && !isLocalhost) {
      return failWith(
        'Camera access requires HTTPS.',
        `You are currently on ${window.location.protocol}//${window.location.host}. Browsers block camera access on non-secure origins. Open the deployed app at https://pos-saas-pearl.vercel.app on this device, or use ngrok to expose your dev server over HTTPS.`
      );
    }

    // --- 2. Browser support ---
    if (!navigator.mediaDevices?.getUserMedia) {
      return failWith(
        'This browser does not support camera access.',
        'Try Chrome, Edge, or Safari. Firefox on iOS does not support camera access.'
      );
    }

    // --- 3. Permission state (best-effort — some browsers lack this API) ---
    let permissionState = 'prompt';
    try {
      if (navigator.permissions?.query) {
        const p = await navigator.permissions.query({ name: 'camera' });
        permissionState = p.state;
      }
    } catch {
      /* ignore — the API is optional */
    }

    if (permissionState === 'denied') {
      return failWith(
        'Camera permission is blocked for this site.',
        'Tap the lock icon in the address bar → Permissions → set Camera to Allow, then tap Retry below. On Android Chrome you can also go to Settings → Site Settings → Camera.'
      );
    }

    // --- 4. Enumerate cameras (best-effort — may be empty before permission) ---
    let camList = [];
    try {
      camList = await BrowserMultiFormatReader.listVideoInputDevices();
    } catch {
      camList = [];
    }
    setDevices(camList);

    // --- 5. Pre-flight: ask for permission with a simple getUserMedia call ---
    //     This forces the browser to show the permission prompt NOW, and
    //     gives us a raw stream to hand to ZXing. It also pre-fills device
    //     labels so the switch-camera button is accurate.
    let preflightStream = null;
    let lastConstraintError = null;

    for (const constraints of CONSTRAINT_SETS) {
      try {
        preflightStream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        lastConstraintError = err;
        // NotAllowedError = user said no, no point trying more constraints
        if (err?.name === 'NotAllowedError') break;
        // Otherwise keep falling through to the next, more permissive set
      }
    }

    if (!preflightStream) {
      const name = String(lastConstraintError?.name || '');
      const message = String(lastConstraintError?.message || '');

      if (name === 'NotAllowedError') {
        return failWith(
          'Camera permission was denied.',
          'If this was a mistake, tap the lock icon in the address bar → Permissions → set Camera to Allow, then tap Retry.'
        );
      }
      if (name === 'NotFoundError') {
        return failWith(
          'No camera was found on this device.',
          'If your phone has a camera, try again after closing other apps that might be using it.'
        );
      }
      if (name === 'NotReadableError') {
        return failWith(
          'The camera is in use by another app.',
          'Close WhatsApp, Zoom, Instagram, or any other app that uses the camera, then tap Retry.'
        );
      }
      if (name === 'OverconstrainedError') {
        return failWith(
          'This camera rejected the requested settings.',
          'Try switching to the other camera using the rotate button in the top-right, then tap Retry.'
        );
      }
      return failWith(
        'Could not start the camera.',
        `Browser reported: ${message || name || 'unknown error'}`
      );
    }

    // We now have a live raw stream. Attach it to the video element so
    // the user sees something while ZXing initializes.
    streamRef.current = preflightStream;
    const video = videoRef.current;
    if (video) {
      video.srcObject = preflightStream;
      try {
        await video.play();
      } catch {
        /* ignore autoplay quirks */
      }
    }

    // Torch support
    try {
      const track = preflightStream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() || {};
      setHasTorch(!!caps.torch);
    } catch {
      setHasTorch(false);
    }

    // --- 6. Hand the video element over to ZXing for decoding ---
    //     We pass `null` as deviceId because the video already has a stream.
    //     ZXing's decodeFromVideoDevice accepts either a deviceId OR uses the
    //     existing srcObject when passed null in newer versions.
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 120,
        delayBetweenScanSuccess: 800,
      });
      readerRef.current = reader;

      // Attach ZXing's decoder to the same stream
      const controls = await reader.decodeFromStream(
        preflightStream,
        video,
        (result) => {
          if (result && !scannedRef.current) {
            handleDetected(result.getText());
          }
        }
      );
      controlsRef.current = controls;

      setStatus('ready');
    } catch (err) {
      // If ZXing fails, at least show the raw camera preview so the user
      // knows the camera itself is working. Then explain the decoder failed.
      // eslint-disable-next-line no-console
      console.warn('[barcode] ZXing failed:', err);
      return failWith(
        'Camera is running, but the barcode decoder failed to start.',
        'Tap Retry. If it keeps failing, use "Type the barcode instead" below.'
      );
    }
  }, [open, stopStream]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Lifecycle ----------
  useEffect(() => {
    if (!open) return undefined;
    startScanner();
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ---------- Detection handler ----------
  const handleDetected = code => {
    const now = Date.now();
    const last = lastScanRef.current;
    if (last.code === code && now - last.at < 1500) return;

    lastScanRef.current = { code, at: now };
    scannedRef.current = true;
    setFlash(true);
    try {
      if (navigator.vibrate) navigator.vibrate(80);
    } catch {
      /* ignore */
    }

    setTimeout(() => {
      stopStream();
      onScan?.(code);
      onClose?.();
      setFlash(false);
    }, 320);
  };

  const retry = () => {
    attemptRef.current = 0;
    startScanner();
  };

  const toggleTorch = async () => {
    try {
      const track =
        streamRef.current?.getVideoTracks?.()[0] ||
        controlsRef.current?.stream?.getVideoTracks?.()[0];
      if (!track) return;
      await track.applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(v => !v);
    } catch {
      toast.warning('This camera does not support the flashlight.');
    }
  };

  const switchCamera = async () => {
    if (devices.length < 2) {
      toast.info('Only one camera is available on this device.');
      return;
    }
    const idx = devices.findIndex(d => d.deviceId === deviceId);
    const next = devices[(idx + 1) % devices.length];
    setDeviceId(next.deviceId);
    setTorchOn(false);
    stopStream();

    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: next.deviceId } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          /* ignore */
        }
      }

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 120,
        delayBetweenScanSuccess: 800,
      });
      readerRef.current = reader;
      const controls = await reader.decodeFromStream(
        stream,
        video,
        (result) => {
          if (result && !scannedRef.current) {
            handleDetected(result.getText());
          }
        }
      );
      controlsRef.current = controls;

      try {
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() || {};
        setHasTorch(!!caps.torch);
      } catch {
        setHasTorch(false);
      }

      setStatus('ready');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[barcode] switch failed', err);
      failWith(
        'Could not switch cameras.',
        String(err?.message || err)
      );
    }
  };

  const submitManual = () => {
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    onManualEntry?.(trimmed);
    onScan?.(trimmed);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="bsm" role="dialog" aria-label={title}>
      <video
        ref={videoRef}
        className={`bsm-video ${flash ? 'bsm-video-ok' : ''}`}
        playsInline
        muted
        autoPlay
      />

      <div className="bsm-overlay" aria-hidden="true">
        <div className="bsm-vignette" />
        <div className="bsm-frame">
          <span className="bsm-corner bsm-corner-tl" />
          <span className="bsm-corner bsm-corner-tr" />
          <span className="bsm-corner bsm-corner-bl" />
          <span className="bsm-corner bsm-corner-br" />
          <span className="bsm-laser" />
        </div>
      </div>

      <header className="bsm-head">
        <button className="bsm-icon-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="bsm-head-text">
          <div className="bsm-title">{title}</div>
          <div className="bsm-subtitle">{subtitle}</div>
        </div>
        <div className="bsm-head-actions">
          {hasTorch && (
            <button
              className={`bsm-icon-btn ${torchOn ? 'on' : ''}`}
              onClick={toggleTorch}
              aria-label="Toggle flashlight"
            >
              <Flashlight size={17} />
            </button>
          )}
          <button
            className="bsm-icon-btn"
            onClick={switchCamera}
            aria-label="Switch camera"
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </header>

      <div className="bsm-status">
        {status === 'starting' && (
          <div className="bsm-status-pill">
            <Camera size={14} /> Starting camera…
          </div>
        )}
        {status === 'ready' && (
          <div className="bsm-status-pill bsm-status-ready">
            Point at a barcode — it will scan automatically
          </div>
        )}
        {status === 'error' && error && (
          <div className="bsm-error">
            <div className="bsm-error-title">{error}</div>
            {detail && <div className="bsm-error-detail">{detail}</div>}
            <button className="bsm-retry" onClick={retry}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}
        {flash && (
          <div className="bsm-status-pill bsm-status-ok">
            Barcode detected
          </div>
        )}
      </div>

      <footer className="bsm-foot">
        {manualLabel ? (
          showManual ? (
            <div className="bsm-manual">
              <input
                type="text"
                className="bsm-manual-input"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitManual();
                }}
                placeholder="Type the barcode or SKU"
                autoFocus
              />
              <Button onClick={submitManual} disabled={!manualInput.trim()}>
                Use this code
              </Button>
            </div>
          ) : (
            <button
              className="bsm-manual-toggle"
              onClick={() => setShowManual(true)}
            >
              <Keyboard size={15} />
              <span>{manualLabel}</span>
            </button>
          )
        ) : null}
      </footer>
    </div>
  );
}