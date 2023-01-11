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
      break;
  }
  throw new Error('no matching rule found');
}

// R[identifier]
// R[openBracket] (while token is not closeBracket, eat)
// falls into
// R[primitive]
// R[primitive]
// R[primitive]
// the list ends
// the parsing stops
const tokens = tokenize(`1234 'five'`);
console.log(parse(tokens));
