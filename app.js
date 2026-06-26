import { bech32 } from 'bech32';

console.log('[app] module loaded');

const WALLET_LOGOS = {
  eternl: '/img/eternl.png',
  nami: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#f7931a"/><text x="16" y="22" font-size="16" text-anchor="middle" fill="white" font-weight="bold">N</text></svg>'),
  lace: '/img/lace.svg',
  flint: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#00b4d8"/><text x="16" y="22" font-size="16" text-anchor="middle" fill="white" font-weight="bold">F</text></svg>'),
  gerowallet: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#7c3aed"/><text x="16" y="22" font-size="16" text-anchor="middle" fill="white" font-weight="bold">G</text></svg>'),
  typhoncip30: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#10b981"/><text x="16" y="22" font-size="16" text-anchor="middle" fill="white" font-weight="bold">T</text></svg>'),
  vespr: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#f43f5e"/><text x="16" y="22" font-size="16" text-anchor="middle" fill="white" font-weight="bold">V</text></svg>'),
  begin: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#6366f1"/><text x="16" y="22" font-size="16" text-anchor="middle" fill="white" font-weight="bold">B</text></svg>'),
};

const KNOWN_WALLETS = [
  { id: 'eternl', name: 'Eternl' },
  { id: 'nami', name: 'Nami' },
  { id: 'lace', name: 'Lace' },
  { id: 'flint', name: 'Flint' },
  { id: 'gerowallet', name: 'Gero' },
  { id: 'typhoncip30', name: 'Typhon' },
  { id: 'vespr', name: 'Vespr' },
  { id: 'begin', name: 'Begin' },
];

const TOKEN_LOGOS = {
  ADA: '/img/cardano-starburst.svg',
};

const CURATED_TOKENS = [
  { label: 'SNEK',  policy: '279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3f', asset: '534e454b', fingerprint: 'asset108xu02ckwrfc8qs9d97mgyh4kn8gdu9w8f5sxk' },
  { label: 'NIGHT', policy: '0691b2fecca1ac4f53cb6dfb00b7013e561d1f34403b957cbb5af1fa', asset: '4e49474854', fingerprint: 'asset1wd3llgkhsw6etxf2yca6cgk9ssrpva3wf0pq9a' },
  { label: 'WMTX',  policy: 'e5a42a1a1d3d1da71b0449663c32798725888d2eb0843c4dabeca05a', asset: '576f726c644d6f62696c65546f6b656e58', fingerprint: 'asset1l2xup5vr08s07lxg5c4kkj7ur624rv5ayzhyc7' },
  { label: 'MIN',   policy: '29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6', asset: '4d494e', fingerprint: 'asset1d9v7aptfvpx7we2la8f25kwprkj2ma5rp6uwzv' },
  { label: 'STRIKE',policy: 'f13ac4d66b3ee19a6aa0f2a22298737bd907cc95121662fc971b5275', asset: '535452494b45', fingerprint: 'asset1tdalpjgjmt2vrhq9fvwzxqgqcq8ydr7e7e0eta' },
  { label: 'SUNDAE',policy: '9a9693a9a37912a5097918f97918d15240c92ab729a0b7c4aa144d77', asset: '53554e444145', fingerprint: 'asset1m4u92ke6820pkk07m8qmmguye02ewr8g6tezr0' },
  { label: 'SURF',  policy: '2d9db8a89f074aa045eab177f23a3395f62ced8b53499a9e4ad46c80', asset: '464c4f57', fingerprint: '' },
];

let Chart = null;

function loadChartScript() {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensureChart() {
  if (Chart) return;
  await loadChartScript();
  Chart = window.Chart;
}

const POLL_COLORS = [
  '#22c55e', '#ef4444', '#3b82f6', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const state = {
  wallet: null,
  api: null,
  address: null,
  addresses: [],
  stakeAddresses: [],
  hexAddress: null,
  proposals: [],
  currentProposal: null,
  filterToken: '',
  pollSearch: '',
  pollCategory: '',

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

const handleCache = new Map();

async function prefetchHandles(addresses) {
  const uncached = [...new Set(addresses.filter(a => a && a.startsWith('addr') && !handleCache.has(a)))];
  if (uncached.length === 0) return;
  try {
    const res = await fetch('/api/resolve-handles?addresses=' + encodeURIComponent(uncached.join(',')));
    if (!res.ok) return;
    const map = await res.json();
    for (const [addr, handle] of Object.entries(map)) {
      handleCache.set(addr, handle);
    }
  } catch {}
}

function displayAddr(address, fallback) {
  if (!address) return fallback || '';
  const h = handleCache.get(address);
  if (h) return h;
  return fallback || shorten(address, 6);
}

function formatWeight(w) {
  const n = BigInt(w);
  if (n >= 1_000_000n) return (Number(n) / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000n) return (Number(n) / 1_000).toFixed(2) + 'K';
  return n.toString();
}

function pctStr(part, total) {
  if (!total || total === '0') return '0%';
  return (Number(BigInt(part)) / Number(BigInt(total)) * 100).toFixed(1) + '%';
}

function pctNum(part, total) {
  if (!total || total === '0') return 0;
  return Number(BigInt(part)) / Number(BigInt(total)) * 100;
}

/* ---------- Polls ---------- */

async function fetchProposals() {
  try {
    const res = await fetch('/api/proposals');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Server error (${res.status})`);
    }
    state.proposals = await res.json();
    await prefetchHandles(state.proposals.map(p => p.creator_address));
    renderMiniCards();
    renderFilter();
    renderProposals();
  } catch (e) {
    console.error(e);
    $('#proposalList').innerHTML =
      '<div class="empty-state"><strong>Could not load polls</strong><p>' + escHtml(e.message) + '</p></div>';
  }
}

function renderMiniCards() {
  const container = $('#miniCards');
  const proposals = state.proposals;
  if (proposals.length === 0) {
    container.innerHTML = '';
    return;
  }

  function miniTally(p) {
    const summary = p.voteSummary || {};
    const total = BigInt(p.totalVoteWeight || '0');
    const opts = p.options || ['Yes', 'No', 'Abstain'];
    if (total <= 0n) return '';
    const segs = opts.map((opt, i) => {
      const pct = pctNum(summary[opt] || '0', total.toString());
      return `<div class="mini-tally-seg" style="flex:${pct};background:${getOptionColor(i)}"></div>`;
    }).join('');
    const pcts = opts.slice(0, 2).map((opt, i) => {
      return `<span style="color:${getOptionColor(i)}">${pctStr(summary[opt] || '0', total.toString())}</span>`;
    }).join('');
    return `<div class="mini-tally-bar">${segs}</div><div class="mini-tally-pcts">${pcts}</div>`;
  }

  const withVotes = proposals.filter(p => p.totalVoteWeight && BigInt(p.totalVoteWeight) > 0n);

  // 1) Most votes (highest totalVoteWeight)
  let mostVotesCard = '';
  if (withVotes.length > 0) {
    const best = withVotes.reduce((a, b) => BigInt(a.totalVoteWeight) > BigInt(b.totalVoteWeight) ? a : b);
      mostVotesCard = `
      <div class="mini-card">
        <span class="mini-label">Most Voted</span>
        <span class="mini-value">${formatWeight(best.totalVoteWeight)}</span>
        ${miniTally(best)}
        <span class="mini-sub">${escHtml(best.title)}</span>
      </div>`;
  }

  // 2) Highest % of total supply voted
  let highestPctCard = '';
  if (withVotes.length > 0) {
    const pctVals = withVotes.map(p => {
      const total = p.totalSupply ? Number(BigInt(p.totalSupply)) : null;
      const voted = Number(BigInt(p.totalVoteWeight));
      const pct = total && total > 0 ? (voted / total) * 100 : 0;
      return { p, pct };
    });
    const best = pctVals.reduce((a, b) => a.pct > b.pct ? a : b);
    if (best.pct > 0) {
      highestPctCard = `
        <div class="mini-card">
          <span class="mini-label">Highest Turnout</span>
          <span class="mini-value">${best.pct >= 1 ? best.pct.toFixed(2) : best.pct.toFixed(4)}%</span>
          ${miniTally(best.p)}
          <span class="mini-sub">${escHtml(best.p.title)}</span>
        </div>`;
    }
  }

  // 3) Newest proposal
  const newest = proposals.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
  const newestCard = `
    <div class="mini-card">
      <span class="mini-label">Newest</span>
      <span class="mini-value">${escHtml(newest.title)}</span>
      ${newest.totalVoteWeight && BigInt(newest.totalVoteWeight) > 0n ? miniTally(newest) : ''}
      <span class="mini-sub">${new Date(newest.created_at).toLocaleDateString()}</span>
    </div>`;

  container.innerHTML = `
    <div class="mini-cards-inner">
      ${mostVotesCard || '<div class="mini-card mini-card-empty"><span class="mini-label">Most Votes</span><span class="mini-sub">No votes yet</span></div>'}
      ${highestPctCard || '<div class="mini-card mini-card-empty"><span class="mini-label">Highest Turnout</span><span class="mini-sub">No votes yet</span></div>'}
      ${newestCard}
    </div>`;
}

function renderFilter() {
  const tokens = {};
  for (const p of state.proposals) {
    const id = p.target_fingerprint || p.target_policy_id || 'ADA';
    if (!tokens[id]) {
      const localLogo = id !== 'ADA' ? tokenLogo(p.target_policy_id, p.target_fingerprint) : null;
      const displayLabel = id === 'ADA' ? 'ADA' : (p.tokenName || (p.target_fingerprint ? shorten(p.target_fingerprint, 5) : shorten(p.target_policy_id, 8)));
      tokens[id] = { label: displayLabel, image: id === 'ADA' ? null : (p.tokenImage || localLogo), id };
    }
  }
  const list = Object.values(tokens);
  const container = $('#tokenFilter');
  if (list.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <select id="tokenSelect" class="poll-select">
      <option value="">All Tokens</option>
      ${list.map(t => `
        <option value="${escHtml(t.id)}" ${state.filterToken === t.id ? 'selected' : ''}>
          ${escHtml(t.label)}
        </option>
      `).join('')}
    </select>
  `;
  $('#tokenSelect').addEventListener('change', (e) => {
    state.filterToken = e.target.value;
    renderProposals();
  });
}

function pieSvg(summary, total, options) {
  if (!total || total === '0') return '';
  const t = Number(total);
  const opts = options || ['Yes', 'No', 'Abstain'];
  const r = 10, cx = 12, cy = 12;
  let accum = 0;
  let paths = '';
  opts.forEach((choice, i) => {
    const weight = summary[choice];
    const pct = weight ? Number(weight) / t : 0;
    if (pct === 0) return;
    const a1 = accum * 360;
    const a2 = (accum + pct) * 360;
    accum += pct;
    const x1 = cx + r * Math.sin(a1 * Math.PI / 180);
    const y1 = cy - r * Math.cos(a1 * Math.PI / 180);
    const x2 = cx + r * Math.sin(a2 * Math.PI / 180);
    const y2 = cy - r * Math.cos(a2 * Math.PI / 180);
    const large = pct > 0.5 ? 1 : 0;
    paths += `<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${getOptionColor(i)}"/>`;
  });
  if (accum < 1) paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-dasharray="2 2"/>`;
  return `<svg width="40" height="40" viewBox="0 0 24 24" style="flex-shrink:0"><circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--surface2)"/>${paths}</svg>`;
}

function getOptionColor(index) {
  return POLL_COLORS[index % POLL_COLORS.length];
}

function renderProposals() {
  const list = $('#proposalList');
  const count = $('#pollCount');

  // Apply all filters
  let filtered = state.proposals;

  if (state.filterToken) {
    filtered = filtered.filter(p => {
      if (state.filterToken === 'ADA') return !p.target_policy_id;
      return (p.target_fingerprint && p.target_fingerprint === state.filterToken) || p.target_policy_id === state.filterToken;
    });
  }

  if (state.pollCategory) {
    filtered = filtered.filter(p => (p.category || 'General') === state.pollCategory);
  }

  if (state.pollSearch) {
    const q = state.pollSearch.toLowerCase();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }

  count.textContent = filtered.length;

  if (filtered.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><strong>No polls found</strong><p>' +
      (state.filterToken || state.pollCategory || state.pollSearch ? 'Try different filters.' : 'Be the first to create one!') +
      '</p></div>';
    return;
  }

  const fmtPct = (v) => (v * 100).toFixed(1) + '%';

  list.innerHTML = filtered.map(p => {
    const isADA = !p.target_policy_id;
    const assetLabel = isADA ? 'ADA' : (p.tokenName || (p.target_fingerprint
      ? shorten(p.target_fingerprint, 5)
      : (p.target_asset_name
        ? shorten(p.target_policy_id, 6) + '.' + p.target_asset_name
        : shorten(p.target_policy_id, 6))));

    const summary = p.voteSummary || {};
    const total = BigInt(p.totalVoteWeight || '0');
    const isCreator = state.address && p.creator_address === state.address;
    const pollOptions = p.options || ['Yes', 'No', 'Abstain'];
    const category = p.category || 'General';
    const votingType = p.voting_type || 'standard';

    function supplyPct(totalStr, supplyStr) {
      const t = Number(totalStr), s = Number(supplyStr);
      if (!s || s <= 0) return '';
      const pct = (t / s) * 100;
      if (pct >= 1) return pct.toFixed(2) + '%';
      if (pct >= 0.01) return pct.toFixed(4) + '%';
      return pct.toFixed(6) + '%';
    }

    let tallyHtml = '';
    if (total > 0n) {
      const totalS = p.totalSupply ? BigInt(p.totalSupply) : null;
      const circS = p.circulatingSupply ? BigInt(p.circulatingSupply) : null;
      const totalPct = totalS ? supplyPct(total.toString(), totalS.toString()) : null;
      const circPct = circS && circS !== totalS ? supplyPct(total.toString(), circS.toString()) : null;
      const unit = isADA ? 'lovelace' : p.tokenName || (p.target_asset_name || '');
      const pctParts = [];
      if (totalPct) pctParts.push(totalPct + ' of total');
      if (circPct) pctParts.push(circPct + ' of circ');
      const pctStr2 = pctParts.length > 0 ? ' · ' + pctParts.join(' · ') : '';

      const segs = pollOptions.map((opt, i) => {
        const w = summary[opt] || '0';
        const pct = pctNum(w, total.toString());
        return `<div class="tally-bar-seg" style="flex:${pct};background:${getOptionColor(i)}" title="${escHtml(opt)} ${pct.toFixed(1)}%"></div>`;
      }).join('');

      const bar = `<div class="tally-bar">${segs}</div>`;

      const lines = pollOptions.map((opt, i) => {
        const w = summary[opt] || '0';
        return `<span class="tally-line"><span class="tally-dot" style="background:${getOptionColor(i)}"></span><strong>${pctStr(w, total.toString())}</strong> ${escHtml(opt)} <span class="tally-w">${formatWeight(w)}</span></span>`;
      }).join('');

      tallyHtml = `
        <div class="card-tally">
          ${bar}
          <div class="tally-lines">${lines}</div>
          <div class="tally-total">${formatWeight(total.toString())} ${escHtml(unit)}${pctStr2}</div>
        </div>
      `;
    }

    const localLogo = tokenLogo(p.target_policy_id, p.target_fingerprint);
    const imgSrc = p.tokenImage || localLogo;
    const imgHtml = imgSrc
      ? `<img class="token-thumb" src="${escHtml(imgSrc)}" alt="">`
      : '';

    const deleteBtn = isCreator
      ? `<button class="btn btn-danger delete-btn" data-id="${p.id}">Delete</button>`
      : '';

    const vtLabel = votingType === 'quadratic' ? ' ✓' : '';

    return `
      <div class="proposal-card" data-id="${p.id}">
        <div class="card-header">
          ${imgHtml}
          <div class="card-body">
            <div class="card-title-row">
              <h3>${escHtml(p.title)}</h3>
              <div class="card-actions">
                <button class="btn btn-primary vote-btn">Vote${vtLabel}</button>
                <button class="btn audit-btn">Audit</button>
                ${deleteBtn}
              </div>
            </div>
            <div class="meta">
              <span class="poll-category">${escHtml(category)}</span>
              <span>${escHtml(assetLabel)}</span>
              <span class="expiry" data-expires="${p.expiresAt}">--</span>
              <span>by ${escHtml(displayAddr(p.creator_address, shorten(p.creator_address, 6)))}</span>
            </div>
            <div class="desc">${escHtml(p.description)}</div>
            <div class="extra" style="display:none">
              <div class="meta" style="margin-top:0.3rem">
                <span>Created ${new Date(p.created_at).toLocaleString()}</span>
                <span style="font-size:0.65rem">Vote type: ${votingType}${p.allow_split ? ' · split allowed' : ''}</span>
              </div>
            </div>
            ${tallyHtml}
            <div class="meta" style="margin-top:0.25rem">

            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.proposal-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-actions') || e.target.closest('button')) return;
      card.classList.toggle('expanded');
      const extra = card.querySelector('.extra');
      if (extra) extra.style.display = card.classList.contains('expanded') ? '' : 'none';
    });
  });

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

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if (!confirm('Delete this poll?')) return;
      try {
        const res = await fetch('/api/proposals', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, creatorAddress: state.address }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast('Poll deleted', 'success');
        fetchProposals();
      } catch (ex) {
        toast('Delete failed: ' + ex.message, 'error');
      }
    });
  });

  updateCountdowns();
}

function updateCountdowns() {
  document.querySelectorAll('.expiry').forEach(el => {
    const expires = new Date(el.dataset.expires).getTime();
    const now = Date.now();
    const diff = expires - now;
    if (diff <= 0) {
      el.textContent = 'Expired';
      return;
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = h + 'h ' + m + 'm ' + s + 's';
  });
}

function tokenLogo(policyId, fingerprint, label) {
  if (!policyId && !fingerprint) return TOKEN_LOGOS.ADA;
  const assetHex = policyId && (CURATED_TOKENS.find(t => t.policy === policyId)?.asset || '');
  const fullHex = assetHex ? policyId + assetHex : null;
  if (fullHex && tokenLogoCache.has(fullHex)) return tokenLogoCache.get(fullHex);
  if (fingerprint) {
    const t = CURATED_TOKENS.find(t => t.fingerprint === fingerprint);
    if (t && tokenLogoCache.has(t.policy + t.asset)) return tokenLogoCache.get(t.policy + t.asset);
  }
  return null;
}

function escHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  const words = [
    'fuck', 'fucking', 'fucked', 'fucker', 'fuckers',
    'shit', 'shitting', 'shitted', 'shite',
    'asshole', 'assholes', 'bastard', 'bastards',
    'bitch', 'bitches', 'bitching',
    'cocksucker', 'cocksuckers',
    'dickhead', 'dickheads',
    'motherfucker', 'motherfuckers', 'motherfucking',
    'nigger', 'nigga',
    'faggot', 'faggots',
    'retard', 'retarded',
    'cunt', 'cunts',
    'whore', 'whores',
    'slut', 'sluts',
    'piss', 'pissing', 'pissed',
    'twat', 'twats',
    'wank', 'wanker', 'wankers',
    'damn', 'damnit',
    'goddamn', 'goddamnit',
    'bullshit',
    'jackass', 'jackasses',
    'douche', 'douchebag', 'douchebags',
  ];
  const lower = text.toLowerCase().trim();
  for (const w of words) {
    const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(lower)) return true;
  }
  return false;
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
  const availableIds = new Set(window.cardano ? KNOWN_WALLETS.filter(w => window.cardano[w.id]).map(w => w.id) : []);

  list.innerHTML = KNOWN_WALLETS.map(w => {
    const avail = availableIds.has(w.id);
    return `
      <button class="wallet-btn ${avail ? '' : 'wallet-btn-unavail'}" data-wallet="${w.id}" ${avail ? '' : 'disabled'}>
        <img class="wallet-logo ${avail ? '' : 'wallet-logo-dim'}" src="${WALLET_LOGOS[w.id] || ''}" alt="">
        ${w.name}
        ${avail ? '' : '<span class="wallet-unavail-tag">unavailable</span>'}
      </button>
    `;
  }).join('');

  list.querySelectorAll('.wallet-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      await connectWallet(btn.dataset.wallet);
    });
  });

  $('#walletModal').classList.add('open');
}

async function connectWallet(walletId) {
  try {
    const ext = window.cardano[walletId];
    if (!ext) throw new Error('Wallet not found');

    const api = await ext.enable();
    const usedAddrs = await api.getUsedAddresses();
    let allHex = [...usedAddrs];
    try {
      const unusedAddrs = await api.getUnusedAddresses();
      if (Array.isArray(unusedAddrs)) allHex = [...usedAddrs, ...unusedAddrs];
    } catch {}
    if (allHex.length === 0) throw new Error('No address returned by wallet');

    const rewardAddrs = await api.getRewardAddresses();

    state.wallet = walletId;
    state.api = api;
    state.addresses = allHex.map(h => hexToBech32(h));
    state.address = state.addresses[0];
    state.hexAddress = allHex[0];
    state.stakeAddresses = rewardAddrs.map(h => hexToBech32(h));

    updateWalletUI();
    prefetchHandles(state.addresses).then(() => updateWalletUI());
    toast('Connected: ' + displayAddr(state.address, shorten(state.address, 8)), 'success');
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
  const typeBits = (header >> 4) & 0x07;
  const networkBit = header & 0x01;
  const isStake = typeBits >= 6;
  const basePrefix = isStake ? 'stake' : 'addr';
  const prefix = networkBit ? basePrefix : basePrefix + '_test';
  return bech32.encode(prefix, bech32.toWords(bytes), 200);
}

function updateWalletUI() {
  const area = $('#walletArea');
  if (state.address) {
    area.innerHTML = `
      <span class="tooltip" style="margin-right:0.1rem;font-size:0.7rem">${escHtml(displayAddr(state.address, shorten(state.address, 5)))}</span>
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
  state.addresses = [];
  state.stakeAddresses = [];
  state.hexAddress = null;
  updateWalletUI();
  if ($('#portfolioView').style.display !== 'none') {
    $('#portfolioContent').innerHTML = '<div class="empty-state"><p>Connect your wallet to view portfolio.</p></div>';
  }
  toast('Disconnected');
}

/* ---------- Voting ---------- */

async function openVoteModal(proposalId) {
  if (!state.api) {
    toast('Connect your wallet first', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/proposals?id=${proposalId}&voter=${encodeURIComponent(state.address)}`);
    if (!res.ok) throw new Error('Poll not found');
    const proposal = await res.json();
    state.currentProposal = proposal;

    $('#voteModalTitle').textContent = proposal.title;

    const isADA = !proposal.target_policy_id;
    const assetId = isADA ? 'lovelace' : (proposal.target_fingerprint || proposal.target_policy_id + (proposal.target_asset_name || ''));
    const tokenLabel = isADA ? 'ADA' : (proposal.tokenName || (proposal.target_fingerprint
      ? shorten(proposal.target_fingerprint, 5)
      : (proposal.target_asset_name
        ? shorten(proposal.target_policy_id, 6) + '.' + proposal.target_asset_name
        : shorten(proposal.target_policy_id, 6))));

    const totalS = proposal.totalSupply ? BigInt(proposal.totalSupply) : null;
    const circS = proposal.circulatingSupply ? BigInt(proposal.circulatingSupply) : null;
    const supplyInfo = [];
    if (totalS) supplyInfo.push('total: ' + formatWeight(totalS.toString()));
    if (circS && circS !== totalS) supplyInfo.push('circ: ' + formatWeight(circS.toString()));
    else if (totalS) supplyInfo.push('supply: ' + formatWeight(totalS.toString()));
    const unitLabel = isADA ? 'lovelace' : tokenLabel;

    const localLogo = tokenLogo(proposal.target_policy_id, proposal.target_fingerprint);
    const imgSrc = proposal.tokenImage || localLogo;
    const imgHtml = imgSrc
      ? `<img class="token-logo" src="${escHtml(imgSrc)}" alt="">`
      : '';

    $('#voteTokenInfo').innerHTML = `
      ${imgHtml}
      <span>${escHtml(tokenLabel)}${supplyInfo.length > 0 ? ' &middot; ' + supplyInfo.join(' &middot; ') : ''}</span>
    `;

    const pollOptions = proposal.options || ['Yes', 'No', 'Abstain'];
    const votingType = proposal.voting_type || 'standard';
    const allowSplit = proposal.allow_split || false;
    const tally = proposal.tally || {};
    const tallyTotal = BigInt(proposal.totalWeight || 0);

    // Show voting type badge
    const typeLabels = { standard: 'Standard (1 token = 1 vote)', quadratic: 'Quadratic (√balance)' };
    $('#voteTypeBadge').textContent = typeLabels[votingType] || '';

    const myVote = proposal.myVote;
    const myChoice = myVote?.vote_choice;
    const mySplitWeights = myVote?.split_weights ? (typeof myVote.split_weights === 'string' ? JSON.parse(myVote.split_weights) : myVote.split_weights) : null;

    function choiceSupplyPct(w, s) {
      if (!s || s <= 0n) return '';
      const pct = Number(BigInt(w)) / Number(s) * 100;
      if (pct >= 1) return pct.toFixed(2) + '%';
      if (pct >= 0.01) return pct.toFixed(4) + '%';
      return pct.toFixed(6) + '%';
    }

    const optionsDiv = $('#voteOptions');

    if (allowSplit) {
      // Vote splitting UI
      const splitDefault = {};
      for (const opt of pollOptions) {
        splitDefault[opt] = mySplitWeights?.[opt] != null ? mySplitWeights[opt] : (myChoice === opt ? 100 : 0);
      }
      // Ensure at least one option has weight
      let hasAny = Object.values(splitDefault).some(v => v > 0);
      if (!hasAny) splitDefault[pollOptions[0]] = 100;

      function renderSplitUI(split) {
        const totalPct = Object.values(split).reduce((s, v) => s + Number(v), 0);
        const isComplete = Math.abs(totalPct - 100) < 0.01;
        return pollOptions.map((opt, i) => {
          const val = split[opt] || 0;
          return `
            <div class="vote-split-row">
              <span class="poll-option-dot" style="background:${getOptionColor(i)}"></span>
              <label>${escHtml(opt)}</label>
              <input type="number" class="vote-split-input" data-opt="${escHtml(opt)}" value="${val}" min="0" max="100" step="1">
              <span class="vote-split-pct">%</span>
            </div>
          `;
        }).join('') + `<div class="vote-split-total" style="color:${isComplete ? 'var(--success)' : 'var(--danger)'}">Total: ${totalPct.toFixed(0)}%${!isComplete ? ' (must sum to 100%)' : ''}</div>`;
      }

      let currentSplit = { ...splitDefault };
      optionsDiv.innerHTML = renderSplitUI(currentSplit);

      optionsDiv.querySelectorAll('.vote-split-input').forEach(inp => {
        inp.addEventListener('input', () => {
          const opt = inp.dataset.opt;
          currentSplit[opt] = Math.max(0, Math.min(100, parseInt(inp.value) || 0));
          const totalPct = Object.values(currentSplit).reduce((s, v) => s + Number(v), 0);
          if (totalPct > 100) {
            currentSplit[opt] = Math.max(0, Number(currentSplit[opt]) - (totalPct - 100));
            inp.value = currentSplit[opt];
          }
          // Update total display
          const totalEl = optionsDiv.querySelector('.vote-split-total');
          const newTotal = Object.values(currentSplit).reduce((s, v) => s + Number(v), 0);
          const isComplete = Math.abs(newTotal - 100) < 0.01;
          totalEl.textContent = `Total: ${newTotal.toFixed(0)}%${!isComplete ? ' (must sum to 100%)' : ''}`;
          totalEl.style.color = isComplete ? 'var(--success)' : 'var(--danger)';
        });
      });

      // Store for submit
      optionsDiv._getSplitWeights = () => {
        const result = {};
        optionsDiv.querySelectorAll('.vote-split-input').forEach(inp => {
          result[inp.dataset.opt] = Math.max(0, Math.min(100, parseInt(inp.value) || 0));
        });
        return result;
      };
    } else {
      // Standard single-choice UI
      optionsDiv.innerHTML = pollOptions.map((opt, i) => {
        const isMyVote = opt === myChoice;
        const weight = tally[opt];
        const w = weight ? BigInt(weight) : null;
        const pct = w && tallyTotal > 0n ? pctNum(weight, proposal.totalWeight) : 0;
        const totalPctStr = w && totalS ? choiceSupplyPct(weight, totalS) : null;
        const circPctStr = w && circS && circS !== totalS ? choiceSupplyPct(weight, circS) : null;
        const supplyParts = [];
        if (totalPctStr) supplyParts.push(totalPctStr + ' of total');
        if (circPctStr) supplyParts.push(circPctStr + ' of circ');
        const supplyStr = supplyParts.length > 0 ? ' (' + supplyParts.join(' · ') + ')' : '';
        const label = weight
          ? `<span class="poll-option-dot" style="background:${getOptionColor(i)};display:inline-block;vertical-align:middle"></span> ${escHtml(opt)}: ${formatWeight(weight)} ${escHtml(unitLabel)} (${pct.toFixed(1)}%)${supplyStr}`
          : `<span class="poll-option-dot" style="background:${getOptionColor(i)};display:inline-block;vertical-align:middle"></span> ${escHtml(opt)}`;
        return `
          <label class="vote-option${isMyVote ? ' selected' : ''}" data-choice="${escHtml(opt)}">
            <input type="radio" name="voteChoice" value="${escHtml(opt)}"${isMyVote ? ' checked' : ''}>
            <span>${label}${isMyVote ? ' <span class="my-vote-badge">your vote</span>' : ''}</span>
          </label>
        `;
      }).join('');

      optionsDiv.querySelectorAll('.vote-option').forEach(el => {
        el.addEventListener('click', () => {
          optionsDiv.querySelectorAll('.vote-option').forEach(o => o.classList.remove('selected'));
          el.classList.add('selected');
          el.querySelector('input').checked = true;
        });
      });
      optionsDiv._getSplitWeights = null;
    }

    if (isADA) {
      $('#voteTokenSelector').innerHTML = `
        <label class="token-option selected">
          <input type="radio" name="tokenUnit" value="lovelace" checked>
          <span>ADA</span>
        </label>
      `;
    } else {
      $('#voteTokenSelector').innerHTML = `
        <label class="token-option">
          <input type="radio" name="tokenUnit" value="lovelace">
          <span>ADA</span>
        </label>
        <label class="token-option selected">
          <input type="radio" name="tokenUnit" value="${escHtml(assetId)}" checked>
          <span>${escHtml(tokenLabel)}</span>
        </label>
      `;
    }

    $('#voteTokenSelector').querySelectorAll('.token-option').forEach(el => {
      el.addEventListener('click', () => {
        $('#voteTokenSelector').querySelectorAll('.token-option').forEach(o => o.classList.remove('selected'));
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
  try {
    const optionsDiv = $('#voteOptions');
    const splitWeights = optionsDiv._getSplitWeights ? optionsDiv._getSplitWeights() : null;

    let choice = null;
    if (!splitWeights) {
      const selected = document.querySelector('input[name="voteChoice"]:checked');
      if (!selected) {
        toast('Select a voting option', 'error');
        return;
      }
      choice = selected.value;
    }

    // Validate split weights total to 100
    if (splitWeights) {
      const total = Object.values(splitWeights).reduce((s, v) => s + Number(v), 0);
      if (Math.abs(total - 100) > 0.01) {
        toast('Split weights must sum to 100%', 'error');
        return;
      }
    }

    const btn = $('#voteSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Signing...';

    const proposal = state.currentProposal;
    const tokenUnit = document.querySelector('input[name="tokenUnit"]:checked')?.value || 'lovelace';
    const payload = JSON.stringify({
      proposalId: proposal.id,
      choice: choice || Object.keys(splitWeights).join(','),
      timestamp: Date.now(),
    });

    const hexPayload = bytesToHex(new TextEncoder().encode(payload));
    const result = await state.api.signData(state.hexAddress, hexPayload);

    const body = {
      address: state.address,
      addresses: state.addresses,
      stakeAddresses: state.stakeAddresses,
      payload,
      signature: result.signature,
      key: result.key,
      proposalId: proposal.id,
      tokenUnit,
    };

    if (splitWeights) {
      body.splitWeights = splitWeights;
    } else {
      body.choice = choice;
    }

    const voteRes = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await voteRes.json();
    if (!voteRes.ok) {
      throw new Error(data.error);
    }

    toast('Vote cast! Weight: ' + formatWeight(data.stakeWeight), 'success');
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
    const res = await fetch(`/api/audit?proposalId=${encodeURIComponent(proposalId)}`);
    if (!res.ok) throw new Error('Audit data not found');
    const data = await res.json();

    $('#auditInfo').textContent = `${data.votes.length} vote(s)`;

    await prefetchHandles(data.votes.map(v => v.voter_address));

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
                <td>${escHtml(displayAddr(v.voter_address, shorten(v.voter_address, 6)))}</td>
                <td>${escHtml(v.vote_choice)}</td>
                <td>${formatWeight(v.stake_weight)}</td>
                <td title="${escHtml(v.signature_hex)}">${escHtml(shorten(v.signature_hex, 6))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const jsonStr = JSON.stringify(data, null, 2);
    $('#copyAuditBtn').onclick = () => {
      copyToClipboard(jsonStr)
        .then(() => toast('Audit JSON copied', 'success'))
        .catch(() => toast('Failed to copy', 'error'));
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

/* ---------- Profile ---------- */

async function fetchProfile() {
  const container = $('#profileContent');
  if (!state.api || !state.address) {
    container.innerHTML = '<div class="empty-state"><p>Connect your wallet to view your profile.</p></div>';
    return;
  }

  container.innerHTML = '<div class="empty-state"><p>Loading profile...</p></div>';

  try {
    const res = await fetch('/api/profile?address=' + encodeURIComponent(state.address));
    if (!res.ok) throw new Error((await res.json()).error);
    const data = await res.json();
    if (state.address) await prefetchHandles([state.address]);
    renderProfile(data);
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><strong>Could not load profile</strong><p>' + escHtml(e.message) + '</p></div>';
  }
}

function renderProfile(data) {
  const container = $('#profileContent');
  const initial = state.address ? state.address[0].toUpperCase() : '?';

  let html = `
    <div class="profile-header">
      <div class="profile-avatar">${initial}</div>
      <div>
        <div style="font-size:0.82rem;font-weight:600">${escHtml(displayAddr(data.address, shorten(data.address, 12)))}</div>
        <div class="profile-stats" style="margin-top:0.5rem">
          <div class="profile-stat">
            <div class="profile-stat-value">${data.totalVotes}</div>
            <div class="profile-stat-label">Votes Cast</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value">${data.totalCreated}</div>
            <div class="profile-stat-label">Polls Created</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value">${data.totalComments}</div>
            <div class="profile-stat-label">Comments</div>
          </div>
        </div>
      </div>
    </div>
  `;

  if (data.votes && data.votes.length > 0) {
    html += '<div class="profile-section-title">Voting History</div>';
    for (const v of data.votes.slice(0, 20)) {
      const prop = v.proposal;
      const title = prop ? prop.title : 'Unknown poll';
      const category = prop ? (prop.category || '') : '';
      const catTag = category ? `<span class="poll-category" style="margin-right:0.3rem">${escHtml(category)}</span>` : '';
      html += `
        <div class="profile-vote-item">
          <span class="profile-vote-title">${catTag}${escHtml(title)}</span>
          <span class="profile-vote-choice">${escHtml(v.vote_choice)}</span>
          <span class="profile-vote-weight">${formatWeight(v.stake_weight)}</span>
        </div>
      `;
    }
  } else {
    html += '<div class="profile-empty">No votes cast yet.</div>';
  }

  if (data.created && data.created.length > 0) {
    html += '<div class="profile-section-title">Polls Created</div>';
    for (const p of data.created.slice(0, 10)) {
      html += `
        <div class="profile-vote-item">
          <span class="profile-vote-title"><span class="poll-category" style="margin-right:0.3rem">${escHtml(p.category || 'General')}</span>${escHtml(p.title)}</span>
          <span class="profile-vote-weight">${new Date(p.created_at).toLocaleDateString()}</span>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}

/* ---------- Create Proposal ---------- */

$('#createBtn').addEventListener('click', () => {
  if (!state.api) { toast('Connect wallet first', 'error'); return; }

  const sel = $('#propTokenSelect');
  sel.innerHTML = '<option value="">ADA</option>' +
    CURATED_TOKENS.map(t => `<option value="${t.label}">${t.label}</option>`).join('') +
    '<option value="custom">— Custom token —</option>';
  sel.value = '';
  $('#propCustomGroup').style.display = 'none';
  $('#propAssetGroup').style.display = 'none';
  $('#propPolicy').value = '';
  $('#propAsset').value = '';
  $('#createModal').classList.add('open');
});

$('#propTokenSelect').addEventListener('change', () => {
  const val = $('#propTokenSelect').value;
  if (!val) {
    $('#propCustomGroup').style.display = 'none';
    $('#propAssetGroup').style.display = 'none';
    $('#propPolicy').value = '';
    $('#propAsset').value = '';
  } else if (val === 'custom') {
    $('#propCustomGroup').style.display = '';
    $('#propAssetGroup').style.display = $('#propPolicy').value.trim() ? '' : 'none';
    $('#propPolicy').value = '';
    $('#propAsset').value = '';
  } else {
    const token = CURATED_TOKENS.find(t => t.label === val);
    if (token) {
      $('#propCustomGroup').style.display = '';
      $('#propAssetGroup').style.display = token.asset ? '' : 'none';
      $('#propPolicy').value = token.policy;
      $('#propAsset').value = token.asset || '';
    }
  }
});

$('#propPolicy').addEventListener('input', () => {
  if ($('#propTokenSelect').value === 'custom') {
    $('#propAssetGroup').style.display = $('#propPolicy').value.trim() ? '' : 'none';
  }
});

$('#createSubmitBtn').addEventListener('click', createProposal);

async function createProposal() {
  const title = $('#propTitle').value.trim();
  const description = $('#propDesc').value.trim();
  const tokenVal = $('#propTokenSelect').value;
  const policy = $('#propPolicy').value.trim();
  const asset = $('#propAsset').value.trim();
  const optionsRaw = $('#propOptions').value.trim();
  const category = $('#propCategory').value;
  const votingType = $('#propVotingType').value;

  if (!title || !description) {
    toast('Fill in title and description', 'error');
    return;
  }

  if (title.length > 500) {
    toast('Title too long (max 500 characters)', 'error');
    return;
  }
  if (description.length > 5000) {
    toast('Description too long (max 5000 characters)', 'error');
    return;
  }

  if (containsProfanity(title) || containsProfanity(description)) {
    toast('Title or description contains inappropriate language', 'error');
    return;
  }

  if (tokenVal === 'custom' && !policy) {
    toast('Enter a policy ID for custom token', 'error');
    return;
  }

  // Parse options
  const options = optionsRaw.split(',').map(s => s.trim()).filter(Boolean);
  if (options.length < 2) {
    toast('Enter at least 2 options (comma-separated)', 'error');
    return;
  }
  if (options.length > 8) {
    toast('Maximum 8 options allowed', 'error');
    return;
  }
  for (const opt of options) {
    if (opt.length > 100) {
      toast('Each option must be 100 characters or fewer', 'error');
      return;
    }
  }

  const btn = $('#createSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        options,
        category,
        votingType,
        targetPolicyId: policy,
        targetAssetName: asset,
        creatorAddress: state.address,
        addresses: state.addresses,
        stakeAddresses: state.stakeAddresses,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    toast('Poll created!', 'success');
    $('#createModal').classList.remove('open');
    $('#propTitle').value = '';
    $('#propDesc').value = '';
    $('#propPolicy').value = '';
    $('#propAsset').value = '';
    $('#propCustomGroup').style.display = 'none';
    $('#propAssetGroup').style.display = 'none';
    fetchProposals();
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Poll';
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

/* ---------- Ticker ---------- */

let tickerInterval = null;

function startTicker() {
  if (tickerInterval) return;
  tickerInterval = setInterval(() => {
    updateCountdowns();
  }, 1000);
}

/* ---------- Theme ---------- */

function toggleTheme() {
  const html = document.documentElement;
  html.classList.add('transitioning');
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('cnt_vote_theme', isDark ? 'light' : 'dark');
  $('#themeBtn').textContent = isDark ? '☀' : '☾';
  setTimeout(() => html.classList.remove('transitioning'), 850);
  if ($('#analyticsView').style.display !== 'none' && analyticsCharts.length > 0) {
    renderAnalytics();
  }
}

function initTheme() {
  const saved = localStorage.getItem('cnt_vote_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  if (!saved) localStorage.setItem('cnt_vote_theme', theme);
  $('#themeBtn').textContent = theme === 'dark' ? '☀' : '☾';
}

/* ---------- Utils ---------- */

function copyToClipboard(text) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      if (document.execCommand('copy')) resolve();
      else reject(new Error('Copy command failed'));
    } catch (e) {
      reject(e);
    }
    document.body.removeChild(ta);
  });
}

document.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG') e.target.style.display = 'none';
}, true);

/* ---------- Portfolio ---------- */

const PIE_COLORS = [
  '#d94f6f', '#f59e0b', '#10b981', '#6366f1', '#06b6d4',
  '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308',
  '#3b82f6', '#84cc16',
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

function generatePieHtml(slices) {
  const cx = 100, cy = 100, r = 88;
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total <= 0) return '';

  const centerText = total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatAda = (v) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (slices.length === 1) {
    const s = slices[0];
    return `
      <div class="pf-chart-wrap">
        <svg viewBox="0 0 200 200" class="pf-chart-svg">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}"/>
          <circle cx="${cx}" cy="${cy}" r="52" fill="var(--surface)" stroke="none"/>
          <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--text)" font-size="18" font-weight="700">${centerText}</text>
          <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="var(--text3)" font-size="11" font-weight="500">ADA</text>
        </svg>
        <div class="pf-chart-legend">
          <div class="pf-chart-legend-item">
            <span class="pf-chart-swatch" style="background:${s.color}"></span>
            <span class="pf-chart-legend-label">${escHtml(s.label)}</span>
            <span class="pf-chart-legend-pct">100.0%</span>
            <span class="pf-chart-legend-ada">${formatAda(s.value)} ADA</span>
          </div>
        </div>
      </div>`;
  }

  let angle = 0;
  const paths = [];
  const legendItems = [];

  for (let i = 0; i < slices.length; i++) {
    const pct = slices[i].value / total;
    if (pct < 0.005) continue;
    const endAngle = angle + pct * 360;
    const pathD = describeArc(cx, cy, r, angle, endAngle);
    paths.push({ d: pathD, fill: slices[i].color, label: slices[i].label });
    legendItems.push({
      color: slices[i].color,
      label: slices[i].label,
      pct: (pct * 100).toFixed(1),
      ada: formatAda(slices[i].value),
    });
    angle = endAngle;
  }

  const pathHtml = paths.map(p => `<path d="${escHtml(p.d)}" fill="${p.fill}"/>`).join('');

  const legendHtml = legendItems.map(l => `
    <div class="pf-chart-legend-item">
      <span class="pf-chart-swatch" style="background:${l.color}"></span>
      <span class="pf-chart-legend-label">${escHtml(l.label)}</span>
      <span class="pf-chart-legend-pct">${l.pct}%</span>
      <span class="pf-chart-legend-ada">${l.ada} ADA</span>
    </div>
  `).join('');

  return `
    <div class="pf-chart-wrap">
      <svg viewBox="0 0 200 200" class="pf-chart-svg">
        ${pathHtml}
        <circle cx="${cx}" cy="${cy}" r="52" fill="var(--surface)" stroke="none"/>
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--text)" font-size="18" font-weight="700">${centerText}</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="var(--text3)" font-size="11" font-weight="500">ADA</text>
      </svg>
      <div class="pf-chart-legend">${legendHtml}</div>
    </div>`;
}

async function fetchPortfolio() {
  const container = $('#portfolioContent');
  container.innerHTML = '<div class="empty-state"><p>Loading portfolio...</p></div>';
  try {
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses: state.addresses,
        stakeAddresses: state.stakeAddresses,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    const data = await res.json();
    renderPortfolio(data);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><strong>Could not load portfolio</strong><p>${escHtml(e.message)}</p></div>`;
  }
}

function renderPortfolio(data) {
  const container = $('#portfolioContent');
  const ada = Number(data.adaBalance) / 1_000_000;

  const slices = [];
  let colorIdx = 0;
  const nextColor = () => {
    const c = PIE_COLORS[colorIdx % PIE_COLORS.length];
    colorIdx++;
    return c;
  };

  slices.push({ label: 'ADA', value: ada, color: PIE_COLORS[0] });
  colorIdx = 1;

  for (const t of data.tokens) {
    if (t.valueAda && t.valueAda > 0.01) {
      slices.push({ label: t.ticker || t.name || shorten(t.fingerprint || t.policyId, 5), value: t.valueAda, color: nextColor() });
    }
  }
  for (const t of data.lpPositions) {
    const v = t.lpValueAda || t.valueAda || 0;
    if (v > 0.01) {
      const dex = t.lpInfo ? t.lpInfo.dex : 'LP';
      slices.push({ label: dex + ' LP', value: v, color: nextColor() });
    }
  }

  const chartHtml = generatePieHtml(slices);
  console.log('[pf] chartHtml length:', chartHtml.length, 'slices:', slices.length, 'ada:', ada);

  let html = '';

  if (data.netWorthAda != null) {
    html += `
      <div class="pf-networth-card">
        <div class="pf-networth-label">Net Worth</div>
        <div class="pf-networth-value">${escHtml(data.netWorthFormatted)}</div>
        <div class="pf-networth-sub">ADA</div>
      </div>`;
  }

  html += '<div class="pf-chart-card">' + chartHtml + '</div>';

  html += `
    <div class="pf-card pf-ada">
      <div class="pf-card-header">
        <img class="pf-logo" src="/img/cardano-starburst.svg" alt="">
        <span class="pf-name">ADA</span>
        <span class="pf-balance">${ada.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
      </div>
    </div>`;

  if (data.lpPositions && data.lpPositions.length > 0) {
    html += '<h3 class="pf-section-title">Liquidity Positions</h3><div class="pf-token-list">';
    for (const t of data.lpPositions) {
      const label = t.ticker || t.name || (t.fingerprint ? shorten(t.fingerprint, 5) : shorten(t.policyId, 5));
      const dexTag = t.lpInfo ? ` <span class="pf-tag pf-tag-lp">${escHtml(t.lpInfo.dex)}</span>` : '';
      const imgSrc = t.image || null;
      const imgHtml = imgSrc ? `<img class="pf-logo" src="${escHtml(imgSrc)}" alt="">` : '<div class="pf-logo pf-logo-placeholder"></div>';
      const valueRow = t.lpValueFormatted
        ? `<div class="pf-value-row">${escHtml(t.lpValueFormatted)} ADA</div>`
        : (t.valueAdaFormatted ? `<div class="pf-value-row">${escHtml(t.valueAdaFormatted)} ADA</div>` : '');
      html += `
        <div class="pf-card pf-lp-card">
          <div class="pf-card-header">
            ${imgHtml}
            <span class="pf-name">${escHtml(label)}${dexTag}</span>
            <span class="pf-balance pf-lp-balance">${escHtml(t.displayQty)}</span>
          </div>
          ${valueRow}
          <div class="pf-sub">${escHtml(shorten(t.fingerprint || t.policyId, 6))}</div>
        </div>`;
    }
    html += '</div>';
  }

  if (data.tokens.length === 0) {
    html += '<div class="empty-state" style="margin-top:0.75rem"><p>No native tokens found.</p></div>';
  } else {
    html += '<h3 class="pf-section-title" style="margin-top:0.75rem">Tokens</h3><div class="pf-token-list">';
    for (const t of data.tokens) {
      const label = t.ticker || t.name || (t.fingerprint ? shorten(t.fingerprint, 5) : shorten(t.policyId, 5));
      const imgSrc = t.image || (() => {
        const curated = CURATED_TOKENS.find(c => c.fingerprint === t.fingerprint || c.policy === t.policyId);
        return curated ? curated.logo : null;
      })();
      const imgHtml = imgSrc ? `<img class="pf-logo" src="${escHtml(imgSrc)}" alt="">` : '<div class="pf-logo pf-logo-placeholder"></div>';
      const valueRow = t.valueAdaFormatted
        ? `<div class="pf-value-row"><span class="pf-value-ada">${escHtml(t.valueAdaFormatted)} ADA</span></div>`
        : '';
      html += `
        <div class="pf-card">
          <div class="pf-card-header">
            ${imgHtml}
            <span class="pf-name">${escHtml(label)}</span>
            <span class="pf-balance">${escHtml(t.displayQty)}</span>
          </div>
          ${valueRow}
          <div class="pf-sub">${escHtml(shorten(t.fingerprint || t.policyId, 6))}</div>
        </div>`;
    }
    html += '</div>';
  }

  if (data.pricesUpdatedAt) {
    const d = new Date(data.pricesUpdatedAt);
    html += `<div class="pf-price-note">Prices from Minswap &middot; ${d.toLocaleTimeString()}</div>`;
  }

  container.innerHTML = html;
}

/* ---------- Tab switching ---------- */

$$('.tab').forEach(tab => {
  tab.addEventListener('click', async () => {
    $$('.tab').forEach(t => t.classList.remove('tab-active'));
    tab.classList.add('tab-active');
    const view = tab.dataset.view;
    $('#mainView').style.display = view === 'polls' ? '' : 'none';
    $('#portfolioView').style.display = view === 'portfolio' ? '' : 'none';
    $('#surfView').style.display = view === 'surf' ? '' : 'none';
    $('#analyticsView').style.display = view === 'analytics' ? '' : 'none';
    $('#activityView').style.display = view === 'activity' ? '' : 'none';
    $('#surfTokenView').style.display = view === 'surf-token' ? '' : 'none';
    if (view === 'portfolio') {
      if (!state.api) {
        $('#portfolioContent').innerHTML = '<div class="empty-state"><p>Connect your wallet to view portfolio.</p></div>';
      } else {
        fetchPortfolio();
      }
    }
    if (view === 'surf' || view === 'analytics' || view === 'surf-token') {
      await fetchSurfDashboard();
      if (surfRefreshInterval) clearInterval(surfRefreshInterval);
      surfRefreshInterval = setInterval(fetchSurfDashboard, 120000);
      if (surfTickInterval) clearInterval(surfTickInterval);
      surfTickInterval = setInterval(updateSurfUpdated, 10000);
    } else {
      if (surfRefreshInterval) {
        clearInterval(surfRefreshInterval);
        surfRefreshInterval = null;
      }
      if (surfTickInterval) {
        clearInterval(surfTickInterval);
        surfTickInterval = null;
      }
    }
    if (view === 'analytics') {
      renderAnalytics();
    }
    if (view === 'surf-token') {
      renderSurfTokenStats();
    }
    if (view === 'activity') {
      fetchActivity();
      if (activityInterval) clearInterval(activityInterval);
      activityInterval = setInterval(fetchActivity, 60000);
    } else {
      if (activityInterval) {
        clearInterval(activityInterval);
        activityInterval = null;
      }
    }
  });
});

/* ---------- Surf Lending Dashboard ---------- */

let surfData = null;
let surfFilterAddr = '';
let surfFilterPool = '';
let surfFilterStatus = '';
let surfRefreshInterval = null;
let surfTickInterval = null;
let surfLastUpdated = null;
let surfSortKey = 'ltv';
let surfSortDir = -1;

const SURF_COLUMNS = [
  { key: 'pool',      label: 'Pool',      sortable: true, align: 'left' },
  { key: 'address',   label: 'Address',   sortable: true, align: 'left' },
  { key: 'ltv',       label: 'LTV',       sortable: true, align: 'right' },
  { key: 'collateral',label: 'Collateral',sortable: true, align: 'right' },
  { key: 'borrow',    label: 'Borrowed',  sortable: true, align: 'right' },
  { key: 'netvalue',  label: 'Net Value', sortable: true, align: 'right' },
  { key: 'apr',       label: 'APR',       sortable: true, align: 'right' },
  { key: 'duration',  label: 'Duration',  sortable: true, align: 'right' },
  { key: 'interest',  label: 'Interest',  sortable: true, align: 'right' },
  { key: 'opened',    label: 'Opened',    sortable: true, align: 'left' },
];

async function fetchSurfDashboard() {
  const container = $('#surfContent');
  try {
    const params = new URLSearchParams();
    if (surfFilterAddr) params.set('address', surfFilterAddr);
    const res = await fetch('/api/surf-dashboard?' + params.toString());
    if (!res.ok) throw new Error((await res.json()).error);
    surfData = await res.json();
    surfLastUpdated = Date.now();
    await renderSurfDashboard();
    updateSurfUpdated();
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><strong>Could not load Surf data</strong><p>' + escHtml(e.message) + '</p></div>';
  }
}

function updateSurfUpdated() {
  const el = $('#surfUpdated');
  if (!el || !surfLastUpdated) return;
  const ago = Math.floor((Date.now() - surfLastUpdated) / 1000);
  if (ago < 5) {
    el.textContent = 'Updated just now';
  } else if (ago < 60) {
    el.textContent = 'Updated ' + ago + 's ago';
  } else {
    el.textContent = 'Updated ' + Math.floor(ago / 60) + 'm ago';
  }
}

async function renderSurfDashboard() {
  if (!surfData) return;
  const { pools, positions, summary } = surfData;
  renderSurfSummary(summary, pools, positions);
  renderSurfPoolFilter(pools);
  // pre-fetch token icons for all pool assets and position collaterals
  const uniqueAssets = new Set();
  for (const p of pools) {
    if (p.asset.policyId && p.asset.assetName) uniqueAssets.add(p.asset.policyId + p.asset.assetName);
    for (const c of p.collateralAssets) {
      if (c.policyId && c.assetName) uniqueAssets.add(c.policyId + c.assetName);
    }
  }
  for (const pos of positions) {
    if (pos.principalPolicyId && pos.principalAssetName) uniqueAssets.add(pos.principalPolicyId + pos.principalAssetName);
    if (pos.collateralPolicyId && pos.collateralAssetName) uniqueAssets.add(pos.collateralPolicyId + pos.collateralAssetName);
  }
  await Promise.all([...uniqueAssets].map(fetchTokenIcon));
  await prefetchHandles(positions.map(p => p.address));
  renderSurfPoolApys(pools, summary);
  renderSurfPositions(positions, pools, summary);
  renderProtocolBreakdown(pools, positions, summary);
  renderPoolDeepDive(pools, summary);
  renderRiskAnalysis(positions, pools, summary);
}

function renderSurfPoolApys(pools, summary) {
  const el = $('#poolApyBreakdown');
  if (!el || !pools || pools.length === 0) return;
  const fmtPct = (v) => (v * 100).toFixed(2) + '%';
  let html = '<div class="summary-card" style="margin-top:0.5rem"><div class="summary-header"><h3>Pool Supply APY Breakdown</h3></div><div class="pool-apy-table-wrap"><table class="pool-apy-table"><thead><tr><th>Pool</th><th>Supply APY</th><th>Adjustment</th><th>Total APY</th></tr></thead><tbody>';
  for (const p of pools) {
    const label = p.asset.ticker + (p.collateralAssets.length > 0 ? '/' + p.collateralAssets[0].ticker : '');
    html += `<tr><td>${escHtml(label)}</td><td>${fmtPct(p.supplyApy)}</td><td>${fmtPct(p.supplyApyAdjustment)}</td><td><strong>${fmtPct(p.supplyApyTotal)}</strong></td></tr>`;
  }
  html += '</tbody></table></div></div>';
  el.innerHTML = html;
}

function renderSurfSummary(summary, pools, positions) {
  const el = $('#analyticsSurfSummary');
  const fmtUSD = (v) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtADA = (v) => '₳' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtShort = (v) => { if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T'; if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B'; if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'; if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K'; return v.toFixed(2); };
  const fmtPct = (v) => (v * 100).toFixed(2) + '%';
  const adaPrice = summary.adaPrice || 1;
  const toADA = (usd) => usd / adaPrice;

  const distinctBorrowers = new Set(positions.map(p => p.address)).size;
  const totalBorrowUSD = summary.totalBorrowedFromPools ?? summary.totalBorrowedUSD;
  const totalBorrowADA = toADA(totalBorrowUSD);
  const totalCollatADA = toADA(summary.totalCollateralUSD);
  const totalSupplyADA = toADA(summary.totalSuppliedUSD);
  const tvlUSD = summary.totalTVLFromPools ?? summary.totalTVLUSD ?? (summary.totalSuppliedUSD + summary.totalCollateralUSD - summary.totalBorrowedUSD);
  const tvlADA = toADA(tvlUSD);
  const borrowToSupply = totalSupplyADA > 0 ? totalBorrowADA / totalSupplyADA : 0;
  const collatRatio = totalBorrowADA > 0 ? totalCollatADA / totalBorrowADA : 0;

  const totalReserveADA = pools.reduce((s, p) => s + toADA((p.reserve || 0) / Math.pow(10, p.asset.decimals || 0) * (p.price || 1) * adaPrice), 0);
  const totalVolumeADA = pools.reduce((s, p) => s + (p.totalVolume || 0) / Math.pow(10, p.asset.decimals || 0) * (p.price || 1), 0);

  const netInterestIncomeADA = pools.reduce((sum, p) => {
    const bAda = toADA((p.totalBorrowed || 0) / Math.pow(10, p.asset.decimals || 0) * (p.price || 1) * adaPrice);
    const rf = p.reserveFactor || 0;
    return sum + bAda * (p.borrowApr || 0) * rf;
  }, 0);
  let weightedBorrowApr = 0, weightedSupplyApy = 0, borrowWeight = 0, supplyWeight = 0;
  for (const p of pools) {
    const bAda = toADA((p.totalBorrowed || 0) / Math.pow(10, p.asset.decimals || 0) * (p.price || 1) * adaPrice);
    const sAda = toADA((p.totalSupplied || 0) / Math.pow(10, p.asset.decimals || 0) * (p.price || 1) * adaPrice);
    if (bAda > 0) { weightedBorrowApr += (p.borrowApr || 0) * bAda; borrowWeight += bAda; }
    if (sAda > 0) { weightedSupplyApy += (p.supplyApyTotal || 0) * sAda; supplyWeight += sAda; }
  }
  const avgBorrowApr = borrowWeight > 0 ? weightedBorrowApr / borrowWeight : 0;
  const avgSupplyApy = supplyWeight > 0 ? weightedSupplyApy / supplyWeight : 0;

  const ltvValues = positions.filter(p => p.ltv > 0).map(p => p.ltv);
  const avgLtv = ltvValues.length > 0 ? ltvValues.reduce((s, v) => s + v, 0) / ltvValues.length : 0;
  const healthy = positions.filter(p => p.ltv < 0.5).length;
  const atRisk = positions.filter(p => p.ltv >= 0.5 && p.ltv < 0.75).length;
  const liquidatable = positions.filter(p => p.ltv >= 0.75).length;

  el.innerHTML = `
    <div class="summary-card summary-card-wide">
      <div class="summary-header">
        <img class="summary-header-icon" src="/img/surf.svg" alt="">
        <h3>Protocol Overview</h3>
      </div>
      <div class="stats-bento">
        <div class="bento-cell bento-cell-lg">
          <div class="bento-label">Total Value Locked</div>
          <div class="bento-value">${fmtADA(tvlADA)}</div>
          <div class="bento-sub">${fmtUSD(tvlUSD)}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Total Supplied</div>
          <div class="bento-value">${fmtADA(totalSupplyADA)}</div>
          <div class="bento-sub">${fmtUSD(summary.totalSuppliedUSD)}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Total Borrowed</div>
          <div class="bento-value">${fmtADA(totalBorrowADA)}</div>
          <div class="bento-sub">${fmtUSD(totalBorrowUSD)}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Total Collateral</div>
          <div class="bento-value">${fmtADA(totalCollatADA)}</div>
          <div class="bento-sub">${fmtUSD(summary.totalCollateralUSD)}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Borrow / Supply</div>
          <div class="bento-value">${fmtPct(borrowToSupply)}</div>
          <div class="bento-sub">Collateral / Borrow ${collatRatio.toFixed(2)}x</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Net Position Value</div>
          <div class="bento-value ${summary.totalNetValueUSD < 0 ? 'bento-txt-danger' : 'bento-txt-success'}">${fmtADA(toADA(summary.totalNetValueUSD))}</div>
          <div class="bento-sub">${fmtUSD(summary.totalNetValueUSD)}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Active Borrowers</div>
          <div class="bento-value">${distinctBorrowers}</div>
          <div class="bento-sub">${summary.totalPositions} open positions</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Avg Loan Size</div>
          <div class="bento-value">${distinctBorrowers > 0 ? fmtADA(totalBorrowADA / distinctBorrowers) : '—'}</div>
          <div class="bento-sub">Across ${distinctBorrowers} borrowers</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Avg Collateral / Position</div>
          <div class="bento-value">${summary.totalPositions > 0 ? fmtADA(totalCollatADA / summary.totalPositions) : '—'}</div>
          <div class="bento-sub">${summary.totalPositions} positions</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Weighted Avg Borrow APR</div>
          <div class="bento-value">${fmtPct(avgBorrowApr)}</div>
          <div class="bento-sub">${borrowWeight > 0 ? borrowWeight.toFixed(2) + ' ADA at these rates' : ''}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Weighted Avg Supply APY</div>
          <div class="bento-value bento-txt-success">${fmtPct(avgSupplyApy)}</div>
          <div class="bento-sub">${supplyWeight > 0 ? supplyWeight.toFixed(2) + ' ADA earning yield' : ''}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Pool Count</div>
          <div class="bento-value">${summary.totalPools}</div>
          <div class="bento-sub">${pools.filter(p => p.collateralAssets.length > 0).length} borrow pools</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Total Reserve</div>
          <div class="bento-value">${fmtADA(totalReserveADA)}</div>
          <div class="bento-sub">${pools.reduce((s, p) => s + (p.reserveFactor || 0), 0) / pools.length > 0 ? fmtPct(pools.reduce((s, p) => s + (p.reserveFactor || 0), 0) / pools.length) + ' avg reserve factor' : ''}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">SURF Price</div>
          <div class="bento-value">${fmtADA(summary.surfPrice)}</div>
          <div class="bento-sub">${fmtUSD(summary.surfPriceUSD)}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">ADA Price</div>
          <div class="bento-value">${fmtUSD(adaPrice)}</div>
          <div class="bento-sub">1 ADA = $${adaPrice.toFixed(4)}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Net Interest Income (annualized)</div>
          <div class="bento-value ${netInterestIncomeADA >= 0 ? 'bento-txt-success' : 'bento-txt-danger'}">${fmtADA(Math.abs(netInterestIncomeADA))}</div>
          <div class="bento-sub">${netInterestIncomeADA >= 0 ? 'Protocol surplus' : 'Protocol deficit'}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Avg LTV</div>
          <div class="bento-value">${fmtPct(avgLtv)}</div>
          <div class="bento-sub">${healthy} healthy · ${atRisk} at risk · ${liquidatable} liquidatable</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Total Volume (all-time)</div>
          <div class="bento-value">${fmtADA(totalVolumeADA)}</div>
        </div>
        <div class="bento-cell">
          <div class="bento-label">Net Collateralization</div>
          <div class="bento-value">${fmtADA(totalCollatADA - totalBorrowADA)}</div>
          <div class="bento-sub">Buffer = ${collatRatio > 1 ? ((collatRatio - 1) * 100).toFixed(1) + '%' : 'Under-collateralized!'}</div>
        </div>
      </div>
    </div>
  `;
}

function renderProtocolBreakdown(pools, positions, summary) {
  const el = $('#protocolBreakdownContainer');
  if (!pools || pools.length === 0 || !el) return;

  const supplied = {};
  for (const p of pools) {
    const ticker = p.asset.ticker;
    if (p.totalSuppliedUSD > 0) supplied[ticker] = (supplied[ticker] || 0) + p.totalSuppliedUSD;
  }

  const collateral = {};
  const borrowed = {};
  for (const pos of positions) {
    const ct = pos.collateralTicker;
    if (pos.collateralValueUSD > 0) collateral[ct] = (collateral[ct] || 0) + pos.collateralValueUSD;
    const pt = pos.principalTicker;
    if (pos.totalOwedUSD > 0) borrowed[pt] = (borrowed[pt] || 0) + pos.totalOwedUSD;
  }

  const iconMap = { ADA: TOKEN_LOGOS.ADA };
  for (const p of pools) {
    const asset = p.asset;
    const logo = (!asset || !asset.policyId) ? TOKEN_LOGOS.ADA : (tokenLogoCache.get(asset.policyId + (asset.assetName || '')) || null);
    if (logo) iconMap[p.asset.ticker] = logo;
  }
  for (const pos of positions) {
    const cid = pos.collateralPolicyId + pos.collateralAssetName;
    if (cid && tokenLogoCache.has(cid)) iconMap[pos.collateralTicker] = tokenLogoCache.get(cid);
    const pid = pos.principalPolicyId + pos.principalAssetName;
    if (pid && tokenLogoCache.has(pid)) iconMap[pos.principalTicker] = tokenLogoCache.get(pid);
  }

  const adaPrice = summary.adaPrice || 1;
  const fmtShortADA = (usd) => {
    const ada = usd / adaPrice;
    if (ada >= 1e6) return (ada / 1e6).toFixed(2) + 'M';
    if (ada >= 1e3) return (ada / 1e3).toFixed(2) + 'K';
    return ada.toFixed(0);
  };
  const fmtShortUSD = (v) => { if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M'; if (v >= 1e3) return '$' + (v / 1e3).toFixed(2) + 'K'; return '$' + v.toFixed(0); };

  const barHtml = (data, label) => {
    const total = Object.values(data).reduce((s, v) => s + v, 0);
    if (total <= 0) return '<div class="breakdown-bar"><span class="breakdown-bar-empty">No ' + label.toLowerCase() + '</span></div>';
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
    let rowHtml = '';
    let barHtml = '<div class="breakdown-bar">';
    for (const [ticker, val] of sorted) {
      const pct = val / total;
      if (pct < 0.005) continue;
      const icon = iconMap[ticker] || '';
      const iconImg = icon ? `<img class="breakdown-icon" src="${icon}" alt="">` : '';
      barHtml += `<div class="breakdown-seg" style="flex:${Math.round(pct * 1000)}" title="${ticker}: ${fmtShortADA(val)} ADA · ${fmtShortUSD(val)} (${(pct * 100).toFixed(1)}%)">${iconImg}<span class="breakdown-seg-label">${ticker}</span></div>`;
      rowHtml += `<div class="breakdown-token-row"><span class="breakdown-token-icon">${iconImg}</span><span class="breakdown-token-name">${ticker}</span><span class="breakdown-token-pct">${(pct * 100).toFixed(1)}%</span><span class="breakdown-token-ada">${fmtShortADA(val)} ADA</span><span class="breakdown-token-usd">${fmtShortUSD(val)}</span></div>`;
    }
    barHtml += '</div>';
    return barHtml + rowHtml;
  };

  el.innerHTML = `
    <div class="summary-card summary-card-wide">
      <div class="summary-header">
        <h3>Token Distribution Breakdown</h3>
      </div>
      <div class="breakdown-section">
        <div class="breakdown-group">
          <div class="breakdown-cat-label">Supplied <span class="breakdown-cat-total">${fmtShortADA(Object.values(supplied).reduce((s, v) => s + v, 0))} ADA</span></div>
          ${barHtml(supplied, 'Supplied')}
        </div>
        <div class="breakdown-group">
          <div class="breakdown-cat-label">Collateral <span class="breakdown-cat-total">${fmtShortADA(Object.values(collateral).reduce((s, v) => s + v, 0))} ADA</span></div>
          ${barHtml(collateral, 'Collateral')}
        </div>
        <div class="breakdown-group">
          <div class="breakdown-cat-label">Borrowed <span class="breakdown-cat-total">${fmtShortADA(Object.values(borrowed).reduce((s, v) => s + v, 0))} ADA</span></div>
          ${barHtml(borrowed, 'Borrowed')}
        </div>
      </div>
    </div>
  `;
}

function renderPoolDeepDive(pools, summary) {
  const el = $('#poolDeepDiveContainer');
  if (!pools || pools.length === 0 || !el) return;

  const fmtPct = (v) => (v * 100).toFixed(2) + '%';
  const fmtADA = (v) => '₳' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtUSD = (v) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const adaPrice = summary.adaPrice || 1;
  const toADA = (usd) => usd / adaPrice;

  let html = '<div class="summary-card summary-card-wide"><div class="summary-header"><h3>Pool Deep Dive</h3></div><div class="pool-grid">';

  function poolAssetLogo(asset) {
    if (!asset || !asset.policyId) return TOKEN_LOGOS.ADA;
    return tokenLogoCache.get(asset.policyId + (asset.assetName || '')) || null;
  }

  for (const p of pools) {
    const decimals = p.asset.decimals || 0;
    const suppliedADA = (p.totalSupplied || 0) / Math.pow(10, decimals) * (p.price || 1);
    const borrowedADA = (p.totalBorrowed || 0) / Math.pow(10, decimals) * (p.price || 1);
    const reserveADA = (p.reserve || 0) / Math.pow(10, decimals) * (p.price || 1);
    const utilization = p.totalSupplied > 0 ? p.totalBorrowed / p.totalSupplied : 0;
    const suppliedUSD = toADA(suppliedADA) * adaPrice;

    const supplyLogo = poolAssetLogo(p.asset);
    const collLogos = (p.collateralAssets || []).slice(0, 2).map(c => poolAssetLogo({ policyId: c.policyId, assetName: c.assetName }));
    const pileIcons = [];
    if (supplyLogo) pileIcons.push(supplyLogo);
    for (const logo of collLogos) if (logo) pileIcons.push(logo);
    const pileHtml = pileIcons.length > 0
      ? `<span class="pool-icon-pile">${pileIcons.map(src => `<img class="pool-icon" src="${escHtml(src)}" alt="">`).join('')}</span>`
      : '';

    const poolName = p.asset.ticker + (p.collateralAssets.length > 0 ? '/' + p.collateralAssets.slice(0, 2).map(c => c.ticker).join('+') + (p.collateralAssets.length > 2 ? '…' : '') : '');
    const collatTickers = p.collateralAssets.length > 0 ? p.collateralAssets.map(c => c.ticker).join(' + ') : '—';

    html += `
      <div class="pool-card">
        <div class="pool-card-header">
          ${pileHtml}
          <span class="pool-card-title">${escHtml(poolName)}</span>
          <span class="pool-card-price">${fmtADA(p.price || 1)}</span>
        </div>
        <div class="pool-card-body">
          <div class="pool-metric">
            <span class="pool-metric-label">Supply APY</span>
            <span class="pool-metric-val">${fmtPct(p.supplyApy)}</span>
            <span class="pool-metric-sub">+ adj ${fmtPct(p.supplyApyAdjustment)} = ${fmtPct(p.supplyApyTotal)} total</span>
          </div>
          <div class="pool-metric">
            <span class="pool-metric-label">Borrow APR</span>
            <span class="pool-metric-val">${fmtPct(p.borrowApr)}</span>
            <span class="pool-metric-sub">Spread ${fmtPct(p.borrowApr - p.supplyApyTotal)}</span>
          </div>
          <div class="pool-metric">
            <span class="pool-metric-label">Utilization</span>
            <span class="pool-metric-val">${fmtPct(utilization)}</span>
            <span class="pool-metric-sub">${borrowedADA > 0 ? borrowedADA.toFixed(2) + ' / ' + suppliedADA.toFixed(2) : '0 / ' + suppliedADA.toFixed(2)} ADA</span>
          </div>
          <div class="pool-metric">
            <span class="pool-metric-label">Total Supplied</span>
            <span class="pool-metric-val">${fmtADA(suppliedADA)}</span>
            <span class="pool-metric-sub">${fmtUSD(suppliedUSD)}</span>
          </div>
          <div class="pool-metric">
            <span class="pool-metric-label">Total Borrowed</span>
            <span class="pool-metric-val">${fmtADA(borrowedADA)}</span>
            <span class="pool-metric-sub">${borrowedADA > 0 ? fmtUSD(borrowedADA * adaPrice) : '—'}</span>
          </div>
          <div class="pool-metric">
            <span class="pool-metric-label">Reserve</span>
            <span class="pool-metric-val">${fmtADA(reserveADA)}</span>
            <span class="pool-metric-sub">Reserve factor ${fmtPct(p.reserveFactor)}</span>
          </div>
          <div class="pool-metric">
            <span class="pool-metric-label">Historical APY</span>
            <span class="pool-metric-val">${fmtPct(p.historicalApy || 0)}</span>
          </div>
          <div class="pool-metric">
            <span class="pool-metric-label">LTV Thresholds</span>
            <span class="pool-metric-val">Max ${fmtPct(p.maxBorrowLTV)}</span>
            <span class="pool-metric-sub">Liq ${fmtPct(p.liquidationThresholdLTV)} · Rec ${fmtPct(p.recommendedBorrowLTV)}</span>
          </div>
          <div class="pool-metric">
            <span class="pool-metric-label">Collateral Assets</span>
            <span class="pool-metric-val">${escHtml(collatTickers)}</span>
          </div>
          <div class="pool-metric">
            <span class="pool-metric-label">Total Volume</span>
            <span class="pool-metric-val">${fmtADA(p.totalVolume || 0)}</span>
          </div>
        </div>
      </div>
    `;
  }

  html += '</div></div>';
  el.innerHTML = html;
}

function renderRiskAnalysis(positions, pools, summary) {
  const el = $('#riskAnalysisContainer');
  if (!el) return;

  const fmtPct = (v) => (v * 100).toFixed(2) + '%';
  const fmtADA = (v) => '₳' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtUSD = (v) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const adaPrice = summary.adaPrice || 1;
  const toADA = (usd) => usd / adaPrice;

  const healthy = positions.filter(p => p.ltv < 0.5);
  const atRisk = positions.filter(p => p.ltv >= 0.5 && p.ltv < 0.75);
  const liq = positions.filter(p => p.ltv >= 0.75);

  const healthyValADA = healthy.reduce((s, p) => s + p.netValueUSD, 0) / adaPrice;
  const atRiskValADA = atRisk.reduce((s, p) => s + p.netValueUSD, 0) / adaPrice;
  const liqValADA = liq.reduce((s, p) => s + p.netValueUSD, 0) / adaPrice;
  const totalPos = positions.length || 1;

  const ltvBuckets = { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75%+': 0 };
  for (const p of positions) {
    if (p.ltv < 0.25) ltvBuckets['0-25%']++;
    else if (p.ltv < 0.5) ltvBuckets['25-50%']++;
    else if (p.ltv < 0.75) ltvBuckets['50-75%']++;
    else ltvBuckets['75%+']++;
  }

  const liqValues = positions.filter(p => p.ltv > 0).map(p => {
    const pool = pools.find(po => po.poolId === p.poolId);
    const threshold = pool?.liquidationThresholdLTV || 0.8;
    return { addr: p.address, currentLtv: p.ltv, threshold, distanceToLiq: threshold - p.ltv };
  });

  const closeToLiq = liqValues.filter(p => p.distanceToLiq < 0.1 && p.distanceToLiq >= 0).length;

  const poolRisk = {};
  for (const p of positions) {
    const ticker = pools.find(po => po.poolId === p.poolId)?.asset.ticker || '?';
    if (!poolRisk[ticker]) poolRisk[ticker] = { total: 0, liquidatable: 0, atRisk: 0, valueADA: 0 };
    poolRisk[ticker].total++;
    poolRisk[ticker].valueADA += p.totalOwedUSD / adaPrice;
    if (p.ltv >= 0.75) poolRisk[ticker].liquidatable++;
    else if (p.ltv >= 0.5) poolRisk[ticker].atRisk++;
  }

  const avgLiqThreshold = positions.reduce((s, p) => {
    const pool = pools.find(po => po.poolId === p.poolId);
    return s + (pool?.liquidationThresholdLTV || 0.8);
  }, 0) / totalPos;

  let html = '<div class="summary-card summary-card-wide"><div class="summary-header"><h3>Risk Analysis</h3></div>';

  html += '<div class="stats-bento">';
  html += `<div class="bento-cell bento-txt-ok"><div class="bento-label">Healthy Positions</div><div class="bento-value">${healthy.length}</div><div class="bento-sub">${fmtADA(healthyValADA)} net value</div></div>`;
  html += `<div class="bento-cell bento-txt-warning"><div class="bento-label">At Risk (LTV 50-75%)</div><div class="bento-value">${atRisk.length}</div><div class="bento-sub">${fmtADA(atRiskValADA)} net value</div></div>`;
  html += `<div class="bento-cell bento-txt-danger"><div class="bento-label">Liquidatable (LTV >75%)</div><div class="bento-value">${liq.length}</div><div class="bento-sub">${fmtADA(liqValADA)} net value</div></div>`;
  html += `<div class="bento-cell"><div class="bento-label">Avg Liquidation Threshold</div><div class="bento-value">${fmtPct(avgLiqThreshold)}</div><div class="bento-sub">Positions within 10% of liq: ${closeToLiq}</div></div>`;
  html += '</div>';

  html += '<div class="risk-ltv-section"><div class="risk-subtitle">LTV Distribution</div><div class="risk-ltv-bars">';
  for (const [bucket, count] of Object.entries(ltvBuckets)) {
    const pct = count / totalPos * 100;
    const barColor = bucket === '0-25%' ? '#22c55e' : bucket === '25-50%' ? '#3b82f6' : bucket === '50-75%' ? '#f59e0b' : '#ef4444';
    html += `<div class="risk-ltv-row"><span class="risk-ltv-label">${bucket}</span><div class="risk-ltv-bar-track"><div class="risk-ltv-bar-fill" style="width:${pct}%;background:${barColor}"></div></div><span class="risk-ltv-count">${count}</span><span class="risk-ltv-pct">(${(pct).toFixed(1)}%)</span></div>`;
  }
  html += '</div></div>';

  html += '<div class="risk-pool-table-wrap"><div class="risk-subtitle">Risk by Pool</div><table class="surf-table"><thead><tr><th>Pool</th><th>Positions</th><th>At Risk</th><th>Liquidatable</th><th>Loan Value (ADA)</th></tr></thead><tbody>';
  for (const [ticker, r] of Object.entries(poolRisk).sort((a, b) => b[1].total - a[1].total)) {
    const atRiskBar = r.total > 0 ? '<div class="risk-mini-bar"><div class="risk-mini-fill risk-mini-warn" style="width:' + (r.atRisk / r.total * 100) + '%"></div><div class="risk-mini-fill risk-mini-liq" style="width:' + (r.liquidatable / r.total * 100) + '%"></div></div>' : '';
    html += `<tr><td><strong>${escHtml(ticker)}</strong></td><td>${r.total}</td><td>${r.atRisk}</td><td>${r.liquidatable}</td><td>${fmtADA(r.valueADA)}</td></tr>`;
  }
  html += '</tbody></table></div>';

  html += '</div>';
  el.innerHTML = html;
}

function renderPositionHealthBar() {
  const wrap = $('#healthBarWrap');
  if (!wrap || !surfData?.positions) return;
  const positions = surfData.positions;
  const adaPrice = surfData.summary.adaPrice || 1;

  const healthy = positions.filter(p => p.ltv < 0.5);
  const atRisk = positions.filter(p => p.ltv >= 0.5 && p.ltv < 0.75);
  const liq = positions.filter(p => p.ltv >= 0.75);

  const healthyVal = healthy.reduce((s, p) => s + p.totalOwedUSD, 0) / adaPrice;
  const atRiskVal = atRisk.reduce((s, p) => s + p.totalOwedUSD, 0) / adaPrice;
  const liqVal = liq.reduce((s, p) => s + p.totalOwedUSD, 0) / adaPrice;
  const totalVal = healthyVal + atRiskVal + liqVal || 1;

  const fmtADA = (v) => '₳' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtShort = (v) => { if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'; if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K'; return v.toFixed(2); };

  wrap.innerHTML = `
    <div class="stacked-bar-section">
      <div class="stacked-bar-track">
        <div class="stacked-bar-seg seg-healthy" style="flex:${healthyVal / totalVal * 1000}" title="${healthy.length} healthy · ${fmtShort(healthyVal)} ADA"></div>
        <div class="stacked-bar-seg seg-atrisk" style="flex:${atRiskVal / totalVal * 1000}" title="${atRisk.length} at risk · ${fmtShort(atRiskVal)} ADA"></div>
        <div class="stacked-bar-seg seg-liquidatable" style="flex:${liqVal / totalVal * 1000}" title="${liq.length} liquidatable · ${fmtShort(liqVal)} ADA"></div>
      </div>
      <div class="stacked-bar-legend">
        <span class="stacked-bar-legend-item"><span class="legend-dot dot-healthy"></span> Healthy <strong>${healthy.length}</strong> <span class="legend-val">${fmtShort(healthyVal)} ADA</span></span>
        <span class="stacked-bar-legend-item"><span class="legend-dot dot-atrisk"></span> At Risk <strong>${atRisk.length}</strong> <span class="legend-val">${fmtShort(atRiskVal)} ADA</span></span>
        <span class="stacked-bar-legend-item"><span class="legend-dot dot-liquidatable"></span> Liquidatable <strong>${liq.length}</strong> <span class="legend-val">${fmtShort(liqVal)} ADA</span></span>
      </div>
    </div>
  `;
}

function renderTvlCompositionBar() {
  const wrap = $('#tvlBarWrap');
  if (!wrap || !surfData) return;
  const { pools, positions, summary } = surfData;
  const adaPrice = summary.adaPrice || 1;

  const borrowedUSD = summary.totalBorrowedFromPools ?? summary.totalBorrowedUSD;
  const tvlUSD = summary.totalTVLFromPools ?? summary.totalTVLUSD ?? (summary.totalSuppliedUSD + summary.totalCollateralUSD - summary.totalBorrowedUSD);
  const suppliedADA = summary.totalSuppliedUSD / adaPrice;
  const collateralADA = summary.totalCollateralUSD / adaPrice;
  const borrowedADA = borrowedUSD / adaPrice;
  const tvlADA = tvlUSD / adaPrice;

  const maxVal = Math.max(suppliedADA, collateralADA, tvlADA) || 1;
  const fmtADA = (v) => '₳' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtShort = (v) => { if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'; if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K'; return v.toFixed(2); };

  const pctOfTVL = (v) => tvlADA > 0 ? (v / tvlADA * 100).toFixed(1) + '%' : '—';

  const bars = [
    { label: 'Supplied', val: suppliedADA, color: '#3b82f6', desc: 'Supply pool deposits' },
    { label: 'Collateral', val: collateralADA, color: '#8b5cf6', desc: 'Collateral for loans' },
    { label: 'Borrowed', val: borrowedADA, color: '#ef4444', desc: 'Outstanding loans (subtracted)', negative: true },
  ];

  wrap.innerHTML = `
    <div class="stacked-bar-section">
      <div class="tvl-bar-list">
        ${bars.map(b => {
          const pct = b.val / maxVal * 100;
          const barColor = b.negative ? 'tvl-bar-negative' : '';
          return `<div class="tvl-bar-row">
            <span class="tvl-bar-label">${b.label}</span>
            <div class="tvl-bar-track">
              <div class="tvl-bar-fill ${barColor}" style="width:${pct}%;background:${b.color}"></div>
            </div>
            <span class="tvl-bar-ada">${b.negative ? '- ' : ''}${fmtShort(b.val)}</span>
            <span class="tvl-bar-pct">${pctOfTVL(b.val)}</span>
          </div>`;
        }).join('')}
        <div class="tvl-bar-row tvl-bar-result">
          <span class="tvl-bar-label">Net TVL</span>
          <div class="tvl-bar-track">
            <div class="tvl-bar-fill tvl-bar-net" style="width:${tvlADA / maxVal * 100}%"></div>
          </div>
          <span class="tvl-bar-ada tvl-bar-ada-result">${fmtShort(tvlADA)}</span>
          <span class="tvl-bar-pct">100%</span>
        </div>
      </div>
    </div>
  `;
}

function renderRevenueBreakdown() {
  const wrap = $('#revenueBreakdownWrap');
  if (!wrap || !surfData) return;
  const { pools, summary, staking } = surfData;
  const fmtADA = (v) => '₳' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtShort = (v) => { if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'; if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K'; return v.toFixed(2); };

  const poolRevenues = pools.map(p => {
    const dec = p.asset.decimals || 0;
    const bAda = ((p.totalBorrowed || 0) / Math.pow(10, dec)) * (p.price || 1);
    const reserveAda = ((p.reserve || 0) / Math.pow(10, dec)) * (p.price || 1);
    const unpaidAda = ((p.totalUnpaidInterest || 0) / Math.pow(10, dec)) * (p.price || 1);
    const revAda = bAda * (p.borrowApr || 0) * (p.reserveFactor || 0);
    return { ticker: p.asset.ticker, revAda, reserveAda, unpaidAda, borrowedAda: bAda };
  });

  const reserveRevAda = poolRevenues.reduce((s, r) => s + r.revAda, 0);
  const totalReserveAda = poolRevenues.reduce((s, r) => s + r.reserveAda, 0);
  const totalUnpaidAda = poolRevenues.reduce((s, r) => s + r.unpaidAda, 0);
  const protocolUnpaidAda = totalUnpaidAda * 0.1;

  const stakingInfo = staking?.info;
  const allTimeDistributed = stakingInfo ? (stakingInfo.totalDistributedRewards || 0) / 1e6 : 0;
  const currentPeriodRewards = stakingInfo ? (stakingInfo.totalPeriodRewards || 0) / 1e6 : 0;
  const nextPeriodRewards = stakingInfo ? (stakingInfo.totalNextPeriodRewards || 0) / 1e6 : 0;

  const annualStakingRewards = currentPeriodRewards * 365 / (stakingInfo?.stakingPeriodInDays || 15);
  const reserveShareOfAnnual = annualStakingRewards > 0 ? reserveRevAda / annualStakingRewards : 0;
  const allTimeReservePortion = allTimeDistributed * Math.min(1, reserveShareOfAnnual);
  const allTimeLiqOpenPortion = allTimeDistributed - allTimeReservePortion;

  const topRevenues = poolRevenues.filter(r => r.revAda > 0).sort((a, b) => b.revAda - a.revAda);
  const maxReserve = Math.max(...topRevenues.map(r => r.revAda), 1);

  wrap.innerHTML = `
    <div class="revenue-section">

      <div class="revenue-subtitle">Revenue Sources</div>
      <div class="revenue-method">
        <div class="revenue-method-item"><span class="revenue-method-dot" style="background:var(--accent)"></span> <strong>Borrow reserve (10%)</strong> — protocol cut of all borrow interest</div>
        <div class="revenue-method-item"><span class="revenue-method-dot" style="background:var(--warning)"></span> <strong>Liquidation fees (15%)</strong> — <span class="tooltip">70% → stakers · 30% → LPs</span> penalty on liquidated positions</div>
        <div class="revenue-method-item"><span class="revenue-method-dot" style="background:var(--amber)"></span> <strong>Position open fees (1%)</strong> — charged when opening a borrow position</div>
      </div>

      <div class="revenue-divider"></div>

      <div class="revenue-subtitle">All-Time Protocol Revenue</div>
      <div class="revenue-total">${fmtADA(allTimeDistributed)}</div>
      <div class="stacked-bar-section">
        <div class="rev-bar-row">
          <span class="rev-bar-label">Reserve</span>
          <div class="rev-bar-track">
            <div class="rev-bar-fill" style="width:${allTimeReservePortion / (allTimeDistributed || 1) * 100}%;background:var(--accent)"></div>
          </div>
          <span class="rev-bar-val">${fmtShort(allTimeReservePortion)}</span>
          <span class="rev-bar-pct">${allTimeDistributed > 0 ? (allTimeReservePortion / allTimeDistributed * 100).toFixed(1) + '%' : '—'}</span>
        </div>
        <div class="rev-bar-row">
          <span class="rev-bar-label">Liq. + open</span>
          <div class="rev-bar-track">
            <div class="rev-bar-fill" style="width:${allTimeLiqOpenPortion / (allTimeDistributed || 1) * 100}%;background:var(--warning)"></div>
          </div>
          <span class="rev-bar-val">${fmtShort(allTimeLiqOpenPortion)}</span>
          <span class="rev-bar-pct">${allTimeDistributed > 0 ? (allTimeLiqOpenPortion / allTimeDistributed * 100).toFixed(1) + '%' : '—'}</span>
        </div>
      </div>

      <div class="revenue-divider"></div>

      <div class="revenue-subtitle">Reserve Revenue by Pool <span class="tooltip">Current annual rate · proportional split applied to all-time</span></div>
      <div class="stacked-bar-section">
        ${topRevenues.map(r => `
          <div class="rev-bar-row">
            <span class="rev-bar-label">${escHtml(r.ticker)}</span>
            <div class="rev-bar-track">
              <div class="rev-bar-fill" style="width:${r.revAda / maxReserve * 100}%;background:var(--accent)"></div>
            </div>
            <span class="rev-bar-val">${fmtShort(r.revAda)}</span>
            <span class="rev-bar-pct">${reserveRevAda > 0 ? (r.revAda / reserveRevAda * 100).toFixed(1) + '%' : '—'}</span>
          </div>
        `).join('')}
      </div>

      <div class="revenue-divider"></div>

      <div class="revenue-subtitle">Snapshot</div>
      <div class="revenue-hist-grid">
        <div class="revenue-hist-cell">
          <div class="revenue-hist-label">Total Distributed</div>
          <div class="revenue-hist-value">${fmtADA(allTimeDistributed)}</div>
          <div class="revenue-hist-sub">All-time ADA paid to stakers</div>
        </div>
        <div class="revenue-hist-cell">
          <div class="revenue-hist-label">Current Reserves</div>
          <div class="revenue-hist-value">${fmtADA(totalReserveAda)}</div>
          <div class="revenue-hist-sub">Not yet distributed</div>
        </div>
        <div class="revenue-hist-cell">
          <div class="revenue-hist-label">Current Period</div>
          <div class="revenue-hist-value">${fmtADA(currentPeriodRewards)}</div>
          <div class="revenue-hist-sub">${stakingInfo?.stakingPeriodInDays || 15}-day rewards</div>
        </div>
        <div class="revenue-hist-cell">
          <div class="revenue-hist-label">Next Period</div>
          <div class="revenue-hist-value">${fmtADA(nextPeriodRewards)}</div>
          <div class="revenue-hist-sub">Upcoming rewards bucket</div>
        </div>
      </div>
    </div>
  `;
}

function renderSurfPoolFilter(pools) {
  const sel = $('#surfPoolFilter');
  const current = sel.value;
  sel.innerHTML = '<option value="">All Pools</option>';
  const seen = new Set();
  for (const p of pools) {
    const label = p.asset.ticker + (p.collateralAssets.length > 0 ? '/' + p.collateralAssets[0].ticker : '');
    if (seen.has(label)) continue;
    seen.add(label);
    sel.innerHTML += `<option value="${escHtml(p.poolId)}">${escHtml(label)}</option>`;
  }
  sel.value = current;
}

function surfSortByColumn(key) {
  if (surfSortKey === key) {
    surfSortDir *= -1;
  } else {
    surfSortKey = key;
    surfSortDir = -1;
  }
  if (surfData) renderSurfPositions(surfData.positions, surfData.pools, surfData.summary);
}

function renderSurfPositions(positions, pools, summary) {
  const container = $('#surfContent');

  let filtered = [...positions];

  if (surfFilterAddr) {
    const q = surfFilterAddr.toLowerCase();
    filtered = filtered.filter(p => p.address.toLowerCase().includes(q));
  }
  if (surfFilterPool) {
    filtered = filtered.filter(p => p.poolId === surfFilterPool);
  }
  if (surfFilterStatus) {
    filtered = filtered.filter(p => {
      const ltv = p.ltv || 0;
      if (surfFilterStatus === 'healthy') return ltv < 0.5;
      if (surfFilterStatus === 'warning') return ltv >= 0.5 && ltv < 0.75;
      if (surfFilterStatus === 'danger') return ltv >= 0.75;
      return true;
    });
  }

  const sortFns = {
    'pool':      (a, b) => (a.principalTicker || '').localeCompare(b.principalTicker || ''),
    'address':   (a, b) => (a.address || '').localeCompare(b.address || ''),
    'ltv':       (a, b) => (a.ltv || 0) - (b.ltv || 0),
    'collateral':(a, b) => (a.collateralValueUSD || 0) - (b.collateralValueUSD || 0),
    'borrow':    (a, b) => (a.totalOwedUSD || 0) - (b.totalOwedUSD || 0),
    'netvalue':  (a, b) => (a.netValueUSD || 0) - (b.netValueUSD || 0),
    'apr':       (a, b) => (a.interestRate || 0) - (b.interestRate || 0),
    'duration':  (a, b) => (a.elapsedYears || 0) - (b.elapsedYears || 0),
    'interest':  (a, b) => (a.accruedInterest || 0) - (b.accruedInterest || 0),
    'opened':    (a, b) => (a.startTime || 0) - (b.startTime || 0),
  };

  if (sortFns[surfSortKey]) {
    filtered.sort((a, b) => sortFns[surfSortKey](a, b) * surfSortDir);
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No positions match your filters.</p></div>';
    return;
  }

  const fmtADA = (v, d) => (v / Math.pow(10, d || 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  const fmtUSD = (v) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (v) => (v * 100).toFixed(2) + '%';
  const fmtDate = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString();
  };
  const fmtTime = (years) => {
    if (!years) return '—';
    if (years < 0.00274) return Math.floor(years * 8766) + 'h';
    if (years < 0.0833) return Math.floor(years * 30.44) + 'd';
    if (years < 1) return Math.floor(years * 12) + 'mo';
    return years.toFixed(1) + 'y';
  };

  const iconHtml = (logoSrc, alt) => logoSrc ? `<img class="surf-token-icon" src="${escHtml(logoSrc)}" alt="${escHtml(alt)}">` : '';

  function poolIcons(pool) {
    if (!pool) return '';
    const supplyLogo = poolAssetLogo(pool.asset);
    const collLogos = (pool.collateralAssets || []).slice(0, 2).map(c => poolAssetLogo({ policyId: c.policyId, assetName: c.assetName }));
    const icons = [];
    if (supplyLogo) icons.push(supplyLogo);
    for (const logo of collLogos) if (logo) icons.push(logo);
    if (icons.length === 0) return '';
    return `<span class="surf-token-pile">${icons.map((src, i) => `<img class="surf-token-icon" src="${escHtml(src)}" alt="">`).join('')}</span> `;
  }

  function poolDisplayName(pool) {
    if (!pool) return '';
    const borrowed = pool.asset.ticker;
    const collaterals = pool.collateralAssets.map(c => c.ticker).filter(Boolean);
    if (collaterals.length === 0) return borrowed;
    if (collaterals.length === 1) return borrowed + '/' + collaterals[0];
    return borrowed + '/' + collaterals.slice(0, 2).join('+') + (collaterals.length > 2 ? '…' : '');
  }

  function poolAssetLogo(asset) {
    if (!asset || !asset.policyId) return TOKEN_LOGOS.ADA;
    return tokenLogoCache.get(asset.policyId + (asset.assetName || '')) || null;
  }

  function posAssetLogo(policyId, assetName) {
    if (!policyId) return TOKEN_LOGOS.ADA;
    return tokenLogoCache.get(policyId + (assetName || '')) || null;
  }

  function cellVal(p) {
    const pool = pools ? pools.find(po => po.poolId === p.poolId) : null;
    const pName = poolDisplayName(pool);
    const liqThreshold = pool?.liquidationThresholdLTV || 0.8;
    const ltvPct = p.ltv / liqThreshold;
    const ltvColor = p.ltv >= 0.75 ? 'surf-txt-danger' : p.ltv >= 0.5 ? 'surf-txt-warning' : 'surf-txt-ok';
    const poolLogo = pool ? poolAssetLogo(pool.asset) : null;
    const borrowLogo = posAssetLogo(p.principalPolicyId, p.principalAssetName);
    const collatLogo = posAssetLogo(p.collateralPolicyId, p.collateralAssetName);

    return {
      pool:       `<span class="surf-cell-main">${poolIcons(pool)}${escHtml(pName)}</span>`,
      address:    `<span class="surf-cell-main">${escHtml(displayAddr(p.address, shorten(p.address, 6, 4)))}</span>`,
      ltv:        `<span class="${ltvColor}" style="font-weight:600">${fmtPct(p.ltv)}</span><span class="surf-ltv-bar"><span class="surf-ltv-bar-fill" style="width:${Math.min(ltvPct * 100, 100)}%"></span></span>`,
      collateral: `<span class="surf-cell-main">${iconHtml(collatLogo, p.collateralTicker)}${fmtADA(p.collateral, p.collateralDecimals)}</span><span class="surf-cell-sub">${escHtml(p.collateralTicker)} · ${fmtUSD(p.collateralValueUSD)}</span>`,
      borrow:     `<span class="surf-cell-main">${iconHtml(borrowLogo, p.principalTicker)}${fmtADA(p.totalOwed, p.principalDecimals)}</span><span class="surf-cell-sub">${escHtml(p.principalTicker)} · ${fmtUSD(p.totalOwedUSD)}</span>`,
      netvalue:   `<span class="surf-cell-main ${p.netValueUSD < 0 ? 'surf-txt-danger' : 'surf-txt-ok'}">${fmtUSD(p.netValueUSD)}</span>`,
      apr:        `<span class="surf-cell-main">${fmtPct(p.interestRate)}</span>`,
      duration:   `<span class="surf-cell-main">${fmtTime(p.elapsedYears)}</span>`,
      interest:   `<span class="surf-cell-main">${fmtADA(p.accruedInterest, p.principalDecimals)}</span><span class="surf-cell-sub">${escHtml(p.principalTicker)}</span>`,
      opened:     `<span class="surf-cell-main">${fmtDate(p.startTime)}</span>`,
    };
  }

  const atRisk = filtered.filter(p => p.ltv >= 0.5).length;
  const totalBorrowUSD = filtered.reduce((s, p) => s + p.totalOwedUSD, 0);
  const totalCollateralUSD = filtered.reduce((s, p) => s + p.collateralValueUSD, 0);
  const weightedApr = filtered.reduce((s, p) => s + (p.interestRate || 0) * (p.totalOwedUSD || 0), 0) / (totalBorrowUSD || 1);

  let html = `<div class="surf-count-bar">`;
  html += `<span class="surf-count">${filtered.length} position${filtered.length !== 1 ? 's' : ''}</span>`;
  html += `<span class="surf-stats-mini">`;
  html += `<span class="surf-mini-stat">At Risk: <strong>${atRisk}</strong></span>`;
  html += `<span class="surf-mini-stat">Avg APR: <strong>${fmtPct(weightedApr)}</strong></span>`;
  html += `<span class="surf-mini-stat">Collateral Ratio: <strong>${(totalCollateralUSD / (totalBorrowUSD || 1)).toFixed(2)}x</strong></span>`;
  html += `</span></div>`;

  html += '<div class="surf-table-wrap"><table class="surf-table"><thead><tr>';
  for (const col of SURF_COLUMNS) {
    let attrs = `class="surf-th surf-th-${col.align}"`;
    if (col.width) attrs += ` style="width:${col.width}px"`;
    if (col.sortable) {
      const arrow = surfSortKey === col.key ? (surfSortDir === -1 ? ' ▼' : ' ▲') : '';
      html += `<th ${attrs} data-sort="${col.key}">${escHtml(col.label)}${arrow}</th>`;
    } else {
      html += `<th ${attrs}>${escHtml(col.label)}</th>`;
    }
  }
  html += '</tr></thead><tbody>';

  for (const p of filtered) {
    const vals = cellVal(p);
    const rowClass = p.ltv >= 0.75 ? 'surf-row-danger' : p.ltv >= 0.5 ? 'surf-row-warning' : '';
    html += `<tr class="${rowClass}" title="${escHtml(p.address)}">`;
    for (const col of SURF_COLUMNS) {
      html += `<td class="surf-td surf-td-${col.align}">${vals[col.key] || ''}</td>`;
    }
    html += `</tr>`;
  }

  html += '</tbody></table></div>';
  container.innerHTML = html;

  container.querySelectorAll('.surf-th[data-sort]').forEach(th => {
    th.addEventListener('click', () => surfSortByColumn(th.dataset.sort));
  });
}

$('#surfAddressFilter')?.addEventListener('input', (e) => {
  surfFilterAddr = e.target.value;
  if (surfData) renderSurfPositions(surfData.positions, surfData.pools, surfData.summary);
});

$('#surfPoolFilter')?.addEventListener('change', (e) => {
  surfFilterPool = e.target.value;
  if (surfData) renderSurfPositions(surfData.positions, surfData.pools, surfData.summary);
});

$('#surfStatusFilter')?.addEventListener('change', (e) => {
  surfFilterStatus = e.target.value;
  if (surfData) renderSurfPositions(surfData.positions, surfData.pools, surfData.summary);
});

/* ---------- SURF Analytics ---------- */

let analyticsCharts = [];
let analyticsDays = 7;
let analyticsUnit = 'usd';
let graphCache = null;
let graphCacheKey = '';
let graphCacheTime = 0;

function destroyAnalyticsCharts() {
  for (const c of analyticsCharts) { if (c) c.destroy(); }
  analyticsCharts = [];
  if (stakingChart) { stakingChart.destroy(); stakingChart = null; }
}

function analyticsThemeColors() {
  const d = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: d ? '#d4d4d4' : '#525252', grid: d ? '#404040' : '#e5e5e5',
    surface: d ? '#262626' : '#f5f5f5', accent: '#d94f6f',
    green: '#22c55e', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6',
    purple: '#a855f7', cyan: '#06b6d4',
  };
}

async function renderAnalytics() {
  await ensureChart();
  if (!Chart) return;
  const container = $('#analyticsContent');
  const empty = $('#analyticsEmpty');

  try {
    const days = analyticsDays > 0 ? analyticsDays : 3650;
    const key = days + '-' + analyticsUnit;
    const now = Date.now();
    let data = null;
    if (graphCacheKey === key && graphCache && (now - graphCacheTime) < 300000) {
      data = graphCache;
    } else {
      const from = new Date(Date.now() - days * 86400000).toISOString();
      const res = await fetch('/api/graph?type=protocol&from=' + encodeURIComponent(from));
      if (!res.ok) throw new Error((await res.json()).error);
      data = await res.json();
      graphCache = data;
      graphCacheKey = key;
      graphCacheTime = now;
    }

    if (!data.snapshots || data.snapshots.length < 1) {
      container.style.display = 'none'; empty.style.display = '';
      return;
    }

    // staking stats (from surf dashboard data)
    renderStakingStats();

    container.style.display = ''; empty.style.display = 'none';
    destroyAnalyticsCharts();

    const C = analyticsThemeColors();
    const snap = data.snapshots;
    const isAda = analyticsUnit === 'ada';
    const toUnit = (usd, adaPrice) => isAda && adaPrice ? usd / adaPrice : usd;
    const labels = snap.map(s => {
      const d = new Date(s.snapshot_at);
      return (d.getMonth() + 1) + '/' + d.getDate();
    });

    function sci(v) { return { labels, datasets: v }; }
    function lo(c) { return { labels: { color: c, font: { size: 10 }, usePointStyle: true, pointStyle: 'circle', padding: 14 } }; }
    function base() {
      return {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: C.surface, titleColor: C.text, bodyColor: C.text,
            borderColor: C.grid, borderWidth: 1, cornerRadius: 6, padding: 8,
            bodyFont: { size: 11 },
          },
        },
        interaction: { intersect: false, mode: 'index' },
      };
    }
    function xAxis() { return { grid: { color: C.grid, tickLength: 4 }, ticks: { color: C.text, maxTicksLimit: 10, font: { size: 9 } } }; }
    function yAxis(fmt) {
      return { grid: { color: C.grid }, ticks: { color: C.text, font: { size: 9 }, callback: (v) => fmt(v) } };
    }

    const adaTick = (v) => v >= 1e6 ? '₳' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '₳' + (v / 1e3).toFixed(0) + 'K' : '₳' + v.toFixed(0);
    const usdTick = (v) => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + v.toFixed(0);
    const moneyTick = isAda ? adaTick : usdTick;
    const pctTick = (v) => v.toFixed(1) + '%';
    const numTick = (v) => v.toFixed(0);

    function mkChart(el, config) {
      if (!Chart) return null;
      const c = new Chart(el, config);
      analyticsCharts.push(c);
      return c;
    }

    // 1 — TVL & Borrowed
    mkChart(document.querySelector('#chartTvl canvas'), {
      type: 'line',
      data: sci([
        { label: 'Total Supplied', data: snap.map(s => toUnit(s.total_supplied_usd, s.ada_price)), borderColor: C.accent, backgroundColor: C.accent + '18', fill: true, tension: 0.3, pointRadius: 0 },
        { label: 'Total Borrowed', data: snap.map(s => toUnit(s.total_borrowed_usd, s.ada_price)), borderColor: C.amber, tension: 0.3, pointRadius: 0 },
        { label: 'Total Collateral', data: snap.map(s => toUnit(s.total_collateral_usd, s.ada_price)), borderColor: C.blue, tension: 0.3, pointRadius: 0, borderDash: [3, 3] },
        { label: 'TVL', data: snap.map(s => toUnit((s.total_supplied_usd || 0) + (s.total_collateral_usd || 0) - (s.total_borrowed_usd || 0), s.ada_price)), borderColor: C.green, tension: 0.3, pointRadius: 0 },
      ]),
      options: { ...base(), scales: { x: xAxis(), y: yAxis(moneyTick) }, plugins: { legend: { ...lo(C.text), position: 'bottom' } } },
    });

    // 2 — Position Health stacked bar
    renderPositionHealthBar();

    // 2b — TVL Composition stacked bar
    renderTvlCompositionBar();

    // 3 — Revenue Sources
    renderRevenueBreakdown();

    // 4 — Avg LTV & APR
    mkChart(document.querySelector('#chartLtv canvas'), {
      type: 'line',
      data: sci([
        { label: 'Avg LTV', data: snap.map(s => (s.avg_ltv || 0) * 100), borderColor: C.red, tension: 0.3, pointRadius: 0 },
        { label: 'Avg Borrow APR', data: snap.map(s => (s.avg_borrow_apr || 0) * 100), borderColor: C.accent, tension: 0.3, pointRadius: 0 },
        { label: 'Avg Supply APY', data: snap.map(s => (s.avg_supply_apy || 0) * 100), borderColor: C.green, tension: 0.3, pointRadius: 0, borderDash: [3, 3] },
      ]),
      options: { ...base(), scales: { x: xAxis(), y: yAxis(pctTick) }, plugins: { legend: { ...lo(C.text), position: 'bottom' } } },
    });

    // 5 — Market Composition
    const last = snap[snap.length - 1];
    const adaPrice = last.ada_price || 1;
    const bd = last.pool_breakdown || {};
    const tickerMap = {};
    for (const [id, entry] of Object.entries(bd)) {
      const t = entry?.ticker || id;
      tickerMap[t] = (tickerMap[t] || 0) + toUnit(entry?.supplied_usd || 0, adaPrice);
    }
    const aggLabels = Object.keys(tickerMap).sort((a, b) => tickerMap[b] - tickerMap[a]);
    const aggData = aggLabels.map(t => tickerMap[t]);
    const poolColors = [C.accent, C.blue, C.green, C.amber, C.purple, C.cyan, C.red];
    mkChart(document.querySelector('#chartPoolsBreakdown canvas'), {
      type: 'doughnut',
      data: {
        labels: aggLabels,
        datasets: [{
          data: aggData,
          backgroundColor: aggLabels.map((_, i) => poolColors[i % poolColors.length]),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: C.text, font: { size: 10 }, padding: 8, usePointStyle: true, pointStyle: 'circle', boxWidth: 10 } },
          tooltip: {
            backgroundColor: C.surface, titleColor: C.text, bodyColor: C.text,
            borderColor: C.grid, borderWidth: 1, cornerRadius: 6, padding: 8,
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const prefix = isAda ? '₳' : '$';
                const val = ctx.parsed;
                const fmt = val >= 1e6 ? (val / 1e6).toFixed(2) + 'M' : val >= 1e3 ? (val / 1e3).toFixed(1) + 'K' : val.toFixed(0);
                return ' ' + ctx.label + ': ' + prefix + fmt + ' (' + ((ctx.parsed / total) * 100).toFixed(1) + '%)';
              },
            },
          },
        },
      },
    });

    // staking rewards chart
    if (surfData?.staking?.rewardsChart) {
      renderStakingChart(surfData.staking.rewardsChart);
    }

    // 24h deltas from earliest available snapshot
    (function updateDeltas(snapshots) {
      if (!snapshots || snapshots.length < 2) return;
      const latest = snapshots[snapshots.length - 1];
      const target = Date.now() - 86400000;
      let closest = snapshots[0];
      for (const s of snapshots) {
        const t = new Date(s.snapshot_at).getTime();
        if (Math.abs(t - target) < Math.abs(new Date(closest.snapshot_at).getTime() - target)) closest = s;
      }
      if (closest === latest) return;
      const deltaPct = (cur, prev) => prev > 0 ? ((cur - prev) / prev * 100).toFixed(2) : null;
      const supplied = latest.total_supplied_usd || 0;
      const borrowed = latest.total_borrowed_usd || 0;
      const collateral = latest.total_collateral_usd || 0;
      const supPrev = closest.total_supplied_usd || 0;
      const borPrev = closest.total_borrowed_usd || 0;
      const colPrev = closest.total_collateral_usd || 0;
      const tokens = document.querySelectorAll('.bento-cell');
      for (const t of tokens) {
        const label = t.querySelector('.bento-label')?.textContent || '';
        if (label === 'Total Value Locked') {
          const tvl = (supplied + collateral - borrowed);
          const tvlPrev = (supPrev + colPrev - borPrev);
          const d = deltaPct(tvl, tvlPrev);
          if (d) {
            const sub = t.querySelector('.bento-sub');
            if (sub) sub.textContent = (d >= 0 ? '+' : '') + d + '% (24h)';
          }
        }
        if (label === 'Total Supplied') {
          const d = deltaPct(supplied, supPrev);
          if (d) {
            const sub = t.querySelector('.bento-sub');
            if (sub) sub.textContent = (d >= 0 ? '+' : '') + d + '% (24h)';
          }
        }
        if (label === 'Total Borrowed') {
          const d = deltaPct(borrowed, borPrev);
          if (d) {
            const sub = t.querySelector('.bento-sub');
            if (sub) sub.textContent = (d >= 0 ? '+' : '') + d + '% (24h)';
          }
        }
        if (label === 'Total Collateral') {
          const d = deltaPct(collateral, colPrev);
          if (d) {
            const sub = t.querySelector('.bento-sub');
            if (sub) sub.textContent = (d >= 0 ? '+' : '') + d + '% (24h)';
          }
        }
      }
    })(data.snapshots);
  } catch (e) {
    container.style.display = 'none'; empty.style.display = '';
    empty.querySelector('p').textContent = 'Error: ' + e.message;
  }
}

/* ---------- Staking ---------- */

let stakingChart = null;

function renderStakingStats() {
  const el = $('#stakingStats');
  const staking = surfData?.staking;
  if (!staking?.info) { el.innerHTML = ''; return; }
  const info = staking.info;
  const apy = staking.apy || {};

  const fmtExact = (v) => (v / 1e6).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const nextPeriod = info.nextStakingPeriodStart
    ? new Date(info.nextStakingPeriodStart).toLocaleDateString()
    : '--';
  const lastDist = info.lastRewardsDistributionDate
    ? new Date(info.lastRewardsDistributionDate).toLocaleDateString()
    : '--';
  const periodDays = info.stakingPeriodInDays || 15;
  const activeStakePct = info.activeStakingShare != null ? (info.activeStakingShare * 100).toFixed(1) : null;
  const liveStakePct = info.liveStakingShare != null ? (info.liveStakingShare * 100).toFixed(1) : null;

  el.innerHTML = `
    <div class="staking-card">
      <div class="staking-header">
        <img src="/img/surf.svg" alt="">
        <h3>SURF Staking  <span class="tooltip">${periodDays}-day period</span></h3>
      </div>
      <div class="staking-grid">
        <div class="staking-stat">
          <div class="staking-stat-label">Total Live Staked</div>
          <div class="staking-stat-value">${fmtExact(info.totalLiveStake)} SURF</div>
          <div class="staking-stat-sub">${(info.liveStakedCirculatingSupply * 100).toFixed(1)}% of circ · ${liveStakePct ? liveStakePct + '% live' : ''}</div>
        </div>
        <div class="staking-stat">
          <div class="staking-stat-label">Total Active Staked</div>
          <div class="staking-stat-value">${fmtExact(info.totalActiveStake)} SURF</div>
          <div class="staking-stat-sub">${activeStakePct ? activeStakePct + '% active' : ''}</div>
        </div>
        <div class="staking-stat">
          <div class="staking-stat-label">Stakers</div>
          <div class="staking-stat-value">${info.totalStakeLiveUniqueStakers}</div>
          <div class="staking-stat-sub">${info.totalStakeUniqueStakers} this period</div>
        </div>
        <div class="staking-stat">
          <div class="staking-stat-label">Period APY</div>
          <div class="staking-stat-value" style="color:var(--success)">${(apy.periodApy || 0).toFixed(2)}%</div>
          <div class="staking-stat-sub">Aggregated: ${(apy.aggregatedApy || 0).toFixed(2)}%</div>
        </div>
        <div class="staking-stat">
          <div class="staking-stat-label">All Time Distributed</div>
          <div class="staking-stat-value">${fmtExact(info.totalDistributedRewards)} ADA</div>
        </div>
      </div>
      <div class="staking-rewards-row">
        <div class="staking-reward-box">
          <span class="staking-reward-label">Current Period Rewards</span>
          <span class="staking-reward-value">${fmtExact(info.totalPeriodRewards)} ADA</span>
        </div>
        <div class="staking-reward-box">
          <span class="staking-reward-label">Next Period Rewards</span>
          <span class="staking-reward-value">${fmtExact(info.totalNextPeriodRewards)} ADA</span>
        </div>
        <div class="staking-reward-box">
          <span class="staking-reward-label">Last Distribution</span>
          <span class="staking-reward-value">${lastDist}</span>
        </div>
        <div class="staking-reward-box">
          <span class="staking-reward-label">Next Period Start</span>
          <span class="staking-reward-value">${nextPeriod}</span>
        </div>
      </div>
    </div>
  `;
}

function renderStakingChart(snapshots) {
  const canvas = document.querySelector('#chartStakingRewards canvas');
  if (!canvas || !snapshots || snapshots.length < 2) return;
  if (stakingChart) { stakingChart.destroy(); stakingChart = null; }
  if (!Chart) return;

  const C = analyticsThemeColors();
  const labels = snapshots.map(s => {
    const d = new Date(s.date);
    return (d.getMonth() + 1) + '/' + d.getDate();
  });

  stakingChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Rewards',
          data: snapshots.map(s => s.global / 1e6),
          backgroundColor: C.accent + '44',
          borderColor: C.accent,
          borderWidth: 1,
          borderRadius: 3,
          yAxisID: 'y',
          order: 1,
        },
        {
          label: 'Stakers',
          data: snapshots.map(s => s.staker),
          borderColor: C.blue,
          backgroundColor: C.blue + '22',
          pointRadius: 0,
          tension: 0.3,
          type: 'line',
          yAxisID: 'y1',
          order: 1,
        },
        {
          label: 'APY',
          data: snapshots.map(s => s.apy || s.aggregatedApy || 0),
          borderColor: C.green,
          borderDash: [3, 3],
          pointRadius: 0,
          tension: 0.3,
          type: 'line',
          yAxisID: 'y2',
          order: 0,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: C.text, font: { size: 10 }, usePointStyle: true, pointStyle: 'circle', padding: 14 } },
        tooltip: {
          backgroundColor: C.surface, titleColor: C.text, bodyColor: C.text,
          borderColor: C.grid, borderWidth: 1, cornerRadius: 6, padding: 8,
          bodyFont: { size: 11 },
        },
      },
      interaction: { intersect: false, mode: 'index' },
      scales: {
        x: { grid: { color: C.grid, tickLength: 4 }, ticks: { color: C.text, maxTicksLimit: 10, font: { size: 9 } } },
        y: { grid: { color: C.grid }, position: 'left', title: { display: true, text: 'SURF Rewards', color: C.text3, font: { size: 9 } }, ticks: { color: C.text, font: { size: 9 }, callback: (v) => v >= 1e3 ? (v / 1e3).toFixed(0) + 'M' : v.toFixed(0) } },
        y1: { grid: { drawOnChartArea: false }, position: 'right', title: { display: true, text: 'Stakers', color: C.text3, font: { size: 9 } }, ticks: { color: C.text, font: { size: 9 } } },
        y2: { grid: { drawOnChartArea: false }, position: 'right', title: { display: true, text: 'APY %', color: C.green, font: { size: 9 } }, ticks: { color: C.text, font: { size: 9 }, callback: (v) => v.toFixed(1) + '%' } },
      },
    },
  });
}

$$('.chart-range').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.chart-range').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    analyticsDays = parseInt(btn.dataset.days);
    renderAnalytics();
  });
});

$$('.unit-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.unit-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    analyticsUnit = btn.dataset.unit;
    renderAnalytics();
  });
});

/* ---------- Activity ---------- */

let activityPage = 1;
let activityInterval = null;

const tokenLogoCache = new Map();

async function fetchTokenIcon(assetHex) {
  if (!assetHex) return null;
  if (tokenLogoCache.has(assetHex)) return tokenLogoCache.get(assetHex);
  try {
    const res = await fetch(`https://tokens.cardano.org/metadata/${assetHex}`);
    if (!res.ok) {
      tokenLogoCache.set(assetHex, null);
      return null;
    }
    const data = await res.json();
    const raw = data?.logo?.value || null;
    const logo = raw ? `data:image/png;base64,${raw}` : null;
    tokenLogoCache.set(assetHex, logo);
    return logo;
  } catch {
    tokenLogoCache.set(assetHex, null);
    return null;
  }
}

async function fetchActivity() {
  const container = $('#activityContent');
  const pagination = $('#activityPagination');
  const type = $('#activityTypeFilter').value;
  const address = $('#activityAddressFilter').value;

  try {
    let url = '/api/activity?page=' + activityPage + '&per_page=50';
    if (type) url += '&type=' + encodeURIComponent(type);
    if (address) url += '&address=' + encodeURIComponent(address);
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.json()).error);
    const data = await res.json();
    const uniqueAssets = new Set();
    for (const a of data.data) {
      if (a.asset) uniqueAssets.add(a.asset);
      if (a.collateral_asset) uniqueAssets.add(a.collateral_asset);
    }
    await Promise.all([...uniqueAssets].map(fetchTokenIcon));
    await prefetchHandles(data.data.map(a => a.address));
    renderActivity(data, container, pagination);
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Error: ' + escHtml(e.message) + '</p></div>';
    pagination.innerHTML = '';
  }
}

function resolveActivityAsset(assetHex, fallbackTicker) {
  if (!assetHex) return { label: 'ADA', logo: TOKEN_LOGOS.ADA };
  const cachedLogo = tokenLogoCache.get(assetHex);
  if (cachedLogo) return { label: fallbackTicker || '?', logo: cachedLogo };
  const policyId = assetHex.slice(0, 56);
  const match = CURATED_TOKENS.find(t => t.policy === policyId);
  if (match) return { label: match.label, logo: null };
  return { label: fallbackTicker || '?', logo: null };
}

function renderActivity(data, container, pagination) {
  if (!data.data || data.data.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No activity found.</p></div>';
    pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(data.total / data.per_page);
  $('#activityUpdated').textContent = data.total + ' events';

  let html = '<table class="activity-table"><thead><tr>';
  html += '<th>Activity</th><th>Address</th><th>Amount</th><th>Collateral</th><th>Time</th><th>Tx</th>';
  html += '</tr></thead><tbody>';

  for (const a of data.data) {
    const typeClass = 'activity-type-' + a.activity_type.toLowerCase().replace(/\s+/g, '-');
    const amountRes = resolveActivityAsset(a.asset, a.asset_ticker);
    const collatRes = resolveActivityAsset(a.collateral_asset, a.collateral_ticker);
    const amountIcon = amountRes.logo ? '<img class="activity-token-icon" src="' + amountRes.logo + '" alt="' + amountRes.label + '">' : '';
    const collatIcon = collatRes.logo ? '<img class="activity-token-icon" src="' + collatRes.logo + '" alt="' + collatRes.label + '">' : '';
    html += '<tr>';
    html += '<td><span class="activity-type-badge ' + typeClass + '">' + escHtml(a.activity_type) + '</span></td>';
    html += '<td title="' + escHtml(a.address) + '">' + escHtml(displayAddr(a.address, a.address_short)) + '</td>';
    html += '<td class="activity-amount">' + amountIcon + escHtml(a.amount_fmt) + ' ' + escHtml(amountRes.label) + '</td>';
    html += '<td class="activity-amount">' + collatIcon + escHtml(a.collateral_fmt) + ' ' + escHtml(collatRes.label) + '</td>';
    html += '<td class="activity-time">' + escHtml(a.time_ago) + '</td>';
    html += '<td><a href="' + a.cardanoscan_link + '" target="_blank" rel="noopener" class="activity-tx-link">view</a></td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  let p = '<div class="activity-page-info">Page ' + data.page + ' of ' + totalPages + '</div><div class="activity-page-btns">';
  if (data.page > 1) p += '<button class="btn btn-sm activity-page-btn" data-page="' + (data.page - 1) + '">← Prev</button>';
  if (data.page < totalPages) p += '<button class="btn btn-sm activity-page-btn" data-page="' + (data.page + 1) + '">Next →</button>';
  p += '</div>';
  pagination.innerHTML = p;

  pagination.querySelectorAll('.activity-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activityPage = parseInt(btn.dataset.page);
      fetchActivity();
    });
  });
}

/* ---------- SURF Token Stats ---------- */

function renderSurfTokenStats() {
  const token = surfData?.token;
  if (!token) {
    $('#tokenSummary').innerHTML = '<div class="empty-state"><p>Token data not available.</p></div>';
    return;
  }

  const { totalSupply, holders, priceUSD, price, marketCapUSD, marketCapADA, avgBalance, medianBalance, top10ConcentrationPct, buckets, topHolders } = token;

  const fmt = (v) => (v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (v) => (v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtShort = (v) => {
    if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
    return v.toFixed(2);
  };

  $('#tokenSummary').innerHTML = `
    <div class="summary-card">
      <div class="summary-grid">
        <div class="summary-stat">
          <div class="summary-stat-label">Total Supply</div>
          <div class="summary-stat-value">${fmtShort(totalSupply)} SURF</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">Holders</div>
          <div class="summary-stat-value">${fmtInt(holders)}</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">Price</div>
          <div class="summary-stat-value">$${fmt(priceUSD)}</div>
          <div class="summary-sub">${fmt(price)} ADA</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">Market Cap</div>
          <div class="summary-stat-value">$${fmtShort(marketCapUSD)}</div>
          <div class="summary-sub">${fmtShort(marketCapADA)} ADA</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">Avg Balance</div>
          <div class="summary-stat-value">${fmtShort(avgBalance)} SURF</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">Median Balance</div>
          <div class="summary-stat-value">${fmtShort(medianBalance)} SURF</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">Top 10 Concentration</div>
          <div class="summary-stat-value">${fmt(top10ConcentrationPct)}%</div>
        </div>
      </div>
    </div>
  `;

  const bucketLabels = ['<1K', '1K-10K', '10K-100K', '100K-1M', '>1M'];
  const bucketKeys = ['under1K', 'under10K', 'under100K', 'under1M', 'over1M'];
  const bucketValues = bucketKeys.map(k => buckets?.[k] || 0);

  $('#tokenDetails').innerHTML = `
    <div class="token-buckets">
      <div class="section-title">Balance Distribution</div>
      <div class="buckets-grid">
        ${bucketLabels.map((label, i) => `
          <div class="bucket-bar">
            <div class="bucket-label">${label}</div>
            <div class="bucket-count">${fmtInt(bucketValues[i])}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  if (topHolders && topHolders.length > 0) {
    let html = '<table class="surf-table"><thead><tr><th>#</th><th>Address</th><th>Balance</th><th>% of Supply</th></tr></thead><tbody>';
    topHolders.forEach((h, i) => {
      html += `<tr>
        <td>${i + 1}</td>
        <td title="${escHtml(h.address)}">${escHtml(displayAddr(h.address))}</td>
        <td class="num">${fmtShort(h.balance)} SURF</td>
        <td class="num">${fmt(h.pct)}%</td>
      </tr>`;
    });
    html += '</tbody></table>';
    $('#tokenHoldersTable').innerHTML = html;
  }

  renderTokenDistChart(bucketLabels, bucketValues);
}

async function renderTokenDistChart(labels, values) {
  const canvas = document.querySelector('#tokenDistChart canvas');
  if (!canvas) return;

  await ensureChart();
  if (!window.Chart) return;

  if (window.tokenDistChartInstance) {
    window.tokenDistChartInstance.destroy();
    window.tokenDistChartInstance = null;
  }

  const isDark = document.body.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#aaa' : '#666';

  window.tokenDistChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Holders',
        data: values,
        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'],
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.parsed.y + ' holders' } },
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, beginAtZero: true } },
      },
    },
  });
}

$('#activityTypeFilter')?.addEventListener('change', () => { activityPage = 1; fetchActivity(); });

let activityAddressTimeout;
$('#activityAddressFilter')?.addEventListener('input', () => {
  clearTimeout(activityAddressTimeout);
  activityAddressTimeout = setTimeout(() => { activityPage = 1; fetchActivity(); }, 400);
});

/* ---------- Poll Search & Filter ---------- */

$('#pollSearch')?.addEventListener('input', (e) => {
  state.pollSearch = e.target.value;
  renderProposals();
});

$('#pollCategoryFilter')?.addEventListener('change', (e) => {
  state.pollCategory = e.target.value;
  renderProposals();
});

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateWalletUI();
  fetchProposals();
  startTicker();
});

$('#connectBtn')?.addEventListener('click', openWalletModal);
$('#themeBtn')?.addEventListener('click', toggleTheme);
