import { typeOf } from '../src/token.js';
import colors from 'picocolors';

function none (u) {
  return colors.yellow('(undefined!)');
}

function number (n) {
  return colors.cyan(n);
}

function string (s) {
  if (s.length === 0) {
    return colors.gray("''");
  }
  s = s.replace(/\n/g, colors.yellow('\\n'));
  return colors.cyan(`'${s}'`);
}

function array (l) {
  const str = l.map(v => pretty(v))
    .join(', ');
  return `[${str}]`;
}

function error (e) {
  const msg = `${colors.red('e:')} ${e.message}`;
  const stack = colors.cyan(`   (line ${Clover.line})`);
  return `${msg}\n${stack}`;
}

function uncaughtError (e) {
  const msg = `${colors.red('e:')} ${e.message} ${colors.red('(uncaught!)')}`;
  const stack = colors.gray(
    e.stack.split('\n').slice(1).join('\n')
  );
  return `${msg}\n${stack}`;
}

function plant (P) {
  return P.leaves.map(L => leaf(L))
    .join(',\n');
}

function leaf (L) {
  const entries = colors.white(
    Object.entries(L)
      .map(entry => {
        const [k, v] = entry;
        return `  ${k} = ${pretty(v)}`;
      })
      .join(',\n')
  );
  return colors.green(`{\n${entries}\n}`);
}

function other (v) {
  return v;
}

const functions = {
  none,
  number,
  string,
  array,
  error,
  uncaughtError,
  plant,
  leaf
};

export default function pretty (value) {
  const T = typeOf(value);
  return functions[T](value);
}
