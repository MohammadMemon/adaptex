// Basic heuristic parser for Syllabus and PYQs

export function parseSyllabus(text) {
  const units = [];
  let currentUnit = null;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Check if line looks like a Unit heading
    const unitMatch = line.match(/^(?:Unit|Module|Chapter)\s*(\d+)?[:.-]?\s*(.*)/i);
    
    if (unitMatch) {
      if (currentUnit) {
        units.push(currentUnit);
      }
      currentUnit = {
        id: "u" + Date.now() + Math.random().toString(36).substring(7),
        name: line,
        weightage: 10, // Default weightage
        topics: []
      };
    } else if (currentUnit) {
      // Treat other lines as topics if they aren't too long
      if (line.length < 150) {
        // Clean up bullet points
        const cleanTopic = line.replace(/^[-•*>\d.]+\s*/, '').trim();
        if (cleanTopic.length > 3) {
          currentUnit.topics.push({
            id: "t" + Date.now() + Math.random().toString(36).substring(7),
            name: cleanTopic
          });
        }
      }
    }
  }

  if (currentUnit) {
    units.push(currentUnit);
  }

  // Fallback if no units were found
  if (units.length === 0 && lines.length > 0) {
    units.push({
      id: "u_fallback",
      name: "Unit 1: General Topics",
      weightage: 100,
      topics: lines.slice(0, 20).map(l => ({
        id: "t" + Math.random().toString(36).substring(7),
        name: l.replace(/^[-•*>\d.]+\s*/, '').trim()
      })).filter(t => t.name.length > 3)
    });
  }

  return units;
}

export function parsePyqs(text) {
  // Split text by common question delimiters like "Q1.", "1.", "Question 1"
  const potentialQuestions = text.split(/(?:^|\n)(?:Q|Question)?\s*\d+[:.)-]/i);
  
  let pyqs = [];
  
  if (potentialQuestions.length > 1) {
    // Skip the first element if it's just preamble text
    for (let i = 1; i < potentialQuestions.length; i++) {
      const cleanQ = potentialQuestions[i].replace(/\n/g, ' ').trim();
      if (cleanQ.length > 10) {
        pyqs.push({
          id: "p" + Date.now() + i,
          content: cleanQ
        });
      }
    }
  } else {
    // Fallback: split by question marks
    const sentences = text.split('?');
    for (let i = 0; i < sentences.length - 1; i++) {
      const cleanQ = sentences[i].replace(/\n/g, ' ').trim() + '?';
      // Only keep reasonable length questions
      if (cleanQ.length > 15 && cleanQ.length < 500) {
        pyqs.push({
          id: "p" + Date.now() + i,
          content: cleanQ
        });
      }
    }
  }

  // Second fallback if still nothing
  if (pyqs.length === 0 && text.trim().length > 0) {
    const lines = text.split('\n').filter(l => l.trim().length > 15);
    pyqs = lines.slice(0, 30).map((l, i) => ({
      id: "p" + i,
      content: l.trim()
    }));
  }

  return pyqs;
}
