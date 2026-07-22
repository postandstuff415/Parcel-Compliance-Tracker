import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { 
  useListParcels, 
  useGetDashboardSummary, 
  useUpdateParcelStatus, 
  useGetParcelPhotos, 
  useCreateCitation,
  getGetParcelPhotosQueryKey
} from "@workspace/api-client-react";
import { ParcelStatus } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Search, MapPin, AlertTriangle, CheckCircle, Clock, ShieldAlert, Activity, ClipboardList, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import LeafletMap from "@/components/LeafletMap";
import { CitationModal } from "@/components/CitationModal";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function InspectorDashboard() {
  const [selectedApn, setSelectedApn] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [citationModalOpen, setCitationModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: parcels, isLoading: parcelsLoading } = useListParcels();
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();

  const updateStatus = useUpdateParcelStatus();
  const createCitation = useCreateCitation();

  const selectedParcel = useMemo(() => 
    parcels?.find(p => p.apn === selectedApn) || null
  , [parcels, selectedApn]);

  const { data: photos, isLoading: photosLoading } = useGetParcelPhotos(selectedApn || "", {
    query: { enabled: !!selectedApn, queryKey: getGetParcelPhotosQueryKey(selectedApn || "") }
  });

  const [notes, setNotes] = useState("");
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedParcel) {
      setNotes(selectedParcel.inspectorNotes || "");
    }
  }, [selectedParcel?.apn]); // Reset when apn changes

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(() => {
      if (!selectedParcel) return;
      updateStatus.mutate({
        apn: selectedParcel.apn,
        data: { inspectorNotes: val }
      }, {
        onSuccess: () => {
          toast({ title: "Notes saved" });
        }
      });
    }, 1000);
  };

  const filteredParcels = useMemo(() => {
    if (!parcels) return [];
    let result = parcels;

    if (filter !== "all") {
      result = result.filter(p => p.status === filter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.apn.toLowerCase().includes(q) || 
        p.address.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => b.fuelScores.composite - a.fuelScores.composite);
  }, [parcels, filter, searchQuery]);

  const handleStatusUpdate = (status: ParcelStatus) => {
    if (!selectedParcel) return;
    
    updateStatus.mutate({
      apn: selectedParcel.apn,
      data: { status }
    }, {
      onSuccess: () => {
        toast({
          title: "Status Updated",
          description: `Parcel ${selectedParcel.apn} marked as ${status.replace("_", " ")}.`,
        });
      }
    });
  };

  const handleIssueCitation = () => {
    if (!selectedParcel) return;
    createCitation.mutate({
      data: {
        apn: selectedParcel.apn,
        inspectorBadge: "4821",
        violations: ["Zone 0 violation", "Zone 1 violation"]
      }
    }, {
      onSuccess: () => {
        setCitationModalOpen(true);
        handleStatusUpdate(ParcelStatus.non_compliant);
      }
    });
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar - Parcel Queue */}
      <div className="w-[380px] flex-shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col z-10">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h1 className="font-bold tracking-tight text-lg">OFD COMMAND</h1>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search APN or Address..." 
              className="pl-9 bg-slate-900 border-slate-700 text-sm font-mono h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={filter} onValueChange={setFilter} className="w-full">
            <TabsList className="w-full bg-slate-900 border border-slate-800 grid grid-cols-4 h-9">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-slate-800">All</TabsTrigger>
              <TabsTrigger value="pending_review" className="text-xs data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200">Pend</TabsTrigger>
              <TabsTrigger value="non_compliant" className="text-xs data-[state=active]:bg-red-900/50 data-[state=active]:text-red-200">Fail</TabsTrigger>
              <TabsTrigger value="self_inspection_submitted" className="text-xs data-[state=active]:bg-blue-900/50 data-[state=active]:text-blue-200">Subm</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2">
          {parcelsLoading && (
            Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full bg-slate-800 rounded-md" />
            ))
          )}
          {!parcelsLoading && filteredParcels.map((parcel, idx) => (
            <button
              key={parcel.apn}
              onClick={() => setSelectedApn(parcel.apn)}
              className={`w-full text-left p-3 rounded-md transition-all border animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both ${
                selectedApn === parcel.apn 
                  ? "bg-slate-800 border-slate-600 shadow-sm" 
                  : "bg-slate-900/50 border-slate-800/50 hover:bg-slate-800/50 hover:border-slate-700"
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono text-sm font-bold text-slate-200">{parcel.apn}</span>
                <RiskBadge level={parcel.riskLevel} />
              </div>
              <p className="text-xs text-slate-400 truncate mb-2">{parcel.address}</p>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex-1 mr-3">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono">
                    <span>FUEL RISK</span>
                    <span>{(parcel.fuelScores.composite * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={parcel.fuelScores.composite * 100} className="h-1 bg-slate-800" indicatorClassName={getScoreColor(parcel.fuelScores.composite)} />
                </div>
                <StatusIcon status={parcel.status} />
              </div>
            </button>
          ))}
          {!parcelsLoading && filteredParcels.length === 0 && (
            <div className="text-center p-8 text-slate-500 text-sm">
              No parcels found matching criteria.
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center bg-slate-900">
          <span>Insp. Martinez #4821</span>
          <Link href="/resident-portal" className="text-blue-400 hover:text-blue-300">Portal Test</Link>
        </div>
        <div className="p-3 border-t border-slate-800 text-[9px] text-slate-600 bg-slate-950 text-center uppercase tracking-widest leading-relaxed">
          CONFIDENTIAL & PROPRIETARY<br />
          Intellectual Property & Trade Secret of Michael Thompson.<br />
          Protected under CA Civil Code § 3426.
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col bg-slate-950 relative">
        {/* Top Nav */}
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-sm z-10">
          <div className="font-mono text-sm tracking-widest text-slate-400 flex items-center gap-2">
            {selectedParcel ? (
              <>
                <MapPin className="w-4 h-4" />
                {selectedParcel.address.toUpperCase()} 
                <span className="text-slate-600">/</span> 
                {selectedParcel.apn}
              </>
            ) : (
              "WUI DEFENSIBLE SPACE ENGINE — OAKLAND HQ"
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> SYSTEM ONLINE</span>
          </div>
        </header>

        {selectedParcel ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Map Panel (~60%) */}
            <div className="h-[55%] relative border-b border-slate-800 bg-slate-900">
              <LeafletMap lat={selectedParcel.geometry.lat} lng={selectedParcel.geometry.lng} />
            </div>

            {/* Action Panel (~45%) */}
            <div className="h-[45%] flex flex-col bg-slate-950 overflow-y-auto">
              <div className="flex-1 p-6 grid grid-cols-12 gap-6">
                
                {/* Fuel Scores & Info */}
                <div className="col-span-4 space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Property Info</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-slate-800 pb-1">
                        <span className="text-slate-400">Owner</span>
                        <span className="text-slate-200">{selectedParcel.ownerName}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-1">
                        <span className="text-slate-400">Last Inspected</span>
                        <span className="text-slate-200 font-mono">{selectedParcel.lastInspectedAt ? format(new Date(selectedParcel.lastInspectedAt), "MM/dd/yyyy") : "N/A"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-1">
                        <span className="text-slate-400">Status</span>
                        <span className="text-slate-200 capitalize">{selectedParcel.status.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Zone Fuel Analysis</h3>
                    <div className="space-y-3">
                      <ScoreBar label="ZONE 0 (0-5ft)" score={selectedParcel.fuelScores.zone0} />
                      <ScoreBar label="ZONE 1 (5-30ft)" score={selectedParcel.fuelScores.zone1} />
                      <ScoreBar label="ZONE 2 (30-100ft)" score={selectedParcel.fuelScores.zone2} />
                    </div>
                  </div>
                </div>

                {/* Inspector Notes & Photos */}
                <div className="col-span-5 flex flex-col border-l border-slate-800 pl-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inspector Notes</h3>
                  <Textarea 
                    className="flex-1 bg-slate-900 border-slate-800 font-mono text-sm resize-none mb-4"
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Enter inspection observations here..."
                  />

                  {photos && photos.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Camera className="w-3 h-3" /> Resident Submissions
                      </h3>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {photos.map(photo => (
                          <div key={photo.id} className="relative group flex-shrink-0 w-24 h-24 rounded-md overflow-hidden border border-slate-700">
                            <img src={photo.imageDataUrl} alt={`Zone ${photo.zone}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-xs font-mono font-bold">ZONE {photo.zone}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-3 flex flex-col gap-3 border-l border-slate-800 pl-6 justify-center">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Command Actions</h3>
                  <Button 
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold tracking-wide shadow-[0_0_15px_rgba(22,163,74,0.3)]"
                    onClick={() => handleStatusUpdate(ParcelStatus.compliant)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> APPROVE COMPLIANCE
                  </Button>
                  <Button 
                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                    onClick={handleIssueCitation}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" /> ISSUE CITATION
                  </Button>
                  <Button 
                    className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold tracking-wide"
                    onClick={() => handleStatusUpdate(ParcelStatus.pending_review)}
                  >
                    <ClipboardList className="w-4 h-4 mr-2" /> REQUEST SITE VISIT
                  </Button>
                </div>

              </div>
            </div>
          </div>
        ) : (
          /* Dashboard Summary */
          <div className="flex-1 p-8 overflow-y-auto">
            {summaryLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-32 w-full bg-slate-800" />
                <div className="grid grid-cols-2 gap-6">
                  <Skeleton className="h-64 bg-slate-800" />
                  <Skeleton className="h-64 bg-slate-800" />
                </div>
              </div>
            ) : summary ? (
              <div className="max-w-6xl mx-auto space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-6 font-mono tracking-tight flex items-center gap-3">
                    <Activity className="text-blue-500" /> DISTRICT STATUS OVERVIEW
                  </h2>
                  <div className="grid grid-cols-4 gap-4">
                    <StatCard label="TOTAL PARCELS" value={summary.totalParcels} />
                    <StatCard label="AVG RISK SCORE" value={`${(summary.avgCompositeScore * 100).toFixed(1)}%`} trend="high" />
                    <StatCard label="NON-COMPLIANT" value={summary.byStatus.non_compliant} color="text-red-500" />
                    <StatCard label="PENDING REVIEW" value={summary.byStatus.pending_review} color="text-amber-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <h3 className="text-sm font-bold text-slate-400 mb-6 font-mono uppercase tracking-widest">Risk Distribution</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-red-400 font-mono">HIGH RISK</span>
                        <span className="text-xl font-bold">{summary.byRiskLevel.high}</span>
                      </div>
                      <Progress value={(summary.byRiskLevel.high / summary.totalParcels) * 100} className="h-2 bg-slate-800" indicatorClassName="bg-red-500" />
                      
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-amber-400 font-mono">MEDIUM RISK</span>
                        <span className="text-xl font-bold">{summary.byRiskLevel.medium}</span>
                      </div>
                      <Progress value={(summary.byRiskLevel.medium / summary.totalParcels) * 100} className="h-2 bg-slate-800" indicatorClassName="bg-amber-500" />
                      
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-green-400 font-mono">LOW RISK</span>
                        <span className="text-xl font-bold">{summary.byRiskLevel.low}</span>
                      </div>
                      <Progress value={(summary.byRiskLevel.low / summary.totalParcels) * 100} className="h-2 bg-slate-800" indicatorClassName="bg-green-500" />
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <h3 className="text-sm font-bold text-slate-400 mb-6 font-mono uppercase tracking-widest">Recent Activity</h3>
                    <div className="space-y-4 font-mono text-sm">
                      {summary.recentActivity.slice(0, 5).map(act => (
                        <div key={act.id} className="flex gap-4 items-start border-b border-slate-800/50 pb-3">
                          <span className="text-slate-500">{format(new Date(act.timestamp), "HH:mm")}</span>
                          <div>
                            <div className="text-blue-400 font-bold">{act.apn}</div>
                            <div className="text-slate-300 text-xs mt-1">{act.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {selectedParcel && (
        <CitationModal 
          isOpen={citationModalOpen}
          onClose={() => setCitationModalOpen(false)}
          apn={selectedParcel.apn}
          ownerName={selectedParcel.ownerName}
          ownerAddress={selectedParcel.address}
          inspectorBadge="4821"
          noticeNumber={`NOC-${new Date().getFullYear()}-${selectedParcel.apn.slice(-4)}`}
        />
      )}
    </div>
  );
}

// Subcomponents

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-500/10 text-red-500 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    low: "bg-green-500/10 text-green-500 border-green-500/20",
  };
  return (
    <Badge variant="outline" className={`text-[10px] uppercase font-mono py-0 px-1.5 h-5 rounded-sm ${colors[level] || colors.low}`}>
      {level}
    </Badge>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case ParcelStatus.compliant: return <CheckCircle className="w-4 h-4 text-green-500" />;
    case ParcelStatus.non_compliant: return <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />;
    case ParcelStatus.pending_review: return <Clock className="w-4 h-4 text-amber-500" />;
    case ParcelStatus.self_inspection_submitted: return <ClipboardList className="w-4 h-4 text-blue-500" />;
    default: return null;
  }
}

function getScoreColor(score: number) {
  if (score > 0.7) return "bg-red-500";
  if (score > 0.4) return "bg-amber-500";
  return "bg-green-500";
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1 font-mono">
        <span className="text-slate-400">{label}</span>
        <span className={score > 0.7 ? "text-red-400" : score > 0.4 ? "text-amber-400" : "text-green-400"}>
          {(score * 100).toFixed(0)}
        </span>
      </div>
      <Progress value={score * 100} className="h-1.5 bg-slate-800" indicatorClassName={getScoreColor(score)} />
    </div>
  );
}

function StatCard({ label, value, color = "text-slate-100", trend }: { label: string; value: string | number; color?: string; trend?: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <div className="text-xs text-slate-500 font-mono mb-2 uppercase">{label}</div>
      <div className={`text-3xl font-bold font-mono tracking-tight ${color}`}>{value}</div>
    </div>
  );
}