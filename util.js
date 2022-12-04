import colors from 'picocolors';

export function pretty (value) {
  // number
  if (isFinite(value)) {
    return colors.cyan(value);
  }
  // string
  else if (typeof value === 'string') {
    return colors.cyan(`'${value}'`);
  }
  // array
  else if (Array.isArray(value)) {
    return `[${colors.cyan(value.map(i => {
      // shallow
      if (Array.isArray(i)) {
        return colors.blue('(Array)');
      } else {
        return pretty(i);
      }
    }).join(', '))}]`;
  }
  // CloverError
  else if (value.constructor?.name === 'CloverError') {
    return `${colors.red('e:')} ${value.message}`;
  }
  // uncaught error
  else if (value instanceof Error && value.message !== 'file not found') {
    return `${colors.red('e:')} ${value.message} ${colors.red('(uncaught!)')}`;
  }
}

export function pprint (value) {
  console.log(pretty(value));
}

export function format (str, ...subs) {
  str.match(/%./gm).forEach((match, index) => {
    if (match === '%s') {
      str = str.replace(match, subs[index]);
    } else if (match === '%t') {
      str = str.replace(match, pretty(subs[index]));
    }
  });
  return str;
}
