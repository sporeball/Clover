import parse from '../src/index.js';
import Tentamen from 'tentamen';

let tentamen = new Tentamen({});
tentamen.fn = () => parse(tentamen.input, { silent: true });

tentamen.suite('tests');
tentamen.add('add', 'focus 5\nadd 5', 10);
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
// TODO: tests for split command
tentamen.add('subtract', 'focus 5\nsubtract 5', 0);
