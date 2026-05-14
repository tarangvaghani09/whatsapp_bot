import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Bot, KeyRound, LogIn, Mail, ShieldCheck } from "lucide-react";

type Props = {
  onAuthed: () => void;
};

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error && typeof data.error === "string") return data.error;
  } catch {
    // ignore
  }
  return `Request failed (${res.status})`;
}

export default function AuthPage({ onAuthed }: Props) {
  const [location, setLocation] = useLocation();
  const mode = useMemo(() => {
    if (location.startsWith("/forgot-password")) return "forgot";
    if (location.startsWith("/reset-password")) return "reset";
    if (location.startsWith("/create-admin")) return "bootstrap";
    return "login";
  }, [location]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState(new URLSearchParams(window.location.search).get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setMsg("");
    setErr("");
  }, [mode]);

  async function submitLogin() {
    setBusy(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      onAuthed();
      setLocation("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitBootstrap() {
    setBusy(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      onAuthed();
      setLocation("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bootstrap failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot() {
    setBusy(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      setMsg("If email exists, reset link has been sent.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    setBusy(true); setErr(""); setMsg("");
    try {
      if (newPassword !== confirmPassword) {
        throw new Error("Password and confirm password must match");
      }
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      setMsg("Password reset successful. You can now login.");
      setTimeout(() => setLocation("/login"), 800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <p className="font-semibold">WhatsApp Bot Admin</p>
          </div>
          <p className="text-sm text-blue-100 mt-1">
            {mode === "login" && "Secure login"}
            {mode === "forgot" && "Password reset request"}
            {mode === "reset" && "Set new password"}
            {mode === "bootstrap" && "Create first admin account"}
          </p>
        </div>

        <div className="p-5 space-y-3">
          {(mode === "login" || mode === "forgot" || mode === "bootstrap") && (
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
              </div>
            </div>
          )}

          {(mode === "login" || mode === "bootstrap") && (
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="password" className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 6 characters" />
              </div>
            </div>
          )}

          {mode === "bootstrap" && (
            <div>
              <label className="text-sm font-medium text-gray-700">Name (optional)</label>
              <input className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={name} onChange={(e) => setName(e.target.value)} placeholder="Admin user" />
            </div>
          )}

          {mode === "reset" && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Reset token</label>
                <input className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={token} onChange={(e) => setToken(e.target.value)} placeholder="paste token" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">New password</label>
                <input type="password" className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="min 6 characters" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Confirm password</label>
                <input type="password" className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="re-enter new password" />
              </div>
            </>
          )}

          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && (
            <p className="text-sm text-green-700 whitespace-pre-wrap break-all rounded-lg bg-green-50 border border-green-200 px-3 py-2">
              {msg}
            </p>
          )}

          {mode === "login" && (
            <button disabled={busy} onClick={submitLogin}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <LogIn className="w-4 h-4" /> Login
            </button>
          )}
          {mode === "forgot" && (
            <button disabled={busy} onClick={submitForgot}
              className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Send Reset Link
            </button>
          )}
          {mode === "reset" && (
            <button disabled={busy} onClick={submitReset}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50">
              Reset Password
            </button>
          )}
          {mode === "bootstrap" && (
            <button disabled={busy} onClick={submitBootstrap}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50">
              Create Admin
            </button>
          )}

          <div className="pt-2">
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                  mode === "login" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setLocation("/login")}
              >
                Login
              </button>
              <button
                className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                  mode === "forgot" ? "bg-white text-amber-700 shadow-sm" : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setLocation("/forgot-password")}
              >
                Forgot password
              </button>
              <button
                className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                  mode === "bootstrap" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setLocation("/create-admin")}
              >
                First setup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
