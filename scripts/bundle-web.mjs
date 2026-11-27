import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const mode = process.env.PSB_BUILD_MODE || 'locked';
const fixtureProject = 'demo-hanbando-school';
let settings = { mode };
if (mode === 'production') {
  const config = JSON.parse(await readFile(new URL('./firebase-web-production.json', import.meta.url), 'utf8'));
  if (config.projectId !== 'kdypoho' || config.appId !== '1:701264486422:web:a6a02a8e45d5a610fb5537' || !config.apiKey || !config.authDomain) {
    throw new Error('The JSON must match the registered Busan Peace School Firebase Web app.');
  }
  settings = { mode, firebase: config };
} else if (mode === 'staging') {
  const projectId = process.env.PSB_STAGING_PROJECT_ID;
  const config = JSON.parse(process.env.PSB_STAGING_FIREBASE_CONFIG || '{}');
  if (!projectId || config.projectId !== projectId || !config.apiKey || !config.appId || !config.authDomain
      || projectId === 'kdypoho' || projectId.startsWith('demo-')) {
    throw new Error('Set the approved isolated project ID and matching Firebase Web configuration.');
  }
  settings = { mode, firebase: config };
} else if (!['locked', 'development'].includes(mode)) {
  throw new Error('Unsupported build mode.');
} else if (mode === 'development') {
  settings = { mode, emulatorProject: fixtureProject };
}

await mkdir('www/vendor', { recursive: true });
const options = { bundle: true, format: 'esm', minify: true, target: ['chrome79', 'safari15'], legalComments: 'inline' };
await Promise.all([
  build({ ...options, stdin: {
    contents: `export { initializeApp } from 'firebase/app'; export * as Auth from 'firebase/auth'; export * as Firestore from 'firebase/firestore';`,
    resolveDir: process.cwd()
  }, outfile: 'www/vendor/firebase.js' }),
  build({ ...options, stdin: {
    contents: `export { Html5Qrcode } from 'html5-qrcode'; export { default as qrcode } from 'qrcode-generator';`,
    resolveDir: process.cwd()
  }, outfile: 'www/vendor/qr.js' }),
  writeFile('www/vendor/runtime.js', `export default ${JSON.stringify(settings)};\n`)
]);
