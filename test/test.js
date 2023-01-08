import parse from '../src/index.js';
import { patterns } from '../src/commands.js';
import { open } from '../src/util.js';
import colors from 'picocolors';
import Tentamen from 'tentamen';

/**
 * assert that an array is alphabetized
 * @param {string} name what's in the array?
 * @param {array} array
 */
function assertAlphabetized (name, array) {
  const outOfOrderIndex = array.findIndex((x, i) => {
    if (array[i - 1] === undefined) {
      return false;
    }
    return array[i - 1].localeCompare(array[i]) === 1;
  });
  if (outOfOrderIndex === -1) {
    console.log(
      colors.green('  o  ') +
      name
    );
  } else {
    console.log(
      colors.red('  X  ') +
      colors.yellow(`${name}\n`) +
      `     (see '${array[outOfOrderIndex]}')`
    );
  }
}

// tentamen instance
const tentamen = new Tentamen({});
tentamen.fn = () => parse(tentamen.input, { test: true });

const COMMANDS_JS = open('src/commands.js');
const TEST_JS = open('test/test.js');
const PATTERNS_MD = open('docs/patterns.md');

// patterns in the main export
const patternHeads = Object.keys(patterns)
  .filter(key => patterns[key].constructor.name !== 'SugarPattern');

// sugar patterns in the main export
const sugarPatternHeads = Object.keys(patterns)
  .filter(key => patterns[key].constructor.name === 'SugarPattern');

// pattern names, taken from their definitions
const patternSignatures = COMMANDS_JS
  .match(/^const .+ = new (Pattern|PlantPattern)/gm)
  .map(line => line.slice(6, line.indexOf('=') - 1));

// sugar pattern names, taken from their definitions
const sugarPatternSignatures = COMMANDS_JS
  .match(/^const .+ = new SugarPattern/gm)
  .map(line => line.slice(6, line.indexOf('=') - 1));

// command test titles, taken from this file
const tests = TEST_JS
  .slice(TEST_JS.indexOf("tentamen.suite('commands')"))
  .match(/tentamen\.add\(.*?'.+?'/gs)
  .map(match => match.match(/'.+?'/)[0].slice(1, -1));

// to determine which commands are missing a test...
// get their names,
const uncovered = patternHeads
  // and filter to those for which there is no exact match in test title
  .filter(head => !tests.includes(head));
// this is reported at the end

console.log(colors.cyan('alphabetization checks'));
assertAlphabetized('pattern export keys', patternHeads);
assertAlphabetized('sugar pattern export keys', sugarPatternHeads);
assertAlphabetized('pattern signatures', patternSignatures);
assertAlphabetized('sugar pattern signatures', sugarPatternSignatures);
assertAlphabetized('command tests', tests);
console.log('');

/**
 * tests below
 */

tentamen.suite('commands');
tentamen.add(
  'apply',
  `focus [1 2 3 4 5]
  apply (times 2)`,
  [2, 4, 6, 8, 10]
);
tentamen.add(
  'count',
  `focus 'aaaaa'
  count 'a'`,
  5
);
tentamen.add(
  'crush',
  `flowers [1 2 3 4 5]
  crush (sum)`,
  15
);
tentamen.add(
  'even',
  `focus 4
  even`,
  true
);
tentamen.add(
  'filter',
  `focus [1 2 2 3 3 3 4 4 4 4]
  filter 4`,
  [1, 2, 2, 3, 3, 3]
);
tentamen.add(
  'flatten',
  `focus [1 2 3 4]
  groups 2
  flatten`,
  [1, 2, 3, 4]
);
tentamen.add(
  'flowers',
  'flowers [1 2 3 4 5]',
  [1, 2, 3, 4, 5] // TODO: this is a weird line. cf. flatten test, above
);
tentamen.add('focus', 'focus 5', 5);
tentamen.add(
  'foreach',
  `flowers [5]
  foreach [1 2 3] (plus *)`,
  [6, 7, 8]
);
tentamen.add(
  'groups',
  `focus [1 2 3 4 5 6 7]
  groups 2`,
  [[1, 2], [3, 4], [5, 6], [7]]
);
tentamen.add(
  'itemize',
  // in this form, we expect that an apply should not be required
  `focus [1 2 3 4 5]
  itemize numbers
  times 2`,
  [2, 4, 6, 8, 10]
);
tentamen.add(
  'last',
  `focus [1 2 3 4 5]
  last`,
  5
);
tentamen.add(
  'lazy',
  `flowers [1]
  lazy (plus 1)`,
  // flower stays the same
  1
);
tentamen.add('maximum', 'focus [1 5 6 2 3 4]\nmaximum', 6);
tentamen.add('minimum', 'focus [6 2 1 5 4 3]\nminimum', 1);
tentamen.add('minus', 'focus 5\nminus 5', 0);
tentamen.add(
  'mod',
  `focus 5
  mod 3`,
  2
);
tentamen.add(
  'odd',
  `focus 4
  odd`,
  false
);
tentamen.add('over', 'focus 5\nover 5', 1);
tentamen.add(
  'pluck',
  `flowers [1 2 3 4 5]
  pluck (odd)`,
  [2, 4]
);
tentamen.add('plus', 'focus 5\nplus 5', 10);
tentamen.add(
  'product',
  `focus [1 2 3 4 5 6 7 8 9 10]
  product`,
  3628800
);
tentamen.add(
  'range',
  'range [1 10]',
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
);
tentamen.add(
  'rld',
  `focus [1 'a' 2 'b' 3 'c']
  groups 2
  rld`,
  ['a', 'b', 'b', 'c', 'c', 'c']
);
tentamen.add(
  'sort',
  `focus [1 3 8 4 2 5 6 9 7 10]
  sort`,
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
);
tentamen.add(
  'split',
  `focus '1\\n2\\n3\\n4'
  split '\\n'`,
  ['1', '2', '3', '4']
);
tentamen.add(
  'stop',
  `focus 5
  plus 5
  stop
  plus 5`,
  // last line should be skipped, giving 10 instead of 15
  10
);
tentamen.add(
  'sum',
  `focus [1 2 3 4 5 6 7 8 9 10]
  sum`,
  55
);
tentamen.add(
  'take',
  `flowers []
  lazy (focus *)
  take 10`,
  // naturals
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
);
tentamen.add('times', 'focus 5\ntimes 5', 25);
tentamen.add(
  'using',
  `flowers [1]
  using [4 5 6] (sum)`,
  // flower should be ignored, giving 15 instead of 6
  15
);
tentamen.add(
  'zip',
  `focus [1 2 3 4 5]
  zip [6 7 8 9]`,
  [[1, 6], [2, 7], [3, 8], [4, 9]]
);

tentamen.done();

// report coverage
if (uncovered.length === 0) {
  console.log(
    colors.green('  o  ') +
    '100.00% coverage'
  );
} else {
  const p = (
    100 * ((patternHeads.length - uncovered.length) / patternHeads.length)
  );
  console.log(
    colors.red('  X  ') +
    colors.yellow(`${p}% coverage (${uncovered.length} commands untested)\n`) +
    `     (${uncovered.join(', ')})`
  );
}
console.log('');

// report documentation coverage
console.log(colors.cyan('documentation'));
const documented = PATTERNS_MD
  .match(/^## .+/gm)
  .map(match => match.slice(3));
if (documented.length === patternHeads.length) {
  console.log(
    colors.green('  o  ') +
    'all commands documented'
  );
} else {
  const missingCount = patternHeads.length - documented.length;
  console.log(
    colors.red('  X  ') +
    colors.yellow(`${missingCount} command(s) missing documentation\n`) +
    `     ensure ${colors.cyan('npm run docs')} has been used`
  );
}
console.log('');
