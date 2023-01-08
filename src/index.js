import { Plant } from './plant.js';
import * as Command from './commands.js';
import { cast } from './token.js';
import { format, output } from './util.js';

import fs from 'fs';

/**
 * parse a Clover program
 * @param {string} code
 * @param {Object} [options]
 * @param {boolean} options.test
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
  // each leaf has its own "flower" (the important value it's working with),
  // as well as its own mutable storage.
  // at first, there is just one leaf, whose flower is the input.
  Clover.plant = new Plant([input]);
  Clover.plants = {};

  Clover.line = 0;

  code = code.split('\n')
    .map(line => line.replace(/--.*/gm, '').trim()); // clean

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

  console.dir(Clover.plant, { depth: 4 });

  // implicit output
  output(Clover.plant);

  // if tests are being run, they need a reasonable return value
  if (options.test) {
    // yield an array of all flowers
    const flowers = Clover.plant.leaves.map(leaf => leaf.flower);
    // if there is just 1 flower, return it only
    if (flowers.length === 1) {
      return flowers[0];
    }
    // otherwise return the array
    return flowers;
  }

  return Clover.plant;
}
