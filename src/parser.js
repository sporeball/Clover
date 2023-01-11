import { tokenize } from './tokenizer.js';

function parsePrimitive (tokens) {
  const primitive = tokens.shift();
  return {
    type: 'primitive',
    value: primitive
  };
}

function parseList (tokens) {
  // skip the open bracket
  tokens.shift();
  const list = [];
  while (true) {
    // if the next token is a newline, the closing bracket is missing
    if (tokens[0]?.type === 'newline') {
      throw new Error('unmatched bracket');
    }
    // while there are still tokens,
    // and the next token is not a closing bracket,
    // eat
    if (tokens[0] && tokens[0].type !== 'closeBracket') {
      list.push(eat(tokens));
    } else {
      break;
    }
  }
  // if there are no more tokens,
  // or the next token is not a closing bracket,
  // it's missing
  if (tokens.shift()?.type !== 'closeBracket') {
    throw new Error('unmatched bracket');
  }
  return {
    type: 'list',
    items: list
  };
}

function parseLeaf (tokens) {
  tokens.shift(); // skip the angle bracket
  const index = tokens.shift();
  if (index.type !== 'number') {
    throw new Error('invalid leaf index');
  }
  return {
    type: 'leaf',
    index: Number(index.value)
  };
}

function parsePlant (tokens) {
  tokens.shift(); // skip the @
  const identifier = tokens.shift();
  if (identifier.type !== 'identifier') {
    throw new Error('invalid plant identifier');
  }
  return {
    type: 'plant',
    identifier
  };
}

/**
 * parse a flat list of tokens
 */
export function parse (tokens) {
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
    case 'openAngle':
      return parseLeaf(tokens);
    case 'at':
      return parsePlant(tokens);
    case 'newline':
      return tokens.shift();
  }
  throw new Error(`no matching rule found: ${tokens[0].type}`);
}

const tokens = tokenize(
  `@aok
  3`
);
console.dir(parse(tokens), { depth: null });
