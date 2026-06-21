import { createClient } from '@supabase/supabase-js';
import { ed25519 } from '@noble/ed25519';
import { blake2b } from '@noble/hashes/blake2b';
import { bech32 } from 'bech32';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* Minimal CBOR parser for COSE structures */

function readArg(buf, off) {
  const ai = buf[off] & 0x1f;
  if (ai < 24) return [ai, off + 1];
  if (ai === 24) return [buf[off + 1], off + 2];
  if (ai === 25) return [(buf[off + 1] << 8) | buf[off + 2], off + 3];
  if (ai === 26) return [(buf[off + 1] << 24) | (buf[off + 2] << 16) | (buf[off + 3] << 8) | buf[off + 4], off + 5];
  throw new Error('Unsupported CBOR additional info: ' + ai);
}

function decodeItem(buf, off) {
  if (off >= buf.length) throw new Error('CBOR: unexpected end');
  const mt = buf[off] >> 5;
  const [val, next] = readArg(buf, off);

  if (mt === 0) return [val, next];                   // unsigned int
  if (mt === 1) return [-1 - val, next];               // negative int
  if (mt === 2) {                                      // byte string
    const slice = buf.slice(next, next + val);
    return [slice, next + val];
  }
  if (mt === 3) {                                      // text string
    const slice = buf.slice(next, next + val);
    return [new TextDecoder().decode(slice), next + val];
  }
  if (mt === 4) {                                      // array
    const arr = [];
    let pos = next;
    for (let i = 0; i < val; i++) {
      const [item, p] = decodeItem(buf, pos);
      arr.push(item);
      pos = p;
    }
    return [arr, pos];
  }
  if (mt === 5) {                                      // map
    const map = new Map();
    let pos = next;
    for (let i = 0; i < val; i++) {
      const [k, pk] = decodeItem(buf, pos);
      const [v, pv] = decodeItem(buf, pk);
      map.set(k, v);
      pos = pv;
    }
    return [map, pos];
  }
  if (mt === 7 && val === 20) return [false, next];    // false
  if (mt === 7 && val === 21) return [true, next];      // true
  if (mt === 7 && val === 22) return [null, next];      // null
  throw new Error('CBOR: unsupported major type ' + mt);
}

function encodeHead(mt, val) {
  if (val < 24) return Uint8Array.of((mt << 5) | val);
  if (val < 256) return Uint8Array.of((mt << 5) | 24, val);
  if (val < 65536) {
    const b = new Uint8Array(3);
    b[0] = (mt << 5) | 25;
    b[1] = val >> 8;
    b[2] = val & 0xff;
    return b;
  }
  const b = new Uint8Array(5);
  b[0] = (mt << 5) | 26;
  b[1] = (val >> 24) & 0xff;
  b[2] = (val >> 16) & 0xff;
  b[3] = (val >> 8) & 0xff;
  b[4] = val & 0xff;
  return b;
}

function encodeBytes(bytes) {
  const head = encodeHead(2, bytes.length);
  const out = new Uint8Array(head.length + bytes.length);
  out.set(head, 0);
  out.set(bytes, head.length);
  return out;
}

function encodeText(s) {
  const enc = new TextEncoder().encode(s);
  const head = encodeHead(3, enc.length);
  const out = new Uint8Array(head.length + enc.length);
  out.set(head, 0);
  out.set(enc, head.length);
  return out;
}

function encodeArray(items) {
  const chunks = [];
  let totalLen = 0;
  for (const item of items) {
    const chunk = encodeAny(item);
    chunks.push(chunk);
    totalLen += chunk.length;
  }
  const head = encodeHead(4, items.length);
  const out = new Uint8Array(head.length + totalLen);
  out.set(head, 0);
  let pos = head.length;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}

function encodeAny(val) {
  if (typeof val === 'string') return encodeText(val);
  if (val instanceof Uint8Array || val instanceof Buffer || Array.isArray(val)) {
    const bytes = val instanceof Uint8Array ? val : new Uint8Array(val);
    return encodeBytes(bytes);
  }
  if (val === null || val === undefined) {
    return Uint8Array.of(0xf6);
  }
  if (typeof val === 'number') {
    if (val >= 0) {
      const head = encodeHead(0, val);
      return head.length === 1 ? head : head;
    }
    return Uint8Array.of(0x20); // simplified for -1 only
  }
  throw new Error('CBOR encode: unsupported type ' + typeof val);
}

/* CIP-8 Verification */

function hexToBytes(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyCIP8({ address, payload, signature, key }) {
  const sigBytes = hexToBytes(signature);
  const keyBytes = hexToBytes(key);
  const payloadBytes = new TextEncoder().encode(payload);

  const [coseSign1] = decodeItem(sigBytes, 0);
  if (!Array.isArray(coseSign1) || coseSign1.length !== 4) {
    throw new Error('Invalid COSE_Sign1 structure');
  }
  const [protectedBytes, unprotected, signedPayload, sigValue] = coseSign1;

  if (!(signedPayload instanceof Uint8Array) || bytesToHex(signedPayload) !== bytesToHex(payloadBytes)) {
    throw new Error('Signed payload does not match original message');
  }

  const [coseKey] = decodeItem(keyBytes, 0);
  let publicKey;
  if (coseKey instanceof Map) {
    publicKey = coseKey.get(-2);
  } else if (coseKey && typeof coseKey === 'object') {
    publicKey = coseKey[-2] || coseKey['-2'];
  }
  if (!publicKey) throw new Error('Could not extract public key from COSE_Key');

  const externalAad = new Uint8Array(0);
  const sigStructure = encodeArray([
    'Signature1',
    protectedBytes,
    externalAad,
    signedPayload,
  ]);

  const isValid = await ed25519.verify(
    sigValue,
    sigStructure,
    publicKey
  );
  if (!isValid) throw new Error('Signature verification failed');

  const keyHash = blake2b(publicKey, { dkLen: 28 });

  let decoded;
  try {
    decoded = bech32.decode(address);
  } catch {
    throw new Error('Invalid address format');
  }
  const addrBytes = new Uint8Array(bech32.fromWords(decoded.words));

  let match = false;
  if (addrBytes.length >= 29) {
    const addrKeyHash = addrBytes.slice(1, 29);
    if (bytesToHex(keyHash) === bytesToHex(addrKeyHash)) match = true;
  }
  if (!match && addrBytes.length >= 57) {
    const addrKeyHash = addrBytes.slice(29, 57);
    if (bytesToHex(keyHash) === bytesToHex(addrKeyHash)) match = true;
  }
  if (!match) throw new Error('Public key does not correspond to the provided address');
}

/* Handler */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured.' });
  }
  if (!process.env.BLOCKFROST_API_KEY) {
    return res.status(500).json({ error: 'Blockfrost not configured.' });
  }

  try {
    const { address, payload, signature, key, proposalId, choice } = req.body;

    if (!address || !payload || !signature || !key || !proposalId || !choice) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await verifyCIP8({ address, payload, signature, key });

    const { data: proposal, error: proposalErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (proposalErr || !proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const assetId = `${proposal.target_policy_id}${proposal.target_asset_name}`;
    const blockfrostUrl = `https://cardano-${process.env.BLOCKFROST_NETWORK || 'mainnet'}.blockfrost.io/api/v0`;
    const headers = { project_id: process.env.BLOCKFROST_API_KEY };

    let totalBalance = 0n;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${blockfrostUrl}/addresses/${address}/utxos/${assetId}?page=${page}&count=100`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) break;
      const utxos = await resp.json();
      if (!Array.isArray(utxos) || utxos.length === 0) break;

      for (const utxo of utxos) {
        if (utxo.block_height <= proposal.snapshot_block) {
          const amount = utxo.amount.find(a => a.unit === assetId);
          if (amount) totalBalance += BigInt(amount.quantity);
        }
      }
      hasMore = utxos.length === 100;
      page++;
    }

    if (totalBalance <= 0n) {
      return res.status(403).json({ error: 'No token balance held at snapshot block' });
    }

    const { error: voteErr } = await supabase
      .from('votes')
      .upsert({
        proposal_id: proposalId,
        voter_address: address,
        vote_choice: choice,
        signature_hex: signature,
        key_hex: key,
        stake_weight: totalBalance.toString(),
      }, { onConflict: 'proposal_id,voter_address' });

    if (voteErr) throw voteErr;

    return res.json({
      success: true,
      stakeWeight: totalBalance.toString(),
    });
  } catch (error) {
    console.error('Vote error:', error);
    return res.status(400).json({ error: error.message });
  }
}
