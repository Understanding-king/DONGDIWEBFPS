import assert from 'node:assert/strict';
import { transcribeAudioSequentially } from '../ai-client.js';

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

function makeSilentWav(seconds, sampleRate = 16000) {
  const dataLength = seconds * sampleRate * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  return new Blob([buffer], { type:'audio/wav' });
}

const filenames = [];
let activeRequests = 0;
let maxActiveRequests = 0;

globalThis.fetch = async (_url, options) => {
  activeRequests += 1;
  maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
  const file = options.body.get('file');
  filenames.push(file.name);
  const sequence = filenames.length;
  await new Promise((resolve) => setTimeout(resolve, 2));
  activeRequests -= 1;
  return new Response(JSON.stringify({ text:'segment-' + sequence }), {
    status:200,
    headers:{ 'content-type':'application/json' }
  });
};

const progress = [];
const transcript = await transcribeAudioSequentially('test-key', makeSilentWav(65), {
  onProgress(index, total) { progress.push([index, total]); }
});

assert.equal(maxActiveRequests, 1);
assert.deepEqual(filenames, [
  'recording-01-of-03.wav',
  'recording-02-of-03.wav',
  'recording-03-of-03.wav'
]);
assert.deepEqual(progress, [[1,3], [2,3], [3,3]]);
assert.equal(transcript, 'segment-1\nsegment-2\nsegment-3');

console.log('Audio chunk check passed: 65 seconds -> 3 sequential 29-second segments.');
