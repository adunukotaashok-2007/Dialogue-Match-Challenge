/**
 * UIManager.js
 * ============================================================
 * Handles:
 * - Screen transitions
 * - English / Telugu translations
 * - Avatar selection
 * - Lobby rendering
 * - Game HUD
 * - Timer
 * - Game phases
 * - Current player
 * - Waiting overlay
 * - Dialogue display
 * - Microphone / waveform UI
 * - Speech results
 * - Round results
 * - Leaderboards
 * - Final results
 * - Notifications
 *
 * Compatible with the newer AnimationManager,
 * AudioManager, SpeechRecognitionManager,
 * SpeechComparison, and TimerManager.
 */

import en from "../i18n/en.js";
import te from "../i18n/te.js";

export class UIManager {
  constructor() {
    // Supported screens
    this.screenIds = [
      "lobby",
      "room",
      "game",
      "round-results",
      "final-results"
    ];

    this.screens = {};
    this.currentScreen = null;

    // Languages
    this.translations = {
      en,
      te
    };

    this.currentLang = "en";

    // Avatar list
    this.avatars = [
      "🎤",
      "🎵",
      "🎶",
      "🎸",
      "🎹",
      "🥁",
      "🎺",
      "🎻",
      "🎼",
      "🎧",
      "🦊",
      "🐱",
      "🐶",
      "🐸",
      "🦁",
      "🐼",
      "🐨",
      "🐯",
      "🦄",
      "🐲"
    ];

    this.selectedAvatar = this.avatars[0];

    // Notification timeout tracking
    this.notificationTimers = new Set();
  }

  // ==========================================================
  // INITIALIZE
  // ==========================================================

  init() {
    this.cacheScreens();
    this.populateAvatars();
    this.applyTranslations();

    // Set initial screen if one exists
    if (!this.currentScreen) {
      const activeScreen =
        document.querySelector(
          ".screen.active"
        );

      if (activeScreen) {
        this.currentScreen =
          activeScreen.id.replace(
            "screen-",
            ""
          );
      }
    }
  }

  // ==========================================================
  // CACHE SCREENS
  // ==========================================================

  cacheScreens() {
    this.screens = {};

    this.screenIds.forEach(
      (id) => {
        const element =
          document.getElementById(
            `screen-${id}`
          );

        if (element) {
          this.screens[
            `screen-${id}`
          ] = element;
        }
      }
    );

    // Also cache any dynamically added .screen elements
    document
      .querySelectorAll(".screen")
      .forEach((element) => {
        this.screens[element.id] =
          element;
      });
  }

  // ==========================================================
  // SHOW SCREEN
  // ==========================================================

  showScreen(screenId) {
    if (!screenId) return;

    // Support:
    // "game"
    // "screen-game"
    const normalizedId =
      String(screenId).replace(
        /^screen-/,
        ""
      );

    // Cache screens if necessary
    if (
      Object.keys(this.screens)
        .length === 0
    ) {
      this.cacheScreens();
    }

    Object.values(this.screens).forEach(
      (screen) => {
        if (!screen) return;

        screen.classList.remove(
          "active"
        );

        screen.classList.add(
          "hidden"
        );
      }
    );

    const screen =
      this.screens[
        `screen-${normalizedId}`
      ] ||
      document.getElementById(
        `screen-${normalizedId}`
      );

    if (!screen) {
      console.warn(
        `UIManager: Screen "${normalizedId}" not found.`
      );
      return;
    }

    screen.classList.remove(
      "hidden"
    );

    screen.classList.add(
      "active"
    );

    this.currentScreen =
      normalizedId;
  }

  // ==========================================================
  // LANGUAGE
  // ==========================================================

  setLanguage(lang) {
    if (
      !this.translations[lang]
    ) {
      console.warn(
        `Unsupported language: ${lang}`
      );
      lang = "en";
    }

    this.currentLang = lang;

    this.applyTranslations();

    document
      .querySelectorAll(
        ".lang-btn"
      )
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.lang ===
            lang
        );
      });

    // Update speech-related language metadata
    document.documentElement.lang =
      lang === "te"
        ? "te"
        : "en";
  }

  // ==========================================================
  // APPLY TRANSLATIONS
  // ==========================================================

  applyTranslations() {
    const translation =
      this.translations[
        this.currentLang
      ] ||
      this.translations.en;

    document
      .querySelectorAll(
        "[data-i18n]"
      )
      .forEach((element) => {
        const key =
          element.dataset.i18n;

        if (
          Object.prototype.hasOwnProperty.call(
            translation,
            key
          )
        ) {
          element.textContent =
            translation[key];
        }
      });

    // Placeholder translations
    document
      .querySelectorAll(
        "[data-i18n-placeholder]"
      )
      .forEach((element) => {
        const key =
          element.dataset
            .i18nPlaceholder;

        if (
          Object.prototype.hasOwnProperty.call(
            translation,
            key
          )
        ) {
          element.placeholder =
            translation[key];
        }
      });

    // Title translations
    document
      .querySelectorAll(
        "[data-i18n-title]"
      )
      .forEach((element) => {
        const key =
          element.dataset.i18nTitle;

        if (
          Object.prototype.hasOwnProperty.call(
            translation,
            key
          )
        ) {
          element.title =
            translation[key];
        }
      });
  }

  // ==========================================================
  // TRANSLATION HELPER
  // ==========================================================

  t(key, replacements = {}) {
    const translation =
      this.translations[
        this.currentLang
      ] ||
      this.translations.en;

    let text =
      translation[key];

    if (
      text === undefined ||
      text === null
    ) {
      text =
        this.translations.en[key];

      if (
        text === undefined ||
        text === null
      ) {
        text = key;
      }
    }

    text = String(text);

    Object.entries(
      replacements
    ).forEach(
      ([replacementKey, value]) => {
        text = text.replace(
          new RegExp(
            `\\{${this.escapeRegExp(
              replacementKey
            )}\\}`,
            "g"
          ),
          String(value)
        );
      }
    );

    return text;
  }

  escapeRegExp(text) {
    return String(text).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
  }

  // ==========================================================
  // AVATARS
  // ==========================================================

  populateAvatars() {
    const grid =
      document.getElementById(
        "avatar-grid"
      );

    if (!grid) return;

    grid.innerHTML = "";

    this.avatars.forEach(
      (avatar, index) => {
        const option =
          document.createElement(
            "button"
          );

        option.type = "button";
        option.className =
          "avatar-option";

        if (
          avatar ===
          this.selectedAvatar
        ) {
          option.classList.add(
            "selected"
          );
        }

        option.textContent =
          avatar;

        option.dataset.avatar =
          avatar;

        option.setAttribute(
          "aria-label",
          `Avatar ${index + 1}`
        );

        option.addEventListener(
          "click",
          () => {
            grid
              .querySelectorAll(
                ".avatar-option"
              )
              .forEach((item) => {
                item.classList.remove(
                  "selected"
                );
              });

            option.classList.add(
              "selected"
            );

            this.selectedAvatar =
              avatar;
          }
        );

        grid.appendChild(
          option
        );
      }
    );
  }

  getSelectedAvatar() {
    return this.selectedAvatar;
  }

  setSelectedAvatar(avatar) {
    if (
      !this.avatars.includes(
        avatar
      )
    ) {
      return;
    }

    this.selectedAvatar =
      avatar;

    const grid =
      document.getElementById(
        "avatar-grid"
      );

    if (!grid) return;

    grid
      .querySelectorAll(
        ".avatar-option"
      )
      .forEach((option) => {
        option.classList.toggle(
          "selected",
          option.dataset.avatar ===
            avatar
        );
      });
  }

  // ==========================================================
  // NOTIFICATION
  // ==========================================================

  notify(
    message,
    type = "info",
    duration = 3000
  ) {
    if (!message) return;

    console.log(
      `[${String(
        type
      ).toUpperCase()}] ${message}`
    );

    let container =
      document.getElementById(
        "notification-container"
      );

    // Create container if HTML doesn't have one
    if (!container) {
      container =
        document.createElement(
          "div"
        );

      container.id =
        "notification-container";

      document.body.appendChild(
        container
      );
    }

    const notification =
      document.createElement(
        "div"
      );

    notification.className =
      `notification ${this.escapeClassName(
        type
      )}`;

    notification.textContent =
      message;

    container.appendChild(
      notification
    );

    const timer = setTimeout(
      () => {
        notification.remove();
        this.notificationTimers.delete(
          timer
        );
      },
      duration
    );

    this.notificationTimers.add(
      timer
    );
  }

  escapeClassName(value) {
    return String(value).replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    );
  }

  // ==========================================================
  // LOBBY PLAYERS
  // ==========================================================

  renderLobbyPlayers(
    players = [],
    myId = null
  ) {
    const grid =
      document.getElementById(
        "lobby-players"
      );

    if (!grid) return;

    grid.innerHTML = "";

    players.forEach((player) => {
      const card =
        document.createElement(
          "div"
        );

      card.className =
        "player-card";

      if (player.isReady) {
        card.classList.add(
          "ready"
        );
      }

      if (player.isHost) {
        card.classList.add(
          "host"
        );
      }

      if (
        player.isConnected ===
        false
      ) {
        card.classList.add(
          "disconnected"
        );
      }

      if (
        player.id === myId
      ) {
        card.classList.add(
          "current-player"
        );
      }

      const avatar =
        document.createElement(
          "div"
        );

      avatar.className =
        "avatar";

      avatar.textContent =
        player.avatar || "🎤";

      const name =
        document.createElement(
          "div"
        );

      name.className =
        "name";

      name.textContent =
        `${player.name || "Player"}${
          player.id === myId
            ? " (You)"
            : ""
        }`;

      const status =
        document.createElement(
          "div"
        );

      status.className =
        "status";

      if (
        player.isConnected ===
        false
      ) {
        status.textContent =
          "⚠️ Disconnected";
      } else if (
        player.isReady
      ) {
        status.classList.add(
          "ready-status"
        );

        status.textContent =
          "✅ Ready";
      } else {
        status.textContent =
          "⏳ Waiting";
      }

      card.appendChild(
        avatar
      );

      card.appendChild(
        name
      );

      status &&
        card.appendChild(
          status
        );

      grid.appendChild(
        card
      );
    });
  }

  // ==========================================================
  // LOBBY INFO
  // ==========================================================

  renderLobbyInfo(room = {}) {
    const modeBadge =
      document.getElementById(
        "lobby-mode-badge"
      );

    const roundsBadge =
      document.getElementById(
        "lobby-rounds-badge"
      );

    const langBadge =
      document.getElementById(
        "lobby-lang-badge"
      );

    const modeNames = {
      classic: "🎯 Classic",
      speed: "⚡ Speed",
      endless: "♾️ Endless",
      custom: "✏️ Custom"
    };

    const langNames = {
      en: "🇬🇧 English",
      te: "🇮🇳 Telugu"
    };

    if (modeBadge) {
      modeBadge.textContent =
        modeNames[
          room.gameMode
        ] ||
        room.gameMode ||
        "🎯 Classic";
    }

    if (roundsBadge) {
      if (
        room.gameMode ===
        "endless"
      ) {
        roundsBadge.textContent =
          "♾️";
      } else {
        roundsBadge.textContent =
          `${room.totalRounds || 0} rounds`;
      }
    }

    if (langBadge) {
      langBadge.textContent =
        langNames[
          room.language
        ] ||
        room.language ||
        "🇬🇧 English";
    }
  }

  // ==========================================================
  // GAME HUD
  // ==========================================================

  updateHUD(
    round,
    room = {}
  ) {
    const hudRound =
      document.getElementById(
        "hud-round"
      );

    if (!hudRound) return;

    const roundNumber =
      room.roundNumber ??
      round ??
      1;

    if (
      room.gameMode ===
      "endless"
    ) {
      hudRound.textContent =
        `Round ${roundNumber}`;
    } else {
      const total =
        room.totalRounds || 0;

      hudRound.textContent =
        total > 0
          ? `Round ${roundNumber}/${total}`
          : `Round ${roundNumber}`;
    }
  }

  // ==========================================================
  // MINI SCORES
  // ==========================================================

  updateMiniScores(
    players = []
  ) {
    const container =
      document.getElementById(
        "mini-scores"
      );

    if (!container) return;

    const sortedPlayers =
      [...players].sort(
        (a, b) =>
          (
            b.scores
              ?.totalScore ||
            0
          ) -
          (
            a.scores
              ?.totalScore ||
            0
          )
      );

    container.innerHTML =
      sortedPlayers
        .slice(0, 4)
        .map((player) => {
          const avatar =
            player.avatar ||
            "🎤";

          const score =
            player.scores
              ?.totalScore ||
            0;

          return `
            <div class="mini-score">
              <span>${this.escapeHtml(
                avatar
              )}</span>
              <span>${score}</span>
            </div>
          `;
        })
        .join("");
  }

  // ==========================================================
  // TIMER
  // ==========================================================

  updateTimer(
    timeLeft,
    totalTime = null
  ) {
    const text =
      document.getElementById(
        "timer-text"
      );

    const oldDisplay =
      document.getElementById(
        "timer-display"
      );

    const circle =
      document.getElementById(
        "timer-circle"
      );

    const safeTime =
      Math.max(
        0,
        Number(timeLeft) || 0
      );

    const safeTotal =
      Math.max(
        1,
        Number(totalTime) ||
          safeTime ||
          1
      );

    if (text) {
      text.textContent =
        Math.ceil(safeTime);
    }

    // Compatibility with older HTML
    if (
      oldDisplay &&
      oldDisplay !== text
    ) {
      oldDisplay.textContent =
        Math.ceil(safeTime);

      oldDisplay.classList.remove(
        "warning",
        "danger"
      );

      if (safeTime <= 3) {
        oldDisplay.classList.add(
          "danger"
        );
      } else if (
        safeTime <= 5
      ) {
        oldDisplay.classList.add(
          "warning"
        );
      }
    }

    if (circle) {
      const radius = 45;

      const circumference =
        2 *
        Math.PI *
        radius;

      const progress =
        Math.min(
          1,
          Math.max(
            0,
            safeTime /
              safeTotal
          )
        );

      const offset =
        circumference *
        (1 - progress);

      circle.style.strokeDasharray =
        `${circumference}`;

      circle.style.strokeDashoffset =
        `${offset}`;

      circle.classList.remove(
        "warning",
        "danger"
      );

      if (safeTime <= 3) {
        circle.classList.add(
          "danger"
        );
      } else if (
        safeTime <= 5
      ) {
        circle.classList.add(
          "warning"
        );
      }
    }
  }

  // ==========================================================
  // PHASE DISPLAY
  // ==========================================================

  setPhase(
    phase,
    lang = this.currentLang
  ) {
    if (
      lang &&
      this.translations[lang] &&
      lang !== this.currentLang
    ) {
      this.currentLang = lang;
      this.applyTranslations();
    }

    const icon =
      document.getElementById(
        "phase-icon"
      );

    const text =
      document.getElementById(
        "phase-text"
      );

    const phases = {
      listen: {
        icon: "🔊",
        textKey: "listening"
      },

      prepare: {
        icon: "🧠",
        textKey: "preparing"
      },

      speak: {
        icon: "🎤",
        textKey: "speaking"
      }
    };

    const phaseData =
      phases[phase];

    if (!phaseData) return;

    if (icon) {
      icon.textContent =
        phaseData.icon;
    }

    if (text) {
      text.textContent =
        this.t(
          phaseData.textKey
        );
    }
  }

  // ==========================================================
  // CURRENT PLAYER
  // ==========================================================

  setCurrentPlayer(
    player,
    isMe = false
  ) {
    if (!player) return;

    const avatar =
      document.getElementById(
        "current-player-avatar"
      );

    const name =
      document.getElementById(
        "current-player-name"
      );

    const label =
      document.getElementById(
        "current-player-label"
      );

    if (avatar) {
      avatar.textContent =
        player.avatar ||
        "🎤";
    }

    if (name) {
      name.textContent =
        player.name ||
        "Player";
    }

    if (label) {
      label.textContent =
        isMe
          ? ` - ${this.t(
              "yourTurn"
            )}`
          : ` ${this.t(
              "isSpeaking"
            )}`;
    }

    const bar =
      document.getElementById(
        "current-player-bar"
      );

    if (bar) {
      bar.style.borderColor =
        isMe
          ? "var(--accent)"
          : "var(--border)";
    }
  }

  // ==========================================================
  // WAITING OVERLAY
  // ==========================================================

  showWaiting(
    playerName
  ) {
    const overlay =
      document.getElementById(
        "waiting-overlay"
      );

    const watching =
      document.getElementById(
        "watching-player"
      );

    if (overlay) {
      overlay.classList.remove(
        "hidden"
      );
    }

    if (watching) {
      watching.textContent =
        `${this.t(
          "watching"
        )}${playerName || "Player"}`;
    }
  }

  hideWaiting() {
    const overlay =
      document.getElementById(
        "waiting-overlay"
      );

    if (overlay) {
      overlay.classList.add(
        "hidden"
      );
    }
  }

  // ==========================================================
  // DIALOGUE
  // ==========================================================

  setDialogue(text) {
    const element =
      document.getElementById(
        "dialogue-text"
      );

    if (!element) return;

    element.textContent =
      text || "";
  }

  updateDialogueDisplay(
    text,
    wordResults = []
  ) {
    const container =
      document.getElementById(
        "dialogue-text"
      );

    if (!container) return;

    if (
      !Array.isArray(
        wordResults
      ) ||
      wordResults.length === 0
    ) {
      container.textContent =
        text || "";

      return;
    }

    container.innerHTML = "";

    wordResults.forEach(
      (result) => {
        const span =
          document.createElement(
            "span"
          );

        span.className =
          "word";

        if (
          result.matched ||
          result.status ===
            "correct"
        ) {
          span.classList.add(
            "matched"
          );
        } else {
          span.classList.add(
            "missed"
          );
        }

        span.textContent =
          result.word || "";

        container.appendChild(
          span
        );

        container.appendChild(
          document.createTextNode(
            " "
          )
        );
      }
    );
  }

  // ==========================================================
  // MICROPHONE AREA
  // ==========================================================

  showMicArea() {
    const area =
      document.getElementById(
        "mic-area"
      );

    if (area) {
      area.classList.remove(
        "hidden"
      );
    }
  }

  hideMicArea() {
    const area =
      document.getElementById(
        "mic-area"
      );

    if (area) {
      area.classList.add(
        "hidden"
      );
    }
  }

  // ==========================================================
  // SPOKEN TEXT
  // ==========================================================

  updateSpokenText(text) {
    const element =
      document.getElementById(
        "spoken-text"
      );

    if (element) {
      element.textContent =
        text || "";
    }
  }

  // ==========================================================
  // WAVEFORM
  // ==========================================================

  showWaveform() {
    const container =
      document.getElementById(
        "waveform-container"
      );

    if (container) {
      container.classList.remove(
        "hidden"
      );
    }
  }

  hideWaveform() {
    const container =
      document.getElementById(
        "waveform-container"
      );

    if (container) {
      container.classList.add(
        "hidden"
      );
    }
  }

  // ==========================================================
  // REPLAY BUTTON
  // ==========================================================

  showReplayButton() {
    const button =
      document.getElementById(
        "btn-replay-audio"
      );

    if (button) {
      button.classList.remove(
        "hidden"
      );
    }
  }

  hideReplayButton() {
    const button =
      document.getElementById(
        "btn-replay-audio"
      );

    if (button) {
      button.classList.add(
        "hidden"
      );
    }
  }

  // ==========================================================
  // RESULT SCREEN
  // ==========================================================

  showResult(
    playerName,
    avatar,
    score,
    wordComparison = [],
    spokenText = ""
  ) {
    const avatarElement =
      document.getElementById(
        "result-avatar"
      );

    const nameElement =
      document.getElementById(
        "result-player-name"
      );

    const spokenElement =
      document.getElementById(
        "result-spoken-text"
      );

    if (avatarElement) {
      avatarElement.textContent =
        avatar || "🎤";
    }

    if (nameElement) {
      nameElement.textContent =
        playerName ||
        "Player";
    }

    if (spokenElement) {
      spokenElement.textContent =
        spokenText ||
        "(nothing)";
    }

    // --------------------------------------------------------
    // SCORE LABEL
    // --------------------------------------------------------

    const label =
      document.getElementById(
        "score-label"
      );

    const safeScore =
      Math.min(
        100,
        Math.max(
          0,
          Math.round(
            Number(score) || 0
          )
        )
      );

    if (label) {
      label.className =
        "score-label";

      if (safeScore === 100) {
        label.textContent =
          this.t("perfect");

        label.classList.add(
          "perfect"
        );
      } else if (
        safeScore >= 80
      ) {
        label.textContent =
          this.t("great");

        label.classList.add(
          "great"
        );
      } else if (
        safeScore >= 50
      ) {
        label.textContent =
          this.t("good");

        label.classList.add(
          "good"
        );
      } else {
        label.textContent =
          this.t(
            "needsPractice"
          );

        label.classList.add(
          "poor"
        );
      }
    }

    // --------------------------------------------------------
    // WORD COMPARISON
    // --------------------------------------------------------

    const comparison =
      document.getElementById(
        "word-comparison"
      );

    if (!comparison) return;

    comparison.innerHTML = "";

    if (
      !Array.isArray(
        wordComparison
      )
    ) {
      return;
    }

    wordComparison.forEach(
      (item) => {
        const token =
          document.createElement(
            "span"
          );

        token.className =
          `word-token ${
            item.status || "missing"
          }`;

        token.textContent =
          item.word || "";

        if (
          item.status ===
            "wrong" &&
          item.spoken
        ) {
          token.title =
            `You said: "${item.spoken}"`;
        }

        comparison.appendChild(
          token
        );
      }
    );
  }

  // ==========================================================
  // ROUND RESULTS
  // ==========================================================

  renderRoundResults(
    results = {},
    players = [],
    roundNumber = 1
  ) {
    const title =
      document.getElementById(
        "round-results-title"
      );

    if (title) {
      title.textContent =
        this.t(
          "roundResults",
          {
            n: roundNumber
          }
        );
    }

    const list =
      document.getElementById(
        "round-results-list"
      );

    if (!list) return;

    list.innerHTML = "";

    const resultMap =
      results.results || {};

    const sorted =
      Object.entries(
        resultMap
      )
        .map(
          ([playerId, data]) => {
            const player =
              players.find(
                (p) =>
                  p.id ===
                  playerId
              ) || {
                id: playerId,
                name: "Unknown",
                avatar: "❓"
              };

            return {
              ...data,
              ...player,
              playerId
            };
          }
        )
        .sort(
          (a, b) =>
            (
              b.matchPercentage ||
              0
            ) -
            (
              a.matchPercentage ||
              0
            )
        );

    sorted.forEach(
      (item, index) => {
        const element =
          document.createElement(
            "div"
          );

        element.className =
          "round-result-item";

        element.style.animationDelay =
          `${index * 0.1}s`;

        let rankClass = "";

        if (index === 0) {
          rankClass = "gold";
        } else if (
          index === 1
        ) {
          rankClass = "silver";
        } else if (
          index === 2
        ) {
          rankClass = "bronze";
        }

        element.innerHTML = `
          <span class="rank ${rankClass}">
            #${index + 1}
          </span>

          <span class="rr-avatar">
            ${this.escapeHtml(
              item.avatar ||
                "🎤"
            )}
          </span>

          <span class="rr-name">
            ${this.escapeHtml(
              item.name ||
                "Unknown"
            )}
          </span>

          <span class="rr-score">
            ${
              Number(
                item.matchPercentage
              ) || 0
            }%
          </span>
        `;

        list.appendChild(
          element
        );
      }
    );
  }

  // ==========================================================
  // LEADERBOARD
  // ==========================================================

  renderLeaderboard(
    leaderboard = [],
    containerId = "leaderboard-mini"
  ) {
    const container =
      document.getElementById(
        containerId
      );

    if (!container) return;

    container.innerHTML = "";

    const heading =
      document.createElement(
        "h3"
      );

    heading.textContent =
      this.t(
        "totalScore"
      );

    container.appendChild(
      heading
    );

    leaderboard.forEach(
      (entry, index) => {
        const element =
          document.createElement(
            "div"
          );

        element.className =
          "round-result-item";

        let rankClass = "";

        if (index === 0) {
          rankClass = "gold";
        } else if (
          index === 1
        ) {
          rankClass = "silver";
        } else if (
          index === 2
        ) {
          rankClass = "bronze";
        }

        element.innerHTML = `
          <span class="rank ${rankClass}">
            #${index + 1}
          </span>

          <span class="rr-avatar">
            ${this.escapeHtml(
              entry.avatar ||
                "🎤"
            )}
          </span>

          <span class="rr-name">
            ${this.escapeHtml(
              entry.name ||
                "Unknown"
            )}
          </span>

          <span class="rr-score">
            ${
              Number(
                entry.totalScore
              ) || 0
            }
          </span>
        `;

        container.appendChild(
          element
        );
      }
    );
  }

  // ==========================================================
  // FINAL GAME OVER
  // ==========================================================

  renderGameOver(
    winner,
    leaderboard = []
  ) {
    const winnerCard =
      document.getElementById(
        "winner-card"
      );

    if (
      winnerCard &&
      winner
    ) {
      winnerCard.innerHTML = `
        <div class="winner-avatar">
          ${this.escapeHtml(
            winner.avatar ||
              "🏆"
          )}
        </div>

        <div class="winner-name">
          ${this.escapeHtml(
            winner.name ||
              "Player"
          )}
        </div>

        <div class="winner-score">
          ${
            Number(
              winner.totalScore
            ) || 0
          } pts
        </div>

        <div class="winner-stats">
          ${this.escapeHtml(
            this.t(
              "avgMatch"
            )
          )}: ${
            Number(
              winner.averageMatch
            ) || 0
          }%
          ·
          ${this.escapeHtml(
            this.t(
              "bestScore"
            )
          )}: ${
            Number(
              winner.bestPerformance
            ) || 0
          }%
          ·
          ${this.escapeHtml(
            this.t(
              "perfectMatches"
            )
          )}: ${
            Number(
              winner.perfectMatches
            ) || 0
          }
        </div>
      `;
    }

    this.renderLeaderboard(
      leaderboard,
      "final-leaderboard"
    );
  }

  // ==========================================================
  // GENERIC ELEMENT VISIBILITY
  // ==========================================================

  showElement(id) {
    const element =
      document.getElementById(id);

    if (element) {
      element.classList.remove(
        "hidden"
      );
    }
  }

  hideElement(id) {
    const element =
      document.getElementById(id);

    if (element) {
      element.classList.add(
        "hidden"
      );
    }
  }

  // ==========================================================
  // HTML ESCAPING
  // ==========================================================

  escapeHtml(text) {
    const div =
      document.createElement(
        "div"
      );

    div.textContent =
      text == null
        ? ""
        : String(text);

    return div.innerHTML;
  }

  // ==========================================================
  // CLEANUP
  // ==========================================================

  destroy() {
    this.notificationTimers.forEach(
      (timer) => {
        clearTimeout(timer);
      }
    );

    this.notificationTimers.clear();

    this.screens = {};
    this.currentScreen = null;
  }
}

// Optional shared instance
export const uiManager =
  new UIManager();
