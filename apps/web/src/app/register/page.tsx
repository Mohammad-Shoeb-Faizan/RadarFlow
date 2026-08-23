"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Building, ArrowRight, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, organizationName }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Organization created successfully", { description: "Welcome to RadarFlow!" });
        router.push("/");
        router.refresh();
      } else {
        toast.error("Registration failed", { description: data.error });
      }
    } catch {
      toast.error("Network error during registration");
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Organization</h1>
          <p className="text-xs text-muted-foreground">
            Start self-hosting and monitoring your distributed services.
          </p>
        </div>

        {/* Register Card */}
        <Card className="border-border/80 shadow-xl bg-card/90 backdrop-blur-md">
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-foreground">Your Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Jane Developer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-foreground">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="jane@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-foreground">Organization / Team Name</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Acme Engineering"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-foreground">Master Password</label>
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
                <span>{isLoading ? "Creating workspace..." : "Create Organization & Project"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </form>

          <CardFooter className="border-t border-border/60 justify-center py-4 text-xs text-muted-foreground">
            <span>Already have an account?</span>
            <Link href="/login" className="ml-1 text-primary hover:underline font-medium">
              Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
