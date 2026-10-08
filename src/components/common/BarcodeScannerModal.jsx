import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from '@zxing/library';
import {
  Camera, Flashlight, Keyboard, RotateCcw, X,
} from 'lucide-react';
import Button from './Button';
import { useToast } from '@/context/ToastContext';
import './BarcodeScannerModal.css';

/**
 * Formats the reader is allowed to decode.
 * Restricting formats makes decoding faster and less error-prone.
 */
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
 * Full-screen barcode scanner using the device camera.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(code: string) => void} props.onScan   Called with the decoded string
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {string} [props.manualLabel]   If provided, shows a "type it" fallback
 * @param {(code: string) => void} [props.onManualEntry]
 */
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

  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | starting | ready | error
  const [error, setError] = useState('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [beep, setBeep] = useState(null); // 'ok' flash state
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);

  // ---------- Camera lifecycle ----------
  const stopStream = useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {
      // ignore
    }
    controlsRef.current = null;
  }, []);

  const startScanner = useCallback(async () => {
    if (!open) return;
    stopStream();
    setStatus('starting');
    setError('');
    scannedRef.current = false;

    try {
      // Ask for permission + enumerate devices
      const list = await BrowserMultiFormatReader.listVideoInputDevices();
      setDevices(list);

      // Prefer a rear/environment camera on mobile
      const preferred =
        list.find(d => /back|rear|environment/i.test(d.label)) ||
        list[list.length - 1] ||
        list[0];

      const chosenId = deviceId || preferred?.deviceId || undefined;
      setDeviceId(chosenId);

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 150,
        delayBetweenScanSuccess: 800,
      });
      readerRef.current = reader;

      const controls = await reader.decodeFromVideoDevice(
        chosenId,
        videoRef.current,
        (result, err) => {
          if (result && !scannedRef.current) {
            handleDetected(result.getText());
          }
          // Decode errors during scanning are noisy and expected
          // (barcode out of frame, motion blur). Ignore them.
          if (err && err.name && err.name !== 'NotFoundException') {
            // Real error — network, permissions, etc.
          }
        }
      );
      controlsRef.current = controls;

      // Torch support
      try {
        const track = controls.stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() || {};
        setHasTorch(!!caps.torch);
      } catch {
        setHasTorch(false);
      }

      setStatus('ready');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[barcode] start failed', err);
      setStatus('error');
      const message = String(err?.message || err);
      if (/permission|denied|NotAllowed/i.test(message)) {
        setError(
          'Camera access was blocked. Enable camera permissions for this site in your browser settings.'
        );
      } else if (/NotFound|DevicesNotFound/i.test(message)) {
        setError('No camera was found on this device.');
      } else if (/secure|https/i.test(message)) {
        setError(
          'Camera access requires a secure connection (HTTPS or localhost).'
        );
      } else {
        setError('Could not start the camera. Try again or enter the code manually.');
      }
    }
  }, [open, deviceId, stopStream]);

  // Re-run when device changes
  useEffect(() => {
    if (!open) return undefined;
    startScanner();
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deviceId]);

  // Lock body scroll
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
    // De-duplicate rapid repeats of the same code
    if (last.code === code && now - last.at < 1500) return;

    lastScanRef.current = { code, at: now };
    scannedRef.current = true;
    setBeep('ok');
    // Vibrate on supported devices
    try {
      if (navigator.vibrate) navigator.vibrate(80);
    } catch {
      // ignore
    }
    // Short pause so the user sees the green flash
    setTimeout(() => {
      stopStream();
      onScan?.(code);
      onClose?.();
      setBeep(null);
    }, 320);
  };

  const toggleTorch = async () => {
    try {
      const track = controlsRef.current?.stream.getVideoTracks()[0];
      if (!track) return;
      await track.applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(v => !v);
    } catch {
      toast.warning('This camera does not support the torch.');
    }
  };

  const switchCamera = () => {
    if (devices.length < 2) {
      toast.info('Only one camera is available on this device.');
      return;
    }
    const idx = devices.findIndex(d => d.deviceId === deviceId);
    const next = devices[(idx + 1) % devices.length];
    setTorchOn(false);
    setDeviceId(next.deviceId);
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
      {/* Video stream */}
      <video
        ref={videoRef}
        className={`bsm-video ${beep === 'ok' ? 'bsm-video-ok' : ''}`}
        playsInline
        muted
        autoPlay
      />

      {/* Overlay */}
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

      {/* Top bar */}
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

      {/* Status message + errors */}
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
          <div className="bsm-error">{error}</div>
        )}
        {beep === 'ok' && (
          <div className="bsm-status-pill bsm-status-ok">
            Barcode detected
          </div>
        )}
      </div>

      {/* Bottom bar */}
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