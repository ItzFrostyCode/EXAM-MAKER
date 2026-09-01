function parseExam(rawQuestions, rawAnswers) {
  // Normalize whitespaces and newlines
  function normalize(text) {
    if (!text) return "";
    return text
      .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
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
  if (rawAnswers) {
    const rawAnswerLines = rawAnswers
      .replace(/ANSWERS(?:\s*SECTION)?[:\-\n]*/gi, '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    let sequentialIndex = 1;
    rawAnswerLines.forEach(line => {
      // 1. Matches "1. A", "1) A", "1: A", "1- A", "1 A"
      const matchWithNum = line.match(/^(\d+)[\.\)\]\:\-\s]+\s*([A-D])/i);
      // 2. Matches lone letter "A", "B", "C", "D"
      const matchLoneLetter = line.match(/^([A-D])$/i);

      if (matchWithNum) {
        const qNum = parseInt(matchWithNum[1]);
        answerMap[qNum] = matchWithNum[2].toUpperCase();
      } else if (matchLoneLetter) {
        answerMap[sequentialIndex] = matchLoneLetter[1].toUpperCase();
        sequentialIndex++;
      } else {
        // Look for any letter A-D in the line
        const anyLetter = line.match(/\b([A-D])\b/i);
        if (anyLetter) {
          answerMap[sequentialIndex] = anyLetter[1].toUpperCase();
          sequentialIndex++;
        }
      }
    });
  }

  // Split into question blocks
  // Strategy 1: Try splitting by question number at start of line (e.g. "1.", "2)", "Question 1:", "Q1.")
  let blocks = rawQuestions.split(/(?:\n|^)(?=\s*(?:Question\s*|Q\s*)?\d+[\.\)\]\:\-\s])/i)
    .map(b => b.trim())
    .filter(b => b.length > 3);

  // Strategy 2 (Fallback): If no numbers exist (e.g. plain text questions), split by questions followed by choices A. B. C. D.
  if (blocks.length <= 1) {
    // Split wherever a question title starts (preceding an "A." choice)
    const choiceRegex = /(?:^|\n)(?=[^\n]+\n\s*A[\.\)\]\:\-\s])/i;
    const unnumberedBlocks = rawQuestions.split(choiceRegex)
      .map(b => b.trim())
      .filter(b => b.length > 3);

    if (unnumberedBlocks.length > 1) {
      blocks = unnumberedBlocks;
    } else {
      // Strategy 3: Split by double newlines or after "D. ..." choices
      const dChoiceSplit = rawQuestions.split(/(?<=\n\s*D[\.\)\]\:\-\s][^\n]+(?:\n|$))\s*(?=\n|[A-Za-z0-9])/i)
        .map(b => b.trim())
        .filter(b => b.length > 3);

      if (dChoiceSplit.length > 1) {
        blocks = dChoiceSplit;
      }
    }
  }

  let parsed = [];

  blocks.forEach((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const currentQNumber = index + 1;

    // Extract ID if explicitly numbered, otherwise use 1-based index
    const idMatch = trimmed.match(/^(?:(?:Question\s*|Q\s*)?(\d+)|[•\-\*])[\.\)\]\:\-\s]*/i);
    const id = idMatch && idMatch[1] ? parseInt(idMatch[1]) : currentQNumber;

    // Split block into question text part and choices part
    const choiceSplitIdx = trimmed.search(/\n\s*A[\.\)\]\:\-\s]/i);
    let questionText = "";
    let choicesPart = "";

    if (choiceSplitIdx !== -1) {
      questionText = trimmed.substring(0, choiceSplitIdx)
        .replace(/^(?:(?:Question\s*|Q\s*)?\d+|[•\-\*])[\.\)\]\:\-\s]*/i, '')
        .trim();
      choicesPart = trimmed.substring(choiceSplitIdx);
    } else {
      // Check for any choice letter split
      const anyChoiceIdx = trimmed.search(/\n\s*[A-D][\.\)\]\:\-\s]/i);
      if (anyChoiceIdx !== -1) {
        questionText = trimmed.substring(0, anyChoiceIdx)
          .replace(/^(?:(?:Question\s*|Q\s*)?\d+|[•\-\*])[\.\)\]\:\-\s]*/i, '')
          .trim();
        choicesPart = trimmed.substring(anyChoiceIdx);
      } else {
        questionText = trimmed.replace(/^(?:(?:Question\s*|Q\s*)?\d+|[•\-\*])[\.\)\]\:\-\s]*/i, '').trim();
      }
    }

    // Extract choices A, B, C, D
    let choices = {};
    ['A', 'B', 'C', 'D'].forEach(letter => {
      // Matches "A. Choice text" up to the next choice letter or end of string
      const regex = new RegExp(`(?:\\n|^)\\s*${letter}[\\.\\)\\]\\:\\-\\s]\\s*([\\s\\S]*?)(?=\\n\\s*[A-D][\\.\\)\\]\\:\\-\\s]|$)`, 'i');
      const m = choicesPart.match(regex);
      choices[letter] = m ? m[1].trim() : '';
    });

    // Check if at least choice A and B are present
    if (questionText && (choices['A'] || choices['B'])) {
      parsed.push({
        id,
        question: questionText,
        choices,
        correctAnswer: answerMap[id] || answerMap[currentQNumber] || 'A'
      });
    }
  });

  return parsed;
}