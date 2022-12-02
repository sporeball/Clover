import * as Command from './commands.js';

import fs from 'fs';

export default function parse (code) {
  let input;
  try {
    input = fs.readFileSync('input.txt', { encoding: 'utf-8' });
  } catch (e) {
    input = '';
  }
  console.log(input);

  global.focus = input;

  code = code.split('\n')
    .map(line => line.replace(/;.*/gm, '').trim());

  for (const line of code) {
    if (line.length === 0) {
      continue;
    }
    const tokens = line.split(/ +/);
    Command.evaluate(tokens);
  }

  console.log(focus);
}
