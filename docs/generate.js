import fs from 'fs';
import path from 'path';
import colors from 'picocolors';

console.log(
  colors.yellow('!!! ') +
  colors.cyan('ensure all pattern doc comments are well-formed!\n') +
  colors.cyan("    weird things could happen if they aren't!\n")
);

const source = fs.readFileSync(
  path.resolve('src/commands.js'),
  { encoding: 'utf-8' }
);
const patterns = source
  // given the entire file, the below regular expression matches many more
  // characters than it should when it tries to find the first pattern, so
  // we have to give it a better starting point
  .slice(source.indexOf(`
/**
 * commands below
 */
`))
  .split('\n')
  .slice(5)
  .join('\n')
  // match all command patterns, including the documentation comments
  // placed above them
  .match(/\/\*\*.+?\*\/.+?const .+? = new (Pattern|PlantPattern).+?{.+?}\);/gs)
  .map(pattern => {
    const docs = getDocs(pattern);
    return {
      head: getHead(pattern),
      type: getType(pattern),
      flowerType: getFlowerType(docs),
      description: getDescription(docs),
      params: getParams(docs),
      returnType: getReturnType(docs),
      examples: getExamples(docs)
    };
  });
const markdown = patterns
  .map(pattern => {
    let res = '';
    res += `## ${pattern.head}\n`;
    res += `**Type:** \`${pattern.type}\``;
    if (pattern.flowerType) {
      res += `\\\n**Flower type:** \`${pattern.flowerType}\``;
    }
    if (pattern.returnType) {
      res += `\\\n**Returns:** \`${pattern.returnType}\``;
    }
    res += '\n\n';
    res += pattern.description;
    res += '\n\n';
    if (pattern.params) {
      res += pattern.params
        .map(param => `#### ${param.name}\nType: \`${param.type}\``)
        .join('\n');
      res += '\n\n';
    }
    if (pattern.examples) {
      res += '### Examples\n';
      res += pattern.examples
        .map(example => `\`\`\`lua\n${example}\n\`\`\``)
        .join('\n');
      res += '\n\n';
    }
    return res;
  })
  .join('');

fs.writeFileSync(path.resolve('docs/patterns.md'), markdown);

console.log(
  colors.green(' o  ') +
  'generated patterns.md file\n' +
  `    (${patterns.length} total patterns)`
);

/**
 * information-gathering functions below
 */
function getHead (pattern) {
  return pattern
    .match(/const .+? = new (Pattern|PlantPattern)\(\d+/g)[0]
    .split(' ')[1];
}

function getType (pattern) {
  return pattern
    .match(/(Pattern|PlantPattern)/)[0]
    .split(' ')[0];
}

function getDocs (pattern) {
  return pattern
    .match(/\/\*\*.+?\*\//gs)[0];
}

function getFlowerType (docs) {
  const match = docs.match(/@flower .+/);
  if (match === null) {
    return undefined;
  }
  return match[0]
    .split(' ')[1]
    .slice(1, -1);
}

function getDescription (docs) {
  const str = docs
    .replace(/ \* @example.+?--.+?\n/gs, '')
    .split('\n')
    .filter(line => line.match(/^ \* [^@]/))
    .map(line => line.slice(3))
    .join(' ');
  return (str.charAt(0).toUpperCase() + str.slice(1) + '.')
    .replace(
      ' performs arg substitution.',
      '.\\\nPerforms arg substitution.'
    );
}

function getParams (docs) {
  const matches = docs.match(/@param .+/g);
  if (matches === null) {
    return undefined;
  }
  return matches
    .map(match => {
      const split = match.slice(7).split(' ');
      return {
        name: split[1],
        type: split[0].slice(1, -1)
      };
    });
}

function getExamples (docs) {
  const matches = docs.match(/@example.+?--.+?\n/gs);
  if (matches === null) {
    return undefined;
  }
  return matches
    .map(match => match.trim().replace(/ \* /g, '').slice(9));
}

function getReturnType (docs) {
  const match = docs.match(/@returns .+/);
  if (match === null) {
    return undefined;
  }
  return match[0]
    .slice(10, -1);
}

// console.log(patterns[3]); // nilad
// console.log(patterns[1]); // monad
// console.log(patterns[29]); // dyad

// console.log(patterns[2]); // has example
