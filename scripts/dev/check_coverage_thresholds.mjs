#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const METRICS = ['lines', 'statements', 'functions', 'branches'];

function usage() {
  console.error('Usage: node scripts/dev/check_coverage_thresholds.mjs --summary <coverage-summary.json> --thresholds <coverage_thresholds.json>');
}

function parseArgs(argv) {
  const args = {};

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--summary') {
      args.summary = argv[i + 1];
      i += 1;
    } else if (arg === '--thresholds') {
      args.thresholds = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeFileKey(key) {
  return key.replaceAll('\\\\', '/');
}

function pct(covered, total) {
  if (!total) {
    return 100;
  }

  return (covered / total) * 100;
}

function compareMetric(scope, metric, actual, required) {
  if (required === undefined || required === null) {
    return null;
  }

  if (actual + 1e-9 < required) {
    return `${scope}.${metric} expected >= ${required.toFixed(2)} but was ${actual.toFixed(2)}`;
  }

  return null;
}

function sumMetric(records, metric) {
  return records.reduce(
    (acc, record) => {
      const node = record[metric] || { covered: 0, total: 0 };
      return {
        covered: acc.covered + (node.covered || 0),
        total: acc.total + (node.total || 0),
      };
    },
    { covered: 0, total: 0 },
  );
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.summary || !args.thresholds) {
    usage();
    process.exit(1);
  }

  const summaryPath = path.resolve(args.summary);
  const thresholdsPath = path.resolve(args.thresholds);
  const summary = readJson(summaryPath);
  const thresholds = readJson(thresholdsPath);

  if (!summary.total) {
    throw new Error(`Coverage summary is missing 'total': ${summaryPath}`);
  }

  const failures = [];
  const globalThresholds = thresholds.global || {};

  for (const metric of METRICS) {
    const actual = Number(summary.total?.[metric]?.pct ?? 0);
    const required = globalThresholds[metric];
    const failure = compareMetric('global', metric, actual, required);

    if (failure) {
      failures.push(failure);
    }
  }

  const moduleThresholds = Array.isArray(thresholds.modules) ? thresholds.modules : [];
  const fileEntries = Object.entries(summary)
    .filter(([key]) => key !== 'total')
    .map(([key, data]) => ({ key: normalizeFileKey(key), data }));

  for (const moduleRule of moduleThresholds) {
    const modulePath = normalizeFileKey(moduleRule.path || '');
    const matches = fileEntries.filter((entry) => entry.key.includes(modulePath));

    if (matches.length === 0) {
      failures.push(`module '${modulePath}' has no coverage records in ${summaryPath}`);
      continue;
    }

    const records = matches.map((entry) => entry.data);

    for (const metric of METRICS) {
      const required = moduleRule[metric];

      if (required === undefined || required === null) {
        continue;
      }

      const totals = sumMetric(records, metric);
      const actual = pct(totals.covered, totals.total);
      const failure = compareMetric(`module:${modulePath}`, metric, actual, required);

      if (failure) {
        failures.push(failure);
      }
    }
  }

  if (failures.length > 0) {
    console.error('Coverage threshold check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Coverage thresholds satisfied.');
}

try {
  main();
} catch (error) {
  console.error(`BLOCKED: ${error.message}`);
  process.exit(1);
}
