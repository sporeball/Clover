#!/usr/bin/env node

import parse from './index.js';
import fs from 'fs';

const code = fs.readFileSync(process.argv[2], { encoding: 'utf-8' });
parse(code);
