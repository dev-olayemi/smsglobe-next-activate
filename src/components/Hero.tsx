import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-20 md:py-32">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,transparent)] dark:bg-grid-slate-700/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 blur-3xl" />
      
      <div className="container relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm shadow-sm">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="font-medium">190+ Countries • 50K+ Daily Verifications</span>
          </div>

          {/* Main heading */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Get a Virtual Number
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              in 10 Seconds
            </span>
          </h1>

          <p className="mb-10 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
            Instant virtual phone numbers for SMS verification. 
            Fast, secure, and reliable. No registration needed.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="text-base shadow-xl hover:shadow-2xl transition-all" asChild>
              <Link to="/dashboard">
                Start Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base" asChild>
              <Link to="/api-docs">View API Docs</Link>
            </Button>
          </div>

          {/* Feature cards */}
          <div className="grid gap-6 md:grid-cols-3 mt-20">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Instant Activation</h3>
              <p className="text-sm text-muted-foreground">
                Get your number in seconds. No waiting, no delays.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                <Globe className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Global Coverage</h3>
              <p className="text-sm text-muted-foreground">
                Access numbers from 190+ countries worldwide.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Private & Secure</h3>
              <p className="text-sm text-muted-foreground">
                Your data is encrypted and never shared with third parties.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
