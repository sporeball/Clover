import parse from '../src/index.js';
import { patterns } from '../src/commands.js';
import { open } from '../src/util.js';
import Hss from '@sporeball/hss.js';
import Num from '@sporeball/num.js';
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

const t0 = performance.now();

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
  'aeiou',
  `focus 'e'
  aeiou`,
  true
);
tentamen.add(
  'aeiouy',
  `focus 'y'
  aeiouy`,
  true
);
tentamen.add(
  'all',
  `focus [1 2 3 4 5]
  all (odd)`,
  false
);
tentamen.add(
  'any',
  `focus [1 2 3 4 5]
  any (odd)`,
  true
);
tentamen.add(
  'append',
  `focus [1 2 3]
  append 4`,
  [new Num(1), new Num(2), new Num(3), new Num(4)]
);
tentamen.add(
  'apply',
  `focus [1 2 3 4 5]
  apply (times 2)`,
  [new Num(2), new Num(4), new Num(6), new Num(8), new Num(10)]
);
tentamen.add(
  'applyto',
  `focus [1 2 3 4 5]
  applyto (prime) (times 2)`,
  [new Num(1), new Num(4), new Num(6), new Num(4), new Num(10)]
);
tentamen.add(
  'blocks',
  `focus "1\\n2\\n\\n3\\n4"
  blocks`,
  [
    [
      new Hss('1'),
      new Hss('2')
    ],
    [
      new Hss('3'),
      new Hss('4')
    ]
  ]
);
tentamen.add(
  'bottom',
  `focus [1 3 8 4 2 5 6 9 7 10]
  bottom 3`,
  [new Num(1), new Num(2), new Num(3)]
);
tentamen.add(
  'cast',
  `focus "1234"
  cast`,
  new Num(1234)
);
tentamen.add(
  'count',
  `focus "aaaaa"
  count 'a'`,
  new Num(5)
);
tentamen.add(
  'crush',
  `focus [1 2 3 4 5]
  itemize
  crush (sum)`,
  new Num(15)
);
tentamen.add(
  'divisible',
  `focus 10
  divisible 5`,
  true
);
tentamen.add(
  'eq',
  `focus 1
  plus 2
  eq 3`,
  true
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
  [new Num(1), new Num(2), new Num(2), new Num(3), new Num(3), new Num(3)]
);
tentamen.add(
  'flatten',
  `focus [1 2 3 4]
  groups 2
  flatten`,
  [new Num(1), new Num(2), new Num(3), new Num(4)]
);
tentamen.add(
  'focus',
  'focus 5',
  new Num(5)
);
tentamen.add(
  'foreach',
  `focus 5
  foreach [1 2 3] (plus *)`,
  [new Num(6), new Num(7), new Num(8)]
);
tentamen.add(
  'groups',
  `focus [1 2 3 4 5 6 7]
  groups 2`,
  [
    [new Num(1), new Num(2)],
    [new Num(3), new Num(4)],
    [new Num(5), new Num(6)],
    [new Num(7)]
  ]
);
tentamen.add(
  'gt',
  `focus 1
  plus 2
  gt 3`,
  false
);
tentamen.add(
  'gte',
  `focus 1
  plus 2
  gte 3`,
  true
);
tentamen.add(
  'itemize',
  // in this form, we expect that an apply should not be required
  `focus [1 2 3 4 5]
  itemize
  times 2`,
  [new Num(2), new Num(4), new Num(6), new Num(8), new Num(10)]
);
tentamen.add(
  'last',
  `focus [1 2 3 4 5]
  last`,
  new Num(5)
);
tentamen.add(
  'lazy',
  `focus 1
  lazy (plus 1)`,
  // flower stays the same
  new Num(1)
);
tentamen.add(
  'lines',
  `focus "first line\\nsecond line"
  lines`,
  [new Hss('first line'), new Hss('second line')]
);
tentamen.add(
  'lower',
  `focus "AbsoLUTELY"
  lower`,
  new Hss('absolutely')
);
tentamen.add(
  'lt',
  `focus 3
  minus 2
  lt 1`,
  false
);
tentamen.add(
  'lte',
  `focus 3
  minus 2
  lte 1`,
  true
);
tentamen.add(
  'maximum',
  `focus [1 5 6 2 3 4]
  maximum`,
  new Num(6)
);
tentamen.add(
  'minimum',
  `focus [6 2 1 5 4 3]
  minimum`,
  new Num(1)
);
tentamen.add(
  'minus',
  `focus 5
  minus 5`,
  new Num(0)
);
tentamen.add(
  'mod',
  `focus 5
  mod 3`,
  new Num(2)
);
tentamen.add(
  'odd',
  `focus 4
  odd`,
  false
);
tentamen.add(
  'over',
  `focus 5
  over 5`,
  new Num(1)
);
tentamen.add(
  'pluck',
  `focus [1 2 3 4 5]
  itemize
  pluck (odd)`,
  [new Num(2), new Num(4)]
);
tentamen.add(
  'plus',
  `focus 5
  plus 5`,
  new Num(10)
);
tentamen.add(
  'prepend',
  `focus ["b" "c" "d"]
  prepend "a"`,
  [new Hss('a'), new Hss('b'), new Hss('c'), new Hss('d')]
);
tentamen.add(
  'prime',
  `focus 7
  prime`,
  true
);
tentamen.add(
  'product',
  `focus [1 2 3 4 5 6 7 8 9 10]
  product`,
  new Num(3628800)
);
tentamen.add(
  'replace',
  `focus 'a'
  replace 'a' 'b'`,
  'b'
);
tentamen.add(
  'rld',
  `focus "4w3a1d1e6x1y3w"
  rld`,
  new Hss('wwwwaaadexxxxxxywww')
);
tentamen.add(
  'sort',
  `focus [1 3 8 4 2 5 6 9 7 10]
  sort`,
  [
    new Num(1), new Num(2), new Num(3), new Num(4), new Num(5), new Num(6),
    new Num(7), new Num(8), new Num(9), new Num(10)
  ]
);
tentamen.add(
  'split',
  `focus "1\\n2\\n3\\n4"
  split '\\n'`,
  [new Hss('1'), new Hss('2'), new Hss('3'), new Hss('4')]
);
tentamen.add(
  'stop',
  `focus 5
  plus 5
  stop
  plus 5`,
  // last line should be skipped, giving 10 instead of 15
  new Num(10)
);
tentamen.add(
  'sum',
  `focus [1 2 3 4 5 6 7 8 9 10]
  sum`,
  new Num(55)
);
tentamen.add(
  'take',
  `focus 1
  lazy (focus *)
  take 10`,
  // naturals
  [
    new Num(1), new Num(2), new Num(3), new Num(4), new Num(5), new Num(6),
    new Num(7), new Num(8), new Num(9), new Num(10)
  ]
);
tentamen.add(
  'times',
  `focus 5
  times 5`,
  new Num(25)
);
tentamen.add(
  'to',
  `focus 1
  to 10`,
  [
    new Num(1), new Num(2), new Num(3), new Num(4), new Num(5), new Num(6),
    new Num(7), new Num(8), new Num(9), new Num(10)
  ]
);
tentamen.add(
  'top',
  `focus [1 3 8 4 2 5 6 9 7 10]
  top 3`,
  [new Num(10), new Num(9), new Num(8)]
);
tentamen.add(
  'unique',
  `focus "aaaaabbbbcccdde"
  unique`,
  new Hss('abcde')
);
tentamen.add(
  'until',
  `focus 200
  until (prime) (plus 1)`,
  new Num(211)
);
tentamen.add(
  'upper',
  `focus "absolutely!"
  upper`,
  new Hss('ABSOLUTELY!')
);
tentamen.add(
  'using',
  `focus 1
  using [4 5 6] (sum)`,
  // flower should be ignored, giving 15 instead of 6
  new Num(15)
);
tentamen.add(
  'zip',
  `focus [1 2 3 4 5]
  zip [6 7 8 9]`,
  [
    [new Num(1), new Num(6)],
    [new Num(2), new Num(7)],
    [new Num(3), new Num(8)],
    [new Num(4), new Num(9)]
  ]
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
  )
    .toFixed(2);
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
  // TODO: produces a negative number if a command has recently been removed
  const missingCount = patternHeads.length - documented.length;
  console.log(
    colors.red('  X  ') +
    colors.yellow(`${missingCount} command(s) missing documentation\n`) +
    `     ensure ${colors.cyan('npm run docs')} has been used`
  );
}
console.log('');

const t1 = performance.now();

console.log(`finished in ${(t1 - t0).toFixed(2)}ms\n`);
