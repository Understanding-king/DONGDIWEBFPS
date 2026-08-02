import { existsSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(root, 'dist');

function cleanDirectory(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      cleanDirectory(target);
      try { rmdirSync(target); } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY') throw error;
      }
    } else {
      unlinkSync(target);
    }
  }
}

cleanDirectory(outputDirectory);
const remainingFiles = existsSync(outputDirectory)
  ? readdirSync(outputDirectory, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
  : [];
if (remainingFiles.length) throw new Error(`Could not clean generated output: ${outputDirectory}`);
console.log('Cleaned generated output: dist/');
