import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from '@zxing/library';
import {
  Camera, Check, Flashlight, Keyboard, RefreshCw, RotateCcw, X,
} from 'lucide-react';
import Button from './Button';
import { useToast } from '@/context/ToastContext';
import { scanBeep, errorBeep } from '@/utils/beep';
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

const CONSTRAINT_SETS = [
  {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  },
  { video: { facingMode: { ideal: 'environment' } }, audio: false },
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
  multiScan = false,
  recentLimit = 4,
}) {
  const toast = useToast();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const readerRef = useRef(null);
  const lastScanRef = useRef({ code: null, at: 0 });
  const scannedRef = useRef(false);
  const streamRef = useRef(null);

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
  const [recent, setRecent] = useState([]);
  const [scanCount, setScanCount] = useState(0);

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

  const handleDetected = code => {
    const now = Date.now();
    const last = lastScanRef.current;
    if (last.code === code && now - last.at < 900) return;

    lastScanRef.current = { code, at: now };
    scanBeep();
    setFlash(true);
    setScanCount(c => c + 1);
    setRecent(prev =>
      [{ code, at: now }, ...prev].slice(0, Math.max(1, recentLimit))
    );
    try {
      if (navigator.vibrate) navigator.vibrate(45);
    } catch {
      /* ignore */
    }

    // Fire the caller's onScan (or onManualEntry if supplied)
    try {
      onScan?.(code);
    } catch {
      errorBeep();
    }

    if (multiScan) {
      // Keep scanning; the flash fades on its own
      setTimeout(() => setFlash(false), 180);
      return;
    }

    // Single-scan: close after a moment so the user sees the green flash
    scannedRef.current = true;
    setTimeout(() => {
      stopStream();
      onClose?.();
      setFlash(false);
    }, 280);
  };

  const startScanner = useCallback(async () => {
    if (!open) return;
    stopStream();
    setStatus('starting');
    setError('');
    setDetail('');
    setTorchOn(false);
    scannedRef.current = false;

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (!window.isSecureContext && !isLocalhost) {
      return failWith(
        'Camera access requires HTTPS.',
        `You are on ${window.location.protocol}//${window.location.host}. Open the deployed app on Vercel, or use ngrok for local testing.`
      );
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return failWith(
        'This browser does not support camera access.',
        'Try Chrome, Edge or Safari.'
      );
    }

    let camList = [];
    try {
      camList = await BrowserMultiFormatReader.listVideoInputDevices();
    } catch {
      camList = [];
    }
    setDevices(camList);

    let preflightStream = null;
    let lastConstraintError = null;
    for (const constraints of CONSTRAINT_SETS) {
      try {
        preflightStream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        lastConstraintError = err;
        if (err?.name === 'NotAllowedError') break;
      }
    }

    if (!preflightStream) {
      const name = String(lastConstraintError?.name || '');
      const message = String(lastConstraintError?.message || '');
      if (name === 'NotAllowedError') {
        return failWith(
          'Camera permission was denied.',
          'Tap the lock icon in the address bar → Permissions → set Camera to Allow, then Retry.'
        );
      }
      if (name === 'NotFoundError') {
        return failWith('No camera was found on this device.');
      }
      if (name === 'NotReadableError') {
        return failWith(
          'The camera is in use by another app.',
          'Close WhatsApp, Zoom or the system camera, then Retry.'
        );
      }
      return failWith(
        'Could not start the camera.',
        `Browser reported: ${message || name || 'unknown error'}`
      );
    }

    streamRef.current = preflightStream;
    const video = videoRef.current;
    if (video) {
      video.srcObject = preflightStream;
      try {
        await video.play();
      } catch {
        /* ignore */
      }
    }

    try {
      const track = preflightStream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() || {};
      setHasTorch(!!caps.torch);
    } catch {
      setHasTorch(false);
    }

    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 80,
        delayBetweenScanSuccess: 500,
      });
      readerRef.current = reader;

      const controls = await reader.decodeFromStream(
        preflightStream,
        video,
        result => {
          if (result) handleDetected(result.getText());
        }
      );
      controlsRef.current = controls;
      setStatus('ready');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[barcode] ZXing failed', err);
      return failWith(
        'Camera is running, but the barcode decoder failed to start.',
        'Tap Retry. If it keeps failing, use the manual entry below.'
      );
    }
  }, [open, stopStream]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    startScanner();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const retry = () => {
    setRecent([]);
    setScanCount(0);
    startScanner();
  };

  const toggleTorch = async () => {
    try {
      const track =
        streamRef.current?.getVideoTracks?.()[0] ||
        controlsRef.current?.stream?.getVideoTracks?.()[0];
      if (!track) return;
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
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
        delayBetweenScanAttempts: 80,
        delayBetweenScanSuccess: 500,
      });
      readerRef.current = reader;
      const controls = await reader.decodeFromStream(stream, video, result => {
        if (result) handleDetected(result.getText());
      });
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
      failWith('Could not switch cameras.', String(err?.message || err));
    }
  };

  const submitManual = () => {
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    onManualEntry?.(trimmed);
    if (multiScan) {
      setManualInput('');
      return;
    }
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
          <div className="bsm-subtitle">
            {multiScan
              ? `Scan continuously · ${scanCount} scanned`
              : subtitle}
          </div>
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
        {status === 'ready' && !flash && (
          <div className="bsm-status-pill bsm-status-ready">
            {multiScan
              ? 'Keep scanning — each item is added automatically'
              : 'Point at a barcode — it will scan automatically'}
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
            <Check size={14} /> Added
          </div>
        )}
      </div>

      {multiScan && recent.length > 0 && (
        <div className="bsm-recent" aria-live="polite">
          {recent.map((r, i) => (
            <div key={`${r.code}-${r.at}`} className="bsm-recent-row">
              <Check size={12} />
              <span className="mono">{r.code}</span>
            </div>
          ))}
        </div>
      )}

      <footer className="bsm-foot">
        {multiScan && status === 'ready' ? (
          <Button full size="lg" onClick={onClose} leftIcon={<Check size={16} />}>
            Done scanning ({scanCount})
          </Button>
        ) : manualLabel ? (
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
                Use
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