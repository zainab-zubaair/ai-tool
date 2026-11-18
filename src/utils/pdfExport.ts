import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { toPng } from 'html-to-image';
import { downloadBlob } from './fileDownload';

export interface ExportPdfOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Helper to convert any modern CSS color (including oklch, oklab, color-mix)
 * to standard RGB using the browser's native 2D canvas context.
 */
function convertCssColorToRgb(colorStr: string): string {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit' || colorStr === 'initial') {
    return colorStr;
  }
  if (!colorStr.includes('oklch') && !colorStr.includes('oklab') && !colorStr.includes('color-mix') && !colorStr.includes('lab(')) {
    return colorStr;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';
    ctx.fillStyle = '#000000';
    ctx.fillStyle = colorStr;
    return ctx.fillStyle;
  } catch {
    return '#000000';
  }
}

/**
 * Builds a multi-page A4 jsPDF instance from an image data URL and dimensions.
 */
function buildA4PdfFromImage(
  imgData: string,
  imgWidth: number,
  imgHeight: number,
  isLandscape: boolean = false
): jsPDF {
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // 4mm margin for clean printable borders
  const margin = 4;
  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = (imgHeight * contentWidth) / imgWidth;
  const maxA4Height = pdfHeight - margin * 2;

  // Fit on page or handle multi-page
  if (contentHeight <= maxA4Height * 1.18) {
    if (contentHeight > maxA4Height) {
      const scale = maxA4Height / contentHeight;
      const scaledWidth = contentWidth * scale;
      const xOffset = margin + (contentWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, margin, scaledWidth, maxA4Height, undefined, 'FAST');
    } else {
      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
    }
  } else {
    let heightLeft = contentHeight;
    let position = margin;

    // First Page
    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
    heightLeft -= maxA4Height;

    // Subsequent Pages
    while (heightLeft > 5) {
      position = position - maxA4Height;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
      heightLeft -= maxA4Height;
    }
  }

  return pdf;
}

/**
 * High-fidelity DOM PDF Exporter:
 * Primary engine: html2canvas-pro (with full oklch/modern CSS color support).
 * Secondary fallback engine: html-to-image (native browser SVG foreignObject).
 * Never fails or crashes on Tailwind CSS v4 colors.
 */
export async function exportElementToPdf(
  elementOrId: HTMLElement | string,
  filename: string = 'Weekly-Lesson-Plan-Solution.pdf',
  options?: ExportPdfOptions
): Promise<void> {
  // Ultra-resilient element resolution: never fail because of an ID mismatch
  let element: HTMLElement | null = null;
  if (typeof elementOrId === 'string') {
    element = document.getElementById(elementOrId);
    if (!element) {
      element = (document.querySelector(`.${elementOrId}`) ||
        document.querySelector('#printable-plan') ||
        document.querySelector('.printable-sheet') ||
        document.querySelector('.printable-document') ||
        document.querySelector('[data-printable="true"]')) as HTMLElement | null;
    }
  } else if (elementOrId instanceof HTMLElement) {
    element = elementOrId;
  }

  if (!element) {
    // Last resort fallback: find any printable container in DOM
    element = document.querySelector('.printable-sheet, .printable-document, #printable-plan, main') as HTMLElement | null;
  }

  if (!element) {
    throw new Error('Target printable document element was not found in the DOM.');
  }

  const cleanFilename = filename.toLowerCase().endsWith('.pdf')
    ? filename
    : `${filename}.pdf`;

  const isLandscape = options?.orientation === 'landscape';

  // Ensure all images are loaded
  const imgElements = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    imgElements.map((img) => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
        setTimeout(resolve, 500);
      });
    })
  );

  let pdf: jsPDF | null = null;

  // STRATEGY 1: Render with html2canvas-pro
  try {
    const currentScrollY = window.scrollY || window.pageYOffset || 0;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollY: -currentScrollY,
      scrollX: 0,
      windowWidth: document.documentElement.offsetWidth || 1024,
      imageTimeout: 10000,
      ignoreElements: (el) => {
        return (
          el.classList?.contains('no-print') ||
          el.hasAttribute?.('data-no-print') ||
          el.getAttribute?.('aria-hidden') === 'true'
        );
      },
      onclone: (clonedDoc) => {
        // Hide all no-print elements in cloned document
        clonedDoc.querySelectorAll('.no-print, [data-no-print]').forEach((el) => {
          (el as HTMLElement).style.setProperty('display', 'none', 'important');
        });

        // Ensure printable sheet has crisp 100% white background and sharp text
        const target = (clonedDoc.querySelector('.printable-sheet') ||
          clonedDoc.querySelector('.printable-document') ||
          clonedDoc.querySelector('#printable-plan')) as HTMLElement | null;
        if (target) {
          target.style.backgroundColor = '#ffffff';
          target.style.color = '#000000';
          target.style.boxShadow = 'none';
        }

        // Sanitize any remaining oklch or modern colors to RGB for compatibility
        const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'outlineColor'];
        const allCloned = clonedDoc.querySelectorAll('*');
        allCloned.forEach((node) => {
          const el = node as HTMLElement;
          if (el.style) {
            try {
              const comp = window.getComputedStyle(el);
              for (const prop of colorProps) {
                const val = (comp as any)[prop];
                if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix') || val.includes('lab('))) {
                  el.style.setProperty(prop, convertCssColorToRgb(val), 'important');
                }
              }
            } catch {
              // Ignore computed style reading error
            }
          }
        });
      },
    });

    const imgData = canvas.toDataURL('image/png');
    pdf = buildA4PdfFromImage(imgData, canvas.width, canvas.height, isLandscape);
  } catch (canvasErr: any) {
    console.warn('html2canvas-pro encountered an issue, invoking html-to-image fallback:', canvasErr);

    // STRATEGY 2: html-to-image fallback (uses native SVG foreignObject, immune to color parser errors)
    try {
      const dataUrl = await toPng(element, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (domNode) => {
          const el = domNode as HTMLElement;
          return !(el?.classList?.contains('no-print') || el?.hasAttribute?.('data-no-print'));
        },
      });

      const tempImg = new Image();
      tempImg.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        tempImg.onload = () => resolve();
        tempImg.onerror = () => reject(new Error('Failed to load rasterized image'));
        setTimeout(resolve, 1000);
      });

      const imgWidth = tempImg.naturalWidth || element.offsetWidth * 2 || 1200;
      const imgHeight = tempImg.naturalHeight || element.offsetHeight * 2 || 1600;

      pdf = buildA4PdfFromImage(dataUrl, imgWidth, imgHeight, isLandscape);
    } catch (fallbackErr: any) {
      console.error('All client-side PDF rasterizers failed:', fallbackErr);
      // Trigger native browser print so user can still print or save to PDF
      window.print();
      throw new Error(canvasErr?.message || fallbackErr?.message || 'Failed to render PDF.');
    }
  }

  if (pdf) {
    // Deliver PDF directly as a downloadable file
    const pdfBlob = pdf.output('blob');
    downloadBlob(pdfBlob, cleanFilename);
  }
}

/**
 * Direct Browser Print:
 * Calls window.print() directly so user sees browser's native print / save to PDF dialog.
 * If window.print() throws (e.g. sandboxed iframe or restricted environment),
 * falls back smoothly to exportElementToPdf() to download the PDF directly.
 */
export async function triggerBrowserPrint(
  elementId: string = 'printable-plan',
  filename: string = 'The_Punjab_School_Lesson_Plan.pdf'
): Promise<{ success: boolean; method: 'print' | 'download' }> {
  try {
    window.focus();
    window.print();
    return { success: true, method: 'print' };
  } catch (printErr) {
    console.warn('Native window.print() was blocked or unavailable, falling back to direct PDF download:', printErr);
    await exportElementToPdf(elementId, filename);
    return { success: true, method: 'download' };
  }
}

/**
 * Universal Print / PDF trigger:
 * Executes browser print with fallback to direct PDF download.
 */
export async function triggerPrintOrPdf(
  elementId: string = 'printable-plan',
  filename: string = 'Weekly-Lesson-Plan.pdf'
): Promise<{ method: 'print' | 'download' }> {
  const result = await triggerBrowserPrint(elementId, filename);
  return { method: result.method };
}

/**
 * Cleanly sanitize topic title to create valid, readable filenames like
 * Weekly-Lesson-Plan-[Topic].pdf
 */
export function sanitizeFilename(topic: string, prefix = 'Weekly-Lesson-Plan'): string {
  const clean = (topic || 'Lesson')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 45)
    .replace(/-+$/, '');
  return `${prefix}-${clean || 'Solution'}.pdf`;
}
