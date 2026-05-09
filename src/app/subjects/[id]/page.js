"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle2, Circle, AlertTriangle, BookOpen, FileQuestion, Edit3, Loader2, XCircle, ChevronDown, Lightbulb, Zap } from "lucide-react";
import { getSubjectById, updateTopicStatus, updatePyqStatus } from "@/lib/db";

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } };

export default function SubjectPage() {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedTopic, setExpandedTopic] = useState(null);

  const fetchSubject = async () => {
    try {
      const data = await getSubjectById(id);
      setSubject(data);
    } catch (err) {
      console.error("Fetch subject error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubject(); }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 text-muted-foreground animate-spin" /></div>;
  }

  if (!subject) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-sm">Subject not found.</p>
        <Button variant="outline" size="sm" asChild className="mt-4"><Link href="/dashboard">Back</Link></Button>
      </div>
    );
  }

  const allTopics = subject.units?.flatMap((u) => u.topics) || [];
  const totalTopics = allTopics.length;
  const completedTopics = allTopics.filter((t) => t.status === "completed").length;
  const weakTopics = allTopics.filter((t) => t.status === "weak");
  const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const allPyqs = subject.units?.flatMap((u) => u.topics?.flatMap((t) => (t.pyqs || []).map((p) => ({ ...p, topicName: t.name, unitName: u.name })))) || [];

  const handleToggleTopicStatus = async (topicId, currentStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await updateTopicStatus(topicId, newStatus);
      setSubject((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          topics: u.topics.map((t) => (t.id === topicId ? { ...t, status: newStatus } : t)),
        })),
      }));
    } catch (err) {
      console.error("Update topic error:", err);
    }
  };

  const handlePyqAction = async (pyqId, newStatus) => {
    try {
      await updatePyqStatus(pyqId, newStatus);
      setSubject((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          topics: u.topics.map((t) => ({
            ...t,
            pyqs: (t.pyqs || []).map((p) => (p.id === pyqId ? { ...p, status: newStatus } : p)),
          })),
        })),
      }));
    } catch (err) {
      console.error("Update PYQ error:", err);
    }
  };

  const statusIcon = (status) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-foreground/50 shrink-0" />;
      case "weak": return <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />;
      case "skipped": return <XCircle className="w-4 h-4 text-muted-foreground/50 shrink-0" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground/30 shrink-0" />;
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} className="space-y-6 max-w-4xl mx-auto overflow-hidden">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5 shrink-0 -ml-2" asChild>
            <Link href="/subjects"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate">{subject.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {completedTopics}/{totalTopics} topics · {subject.study_duration_days} days
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground shrink-0" asChild>
          <Link href={`/subjects/${id}/edit`}><Edit3 className="w-3.5 h-3.5 md:mr-1.5" /> <span className="hidden md:inline">Edit</span></Link>
        </Button>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Progress value={progress} className="h-1.5" />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{progress}% complete</span>
          {weakTopics.length > 0 && <span>{weakTopics.length} weak</span>}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="overflow-hidden">
        <Tabs defaultValue="syllabus" className="w-full overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 max-w-[200px] h-9">
            <TabsTrigger value="syllabus" className="text-xs">Syllabus</TabsTrigger>
            <TabsTrigger value="pyqs" className="text-xs">PYQs</TabsTrigger>
          </TabsList>

          <TabsContent value="syllabus" className="space-y-3 mt-4 overflow-hidden">
            {subject.units?.map((unit) => {
              const unitTopics = unit.topics || [];
              const unitCompleted = unitTopics.filter((t) => t.status === "completed").length;
              const unitProgress = unitTopics.length > 0 ? Math.round((unitCompleted / unitTopics.length) * 100) : 0;

              return (
                <Card key={unit.id}>
                  <CardHeader className="pb-2 px-4 md:px-5 pt-4">
                    <div className="flex justify-between items-start gap-4">
                      <CardTitle className="text-sm font-medium flex-1 min-w-0 leading-tight">{unit.name}</CardTitle>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 mt-0.5">{unitCompleted}/{unitTopics.length}</span>
                    </div>
                    <Progress value={unitProgress} className="h-1 mt-2" />
                  </CardHeader>
                  <CardContent className="px-2 md:px-3 pb-3 pt-1 overflow-hidden">
                    {unitTopics.map((topic) => {
                      const isExpanded = expandedTopic === topic.id;
                      const focusPoints = topic.focus_points || [];
                      const revisionTip = topic.revision_tip || "";
                      const topicPyqs = topic.pyqs || [];
                      const hasDetails = focusPoints.length > 0 || revisionTip || topicPyqs.length > 0;

                      return (
                        <div key={topic.id} className="rounded-lg overflow-hidden">
                          {/* Row */}
                          <div
                            className={`flex items-center gap-1.5 md:gap-2.5 px-1.5 md:px-2 py-2 rounded-lg transition-colors cursor-pointer group ${isExpanded ? "bg-accent/50" : "hover:bg-accent/30"
                              }`}
                            onClick={() => hasDetails && setExpandedTopic(isExpanded ? null : topic.id)}
                          >
                            {statusIcon(topic.status)}
                            <span className={`flex-1 text-xs md:text-sm truncate min-w-0 ${topic.status === "completed" ? "line-through text-muted-foreground" : ""
                              }`}>
                              {topic.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0 hidden sm:inline">D{topic.scheduled_day}</span>
                            {topic.importance && topic.importance !== "low" && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${topic.importance === "high" ? "bg-foreground/10 text-foreground" : "bg-foreground/5 text-muted-foreground"
                                }`}>
                                {topic.importance === "high" ? "★" : "·"}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-2 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={(e) => { e.stopPropagation(); handleToggleTopicStatus(topic.id, topic.status); }}
                            >
                              {topic.status !== "completed" ? "Done" : "Undo"}
                            </Button>
                            {hasDetails && (
                              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/40 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                            )}
                          </div>

                          {/* Expanded */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 md:px-9 pb-3 pt-1 space-y-3">
                                  {focusPoints.length > 0 && (
                                    <div>
                                      <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Lightbulb className="w-3 h-3" /> Focus
                                      </h5>
                                      <ul className="space-y-1">
                                        {focusPoints.map((pt, i) => (
                                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                            <span className="text-foreground/30 mt-0.5">•</span> {pt}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {revisionTip && (
                                    <div className="bg-accent/50 rounded-md px-3 py-2">
                                      <p className="text-xs"><span className="text-foreground/70">⚡</span> {revisionTip}</p>
                                    </div>
                                  )}

                                  {topicPyqs.length > 0 && (
                                    <div>
                                      <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <FileQuestion className="w-3 h-3" /> PYQs ({topicPyqs.length})
                                      </h5>
                                      <div className="space-y-1.5">
                                        {topicPyqs.map((pyq) => (
                                          <div key={pyq.id} className="text-xs bg-background/50 p-2.5 rounded border border-border/50 flex justify-between items-start gap-2">
                                            <p className="flex-1 text-muted-foreground">{pyq.content}</p>
                                            <div className="flex gap-1 shrink-0">
                                              <button
                                                className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${pyq.status === "done" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-accent"
                                                  }`}
                                                onClick={() => handlePyqAction(pyq.id, pyq.status === "done" ? "pending" : "done")}
                                              >✓</button>
                                              <button
                                                className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${pyq.status === "difficult" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-accent"
                                                  }`}
                                                onClick={() => handlePyqAction(pyq.id, pyq.status === "difficult" ? "pending" : "difficult")}
                                              >!</button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="pyqs" className="mt-5 space-y-4">
            {subject.units?.map((unit) => {
              const unitPyqs = unit.topics?.flatMap((t) => (t.pyqs || []).map((p) => ({ ...p, topicName: t.name }))) || [];
              if (unitPyqs.length === 0) return null;
              return (
                <Card key={unit.id}>
                  <CardHeader className="pb-2 px-5 pt-4">
                    <CardTitle className="text-sm font-medium">{unit.name}</CardTitle>
                    <CardDescription className="text-xs">{unitPyqs.length} question{unitPyqs.length > 1 ? "s" : ""}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 space-y-2">
                    {unitPyqs.map((pyq) => (
                      <div key={pyq.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
                        <FileQuestion className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{pyq.content}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{pyq.topicName}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            className={`px-2 py-1 rounded text-xs border transition-colors ${pyq.status === "done" ? "bg-foreground text-background" : "hover:bg-accent"
                              }`}
                            onClick={() => handlePyqAction(pyq.id, pyq.status === "done" ? "pending" : "done")}
                          >Done</button>
                          <button
                            className={`px-2 py-1 rounded text-xs border transition-colors ${pyq.status === "difficult" ? "bg-foreground text-background" : "hover:bg-accent"
                              }`}
                            onClick={() => handlePyqAction(pyq.id, pyq.status === "difficult" ? "pending" : "difficult")}
                          >Hard</button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
            {allPyqs.length === 0 && (
              <Card>
                <CardContent className="py-16 text-center">
                  <FileQuestion className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No PYQs mapped</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
