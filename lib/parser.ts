export type Message = { id: number; date: string; time: string; sender: string; text: string; attachment?: string };
export type Conversation = { messages: Message[]; participants: string[] };
// Preserve export order and local timestamps: exports do not include a timezone.
export function parseChat(source: string, filenames: string[] = []): Conversation {
  const messages: Message[] = [];
  const clean = source.replace(/[\u200e\u200f\ufeff]/g, '').replace(/[\u202f\u00a0]/g, ' ');
  const pattern = /^(?:\[([^\]]+)\]|(\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+-)\s?(.*)$/;
  for (const line of clean.split(/\r?\n/)) {
    const match = line.match(pattern);
    if (!match) { if (messages.length) messages[messages.length - 1].text += '\n' + line; continue; }
    const stamp = (match[1] || match[2]).match(/^(.*?)[, ]+\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)$/);
    if (!stamp) continue;
    const body = match[3]; const separator = body.indexOf(': ');
    messages.push({ id: messages.length, date: stamp[1], time: stamp[2], sender: separator >= 0 ? body.slice(0, separator) : '', text: separator >= 0 ? body.slice(separator + 2) : body });
  }
  const lookup = new Map(filenames.map(name => [name.split('/').pop()!, name]));
  for (const message of messages) {
    const attachment = message.text.match(/<attached:\s*(.+?)>/i)?.[1] || message.text.match(/^(.+?)\s*\(file attached\)/im)?.[1];
    if (attachment && lookup.has(attachment.trim())) { message.attachment = lookup.get(attachment.trim()); message.text = message.text.replace(/<attached:\s*.+?>|^.+?\s*\(file attached\)/im, '').trim(); }
  }
  return { messages, participants: [...new Set(messages.map(m => m.sender).filter(Boolean))] };
}
