export class SpeechComparison {
  /**
   * Compare spoken text with original text.
   * Returns { matchPercentage, wordComparison, details }
   */
  static compare(original, spoken) {
    if (!original || !spoken) {
      const origWords = SpeechComparison.tokenize(original || '');
      return {
        matchPercentage: 0,
        wordComparison: origWords.map(w => ({ word: w, status: 'missing' })),
        details: { correct: 0, wrong: 0, missing: origWords.length, extra: 0, total: origWords.length }
      };
    }

    const origWords = SpeechComparison.tokenize(original);
    const spokenWords = SpeechComparison.tokenize(spoken);

    if (origWords.length === 0) {
      return {
        matchPercentage: spokenWords.length === 0 ? 100 : 0,
        wordComparison: spokenWords.map(w => ({ word: w, status: 'extra' })),
        details: { correct: 0, wrong: 0, missing: 0, extra: spokenWords.length, total: 0 }
      };
    }

    // Use Longest Common Subsequence approach for alignment
    const lcs = SpeechComparison.computeLCS(origWords, spokenWords);
    const alignment = SpeechComparison.buildAlignment(origWords, spokenWords, lcs);
    
    let correct = 0;
    let wrong = 0;
    let missing = 0;
    let extra = 0;
    const wordComparison = [];

    // Walk through alignment
    let oi = 0, si = 0;
    for (const item of alignment) {
      if (item.type === 'match') {
        wordComparison.push({ word: origWords[item.origIdx], status: 'correct' });
        correct++;
        oi++;
        si++;
      } else if (item.type === 'substitution') {
        wordComparison.push({ word: origWords[item.origIdx], status: 'wrong', spoken: spokenWords[item.spokenIdx] });
        wrong++;
        oi++;
        si++;
      } else if (item.type === 'deletion') {
        wordComparison.push({ word: origWords[item.origIdx], status: 'missing' });
        missing++;
        oi++;
      } else if (item.type === 'insertion') {
        wordComparison.push({ word: spokenWords[item.spokenIdx], status: 'extra' });
        extra++;
        si++;
      }
    }

    const total = origWords.length;
    // Score: correct words get full credit; wrong words get partial; missing/extra get nothing
    const rawScore = correct + (wrong * 0.3);
    const penalty = extra * 0.1;
    const score = Math.max(0, rawScore - penalty);
    const matchPercentage = Math.min(100, Math.round((score / total) * 100));

    return {
      matchPercentage,
      wordComparison,
      details: { correct, wrong, missing, extra, total }
    };
  }

  static tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u0C00-\u0C7F]/g, '') // Keep Telugu characters
      .split(/\s+/)
      .filter(w => w.length > 0);
  }

  static computeLCS(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp;
  }

  static buildAlignment(origWords, spokenWords, dp) {
    const alignment = [];
    let i = origWords.length;
    let j = spokenWords.length;

    // Backtrack through LCS to find matches
    const lcsItems = [];
    while (i > 0 && j > 0) {
      if (origWords[i - 1] === spokenWords[j - 1]) {
        lcsItems.unshift({ origIdx: i - 1, spokenIdx: j - 1 });
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    // Build alignment from LCS matches
    let lastOrig = 0;
    let lastSpoken = 0;

    for (const item of lcsItems) {
      // Handle gaps before this match
      const origGap = item.origIdx - lastOrig;
      const spokenGap = item.spokenIdx - lastSpoken;
      const minGap = Math.min(origGap, spokenGap);

      // Pair up as substitutions
      for (let k = 0; k < minGap; k++) {
        alignment.push({
          type: 'substitution',
          origIdx: lastOrig + k,
          spokenIdx: lastSpoken + k
        });
      }

      // Remaining gaps
      for (let k = minGap; k < origGap; k++) {
        alignment.push({ type: 'deletion', origIdx: lastOrig + k });
      }
      for (let k = minGap; k < spokenGap; k++) {
        alignment.push({ type: 'insertion', spokenIdx: lastSpoken + k });
      }

      // The match itself
      alignment.push({ type: 'match', origIdx: item.origIdx, spokenIdx: item.spokenIdx });
      lastOrig = item.origIdx + 1;
      lastSpoken = item.spokenIdx + 1;
    }

    // Handle tail
    const tailOrigGap = origWords.length - lastOrig;
    const tailSpokenGap = spokenWords.length - lastSpoken;
    const tailMin = Math.min(tailOrigGap, tailSpokenGap);

    for (let k = 0; k < tailMin; k++) {
      alignment.push({
        type: 'substitution',
        origIdx: lastOrig + k,
        spokenIdx: lastSpoken + k
      });
    }
    for (let k = tailMin; k < tailOrigGap; k++) {
      alignment.push({ type: 'deletion', origIdx: lastOrig + k });
    }
    for (let k = tailMin; k < tailSpokenGap; k++) {
      alignment.push({ type: 'insertion', spokenIdx: lastSpoken + k });
    }

    return alignment;
  }
}
