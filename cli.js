#!/usr/bin/env node

import parse from './index.js';
import fs from 'fs';
import colors from 'picocolors';

function cli () {
  let code;
  try {
    code = fs.readFileSync(process.argv[2], { encoding: 'utf-8' });
  } catch (e) {
    throw new Error('file not found');
  }
  parse(code);
}

try {
  cli();
} catch (e) {
  console.log(`${colors.red('e:')} ${e.message}`);
  process.exit(1);
}
