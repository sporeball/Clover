#!/usr/bin/env node

import parse from './index.js';
import fs from 'fs';
import colors from 'picocolors';

function cli () {
  let code;
  let filename = process.argv[2];
  // implicit filetype
  if (!filename.endsWith('.clo')) {
    filename += '.clo';
  }
  // read
  try {
    code = fs.readFileSync(filename, { encoding: 'utf-8' });
  } catch (e) {
    throw new Error('file not found');
  }
  // parse
  parse(code);
}

try {
  cli();
} catch (e) {
  console.log(`${colors.red('e:')} ${e.message}`);
  process.exit(1);
}
