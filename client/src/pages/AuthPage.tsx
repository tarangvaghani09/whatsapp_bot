import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { BarChart3, Bot, KeyRound, LockKeyhole, LogIn, Mail, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

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
    return "login";
  }, [location]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  async function submitForgot() {
    setBusy(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      const data = await res.json().catch(() => null);
      setMsg(data?.message || "Reset link sent successfully. Please check your email.");
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
    <div className="h-screen w-full overflow-hidden bg-slate-100 p-0 sm:bg-white sm:p-2 md:p-3">
      <main className="mx-auto flex h-full max-w-[1240px] items-center justify-center overflow-hidden">
        <section className="grid h-full max-h-[920px] w-full overflow-hidden rounded-none border-0 bg-white shadow-none sm:rounded-[28px] sm:border sm:border-white/70 sm:shadow-[0_30px_90px_rgba(15,23,42,0.16)] lg:grid-cols-[0.82fr_1.18fr]">
          <div className="relative hidden h-full overflow-hidden rounded-l-[28px] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-9 pt-10 pb-16 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_32%,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_5%_94%,rgba(255,255,255,0.11),transparent_26%)]" />
            <div className="absolute right-12 top-20 h-72 w-72 rounded-full bg-white/10" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/15 px-5 py-2.5 text-xs font-extrabold tracking-[0.06em] shadow-lg backdrop-blur-md">
                  <Bot size={19} />
                  WhatsApp Bot Admin
                </div>
                <div className="mt-9 max-w-[26rem]">
                  <h1 className="text-[3rem] font-black leading-[1.04] tracking-[-0.02em] text-white [text-wrap:balance]">
                    Manage your smart bot from one clean dashboard.
                  </h1>
                  <p className="mt-4 max-w-md text-[1.02rem] font-medium leading-7 text-indigo-100/95">
                    Login securely, manage bookings, automate replies, track customers, and monitor bot performance in real time.
                  </p>
                </div>
              </div>
              <div className="space-y-4 pb-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-white/20 bg-white/15 p-4.5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                    <MessageCircle size={26} />
                    <h3 className="mt-3 text-3xl font-black leading-none tracking-tight">24/7</h3>
                    <p className="mt-1 text-sm font-medium text-indigo-100/90">Auto replies</p>
                  </div>
                  <div className="rounded-3xl border border-white/20 bg-white/15 p-4.5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                    <BarChart3 size={26} />
                    <h3 className="mt-3 text-3xl font-black leading-none tracking-tight">Live</h3>
                    <p className="mt-1 text-sm font-medium text-indigo-100/90">Analytics</p>
                  </div>
                </div>
                <div className="mb-4 rounded-3xl border border-white/20 bg-white/15 p-4 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h4 className="font-extrabold tracking-tight">Secure admin access</h4>
                      <p className="mt-1 text-sm font-medium text-indigo-100/90">Protected dashboard for your business bot.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-full items-center justify-center overflow-hidden rounded-none bg-white/95 px-6 py-7 sm:rounded-r-[28px] sm:bg-white/90 sm:px-8 sm:py-6 lg:px-9">
            <div className="w-full max-w-[520px] py-1">
              <div className="mb-6">
                <div className="mb-5 flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-xl shadow-violet-500/20">
                  <Bot size={24} />
                </div>
                <h2 className="text-[2rem] font-black leading-[1.08] tracking-tight text-slate-950 sm:text-[2.7rem] sm:leading-[1.05]">
                  {mode === "login" && "Welcome back"}
                  {mode === "forgot" && "Reset password"}
                  {mode === "reset" && "Set new password"}
                </h2>
                <p className="mt-2.5 text-[0.98rem] font-medium text-slate-500">
                  {mode === "login" && "Login to continue to your WhatsApp bot admin panel."}
                  {mode === "forgot" && "Enter your email address and receive a secure reset link."}
                  {mode === "reset" && "Set a new secure password for your admin account."}
                </p>
              </div>

              <div className="space-y-4.5">
                {(mode === "login" || mode === "forgot") && (
                  <div>
                    <label className="mb-2 block text-[0.92rem] font-bold text-slate-900">Email address</label>
                    <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                      <Mail size={18} className="text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-transparent text-[0.92rem] font-medium text-slate-900 outline-none placeholder:text-slate-400"
                        placeholder="Enter email"
                      />
                    </div>
                  </div>
                )}

                {mode === "login" && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label className="block text-[0.92rem] font-bold text-slate-900">Password</label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => setLocation("/forgot-password")}
                          className="text-[0.9rem] font-bold text-blue-600 hover:text-violet-600"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                      <LockKeyhole size={18} className="text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent text-[0.92rem] font-medium text-slate-900 outline-none placeholder:text-slate-400"
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
                )}

                {mode === "reset" && (
                  <>
                    <div>
                      <label className="mb-2 block text-[0.92rem] font-bold text-slate-900">Reset token</label>
                      <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                        <KeyRound size={18} className="text-slate-400" />
                        <input
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          className="w-full bg-transparent text-[0.92rem] font-medium text-slate-900 outline-none placeholder:text-slate-400"
                          placeholder="Paste token"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[0.92rem] font-bold text-slate-900">New password</label>
                      <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                        <LockKeyhole size={18} className="text-slate-400" />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-transparent text-[0.92rem] font-medium text-slate-900 outline-none placeholder:text-slate-400"
                          placeholder="min 6 characters"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[0.92rem] font-bold text-slate-900">Confirm password</label>
                      <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                        <LockKeyhole size={18} className="text-slate-400" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-transparent text-[0.92rem] font-medium text-slate-900 outline-none placeholder:text-slate-400"
                          placeholder="re-enter new password"
                        />
                      </div>
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
                  <button
                    disabled={busy}
                    onClick={submitLogin}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-[1.3rem] font-black text-white shadow-[0_14px_30px_rgba(79,70,229,0.35)] transition duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 sm:h-14 sm:text-[1.55rem]"
                  >
                    <LogIn size={19} />
                    Login
                  </button>
                )}
                {mode === "forgot" && (
                  <button
                    disabled={busy}
                    onClick={submitForgot}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-[0.98rem] font-black text-white shadow-[0_14px_30px_rgba(79,70,229,0.35)] transition duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 sm:h-14"
                  >
                    <KeyRound size={19} />
                    Send Reset Link
                  </button>
                )}
                {mode === "reset" && (
                  <button
                    disabled={busy}
                    onClick={submitReset}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-[0.98rem] font-black text-white shadow-[0_14px_30px_rgba(5,150,105,0.35)] transition duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 sm:h-14"
                  >
                    <ShieldCheck size={19} />
                    Reset Password
                  </button>
                )}
                {(mode === "forgot" || mode === "reset") && (
                  <button
                    type="button"
                    onClick={() => setLocation("/login")}
                    className="w-full pt-1 text-sm font-bold text-blue-700 hover:text-violet-700"
                  >
                    Back to Login
                  </button>
                )}
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3.5 text-[0.92rem] font-medium leading-6 text-blue-800">
                  <div className="flex gap-3">
                    <Sparkles size={20} className="mt-0.5 shrink-0" />
                    <p>
                      Premium admin UI with secure login, clean spacing, modern shadows, and responsive layout.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
