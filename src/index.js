import * as Command from './commands.js';
import { cast } from './token.js';
import { format, output } from './util.js';

import fs from 'fs';

/**
 * parse a clover program
 * @param {string} code
 * @param {Object} [options]
 * @param {boolean} options.quiet whether to silence output. good for tests
 */
export default function parse (code, options = {}) {
  global.Clover = {};
  global.CloverError = class CloverError {
    constructor (message, ...subs) {
      this.message = format(message, ...subs);
    }
  };

  // implicit input
  try {
    Clover.input = fs.readFileSync('input.txt', { encoding: 'utf-8' }).trim();
  } catch (e) {
    Clover.input = '';
  }

  Clover.outputs = [];
  Clover.options = options;

  // commands act on the focus value
  // this is equivalent to the original input at first
  Clover.focus = cast(Clover.input);

  Clover.working = Clover.focus;

  code = code.split('\n')
    .map(line => line.replace(/;.*/gm, '').trim()); // clean

  // remove trailing blank line
  // (formed by trailing newline in the original code)
  if (code.at(-1).length === 0) {
    code = code.slice(0, -1);
  }

  for (const line of code) {
    // skip empty lines
    if (line.length === 0) {
      continue;
    }
    // each line of code holds a single command
    // tokenize and evaluate
    const tokens = line.split(/ +/);
    Command.evaluate(tokens);
  }

  // implicit output
  output(Clover.working);

  // for single-item output array, return the item itself instead
  if (Clover.outputs.length === 1) {
    Clover.outputs = Clover.outputs[0];
  }

  return Clover.outputs;
}
