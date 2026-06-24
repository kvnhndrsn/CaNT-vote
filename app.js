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
    $('#mainView').style.display = view === 'proposals' ? '' : 'none';
    $('#portfolioView').style.display = view === 'portfolio' ? '' : 'none';
    $('#surfView').style.display = view === 'surf' ? '' : 'none';
    if (view === 'portfolio') {
      if (!state.api) {
        $('#portfolioContent').innerHTML = '<div class="empty-state"><p>Connect your wallet to view portfolio.</p></div>';
      } else {
        fetchPortfolio();
      }
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
  });
});

/* ---------- Surf Lending Dashboard ---------- */

const SURF_COLORS = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

let surfData = null;
let surfFilterAddr = '';
let surfFilterPool = '';
let surfFilterStatus = '';
let surfSortBy = 'ltv-desc';
let surfRefreshInterval = null;
let surfTickInterval = null;
let surfLastUpdated = null;

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
        <span class="surf-stat-value">${fmtADA(toADA(summary.surfPrice))}</span>
        <span class="surf-stat-usd">${fmtUSD(summary.surfPrice)}</span>
      </div>
      <div class="surf-stat">
        <span class="surf-stat-label">ADA Price</span>
        <span class="surf-stat-value">${fmtUSD(summary.adaPrice)}</span>
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
    'ltv-desc': (a, b) => (b.ltv || 0) - (a.ltv || 0),
    'ltv-asc': (a, b) => (a.ltv || 0) - (b.ltv || 0),
    'value-desc': (a, b) => (b.netValueUSD || 0) - (a.netValueUSD || 0),
    'value-asc': (a, b) => (a.netValueUSD || 0) - (b.netValueUSD || 0),
    'owed-desc': (a, b) => (b.totalOwedUSD || 0) - (a.totalOwedUSD || 0),
    'collateral-desc': (a, b) => (b.collateralValueUSD || 0) - (a.collateralValueUSD || 0),
    'duration-desc': (a, b) => (b.elapsedYears || 0) - (a.elapsedYears || 0),
    'duration-asc': (a, b) => (a.elapsedYears || 0) - (b.elapsedYears || 0),
    'apr-desc': (a, b) => (b.interestRate || 0) - (a.interestRate || 0),
    'health': (a, b) => {
      const hA = a.ltv >= 0.75 ? 2 : a.ltv >= 0.5 ? 1 : 0;
      const hB = b.ltv >= 0.75 ? 2 : b.ltv >= 0.5 ? 1 : 0;
      return hB - hA;
    },
  };

  if (sortFns[surfSortBy]) {
    filtered.sort(sortFns[surfSortBy]);
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No positions match your filters.</p></div>';
    return;
  }

  const fmtADA = (v, d) => (v / Math.pow(10, d || 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  const fmtUSD = (v) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (v) => (v * 100).toFixed(2) + '%';
  const fmtDate = (ts) => {
    if (!ts) return 'Unknown';
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };
  const fmtTime = (years) => {
    if (years < 0.00274) return Math.floor(years * 8766) + 'h';
    if (years < 0.0833) return Math.floor(years * 30.44) + 'd';
    if (years < 1) return Math.floor(years * 12) + 'mo';
    return years.toFixed(1) + 'y';
  };

  function healthClass(ltv) {
    if (ltv >= 0.75) return 'surf-health-danger';
    if (ltv >= 0.5) return 'surf-health-warning';
    return 'surf-health-ok';
  }

  function healthLabel(ltv) {
    if (ltv >= 0.75) return 'Liquidatable';
    if (ltv >= 0.5) return 'At Risk';
    return 'Healthy';
  }

  function poolDisplayName(pool) {
    if (!pool) return '';
    const borrowed = pool.asset.ticker;
    const collaterals = pool.collateralAssets.map(c => c.ticker).filter(Boolean);
    if (collaterals.length === 0) return borrowed;
    if (collaterals.length === 1) return borrowed + '/' + collaterals[0];
    return borrowed + '/' + collaterals.slice(0, 2).join('+') + (collaterals.length > 2 ? '...' : '');
  }

  function ltvBarColor(pct) {
    if (pct >= 0.75) return '#ef4444';
    if (pct >= 0.5) return '#f59e0b';
    return '#22c55e';
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
  html += `<span class="surf-mini-stat">Ratio: <strong>${(totalCollateralUSD / (totalBorrowUSD || 1)).toFixed(2)}x</strong></span>`;
  html += `</span>`;
  html += `</div>`;

  html += '<div class="surf-position-list">';

  for (const p of filtered) {
    const pool = pools ? pools.find(po => po.poolId === p.poolId) : null;
    const pName = poolDisplayName(pool);
    const health = healthClass(p.ltv);
    const hLabel = healthLabel(p.ltv);
    const liqThreshold = pool?.liquidationThresholdLTV || 0.8;
    const barPct = Math.min((p.ltv / liqThreshold) * 100, 100);
    const barColor = ltvBarColor(p.ltv);

    html += `
      <div class="surf-position-card ${health}">
        <div class="surf-pos-header">
          <div class="surf-pos-pool">
            <span class="surf-pos-pool-name">${escHtml(pName)}</span>
            <span class="surf-pos-address">${escHtml(shorten(p.address, 8))}</span>
          </div>
          <div class="surf-pos-health">
            <span class="surf-health-badge ${health}">${escHtml(hLabel)}</span>
            <span class="surf-ltv">LTV: ${fmtPct(p.ltv)}</span>
          </div>
        </div>
        <div class="surf-ltv-bar-wrap">
          <div class="surf-ltv-bar-bg">
            <div class="surf-ltv-bar-fill" style="width:${barPct}%;background:${barColor}"></div>
          </div>
          <span class="surf-ltv-bar-label">${barPct.toFixed(0)}% toward liquidation (threshold: ${fmtPct(liqThreshold)})</span>
        </div>
        <div class="surf-pos-body">
          <div class="surf-pos-detail">
            <span class="surf-detail-label">Collateral</span>
            <span class="surf-detail-value">${fmtADA(p.collateral, p.collateralDecimals)} ${escHtml(p.collateralTicker)}</span>
            <span class="surf-detail-usd">${fmtUSD(p.collateralValueUSD)}</span>
          </div>
          <div class="surf-pos-detail">
            <span class="surf-detail-label">Borrow</span>
            <span class="surf-detail-value">${fmtADA(p.totalOwed, p.principalDecimals)} ${escHtml(p.principalTicker)}</span>
            <span class="surf-detail-usd">${fmtUSD(p.totalOwedUSD)}</span>
          </div>
          <div class="surf-pos-detail">
            <span class="surf-detail-label">Net Value</span>
            <span class="surf-detail-value ${p.netValueUSD < 0 ? 'surf-neg' : 'surf-pos'}">${fmtUSD(p.netValueUSD)}</span>
          </div>
          <div class="surf-pos-detail">
            <span class="surf-detail-label">APR</span>
            <span class="surf-detail-value">${fmtPct(p.interestRate)}</span>
          </div>
          <div class="surf-pos-detail">
            <span class="surf-detail-label">Duration</span>
            <span class="surf-detail-value">${fmtTime(p.elapsedYears)}</span>
          </div>
          <div class="surf-pos-detail">
            <span class="surf-detail-label">Interest Accrued</span>
            <span class="surf-detail-value">${fmtADA(p.accruedInterest, p.principalDecimals)} ${escHtml(p.principalTicker)}</span>
          </div>
        </div>
        <div class="surf-pos-footer">
          <span class="surf-footer-meta">Opened: ${fmtDate(p.startTime)}</span>
          <span class="surf-footer-meta">ID: ${escHtml(shorten(p.borrowId?.txHash || p.outRef?.txHash || '', 10))}</span>
        </div>
      </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
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

$('#surfSortBy')?.addEventListener('change', (e) => {
  surfSortBy = e.target.value;
  if (surfData) renderSurfPositions(surfData.positions, surfData.pools, surfData.summary);
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
