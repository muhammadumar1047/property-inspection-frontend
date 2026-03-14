"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login, isSuperAdmin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(email, password, rememberMe);
      if (!success) {
        setError("Invalid email or password");
      } else {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed.isSuperAdmin) {
            router.push("/super-admin");
          } else {
            router.push("/dashboard");
          }
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Carousel state and slides
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      title: "Professional Property Inspections",
      description: "Comprehensive inspections with detailed reporting and documentation for every property",
      image: "/property-inspection.png",
    },
    {
      title: "Advanced Reporting Tools",
      description: "Generate professional reports with photos, notes, and recommendations in minutes",
      image: "/inspection-report.png",
    },
    {
      title: "Real-time Collaboration",
      description: "Work seamlessly with your team and clients across all devices in real-time",
      image: "/team-collaboration.png",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left visual panel */}
      <div className="hidden lg:block relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-[#0058AD] to-[var(--secondary)]" />

        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-white/5 animate-float" />
          <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-white/5 animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/3 left-1/4 w-[200px] h-[200px] rounded-full bg-white/5 animate-float" style={{ animationDelay: '0.8s' }} />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        {/* Slides */}
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
            >
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-out"
                style={{ 
                  backgroundImage: `url(${slide.image})`,
                  transform: index === currentSlide ? 'scale(1.1)' : 'scale(1)'
                }}
              />
              {/* Overlay for readability */}
              <div className="absolute inset-0 bg-black/40" />
              {/* Slide content */}
              <div className="relative z-10 h-full flex flex-col justify-between px-12 py-12 text-white">
                {/* Logo */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-lg shrink-0">
                    <img src="/icon-logo.png" alt="" className="w-8 h-8 rounded-lg" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold tracking-tight text-white leading-none">PropCheck</span>
                    <span className="text-sm font-medium text-white/60 tracking-[0.2em] uppercase mt-0.5">360 Dashboard</span>
                  </div>
                </div>



                {/* Main content */}
                <div className="space-y-5 max-w-lg">
                  <h2 className="text-4xl font-bold leading-tight text-balance">{slide.title}</h2>
                  <p className="text-lg text-white/80 leading-relaxed text-pretty">{slide.description}</p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['Inspections', 'Reports', 'Analytics', 'Multi-tenant'].map((tag) => (
                      <span key={tag} className="px-3 py-1 text-xs font-medium bg-white/10 rounded-full border border-white/15 backdrop-blur-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Indicators */}
                <div className="flex items-center gap-3">
                  {slides.map((_, dotIndex) => (
                    <button
                      key={dotIndex}
                      onClick={() => setCurrentSlide(dotIndex)}
                      className={`transition-all duration-300 rounded-full ${dotIndex === currentSlide
                          ? "w-8 h-2 bg-white"
                          : "w-2 h-2 bg-white/40 hover:bg-white/60"
                        }`}
                      aria-label={`Go to slide ${dotIndex + 1}`}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex items-center justify-center bg-[var(--background)] p-6 md:p-10">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8 gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md shrink-0">
              <img src="/icon-logo.png" alt="" className="w-6 h-6 rounded-md" />
            </div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">PropCheck360</h1>
          </div>



          <Card className="glass-card !rounded-2xl !shadow-[var(--shadow-modal)]">
            <CardHeader className="text-center space-y-1 pb-2">
              <CardTitle className="!text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>Sign in to your account to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-[var(--muted-400)] hover:text-[var(--foreground)] transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-[var(--muted-400)] hover:text-[var(--foreground)] transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(!!checked)}
                    />
                    <Label htmlFor="remember" className="!text-sm !text-[var(--muted-foreground)] !font-normal">
                      Remember me
                    </Label>
                  </div>
                  <Link href="/forgot-password" className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors">
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-[var(--destructive)] bg-[var(--destructive-50)] rounded-lg px-3 py-2.5 border border-[var(--destructive)]/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t border-[var(--border)] text-center">
                <p className="text-xs text-[var(--muted-400)]">
                  Test: super@gmail.com / Super123
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-[var(--muted-400)] mt-6">
            © 2026 PropCheck360. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
