import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { BarChart3, Bot, KeyRound, LockKeyhole, LogIn, Mail, MessageCircle, ShieldCheck, Sparkles, User } from "lucide-react";

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
    <div className="h-screen w-full overflow-hidden bg-white p-2 md:p-3">
      <main className="mx-auto flex h-full max-w-5xl items-center justify-center overflow-hidden">
        <section className="grid h-full w-full overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative hidden h-full overflow-hidden rounded-l-[24px] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-8 py-8 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_32%,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_5%_94%,rgba(255,255,255,0.11),transparent_26%)]" />
            <div className="absolute right-16 top-24 h-72 w-72 rounded-full bg-white/10" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/15 px-6 py-3 text-sm font-bold shadow-lg backdrop-blur-md">
                  <Bot size={19} />
                  WhatsApp Bot Admin
                </div>
                <div className="mt-8 max-w-lg">
                  <h1 className="text-4xl font-black leading-[1.15] tracking-tight xl:text-5xl">
                    Manage your smart bot from one clean dashboard.
                  </h1>
                  <p className="mt-5 max-w-md text-base leading-7 text-white/85">
                    Login securely, manage bookings, automate replies, track customers, and monitor bot performance in real time.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-white/20 bg-white/15 p-5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                    <MessageCircle size={26} />
                    <h3 className="mt-4 text-3xl font-black leading-none">24/7</h3>
                    <p className="mt-1 text-sm text-white/75">Auto replies</p>
                  </div>
                  <div className="rounded-3xl border border-white/20 bg-white/15 p-5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                    <BarChart3 size={26} />
                    <h3 className="mt-4 text-3xl font-black leading-none">Live</h3>
                    <p className="mt-1 text-sm text-white/75">Analytics</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/20 bg-white/15 p-5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h4 className="font-black">Secure admin access</h4>
                      <p className="mt-1 text-sm text-white/75">Protected dashboard for your business bot.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-full items-center justify-center overflow-hidden rounded-r-[24px] bg-white/80 px-6 py-6 sm:px-8 lg:px-9">
            <div className="w-full max-w-[410px] py-1">
              <div className="mb-6">
                <div className="mb-5 flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-xl shadow-violet-500/20">
                  <Bot size={24} />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-slate-950">
                  {mode === "login" && "Welcome back"}
                  {mode === "forgot" && "Reset password"}
                  {mode === "reset" && "Set new password"}
                  {mode === "bootstrap" && "First admin setup"}
                </h2>
                <p className="mt-2 text-base font-medium text-slate-500">
                  {mode === "login" && "Login to continue to your WhatsApp bot admin panel."}
                  {mode === "forgot" && "Enter your email address and receive a secure reset link."}
                  {mode === "reset" && "Set a new secure password for your admin account."}
                  {mode === "bootstrap" && "Create your first admin account to start managing the bot."}
                </p>
              </div>

              <div className="space-y-4">
                {(mode === "login" || mode === "forgot" || mode === "bootstrap") && (
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-900">Email address</label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                      <Mail size={18} className="text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                        placeholder="Enter email"
                      />
                    </div>
                  </div>
                )}

                {(mode === "login" || mode === "bootstrap") && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label className="block text-sm font-bold text-slate-900">Password</label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => setLocation("/forgot-password")}
                          className="text-sm font-bold text-blue-600 hover:text-violet-600"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                      <LockKeyhole size={18} className="text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
                )}

                {mode === "bootstrap" && (
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-900">Name optional</label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                      <User size={18} className="text-slate-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                        placeholder="Admin user"
                      />
                    </div>
                  </div>
                )}

                {mode === "reset" && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-900">Reset token</label>
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                        <KeyRound size={18} className="text-slate-400" />
                        <input
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                          placeholder="Paste token"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-900">New password</label>
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                        <LockKeyhole size={18} className="text-slate-400" />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                          placeholder="min 6 characters"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-900">Confirm password</label>
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-500/10">
                        <LockKeyhole size={18} className="text-slate-400" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
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
                    className="mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-4 text-base font-black text-white shadow-[0_14px_30px_rgba(79,70,229,0.35)] transition duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                  >
                    <LogIn size={19} />
                    Login
                  </button>
                )}
                {mode === "forgot" && (
                  <button
                    disabled={busy}
                    onClick={submitForgot}
                    className="mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-4 text-base font-black text-white shadow-[0_14px_30px_rgba(79,70,229,0.35)] transition duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                  >
                    <KeyRound size={19} />
                    Send Reset Link
                  </button>
                )}
                {mode === "reset" && (
                  <button
                    disabled={busy}
                    onClick={submitReset}
                    className="mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-base font-black text-white shadow-[0_14px_30px_rgba(5,150,105,0.35)] transition duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                  >
                    <ShieldCheck size={19} />
                    Reset Password
                  </button>
                )}
                {mode === "bootstrap" && (
                  <button
                    disabled={busy}
                    onClick={submitBootstrap}
                    className="mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-4 text-base font-black text-white shadow-[0_14px_30px_rgba(79,70,229,0.35)] transition duration-300 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                  >
                    <ShieldCheck size={19} />
                    Create Admin
                  </button>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLocation("/login")}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition ${
                      mode === "login"
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-blue-500/10"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition ${
                      mode === "forgot"
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-blue-500/10"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    Forgot
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation("/create-admin")}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition ${
                      mode === "bootstrap"
                        ? "border-violet-500 bg-violet-50 text-violet-700 shadow-violet-500/10"
                        : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                    }`}
                  >
                    First setup
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3.5 text-sm font-medium leading-6 text-blue-800">
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
