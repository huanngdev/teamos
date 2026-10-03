import { z } from "zod";

const ISSUE_NUMBER_MAX = "9223372036854775807";
const ISSUE_CODE_PREFIX = "I-";
const ISSUE_CODE_MIN_WIDTH = 4;
const maxIssueNumber = BigInt(ISSUE_NUMBER_MAX);

function isCanonicalIssueDecimal(value: string): boolean {
  if (!/^[1-9]\d*$/.test(value)) {
    return false;
  }

  const parsed = BigInt(value);

  return parsed >= 1n && parsed <= maxIssueNumber;
}

function decimalFromDigits(digits: string): string | undefined {
  const stripped = digits.replace(/^0+/, "");

  if (!isCanonicalIssueDecimal(stripped)) {
    return undefined;
  }

  return stripped;
}

function formatIssueCode(decimal: string): string {
  if (!isCanonicalIssueDecimal(decimal)) {
    throw new Error("Issue number is outside the supported range.");
  }

  const width = Math.max(ISSUE_CODE_MIN_WIDTH, decimal.length);

  return `${ISSUE_CODE_PREFIX}${decimal.padStart(width, "0")}`;
}

interface ParsedIssueCode {
  canonical: boolean;
  code: string;
  decimal: string;
}

function parseIssueCode(input: string): ParsedIssueCode | undefined {
  const match = /^[iI]-(\d+)$/.exec(input);
  const digits = match?.[1];

  if (digits === undefined) {
    return undefined;
  }

  const decimal = decimalFromDigits(digits);

  if (decimal === undefined) {
    return undefined;
  }

  const code = formatIssueCode(decimal);

  return {
    canonical: input === code,
    code,
    decimal,
  };
}

function parseIssueNumberBound(input: string): string | undefined {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  const code = parseIssueCode(trimmed);

  if (code !== undefined) {
    return code.decimal;
  }

  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }

  return decimalFromDigits(trimmed);
}

function compareIssueNumbers(left: string, right: string): number {
  const first = BigInt(left);
  const second = BigInt(right);

  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }

  return 0;
}

/*
 * A search box matches a code only when the whole query is that code, a hash
 * plus digits, or digits. A longer sentence stays on the text search.
 */
function issueNumberSearchDecimal(needle: string): string | undefined {
  const trimmed = needle.trim();
  const code = parseIssueCode(trimmed);

  if (code !== undefined) {
    return code.decimal;
  }

  const hashed = /^#(\d+)$/.exec(trimmed);

  if (hashed?.[1] !== undefined) {
    return decimalFromDigits(hashed[1]);
  }

  if (/^\d+$/.test(trimmed)) {
    return decimalFromDigits(trimmed);
  }

  return undefined;
}

function needleMatchesIssueCodeText(needle: string): boolean {
  return /^i-[0-9]/i.test(needle.trim());
}

const issueNumberSchema = z.string().refine(isCanonicalIssueDecimal, {
  message: "Enter an issue number.",
});

export {
  ISSUE_CODE_MIN_WIDTH,
  ISSUE_CODE_PREFIX,
  ISSUE_NUMBER_MAX,
  compareIssueNumbers,
  formatIssueCode,
  isCanonicalIssueDecimal,
  issueNumberSchema,
  issueNumberSearchDecimal,
  needleMatchesIssueCodeText,
  parseIssueCode,
  parseIssueNumberBound,
  type ParsedIssueCode,
};
