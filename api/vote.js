import { createClient } from '@supabase/supabase-js';
import cbor from 'cbor';
import { ed25519 } from '@noble/ed25519';
import { blake2b } from '@noble/hashes/blake2b';
import { bech32 } from 'bech32';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

  const coseSign1 = await cbor.decodeFirst(sigBytes);
  const [protectedBytes, unprotected, signedPayload, sigValue] = coseSign1;

  if (bytesToHex(new Uint8Array(signedPayload)) !== bytesToHex(payloadBytes)) {
    throw new Error('Signed payload does not match original message');
  }

  const coseKey = await cbor.decodeFirst(keyBytes);
  let publicKey;
  if (coseKey instanceof Map) {
    publicKey = coseKey.get(-2);
  } else {
    publicKey = coseKey[-2] || coseKey['-2'];
  }
  if (!publicKey) throw new Error('Could not extract public key from COSE_Key');

  const externalAad = Buffer.alloc(0);
  const sigStructure = ['Signature1', protectedBytes, externalAad, signedPayload];
  const sigStructureBytes = new Uint8Array(cbor.encode(sigStructure));

  const isValid = await ed25519.verify(
    new Uint8Array(sigValue),
    sigStructureBytes,
    new Uint8Array(publicKey)
  );
  if (!isValid) throw new Error('Signature verification failed');

  const keyHash = blake2b(new Uint8Array(publicKey), { dkLen: 28 });

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.' });
  }
  if (!process.env.BLOCKFROST_API_KEY) {
    return res.status(500).json({ error: 'Blockfrost not configured. Set BLOCKFROST_API_KEY env var.' });
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
