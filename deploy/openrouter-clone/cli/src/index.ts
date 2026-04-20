#!/usr/bin/env node

import { runAgent } from './agent.js';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  options: {
    model: { type: 'string', default: 'gpt-oss:120b-cloud' },
    'max-tokens': { type: 'string', default: '4096' },
    'output-format': { type: 'string', default: 'stream-json' },
    print: { type: 'boolean', default: false },
    'api-key': { type: 'string' },
    'base-url': { type: 'string' },
  },
  allowPositionals: true,
});

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data.trim()));
  });
}

const prompt = values.print ? await readStdin() : positionals.join(' ');

if (!prompt) {
  console.error('Error: No prompt provided');
  process.exit(1);
}

const apiKey =
  values['api-key'] ||
  process.env.OPENROUTER_API_KEY ||
  process.env.OLLAMA_API_KEY ||
  process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.error('Error: an API key is required (--api-key, OPENROUTER_API_KEY, OLLAMA_API_KEY or DEEPSEEK_API_KEY)');
  process.exit(1);
}

const baseURL = values['base-url'] || process.env.OPENROUTER_BASE_URL;

await runAgent({
  prompt,
  model: values.model!,
  maxTokens: parseInt(values['max-tokens']!, 10),
  apiKey,
  baseURL,
  outputFormat: values['output-format'] as 'stream-json' | 'text',
});
