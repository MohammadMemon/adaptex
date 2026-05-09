"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertTriangle, ArrowLeft, Trophy, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/lib/auth-context";
import { getTodaysTasks, updateTopicStatus } from "@/lib/db";

export default function DailyTrackingPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (!user) return;
    async function fetchTasks() {
      try {
        const data = await getTodaysTasks(user.id);
        setTasks(data);
        setCompletedCount(data.filter((t) => t.status === "completed").length);
        const firstPending = data.findIndex((t) => t.status !== "completed");
        setCurrentIndex(firstPending >= 0 ? firstPending : data.length);
      } catch (err) {
        console.error("Fetch tasks error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [user]);

  const isFinished = currentIndex >= tasks.length;
  const totalProgress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 100;

  const handleAction = async (actionType) => {
    const task = tasks[currentIndex];
    let newStatus = "pending";
    if (actionType === "done") {
      newStatus = "completed";
      setDirection(1);
      setCompletedCount((prev) => prev + 1);
    } else if (actionType === "weak") {
      newStatus = "weak";
      setDirection(-1);
    } else {
      newStatus = "skipped";
      setDirection(-1);
    }

    try {
      await updateTopicStatus(task.id, newStatus);
    } catch (err) {
      console.error("Update status error:", err);
    }

    setTimeout(() => {
      let nextIdx = currentIndex + 1;
      while (nextIdx < tasks.length && tasks[nextIdx].status === "completed") {
        nextIdx++;
      }
      setCurrentIndex(nextIdx);
      setDirection(0);

      if (nextIdx >= tasks.length) {
        triggerConfetti();
      }
    }, 300);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#4ade80", "#3b82f6", "#f472b6"],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No tasks for today</h2>
        <p className="text-sm text-muted-foreground mb-6">You either have no active subjects or today is outside your study window.</p>
        <Button size="sm" asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-0 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-primary/5 rounded-full blur-[80px] md:blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-secondary/5 rounded-full blur-[80px] md:blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="p-4 md:p-6 flex items-center justify-between relative z-10">
        <Button variant="ghost" size="icon" asChild className="rounded-full h-9 w-9">
          <Link href="/dashboard"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="text-center">
          <h2 className="font-semibold text-sm md:text-lg">Today's Focus</h2>
          <p className="text-[11px] md:text-xs text-muted-foreground">{completedCount} / {tasks.length} completed</p>
        </div>
        <div className="w-9" />
      </header>

      {/* Progress Bar */}
      <div className="px-4 md:px-6 mb-4 md:mb-8 relative z-10">
        <Progress value={totalProgress} className="h-1.5" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative z-10">
        <AnimatePresence mode="wait">
          {!isFinished ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: direction * 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: direction * -80, scale: 0.95 }}
              transition={{ duration: 0.25, type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm md:max-w-md"
            >
              <div className="bg-card border border-border/50 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-foreground/10" />
                
                <div className="flex items-center justify-between mb-4 md:mb-6 gap-2">
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] md:text-xs font-medium text-muted-foreground truncate max-w-[60%]">
                    {tasks[currentIndex].subjectName}
                  </span>
                  {tasks[currentIndex].importance && (
                    <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${
                      tasks[currentIndex].importance === "high" ? "bg-foreground/10 text-foreground border-foreground/20" :
                      tasks[currentIndex].importance === "medium" ? "bg-foreground/5 text-muted-foreground border-border" :
                      "bg-foreground/5 text-muted-foreground/60 border-border/50"
                    }`}>
                      {tasks[currentIndex].importance}
                    </span>
                  )}
                </div>
                
                <h3 className="text-xl md:text-3xl font-bold leading-tight mb-1.5">
                  {tasks[currentIndex].topicName}
                </h3>
                
                <p className="text-muted-foreground mb-4 text-xs md:text-sm">
                  Day {tasks[currentIndex].scheduledDay} · {currentIndex + 1} of {tasks.length}
                </p>

                {/* Focus Points */}
                {tasks[currentIndex].focusPoints?.length > 0 && (
                  <div className="mb-3 md:mb-4 bg-muted/30 rounded-xl p-3 md:p-4 border border-border/50">
                    <h4 className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">🎯 Focus On</h4>
                    <ul className="space-y-1">
                      {tasks[currentIndex].focusPoints.map((pt, i) => (
                        <li key={i} className="text-xs md:text-sm flex items-start gap-1.5">
                          <span className="text-foreground/30 mt-0.5">•</span> {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Revision Tip */}
                {tasks[currentIndex].revisionTip && (
                  <div className="mb-4 md:mb-6 bg-accent/50 border border-border/50 rounded-xl p-3">
                    <p className="text-xs md:text-sm"><span className="font-medium">⚡</span> {tasks[currentIndex].revisionTip}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  <Button 
                    variant="outline" 
                    className="h-16 md:h-20 flex flex-col gap-1.5 rounded-xl md:rounded-2xl group"
                    onClick={() => handleAction("skipped")}
                  >
                    <XCircle className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="text-[10px] md:text-xs">Skip</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-16 md:h-20 flex flex-col gap-1.5 rounded-xl md:rounded-2xl group"
                    onClick={() => handleAction("weak")}
                  >
                    <AlertTriangle className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="text-[10px] md:text-xs">Weak</span>
                  </Button>

                  <Button 
                    variant="default" 
                    className="h-16 md:h-20 flex flex-col gap-1.5 rounded-xl md:rounded-2xl hover:-translate-y-0.5 transition-all"
                    onClick={() => handleAction("done")}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[10px] md:text-xs">Done</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
              className="text-center px-4"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <Trophy className="w-10 h-10 md:w-12 md:h-12 text-primary" />
              </div>
              <h2 className="text-2xl md:text-4xl font-bold mb-3">You did it!</h2>
              <p className="text-sm md:text-xl text-muted-foreground mb-6 md:mb-8">
                All tasks done for today. <br/> Take a well-deserved break!
              </p>
              <Button size="sm" className="rounded-full px-6" asChild>
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
