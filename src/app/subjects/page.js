"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, PlusCircle, ArrowRight, Loader2, Calendar, Target } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getSubjectsForUser } from "@/lib/db";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } };

export default function SubjectsListPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      try {
        const data = await getSubjectsForUser(user.id);
        setSubjects(data);
      } catch (err) {
        console.error("Fetch subjects error:", err);
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

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-5xl mx-auto">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {subjects.length > 0 ? `${subjects.length} subject${subjects.length > 1 ? "s" : ""}` : "No subjects yet"}
          </p>
        </div>
        <Link href="/subjects/new">
          <Button asChild> <PlusCircle className="w- 4h-4" /> Add Subject
          </Button>

        </Link>
      </motion.div>

      {subjects.length === 0 ? (
        <motion.div variants={fadeUp}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/15 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">Upload your syllabus and PYQs to get started</p>
              <Button asChild>
                <Link href="/subjects/new"><PlusCircle className="w-4 h-4" /> Create Subject</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {subjects.map((subject) => (
            <motion.div key={subject.id} variants={fadeUp}>
              <Link href={`/subjects/${subject.id}`}>
                <Card className="card-hover cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate group-hover:text-foreground transition-colors">{subject.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {subject.studyDurationDays}d</span>
                          <span>{subject.totalTopics} topics</span>
                        </div>
                      </div>
                      <span className="text-lg font-semibold tabular-nums">{subject.progress}%</span>
                    </div>
                    <Progress value={subject.progress} className="h-1 mb-2" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{subject.completedTopics} completed</span>
                      <div className="flex gap-2">
                        {subject.weakTopics > 0 && <span>{subject.weakTopics} weak</span>}
                        {subject.skippedTopics > 0 && <span>{subject.skippedTopics} skipped</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
