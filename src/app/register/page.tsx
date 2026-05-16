"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Mail, Lock, ArrowRight, Loader2, User } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        setError(errorData || "Registration failed");
        setIsLoading(false);
      } else {
        router.push("/login");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-black relative overflow-hidden">
      {/* Background Gradients and Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-32 z-10 w-full max-w-2xl mx-auto">
        <div className="mx-auto w-full max-w-sm lg:w-[400px]">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6">
              <LineChart className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Create an account
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Join the AI Ecommerce Analytics Platform
            </p>
          </div>

          <div className="mt-8">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 py-8 px-6 shadow-2xl rounded-3xl sm:px-10 relative overflow-hidden">
              {/* Glassmorphism subtle glow inside card */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none" />
              
              <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-center justify-center animate-in fade-in slide-in-from-top-2">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                    Full Name
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-10 bg-slate-950/50 border border-slate-800 rounded-xl py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                    Email address
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 bg-slate-950/50 border border-slate-800 rounded-xl py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                      placeholder="admin@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                    Password
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 bg-slate-950/50 border border-slate-800 rounded-xl py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300"
                      placeholder="Password"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-black bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-amber-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Sign up
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
            
            <p className="mt-8 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-amber-500 hover:text-amber-400">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      {/* Right Side Image/Graphic for larger screens */}
      <div className="hidden lg:block relative w-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-black">
          <div className="absolute inset-0 bg-gradient-to-bl from-amber-900/20 to-black z-10" />
          <div className="h-full w-full object-cover flex items-center justify-center relative z-20">
            <div className="w-[80%] aspect-video bg-slate-950/80 backdrop-blur-3xl rounded-2xl border border-white/5 shadow-2xl overflow-hidden flex flex-col relative group">
              <div className="h-8 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="h-24 flex-1 bg-white/5 rounded-xl animate-pulse" />
                  <div className="h-24 flex-1 bg-white/5 rounded-xl animate-pulse delay-75" />
                  <div className="h-24 flex-1 bg-white/5 rounded-xl animate-pulse delay-150" />
                </div>
                <div className="flex-1 bg-white/5 rounded-xl relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-amber-500/20 to-transparent" />
                  <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                    <path d="M0,100 C100,80 200,120 300,40 L300,200 L0,200 Z" fill="rgba(245, 158, 11, 0.1)" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="2" className="group-hover:stroke-amber-400 transition-colors duration-700" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
