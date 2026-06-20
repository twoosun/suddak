import type { ProblemCodeSystem } from "@/lib/problem-bank/types";

export type GenerateProblemCodeInput =
  | {
      codeSystem: "kice";
      examYear: number;
      examMonth: number;
      problemNumber: number;
      variantCode?: string;
    }
  | {
      codeSystem: "school_exam";
      examYear: number;
      examMonth: number;
      problemNumber: number;
      variantCode?: string;
    }
  | {
      codeSystem: "ebs";
      ebsOriginalCode: string;
      variantCode?: string;
    };

export function isProblemCodeSystem(value: string): value is ProblemCodeSystem {
  return value === "kice" || value === "school_exam" || value === "ebs" || value === "internal";
}

function assertIntegerRange(name: string, value: number, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }
}

export function normalizeVariantCode(value: string | null | undefined) {
  const next = (value ?? "").trim().toUpperCase();
  if (!next) return "";
  if (!/^[A-Z]+$/.test(next)) {
    throw new Error("variantCode must contain uppercase letters only, such as A, B, AA, or AB.");
  }
  return next;
}

function twoDigits(value: number) {
  return String(value % 100).padStart(2, "0");
}

export function generateProblemCode(input: GenerateProblemCodeInput) {
  const variantCode = normalizeVariantCode(input.variantCode);

  if (input.codeSystem === "ebs") {
    const ebsOriginalCode = input.ebsOriginalCode.trim();
    if (!ebsOriginalCode) throw new Error("ebsOriginalCode is required for EBS problem codes.");
    return `${ebsOriginalCode}${variantCode}`;
  }

  assertIntegerRange("examMonth", input.examMonth, 1, 12);
  assertIntegerRange("problemNumber", input.problemNumber, 1, 99);
  assertIntegerRange("examYear", input.examYear, 0, 9999);

  return `${twoDigits(input.examYear)}${twoDigits(input.examMonth)}${twoDigits(input.problemNumber)}${variantCode}`;
}

export function stripVariantCode(problemCode: string) {
  return problemCode.replace(/[A-Z]+$/, "");
}
