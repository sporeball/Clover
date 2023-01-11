import { tokenize } from './tokenizer.js';

// take a single token
// call a function according to what type it is
// each function returns a new object to replace the token

function parsePrimitive (tokens) {
  const primitive = tokens.shift();
  return {
    type: 'primitive',
    value: primitive
  };
}

function parseList (tokens) {
  tokens.shift(); // skip the open bracket
  const list = [];
  while (tokens.length > 1) {
    if (tokens[0] && tokens[0].type !== 'closeBracket') {
      list.push(eat(tokens));
    } else {
      break;
    }
  }
  if (tokens.shift()?.type !== 'closeBracket') {
    throw new Error('unmatched bracket');
  }
  return {
    type: 'list',
    items: list
  };
}

/**
 * parse a flat list of tokens
 */
export function parse (tokens) {
  let position = 0;
  let tree = [];
  while (tokens.length > 0) {
    tree.push(eat(tokens));
  }
  return tree;
}

/**
 * take a flat list of tokens
 * do something based on the first one
 */
function eat (tokens) {
  switch (tokens[0].type) {
    case 'number':
    case 'string':
    case 'boolean':
      return parsePrimitive(tokens);
    case 'openBracket':
      return parseList(tokens);
  }
  throw new Error(`no matching rule found: ${tokens[0].type}`);
}

const tokens = tokenize(`[2 ['three' 'four'] 5]`);
console.dir(parse(tokens), { depth: null });
