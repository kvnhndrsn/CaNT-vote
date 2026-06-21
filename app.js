import { bech32 } from 'bech32';

console.log('[app] module loaded');

const KNOWN_WALLETS = [
  { id: 'eternl', name: 'Eternl', icon: 'E' },
  { id: 'nami', name: 'Nami', icon: 'N' },
  { id: 'lace', name: 'Lace', icon: 'L' },
  { id: 'flint', name: 'Flint', icon: 'F' },
  { id: 'gerowallet', name: 'Gero', icon: 'G' },
  { id: 'typhoncip30', name: 'Typhon', icon: 'T' },
  { id: 'vespr', name: 'Vespr', icon: 'V' },
  { id: 'begin', name: 'Begin', icon: 'B' },
];

const state = {
  wallet: null,
  api: null,
  address: null,
  hexAddress: null,
  proposals: [],
  currentProposal: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3500);
}

function shorten(s, n = 8) {
  if (!s || s.length <= n * 2 + 3) return s || '';
  return s.slice(0, n) + '...' + s.slice(-n);
}

function formatWeight(w) {
  const n = BigInt(w);
  if (n >= 1_000_000n) return (Number(n) / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000n) return (Number(n) / 1_000).toFixed(2) + 'K';
  return n.toString();
}

/* ---------- Proposals ---------- */

async function fetchProposals() {
  try {
    const res = await fetch('/api/proposals');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Server error (${res.status})`);
    }
    state.proposals = await res.json();
    renderProposals();
  } catch (e) {
    console.error(e);
    $('#proposalList').innerHTML =
      '<div class="empty-state"><strong>Could not load proposals</strong><p>' + escHtml(e.message) + '</p></div>';
  }
}

function renderProposals() {
  const list = $('#proposalList');
  const count = $('#proposalCount');
  count.textContent = state.proposals.length;

  if (state.proposals.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><strong>No proposals yet</strong><p>Be the first to create one!</p></div>';
    return;
  }

  list.innerHTML = state.proposals.map(p => {
    const assetLabel = p.target_asset_name
      ? shorten(p.target_policy_id, 6) + '.' + p.target_asset_name
      : shorten(p.target_policy_id, 6);
    return `
      <div class="proposal-card" data-id="${p.id}">
        <h3>${escHtml(p.title)}</h3>
        <div class="meta">
          <span>${assetLabel}</span>
          <span>Snapshot: #${p.snapshot_block}</span>
          <span>by ${shorten(p.creator_address, 6)}</span>
        </div>
        <div class="desc">${escHtml(p.description)}</div>
        <div class="actions">
          <button class="btn btn-sm btn-primary vote-btn">Vote</button>
          <button class="btn btn-sm audit-btn">Audit</button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.proposal-card').dataset.id;
      openVoteModal(id);
    });
  });

  list.querySelectorAll('.audit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.proposal-card').dataset.id;
      openAuditModal(id);
    });
  });
}

function escHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/* ---------- Wallet ---------- */

function getAvailableWallets() {
  const available = [];
  const cardano = window.cardano || {};
  for (const w of KNOWN_WALLETS) {
    const ext = cardano[w.id];
    if (ext && typeof ext.enable === 'function') {
      available.push({ ...w, icon: ext.icon || w.icon, version: ext.apiVersion });
    }
  }
  return available;
}

function openWalletModal() {
  const list = $('#walletList');
  const available = getAvailableWallets();

  if (available.length === 0) {
    list.innerHTML =
      '<p class="tooltip" style="text-align:center;padding:1rem 0">No Cardano wallet detected. Install Eternl, Nami, or Lace.</p>';
  } else {
    list.innerHTML = available.map(w => `
      <button class="wallet-btn" data-wallet="${w.id}">
        <span class="dot"></span>
        ${w.name}
      </button>
    `).join('');

    list.querySelectorAll('.wallet-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await connectWallet(btn.dataset.wallet);
      });
    });
  }

  $('#walletModal').classList.add('open');
}

async function connectWallet(walletId) {
  try {
    const ext = window.cardano[walletId];
    if (!ext) throw new Error('Wallet not found');

    const api = await ext.enable();
    const usedAddrs = await api.getUsedAddresses();
    const rewardAddrs = await api.getRewardAddresses();
    const rawHex = usedAddrs[0] || rewardAddrs[0];
    if (!rawHex) throw new Error('No address returned');

    const addr = hexToBech32(rawHex);

    state.wallet = walletId;
    state.api = api;
    state.address = addr;
    state.hexAddress = rawHex;

    updateWalletUI();
    toast('Connected: ' + shorten(addr, 8), 'success');
    $('#walletModal').classList.remove('open');
  } catch (e) {
    console.error(e);
    toast('Connection failed: ' + e.message, 'error');
  }
}

function hexToBech32(hex) {
  if (!hex || hex.length < 2) throw new Error('Invalid hex address');
  const pairs = hex.match(/.{1,2}/g);
  if (!pairs) throw new Error('Invalid hex address');
  const bytes = new Uint8Array(pairs.map(b => parseInt(b, 16)));
  const header = bytes[0];
  const addrType = header & 0x0f;
  const isStake = addrType >= 14;
  const prefix = isStake ? 'stake' : 'addr';
  return bech32.encode(prefix, bech32.toWords(bytes), 200);
}

function updateWalletUI() {
  const area = $('#walletArea');
  if (state.address) {
    area.innerHTML = `
      <span class="tooltip" style="margin-right:0.25rem">${shorten(state.address, 8)}</span>
      <button class="btn btn-sm" id="disconnectBtn">Disconnect</button>
    `;
    $('#disconnectBtn').addEventListener('click', disconnectWallet);
    $('#createBtn').style.display = '';
  } else {
    area.innerHTML = `<button class="btn btn-sm btn-primary" id="connectBtn">Connect Wallet</button>`;
    $('#connectBtn').addEventListener('click', openWalletModal);
    $('#createBtn').style.display = 'none';
  }
}

function disconnectWallet() {
  state.wallet = null;
  state.api = null;
  state.address = null;
  state.hexAddress = null;
  updateWalletUI();
  toast('Disconnected');
}

/* ---------- Voting ---------- */

async function openVoteModal(proposalId) {
  if (!state.api) {
    toast('Connect your wallet first', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/proposals?id=${proposalId}`);
    if (!res.ok) throw new Error('Proposal not found');
    const proposal = await res.json();
    state.currentProposal = proposal;

    $('#voteModalTitle').textContent = proposal.title;
    $('#voteTokenInfo').textContent = `Snapshot: #${proposal.snapshot_block}`;

    const assetId = proposal.target_policy_id + (proposal.target_asset_name || '');
    const tokenLabel = proposal.target_asset_name
      ? shorten(proposal.target_policy_id, 6) + '.' + proposal.target_asset_name
      : shorten(proposal.target_policy_id, 6);

    $('#voteTokenSelector').innerHTML = `
      <label class="token-option selected" data-token="lovelace">
        <input type="radio" name="tokenUnit" value="lovelace" checked>
        <span>ADA</span>
      </label>
      <label class="token-option" data-token="${escHtml(assetId)}">
        <input type="radio" name="tokenUnit" value="${escHtml(assetId)}">
        <span>${escHtml(tokenLabel)}</span>
      </label>
    `;

    $('#voteTokenSelector').querySelectorAll('.token-option').forEach(el => {
      el.addEventListener('click', () => {
        $('#voteTokenSelector').querySelectorAll('.token-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        el.querySelector('input').checked = true;
      });
    });

    const optionsDiv = $('#voteOptions');
    if (proposal.tally && Object.keys(proposal.tally).length > 0) {
      const total = BigInt(proposal.totalWeight || 0);
      optionsDiv.innerHTML = Object.entries(proposal.tally).map(([choice, weight]) => {
        const pct = total > 0n ? (Number(BigInt(weight)) / Number(total) * 100).toFixed(1) : 0;
        return `
          <label class="vote-option" data-choice="${escHtml(choice)}">
            <input type="radio" name="voteChoice" value="${escHtml(choice)}">
            <span>${escHtml(choice)} (${formatWeight(weight)} — ${pct}%)</span>
          </label>
        `;
      }).join('');
    } else {
      optionsDiv.innerHTML = ['Yes', 'No', 'Abstain'].map(c => `
        <label class="vote-option" data-choice="${c}">
          <input type="radio" name="voteChoice" value="${c}">
          <span>${c}</span>
        </label>
      `).join('');
    }

    optionsDiv.querySelectorAll('.vote-option').forEach(el => {
      el.addEventListener('click', () => {
        optionsDiv.querySelectorAll('.vote-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        el.querySelector('input').checked = true;
      });
    });

    $('#voteModal').classList.add('open');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

console.log('[vote] attaching listener for #voteSubmitBtn');
const voteBtn = $('#voteSubmitBtn');
console.log('[vote] button element:', voteBtn);
voteBtn?.addEventListener('click', submitVote);
console.log('[vote] listener attached');

async function submitVote() {
  console.log('[vote] submitVote called');
  try {
    const selected = $('#voteOptions input[name="voteChoice"]:checked');
    console.log('[vote] selected:', selected);
    if (!selected) {
      toast('Select a voting option', 'error');
      return;
    }

    const btn = $('#voteSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Signing...';

    console.log('[vote] state:', { api: !!state.api, hexAddr: state.hexAddress?.slice(0, 20), addr: state.address?.slice(0, 20) });

    const proposal = state.currentProposal;
    const choice = selected.value;
    const tokenUnit = document.querySelector('input[name="tokenUnit"]:checked')?.value || 'lovelace';
    const payload = JSON.stringify({
      proposalId: proposal.id,
      choice,
      timestamp: Date.now(),
    });

    const hexPayload = bytesToHex(new TextEncoder().encode(payload));
    console.log('[vote] calling signData with hexPayload:', hexPayload.slice(0, 30) + '...');

    console.log('[vote] signData typeof:', typeof state.api?.signData);
    const result = await state.api.signData(state.hexAddress, hexPayload);
    console.log('[vote] signData result keys:', Object.keys(result));

    const voteRes = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: state.address,
        payload,
        signature: result.signature,
        key: result.key,
        proposalId: proposal.id,
        choice,
        tokenUnit,
      }),
    });

    console.log('[vote] server response status:', voteRes.status);
    const data = await voteRes.json();
    if (!voteRes.ok) throw new Error(data.error);

    toast(`Vote cast! Weight: ${formatWeight(data.stakeWeight)}`, 'success');
    $('#voteModal').classList.remove('open');
    fetchProposals();
  } catch (e) {
    console.error('[vote] error:', e);
    toast('Vote failed: ' + e.message, 'error');
  } finally {
    const btn = $('#voteSubmitBtn');
    if (btn) { btn.disabled = false; btn.textContent = 'Sign & Submit Vote'; }
  }
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- Audit ---------- */

async function openAuditModal(proposalId) {
  try {
    const res = await fetch(`/api/audit?proposalId=${proposalId}`);
    if (!res.ok) throw new Error('Audit data not found');
    const data = await res.json();

    $('#auditInfo').textContent = `${data.votes.length} vote(s) · Snapshot: #${data.proposal.snapshot_block}`;

    if (data.votes.length === 0) {
      $('#auditTableWrap').innerHTML = '<p class="tooltip" style="text-align:center;padding:1rem 0">No votes recorded yet.</p>';
    } else {
      $('#auditTableWrap').innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Voter</th>
              <th>Choice</th>
              <th>Weight</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>
            ${data.votes.map(v => `
              <tr>
                <td>${shorten(v.voter_address, 6)}</td>
                <td>${escHtml(v.vote_choice)}</td>
                <td>${formatWeight(v.stake_weight)}</td>
                <td title="${v.signature_hex}">${shorten(v.signature_hex, 6)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const jsonStr = JSON.stringify(data, null, 2);
    $('#copyAuditBtn').onclick = () => {
      navigator.clipboard.writeText(jsonStr).then(
        () => toast('Audit JSON copied', 'success'),
        () => toast('Failed to copy', 'error'),
      );
    };
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    $('#downloadAuditBtn').href = url;
    $('#downloadAuditBtn').download = `audit-${proposalId}.json`;

    $('#auditModal').classList.add('open');
  } catch (e) {
    toast('Audit error: ' + e.message, 'error');
  }
}

/* ---------- Create Proposal ---------- */

$('#createBtn').addEventListener('click', () => {
  if (!state.api) { toast('Connect wallet first', 'error'); return; }
  $('#createModal').classList.add('open');
});

$('#createSubmitBtn').addEventListener('click', createProposal);

async function createProposal() {
  const title = $('#propTitle').value.trim();
  const description = $('#propDesc').value.trim();
  const policy = $('#propPolicy').value.trim();
  const asset = $('#propAsset').value.trim();
  const blockInput = $('#propBlock').value.trim();

  if (!title || !description || !policy) {
    toast('Fill in title, description, and policy ID', 'error');
    return;
  }

  const btn = $('#createSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    const snapshotBlock = blockInput ? parseInt(blockInput) : null;

    const payload = JSON.stringify({
      title, description, policy, asset, snapshotBlock, timestamp: Date.now(),
    });
    const hexPayload = bytesToHex(new TextEncoder().encode(payload));
    const sig = await state.api.signData(state.hexAddress, hexPayload);

    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        targetPolicyId: policy,
        targetAssetName: asset,
        snapshotBlock,
        creatorAddress: state.address,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    toast('Proposal created!', 'success');
    $('#createModal').classList.remove('open');
    $('#propTitle').value = '';
    $('#propDesc').value = '';
    $('#propPolicy').value = '';
    $('#propAsset').value = '';
    $('#propBlock').value = '';
    fetchProposals();
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Proposal';
  }
}

/* ---------- Modal close ---------- */

$$('[data-close]').forEach(el => {
  el.addEventListener('click', () => {
    $('#' + el.dataset.close).classList.remove('open');
  });
});

$$('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  updateWalletUI();
  fetchProposals();
});

$('#connectBtn')?.addEventListener('click', openWalletModal);
