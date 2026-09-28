/**
 * SpeechComparison.js
 * ============================================================
 * Compares an original dialogue with the user's spoken text.
 *
 * Features:
 *  - English + Telugu support
 *  - Word-by-word comparison
 *  - Correct / wrong / missing / extra words
 *  - LCS-based alignment
 *  - Match percentage
 *  - Accuracy
 *  - Perfect-match detection
 *  - Similarity scoring
 */

export class SpeechComparison {
  // ==========================================================
  // MAIN COMPARISON
  // ==========================================================

  /**
   * Compare original dialogue with spoken dialogue.
   *
   * @param {string} original
   * @param {string} spoken
   *
   * @returns {{
   *   accuracy: number,
   *   matchPercentage: number,
   *   isPerfect: boolean,
   *   wordResults: Array,
   *   wordComparison: Array,
   *   details: Object
   * }}
   */
  static compare(original, spoken) {
    const originalText =
      typeof original === "string"
        ? original
        : "";

    const spokenText =
      typeof spoken === "string"
        ? spoken
        : "";

    const originalWords =
      this.tokenize(originalText);

    const spokenWords =
      this.tokenize(spokenText);

    // ========================================================
    // EMPTY ORIGINAL
    // ========================================================

    if (originalWords.length === 0) {
      const extraWords =
        spokenWords.map((word) => ({
          word,
          status: "extra",
          matched: false
        }));

      return {
        accuracy:
          spokenWords.length === 0
            ? 100
            : 0,

        matchPercentage:
          spokenWords.length === 0
            ? 100
            : 0,

        isPerfect:
          spokenWords.length === 0,

        wordResults: extraWords,

        wordComparison: extraWords,

        details: {
          correct: 0,
          wrong: 0,
          missing: 0,
          extra: spokenWords.length,
          total: 0,
          originalWordCount: 0,
          spokenWordCount:
            spokenWords.length
        }
      };
    }

    // ========================================================
    // EMPTY SPOKEN TEXT
    // ========================================================

    if (spokenWords.length === 0) {
      const missingWords =
        originalWords.map((word) => ({
          word,
          status: "missing",
          matched: false
        }));

      return {
        accuracy: 0,
        matchPercentage: 0,
        isPerfect: false,

        wordResults: missingWords,

        wordComparison: missingWords,

        details: {
          correct: 0,
          wrong: 0,
          missing: originalWords.length,
          extra: 0,
          total: originalWords.length,
          originalWordCount:
            originalWords.length,
          spokenWordCount: 0
        }
      };
    }

    // ========================================================
    // EXACT MATCH
    // ========================================================

    if (
      this.tokensEqual(
        originalWords,
        spokenWords
      )
    ) {
      const results =
        originalWords.map((word) => ({
          word,
          status: "correct",
          matched: true
        }));

      return {
        accuracy: 100,
        matchPercentage: 100,
        isPerfect: true,

        wordResults: results,

        wordComparison: results,

        details: {
          correct: originalWords.length,
          wrong: 0,
          missing: 0,
          extra: 0,
          total: originalWords.length,
          originalWordCount:
            originalWords.length,
          spokenWordCount:
            spokenWords.length
        }
      };
    }

    // ========================================================
    // LCS ALIGNMENT
    // ========================================================

    const lcs =
      this.computeLCS(
        originalWords,
        spokenWords
      );

    const alignment =
      this.buildAlignment(
        originalWords,
        spokenWords,
        lcs
      );

    // ========================================================
    // ANALYZE ALIGNMENT
    // ========================================================

    let correct = 0;
    let wrong = 0;
    let missing = 0;
    let extra = 0;

    const wordComparison = [];

    for (const item of alignment) {
      // ------------------------------------------------------
      // CORRECT WORD
      // ------------------------------------------------------

      if (item.type === "match") {
        const word =
          originalWords[item.origIdx];

        wordComparison.push({
          word,
          status: "correct",
          matched: true,
          spoken:
            spokenWords[item.spokenIdx]
        });

        correct++;
      }

      // ------------------------------------------------------
      // WRONG WORD
      // ------------------------------------------------------

      else if (
        item.type === "substitution"
      ) {
        const originalWord =
          originalWords[item.origIdx];

        const spokenWord =
          spokenWords[item.spokenIdx];

        wordComparison.push({
          word: originalWord,
          status: "wrong",
          matched: false,
          spoken: spokenWord
        });

        wrong++;
      }

      // ------------------------------------------------------
      // MISSING WORD
      // ------------------------------------------------------

      else if (
        item.type === "deletion"
      ) {
        const word =
          originalWords[item.origIdx];

        wordComparison.push({
          word,
          status: "missing",
          matched: false
        });

        missing++;
      }

      // ------------------------------------------------------
      // EXTRA WORD
      // ------------------------------------------------------

      else if (
        item.type === "insertion"
      ) {
        const word =
          spokenWords[item.spokenIdx];

        wordComparison.push({
          word,
          status: "extra",
          matched: false
        });

        extra++;
      }
    }

    // ========================================================
    // SCORE
    // ========================================================

    const total =
      originalWords.length;

    /*
     * Scoring:
     *
     * Correct word     = 1.0
     * Wrong word       = 0.3
     * Missing word     = 0
     * Extra word       = -0.1
     *
     * This gives partial credit for a
     * similar-but-wrong spoken word.
     */

    const rawScore =
      correct +
      wrong * 0.3;

    const extraPenalty =
      extra * 0.1;

    const score =
      Math.max(
        0,
        rawScore - extraPenalty
      );

    const matchPercentage =
      Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (score / total) * 100
          )
        )
      );

    // ========================================================
    // BASIC WORD ACCURACY
    // ========================================================

    const accuracy =
      Math.round(
        (correct / total) * 100
      );

    // ========================================================
    // PERFECT MATCH
    // ========================================================

    const isPerfect =
      correct === total &&
      wrong === 0 &&
      missing === 0 &&
      extra === 0;

    // ========================================================
    // WORD RESULTS
    // ========================================================

    const wordResults =
      wordComparison
        .filter(
          (item) =>
            item.status !== "extra"
        )
        .map((item) => ({
          word: item.word,
          matched:
            item.status === "correct",
          status: item.status,
          spoken: item.spoken
        }));

    // ========================================================
    // RETURN RESULT
    // ========================================================

    return {
      accuracy,
      matchPercentage,
      isPerfect,

      wordResults,
      wordComparison,

      details: {
        correct,
        wrong,
        missing,
        extra,
        total,

        originalWordCount:
          originalWords.length,

        spokenWordCount:
          spokenWords.length,

        score
      }
    };
  }

  // ==========================================================
  // TOKENIZE TEXT
  // ==========================================================

  /**
   * Converts text into normalized words.
   *
   * Supports:
   *  - English
   *  - Telugu
   *  - Unicode letters/numbers
   */

  static tokenize(text) {
    if (
      !text ||
      typeof text !== "string"
    ) {
      return [];
    }

    return text
      .toLowerCase()

      // Remove punctuation while keeping
      // Unicode letters, numbers and spaces.
      .replace(
        /[^\p{L}\p{N}\s]/gu,
        ""
      )

      // Normalize multiple spaces
      .replace(/\s+/g, " ")

      .trim()

      .split(" ")

      .filter(
        (word) => word.length > 0
      );
  }

  // ==========================================================
  // CLEAN TEXT
  // ==========================================================

  /**
   * Backward-compatible helper.
   */

  static cleanText(text) {
    return this.tokenize(text).join(" ");
  }

  // ==========================================================
  // TOKEN ARRAYS EQUAL
  // ==========================================================

  static tokensEqual(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    for (
      let i = 0;
      i < a.length;
      i++
    ) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  // ==========================================================
  // COMPUTE LCS
  // ==========================================================

  /**
   * Longest Common Subsequence.
   *
   * Returns the DP table used for alignment.
   */

  static computeLCS(a, b) {
    const m = a.length;
    const n = b.length;

    const dp =
      Array.from(
        { length: m + 1 },
        () =>
          new Array(n + 1).fill(0)
      );

    for (
      let i = 1;
      i <= m;
      i++
    ) {
      for (
        let j = 1;
        j <= n;
        j++
      ) {
        if (
          a[i - 1] ===
          b[j - 1]
        ) {
          dp[i][j] =
            dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] =
            Math.max(
              dp[i - 1][j],
              dp[i][j - 1]
            );
        }
      }
    }

    return dp;
  }

  // ==========================================================
  // BUILD ALIGNMENT
  // ==========================================================

  /**
   * Builds:
   *
   * match
   * substitution
   * deletion
   * insertion
   */

  static buildAlignment(
    originalWords,
    spokenWords,
    dp
  ) {
    const alignment = [];

    let i =
      originalWords.length;

    let j =
      spokenWords.length;

    // ========================================================
    // FIND LCS MATCHES
    // ========================================================

    const lcsItems = [];

    while (
      i > 0 &&
      j > 0
    ) {
      if (
        originalWords[i - 1] ===
        spokenWords[j - 1]
      ) {
        lcsItems.unshift({
          origIdx: i - 1,
          spokenIdx: j - 1
        });

        i--;
        j--;
      } else if (
        dp[i - 1][j] >=
        dp[i][j - 1]
      ) {
        i--;
      } else {
        j--;
      }
    }

    // ========================================================
    // BUILD ALIGNMENT AROUND MATCHES
    // ========================================================

    let lastOrig = 0;
    let lastSpoken = 0;

    for (
      const item of lcsItems
    ) {
      const origGap =
        item.origIdx -
        lastOrig;

      const spokenGap =
        item.spokenIdx -
        lastSpoken;

      const minGap =
        Math.min(
          origGap,
          spokenGap
        );

      // ------------------------------------------------------
      // SUBSTITUTIONS
      // ------------------------------------------------------

      for (
        let k = 0;
        k < minGap;
        k++
      ) {
        alignment.push({
          type: "substitution",
          origIdx:
            lastOrig + k,
          spokenIdx:
            lastSpoken + k
        });
      }

      // ------------------------------------------------------
      // MISSING WORDS
      // ------------------------------------------------------

      for (
        let k = minGap;
        k < origGap;
        k++
      ) {
        alignment.push({
          type: "deletion",
          origIdx:
            lastOrig + k
        });
      }

      // ------------------------------------------------------
      // EXTRA WORDS
      // ------------------------------------------------------

      for (
        let k = minGap;
        k < spokenGap;
        k++
      ) {
        alignment.push({
          type: "insertion",
          spokenIdx:
            lastSpoken + k
        });
      }

      // ------------------------------------------------------
      // MATCH
      // ------------------------------------------------------

      alignment.push({
        type: "match",
        origIdx:
          item.origIdx,
        spokenIdx:
          item.spokenIdx
      });

      lastOrig =
        item.origIdx + 1;

      lastSpoken =
        item.spokenIdx + 1;
    }

    // ========================================================
    // HANDLE REMAINING TAIL
    // ========================================================

    const remainingOrig =
      originalWords.length -
      lastOrig;

    const remainingSpoken =
      spokenWords.length -
      lastSpoken;

    const minTail =
      Math.min(
        remainingOrig,
        remainingSpoken
      );

    // --------------------------------------------------------
    // SUBSTITUTIONS
    // --------------------------------------------------------

    for (
      let k = 0;
      k < minTail;
      k++
    ) {
      alignment.push({
        type: "substitution",
        origIdx:
          lastOrig + k,
        spokenIdx:
          lastSpoken + k
      });
    }

    // --------------------------------------------------------
    // MISSING
    // --------------------------------------------------------

    for (
      let k = minTail;
      k < remainingOrig;
      k++
    ) {
      alignment.push({
        type: "deletion",
        origIdx:
          lastOrig + k
      });
    }

    // --------------------------------------------------------
    // EXTRA
    // --------------------------------------------------------

    for (
      let k = minTail;
      k < remainingSpoken;
      k++
    ) {
      alignment.push({
        type: "insertion",
        spokenIdx:
          lastSpoken + k
      });
    }

    return alignment;
  }

  // ==========================================================
  // SIMPLE MATCH CHECK
  // ==========================================================

  /**
   * Returns true if both texts contain
   * exactly the same normalized words.
   */

  static isExactMatch(
    original,
    spoken
  ) {
    const originalWords =
      this.tokenize(original);

    const spokenWords =
      this.tokenize(spoken);

    return this.tokensEqual(
      originalWords,
      spokenWords
    );
  }

  // ==========================================================
  // GET SCORE ONLY
  // ==========================================================

  static getScore(
    original,
    spoken
  ) {
    return this.compare(
      original,
      spoken
    ).matchPercentage;
  }

  // ==========================================================
  // GET ACCURACY ONLY
  // ==========================================================

  static getAccuracy(
    original,
    spoken
  ) {
    return this.compare(
      original,
      spoken
    ).accuracy;
  }
}
