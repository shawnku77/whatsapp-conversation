export function uploadIdentity(pathname: string, payload: string | null) {
  const match = /^archives\/([a-f0-9]{48})\.zip$/.exec(pathname);
  const value = JSON.parse(payload || '{}');
  if (!match || typeof value.filename !== 'string' || value.filename.length > 240 || !/\.zip$/i.test(value.filename) || /[/\\\x00-\x1f]/.test(value.filename)) throw new Error('Invalid ZIP upload');
  return { id: match[1], filename: value.filename };
}
