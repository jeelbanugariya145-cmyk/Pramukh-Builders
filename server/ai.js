// Reads material bills and bank statements with Claude.
// Needs ANTHROPIC_API_KEY on the server; without it the app still works with manual entry.
import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';

export const aiEnabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client = null;
const getClient = () => (client ||= new Anthropic());

const BILL_SCHEMA = {
  type: 'object',
  properties: {
    supplier: { type: 'string', description: 'Seller / supplier firm name as printed on the bill' },
    billNo: { type: 'string' },
    date: { type: 'string', description: 'Bill date as YYYY-MM-DD, or empty string if not readable' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          qty: { type: 'number' },
          unit: { type: 'string' },
          rate: { type: 'number' },
          amount: { type: 'number' }
        },
        required: ['name', 'qty', 'unit', 'rate', 'amount'],
        additionalProperties: false
      }
    },
    gst: { type: 'number', description: 'Total GST / tax amount, 0 if none' },
    total: { type: 'number', description: 'Final bill total payable including tax' },
    readable: { type: 'boolean', description: 'false if the image is not a bill or is too unclear to read' }
  },
  required: ['supplier', 'billNo', 'date', 'items', 'gst', 'total', 'readable'],
  additionalProperties: false
};

const STATEMENT_SCHEMA = {
  type: 'object',
  properties: {
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD' },
          description: { type: 'string', description: 'Narration / particulars exactly as printed' },
          debit: { type: 'number', description: 'Money paid out, 0 if none' },
          credit: { type: 'number', description: 'Money received, 0 if none' }
        },
        required: ['date', 'description', 'debit', 'credit'],
        additionalProperties: false
      }
    }
  },
  required: ['transactions'],
  additionalProperties: false
};

function fileBlock(file, filePath) {
  const data = fs.readFileSync(filePath).toString('base64');
  if (file.mime === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  }
  return { type: 'image', source: { type: 'base64', media_type: file.mime, data } };
}

async function extract(file, filePath, schema, instruction) {
  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: [fileBlock(file, filePath), { type: 'text', text: instruction }] }]
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new Error('refused');
  if (message.stop_reason === 'max_tokens') throw new Error('too_long');
  const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(text);
}

export function readBill(file, filePath) {
  return extract(file, filePath, BILL_SCHEMA,
    'This is a photo or scan of a construction material purchase bill (invoice) from an Indian supplier. ' +
    'It may be in Gujarati, Hindi or English, printed or handwritten. Read it and fill every field. ' +
    'Write the supplier name and item names in the language printed on the bill. ' +
    'Amounts are in rupees; give plain numbers without commas or currency symbols. ' +
    'If a value is not on the bill, use an empty string or 0. Set readable to false only if this is not a bill or cannot be read.');
}

export function readStatement(file, filePath) {
  return extract(file, filePath, STATEMENT_SCHEMA,
    'This is an Indian bank account statement. List every transaction row in order. ' +
    'Use debit for withdrawals / payments out and credit for deposits. ' +
    'Give plain numbers without commas. Skip opening/closing balance lines and page headers.');
}

// Turns an API error into a short code the app can show in Gujarati or English
export function aiErrorCode(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'ai_key';
  if (err instanceof Anthropic.RateLimitError) return 'ai_busy';
  return 'ai_failed';
}
