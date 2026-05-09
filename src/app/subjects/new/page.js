"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, FileText, CheckCircle2, ArrowRight, Loader2, Edit3, GripVertical, Plus, Trash2, X, ListOrdered, Eye } from "lucide-react";
import { extractOcrFromPdf } from "@/lib/pdf-parser";
import { saveSubject } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

export default function AddSubjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  /*
    FLOW:
    Step 1 — Upload files + subject name + duration
    Step 2 — OCR processing (loading screen)
    Step 3 — Review raw OCR text (user can edit/fix)
    Step 4 — Processing (loading screen) — structures + schedules
    Step 5 — Review structured result (units, topics with day, PYQs mapped)
  */
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: "", duration: 30 });
  const [files, setFiles] = useState({ syllabus: null, pyqs: [] });
  const [processingState, setProcessingState] = useState({ status: "idle", progress: 0, message: "" });

  // Raw OCR text — user editable
  const [rawText, setRawText] = useState({ syllabus: "", pyqs: "" });

  // Final structured data
  const [parsedSyllabus, setParsedSyllabus] = useState(null);

  const handleSyllabusChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFiles((prev) => ({ ...prev, syllabus: e.target.files[0] }));
    }
  };

  const handlePyqChange = (e) => {
    if (e.target.files) {
      setFiles((prev) => ({ ...prev, pyqs: [...prev.pyqs, ...Array.from(e.target.files)] }));
    }
  };

  const removePyqFile = (index) => {
    setFiles((prev) => {
      const newPyqs = [...prev.pyqs];
      newPyqs.splice(index, 1);
      return { ...prev, pyqs: newPyqs };
    });
  };

  // Step 1 → 2 → 3: Run OCR, then show raw text
  const processFiles = async () => {
    try {
      setStep(2);
      setProcessingState({ status: "processing", progress: 5, message: "Running OCR on Syllabus..." });

      let syllabusText = "";
      if (files.syllabus) {
        syllabusText = await extractOcrFromPdf(files.syllabus, (info) => {
          setProcessingState((prev) => ({ ...prev, progress: 5 + (info.page / info.total) * 40 }));
        });
      }

      let pyqText = "";
      if (files.pyqs.length > 0) {
        setProcessingState({ status: "processing", progress: 45, message: "Running OCR on PYQs..." });
        for (let i = 0; i < files.pyqs.length; i++) {
          const text = await extractOcrFromPdf(files.pyqs[i], (info) => {
            const baseProgress = 45;
            const progressPerFile = 45 / files.pyqs.length;
            const currentFileProgress = (info.page / info.total) * progressPerFile;
            setProcessingState((prev) => ({
              ...prev,
              progress: baseProgress + i * progressPerFile + currentFileProgress,
            }));
          });
          pyqText += `--- PYQ Paper ${i + 1}: ${files.pyqs[i].name} ---\n${text}\n\n`;
        }
      }

      setRawText({ syllabus: syllabusText, pyqs: pyqText });

      setProcessingState({ status: "success", progress: 100, message: "OCR Complete!" });
      setTimeout(() => setStep(3), 800);
    } catch (error) {
      console.error(error);
      setProcessingState({ status: "error", progress: 0, message: "Failed to process files. Please try again." });
    }
  };

  // Step 3 → 4 → 5: Send approved raw text to generate structured plan
  const generatePlan = async () => {
    try {
      setStep(4);
      setProcessingState({ status: "processing", progress: 30, message: "Structuring syllabus and generating plan..." });

      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectName: formData.name,
          duration: formData.duration,
          syllabusText: rawText.syllabus,
          pyqText: rawText.pyqs,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to generate schedule");
      }

      const parsedData = await response.json();
      setParsedSyllabus(parsedData);

      setProcessingState({ status: "success", progress: 100, message: "Schedule Generated!" });
      setTimeout(() => setStep(5), 800);
    } catch (error) {
      console.error("Generation Error:", error);
      setStep(3);
      alert("Plan generation failed: " + error.message + ". Please try again.");
    }
  };

  const confirmAndSave = async () => {
    try {
      setStep(4);
      setProcessingState({ status: "processing", progress: 80, message: "Saving to database..." });
      const subjectId = await saveSubject(user.id, formData.name, formData.duration, parsedSyllabus);
      setProcessingState({ status: "success", progress: 100, message: "Saved!" });
      setTimeout(() => router.push(`/subjects/${subjectId}`), 800);
    } catch (error) {
      console.error("Save error:", error);
      setStep(5);
      alert("Failed to save: " + error.message);
    }
  };

  // Edit helpers for Step 5
  const updateUnitName = (unitIdx, name) => {
    setParsedSyllabus((prev) => {
      const units = [...prev.units];
      units[unitIdx] = { ...units[unitIdx], name };
      return { ...prev, units };
    });
  };

  const updateUnitWeightage = (unitIdx, weightage) => {
    setParsedSyllabus((prev) => {
      const units = [...prev.units];
      units[unitIdx] = { ...units[unitIdx], weightage: parseInt(weightage) || 0 };
      return { ...prev, units };
    });
  };

  const updateTopicName = (unitIdx, topicIdx, name) => {
    setParsedSyllabus((prev) => {
      const units = [...prev.units];
      const topics = [...units[unitIdx].topics];
      topics[topicIdx] = { ...topics[topicIdx], name };
      units[unitIdx] = { ...units[unitIdx], topics };
      return { ...prev, units };
    });
  };

  const removeTopic = (unitIdx, topicIdx) => {
    setParsedSyllabus((prev) => {
      const units = [...prev.units];
      const topics = [...units[unitIdx].topics];
      topics.splice(topicIdx, 1);
      units[unitIdx] = { ...units[unitIdx], topics };
      return { ...prev, units };
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-8 px-1 md:px-4">
      <div className="mb-6 md:mb-8 flex items-center justify-between px-2">
        <h1 className="text-xl md:text-3xl font-bold">Add New Subject</h1>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          {["Upload", "Review", "Schedule"].map((label, idx) => {
            const stepNum = [1, 3, 5][idx];
            return (
              <span key={label} className="flex items-center gap-1.5">
                {idx > 0 && <ArrowRight className="w-3 h-3" />}
                <span className={step >= stepNum ? "text-primary font-medium" : ""}>{label}</span>
              </span>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── STEP 1: UPLOAD ────────────────────────────────── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">Subject Details</CardTitle>
                <CardDescription className="text-xs md:text-sm">Upload your syllabus and PYQ papers to get started.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-4 md:px-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Subject Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Android Programming"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Target Study Duration (Days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  {/* Syllabus */}
                  <div className="space-y-2">
                    <Label>Syllabus PDF</Label>
                    <label className="flex flex-col items-center justify-center w-full h-28 md:h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-muted-foreground/25 transition-colors">
                      <div className="flex flex-col items-center justify-center py-4">
                        {files.syllabus ? (
                          <>
                            <CheckCircle2 className="w-6 h-6 text-primary mb-2" />
                            <p className="text-xs md:text-sm font-medium text-center px-3 truncate max-w-full">{files.syllabus.name}</p>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-6 h-6 text-muted-foreground mb-2" />
                            <p className="text-xs md:text-sm text-muted-foreground">Upload Syllabus PDF</p>
                          </>
                        )}
                      </div>
                      <input type="file" className="hidden" accept=".pdf" onChange={handleSyllabusChange} />
                    </label>
                  </div>

                  {/* PYQs */}
                  <div className="space-y-2">
                    <Label>PYQs PDFs (Multiple)</Label>
                    <label className="flex flex-col items-center justify-center w-full h-28 md:h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-muted-foreground/25 transition-colors">
                      <div className="flex flex-col items-center justify-center py-4">
                        <FileText className="w-6 h-6 text-muted-foreground mb-2" />
                        <p className="text-xs md:text-sm text-muted-foreground">Add PYQ PDFs</p>
                      </div>
                      <input type="file" className="hidden" accept=".pdf" multiple onChange={handlePyqChange} />
                    </label>
                    {files.pyqs.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {files.pyqs.map((f, index) => (
                          <div key={index} className="flex items-center gap-2 bg-muted/50 p-2 rounded text-xs md:text-sm">
                            <span className="truncate flex-1 min-w-0">{f.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => removePyqFile(index)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-4 md:px-6 flex-col sm:flex-row gap-2 sm:justify-end">
                <Button className="w-full sm:w-auto" onClick={processFiles} disabled={!formData.name || !files.syllabus}>
                  Run OCR & Extract <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {/* ─── STEP 2 / 4: LOADING ──────────────────────────── */}
        {(step === 2 || step === 4) && (
          <motion.div key="loading" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 md:py-20 text-center px-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              {processingState.status === "success" ? (
                <CheckCircle2 className="w-7 h-7 text-primary" />
              ) : (
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              )}
            </div>
            <h2 className="text-lg md:text-2xl font-bold mb-2">{step === 2 ? "Extracting Text (OCR)" : "Generating Your Schedule..."}</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6">{processingState.message}</p>
            <div className="w-full max-w-xs md:max-w-md">
              <Progress value={processingState.progress} className="h-2" />
            </div>
          </motion.div>
        )}

        {/* ─── STEP 3: REVIEW RAW OCR TEXT ──────────────────── */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl"><Eye className="w-4 h-4 md:w-5 md:h-5" /> Review Extracted Text</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Fix any OCR errors before generating your study plan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-4 md:px-6">
                <div className="space-y-2">
                  <Label className="text-sm md:text-base font-semibold">Syllabus Text</Label>
                  <Textarea
                    className="h-44 md:h-64 font-mono text-xs md:text-sm leading-relaxed"
                    value={rawText.syllabus}
                    onChange={(e) => setRawText((prev) => ({ ...prev, syllabus: e.target.value }))}
                    placeholder="No text was extracted. You can paste syllabus content here manually."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm md:text-base font-semibold">PYQs Text</Label>
                  <Textarea
                    className="h-44 md:h-64 font-mono text-xs md:text-sm leading-relaxed"
                    value={rawText.pyqs}
                    onChange={(e) => setRawText((prev) => ({ ...prev, pyqs: e.target.value }))}
                    placeholder="No PYQ text extracted. You can paste content here manually."
                  />
                </div>
              </CardContent>
              <CardFooter className="px-4 md:px-6 flex-col sm:flex-row gap-2 sm:justify-between">
                <Button variant="outline" className="w-full sm:w-auto order-2 sm:order-1" onClick={() => setStep(1)}>Go Back</Button>
                <Button className="w-full sm:w-auto order-1 sm:order-2" onClick={generatePlan} disabled={!rawText.syllabus.trim()}>
                  Generate Study Plan <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {/* ─── STEP 5: REVIEW STRUCTURED RESULT ─────────── */}
        {step === 5 && parsedSyllabus && (
          <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-lg md:text-xl">Generated Schedule</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Your syllabus has been structured into units & topics, PYQs mapped, and a {formData.duration}-day schedule created. You can still edit everything below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-2 md:px-6">
                <div className="rounded-md border divide-y">
                  {parsedSyllabus.units?.map((unit, uIdx) => (
                    <div key={unit.id || uIdx} className="p-3 md:p-4">
                      {/* Unit header */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                        <Input
                          value={unit.name}
                          onChange={(e) => updateUnitName(uIdx, e.target.value)}
                          className="font-semibold text-sm md:text-base border-transparent hover:border-border focus:border-border flex-1"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <Label className="text-xs whitespace-nowrap">Wt. (%)</Label>
                          <Input
                            type="number"
                            value={unit.weightage}
                            onChange={(e) => updateUnitWeightage(uIdx, e.target.value)}
                            className="w-16 md:w-20 h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Topics */}
                      <div className="space-y-1.5 mt-2">
                        {unit.topics?.map((topic, tIdx) => (
                          <div key={topic.id || tIdx} className="flex items-center gap-1.5 md:gap-2 bg-muted/50 p-1.5 md:p-2 rounded text-sm group">
                            <GripVertical className="w-3 h-3 text-muted-foreground/50 shrink-0 hidden md:block" />
                            <Input
                              value={topic.name}
                              onChange={(e) => updateTopicName(uIdx, tIdx, e.target.value)}
                              className="h-7 text-xs md:text-sm border-transparent bg-transparent hover:border-border focus:bg-background flex-1 min-w-0"
                            />
                            <span className="text-[10px] md:text-xs font-semibold text-primary-foreground bg-primary px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                              D{topic.scheduledDay || "?"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive md:opacity-0 md:group-hover:opacity-100 shrink-0"
                              onClick={() => removeTopic(uIdx, tIdx)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* PYQs for this unit */}
                      {unit.topics?.some((t) => t.pyqs?.length > 0) && (
                        <div className="mt-3 pt-3 border-t border-dashed">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Mapped PYQs</p>
                          {unit.topics.map((topic) =>
                            topic.pyqs?.map((pyq, pIdx) => (
                              <div key={pyq.id || pIdx} className="text-xs text-muted-foreground bg-muted/30 p-2 rounded mb-1">
                                <span className="font-medium text-foreground">{topic.name}:</span> {pyq.content}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="px-4 md:px-6 flex-col sm:flex-row gap-2 sm:justify-between">
                <Button variant="outline" className="w-full sm:w-auto order-2 sm:order-1" onClick={() => setStep(3)}>Back</Button>
                <Button className="w-full sm:w-auto order-1 sm:order-2" onClick={confirmAndSave}>Confirm & Save <CheckCircle2 className="w-4 h-4 ml-2" /></Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
