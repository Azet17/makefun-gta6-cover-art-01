// Vice City Cover Maker — submission entrypoint (Node 22 standard library only).
// Copies app/ and screenshots/ from this repository into $MAKEFUN_OUTPUT_DIR
// (default /output) and writes /output/dossier.json with buildDossier from
// vendor/makefun-app.ts. Never deletes the output directory; two runs write
// byte-identical output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });

cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

if (!existsSync(join(outputDir, 'app', 'index.html'))) {
  throw new Error('main.ts: app/index.html missing from the output');
}
console.log(`main.ts: wrote ${outputDir} (dossier.json ${dossier.length} bytes)`);
