import { assert, is, option } from './util.js';

/**
 * each command written in a clover program consists of a list of tokens.
 * if this list begins with a valid token, the interpreter will call a
 * corresponding function, which runs code for that command if the list
 * follows a valid pattern.
 * all such functions take the entire list, and consume it one token at a time
 * through callbacks.
 */

/**
 * execute a command given the tokens
 * @param {string[]} tokens
 */
export function evaluate (tokens) {
  // look for a command pattern that starts with the head
  const head = tokens[0];
  if (!(head in commands)) {
    throw new Error(`no pattern for head token ${head}`);
  }
  tokens.shift(); // remove head
  commands[head](tokens); // run
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
