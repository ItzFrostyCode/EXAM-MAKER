function parseExam(rawQuestions, rawAnswers) {
  // Normalize everything: handle non-breaking spaces, vertical tabs, etc.
  // Replace all weird whitespaces with standard space and normalize newlines
  function normalize(text) {
    if (!text) return "";
    return text
      .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ') // weird spaces
      .replace(/\r\n/g, '\n') // windows newlines
      .replace(/\r/g, '\n') // old mac newlines
      .trim();
  }

  rawQuestions = normalize(rawQuestions);
  rawAnswers = normalize(rawAnswers);

  // If answers box is empty, check if answers are at bottom of questions box
  if (!rawAnswers) {
    const answersIdx = rawQuestions.search(/ANSWERS(?:\s*SECTION)?[:\-\n]/i);
    if (answersIdx !== -1) {
      rawAnswers = rawQuestions.substring(answersIdx);
      rawQuestions = rawQuestions.substring(0, answersIdx);
    }
  }

  // Pre-process answers into a map
  let answerMap = {};
  const answerLines = rawAnswers.split('\n');
  answerLines.forEach(line => {
    // Matches "1. A" or "1: A" or "1) A" or just "1 A"
    const match = line.trim().match(/^(\d+)[\.\)\]\:\-\s]+\s*([A-D])/i);
    if (match) {
      answerMap[match[1]] = match[2].toUpperCase();
    }
  });

  // Split into question blocks (by number at start of line)
  // More aggressive regex to catch "1.", "1)", "Q1:", etc.
  const blocks = rawQuestions.split(/(?:\n|^)(?=\s*(?:Question\s*)?\d+[\.\)\]\:\-\s])/i).filter(b => b.trim().length > 3);
  let parsed = [];

  blocks.forEach(block => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // Extract ID or Bullet
    const idMatch = trimmed.match(/^(?:(?:Question\s*)?(\d+)|[•\-\*])[\.\)\]\:\-\s]*/i);
    const id = idMatch && idMatch[1] ? parseInt(idMatch[1]) : (index + 1);

    // Split block into question text part and choices part
    const choiceSplitIdx = trimmed.search(/\n\s*[A-D][\.\)\]\:\-\s]/i);
    let questionText = "";
    let choicesPart = "";

    if (choiceSplitIdx !== -1) {
      // Remove the prefix (ID, "Question X", or bullet) from the text
      questionText = trimmed.substring(0, choiceSplitIdx).replace(/^(?:(?:Question\s*)?\d+|[•\-\*])[\.\)\]\:\-\s]*/i, '').trim();
      choicesPart = trimmed.substring(choiceSplitIdx);
    } else {
      questionText = trimmed.replace(/^(?:(?:Question\s*)?\d+|[•\-\*])[\.\)\]\:\-\s]*/i, '').trim();
    }

    // Extract choices A, B, C, D
    let choices = {};
    ['A', 'B', 'C', 'D'].forEach(letter => {
      // Look for the choice letter. We use [letter][delimiter] to avoid matching inside words
      const regex = new RegExp(`(?:\\n|^)\\s*${letter}[\\.\\)\\]\\:\\-\\s]\\s*(.*)`, 'i');
      const m = choicesPart.match(regex);
      choices[letter] = m ? m[1].trim() : '';
    });

    parsed.push({
      id,
      question: questionText,
      choices,
      correctAnswer: answerMap[id] || 'A'
    });
  });

  return parsed;
}