class DialogueManager {
  constructor() {
    this.dialogues = {
      en: [
        { id: 1, text: "Today I will win this game.", difficulty: "easy", category: "gaming" },
        { id: 2, text: "The quick brown fox jumps over the lazy dog.", difficulty: "easy", category: "classic" },
        { id: 3, text: "Hello everyone, welcome to the challenge.", difficulty: "easy", category: "greeting" },
        { id: 4, text: "I believe we can make a difference together.", difficulty: "easy", category: "motivation" },
        { id: 5, text: "The weather is beautiful today, let us go outside.", difficulty: "easy", category: "daily" },
        { id: 6, text: "Never give up on your dreams, keep pushing forward.", difficulty: "medium", category: "motivation" },
        { id: 7, text: "Science is the key to understanding the universe around us.", difficulty: "medium", category: "education" },
        { id: 8, text: "Practice makes perfect, so keep trying every single day.", difficulty: "medium", category: "motivation" },
        { id: 9, text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", difficulty: "hard", category: "quote" },
        { id: 10, text: "In three words I can sum up everything I learned about life: it goes on.", difficulty: "medium", category: "quote" },
        { id: 11, text: "To be or not to be, that is the question.", difficulty: "easy", category: "literature" },
        { id: 12, text: "All that glitters is not gold, sometimes the best things are hidden.", difficulty: "medium", category: "proverb" },
        { id: 13, text: "A journey of a thousand miles begins with a single step forward.", difficulty: "medium", category: "proverb" },
        { id: 14, text: "The only thing we have to fear is fear itself.", difficulty: "easy", category: "quote" },
        { id: 15, text: "Life is what happens when you are busy making other plans for the future.", difficulty: "hard", category: "quote" },
        { id: 16, text: "You must be the change you wish to see in the world around you.", difficulty: "medium", category: "quote" },
        { id: 17, text: "Knowledge speaks but wisdom listens carefully to every word.", difficulty: "medium", category: "wisdom" },
        { id: 18, text: "Technology is best when it brings people together from all over the world.", difficulty: "hard", category: "technology" },
        { id: 19, text: "Every champion was once a beginner who refused to give up.", difficulty: "medium", category: "sports" },
        { id: 20, text: "Communication is the most important skill you can develop in your lifetime.", difficulty: "hard", category: "education" },
        { id: 21, text: "Stars cannot shine without darkness surrounding them in the night sky.", difficulty: "medium", category: "inspiration" },
        { id: 22, text: "Success is not final and failure is not fatal, it is the courage to continue that counts.", difficulty: "hard", category: "quote" },
        { id: 23, text: "The best time to plant a tree was twenty years ago, the second best time is now.", difficulty: "hard", category: "proverb" },
        { id: 24, text: "Do not watch the clock, do what it does and keep going forward.", difficulty: "medium", category: "motivation" },
        { id: 25, text: "Creativity is intelligence having fun with ideas and imagination.", difficulty: "medium", category: "creativity" }
      ],
      te: [
        { id: 101, text: "నేను ఈ ఆట గెలుస్తాను.", difficulty: "easy", category: "gaming" },
        { id: 102, text: "నమస్కారం, మీ అందరికీ స్వాగతం.", difficulty: "easy", category: "greeting" },
        { id: 103, text: "విద్య అనేది అత్యంత శక్తివంతమైన ఆయుధం.", difficulty: "medium", category: "education" },
        { id: 104, text: "మనం కలిసి ఈ సవాలును అధిగమించగలము.", difficulty: "medium", category: "motivation" },
        { id: 105, text: "ప్రతి రోజు ఒక కొత్త అవకాశం తెస్తుంది.", difficulty: "easy", category: "motivation" },
        { id: 106, text: "జీవితం అందమైనది, ప్రతి క్షణాన్ని ఆస్వాదించండి.", difficulty: "medium", category: "life" },
        { id: 107, text: "పట్టుదల ఉంటే విజయం తప్పక వస్తుంది.", difficulty: "easy", category: "motivation" },
        { id: 108, text: "ఈ ప్రపంచంలో మార్పు తేవాలంటే మనం మారాలి.", difficulty: "medium", category: "wisdom" },
        { id: 109, text: "సాంకేతిక పరిజ్ఞానం మన జీవితాలను మెరుగుపరుస్తుంది.", difficulty: "hard", category: "technology" },
        { id: 110, text: "స్నేహం అనేది జీవితంలో అత్యంత విలువైన బహుమానం.", difficulty: "medium", category: "friendship" }
      ]
    };
    
    this.usedDialogueIds = new Set();
    this.customDialogues = [];
  }

  getRandomDialogue(language = 'en', difficulty = null) {
    let pool = this.dialogues[language] || this.dialogues['en'];
    
    if (difficulty) {
      pool = pool.filter(d => d.difficulty === difficulty);
    }
    
    const available = pool.filter(d => !this.usedDialogueIds.has(d.id));
    const finalPool = available.length > 0 ? available : pool;
    
    if (available.length === 0) {
      this.usedDialogueIds.clear();
    }
    
    const dialogue = finalPool[Math.floor(Math.random() * finalPool.length)];
    this.usedDialogueIds.add(dialogue.id);
    
    return { ...dialogue, source: 'system' };
  }

  addCustomDialogue(text, language, addedBy) {
    const dialogue = {
      id: Date.now(),
      text: text.trim(),
      difficulty: this.estimateDifficulty(text),
      category: 'custom',
      source: 'player',
      addedBy
    };
    this.customDialogues.push(dialogue);
    if (!this.dialogues[language]) {
      this.dialogues[language] = [];
    }
    this.dialogues[language].push(dialogue);
    return dialogue;
  }

  estimateDifficulty(text) {
    const wordCount = text.split(/\s+/).length;
    if (wordCount <= 6) return 'easy';
    if (wordCount <= 12) return 'medium';
    return 'hard';
  }

  resetUsed() {
    this.usedDialogueIds.clear();
  }
}

module.exports = DialogueManager;
