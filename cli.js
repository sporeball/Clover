#!/usr/bin/env node

import parse from './src/index.js';
import { pprint } from './src/util.js';

import fs from 'fs';

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
  // const t0 = performance.now();
  parse(code);
  // const t1 = performance.now();
  // console.log(`(${(t1 - t0).toFixed(2)}ms)`);
}

try {
  cli();
} catch (e) {
  pprint(e);
  process.exit(1);
}
