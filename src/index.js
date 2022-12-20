import { Plant } from './plant.js';
import * as Command from './commands.js';
import { cast } from './token.js';
import { format, output } from './util.js';

import fs from 'fs';

/**
 * parse a Clover program
 * @param {string} code
 * @param {Object} [options]
 * @param {boolean} options.silent whether to silence output. good for tests
 */
export default function parse (code, options = {}) {
  global.Clover = {};
  global.CloverError = class CloverError {
    constructor (message, ...subs) {
      this.message = format(message, ...subs);
    }
  };

  // implicit input
  let input;
  try {
    input = cast(
      fs.readFileSync('input.txt', { encoding: 'utf-8' }).trim()
    );
  } catch (e) {
    input = '';
  }

  Clover.outputs = [];
  Clover.options = options;

  // commands act on the "plant".
  // the items in the plant are called the "leaves".
  // each leaf has its own "working value", as well as its own mutable storage.
  // at first, there is just one leaf, which works with the input.
  Clover.plant = new Plant().addLeaf(input);

  Clover.line = 0;

  code = code.split('\n')
    .map(line => line.replace(/;.*/gm, '').trim()); // clean

  // remove trailing blank line
  // (formed by trailing newline in the original code)
  if (code.at(-1).length === 0) {
    code = code.slice(0, -1);
  }

  for (const line of code) {
    Clover.line++;
    // skip empty lines
    if (line.length === 0) {
      continue;
    }
    // each line of code holds a single command
    // tokenize and evaluate
    Command.evaluate(line);
    // the `stop` command will set this value to true for an early break
    if (Clover.stop) {
      break;
    }
  }

  // implicit output
  output(Clover.plant);
}
