export type WorksheetLayoutStyle = "suneung" | "naesin";

export type WorksheetProblemItem = {
  id: string;
  title: string;
  problem: string;
  sourceLabel?: string;
  historyCode?: string;
  answer?: string;
  solution?: string;
  variationNote?: string;
  warning?: string;
};

export function chunkWorksheetProblems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export type WorksheetParsedProblem = {
  body: string;
  choices: string[];
};

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function stripHeadingPrefix(line: string) {
  return line.replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim();
}

function isNoiseLine(line: string) {
  const normalized = stripHeadingPrefix(normalizeLine(line))
    .replace(/[.:：\-–—]+$/g, "")
    .trim();

  if (!normalized) return false;

  return /^(?:인식한 문제|인식 문제|인식된 원본 문제|풀이에 사용된 원본 문제|문제 인식|해설 기록|불확실|불확실 없음|없음)$/u.test(
    normalized,
  );
}

function cleanChoiceValue(value: string) {
  return value
    .replace(/^[①②③④⑤⑴⑵⑶⑷⑸]\s*/u, "")
    .replace(/^\(?[1-5]\)?[.)]?\s*/, "")
    .trim();
}

function isShortChoiceCandidate(line: string) {
  const normalized = cleanChoiceValue(line);
  return Boolean(normalized) && normalized.length <= 48 && !/[=:]/.test(normalized);
}

export function parseWorksheetProblem(content: string): WorksheetParsedProblem {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isNoiseLine(line));

  const explicitChoiceLines = lines.filter((line) => /^(?:[①②③④⑤⑴⑵⑶⑷⑸]|\(?[1-5]\)?[.)])\s*/u.test(line));
  if (explicitChoiceLines.length >= 2) {
    const choiceSet = new Set(explicitChoiceLines);
    return {
      body: lines.filter((line) => !choiceSet.has(line)).join("\n\n").trim(),
      choices: explicitChoiceLines.map(cleanChoiceValue),
    };
  }

  let tailChoiceStart = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (isShortChoiceCandidate(lines[index])) {
      tailChoiceStart = index;
      continue;
    }

    break;
  }

  if (tailChoiceStart !== -1) {
    const choices = lines.slice(tailChoiceStart).map(cleanChoiceValue).filter(Boolean);
    if (choices.length >= 2 && choices.length <= 5) {
      return {
        body: lines.slice(0, tailChoiceStart).join("\n\n").trim(),
        choices,
      };
    }
  }

  return {
    body: lines.join("\n\n").trim(),
    choices: [],
  };
}
