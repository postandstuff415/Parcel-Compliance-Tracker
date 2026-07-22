import { useState } from "react";
import { ShieldAlert, Lock, User, Hash, AlertTriangle, Eye, EyeOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";

const DEMO = {
  email: "martinez@oaklandca.gov",
  badge: "4821",
  password: "OFD@Prevent!on",
  name: "Insp. Martinez",
};

export default function InspectorLogin() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [badge, setBadge] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const doLogin = (e?: string, b?: string) => {
    const resolvedEmail = e ?? email;
    const resolvedBadge = b ?? badge;
    const looksValid =
      resolvedEmail.trim().length > 0 && resolvedBadge.trim().length > 0;

    if (!looksValid) {
      setError("Email and Badge Number are required.");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate brief auth handshake for realism
    setTimeout(() => {
      login({
        name: `Insp. ${resolvedEmail.split("@")[0].charAt(0).toUpperCase() + resolvedEmail.split("@")[0].slice(1)}`,
        badge: resolvedBadge,
        email: resolvedEmail,
      });
      setIsLoading(false);
    }, 600);
  };

  const quickSignIn = () => {
    setEmail(DEMO.email);
    setBadge(DEMO.badge);
    setPassword(DEMO.password);
    setIsLoading(true);
    setError("");
    setTimeout(() => {
      login({ name: DEMO.name, badge: DEMO.badge, email: DEMO.email });
      setIsLoading(false);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-900/10 blur-3xl" />
      </div>

      {/* Header wordmark */}
      <div className="text-center mb-8 z-10">
        <p className="text-[10px] tracking-[0.35em] text-slate-500 uppercase mb-1 font-mono">
          City of Oakland · Fire Department
        </p>
        <p className="text-[10px] tracking-[0.3em] text-slate-600 uppercase font-mono">
          Prevention Division · WUI Inspection System
        </p>
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md">
        {/* RESTRICTED ACCESS banner */}
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-800/60 rounded-t-lg px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />
          <span className="text-red-300 text-[10px] font-mono tracking-widest uppercase font-bold">
            RESTRICTED ACCESS — AUTHORIZED OAKLAND FIRE PERSONNEL ONLY
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-700/60 border-t-0 rounded-b-lg p-8 shadow-2xl">
          {/* Badge icon */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-20 h-20 mb-4">
              {/* Outer ring glow */}
              <div className="absolute inset-0 rounded-full border-2 border-blue-600/30 animate-ping" style={{ animationDuration: "3s" }} />
              <div className="absolute inset-0 rounded-full border border-blue-700/50" />
              <div className="w-full h-full rounded-full bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center shadow-inner border border-slate-700">
                <ShieldAlert className="w-9 h-9 text-blue-400" />
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100 font-mono">
              OFD PREVENTION DIVISION
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-mono tracking-wider">
              SECURE COMMAND PORTAL
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                Inspector Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <Input
                  type="email"
                  placeholder="e.g. martinez@oaklandca.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
                  className="pl-9 bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-blue-600 focus:ring-blue-600/20 h-11 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                Badge / ID Number
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <Input
                  type="text"
                  placeholder="e.g. 4821"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
                  className="pl-9 bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-blue-600 h-11 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                Access Code / Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
                  className="pl-9 pr-10 bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-blue-600 h-11 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> {error}
              </p>
            )}

            <Button
              onClick={() => doLogin()}
              disabled={isLoading}
              className="w-full h-12 bg-blue-700 hover:bg-blue-600 text-white font-bold tracking-widest font-mono text-sm shadow-[0_0_20px_rgba(29,78,216,0.35)] hover:shadow-[0_0_25px_rgba(29,78,216,0.5)] transition-all mt-2 disabled:opacity-60"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AUTHENTICATING…
                </span>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  SECURE SIGN IN
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-900 px-3 text-[10px] text-slate-600 font-mono tracking-widest uppercase">
                Demo
              </span>
            </div>
          </div>

          {/* Quick sign-in */}
          <button
            onClick={quickSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border border-dashed border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all text-xs font-mono tracking-wide disabled:opacity-40"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Quick Sign-In as Insp. Martinez #4821
          </button>
        </div>

        {/* Legal notice */}
        <div className="mt-4 px-2 text-center space-y-1.5">
          <p className="text-[10px] text-slate-600 font-mono leading-relaxed">
            Unauthorized access or use of this system is strictly prohibited
            under{" "}
            <span className="text-slate-500">CA Penal Code § 502</span>.
            All activity is monitored and logged.
          </p>
          <p className="text-[9px] text-slate-700 font-mono tracking-wider uppercase">
            Oakland Fire Dept · Prevention Division · WUI Inspection Engine v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
