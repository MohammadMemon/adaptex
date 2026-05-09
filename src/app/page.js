"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, BookOpen, Target, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: <Upload className="h-5 w-5" />,
    title: "Upload",
    description: "Upload your syllabus and PYQs. Topics are extracted automatically.",
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Learn",
    description: "Get a day-wise study plan based on your available time.",
  },
  {
    icon: <Target className="h-5 w-5" />,
    title: "Track",
    description: "Mark topics as done, weak, or skipped in your daily tracker.",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Improve",
    description: "Focus on weak topics and revise before your exams.",
  },
];

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-24 overflow-hidden relative min-h-screen">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <main className="max-w-5xl w-full flex flex-col items-center gap-10 md:gap-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-4 md:space-y-6 pt-8 md:pt-0"
        >
          <div className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground mb-2">
            The smarter way to study
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            Upload <span className="text-muted-foreground/40">→</span> Learn{" "}
            <span className="text-muted-foreground/40">→</span> Track{" "}
            <span className="text-muted-foreground/40">→</span> Improve
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground max-w-xl mx-auto px-2">
            Adaptex structures your syllabus, creates a daily study plan, and tracks your progress so you can focus on studying.
          </p>
          <div className="pt-4 md:pt-8">
            <Link href="/dashboard">
              <Button size="lg" className="rounded-full px-6 md:px-8 h-11 md:h-14 text-sm md:text-lg font-semibold hover:-translate-y-0.5 transition-all">
                Start Tracking <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="w-full mt-4 md:mt-16 pb-8"
        >
          <h2 className="text-lg md:text-2xl font-semibold text-center mb-6 md:mb-10">How it works</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 px-1">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="bg-card border border-border/50 rounded-xl md:rounded-2xl p-4 md:p-6"
              >
                <div className="h-9 w-9 md:h-11 md:w-11 rounded-lg bg-muted flex items-center justify-center mb-3 md:mb-5 text-muted-foreground">
                  {step.icon}
                </div>
                <h3 className="text-sm md:text-lg font-semibold mb-1">{step.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
