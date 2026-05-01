import { useState } from "react";
import { Label } from "radix-ui";
import { ArrowRight, BookOpenCheck, KeyRound, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";
import supabase from "../../helpers/supabase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState({ tone: "", text: "" });
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage({ tone: "", text: "" });

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage({ tone: "error", text: error.message });
      setLoading(false);
      return;
    }

    navigate("/dashboard");
  };

  const handleForgotPassword = async () => {
    setMessage({ tone: "", text: "" });

    if (!email) {
      setMessage({ tone: "error", text: "Enter your email address first, then request a reset link." });
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setResetLoading(false);

    if (error) {
      setMessage({ tone: "error", text: error.message });
      return;
    }

    setMessage({ tone: "success", text: "Password reset link sent. Please check your email inbox." });
  };

  return (
    <div className="grid min-h-screen w-full place-items-center bg-slate-950 p-4 text-slate-900 sm:p-6">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[680px] overflow-hidden bg-slate-900 p-10 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.35),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.22),transparent_24%),linear-gradient(135deg,#0f172a,#111827)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-blue-100">
                <Sparkles size={15} />
                Modern library operations
              </div>
              <h1 className="mt-8 max-w-md text-5xl font-bold leading-tight">Run your library with clarity, control, and calm.</h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
                Track members, seats, payments, expenses, tasks, and business intelligence from one focused workspace.
              </p>
            </div>

            <div className="relative mx-auto h-80 w-80">
              <div className="absolute inset-x-8 bottom-6 h-44 rounded-2xl border border-blue-200/30 bg-blue-500/15 shadow-2xl backdrop-blur" />
              <div className="absolute left-8 top-10 h-52 w-36 rotate-[-8deg] rounded-xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur">
                <div className="h-3 w-20 rounded-full bg-blue-300" />
                <div className="mt-8 space-y-3">
                  <div className="h-2 rounded-full bg-white/40" />
                  <div className="h-2 rounded-full bg-white/30" />
                  <div className="h-2 w-20 rounded-full bg-white/30" />
                </div>
              </div>
              <div className="absolute right-8 top-2 h-60 w-40 rotate-[7deg] rounded-xl border border-white/20 bg-white p-4 text-slate-900 shadow-2xl">
                <BookOpenCheck className="text-blue-600" size={32} />
                <div className="mt-8 grid grid-cols-3 gap-2">
                  {Array.from({ length: 12 }, (_, index) => (
                    <div key={index} className={`h-8 rounded ${index % 4 === 0 ? "bg-blue-600" : "bg-slate-100"}`} />
                  ))}
                </div>
                <div className="mt-5 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="absolute bottom-0 left-20 right-14 rounded-xl border border-white/15 bg-slate-950/80 p-4 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Monthly margin</span>
                  <span className="font-bold text-emerald-300">Healthy</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <div className="font-bold">Seats</div>
                <div className="mt-1 text-slate-300">Live status</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <div className="font-bold">Finance</div>
                <div className="mt-1 text-slate-300">BI metrics</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <div className="font-bold">Tasks</div>
                <div className="mt-1 text-slate-300">Daily ops</div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center p-5 sm:p-8 lg:min-h-[680px]">
          <form onSubmit={handleLogin} className="w-full max-w-md space-y-5">
            <div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                <ShieldCheck size={22} />
              </div>
              <h2 className="mt-5 text-3xl font-bold text-slate-950">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">Sign in to manage Library Pro.</p>
            </div>

            {message.text && (
              <div
                className={`border p-3 text-sm ${
                  message.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Label.Root className="text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </Label.Root>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label.Root className="text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </Label.Root>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-blue-300"
                >
                  {resetLoading ? "Sending..." : "Forgot password?"}
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
