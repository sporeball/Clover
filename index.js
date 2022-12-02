import fs from 'fs';

export default function parse(code) {
  let input;
  try {
    input = fs.readFileSync('input.txt', { encoding: 'utf-8' });
  } catch (e) {
    input = '';
  }
  console.log(input);
  console.log(code);
}
