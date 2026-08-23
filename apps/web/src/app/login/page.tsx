"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Signed in successfully", { description: `Welcome back, ${data.user?.name}` });
        router.push("/");
        router.refresh();
      } else {
        toast.error("Authentication failed", { description: data.error });
      }
    } catch {
      toast.error("Network error during login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("admin@radarflow.io");
    setPassword("admin123");
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary shadow-[0_0_20px_rgba(42,142,255,0.25)]">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a10 10 0 1 0 10 10" />
              <path d="M12 6a6 6 0 1 0 6 6" />
              <path d="M12 10a2 2 0 1 0 2 2" />
              <path d="M12 12l7-7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to RadarFlow</h1>
          <p className="text-xs text-muted-foreground">
            Open-source observability for modern distributed applications.
          </p>
        </div>

        {/* Demo Credentials Box */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Demo Environment Credentials
            </span>
            <Button variant="outline" size="sm" onClick={handleFillDemo} className="h-6 px-2 text-[10px] gap-1">
              <span>Autofill</span>
            </Button>
          </div>
          <div className="text-muted-foreground text-[11px] space-y-0.5">
            <div><span className="text-foreground">Email:</span> admin@radarflow.io</div>
            <div><span className="text-foreground">Password:</span> admin123</div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border/80 shadow-xl bg-card/90 backdrop-blur-md">
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full gap-2 text-xs">
                <span>{isLoading ? "Signing in..." : "Sign In to Dashboard"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </form>

          <CardFooter className="border-t border-border/60 justify-center py-4 text-xs text-muted-foreground">
            <span>Don't have an account?</span>
            <Link href="/register" className="ml-1 text-primary hover:underline font-medium">
              Create organization
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
