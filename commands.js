import { assert, is, option } from './util.js';

export function evaluate (tokens) {
  const head = tokens[0];
  if (!(head in commands)) {
    throw new Error(`no pattern for head token ${head}`);
  }
  tokens.shift();
  commands[head](tokens);
}

function split (tk) {
  assert(tk, is('by'));
  option(tk, {
    nl: () => { focus = focus.split('\n'); },
    block: () => { focus = focus.split('\n\n'); }
    // TODO: string literal flavor
  });
}

const commands = {
  split
};
