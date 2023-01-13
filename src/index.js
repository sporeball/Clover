import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';
import { Plant } from './plant.js';
import * as Commands from './commands.js';
import { format, open, output } from './util.js';

/**
 * run a Clover program
 * @param {string} code
 * @param {Object} [options]
 * @param {boolean} options.test
 */
export default function run (code, options = {}) {
  // pollution
  global.Clover = {};
  global.CloverError = class CloverError {
    constructor (message, ...subs) {
      this.message = format(message, ...subs);
    }
  };

  // implicit input
  let input;
  try {
    input = open('input.txt').trim();
  } catch (e) {
    input = '';
  }

  // input casting
  if (
    input.match(/^0$|^-?[1-9]\d*$/g) ||
    // input.match(/^'[^']*?'$/g) ||
    input.match(/^\[.*\]$/g)
  ) {
    input = evaluateNode(parse(tokenize(input))[0]);
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

  // Clover.line = 0;

  code = code.split('\n')
    .map(line => line.replace(/--.*/gm, '').trim()); // clean

  // remove trailing blank line
  // (formed by trailing newline in the original code)
  if (code.at(-1).length === 0) {
    code = code.slice(0, -1);
  }

  code = code.join('\n');
  const tokens = tokenize(code);
  const AST = parse(tokens);

  // console.dir(AST, { depth: null });

  // all top-level nodes in the AST should be commands
  const invalid = AST.find(topLevelNode => topLevelNode.type !== 'command');
  if (invalid) {
    throw new CloverError('found bare token of type %t', invalid.type);
  }

  for (const topLevelNode of AST) {
    const commandInstance = evaluateNode(topLevelNode);
    // evaluate
    Commands.evaluateInstance(commandInstance);
    if (Clover.stop) {
      break;
    }
  }

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

/**
 * evaluate an AST node, returning a value
 * @param {object} ASTNode
 */
export function evaluateNode (ASTNode) {
  switch (ASTNode.type) {
    case 'number':
    case 'string':
    case 'boolean':
      return ASTNode.value;
    case 'list':
      return ASTNode.items.map(evaluateNode);
    case 'mutable':
      if (Clover.evItem) {
        return Clover.evItem[ASTNode.identifier];
      }
      break;
    case 'plant':
      return Clover.plants[ASTNode.identifier];
    case 'leaf':
      return Clover.plant.getLeaf(ASTNode.index).flower;
    case 'command':
      return new Commands.CommandInstance(
        ASTNode.head,
        ASTNode.args,
        ASTNode.rhs
      );
    case 'parenCommand':
      return new Commands.CommandInstance(
        ASTNode.value.head,
        ASTNode.value.args,
        ASTNode.value.rhs
      );
    case 'star':
      // command instances will substitute this themselves
      return ASTNode;
  }
}
