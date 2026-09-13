import { test } from 'node:test';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import assert from 'node:assert/strict';
import { cloudStorage, storageReady, readStored, storageKey } from '../lib/storage';
import { uploadIdentity } from '../lib/upload-policy';

test('upload policy rejects URLs, traversal, malformed identifiers, and non-ZIPs', () => {
  const id = 'b'.repeat(48);
  assert.deepEqual(uploadIdentity(`archives/${id}.zip`, JSON.stringify({ filename: 'Chat.zip' })), { id, filename: 'Chat.zip' });
  for (const pathname of ['https://example.com/file.zip', '../file.zip', `metadata/${id}.json`, 'archives/short.zip']) assert.throws(() => uploadIdentity(pathname, '{"filename":"Chat.zip"}'));
  for (const filename of ['../Chat.zip', 'file.txt', 'folder\\chat.zip']) assert.throws(() => uploadIdentity(`archives/${id}.zip`, JSON.stringify({ filename })));
  assert.throws(() => storageKey('../secret', 'zip'));
});

test('Vercel requires Blob and private reads are authenticated, bounded, and coalesced', async () => {
  const oldVercel = process.env.VERCEL; const oldToken = process.env.BLOB_READ_WRITE_TOKEN; const oldDispatcher = getGlobalDispatcher(); const mock = new MockAgent(); mock.disableNetConnect(); setGlobalDispatcher(mock);
  try {
    process.env.VERCEL = '1'; delete process.env.BLOB_READ_WRITE_TOKEN;
    assert.equal(cloudStorage(), true); assert.equal(storageReady(), false);
    // A synthetic token for mocked transport only; no external requests are made.
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_teststore_testsecret';
    assert.equal(storageReady(), true); let calls = 0;
    const pool = mock.get('https://teststore.private.blob.vercel-storage.com');
    pool.intercept({path:/archives/,method:'GET',headers:{authorization:'Bearer vercel_blob_rw_teststore_testsecret'}}).reply(200,()=>{calls++;return 'archive';},{headers:{'content-length':'7'}});
    pool.intercept({path:/metadata.*dddd/,method:'GET'}).reply(200,'archive',{headers:{'content-length':'7'}});
    pool.intercept({path:/metadata.*eeee/,method:'GET'}).reply(200,'more-than-limit');
    const values = await Promise.all([readStored('c'.repeat(48), 'zip', 100), readStored('c'.repeat(48), 'zip', 100)]);
    assert.equal(values[0].toString(), 'archive'); assert.equal(calls, 1);
    await assert.rejects(readStored('d'.repeat(48), 'json', 3), /size limit/);
    await assert.rejects(readStored('e'.repeat(48), 'json', 3), /size limit/);
  } finally {
    setGlobalDispatcher(oldDispatcher); await mock.close();
    if (oldVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = oldVercel;
    if (oldToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN; else process.env.BLOB_READ_WRITE_TOKEN = oldToken;
  }
});
