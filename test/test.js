import fs from 'fs';
import path from 'path';
import parse from '../src/index.js';
import { patterns } from '../src/commands.js';
import colors from 'picocolors';
import Tentamen from 'tentamen';

const tentamen = new Tentamen({});
tentamen.fn = () => parse(tentamen.input, { test: true });

const uncovered = Object.keys(patterns)
  .filter(key => patterns[key].constructor.name !== 'SugarPattern');

// assert that the patterns in the source code are in alphabetical order
const names = fs.readFileSync(
  path.resolve('src/commands.js'),
  { encoding: 'utf-8' }
)
  .split('\n')
  .filter(line => line.match(/^const .+ = new (Pattern|PlantPattern)/))
  .map(line => line.slice(6, line.indexOf('=') - 1));
const sortedNames = [...names].sort();
const unsortedIndex = names.findIndex((x, i) => names[i] !== sortedNames[i]);
if (unsortedIndex === -1) {
  console.log(
    colors.green('  o  ') +
    'source patterns in alphabetical order\n'
  );
} else {
  console.log(
    colors.red('  X  ') +
    colors.yellow('source patterns not in alphabetical order\n') +
    `     (see '${names[unsortedIndex]}')\n`
  );
}

// TODO: check order of sugar patterns independently

// hijack tentamen's methods to add coverage information
tentamen.add = (function () {
  const cached = tentamen.add;
  return function () {
    cached.apply(this, arguments); // run the test
    const title = arguments[0];
    // find the index of an uncovered command...
    const index = uncovered
      // whose name is at the beginning of the current test...
      .findIndex(name => title.startsWith(name));
    // and remove it from the uncovered commands
    if (index > -1) {
      uncovered.splice(index, 1);
    }
  };
})();
tentamen.done = (function () {
  const cached = tentamen.done;
  return function () {
    cached.apply(this, arguments); // output pass/fail count
    const numCommands = Object.keys(patterns).length;
    // percentage of commands which were found to be covered
    const p = (100 * ((numCommands - uncovered.length) / numCommands))
      .toFixed(2);
    if (uncovered.length === 0) {
      console.log(colors.green('  o  ') + `${p}% command coverage`);
    } else {
      console.log(
        colors.red('  X  ') +
        colors.yellow(`${p}% command coverage (${uncovered.length} commands untested)`)
      );
      console.log(`     (${uncovered.join(', ')})`);
    }
  };
})();

/**
 * tests below
 */

tentamen.suite('tests');
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
  'flatten',
  `focus [1 2 3 4]
  groups 2
  flatten`,
  [1, 2, 3, 4]
);
tentamen.add('focus', 'focus 5', 5);
tentamen.add(
  'group',
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
tentamen.add('maximum', 'focus [1 5 6 2 3 4]\nmaximum', 6);
tentamen.add('minimum', 'focus [6 2 1 5 4 3]\nminimum', 1);
tentamen.add('over', 'focus 5\nover 5', 1);
tentamen.add('plus', 'focus 5\nplus 5', 10);
tentamen.add(
  'product',
  `focus [1 2 3 4 5 6 7 8 9 10]
  product`,
  3628800
);
tentamen.add(
  'rld',
  `focus [1 'a' 2 'b' 3 'c']
  groups 2
  rld`,
  ['a', 'b', 'b', 'c', 'c', 'c']
);
tentamen.add(
  'split',
  `focus '1\\n2\\n3\\n4'
  split newlines`,
  ['1', '2', '3', '4']
);
tentamen.add('minus', 'focus 5\nminus 5', 0);
tentamen.add(
  'sum',
  `focus [1 2 3 4 5 6 7 8 9 10]
  sum`,
  55
);
tentamen.add('times', 'focus 5\ntimes 5', 25);

tentamen.add(
  'zip',
  `focus [1 2 3 4 5]
  zip [6 7 8 9]`,
  [[1, 6], [2, 7], [3, 8], [4, 9]]
);

tentamen.done();
