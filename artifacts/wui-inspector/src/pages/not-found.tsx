import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground flex-col gap-4">
      <AlertCircle className="w-16 h-16 text-destructive" />
      <h1 className="text-4xl font-bold font-mono tracking-tight">404 - SYSTEM OFFLINE</h1>
      <p className="text-muted-foreground font-mono">The requested module could not be found.</p>
      <Link href="/" className="mt-4 px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-sm tracking-wider uppercase">
        Return to Command Center
      </Link>
    </div>
  );
}