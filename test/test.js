import parse from '../src/index.js';
import Tentamen from 'tentamen';

const tentamen = new Tentamen({});
tentamen.fn = () => parse(tentamen.input, { silent: true });

tentamen.suite('tests');
tentamen.add('add', 'focus 5\nadd 5', 10);
tentamen.add(
  'count',
  `focus 'aaaaa'
  count 'a'`,
  5
);
tentamen.add('divide', 'focus 5\ndivide by 5', 1);
tentamen.add('focus', 'focus 5', 5);
tentamen.add('multiply', 'focus 5\nmultiply by 5', 25);
tentamen.add(
  'refocus',
  `focus 5
  add 5
  refocus`,
  5
);
tentamen.add(
  'show',
  `focus 5
  show
  focus 10`,
  [5, 10]
);
tentamen.add(
  'split (blocks)',
  `focus '1\\n2\\n\\n3\\n4'
  split by blocks`,
  ['1\n2', '3\n4']
);
tentamen.add(
  'split (newlines)',
  `focus '1\\n2\\n3\\n4'
  split on newlines`,
  ['1', '2', '3', '4']
);
tentamen.add(
  'split (spaces)',
  `focus '1 2 3 4'
  split on spaces`,
  ['1', '2', '3', '4']
);
tentamen.add(
  'split (string)',
  `focus '1a2a3a4'
  split on 'a'`,
  ['1', '2', '3', '4']
);
tentamen.add('subtract', 'focus 5\nsubtract 5', 0);

tentamen.done();
