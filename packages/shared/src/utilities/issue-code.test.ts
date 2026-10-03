import { describe, expect, test } from "bun:test";

import {
  ISSUE_NUMBER_MAX,
  compareIssueNumbers,
  formatIssueCode,
  issueNumberSchema,
  issueNumberSearchDecimal,
  needleMatchesIssueCodeText,
  parseIssueCode,
  parseIssueNumberBound,
} from "./issue-code.js";

describe("formatIssueCode", () => {
  test("pads to four digits and keeps longer numbers", () => {
    expect(formatIssueCode("1")).toBe("I-0001");
    expect(formatIssueCode("9999")).toBe("I-9999");
    expect(formatIssueCode("10000")).toBe("I-10000");
  });

  test("rejects zero and values past bigint", () => {
    expect(() => formatIssueCode("0")).toThrow();
    expect(() => formatIssueCode("0001")).toThrow();
    expect(issueNumberSchema.safeParse(ISSUE_NUMBER_MAX).success).toBe(true);
    expect(issueNumberSchema.safeParse(`${ISSUE_NUMBER_MAX}0`).success).toBe(false);
  });
});

describe("parseIssueCode", () => {
  test("accepts alternate padding and case, then names the canonical code", () => {
    expect(parseIssueCode("I-0001")).toEqual({
      canonical: true,
      code: "I-0001",
      decimal: "1",
    });
    expect(parseIssueCode("I-1")).toMatchObject({ canonical: false, code: "I-0001", decimal: "1" });
    expect(parseIssueCode("I-01")).toMatchObject({ canonical: false, decimal: "1" });
    expect(parseIssueCode("I-001")).toMatchObject({ canonical: false, decimal: "1" });
    expect(parseIssueCode("i-0001")).toMatchObject({ canonical: false, code: "I-0001" });
    expect(parseIssueCode("I-00001")).toMatchObject({ canonical: false, decimal: "1" });
    expect(parseIssueCode("I-09999")).toMatchObject({
      canonical: false,
      code: "I-9999",
      decimal: "9999",
    });
    expect(parseIssueCode("i-9999")).toMatchObject({ canonical: false, code: "I-9999" });
    expect(parseIssueCode("I-010000")).toMatchObject({
      canonical: false,
      code: "I-10000",
      decimal: "10000",
    });
    expect(parseIssueCode("I-10000")?.canonical).toBe(true);
  });

  test("rejects values that are not an issue code", () => {
    expect(parseIssueCode("I-0")).toBeUndefined();
    expect(parseIssueCode("I-0000")).toBeUndefined();
    expect(parseIssueCode("1")).toBeUndefined();
    expect(parseIssueCode("WEB-1")).toBeUndefined();
    expect(parseIssueCode("11111111-1111-4111-8111-111111111111")).toBeUndefined();
    expect(parseIssueCode("I-9999 ")).toBeUndefined();
    expect(parseIssueCode("I-10000a")).toBeUndefined();
  });
});

describe("parseIssueNumberBound", () => {
  test("reads a decimal or a code as the same number", () => {
    expect(parseIssueNumberBound("1")).toBe("1");
    expect(parseIssueNumberBound("0001")).toBe("1");
    expect(parseIssueNumberBound("I-0001")).toBe("1");
    expect(parseIssueNumberBound("I-0010")).toBe("10");
    expect(parseIssueNumberBound("nope")).toBeUndefined();
    expect(parseIssueNumberBound("0")).toBeUndefined();
  });
});

describe("issue number search", () => {
  test("reads a whole-query code and ignores a bare prefix", () => {
    expect(issueNumberSearchDecimal("I-0001")).toBe("1");
    expect(issueNumberSearchDecimal("I-1")).toBe("1");
    expect(issueNumberSearchDecimal("#0001")).toBe("1");
    expect(issueNumberSearchDecimal("0001")).toBe("1");
    expect(issueNumberSearchDecimal("I-10000")).toBe("10000");
    expect(issueNumberSearchDecimal("i-000")).toBeUndefined();
    expect(issueNumberSearchDecimal("gate I-0001")).toBeUndefined();
    expect(needleMatchesIssueCodeText("i-000")).toBe(true);
    expect(needleMatchesIssueCodeText("i-")).toBe(false);
    expect(needleMatchesIssueCodeText("i")).toBe(false);
  });

  test("compares decimal strings numerically", () => {
    expect(compareIssueNumbers("10", "2")).toBe(1);
    expect(compareIssueNumbers("2", "10")).toBe(-1);
    expect(compareIssueNumbers(ISSUE_NUMBER_MAX, "1")).toBe(1);
  });
});
