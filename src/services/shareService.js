/**
 * Share service — wraps the Web Share API.
 *
 * Web Share Level 2 supports sharing files, which lets us send the
 * actual PDF invoice via WhatsApp (or email, AirDrop, etc.) on Android
 * and iOS. Desktop Safari and Edge support text-only sharing. We fall
 * back to downloading the PDF + opening WhatsApp Web when file sharing
 * isn't available.
 *
 * All methods resolve with { ok, mode } — never throw.
 */

class ShareService {
  isSupported() {
    if (typeof navigator === 'undefined') return false;
    return typeof navigator.share === 'function';
  }

  canShareFiles() {
    if (!this.isSupported()) return false;
    return typeof navigator.canShare === 'function';
  }

  /**
   * Attempt to share a file. Returns true if the share sheet was used,
   * false if the browser can't share files.
   */
  async tryShareFile({ blob, filename, title, text }) {
    if (!this.canShareFiles()) return { ok: false, mode: 'unsupported' };

    let file;
    try {
      file = new File([blob], filename, {
        type: blob.type || 'application/pdf',
      });
    } catch {
      return { ok: false, mode: 'file-creation-failed' };
    }

    let canShare = false;
    try {
      canShare = navigator.canShare({ files: [file] });
    } catch {
      canShare = false;
    }
    if (!canShare) return { ok: false, mode: 'files-not-shareable' };

    try {
      await navigator.share({
        files: [file],
        title: title || filename,
        text: text || '',
      });
      return { ok: true, mode: 'files+text' };
    } catch (err) {
      // User cancelled — the browser throws an AbortError. Treat
      // this as a soft failure so we don't fall back to a download.
      if (err?.name === 'AbortError') {
        return { ok: true, mode: 'cancelled' };
      }
      return { ok: false, mode: err?.name || 'share-failed' };
    }
  }

  /**
   * Share plain text. Works on all platforms that support Web Share.
   */
  async tryShareText({ title, text }) {
    if (!this.isSupported()) return { ok: false, mode: 'unsupported' };
    try {
      await navigator.share({ title, text });
      return { ok: true, mode: 'text' };
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: true, mode: 'cancelled' };
      return { ok: false, mode: err?.name || 'share-failed' };
    }
  }

  /**
   * Downloads a blob as a file. Used as a fallback.
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }
}

export const shareService = new ShareService();