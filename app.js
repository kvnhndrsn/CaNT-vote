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

/* ---------- Proposals ---------- */

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
      '<div class="empty-state"><strong>Could not load proposals</strong><p>' + escHtml(e.message) + '</p></div>';
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
    if (total <= 0n) return '';
    const yesPct = pctNum(summary.Yes || '0', total.toString());
    const noPct = pctNum(summary.No || '0', total.toString());
    const absPct = pctNum(summary.Abstain || '0', total.toString());
    return `
      <div class="mini-tally-bar"><div class="mini-tally-seg mini-tally-yes" style="flex:${yesPct}"></div><div class="mini-tally-seg mini-tally-no" style="flex:${noPct}"></div><div class="mini-tally-seg mini-tally-abs" style="flex:${absPct}"></div></div>
      <div class="mini-tally-pcts"><span class="mini-tally-yes-t">${pctStr(summary.Yes || '0', total.toString())}</span><span class="mini-tally-no-t">${pctStr(summary.No || '0', total.toString())}</span></div>`;
  }

  const withVotes = proposals.filter(p => p.totalVoteWeight && BigInt(p.totalVoteWeight) > 0n);

  // 1) Most votes (highest totalVoteWeight)
  let mostVotesCard = '';
  if (withVotes.length > 0) {
    const best = withVotes.reduce((a, b) => BigInt(a.totalVoteWeight) > BigInt(b.totalVoteWeight) ? a : b);
    mostVotesCard = `
      <div class="mini-card">
        <span class="mini-label">Most Votes</span>
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
    <div class="filter-row">
      <label>Token:</label>
      <select id="tokenSelect">
        <option value="">All Tokens (${state.proposals.length})</option>
        ${list.map(t => `
          <option value="${escHtml(t.id)}" ${state.filterToken === t.id ? 'selected' : ''}>
            ${escHtml(t.label)}
          </option>
        `).join('')}
      </select>
    </div>
  `;
  $('#tokenSelect').addEventListener('change', (e) => {
    state.filterToken = e.target.value;
    renderProposals();
  });
}

function pieSvg(summary, total) {
  if (!total || total === '0') return '';
  const t = Number(total);
  const colors = ['#22c55e', '#ef4444', '#a1a1aa'];
  const r = 10, cx = 12, cy = 12;
  const allChoices = ['Yes', 'No', 'Abstain'];
  let accum = 0;
  let paths = '';
  allChoices.forEach((choice, i) => {
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
    paths += `<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${colors[i]}"/>`;
  });
  if (accum < 1) paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-dasharray="2 2"/>`;
  return `<svg width="40" height="40" viewBox="0 0 24 24" style="flex-shrink:0"><circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--surface2)"/>${paths}</svg>`;
}

function renderProposals() {
  const list = $('#proposalList');
  const count = $('#proposalCount');
  const filtered = state.filterToken
    ? state.proposals.filter(p => {
        if (state.filterToken === 'ADA') return !p.target_policy_id;
        return (p.target_fingerprint && p.target_fingerprint === state.filterToken) || p.target_policy_id === state.filterToken;
      })
    : state.proposals;
  count.textContent = filtered.length;

  if (filtered.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><strong>No proposals</strong><p>' +
      (state.filterToken ? 'No proposals for this token yet.' : 'Be the first to create one!') +
      '</p></div>';
    return;
  }

  list.innerHTML = filtered.map(p => {
    const isADA = !p.target_policy_id;
    const assetLabel = isADA ? 'ADA' : (p.tokenName || (p.target_fingerprint
      ? shorten(p.target_fingerprint, 5)
      : (p.target_asset_name
        ? shorten(p.target_policy_id, 6) + '.' + p.target_asset_name
        : shorten(p.target_policy_id, 6))));

    const summary = p.voteSummary || {};
    const total = BigInt(p.totalVoteWeight || '0');
    const choices = Object.entries(summary);
    const isCreator = state.address && p.creator_address === state.address;

    function supplyPct(totalStr, supplyStr) {
      const t = Number(totalStr), s = Number(supplyStr);
      if (!s || s <= 0) return '';
      const pct = (t / s) * 100;
      if (pct >= 1) return pct.toFixed(2) + '%';
      if (pct >= 0.01) return pct.toFixed(4) + '%';
      return pct.toFixed(6) + '%';
    }

    let tallyHtml = '';
    if (choices.length > 0) {
      const totalS = p.totalSupply ? BigInt(p.totalSupply) : null;
      const circS = p.circulatingSupply ? BigInt(p.circulatingSupply) : null;
      const totalPct = totalS ? supplyPct(total.toString(), totalS.toString()) : null;
      const circPct = circS && circS !== totalS ? supplyPct(total.toString(), circS.toString()) : null;
      const unit = isADA ? 'lovelace' : p.tokenName || (p.target_asset_name || '');
      const pctParts = [];
      if (totalPct) pctParts.push(totalPct + ' of total');
      if (circPct) pctParts.push(circPct + ' of circ');
      const pctStr2 = pctParts.length > 0 ? ' · ' + pctParts.join(' · ') : '';

      const barColors = { Yes: '#22c55e', No: '#ef4444', Abstain: '#52525b' };
      const yesPct = pctNum(summary.Yes || '0', total.toString());
      const noPct = pctNum(summary.No || '0', total.toString());
      const absPct = pctNum(summary.Abstain || '0', total.toString());
      const bar = `
        <div class="tally-bar">
          <div class="tally-bar-seg" style="flex:${yesPct};background:#22c55e" title="Yes ${yesPct.toFixed(1)}%"></div>
          <div class="tally-bar-seg" style="flex:${noPct};background:#ef4444" title="No ${noPct.toFixed(1)}%"></div>
          <div class="tally-bar-seg" style="flex:${absPct};background:#52525b" title="Abstain ${absPct.toFixed(1)}%"></div>
        </div>`;

      const lines = [];
      for (const c of ['Yes', 'No', 'Abstain']) {
        const w = summary[c] || '0';
        lines.push(`<span class="tally-line"><span class="tally-dot" style="background:${barColors[c]}"></span><strong>${pctStr(w, total.toString())}</strong> ${escHtml(c)} <span class="tally-w">${formatWeight(w)}</span></span>`);
      }

      tallyHtml = `
        <div class="card-tally">
          ${bar}
          <div class="tally-lines">${lines.join('')}</div>
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

    return `
      <div class="proposal-card" data-id="${p.id}">
        <div class="card-header">
          ${imgHtml}
          <div class="card-body">
            <div class="card-title-row">
              <h3>${escHtml(p.title)}</h3>
              <div class="card-actions">
                <button class="btn btn-primary vote-btn">Vote</button>
                <button class="btn audit-btn">Audit</button>
                ${deleteBtn}
              </div>
            </div>
            <div class="meta">
              <span>${escHtml(assetLabel)}</span>
              <span class="expiry" data-expires="${p.expiresAt}">--</span>
              <span>by ${escHtml(shorten(p.creator_address, 6))}</span>
            </div>
            <div class="desc">${escHtml(p.description)}</div>
            <div class="extra" style="display:none">
              <div class="meta" style="margin-top:0.3rem">
                <span>Created ${new Date(p.created_at).toLocaleString()}</span>
                <span>${escHtml(shorten(p.creator_address, 20))}</span>
              </div>
            </div>
            ${tallyHtml}
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
      if (!confirm('Delete this proposal?')) return;
      try {
        const res = await fetch('/api/proposals', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, creatorAddress: state.address }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast('Proposal deleted', 'success');
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
    'shit', 'shitting', 'shite',
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
    if (!res.ok) throw new Error('Proposal not found');
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

    const optionsDiv = $('#voteOptions');
    const tally = proposal.tally || {};
    const tallyTotal = BigInt(proposal.totalWeight || 0);

    const myChoice = proposal.myVote?.vote_choice;

    function choiceSupplyPct(w, s) {
      if (!s || s <= 0n) return '';
      const pct = Number(BigInt(w)) / Number(s) * 100;
      if (pct >= 1) return pct.toFixed(2) + '%';
      if (pct >= 0.01) return pct.toFixed(4) + '%';
      return pct.toFixed(6) + '%';
    }

    optionsDiv.innerHTML = ['Yes', 'No', 'Abstain'].map(c => {
      const isMyVote = c === myChoice;
      const weight = tally[c];
      const w = weight ? BigInt(weight) : null;
      const pct = w && tallyTotal > 0n ? pctNum(weight, proposal.totalWeight) : 0;
      const totalPctStr = w && totalS ? choiceSupplyPct(weight, totalS) : null;
      const circPctStr = w && circS && circS !== totalS ? choiceSupplyPct(weight, circS) : null;
      const supplyParts = [];
      if (totalPctStr) supplyParts.push(totalPctStr + ' of total');
      if (circPctStr) supplyParts.push(circPctStr + ' of circ');
      const supplyStr = supplyParts.length > 0 ? ' (' + supplyParts.join(' · ') + ')' : '';
      const label = weight
        ? `${escHtml(c)}: ${formatWeight(weight)} ${escHtml(unitLabel)} (${pct.toFixed(1)}%)${supplyStr}`
        : escHtml(c);
      return `
        <label class="vote-option${isMyVote ? ' selected' : ''}" data-choice="${escHtml(c)}">
          <input type="radio" name="voteChoice" value="${escHtml(c)}"${isMyVote ? ' checked' : ''}>
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
        addresses: state.addresses,
        stakeAddresses: state.stakeAddresses,
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
    if (!voteRes.ok) {
      console.log('[vote] full error response:', data);
      throw new Error(data.error + (data.debug ? ' (see console for debug info)' : ''));
    }

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
        targetPolicyId: policy,
        targetAssetName: asset,
        creatorAddress: state.address,
        addresses: state.addresses,
        stakeAddresses: state.stakeAddresses,
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
    $('#propCustomGroup').style.display = 'none';
    $('#propAssetGroup').style.display = 'none';
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

document.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG') e.target.style.display = 'none';
}, true);

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateWalletUI();
  fetchProposals();
  startTicker();
});

$('#connectBtn')?.addEventListener('click', openWalletModal);
$('#themeBtn')?.addEventListener('click', toggleTheme);
