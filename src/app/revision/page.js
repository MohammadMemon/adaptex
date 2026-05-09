"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getWeakAndSkippedTopics, updateTopicStatus } from "@/lib/db";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } };

export default function RevisionPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      try {
        const data = await getWeakAndSkippedTopics(user.id);
        setTasks(data);
      } catch (err) {
        console.error("Fetch revision error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const handleAction = async (topicId, action) => {
    const newStatus = action === "revised" ? "completed" : "pending";
    try {
      await updateTopicStatus(topicId, newStatus);
      setTasks(tasks.filter((t) => t.id !== topicId));
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-4xl mx-auto">
      <motion.div variants={fadeUp}>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Revision Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tasks.length > 0 ? `${tasks.length} topic${tasks.length > 1 ? "s" : ""} need review` : "All caught up!"}
        </p>
      </motion.div>

      {tasks.length === 0 ? (
        <motion.div variants={fadeUp}>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="font-medium mb-1">All caught up!</p>
              <p className="text-sm text-muted-foreground">No weak or missed topics. Great job!</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <motion.div key={task.id} variants={fadeUp}>
              <Card>
                <CardContent className="p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${task.status === "weak" ? "bg-muted" : "bg-muted"}`}>
                        {task.status === "weak" ? <AlertTriangle className="w-4 h-4 text-muted-foreground" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium truncate">{task.topicName}</h3>
                        <p className="text-xs text-muted-foreground truncate">{task.subjectName}</p>
                        {task.unitName && (
                          <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{task.unitName}</p>
                        )}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                        task.status === "weak" ? "bg-foreground/10 text-foreground" : "bg-foreground/5 text-muted-foreground"
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 sm:shrink-0">
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-8 text-xs" onClick={() => handleAction(task.id, "re-add")}>
                        <RefreshCw className="w-3 h-3 mr-1.5" /> Re-add
                      </Button>
                      <Button size="sm" className="flex-1 sm:flex-none h-8 text-xs" onClick={() => handleAction(task.id, "revised")}>
                        Mark Revised
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
