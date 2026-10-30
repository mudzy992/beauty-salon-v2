#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// This guard grows with the audit: only files whose visible copy has been
// migrated are checked, so unrelated screens remain explicit follow-up work.
const GUARDED_FILES = [
  'src/screens/client/ProfileScreen.tsx',
  'src/screens/client/EditProfileScreen.tsx',
  'src/screens/stylist/DailyLogNewEntryScreen.tsx',
  'src/screens/stylist/DailyLogEntryPricingBlock.tsx',
  'src/components/ui/DateTimeField.tsx',
];

const COPY_ATTRIBUTES = new Set([
  'accessibilityHint',
  'accessibilityLabel',
  'accessibilityRoleDescription',
  'cancelText',
  'confirmText',
  'description',
  'emptyText',
  'errorText',
  'helperText',
  'hint',
  'label',
  'message',
  'placeholder',
  'subtitle',
  'successText',
  'title',
]);

function isTranslationKey(value) {
  return /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(value);
}

function looksLikeVisibleCopy(value) {
  if (!value || isTranslationKey(value)) return false;
  if (!/[A-Za-z\u00C0-\u024F]/u.test(value)) return false;
  if (/\s/u.test(value) || /[\u00C0-\u024F]/u.test(value)) return true;
  // Catch single-word, title-cased copy such as "Loyalty", while ignoring
  // PascalCase identifiers (e.g. DailyLogDetail) and all-caps enum values.
  return /^[A-Z][a-z]+$/u.test(value);
}

function isNavigationTargetLiteral(node) {
  const parent = node.parent;
  if (ts.isLiteralTypeNode(parent)) return true;
  return Boolean(
    ts.isCallExpression(parent) &&
    parent.arguments.includes(node) &&
    ts.isPropertyAccessExpression(parent.expression) &&
    parent.expression.name.text === 'navigate',
  );
}

function collectTranslationKeys(expression, found = []) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    found.push({ key: expression.text, node: expression });
    return found;
  }
  ts.forEachChild(expression, (child) => collectTranslationKeys(child, found));
  return found;
}

function collectResourceKeys(resourceSource, fileName = 'src/i18n/bs.ts') {
  const sourceFile = ts.createSourceFile(
    fileName,
    resourceSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const keys = new Set();
  let root;

  const findRoot = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'bs') {
      root = node.initializer;
    }
    if (!root) ts.forEachChild(node, findRoot);
  };
  findRoot(sourceFile);

  const flatten = (node, prefix = '') => {
    if (!node || !ts.isObjectLiteralExpression(node)) return;
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = property.name;
      const segment = ts.isIdentifier(name) || ts.isStringLiteral(name)
        ? name.text
        : undefined;
      if (!segment) continue;
      const key = prefix ? `${prefix}.${segment}` : segment;
      if (ts.isObjectLiteralExpression(property.initializer)) flatten(property.initializer, key);
      else keys.add(key);
    }
  };
  flatten(root);
  return keys;
}

function scanSource(sourceText, fileName = 'source.tsx', resourceKeys) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations = [];
  const reported = new Set();

  const addViolation = (node, value, reason) => {
    const start = node.getStart(sourceFile);
    const key = String(start);
    if (reported.has(key)) return;
    reported.add(key);
    const { line } = sourceFile.getLineAndCharacterOfPosition(start);
    violations.push({
      file: fileName,
      line: line + 1,
      value,
      reason,
    });
  };

  const inspectString = (node, reason = 'hard-coded visible copy') => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (looksLikeVisibleCopy(node.text)) addViolation(node, node.text, reason);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      const pieces = [node.head, ...node.templateSpans.map((span) => span.literal)];
      for (const piece of pieces) {
        if (looksLikeVisibleCopy(piece.text)) addViolation(piece, piece.text, reason);
      }
    }
  };

  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && node.arguments.length > 0 && resourceKeys) {
      for (const { key, node: keyNode } of collectTranslationKeys(node.arguments[0])) {
        if (!isTranslationKey(key)) {
          addViolation(keyNode, key, 'translation call must use a dotted resource key');
        } else if (!resourceKeys.has(key)) {
          addViolation(keyNode, key, 'translation key is missing from mobile/src/i18n/bs.ts');
        }
      }
    }
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile).replace(/\s+/gu, ' ').trim();
      if (looksLikeVisibleCopy(text)) addViolation(node, text, 'raw JSX text');
    } else if (ts.isJsxAttribute(node) && node.name && ts.isIdentifier(node.name)) {
      if (COPY_ATTRIBUTES.has(node.name.text) && node.initializer) {
        const initializer = node.initializer;
        if (ts.isStringLiteral(initializer)) {
          addViolation(initializer, initializer.text, `literal JSX ${node.name.text}`);
        } else if (ts.isJsxExpression(initializer) && initializer.expression) {
          const inspectCopyExpression = (child) => {
            if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === 't') {
              return;
            }
            if (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) {
              addViolation(child, child.text, `literal JSX ${node.name.text}`);
              return;
            }
            if (ts.isTemplateExpression(child)) {
              addViolation(child, child.getText(sourceFile), `template JSX ${node.name.text}`);
              return;
            }
            ts.forEachChild(child, inspectCopyExpression);
          };
          inspectCopyExpression(initializer.expression);
        }
      }
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isNavigationTargetLiteral(node)) inspectString(node);
    } else if (ts.isTemplateExpression(node)) {
      inspectString(node);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

function checkGuardedFiles() {
  const mobileRoot = path.resolve(__dirname, '..');
  const resourcePath = path.join(mobileRoot, 'src/i18n/bs.ts');
  const resourceKeys = fs.existsSync(resourcePath)
    ? collectResourceKeys(fs.readFileSync(resourcePath, 'utf8'))
    : new Set();
  const failures = GUARDED_FILES.flatMap((relativePath) => {
    const absolutePath = path.join(mobileRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      return [{ file: relativePath, line: 1, value: '', reason: 'guarded source file is missing' }];
    }
    return scanSource(fs.readFileSync(absolutePath, 'utf8'), relativePath, resourceKeys);
  });

  if (failures.length > 0) {
    console.error('Mobile i18n guard failed. Move visible copy to mobile/src/i18n/bs.ts and render it with t(...):');
    for (const failure of failures) {
      const copy = failure.value ? ` (${JSON.stringify(failure.value)})` : '';
      console.error(`  ${failure.file}:${failure.line}: ${failure.reason}${copy}`);
    }
    return 1;
  }

  console.log(`Mobile i18n guard passed (${GUARDED_FILES.length} audited source files).`);
  return 0;
}

if (require.main === module) {
  process.exitCode = checkGuardedFiles();
}

module.exports = {
  GUARDED_FILES,
  checkGuardedFiles,
  collectResourceKeys,
  looksLikeVisibleCopy,
  scanSource,
};
