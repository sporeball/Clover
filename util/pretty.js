import { equal, typeOf } from '../src/util.js';
import colors from 'picocolors';

function none () {
  return colors.yellow('(undefined!)');
}

/**
 * @param {number} n
 */
function number (n) {
  return colors.cyan(n);
}

/**
 * @param {string} c
 */
function char (c) {
  if (c.length === 0) {
    return colors.gray("''");
  }
  c = c.replace(/\n/g, colors.yellow('\\n'));
  return colors.cyan(`'${c}'`);
}

/**
 * @param {string} s
 */
function string (s) {
  if (s.length === 0) {
    return colors.gray("''");
  }
  s = s.replace(/\n/g, colors.yellow('\\n'));
  return colors.cyan(`"${s.toString()}"`);
}

/**
 * @param {boolean} b
 */
function boolean (b) {
  // the type checker additionally returns 'boolean' for string booleans,
  // but the caster only returns actual booleans.
  // special case the string booleans first
  if (b === 'true' || b === 'false') {
    return string(b);
  }
  if (b === true) {
    return colors.green('true');
  }
  return colors.red('false');
}

/**
 * @param {[]*} l
 */
function list (l) {
  const str = l.map(v => pretty(v))
    .join(', ');
  return `[${str}]`;
}

/**
 * @param {CloverError} e
 */
function error (e) {
  const msg = `${colors.red('e:')} ${e.message}`;
  // const stack = colors.cyan(`   (line ${Clover.line})`);
  // return `${msg}\n${stack}`;
  return msg;
}

/**
 * @param {Error} e
 */
function uncaughtError (e) {
  const msg = `${colors.red('e:')} ${e.message} ${colors.red('(uncaught!)')}`;
  const stack = colors.gray(
    e.stack.split('\n').slice(1).join('\n')
  );
  return `${msg}\n${stack}`;
}

/**
 * @param {Plant|LazyPlant} P
 */
function plant (P) {
  return P.leaves.map(L => leaf(L))
    .join(',\n');
}

/**
 * @param {Leaf} L
 */
function leaf (L) {
  let entries = Object.entries(L);
  entries.push(entries[0]);
  entries.splice(0, 1);
  const someMutableFocused = entries
    .filter(entry => entry[0] !== 'flower')
    .some(entry => equal(entry[1], L.flower));
  if (someMutableFocused) {
    entries = entries.filter(entry => entry[0] !== 'flower');
  }
  const prettyEntries = colors.white(
    entries
      .map(entry => {
        const [k, v] = entry;
        if (someMutableFocused && equal(v, L.flower)) {
          return `  [${colors.red('*')}] ${k} = ${pretty(v)}`;
        }
        return `  ${k} = ${pretty(v)}`;
      })
      .join(',\n')
  );
  return colors.green(`{\n${prettyEntries}\n}`);
}

/**
 * @param {any} v
 */
function other (v) {
  return v;
}

const functions = {
  none,
  number,
  char,
  string,
  boolean,
  list,
  error,
  uncaughtError,
  plant,
  leaf,
  other
};

/**
 * @param {any} value
 */
export default function pretty (value) {
  const T = typeOf(value);
  if (T.endsWith('[]')) {
    return functions.list(value);
  }
  return (functions[T] || functions.other)(value);
}
