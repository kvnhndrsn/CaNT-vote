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
  SNEK: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#22c55e"/><path d="M10 20c2-4 4-6 6-6s4 3 6 3-2 4-4 4-6-2-8-1z" fill="white" opacity=".9"/><circle cx="12" cy="13" r="1.5" fill="white"/><circle cx="20" cy="13" r="1.5" fill="white"/></svg>'),
  NIGHT: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#6366f1"/><path d="M20 8c-5 0-9 4-9 9s4 9 9 9c-3 0-6-3-6-6s3-6 6-6z" fill="white" opacity=".9"/><circle cx="23" cy="11" r="1.2" fill="white" opacity=".7"/><circle cx="25" cy="16" r=".8" fill="white" opacity=".5"/></svg>'),
  WMTX: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#3b82f6"/><circle cx="16" cy="16" r="6" fill="none" stroke="white" stroke-width="1.5" opacity=".9"/><path d="M10 10l3 3M22 10l-3 3M10 22l3-3M22 22l-3-3" stroke="white" stroke-width="1.5" opacity=".6"/><circle cx="16" cy="10" r="1" fill="white"/><circle cx="16" cy="22" r="1" fill="white"/><circle cx="10" cy="16" r="1" fill="white"/><circle cx="22" cy="16" r="1" fill="white"/></svg>'),
  MIN: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#f59e0b"/><path d="M11 21l5-10 5 10" fill="none" stroke="white" stroke-width="1.8" stroke-linejoin="round" opacity=".9"/><path d="M13 18h6" stroke="white" stroke-width="1.5" opacity=".7"/></svg>'),
  STRIKE: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#ef4444"/><path d="M18 6l-6 12h4l-2 8 8-14h-4z" fill="white" opacity=".9"/></svg>'),
  SUNDAE: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#ec4899"/><ellipse cx="16" cy="19" rx="7" ry="4" fill="white" opacity=".9"/><circle cx="13" cy="11" r="2.5" fill="white" opacity=".7"/><circle cx="16" cy="9" r="2" fill="white" opacity=".5"/><circle cx="19" cy="12" r="1.8" fill="white" opacity=".6"/></svg>'),
};

const CURATED_TOKENS = [
  { label: 'SNEK',  policy: '279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3f', asset: '534e454b', fingerprint: 'asset108xu02ckwrfc8qs9d97mgyh4kn8gdu9w8f5sxk', logo: TOKEN_LOGOS.SNEK },
  { label: 'NIGHT', policy: '0691b2fecca1ac4f53cb6dfb00b7013e561d1f34403b957cbb5af1fa', asset: '4e49474854', fingerprint: 'asset1wd3llgkhsw6etxf2yca6cgk9ssrpva3wf0pq9a', logo: TOKEN_LOGOS.NIGHT },
  { label: 'WMTX',  policy: 'e5a42a1a1d3d1da71b0449663c32798725888d2eb0843c4dabeca05a', asset: '576f726c644d6f62696c65546f6b656e58', fingerprint: 'asset1l2xup5vr08s07lxg5c4kkj7ur624rv5ayzhyc7', logo: TOKEN_LOGOS.WMTX },
  { label: 'MIN',   policy: '29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6', asset: '4d494e', fingerprint: 'asset1d9v7aptfvpx7we2la8f25kwprkj2ma5rp6uwzv', logo: TOKEN_LOGOS.MIN },
  { label: 'STRIKE',policy: 'f13ac4d66b3ee19a6aa0f2a22298737bd907cc95121662fc971b5275', asset: '535452494b45', fingerprint: 'asset1tdalpjgjmt2vrhq9fvwzxqgqcq8ydr7e7e0eta', logo: TOKEN_LOGOS.STRIKE },
  { label: 'SUNDAE',policy: '9a9693a9a37912a5097918f97918d15240c92ab729a0b7c4aa144d77', asset: '53554e444145', fingerprint: 'asset1m4u92ke6820pkk07m8qmmguye02ewr8g6tezr0', logo: TOKEN_LOGOS.SUNDAE },
];

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
              <span>by ${escHtml(shorten(p.creator_address, 6))}</span>
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
  if (label && TOKEN_LOGOS[label]) return TOKEN_LOGOS[label];
  if (fingerprint) {
    const t = CURATED_TOKENS.find(t => t.fingerprint === fingerprint);
    if (t) return t.logo;
  }
  if (policyId) {
    const t = CURATED_TOKENS.find(t => t.policy === policyId);
    if (t) return t.logo;
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
  const available = getAvailableWallets();

  if (available.length === 0) {
    list.innerHTML =
      '<p class="tooltip" style="text-align:center;padding:1rem 0">No Cardano wallet detected. Install Eternl, Nami, or Lace.</p>';
  } else {
    list.innerHTML = available.map(w => `
      <button class="wallet-btn" data-wallet="${w.id}">
        <img class="wallet-logo" src="${WALLET_LOGOS[w.id] || ''}" alt="">
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
    toast('Connected: ' + shorten(state.address, 8), 'success');
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
      <span class="tooltip" style="margin-right:0.1rem;font-size:0.7rem">${escHtml(shorten(state.address, 5))}</span>
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
                <td>${escHtml(shorten(v.voter_address, 6))}</td>
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
        <div style="font-size:0.82rem;font-weight:600">${escHtml(shorten(data.address, 12))}</div>
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
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('tab-active'));
    tab.classList.add('tab-active');
    const view = tab.dataset.view;
    $('#mainView').style.display = view === 'polls' ? '' : 'none';
    $('#portfolioView').style.display = view === 'portfolio' ? '' : 'none';
    $('#profileView').style.display = view === 'profile' ? '' : 'none';
    $('#surfView').style.display = view === 'surf' ? '' : 'none';
    $('#analyticsView').style.display = view === 'analytics' ? '' : 'none';
    $('#activityView').style.display = view === 'activity' ? '' : 'none';
    if (view === 'portfolio') {
      if (!state.api) {
        $('#portfolioContent').innerHTML = '<div class="empty-state"><p>Connect your wallet to view portfolio.</p></div>';
      } else {
        fetchPortfolio();
      }
    }
    if (view === 'profile') {
      fetchProfile();
    }
    if (view === 'surf') {
      fetchSurfDashboard();
      if (surfRefreshInterval) clearInterval(surfRefreshInterval);
      surfRefreshInterval = setInterval(fetchSurfDashboard, 60000);
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
    if (view === 'activity') {
      fetchActivity();
      if (activityInterval) clearInterval(activityInterval);
      activityInterval = setInterval(fetchActivity, 30000);
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
    renderSurfDashboard();
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

function renderSurfDashboard() {
  if (!surfData) return;
  const { pools, positions, summary } = surfData;
  renderSurfSummary(summary);
  renderSurfPoolFilter(pools);
  renderSurfPositions(positions, pools, summary);
}

function renderSurfSummary(summary) {
  const el = $('#surfSummary');
  const fmtUSD = (v) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtADA = (v) => '₳' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const adaPrice = summary.adaPrice || 1;
  const toADA = (usd) => usd / adaPrice;
  el.innerHTML = `
    <div class="surf-summary-grid">
      <div class="surf-stat">
        <span class="surf-stat-label">Total Borrowed</span>
        <span class="surf-stat-value">${fmtADA(toADA(summary.totalBorrowedUSD))}</span>
        <span class="surf-stat-usd">${fmtUSD(summary.totalBorrowedUSD)}</span>
      </div>
      <div class="surf-stat">
        <span class="surf-stat-label">Total Collateral</span>
        <span class="surf-stat-value">${fmtADA(toADA(summary.totalCollateralUSD))}</span>
        <span class="surf-stat-usd">${fmtUSD(summary.totalCollateralUSD)}</span>
      </div>
      <div class="surf-stat">
        <span class="surf-stat-label">Net Position Value</span>
        <span class="surf-stat-value ${summary.totalNetValueUSD < 0 ? 'surf-neg' : 'surf-pos'}">${fmtADA(toADA(summary.totalNetValueUSD))}</span>
        <span class="surf-stat-usd ${summary.totalNetValueUSD < 0 ? 'surf-neg' : 'surf-pos'}">${fmtUSD(summary.totalNetValueUSD)}</span>
      </div>
      <div class="surf-stat">
        <span class="surf-stat-label">Open Positions</span>
        <span class="surf-stat-value">${summary.totalPositions}</span>
      </div>
      <div class="surf-stat">
        <span class="surf-stat-label">SURF Price</span>
        <span class="surf-stat-value">${fmtADA(summary.surfPrice)}</span>
        <span class="surf-stat-usd">${fmtUSD(summary.surfPriceUSD)}</span>
      </div>
      <div class="surf-stat">
        <span class="surf-stat-label">Total TVL</span>
        <span class="surf-stat-value">${fmtADA(toADA(summary.totalCollateralUSD + summary.totalBorrowedUSD))}</span>
        <span class="surf-stat-usd">${fmtUSD(summary.totalCollateralUSD + summary.totalBorrowedUSD)}</span>
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

  function poolDisplayName(pool) {
    if (!pool) return '';
    const borrowed = pool.asset.ticker;
    const collaterals = pool.collateralAssets.map(c => c.ticker).filter(Boolean);
    if (collaterals.length === 0) return borrowed;
    if (collaterals.length === 1) return borrowed + '/' + collaterals[0];
    return borrowed + '/' + collaterals.slice(0, 2).join('+') + (collaterals.length > 2 ? '…' : '');
  }

  function cellVal(p) {
    const pool = pools ? pools.find(po => po.poolId === p.poolId) : null;
    const pName = poolDisplayName(pool);
    const liqThreshold = pool?.liquidationThresholdLTV || 0.8;
    const ltvPct = p.ltv / liqThreshold;
    const ltvColor = p.ltv >= 0.75 ? 'surf-txt-danger' : p.ltv >= 0.5 ? 'surf-txt-warning' : 'surf-txt-ok';

    return {
      pool:       `<span class="surf-cell-main">${escHtml(pName)}</span>`,
      address:    `<span class="surf-cell-main">${escHtml(shorten(p.address, 6, 4))}</span>`,
      ltv:        `<span class="${ltvColor}" style="font-weight:600">${fmtPct(p.ltv)}</span><span class="surf-ltv-bar"><span class="surf-ltv-bar-fill" style="width:${Math.min(ltvPct * 100, 100)}%"></span></span>`,
      collateral: `<span class="surf-cell-main">${fmtADA(p.collateral, p.collateralDecimals)}</span><span class="surf-cell-sub">${escHtml(p.collateralTicker)} · ${fmtUSD(p.collateralValueUSD)}</span>`,
      borrow:     `<span class="surf-cell-main">${fmtADA(p.totalOwed, p.principalDecimals)}</span><span class="surf-cell-sub">${escHtml(p.principalTicker)} · ${fmtUSD(p.totalOwedUSD)}</span>`,
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

function destroyAnalyticsCharts() {
  for (const c of analyticsCharts) { if (c) c.destroy(); }
  analyticsCharts = [];
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
  const container = $('#analyticsContent');
  const empty = $('#analyticsEmpty');

  try {
    const days = analyticsDays > 0 ? analyticsDays : 3650;
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const res = await fetch('/api/graph?type=protocol&from=' + encodeURIComponent(from));
    if (!res.ok) throw new Error((await res.json()).error);
    const data = await res.json();

    if (!data.snapshots || data.snapshots.length < 1) {
      container.style.display = 'none'; empty.style.display = '';
      return;
    }

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
        { label: 'TVL', data: snap.map(s => toUnit((s.total_collateral_usd || 0) + (s.total_borrowed_usd || 0), s.ada_price)), borderColor: C.green, tension: 0.3, pointRadius: 0 },
      ]),
      options: { ...base(), scales: { x: xAxis(), y: yAxis(moneyTick) }, plugins: { legend: { ...lo(C.text), position: 'bottom' } } },
    });

    // 2 — Position Health (USD value)
    mkChart(document.querySelector('#chartHealth canvas'), {
      type: 'line',
      data: sci([
        { label: 'Healthy', data: snap.map(s => toUnit(s.healthy_value_usd || 0, s.ada_price)), borderColor: C.green, backgroundColor: C.green + '18', fill: true, tension: 0.3, pointRadius: 0 },
        { label: 'At Risk', data: snap.map(s => toUnit(s.at_risk_value_usd || 0, s.ada_price)), borderColor: C.amber, backgroundColor: C.amber + '18', fill: true, tension: 0.3, pointRadius: 0 },
        { label: 'Liquidatable', data: snap.map(s => toUnit(s.liquidatable_value_usd || 0, s.ada_price)), borderColor: C.red, backgroundColor: C.red + '18', fill: true, tension: 0.3, pointRadius: 0 },
      ]),
      options: {
        ...base(),
        scales: { x: xAxis(), y: yAxis(moneyTick) },
        plugins: { legend: { ...lo(C.text), position: 'bottom' } },
      },
    });

    // 3 — Prices
    if (isAda) {
      mkChart(document.querySelector('#chartPrices canvas'), {
        type: 'line',
        data: sci([
          { label: 'ADA (USD)', data: snap.map(s => s.ada_price), borderColor: C.blue, tension: 0.3, pointRadius: 0 },
          { label: 'SURF (ADA)', data: snap.map(s => s.surf_price), borderColor: C.accent, tension: 0.3, pointRadius: 0 },
        ]),
        options: { ...base(), scales: { x: xAxis(), y: yAxis((v) => v >= 1 ? '$' + v.toFixed(2) : '¢' + (v * 100).toFixed(1)) }, plugins: { legend: { ...lo(C.text), position: 'bottom' } } },
      });
    } else {
      mkChart(document.querySelector('#chartPrices canvas'), {
        type: 'line',
        data: sci([
          { label: 'ADA (USD)', data: snap.map(s => s.ada_price), borderColor: C.blue, tension: 0.3, pointRadius: 0 },
          { label: 'SURF (ADA)', data: snap.map(s => s.surf_price), borderColor: C.accent, tension: 0.3, pointRadius: 0 },
          { label: 'SURF (USD)', data: snap.map(s => s.surf_price_usd), borderColor: C.purple, tension: 0.3, pointRadius: 0, borderDash: [3, 3] },
        ]),
        options: { ...base(), scales: { x: xAxis(), y: yAxis(usdTick) }, plugins: { legend: { ...lo(C.text), position: 'bottom' } } },
      });
    }

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
    const names = Object.keys(bd);
    const poolColors = [C.accent, C.blue, C.green, C.amber, C.purple, C.cyan, C.red];
    mkChart(document.querySelector('#chartPoolsBreakdown canvas'), {
      type: 'doughnut',
      data: {
        labels: names.map(id => bd[id]?.ticker || id),
        datasets: [{
          data: names.map(id => toUnit(bd[id]?.supplied_usd || 0, adaPrice)),
          backgroundColor: names.map((_, i) => poolColors[i % poolColors.length]),
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
  } catch (e) {
    container.style.display = 'none'; empty.style.display = '';
    empty.querySelector('p').textContent = 'Error: ' + e.message;
  }
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
  if (match) return { label: match.label, logo: match.logo };
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
    html += '<td title="' + escHtml(a.address) + '">' + escHtml(a.address_short) + '</td>';
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

$('#activityTypeFilter')?.addEventListener('change', () => { activityPage = 1; fetchActivity(); });

let activityAddressTimeout;
$('#activityAddressFilter')?.addEventListener('input', () => {
  clearTimeout(activityAddressTimeout);
  activityAddressTimeout = setTimeout(() => { activityPage = 1; fetchActivity(); }, 400);
});

/* ---------- Epoch ---------- */

let epochInterval = null;
let epochTickInterval = null;
let epochData = null;

const EPOCH_SLOTS = 432000;

function epochSvg() {
  return '<svg class="epoch-icon" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="var(--accent)" stroke-width="2"/><path d="M16 6v10l7 4" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="16" r="3" fill="var(--accent)"/></svg>';
}

async function fetchEpoch() {
  try {
    const res = await fetch('/api/epoch');
    if (!res.ok) return;
    const data = await res.json();
    data.fetchedAt = Date.now();
    epochData = data;
    renderEpoch();
  } catch {
    if (!epochData) {
      $('#epochBar').innerHTML = '<div class="epoch-error">Could not load epoch info</div>';
    }
  }
}

function renderEpoch() {
  if (!epochData) return;
  const now = Date.now();
  const elapsed = (now - epochData.fetchedAt) / 1000;
  const remaining = Math.max(0, epochData.remainingSeconds - elapsed);
  const progress = ((EPOCH_SLOTS - remaining) / EPOCH_SLOTS) * 100;

  const fmt = epochCountdown(remaining);

  $('#epochBar').innerHTML = `
    <div class="epoch-card">
      <div class="epoch-badge">
        ${epochSvg()}
        <span class="epoch-number">Epoch ${epochData.epochNo}</span>
      </div>
      <div class="epoch-bar-wrap">
        <div class="epoch-bar-track">
          <div class="epoch-bar-fill" style="width:${Math.min(progress, 100)}%"></div>
        </div>
        <span class="epoch-pct">${progress.toFixed(1)}%</span>
      </div>
      <span class="epoch-countdown">${fmt}</span>
    </div>
  `;
}

function epochCountdown(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return d + 'd ' + h + 'h ' + m + 'm ' + s + 's';
  if (h > 0) return h + 'h ' + m + 'm ' + s + 's';
  if (m > 0) return m + 'm ' + s + 's';
  return s + 's';
}

function startEpochTicker() {
  fetchEpoch();
  epochInterval = setInterval(fetchEpoch, 60000);
  epochTickInterval = setInterval(renderEpoch, 1000);
}

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
  startEpochTicker();
});

$('#connectBtn')?.addEventListener('click', openWalletModal);
$('#themeBtn')?.addEventListener('click', toggleTheme);
