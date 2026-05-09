import { createClient } from "@/lib/supabase";

const supabase = createClient();

// ─── WRITES ──────────────────────────────────────────────

/**
 * Save a complete subject with units, topics, and PYQs from the AI result.
 * Returns the newly created subject's ID.
 */
export async function saveSubject(userId, subjectName, duration, aiResult) {
  // 1. Insert subject
  const { data: subject, error: subjectErr } = await supabase
    .from("subjects")
    .insert({ user_id: userId, name: subjectName, study_duration_days: duration })
    .select()
    .single();

  if (subjectErr) throw subjectErr;

  // 2. Insert units, topics, pyqs
  for (let uIdx = 0; uIdx < aiResult.units.length; uIdx++) {
    const unit = aiResult.units[uIdx];

    const { data: unitRow, error: unitErr } = await supabase
      .from("units")
      .insert({
        subject_id: subject.id,
        name: unit.name,
        weightage: unit.weightage || 0,
        sort_order: uIdx,
      })
      .select()
      .single();

    if (unitErr) throw unitErr;

    for (let tIdx = 0; tIdx < (unit.topics || []).length; tIdx++) {
      const topic = unit.topics[tIdx];

      const { data: topicRow, error: topicErr } = await supabase
        .from("topics")
        .insert({
          unit_id: unitRow.id,
          name: topic.name,
          scheduled_day: topic.scheduledDay || 1,
          sort_order: tIdx,
          importance: topic.importance || "medium",
          focus_points: topic.focusPoints || [],
          revision_tip: topic.revisionTip || "",
        })
        .select()
        .single();

      if (topicErr) throw topicErr;

      // Insert PYQs for this topic
      if (topic.pyqs && topic.pyqs.length > 0) {
        const pyqRows = topic.pyqs.map((pyq) => ({
          topic_id: topicRow.id,
          content: pyq.content,
        }));
        const { error: pyqErr } = await supabase.from("pyqs").insert(pyqRows);
        if (pyqErr) throw pyqErr;
      }
    }
  }

  return subject.id;
}

/**
 * Update a topic's status.
 */
export async function updateTopicStatus(topicId, status) {
  const { error } = await supabase
    .from("topics")
    .update({ status })
    .eq("id", topicId);
  if (error) throw error;
}

/**
 * Update a PYQ's status.
 */
export async function updatePyqStatus(pyqId, status) {
  const { error } = await supabase
    .from("pyqs")
    .update({ status })
    .eq("id", pyqId);
  if (error) throw error;
}

/**
 * Add a new topic to a unit.
 */
export async function addTopic(unitId, name, scheduledDay = 1) {
  // Get max sort_order
  const { data: existing } = await supabase
    .from("topics")
    .select("sort_order")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("topics")
    .insert({ unit_id: unitId, name, scheduled_day: scheduledDay, sort_order: nextOrder })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a topic.
 */
export async function deleteTopic(topicId) {
  const { error } = await supabase.from("topics").delete().eq("id", topicId);
  if (error) throw error;
}

/**
 * Delete a subject and all its children (CASCADE).
 */
export async function deleteSubject(subjectId) {
  const { error } = await supabase.from("subjects").delete().eq("id", subjectId);
  if (error) throw error;
}

/**
 * Batch update topic sort orders.
 */
export async function reorderTopics(topicUpdates) {
  // topicUpdates: [{ id, sort_order }]
  for (const update of topicUpdates) {
    const { error } = await supabase
      .from("topics")
      .update({ sort_order: update.sort_order })
      .eq("id", update.id);
    if (error) throw error;
  }
}

/**
 * Update topic name.
 */
export async function updateTopicName(topicId, name) {
  const { error } = await supabase.from("topics").update({ name }).eq("id", topicId);
  if (error) throw error;
}

/**
 * Update unit weightage.
 */
export async function updateUnitWeightage(unitId, weightage) {
  const { error } = await supabase.from("units").update({ weightage }).eq("id", unitId);
  if (error) throw error;
}

// ─── READS ──────────────────────────────────────────────

/**
 * Get all subjects for a user with aggregated stats.
 */
export async function getSubjectsForUser(userId) {
  const { data: subjects, error } = await supabase
    .from("subjects")
    .select(`
      id, name, study_duration_days, start_date, created_at,
      units (
        id,
        topics (
          id, status
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Compute stats per subject
  return subjects.map((s) => {
    const allTopics = s.units.flatMap((u) => u.topics);
    const total = allTopics.length;
    const completed = allTopics.filter((t) => t.status === "completed").length;
    const weak = allTopics.filter((t) => t.status === "weak").length;
    const skipped = allTopics.filter((t) => t.status === "skipped").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      id: s.id,
      name: s.name,
      studyDurationDays: s.study_duration_days,
      startDate: s.start_date,
      totalTopics: total,
      completedTopics: completed,
      weakTopics: weak,
      skippedTopics: skipped,
      progress,
    };
  });
}

/**
 * Get a single subject with its full tree (units → topics → pyqs).
 */
export async function getSubjectById(subjectId) {
  const { data, error } = await supabase
    .from("subjects")
    .select(`
      id, name, study_duration_days, start_date, created_at,
      units (
        id, name, weightage, sort_order,
        topics (
          id, name, status, scheduled_day, sort_order, importance, focus_points, revision_tip,
          pyqs (
            id, content, status
          )
        )
      )
    `)
    .eq("id", subjectId)
    .single();

  if (error) throw error;

  // Sort units and topics by sort_order
  if (data.units) {
    data.units.sort((a, b) => a.sort_order - b.sort_order);
    data.units.forEach((u) => {
      if (u.topics) u.topics.sort((a, b) => a.sort_order - b.sort_order);
    });
  }

  return data;
}

/**
 * Get today's tasks for a user across all subjects.
 * "Today" is calculated as: dayNumber = daysSince(startDate) + 1
 */
export async function getTodaysTasks(userId) {
  // First get all subjects
  const { data: subjects, error: subErr } = await supabase
    .from("subjects")
    .select("id, name, start_date, study_duration_days")
    .eq("user_id", userId);

  if (subErr) throw subErr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let allTasks = [];

  for (const subject of subjects) {
    const startDate = new Date(subject.start_date);
    startDate.setHours(0, 0, 0, 0);
    const diffMs = today - startDate;
    const dayNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    // Only fetch if within study window
    if (dayNumber >= 1 && dayNumber <= subject.study_duration_days) {
      const { data: topics, error: topicErr } = await supabase
        .from("topics")
        .select(`
          id, name, status, scheduled_day, importance, focus_points, revision_tip,
          unit:units!inner(
            id, name,
            subject:subjects!inner(id, name)
          )
        `)
        .eq("scheduled_day", dayNumber)
        .eq("unit.subject.id", subject.id);

      if (!topicErr && topics) {
        const tasks = topics.map((t) => ({
          id: t.id,
          topicName: t.name,
          status: t.status,
          subjectName: subject.name,
          subjectId: subject.id,
          scheduledDay: t.scheduled_day,
          importance: t.importance,
          focusPoints: t.focus_points || [],
          revisionTip: t.revision_tip || "",
        }));
        allTasks = allTasks.concat(tasks);
      }
    }
  }

  return allTasks;
}

/**
 * Get all weak and skipped topics for a user.
 */
export async function getWeakAndSkippedTopics(userId) {
  const { data: subjects, error: subErr } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("user_id", userId);

  if (subErr) throw subErr;

  let result = [];

  for (const subject of subjects) {
    const { data: topics, error } = await supabase
      .from("topics")
      .select(`
        id, name, status, scheduled_day,
        unit:units!inner(
          id, name,
          subject:subjects!inner(id, name)
        )
      `)
      .in("status", ["weak", "skipped"])
      .eq("unit.subject.id", subject.id);

    if (!error && topics) {
      const mapped = topics.map((t) => ({
        id: t.id,
        topicName: t.name,
        status: t.status,
        subjectName: subject.name,
        subjectId: subject.id,
        unitName: t.unit?.name,
      }));
      result = result.concat(mapped);
    }
  }

  return result;
}
