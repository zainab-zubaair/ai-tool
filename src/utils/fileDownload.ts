/**
 * Bulletproof file download utility for browser environments,
 * including sandboxed iframes and mobile webviews.
 */

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;
  anchor.setAttribute('download', filename);

  // Must append to DOM to work reliably across Firefox, Safari, and sandboxed iframes
  document.body.appendChild(anchor);
  
  try {
    anchor.click();
  } catch (err) {
    console.warn('Direct anchor click failed, attempting dispatchEvent:', err);
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    anchor.dispatchEvent(clickEvent);
  }

  // Clean up with delay to avoid cancelling ongoing browser downloads
  setTimeout(() => {
    try {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      URL.revokeObjectURL(url);
    } catch {
      // Ignored
    }
  }, 2000);
}

export function downloadTextAsFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}
