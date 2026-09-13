import { test } from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import { parseChat } from '../lib/parser';
import { inspect, validId } from '../lib/archive';
test('iPhone timestamps, invisible characters, multiline messages and media', () => {
 const result=parseChat('[8/25/26, 12:09:16\u202fAM] Alice: Hello\n\nSecond line\n[8/25/26, 12:10:00 AM] Bob: \u200e<attached: photo.jpg>', ['folder/photo.jpg']);
 assert.equal(result.messages.length,2); assert.equal(result.messages[0].text,'Hello\n\nSecond line');assert.equal(result.messages[1].attachment,'folder/photo.jpg');assert.deepEqual(result.participants,['Alice','Bob']);
});
test('Android export and system messages',()=>{const result=parseChat('25/08/2026, 09:00 - Messages are encrypted\n25/08/2026, 09:01 - Alice: report.pdf (file attached)',['report.pdf']);assert.equal(result.messages[0].sender,'');assert.equal(result.messages[1].attachment,'report.pdf');assert.equal(result.messages[1].time,'09:01');});
test('rejects unrelated ZIP and invalid identifiers',()=>{const zip=new AdmZip();zip.addFile('note.txt',Buffer.from('unrelated text'));assert.throws(()=>inspect(zip.toBuffer()),/No supported/);assert.equal(validId('../secret'),false);assert.equal(validId('a'.repeat(48)),true);});
