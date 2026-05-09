"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, Target, AlertTriangle, ArrowRight, CheckCircle2, Circle, Loader2, PlusCircle, Flame } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getSubjectsForUser, getTodaysTasks } from "@/lib/db";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      try {
        const [subs, tasks] = await Promise.all([
          getSubjectsForUser(user.id),
          getTodaysTasks(user.id),
        ]);
        setSubjects(subs);
        setTodaysTasks(tasks);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const totalTopics = subjects.reduce((sum, s) => sum + s.totalTopics, 0);
  const completedTopics = subjects.reduce((sum, s) => sum + s.completedTopics, 0);
  const weakTopics = subjects.reduce((sum, s) => sum + s.weakTopics, 0);
  const completionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const pendingToday = todaysTasks.filter(t => t.status === "pending").length;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-6xl mx-auto">
      {/* Greeting */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pendingToday > 0
            ? `You have ${pendingToday} topic${pendingToday > 1 ? "s" : ""} to cover today.`
            : "No tasks scheduled for today."}
        </p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={fadeUp} className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Progress</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">{completionRate}%</p>
            <Progress value={completionRate} className="h-1 mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Subjects</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">{subjects.length}</p>
            <p className="text-xs text-muted-foreground mt-2">{totalTopics} total topics</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Completed</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">{completedTopics}</p>
            <p className="text-xs text-muted-foreground mt-2">of {totalTopics} topics</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Needs Review</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">{weakTopics}</p>
            <p className="text-xs text-muted-foreground mt-2">weak topics</p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Subjects */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Subjects</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/subjects">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {subjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="w-10 h-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">No subjects yet</p>
                  <Button variant="outline" asChild>
                    <Link href="/subjects/new"><PlusCircle className="w-4 h-4" /> Add New Subject</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {subjects.slice(0, 5).map((subject) => (
                    <Link key={subject.id} href={`/subjects/${subject.id}`}>
                      <motion.div
                        whileHover={{ x: 3 }}
                        className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors">{subject.name}</p>
                            <span className="text-xs font-medium tabular-nums text-muted-foreground">{subject.progress}%</span>
                          </div>
                          <Progress value={subject.progress} className="h-1" />
                          <div className="flex gap-3 text-[11px] text-muted-foreground">
                            <span>{subject.completedTopics}/{subject.totalTopics} done</span>
                            {subject.weakTopics > 0 && (
                              <span className="text-muted-foreground">{subject.weakTopics} weak</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Plan */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Today</CardTitle>
              <CardDescription className="text-xs">
                {todaysTasks.length > 0
                  ? `${todaysTasks.length} topic${todaysTasks.length > 1 ? "s" : ""} scheduled`
                  : "Nothing scheduled"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {todaysTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Free day</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todaysTasks.slice(0, 6).map((task) => (
                    <motion.div
                      key={task.id}
                      whileHover={{ x: 2 }}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      {task.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-foreground/60 shrink-0" />
                      ) : task.status === "weak" ? (
                        <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                          {task.topicName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{task.subjectName}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
            {todaysTasks.length > 0 && (
              <CardFooter className="pt-0">
                <Link className="cursor-pointer w-full" href="/tracking/daily">
                  <Button className="w-full cursor-pointer" asChild>
                    Start Studying <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
