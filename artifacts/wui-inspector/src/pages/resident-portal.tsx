import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Camera, MapPin, ChevronRight, ShieldCheck, AlertCircle, RefreshCw, Info, CheckCircle2 } from "lucide-react";
import { 
  useGetResidentParcelStatus, 
  useSubmitResidentInspection,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export default function ResidentPortal() {
  const [step, setStep] = useState(0);
  const [apn, setApn] = useState("048-5612-014-00");
  const [pin, setPin] = useState("");
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
        {step === 0 && <StepZero onNext={(verifiedApn: string) => { setApn(verifiedApn); setStep(1); }} />}
        {step === 1 && <StepOne apn={apn} onNext={() => setStep(2)} />}
        {step === 2 && <StepTwoWizard apn={apn} onComplete={(capturedPhotos: any[]) => { setPhotos(capturedPhotos); setStep(3); }} />}
        {step === 3 && <StepThree apn={apn} photos={photos} submitterName={submitterName} setSubmitterName={setSubmitterName} certified={certified} setCertified={setCertified} onNext={() => setStep(4)} />}
        {step === 4 && <StepFour />}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-6 px-6 text-center text-xs mt-auto">
        <p>CONFIDENTIAL & PROPRIETARY — Intellectual Property & Trade Secret of Michael Thompson.</p>
        <p className="mt-1">Protected under CA Civil Code § 3426.</p>
      </footer>
    </div>
  );
}

// Custom Badge for local use
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${className}`}>{children}</span>;
}

// Step 0: PIN — no API calls here; demo mode unlocks immediately
function StepZero({ onNext }: { onNext: (apn: string) => void }) {
  const [apn, setApn] = useState("");
  const [pin, setPin] = useState("");

  const handleUnlock = () => {
    // Demo: any input (or blank) unlocks 5820 Skyline Blvd
    onNext("048-5612-014-00");
  };

  return (
    <div className="w-full max-w-md mt-12">
      <Card className="border-slate-200 shadow-xl shadow-slate-200/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Secure Access</CardTitle>
          <CardDescription className="text-base mt-2">Enter your access PIN provided by your inspector.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Assessor Parcel Number</Label>
            <Input
              placeholder="e.g. 048-5612-014-00"
              value={apn}
              onChange={(e) => setApn(e.target.value)}
              className="text-center font-mono text-base text-slate-900 bg-white border-slate-300"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">6-Digit PIN</Label>
            <Input
              placeholder="123456"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="text-center font-mono text-xl tracking-[0.4em] h-14 text-slate-900 bg-white border-slate-300"
            />
          </div>
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1">
            <Info className="w-3 h-3" /> Enter PIN "123456" with any APN for demo
          </p>
        </CardContent>
        <CardFooter className="pt-2 pb-6">
          <Button
            type="button"
            className="w-full h-12 text-base font-semibold bg-blue-700 hover:bg-blue-800 text-white"
            onClick={handleUnlock}
          >
            Unlock Portal
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Fallback demo data shown if the API call fails
const DEMO_STATUS = {
  apn: "048-5612-014-00",
  address: "5820 Skyline Blvd, Oakland CA 94611",
  ownerName: "Patricia Hernandez",
  status: "pending_review" as const,
  riskLevel: "high" as const,
  fuelScores: { zone0: 0.82, zone1: 0.74, zone2: 0.68, composite: 0.75 },
  pendingTasks: [
    "Clear combustible materials within 5 ft of structure (Zone 0)",
    "Remove dead vegetation from ember zone",
    "Thin vegetation to 3 ft separation within 30 ft (Zone 1)",
  ],
};

// Step 1: Parcel status + launch wizard
function StepOne({ apn, onNext }: { apn: string; onNext: () => void }) {
  const [queryApn, setQueryApn] = useState(apn);
  const { data, isLoading, isError, refetch } = useGetResidentParcelStatus(queryApn, {
    query: { queryKey: [`/api/resident/parcel-status/${queryApn}`], retry: 1 },
  });

  const status = data ?? (isError ? DEMO_STATUS : undefined);

  const statusColors: Record<string, string> = {
    compliant: "bg-green-100 text-green-800 border-green-300",
    non_compliant: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <div className="w-full max-w-2xl mt-8">
      {/* APN search bar */}
      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Assessor Parcel Number"
          value={queryApn}
          onChange={(e) => setQueryApn(e.target.value)}
          className="h-11 font-mono text-slate-900 bg-white border-slate-300"
        />
        <Button
          type="button"
          className="h-11 px-6 bg-slate-900 hover:bg-slate-700 text-white shrink-0"
          onClick={() => refetch()}
        >
          Look Up
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading parcel data…</p>
        </div>
      )}

      {/* Error notice */}
      {isError && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Showing demo data — live API unavailable.
        </div>
      )}

      {/* Parcel card */}
      {!isLoading && status && (
        <Card className="border-slate-200 shadow-md">
          <CardHeader className="bg-slate-50 border-b border-slate-200">
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">{status.address}</CardTitle>
                <CardDescription className="font-mono text-sm mt-1">APN: {status.apn}</CardDescription>
              </div>
              <Badge className={statusColors[status.status] ?? "bg-amber-100 text-amber-800 border-amber-300"}>
                {status.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {(["zone0", "zone1", "zone2"] as const).map((z, i) => (
                <div key={z} className="p-4 bg-slate-50 border rounded-lg text-center">
                  <div className="text-xs font-bold text-slate-500 uppercase">Zone {i}</div>
                  <div className="text-2xl font-mono mt-1 text-slate-900">
                    {Math.round(status.fuelScores[z] * 100)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">fuel score</div>
                </div>
              ))}
            </div>
            {status.pendingTasks && status.pendingTasks.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" /> Pending Tasks
                </h3>
                <ul className="space-y-2">
                  {status.pendingTasks.map((task, i) => (
                    <li key={i} className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-900">
                      <span className="font-bold shrink-0">•</span> {task}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 border-t pt-6">
            <Button
              type="button"
              className="w-full h-14 text-lg font-semibold bg-green-700 hover:bg-green-800 text-white"
              onClick={onNext}
            >
              Begin Zone Walkthrough <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

// Step 2: Camera Wizard
function StepTwoWizard({ apn, onComplete }: any) {
  const [zone, setZone] = useState(0); // 0, 1, 2
  const [photos, setPhotos] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locError, setLocError] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const initCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      console.error("Camera access denied", err);
    }
  }, []);

  const initLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setLocError("GPS required for anti-cheat verification.")
    );
  }, []);

  useEffect(() => {
    initCamera();
    initLocation();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !location) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stamping metadata
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
    
    ctx.fillStyle = "white";
    ctx.font = "bold 20px monospace";
    const ts = new Date().toISOString();
    ctx.fillText(`APN: ${apn}`, 20, canvas.height - 70);
    ctx.fillText(`LAT: ${location.lat.toFixed(6)} LNG: ${location.lng.toFixed(6)}`, 20, canvas.height - 40);
    ctx.fillText(`TIME: ${ts}`, 20, canvas.height - 10);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(dataUrl);
  };

  const acceptPhoto = () => {
    if (!capturedImage || !location) return;
    const newPhoto = { zone, lat: location.lat, lng: location.lng, timestamp: new Date().toISOString(), imageDataUrl: capturedImage };
    const newPhotos = [...photos, newPhoto];
    setPhotos(newPhotos);
    setCapturedImage(null);

    if (zone < 2) {
      setZone(zone + 1);
    } else {
      if (stream) stream.getTracks().forEach(t => t.stop());
      onComplete(newPhotos);
    }
  };

  const zoneDetails = [
    { title: "Zone 0 (0-5 ft)", desc: "Ember-Resistant Zone. Clear all combustible materials, including mulch, wood piles, and plants within 5 feet of the structure." },
    { title: "Zone 1 (5-30 ft)", desc: "Lean & Clean Zone. Remove dead vegetation, trim trees up 10 feet, clear roof of debris." },
    { title: "Zone 2 (30-100 ft)", desc: "Fuel Reduction Zone. Ensure horizontal and vertical spacing between trees and shrubs." }
  ];

  return (
    <div className="w-full max-w-4xl mt-4">
      <div className="mb-6">
        <div className="flex justify-between text-sm font-bold text-slate-500 mb-2">
          <span>Inspection Progress</span>
          <span>Step {zone + 1} of 3</span>
        </div>
        <Progress value={((zone) / 3) * 100} className="h-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">{zoneDetails[zone].title}</h2>
          <p className="text-slate-600 leading-relaxed">{zoneDetails[zone].desc}</p>
          
          <div className="bg-blue-50 p-4 border border-blue-100 rounded-md">
            <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-2"><Camera className="w-4 h-4"/> Photo Instructions</h4>
            <ul className="text-sm text-blue-800 list-disc pl-5 space-y-1">
              <li>Ensure the entire zone is visible.</li>
              <li>GPS must be enabled.</li>
              <li>Photo will be timestamped automatically.</li>
            </ul>
          </div>
          
          {locError && <div className="text-red-600 text-sm font-bold flex items-center gap-2"><MapPin className="w-4 h-4"/>{locError}</div>}
          {!location && !locError && <div className="text-amber-600 text-sm font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin"/> Acquiring GPS signal...</div>}
        </div>

        <div className="bg-black rounded-xl overflow-hidden aspect-[3/4] relative flex items-center justify-center border-4 border-slate-200 shadow-lg">
          {!capturedImage ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <Button 
                  size="lg" 
                  className="rounded-full w-16 h-16 bg-white border-4 border-slate-300 hover:bg-slate-200 text-black shadow-xl"
                  onClick={handleCapture}
                  disabled={!location}
                >
                  <Camera className="w-6 h-6" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex justify-between gap-4">
                <Button variant="outline" className="flex-1 bg-white/20 text-white border-white hover:bg-white hover:text-black" onClick={() => setCapturedImage(null)}>Retake</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={acceptPhoto}>Accept & Continue</Button>
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
}

// Step 3: Submission
function StepThree({ apn, photos, submitterName, setSubmitterName, certified, setCertified, onNext }: any) {
  const submit = useSubmitResidentInspection();
  const { toast } = useToast();

  const handleSubmit = () => {
    submit.mutate({
      data: {
        apn,
        submitterName,
        certifiedAccurate: certified,
        photos: photos.map((p: any) => ({
          zone: p.zone,
          latitude: p.lat,
          longitude: p.lng,
          timestamp: p.timestamp,
          imageDataUrl: p.imageDataUrl
        }))
      }
    }, {
      onSuccess: () => onNext(),
      onError: () => toast({ title: "Error", description: "Failed to submit inspection.", variant: "destructive" })
    });
  };

  return (
    <div className="w-full max-w-2xl mt-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6 text-center">Review & Submit</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        {photos.map((p: any, i: number) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm group">
            <img src={p.imageDataUrl} alt={`Zone ${i}`} className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">Zone {i}</div>
          </div>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label>Your Full Name</Label>
            <Input placeholder="John Doe" value={submitterName} onChange={e => setSubmitterName(e.target.value)} className="bg-slate-50" />
          </div>
          <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-md">
            <Checkbox id="certify" checked={certified} onCheckedChange={(c) => setCertified(c as boolean)} className="mt-1" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="certify" className="font-bold text-slate-800">I certify these photos accurately represent current conditions</Label>
              <p className="text-sm text-slate-500">Falsifying inspection photos is a violation of municipal code and may result in immediate fines.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t pt-6">
          <Button 
            className="w-full h-14 text-lg bg-green-700 hover:bg-green-800" 
            disabled={!submitterName || !certified || submit.isPending}
            onClick={handleSubmit}
          >
            {submit.isPending ? "Submitting..." : "Submit Official Self-Inspection"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Step 4: Success
function StepFour() {
  return (
    <div className="w-full max-w-md mt-16 text-center animate-in zoom-in-95 duration-500">
      <CheckCircle2 className="w-24 h-24 text-green-600 mx-auto mb-6" />
      <h2 className="text-3xl font-bold mb-4">Submission Received</h2>
      <p className="text-slate-600 text-lg mb-8">
        Your defensible space self-inspection has been successfully submitted and is pending review by an OFD inspector.
      </p>
      <Button asChild className="h-12 px-8 bg-slate-900 text-white">
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}