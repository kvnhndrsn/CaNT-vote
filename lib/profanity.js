const WORDS = [
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers',
  'shit', 'shitting', 'shitted', 'shite',
  'asshole', 'assholes', 'bastard', 'bastards',
  'bitch', 'bitches', 'bitching',
  'cocksucker', 'cocksuckers',
  'dickhead', 'dickheads',
  'piss', 'pissing', 'pissed',
  'cunt', 'cunts',
  'whore', 'whores',
  'slut', 'sluts',
  'nigger', 'nigga',
  'faggot', 'faggots',
  'retard', 'retarded',
  'motherfucker', 'motherfuckers', 'motherfucking',
  'twat', 'twats',
  'wank', 'wanker', 'wankers',
  'damn', 'damnit',
  'goddamn', 'goddamnit',
  'bullshit',
  'jackass', 'jackasses',
  'douche', 'douchebag', 'douchebags',
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  for (const word of WORDS) {
    const escaped = escapeRegex(word);
    const re = new RegExp('\\b' + escaped + '\\b', 'i');
    if (re.test(lower)) return true;
  }
  return false;
}
