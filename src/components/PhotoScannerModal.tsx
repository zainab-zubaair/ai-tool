import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Camera,
  Sparkles,
  Check,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Smartphone,
  RotateCcw,
  Volume2,
  VolumeX,
  Info,
  HelpCircle,
  ShieldCheck,
  Settings,
  Lock,
  Monitor,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { GradeLevel, SubjectType } from '../types';

export type ScannerTab = 'camera' | 'mobile' | 'upload';

export interface CameraDiagnostic {
  code: 'NotAllowedError' | 'NotFoundError' | 'NotReadableError' | 'OverconstrainedError' | 'Unsupported' | 'Generic';
  title: string;
  summary: string;
  reasons: string[];
  actionLabel: string;
  suggestedAction: 'upload' | 'mobile';
  rawError?: string;
}

interface PhotoScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: ScannerTab;
  onApplyToPlanner: (data: {
    topic: string;
    grade?: GradeLevel;
    subject?: SubjectType;
    textbookInfo?: string;
    additionalNotes?: string;
    imageBase64?: string;
    imageMimeType?: string;
  }) => void;
}

export const PhotoScannerModal: React.FC<PhotoScannerModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'camera',
  onApplyToPlanner,
}) => {
  const [activeTab, setActiveTab] = useState<ScannerTab>(initialMode);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDiagnostic, setCameraDiagnostic] = useState<CameraDiagnostic | null>(null);
  const [showCameraHelp, setShowCameraHelp] = useState(false);
  const [helpPlatformTab, setHelpPlatformTab] = useState<'chrome' | 'android' | 'safari' | 'os' | 'iframe'>('chrome');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping camera track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Synthesize camera shutter audio
  const playShutterSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio playback failed or blocked; non-critical
    }
  }, [soundEnabled]);

  // Helpers to switch mode to upload or mobile
  const handleSwitchToUpload = useCallback((triggerPicker = false) => {
    stopCameraStream();
    setActiveTab('upload');
    setError(null);
    setCameraError(null);
    if (triggerPicker) {
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 60);
    }
  }, [stopCameraStream]);

  const handleSwitchToMobile = useCallback((triggerCamera = false) => {
    stopCameraStream();
    setActiveTab('mobile');
    setError(null);
    setCameraError(null);
    if (triggerCamera) {
      setTimeout(() => {
        mobileInputRef.current?.click();
      }, 60);
    }
  }, [stopCameraStream]);

  // Start device live camera with comprehensive diagnostics
  const startCamera = useCallback(async (desiredFacing: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    setCameraLoading(true);
    setCameraError(null);
    setCameraDiagnostic(null);

    // Check if browser supports mediaDevices
    if (!navigator?.mediaDevices?.getUserMedia) {
      const diag: CameraDiagnostic = {
        code: 'Unsupported',
        title: 'Live Camera API Not Supported in this Context',
        summary: 'Your current browser or iframe environment does not allow real-time MediaDevices video streaming.',
        reasons: [
          'The application is running inside a secure preview iframe with camera delegation restrictions',
          'Page is served in a restricted sandbox or insecure context without WebRTC access',
          'Browser is missing HTML5 MediaDevices support'
        ],
        actionLabel: 'Switch to File Upload',
        suggestedAction: 'upload',
      };
      setCameraDiagnostic(diag);
      setCameraError('Live camera streaming is not supported in this browser or iframe environment.');
      setCameraLoading(false);
      return;
    }

    try {
      // Check available video devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        // Enumerate error, ignore
      }

      // Constraints: prefer rear camera ('environment') for scanning documents/textbooks
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: desiredFacing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        // If constraint error, try fallback to basic video constraint { video: true }
        if (
          firstErr.name === 'OverconstrainedError' ||
          firstErr.name === 'ConstraintNotSatisfiedError' ||
          firstErr.name === 'TypeError'
        ) {
          console.warn('Fallback to basic video constraint:', firstErr);
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          // Rethrow NotAllowedError, NotFoundError, NotReadableError to diagnostic catcher
          throw firstErr;
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setCameraError(null);
      setCameraDiagnostic(null);
    } catch (err: any) {
      console.error('Camera access diagnostic check caught error:', err);
      const errorName = err.name || 'Error';
      let diag: CameraDiagnostic;

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorName === 'SecurityError') {
        diag = {
          code: 'NotAllowedError',
          title: 'Camera Permission Denied or Restricted',
          summary: 'Camera hardware access was blocked. Even if permission is granted in browser settings, access can be restricted by iframe sandbox security, Windows/macOS camera privacy toggles, or antivirus webcam protection.',
          reasons: [
            'Browser site permission: Camera may be set to "Block" for this domain or address bar.',
            'Embedded iframe sandbox: Embedded preview environments restrict raw live webcam streams by browser security policy even when site permissions show "Allowed".',
            'Operating system privacy: Windows 10/11 ("Camera privacy settings") or macOS ("System Settings > Privacy & Security > Camera") has camera toggled OFF for this browser.',
            'Physical privacy shutter: Check if your laptop has a webcam slider or keyboard mute button (F8 / F10 / Fn).'
          ],
          actionLabel: 'Switch to File Upload',
          suggestedAction: 'upload',
          rawError: `${err.name}: ${err.message || 'Permission denied'}`
        };
        setCameraError('Camera permission was denied or restricted. Switch to File Upload or use Native Camera.');
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        diag = {
          code: 'NotFoundError',
          title: 'No Camera Device Detected',
          summary: 'No active webcam or video capture hardware was detected on this computer or device.',
          reasons: [
            'No physical webcam is connected or built into this computer',
            'Webcam hardware is disconnected, disabled in Device Manager/BIOS, or missing drivers',
            'If you are on a desktop PC, plug in an external webcam or use the "Device Camera" / "Upload File" tab'
          ],
          actionLabel: 'Switch to File Upload',
          suggestedAction: 'upload',
          rawError: `${err.name}: ${err.message || 'No video input devices found'}`
        };
        setCameraError('No camera device found on this system. Please use File Upload or Browse Files.');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        diag = {
          code: 'NotReadableError',
          title: 'Camera Already In Use or Busy',
          summary: 'The camera is currently locked or in use by another software program or browser tab.',
          reasons: [
            'Another video calling program (Zoom, MS Teams, Google Meet, Skype, Discord, OBS) is holding the camera feed',
            'Another open browser tab or window has an active video stream',
            'Webcam driver is temporarily stalled; closing other camera apps or restarting the browser resolves this'
          ],
          actionLabel: 'Switch to File Upload',
          suggestedAction: 'upload',
          rawError: `${err.name}: ${err.message || 'Camera hardware is busy'}`
        };
        setCameraError('Camera is already in use by another application. Please close other camera tabs.');
      } else if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
        diag = {
          code: 'OverconstrainedError',
          title: 'Camera Resolution / Lens Mode Not Supported',
          summary: 'Your camera hardware could not satisfy the requested resolution or lens facing mode.',
          reasons: [
            'The device lacks an environmental/rear camera',
            'Requested video resolution exceeds hardware sensor limits'
          ],
          actionLabel: 'Switch to File Upload',
          suggestedAction: 'upload',
          rawError: `${err.name}: ${err.message}`
        };
        setCameraError('Camera constraints could not be satisfied by hardware.');
      } else {
        diag = {
          code: 'Generic',
          title: 'Unable to Connect to Camera',
          summary: err.message || 'An unexpected error occurred while communicating with camera hardware.',
          reasons: [
            'Browser driver or hardware communication failure',
            'Iframe security sandbox restriction'
          ],
          actionLabel: 'Switch to File Upload',
          suggestedAction: 'upload',
          rawError: `${err.name || 'Error'}: ${err.message || 'Unknown error'}`
        };
        setCameraError(err.message || 'Could not access camera.');
      }

      setCameraDiagnostic(diag);
      setIsCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  }, [facingMode, stopCameraStream]);

  // Flip camera between rear and front
  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Fast client-side image compressor: scales down multi-megabyte photos to ~180KB for 10x faster AI processing
  const compressImage = async (fileOrDataUrl: File | string): Promise<{ dataUrl: string; base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 1280;
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        tempCtx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.82);
        const base64 = compressedDataUrl.split(',')[1];
        resolve({ dataUrl: compressedDataUrl, base64, mimeType: 'image/jpeg' });
      };
      img.onerror = (e) => reject(e);

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          img.src = reader.result as string;
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(fileOrDataUrl);
      }
    });
  };

  // Capture frame from video feed
  const handleCaptureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Audio shutter effect & visual flash
    playShutterSound();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    try {
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const compressed = await compressImage(rawDataUrl);
      setImagePreview(compressed.dataUrl);
      setImageBase64(compressed.base64);
      setImageMimeType('image/jpeg');
      setError(null);

      // Stop camera stream after capture
      stopCameraStream();
    } catch (err: any) {
      setError('Failed to capture frame from camera: ' + err.message);
    }
  };

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setError(null);
      setAnalysisResult(null);
      if (initialMode === 'camera' && !imagePreview) {
        startCamera('environment');
      }
    } else {
      stopCameraStream();
      setImagePreview(null);
      setImageBase64(null);
      setImageMimeType(null);
      setAnalysisResult(null);
    }
  }, [isOpen, initialMode, startCamera, stopCameraStream]);

  // Handle switching tabs
  const handleTabChange = (tab: ScannerTab) => {
    setActiveTab(tab);
    setError(null);
    if (tab === 'camera' && !imagePreview && !isCameraActive) {
      startCamera(facingMode);
    } else if (tab !== 'camera') {
      stopCameraStream();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    setError(null);

    try {
      const compressed = await compressImage(file);
      setImagePreview(compressed.dataUrl);
      setImageBase64(compressed.base64);
      setImageMimeType('image/jpeg');
      stopCameraStream();
    } catch (err: any) {
      setError('Failed to optimize image: ' + (err.message || 'Unknown error'));
    }
  };

  const handleRetake = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    setAnalysisResult(null);
    setError(null);
    if (activeTab === 'camera') {
      startCamera(facingMode);
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64 || !imageMimeType) {
      setError('Please capture or upload a textbook/notes photo first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/analyze-page-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          imageMimeType,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze page photo.');
      }
      setAnalysisResult(data.analysis);
    } catch (err: any) {
      setError(err.message || 'Error communicating with AI vision analyzer.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!analysisResult) return;
    const textbookParts = [];
    if (analysisResult.visiblePageNumber) {
      textbookParts.push(`Page ${analysisResult.visiblePageNumber}`);
    }
    if (analysisResult.visibleExerciseNumber) {
      textbookParts.push(`Exercise ${analysisResult.visibleExerciseNumber}`);
    }

    onApplyToPlanner({
      topic: analysisResult.detectedTopic || 'Analyzed Topic',
      textbookInfo: textbookParts.length > 0 ? textbookParts.join(', ') : undefined,
      additionalNotes: `Key concepts visible on scanned page: ${analysisResult.keyConceptsOnPage?.join(', ') || ''}. ${analysisResult.summaryOfContent || ''}`,
      imageBase64: imageBase64 || undefined,
      imageMimeType: imageMimeType || undefined,
    });
    stopCameraStream();
    onClose();
  };

  const handleModalClose = () => {
    stopCameraStream();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Camera className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">Punjab Textbook & Notes Scanner</h3>
              <p className="text-xs text-emerald-200">
                Live camera capture & multimodal AI extraction of SLOs, headings & diagrams
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCameraHelp(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all shadow-xs"
              title="Camera permissions verification guide & FAQ"
            >
              <HelpCircle className="h-4 w-4 text-emerald-300" />
              <span className="hidden sm:inline">Camera Setup & FAQ</span>
              <span className="sm:hidden">Help</span>
            </button>
            <button
              onClick={handleModalClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs (Visible when no photo captured yet) */}
        {!imagePreview && (
          <div className="bg-slate-100 border-b border-slate-200 px-4 pt-3 flex gap-2 overflow-x-auto">
            <button
              onClick={() => handleTabChange('camera')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'camera'
                  ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <Camera className="h-4 w-4 text-emerald-600" />
              <span>Live Camera</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold ml-1">
                Webcam
              </span>
            </button>

            <button
              onClick={() => handleTabChange('mobile')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'mobile'
                  ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <Smartphone className="h-4 w-4 text-teal-600" />
              <span>Mobile Camera App</span>
            </button>

            <button
              onClick={() => handleTabChange('upload')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'upload'
                  ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
              }`}
            >
              <Upload className="h-4 w-4 text-slate-600" />
              <span>Upload / Gallery</span>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Rules Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Punjab Textbook Accuracy Rule: </span>
              Textbook page numbers and exercise numbers are strictly extracted only if clearly visible in the photo. Nothing is fabricated.
            </div>
          </div>

          {/* Hidden Canvas for Capturing Frame */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          {/* Mobile Camera Input with capture="environment" for rear camera */}
          <input
            type="file"
            ref={mobileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* TAB 1: LIVE CAMERA VIEW */}
          {!imagePreview && activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 sm:aspect-16/10 flex items-center justify-center border-2 border-slate-800 shadow-inner group">
                {/* Visual Camera Flash Animation */}
                {isFlashing && (
                  <div className="absolute inset-0 bg-white z-30 transition-opacity duration-200 pointer-events-none" />
                )}

                {/* Video Stream Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                />

                {/* Viewfinder Overlay Guides */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 sm:p-8">
                    {/* Top Guide Bar */}
                    <div className="flex justify-between items-center text-white/90 drop-shadow-md">
                      <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold border border-white/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Live Document Scanner</span>
                      </div>
                      <div className="text-[11px] bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-slate-200 border border-white/20">
                        {facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'}
                      </div>
                    </div>

                    {/* Document Framing Brackets */}
                    <div className="relative flex-1 my-3 border border-dashed border-white/40 rounded-xl flex items-center justify-center">
                      {/* Top-Left Bracket */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg" />
                      {/* Top-Right Bracket */}
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg" />
                      {/* Bottom-Left Bracket */}
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg" />
                      {/* Bottom-Right Bracket */}
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-lg" />

                      <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white/90 text-xs font-medium text-center max-w-xs shadow-lg">
                        Position Punjab textbook page, chapter heading, or diagram inside frame
                      </div>
                    </div>

                    {/* Bottom Helper */}
                    <div className="text-center text-[10px] text-white/70 bg-black/40 backdrop-blur-xs py-0.5 rounded">
                      Hold still for sharp text & Urdu Nastaliq extraction
                    </div>
                  </div>
                )}

                {/* Camera Inactive / Loading / Error State */}
                {!isCameraActive && (
                  <div className="p-6 text-center text-slate-300 space-y-3 z-20 max-w-md">
                    {cameraLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Sparkles className="h-8 w-8 text-emerald-400 animate-spin" />
                        <p className="text-sm font-semibold">Initializing camera stream...</p>
                        <p className="text-xs text-slate-400">Please allow camera permissions if prompted</p>
                      </div>
                    ) : (cameraDiagnostic || cameraError) ? (
                      <div className="space-y-3 w-full text-left">
                        {/* Diagnostic Alert Card */}
                        <div className="p-3.5 sm:p-4 bg-slate-900/95 border border-rose-500/40 rounded-xl text-slate-200 text-xs shadow-xl backdrop-blur-xs">
                          {/* Diagnostic Badge & Help Link */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                                cameraDiagnostic?.code === 'NotAllowedError'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : cameraDiagnostic?.code === 'NotFoundError'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : cameraDiagnostic?.code === 'NotReadableError'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              Diagnostic: {cameraDiagnostic?.code || 'CameraError'}
                            </span>

                            <button
                              type="button"
                              onClick={() => setShowCameraHelp(true)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold underline underline-offset-2"
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                              <span>Permission Setup Guide</span>
                            </button>
                          </div>

                          <h5 className="font-bold text-sm text-white flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                            <span>{cameraDiagnostic?.title || 'Camera Access Notice'}</span>
                          </h5>

                          <p className="text-slate-300 mt-1 leading-relaxed text-xs">
                            {cameraDiagnostic?.summary || cameraError}
                          </p>

                          {/* Diagnostic Checklist */}
                          {cameraDiagnostic?.reasons && cameraDiagnostic.reasons.length > 0 && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-800">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Info className="h-3 w-3 text-emerald-400" />
                                <span>Diagnostic Inspection Checklist:</span>
                              </p>
                              <ul className="space-y-1 text-[11px] text-slate-300">
                                {cameraDiagnostic.reasons.map((reason, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-emerald-400 font-bold leading-none mt-0.5">•</span>
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {cameraDiagnostic?.rawError && (
                            <p className="mt-2 text-[10px] font-mono text-slate-500 truncate">
                              System API response: {cameraDiagnostic.rawError}
                            </p>
                          )}
                        </div>

                        {/* Fallback Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          {/* PRIMARY: Contextual button to toggle input mode to 'file upload' as fallback */}
                          <button
                            type="button"
                            onClick={() => handleSwitchToUpload(true)}
                            className="flex-1 py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                          >
                            <Upload className="h-4 w-4" />
                            <span>Switch to File Upload</span>
                          </button>

                          {/* Secondary: Device Camera App */}
                          <button
                            type="button"
                            onClick={() => handleSwitchToMobile(true)}
                            className="flex-1 py-2.5 px-3.5 bg-teal-700 hover:bg-teal-600 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                          >
                            <Smartphone className="h-4 w-4" />
                            <span>Device Camera App</span>
                          </button>
                        </div>

                        {/* Guide & Retry Row */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowCameraHelp(true)}
                            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium py-1 px-1.5 rounded transition-colors"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                            <span>How to fix permissions in settings</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => startCamera(facingMode)}
                            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white py-1 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors font-medium"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Retry Camera</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-4 bg-emerald-950/60 rounded-full inline-block border border-emerald-500/30">
                          <Camera className="h-8 w-8 text-emerald-400" />
                        </div>
                        <h4 className="font-bold text-white text-sm">Camera Ready to Scan</h4>
                        <p className="text-xs text-slate-400">
                          Click below to start your device camera and scan textbook pages in real-time.
                        </p>
                        <button
                          onClick={() => startCamera(facingMode)}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 mx-auto"
                        >
                          <Camera className="h-4 w-4" />
                          <span>Start Live Camera</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live Camera Bottom Action Bar */}
              {isCameraActive && (
                <div className="bg-slate-900 rounded-xl p-3 flex items-center justify-between text-white border border-slate-800">
                  {/* Left Controls: Flip Camera / Sound */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFlipCamera}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                      title="Switch between front and back camera"
                    >
                      <RefreshCw className="h-4 w-4 text-emerald-400" />
                      <span className="hidden sm:inline">Flip Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      title={soundEnabled ? 'Mute shutter click sound' : 'Enable shutter click sound'}
                    >
                      {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
                    </button>
                  </div>

                  {/* Center: Prominent Shutter Button */}
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleCaptureFromCamera}
                      className="group relative flex items-center justify-center p-1 rounded-full bg-white/20 hover:bg-white/30 transition-all focus:outline-none"
                      title="Capture Photo Now"
                    >
                      <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 flex items-center justify-center shadow-lg transition-transform border-4 border-white">
                        <Camera className="h-6 w-6 text-emerald-950" />
                      </div>
                      <span className="sr-only">Capture Photo</span>
                    </button>
                  </div>

                  {/* Right Controls: Stop Camera / Direct Mobile App */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={stopCameraStream}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium border border-slate-700"
                    >
                      Pause
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEVICE CAMERA / MOBILE APP */}
          {!imagePreview && activeTab === 'mobile' && (
            <div className="border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-2xl p-6 sm:p-8 text-center bg-teal-50/40 transition-all flex flex-col items-center justify-center space-y-3">
              <div className="p-4 bg-teal-100 text-teal-800 rounded-full shadow-xs">
                <Smartphone className="h-8 w-8" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                Device Camera & Document Scanner
              </h4>
              <p className="text-xs text-slate-600 max-w-sm">
                Access your smartphone, tablet, or laptop camera directly with hardware autofocus and high-resolution capture.
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 w-full max-w-md justify-center">
                {/* 1. Snap Photo with Native Camera (capture="environment") */}
                <label
                  className="cursor-pointer px-4 py-3 bg-teal-700 hover:bg-teal-600 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all flex-1"
                >
                  <Camera className="h-4 w-4 text-teal-200" />
                  <span>Snap with Device Camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>

                {/* 2. Browse Local Photos / Gallery (Works 100% on desktop & mobile) */}
                <label
                  className="cursor-pointer px-4 py-3 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all flex-1"
                >
                  <Upload className="h-4 w-4 text-slate-300" />
                  <span>Browse Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
              </div>

              <p className="text-[11px] text-teal-800/80 pt-1">
                Works across all phones, tablets, and computers without live WebRTC permission limits.
              </p>
            </div>
          )}

          {/* TAB 3: FILE UPLOAD / BROWSE */}
          {!imagePreview && activeTab === 'upload' && (
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 sm:p-8 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center space-y-3">
              <div className="p-4 bg-emerald-100 text-emerald-800 rounded-full shadow-xs">
                <Upload className="h-8 w-8" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                Upload Textbook Page or Notes Photo
              </h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Select an existing photo, scanned page, or diagram from your device (PNG, JPG, WEBP).
              </p>
              
              <label
                className="cursor-pointer mt-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-600 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all"
              >
                <Upload className="h-4 w-4" />
                <span>Choose Image File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>
          )}

          {/* PREVIEW OF CAPTURED / UPLOADED IMAGE */}
          {imagePreview && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 max-h-72 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Captured textbook preview"
                  className="max-h-72 w-full object-contain"
                />
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={handleRetake}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold backdrop-blur-xs shadow-md border border-white/20 transition-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                    <span>Retake / Change</span>
                  </button>
                </div>

                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white/90 text-[11px] px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Photo Ready for AI Inspection</span>
                </div>
              </div>

              {!analysisResult && (
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin text-emerald-300" />
                      Analyzing Textbook Page with Gemini Multimodal AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-emerald-300" />
                      Inspect Page & Extract Lesson Parameters
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Analysis Results Display */}
          {analysisResult && (
            <div className="bg-slate-50 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <span className="font-bold text-sm text-slate-800">Page Successfully Analyzed</span>
                </div>
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Verified PTB Content
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Detected Topic</span>
                  <span className="font-bold text-slate-900">{analysisResult.detectedTopic || 'N/A'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Subject / Level</span>
                  <span className="font-bold text-slate-900">
                    {analysisResult.detectedSubject || 'General'} ({analysisResult.detectedClassLevel || 'Standard'})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Visible Page Number</span>
                  <span className="font-semibold text-slate-800">
                    {analysisResult.visiblePageNumber ? `Page ${analysisResult.visiblePageNumber}` : 'Not visible in photo'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Visible Exercise Number</span>
                  <span className="font-semibold text-slate-800">
                    {analysisResult.visibleExerciseNumber ? `Exercise ${analysisResult.visibleExerciseNumber}` : 'Not visible in photo'}
                  </span>
                </div>
              </div>

              {analysisResult.summaryOfContent && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase mb-1">Page Summary</span>
                  <p className="text-slate-700 leading-relaxed">{analysisResult.summaryOfContent}</p>
                </div>
              )}

              {analysisResult.keyConceptsOnPage && analysisResult.keyConceptsOnPage.length > 0 && (
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase mb-1">Key Concepts</span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.keyConceptsOnPage.map((concept: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] rounded-md font-medium"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleApply}
                className="w-full mt-2 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Apply to Lesson Planner & Generate PTB Plan</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span>Camera stream stays local; only final photo is analyzed.</span>
          </div>
          <button
            onClick={handleModalClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* CAMERA SETUP & PERMISSIONS FAQ MODAL */}
        {showCameraHelp && (
          <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in duration-150">
              {/* FAQ Header */}
              <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold">Camera Setup & Permission Guide</h4>
                    <p className="text-xs text-emerald-200">
                      Step-by-step verification to enable camera hardware in your browser
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCameraHelp(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Platform Filter Tabs */}
              <div className="bg-slate-100 border-b border-slate-200 px-3 pt-2 flex gap-1 overflow-x-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHelpPlatformTab('chrome')}
                  className={`px-3 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    helpPlatformTab === 'chrome'
                      ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 border-transparent'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Chrome / Edge</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHelpPlatformTab('android')}
                  className={`px-3 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    helpPlatformTab === 'android'
                      ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 border-transparent'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHelpPlatformTab('safari')}
                  className={`px-3 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    helpPlatformTab === 'safari'
                      ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 border-transparent'
                  }`}
                >
                  <span>🍏 Safari</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHelpPlatformTab('os')}
                  className={`px-3 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    helpPlatformTab === 'os'
                      ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 border-transparent'
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Windows & Mac OS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHelpPlatformTab('iframe')}
                  className={`px-3 py-2 rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                    helpPlatformTab === 'iframe'
                      ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 border-transparent'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span>Sandbox FAQ</span>
                </button>
              </div>

              {/* FAQ Content */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
                {/* TAB: CHROME / EDGE */}
                {helpPlatformTab === 'chrome' && (
                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-emerald-600" />
                      <span>Verifying Permissions in Google Chrome & Microsoft Edge</span>
                    </h5>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                          1
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">Check the Address Bar Lock Icon</p>
                          <p className="text-slate-600 mt-0.5">
                            Look at the URL address bar at the very top of your browser window. Click the{' '}
                            <strong className="text-slate-900 inline-flex items-center gap-1">
                              <Lock className="h-3 w-3 inline text-emerald-700" /> Lock or Tune icon
                            </strong>{' '}
                            located immediately to the left of the website URL.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                          2
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">Set "Camera" to Allow</p>
                          <p className="text-slate-600 mt-0.5">
                            In the popup menu, locate <span className="font-semibold text-slate-800">Camera</span>. If it is set to "Block" or "Ask", change the toggle or dropdown to{' '}
                            <span className="font-bold text-emerald-700">"Allow"</span>.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                          3
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">Check for Red Blocked Icon on the Right</p>
                          <p className="text-slate-600 mt-0.5">
                            If there is a video camera icon with a red "x" in the right side of the address bar, click it, select{' '}
                            <span className="font-semibold text-slate-800">"Always allow this site to access your camera"</span>, and click Done.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: ANDROID */}
                {helpPlatformTab === 'android' && (
                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-emerald-600" />
                      <span>Android Chrome Camera Verification</span>
                    </h5>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                          1
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">Open Chrome Site Settings</p>
                          <p className="text-slate-600 mt-0.5">
                            Tap the <strong>Three Dots (⋮)</strong> in Chrome top-right &rarr; <strong>Settings</strong> &rarr; <strong>Site settings</strong> &rarr; <strong>Camera</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                          2
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">Remove Site from Blocked List</p>
                          <p className="text-slate-600 mt-0.5">
                            Ensure the main Camera toggle is turned ON. If this website is listed under <strong>"Blocked"</strong>, tap it and choose <strong>"Allow"</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900">
                        <p className="font-bold flex items-center gap-1.5 text-teal-800">
                          <CheckCircle2 className="h-4 w-4" /> Recommended Shortcut for Mobile
                        </p>
                        <p className="text-xs text-teal-800 mt-1">
                          You don't need to change any browser settings! Simply tap the <strong>"Mobile Camera App"</strong> tab — it launches your Android phone's native camera directly with 1 tap.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: SAFARI */}
                {helpPlatformTab === 'safari' && (
                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>🍏 Safari on iPhone, iPad & Mac</span>
                    </h5>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                          1
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">iPhone / iPad Address Bar Settings</p>
                          <p className="text-slate-600 mt-0.5">
                            In Safari address bar, tap the <strong>aA</strong> icon &rarr; tap <strong>Website Settings</strong> &rarr; tap <strong>Camera</strong> and set it to <strong>Allow</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                          2
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">iOS System Settings Check</p>
                          <p className="text-slate-600 mt-0.5">
                            Open iPhone <strong>Settings</strong> app &rarr; <strong>Safari</strong> &rarr; scroll to <strong>Camera</strong> &rarr; set to <strong>Allow</strong> or <strong>Ask</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                          3
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">Mac Safari Settings</p>
                          <p className="text-slate-600 mt-0.5">
                            Click <strong>Safari</strong> menu in macOS menu bar &rarr; <strong>Settings for This Website...</strong> &rarr; set <strong>Camera</strong> to <strong>Allow</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: OS SETTINGS */}
                {helpPlatformTab === 'os' && (
                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4 text-emerald-600" />
                      <span>Windows & macOS System Privacy Controls</span>
                    </h5>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <p className="font-bold text-slate-900">Windows 10 / 11 Privacy Settings:</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600">
                        <li>Press <strong>Windows Key + I</strong> to open Windows Settings.</li>
                        <li>Click <strong>Privacy & Security</strong> &rarr; <strong>Camera</strong>.</li>
                        <li>Ensure <strong>"Camera access"</strong> is turned <strong>ON</strong>.</li>
                        <li>Scroll down and verify <strong>"Let desktop apps access your camera"</strong> (including Chrome/Edge) is turned <strong>ON</strong>.</li>
                      </ol>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <p className="font-bold text-slate-900">Apple macOS Privacy Settings:</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600">
                        <li>Click Apple menu  &rarr; <strong>System Settings</strong> (or System Preferences).</li>
                        <li>Click <strong>Privacy & Security</strong> &rarr; <strong>Camera</strong>.</li>
                        <li>Toggle the switch next to <strong>Google Chrome</strong>, <strong>Edge</strong>, or <strong>Safari</strong> to <strong>ON</strong>.</li>
                      </ol>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                      <p className="font-bold flex items-center gap-1.5 text-amber-800">
                        <AlertTriangle className="h-4 w-4" /> Physical Webcam Privacy Shutter
                      </p>
                      <p className="text-xs text-amber-800 mt-1">
                        Many laptops have a physical plastic slider over the webcam lens or a keyboard function key (e.g. F8 / F10) that physically cuts camera power. Make sure the shutter is open.
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB: SANDBOX / IFRAME FAQ */}
                {helpPlatformTab === 'iframe' && (
                  <div className="space-y-3">
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2 text-amber-900">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>"My permission is granted, why am I still getting an error?"</span>
                    </h5>

                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-2">
                      <p className="font-bold text-amber-900">The Browser Security Sandbox Factor:</p>
                      <p className="leading-relaxed">
                        When web applications are running inside an <strong>embedded preview container or iframe</strong> (such as the development preview workspace), modern web browsers enforce strict security isolation.
                      </p>
                      <p className="leading-relaxed">
                        Even if your browser address bar says "Camera: Allowed", the outer hosting sandbox may disallow live streaming WebRTC video tracks to prevent unauthorized background access.
                      </p>
                    </div>

                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
                      <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        The 100% Reliable Solutions:
                      </p>
                      <div className="space-y-1.5 text-slate-700">
                        <p>
                          <strong>1. Switch to "Upload / Gallery" tab:</strong> Select any photo from your computer or phone. Completely bypasses iframe security policies.
                        </p>
                        <p>
                          <strong>2. Use "Mobile Camera App" tab:</strong> Invokes the operating system's native camera dialog directly without requiring live stream permissions.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FAQ Footer Actions */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCameraHelp(false);
                      handleSwitchToUpload(true);
                    }}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Switch to File Upload</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCameraHelp(false);
                      handleSwitchToMobile(true);
                    }}
                    className="px-3.5 py-2 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Open Phone Camera</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCameraHelp(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Close Guide
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
