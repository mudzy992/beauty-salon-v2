#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const reportPath = process.argv[2];
const includeFailureDetails = process.argv.includes("--details");

function sanitizeFailureDetails(value) {
  return String(value || "")
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "[DATABASE_URL_REDACTED]")
    .replace(/\bBearer\s+["']?[^\s"'`]+["']?/gi, "Bearer [REDACTED]")
    .replace(
      /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g,
      "[JWT_REDACTED]",
    )
    .replace(
      /(["']?(?:password|pass|token|secret)["']?)(\s*[:=]\s*)["']?[^\s,"']+["']?/gi,
      "$1$2[REDACTED]",
    )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" | ")
    .slice(0, 700);
}

function escapeData(value) {
  return String(value)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function escapeProperty(value) {
  return escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

function emitWarning(message) {
  console.log(`::warning::${escapeData(message)}`);
}

if (!reportPath || !fs.existsSync(reportPath)) {
  emitWarning(
    "Jest JSON report is missing; no failing test names could be reported.",
  );
  process.exit(0);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch {
  emitWarning(
    "Jest JSON report could not be parsed; no failing test names could be reported.",
  );
  process.exit(0);
}

if (!Array.isArray(report.testResults)) {
  emitWarning("Jest JSON report has no testResults array.");
  process.exit(0);
}

const failures = [];
for (const suite of report.testResults) {
  const file = path.relative(process.cwd(), suite.name || "unknown-suite");
  const failedAssertions = Array.isArray(suite.assertionResults)
    ? suite.assertionResults.filter(
        (assertion) => assertion.status === "failed",
      )
    : [];
  const details = includeFailureDetails
    ? sanitizeFailureDetails(suite.failureMessage)
    : "";
  const detailSuffix = details ? ` Failure details (redacted): ${details}` : "";

  if (failedAssertions.length > 0) {
    for (const assertion of failedAssertions) {
      const testName =
        assertion.fullName || assertion.title || "unnamed Jest test";
      failures.push({
        file,
        message: `Jest test failed: ${testName}${detailSuffix}`,
      });
    }
  } else if (suite.status === "failed") {
    failures.push({
      file,
      message: `Jest suite failed before reporting an assertion.${detailSuffix}`,
    });
  }
}

if (failures.length === 0) {
  emitWarning(
    "Jest exited unsuccessfully but its JSON report contains no failed test names.",
  );
  process.exit(0);
}

const maxAnnotations = 50;
for (const failure of failures.slice(0, maxAnnotations)) {
  const file = escapeProperty(failure.file.split(path.sep).join("/"));
  console.log(`::error file=${file}::${escapeData(failure.message)}`);
}

if (failures.length > maxAnnotations) {
  emitWarning(
    `Reported ${maxAnnotations} of ${failures.length} Jest failures; more are present in the JSON report.`,
  );
}
