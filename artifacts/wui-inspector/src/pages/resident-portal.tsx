import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Camera, MapPin, ChevronRight, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { useSubmitResidentInspection } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const DEMO_APN = "048-5612-014-00";
const DEMO_ADDRESS = "5820 Skyline Blvd, Oakland CA 94611";

export default function ResidentPortal() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1); // 1=camera, 2=submit, 3=success
  const [photos, setPhotos] = useState<{ zone: number; lat: number; lng: number; timestamp: string; imageDataUrl: string }[]>([]);
  const [submitterName, setSubmitterName] = useState("");
  const [certified, setCertified] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-green-700" />
          <div>
            <h1 className="font-bold text-slate-900 text-lg leading-tight">Alameda County Fire Safety</h1>
            <p className="text-xs text-slate-500 font-medium">Resident Self-Service Portal</p>
          </div>
        </div>
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
          Back to Inspector Portal
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 max-w-4xl mx-auto w-full">
        {!isUnlocked && (
          <PinScreen onUnlock={() => setIsUnlocked(true)} />
        )}

        {isUnlocked && wizardStep === 1 && (
          <CameraWizard
            apn={DEMO_APN}
            onComplete={(captured) => { setPhotos(captured); setWizardStep(2); }}
          />
        )}

        {isUnlocked && wizardStep === 2 && (
          <SubmitScreen
            apn={DEMO_APN}
            photos={photos}
            submitterName={submitterName}
            setSubmitterName={setSubmitterName}
            certified={certified}
            setCertified={setCertified}
            onSuccess={() => setWizardStep(3)}
          />
        )}

        {isUnlocked && wizardStep === 3 && <SuccessScreen />}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-6 px-6 text-center text-xs mt-auto">
        <p>CONFIDENTIAL &amp; PROPRIETARY — Intellectual Property &amp; Trade Secret of Michael Thompson.</p>
        <p className="mt-1">Protected under CA Civil Code § 3426.</p>
      </footer>
    </div>
  );
}

// ─── PIN screen ──────────────────────────────────────────────────────────────
function PinScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="w-full max-w-md mt-12">
      <Card className="border-slate-200 shadow-xl">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto w-14 h-14 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Secure Access</CardTitle>
          <p className="text-slate-500 text-sm mt-2">
            Enter the access PIN provided by your inspector.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">Assessor Parcel Number</Label>
            <Input
              placeholder="e.g. 048-5612-014-00"
              className="font-mono text-slate-900 bg-white border-slate-300 placeholder:text-slate-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">6-Digit PIN</Label>
            <Input
              placeholder="123456"
              maxLength={6}
              className="text-center font-mono text-xl tracking-[0.4em] h-14 text-slate-900 bg-white border-slate-300 placeholder:text-slate-400"
            />
          </div>
          <p className="text-xs text-slate-400 text-center">
            Demo: enter PIN "123456" with any APN (or leave blank)
          </p>
        </CardContent>

        <CardFooter className="pt-2 pb-8">
          <Button
            type="button"
            className="w-full h-12 text-base font-semibold bg-blue-700 hover:bg-blue-800 text-white"
            onClick={onUnlock}
          >
            Unlock Portal
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Camera wizard (3 zones) ──────────────────────────────────────────────────
function CameraWizard({ apn, onComplete }: { apn: string; onComplete: (photos: any[]) => void }) {
  const [zone, setZone] = useState(0);
  const [photos, setPhotos] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      // camera unavailable in this browser/device — wizard stays usable without video
    }
  }, []);

  useEffect(() => {
    startCamera();
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocError("GPS unavailable — photo will be stamped with approximate location."),
    );
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const loc = location ?? { lat: 37.8044, lng: -122.2711 }; // Oakland fallback
    const ts = new Date().toISOString();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, canvas.height - 96, canvas.width, 96);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`APN: ${apn}`, 16, canvas.height - 66);
    ctx.fillText(`LAT ${loc.lat.toFixed(6)}  LNG ${loc.lng.toFixed(6)}`, 16, canvas.height - 40);
    ctx.fillText(`TIME: ${ts}`, 16, canvas.height - 14);

    setCapturedImage(canvas.toDataURL("image/jpeg", 0.85));
  };

  const accept = () => {
    if (!capturedImage) return;
    const loc = location ?? { lat: 37.8044, lng: -122.2711 };
    const updated = [...photos, { zone, lat: loc.lat, lng: loc.lng, timestamp: new Date().toISOString(), imageDataUrl: capturedImage }];
    setPhotos(updated);
    setCapturedImage(null);
    if (zone < 2) {
      setZone(zone + 1);
    } else {
      stream?.getTracks().forEach((t) => t.stop());
      onComplete(updated);
    }
  };

  const zones = [
    { title: "Zone 0 — 0 to 5 ft", desc: "Ember-Resistant Zone. Clear all combustible materials within 5 ft of the structure — mulch, wood piles, dead plants." },
    { title: "Zone 1 — 5 to 30 ft", desc: "Lean & Clean Zone. Remove dead vegetation, trim tree limbs to 10 ft, clear roof and gutters of debris." },
    { title: "Zone 2 — 30 to 100 ft", desc: "Fuel Reduction Zone. Maintain horizontal and vertical spacing between trees and shrubs." },
  ];

  return (
    <div className="w-full max-w-4xl mt-4">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 font-medium">
        <span className="font-mono text-slate-700">{apn}</span>
        <span>·</span>
        <span>{DEMO_ADDRESS}</span>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
          <span>Zone Walkthrough</span>
          <span>Step {zone + 1} of 3</span>
        </div>
        <Progress value={((zone) / 3) * 100} className="h-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instructions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{zones[zone].title}</h2>
          <p className="text-slate-600 leading-relaxed">{zones[zone].desc}</p>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 mb-1.5 flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4" /> Photo Instructions
            </h4>
            <ul className="text-sm text-blue-800 list-disc pl-5 space-y-1">
              <li>Frame the entire zone clearly.</li>
              <li>GPS coordinates will be stamped automatically.</li>
              <li>No file uploads — live camera only.</li>
            </ul>
          </div>

          {locError && (
            <p className="text-amber-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {locError}
            </p>
          )}
          {!location && !locError && (
            <p className="text-slate-500 text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Acquiring GPS…
            </p>
          )}
        </div>

        {/* Camera viewfinder */}
        <div className="bg-black rounded-xl overflow-hidden aspect-[3/4] relative border-2 border-slate-700 shadow-lg flex items-center justify-center">
          {!capturedImage ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute bottom-6 inset-x-0 flex justify-center">
                <button
                  type="button"
                  onClick={capture}
                  className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 shadow-xl flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-transform"
                >
                  <Camera className="w-7 h-7 text-slate-800" />
                </button>
              </div>
            </>
          ) : (
            <>
              <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-5 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-white/20 text-white border-white hover:bg-white hover:text-black"
                  onClick={() => setCapturedImage(null)}
                >
                  Retake
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={accept}
                >
                  {zone < 2 ? <>Accept &amp; Continue <ChevronRight className="ml-1 w-4 h-4" /></> : "Accept & Submit"}
                </Button>
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
}

// ─── Submission review screen ─────────────────────────────────────────────────
function SubmitScreen({ apn, photos, submitterName, setSubmitterName, certified, setCertified, onSuccess }: any) {
  const submit = useSubmitResidentInspection();
  const { toast } = useToast();

  const handleSubmit = () => {
    submit.mutate(
      {
        data: {
          apn,
          submitterName,
          certifiedAccurate: certified,
          photos: photos.map((p: any) => ({
            zone: p.zone,
            latitude: p.lat,
            longitude: p.lng,
            timestamp: p.timestamp,
            imageDataUrl: p.imageDataUrl,
          })),
        },
      },
      {
        onSuccess,
        onError: () => toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="w-full max-w-2xl mt-8">
      <h2 className="text-2xl font-bold mb-2 text-slate-900">Review &amp; Submit</h2>
      <p className="text-slate-500 text-sm mb-6">Confirm your photos and sign the certification below.</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {photos.map((p: any, i: number) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm">
            <img src={p.imageDataUrl} alt={`Zone ${i}`} className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded">
              Zone {i}
            </div>
          </div>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-1.5">
            <Label className="font-medium text-slate-800">Your Full Name</Label>
            <Input
              placeholder="Jane Smith"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>
          <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <Checkbox
              id="certify"
              checked={certified}
              onCheckedChange={(v) => setCertified(!!v)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="certify" className="font-bold text-slate-900 cursor-pointer">
                I certify these photos accurately represent current conditions
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Falsifying inspection photos violates municipal code and may result in immediate fines.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t pt-5 pb-6">
          <Button
            type="button"
            className="w-full h-13 text-base font-semibold bg-green-700 hover:bg-green-800 text-white"
            disabled={!submitterName.trim() || !certified || submit.isPending}
            onClick={handleSubmit}
          >
            {submit.isPending ? "Submitting…" : "Submit Official Self-Inspection"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen() {
  return (
    <div className="w-full max-w-md mt-16 text-center">
      <CheckCircle2 className="w-24 h-24 text-green-600 mx-auto mb-6" />
      <h2 className="text-3xl font-bold text-slate-900 mb-3">Submission Received</h2>
      <p className="text-slate-600 text-base mb-8 leading-relaxed">
        Your defensible space self-inspection has been submitted and is pending review by an OFD inspector.
      </p>
      <Button asChild className="h-11 px-8 bg-slate-900 hover:bg-slate-700 text-white">
        <Link href="/">Return to Inspector Portal</Link>
      </Button>
    </div>
  );
}
