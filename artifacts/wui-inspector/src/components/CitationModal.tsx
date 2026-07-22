import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  apn: string;
  ownerAddress: string;
  ownerName: string;
  inspectorBadge: string;
  noticeNumber: string;
}

export function CitationModal({
  isOpen,
  onClose,
  apn,
  ownerAddress,
  ownerName,
  inspectorBadge,
  noticeNumber,
}: CitationModalProps) {
  const today = new Date();
  const deadline = new Date();
  deadline.setDate(today.getDate() + 30);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-slate-50 text-slate-900 border-slate-300 print:max-w-full print:w-full print:border-none print:shadow-none font-serif">
        <DialogHeader className="print:hidden">
          <DialogTitle className="text-xl font-bold font-sans">Citation Preview</DialogTitle>
          <DialogDescription className="font-sans">
            Review the notice of non-compliance before issuing.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 border border-slate-300 bg-white print:border-none print:p-0 space-y-6">
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-2xl font-bold uppercase tracking-wider">Oakland Fire Department</h1>
            <h2 className="text-lg font-semibold uppercase mt-1">Notice of Defensible Space Non-Compliance</h2>
          </div>

          <div className="flex justify-between text-sm">
            <div>
              <p><strong>Notice No:</strong> {noticeNumber}</p>
              <p><strong>Date Issued:</strong> {format(today, "MMMM d, yyyy")}</p>
              <p><strong>Inspector Badge:</strong> #{inspectorBadge}</p>
            </div>
            <div className="text-right">
              <p><strong>Compliance Deadline:</strong></p>
              <p className="text-red-700 font-bold text-lg">{format(deadline, "MMMM d, yyyy")}</p>
            </div>
          </div>

          <div className="bg-slate-100 p-4 border border-slate-300">
            <p><strong>Property Owner:</strong> {ownerName}</p>
            <p><strong>Property Address:</strong> {ownerAddress}</p>
            <p><strong>APN:</strong> <span className="font-mono">{apn}</span></p>
          </div>

          <div className="space-y-4">
            <p className="font-bold">To the Property Owner:</p>
            <p>
              An inspection of the property referenced above has revealed violations of the California Fire Code and/or local ordinances regarding defensible space and vegetation management in the Wildland-Urban Interface (WUI) area.
            </p>
            <p>
              You are hereby notified to correct the following violations within 30 days of the date of this notice:
            </p>
            <ul className="list-disc pl-8 space-y-2">
              <li>Failure to maintain 0-5ft ember-resistant zone (Zone 0).</li>
              <li>Failure to remove dead/dying vegetation within 30ft (Zone 1).</li>
              <li>Failure to reduce fuel load within 100ft (Zone 2).</li>
            </ul>
            <p>
              Failure to comply by the deadline may result in administrative citations, fines, or hazard abatement by the Fire Department at the owner's expense.
            </p>
          </div>

          <div className="pt-12 flex justify-between border-t border-slate-300 mt-12">
            <div className="w-1/2 border-t border-slate-400 pt-2 text-sm text-center mr-4">
              Inspector Signature
            </div>
            <div className="w-1/2 border-t border-slate-400 pt-2 text-sm text-center ml-4">
              Property Owner Signature (if present)
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden mt-4">
          <Button variant="outline" onClick={onClose} className="font-sans">Cancel</Button>
          <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800 font-sans">
            Print / Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}