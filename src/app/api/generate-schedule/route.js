import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { subjectName, duration, syllabusText, pyqText } = body;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Gemini API Key" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are an expert study planner and academic document parser.

I am giving you raw OCR-extracted text from two types of documents:
1. A university SYLLABUS for the subject "${subjectName}"
2. Previous Year Question papers (PYQs)

The user wants to study this subject in exactly ${duration} days.

--- RAW SYLLABUS TEXT (OCR) ---
${syllabusText || "No syllabus text provided."}

--- RAW PYQ TEXT (OCR) ---
${pyqText || "No PYQs provided."}

Your tasks:
1. **Extract and structure the syllabus** into clear Units. Each unit should have a name and a list of individual topics. Assign a weightage percentage to each unit based on its relative importance / size in the syllabus. The total weightage across all units should sum to 100.
2. **Clean and extract individual questions** from the PYQ text. Each question should be a single, clear sentence. Remove page headers, footers, instructions like "attempt any five", roll number fields, date/time stamps, university names, and other non-question noise.
3. **Map each PYQ** to the most relevant topic in the most relevant unit.
4. **Create a day-wise study schedule** by distributing topics across ${duration} days.
5. **For each topic, generate study guidance:**
   - "focusPoints": An array of 2-4 bullet points describing EXACTLY what to learn/focus on for this topic. Be specific and actionable (e.g., "Understand the lifecycle methods: onCreate, onStart, onResume" not just "Learn lifecycle").
   - "importance": Rate as "high", "medium", or "low" based on how frequently the topic appears in the PYQs. Topics with multiple PYQs = high, one PYQ = medium, no PYQ = low.
   - "revisionTip": A single concise sentence for last-minute revision — the most critical thing to remember about this topic.

CRITICAL SCHEDULING RULES:
- EXHAUSTIVE EXTRACTION: You must extract EVERY SINGLE TOPIC present in the raw syllabus text. Do not omit, summarize, or skip any topics. The total number of topics in your JSON must match the total number of topics in the raw syllabus.
- NEVER combine or merge multiple topics into one. Every topic from the syllabus must appear as its own separate entry.
- If there are more topics than days, assign multiple separate topics to the same day — but keep each one as its own distinct object with its own scheduledDay.
- If there are fewer topics than days, spread them out so some days have just one topic.
- Each topic gets exactly one scheduledDay integer from 1 to ${duration}.
- Heavier-weighted units should get proportionally more days.

Return a JSON object with this exact structure:
{
  "units": [
    {
      "id": "u1",
      "name": "Unit 1: Name of Unit",
      "weightage": 25,
      "topics": [
        {
          "id": "t1",
          "name": "Topic Name",
          "scheduledDay": 1,
          "importance": "high",
          "focusPoints": [
            "Understand concept X and how it relates to Y",
            "Practice implementing Z with examples",
            "Know the difference between A and B"
          ],
          "revisionTip": "Remember: X is used for Y, and the key formula is Z.",
          "pyqs": [
            { "id": "p1", "content": "Clean question text here?" }
          ]
        }
      ]
    }
  ]
}

IMPORTANT RULES:
- Use simple sequential IDs like u1, u2, t1, t2, p1, p2 etc.
- Every topic MUST have "scheduledDay", "importance", "focusPoints", and "revisionTip".
- "pyqs" array can be empty [] if no PYQ maps to that topic.
- Clean up all OCR artifacts (random spaces, broken words, garbled characters) in topic names and question text.
- Do NOT invent topics or questions that aren't in the source text. But DO generate helpful focusPoints and revisionTips based on your knowledge of the subject.
- Do NOT merge or group multiple topics into one entry like "Topic A and Topic B". Each topic must be its own separate object.
- Respond ONLY with the JSON object. No markdown, no explanation.`;

    // Retry logic with exponential backoff for transient errors
    let result = null;
    let retries = 3;
    let delay = 3000;

    while (retries > 0) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (e) {
        const status = e.status || 0;
        const msg = e.message || "";
        if (status === 503 || status === 429 || msg.includes("503") || msg.includes("429")) {
          retries--;
          if (retries === 0) throw e;
          console.warn(`Transient error (${status}), retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        } else {
          throw e;
        }
      }
    }

    const responseText = result.response.text();

    // Strip markdown fences if present
    let cleanJson = responseText.replace(/```json\n?|```/g, "").trim();
    
    // Extract just the JSON object to avoid trailing/leading garbage text
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }
    
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate schedule" },
      { status: 500 }
    );
  }
}
