#!/usr/bin/env node

/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const util = require('util');
const program = require('commander');
const glob = util.promisify(require('glob'));
const lint = require('./linter');
const Logger = require('./issue-logger');
const packageJson = require('../package.json');
const { checkVersion } = require('./version');

const { detectCommentedOutCode, detectESLintDisable } = require('./analyzer');

const fsReadFile = util.promisify(fs.readFile);

async function executeTest(globPattern, options) {
  const filePaths = await glob(globPattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/slides/**'],
  });

  if (filePaths.length === 0) {
    console.log('No *.js(x) files found.');
    return;
  }

  const promises = filePaths.map(filePath => {
    const logger = new Logger(filePath);
    return fsReadFile(filePath, 'utf8').then(progText => {
      try {
        const identifiers = lint(progText, logger);
        detectCommentedOutCode(progText, identifiers, logger);
        if (options.eslint) {
          detectESLintDisable(progText, logger);
        }
        return logger.getReport();
      } catch (err) {
        return {
          issues: [
            {
              line: err.loc ? err.loc.line : '-',
              message: `Syntax error: ${err.message}`,
            },
          ],
          declarations: [],
        };
      }
    });
  });

  const reports = await Promise.all(promises);

  const totalIssues = reports.reduce((count, report) => count + report.issues.length, 0);

  if (totalIssues === 0) {
    console.log('No issues detected.');
  } else {
    reports.forEach(report => {
      if (report.issues.length > 0) {
        console.log(report.filePath);
        console.table(report.issues);
        console.log('\n');
      }
    });
  }
}

(async () => {
  try {
    program
      .version(packageJson.version)
      .option('-e, --no-eslint', 'Skip eslint-disable checks')
      .parse(process.argv);

    const [fileSpec] = program.args;

    if (!fileSpec) {
      console.log('Missing file specification');
      process.exit(1);
    }
    const ext = path.extname(fileSpec);
    let globPattern = '**/*.{js,jsx}';
    if (ext) {
      if (!/\.jsx?$/i.test(ext)) {
        console.error(`Unsupported file extension: ${ext}`);
        process.exit(1);
      } else {
        globPattern = '';
      }
    }
    await executeTest(path.resolve(fileSpec, globPattern), program);

    await checkVersion();
  } catch (err) {
    console.error(err);
  }
})();
