"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Trash2, Plus, GripVertical, ChevronUp, ChevronDown, Save, AlertTriangle } from "lucide-react";
import { getSubjectById, updateTopicName, updateUnitWeightage, addTopic, deleteTopic, deleteSubject, reorderTopics } from "@/lib/db";

export default function EditSubjectPage() {
  const { id } = useParams();
  const router = useRouter();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTopicName, setNewTopicName] = useState({});

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getSubjectById(id);
        setSubject(data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Subject not found.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const handleWeightageChange = async (unitId, value) => {
    const weightage = parseInt(value) || 0;
    setSubject((prev) => ({
      ...prev,
      units: prev.units.map((u) => (u.id === unitId ? { ...u, weightage } : u)),
    }));
    try {
      await updateUnitWeightage(unitId, weightage);
    } catch (err) {
      console.error("Weightage update error:", err);
    }
  };

  const handleTopicNameChange = async (topicId, unitIdx, topicIdx, name) => {
    setSubject((prev) => {
      const units = [...prev.units];
      units[unitIdx].topics[topicIdx] = { ...units[unitIdx].topics[topicIdx], name };
      return { ...prev, units };
    });
    try {
      await updateTopicName(topicId, name);
    } catch (err) {
      console.error("Topic name update error:", err);
    }
  };

  const handleDeleteTopic = async (topicId, unitIdx, topicIdx) => {
    if (!confirm("Delete this topic? This will also delete its PYQs.")) return;
    try {
      await deleteTopic(topicId);
      setSubject((prev) => {
        const units = [...prev.units];
        units[unitIdx].topics.splice(topicIdx, 1);
        return { ...prev, units };
      });
    } catch (err) {
      console.error("Delete topic error:", err);
    }
  };

  const handleAddTopic = async (unitId, unitIdx) => {
    const name = newTopicName[unitId]?.trim();
    if (!name) return;
    try {
      const newTopic = await addTopic(unitId, name);
      setSubject((prev) => {
        const units = [...prev.units];
        units[unitIdx].topics.push({ ...newTopic, pyqs: [] });
        return { ...prev, units };
      });
      setNewTopicName((prev) => ({ ...prev, [unitId]: "" }));
    } catch (err) {
      console.error("Add topic error:", err);
    }
  };

  const handleMoveTopic = async (unitIdx, topicIdx, direction) => {
    const newIdx = topicIdx + direction;
    const topics = [...subject.units[unitIdx].topics];
    if (newIdx < 0 || newIdx >= topics.length) return;

    [topics[topicIdx], topics[newIdx]] = [topics[newIdx], topics[topicIdx]];

    setSubject((prev) => {
      const units = [...prev.units];
      units[unitIdx] = { ...units[unitIdx], topics };
      return { ...prev, units };
    });

    // Persist new order
    const updates = topics.map((t, i) => ({ id: t.id, sort_order: i }));
    try {
      await reorderTopics(updates);
    } catch (err) {
      console.error("Reorder error:", err);
    }
  };

  const handleDeleteSubject = async () => {
    if (!confirm("Are you sure you want to delete this entire subject? This cannot be undone.")) return;
    try {
      await deleteSubject(id);
      router.push("/dashboard");
    } catch (err) {
      console.error("Delete subject error:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/subjects/${id}`}><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit: {subject.name}</h1>
          <p className="text-muted-foreground">Reorder topics, edit names, adjust weightage.</p>
        </div>
      </div>

      {subject.units?.map((unit, uIdx) => (
        <Card key={unit.id}>
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{unit.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Weightage (%)</Label>
                <Input
                  type="number"
                  value={unit.weightage}
                  onChange={(e) => handleWeightageChange(unit.id, e.target.value)}
                  className="w-20 h-8 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {unit.topics?.map((topic, tIdx) => (
              <div key={topic.id} className="flex items-center gap-2 bg-muted/30 p-2 rounded group">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <Input
                  value={topic.name}
                  onChange={(e) => handleTopicNameChange(topic.id, uIdx, tIdx, e.target.value)}
                  className="h-8 text-sm flex-1 border-transparent bg-transparent hover:border-border focus:bg-background"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">Day {topic.scheduled_day}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveTopic(uIdx, tIdx, -1)} disabled={tIdx === 0}>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveTopic(uIdx, tIdx, 1)} disabled={tIdx === unit.topics.length - 1}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTopic(topic.id, uIdx, tIdx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add topic */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-dashed">
              <Input
                placeholder="New topic name..."
                value={newTopicName[unit.id] || ""}
                onChange={(e) => setNewTopicName((prev) => ({ ...prev, [unit.id]: e.target.value }))}
                className="h-8 text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddTopic(unit.id, uIdx)}
              />
              <Button variant="outline" size="sm" className="h-8" onClick={() => handleAddTopic(unit.id, uIdx)}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete this subject and all its units, topics, and PYQs.
              </p>
              <Button variant="destructive" onClick={handleDeleteSubject}>
                Delete Entire Subject
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
