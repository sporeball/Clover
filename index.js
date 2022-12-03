import * as Command from './commands.js';

import fs from 'fs';

/**
 * parse a clover program
 * @param {string} code
 */
export default function parse (code) {
  // implicit input
  let input;
  try {
    input = fs.readFileSync('input.txt', { encoding: 'utf-8' });
  } catch (e) {
    input = '';
  }
  console.log(input);

  // commands act on the focus value
  // this is equivalent to the original input at first
  global.focus = input;

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

  console.log(focus);
}
