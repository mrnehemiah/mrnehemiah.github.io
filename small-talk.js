import { normalizeSwahiliQuery } from "./swahili-language.js?v=20261125-sw2";

const REPLIES = {
  sw: {
    greeting: [
      "Poa kabisa! 😄 Wewe vipi? Nikusaidie nini leo?",
      "Salama kabisa! 😊 Karibu ZUNE Market. Kuna jambo nikusaidie?",
      "Niko fresh! 😃 Tuambie, leo tunatafuta nini?"
    ],
    wellbeing: [
      "Niko vizuri, asante kwa kuuliza! 😊 Wewe unaendeleaje?",
      "Niko tayari kukusaidia muda wowote! 😄 Habari zako?"
    ],
    morning: ["Habari za asubuhi! ☀️ Nakutakia siku njema. Nikusaidie nini leo?"],
    afternoon: ["Habari za mchana! ☀️ Karibu, nikusaidie nini leo?"],
    evening: ["Habari za jioni! 🌆 Karibu, nikusaidie nini?"],
    night: ["Usiku mwema! 🌙 Kama una swali lolote, niko hapa kukusaidia."],
    thanks: [
      "Karibu sana! 😊 Nimefurahi kusaidia.",
      "Usijali kabisa! ❤️ Ukiwa na swali lingine niambie."
    ],
    apology: ["Hakuna shida kabisa. 😊 Tuendelee, ungependa nikusaidie nini?"],
    goodbye: [
      "Kwaheri! 👋 Asante kwa kutumia ZUNE Market. Karibu tena!",
      "Tutaonana tena! 😊 Nakutakia siku njema."
    ],
    praise: ["Asante sana! 🥰 Tunajitahidi kufanya ZUNE Market iwe rahisi na bora zaidi."]
  },
  en: {
    greeting: [
      "Doing great! 😄 How are you? What can I help you with today?",
      "All good here! 😊 Welcome to ZUNE Market. What can I help you find?"
    ],
    wellbeing: [
      "I’m doing well, thanks for asking! 😊 How are you?",
      "Ready to help! 😃 What would you like to do today?"
    ],
    morning: ["Good morning! ☀️ Hope you have a great day. How can I help?"],
    afternoon: ["Good afternoon! ☀️ Welcome. What can I help you with today?"],
    evening: ["Good evening! 🌆 Welcome. What can I help you with?"],
    night: ["Good night! 🌙 I’m here if you need help with anything."],
    thanks: [
      "You’re very welcome! 😊 Happy to help.",
      "Anytime! ❤️ Let me know if you need anything else."
    ],
    apology: ["No worries at all. 😊 What would you like help with?"],
    goodbye: [
      "Goodbye! 👋 Thanks for using ZUNE Market. See you again!",
      "Take care! 😊 You’re always welcome back."
    ],
    praise: ["Thank you! 🥰 We’re working to make ZUNE Market better and easier to use."]
  }
};

const PATTERNS = [
  ["morning", /^(habari za asubuhi|asubuhi njema|good morning)$/],
  ["afternoon", /^(habari za mchana|mchana mwema|good afternoon)$/],
  ["evening", /^(habari za jioni|jioni njema|good evening)$/],
  ["night", /^(habari za usiku|usiku mwema|good night|goodnight)$/],
  ["wellbeing", /^(ukoje|unaendeleaje|habari yako|habari za kwako|wewe je|how are you|how are you doing|how do you do|are you okay|are you good|how is it going|hows it going)$/],
  ["thanks", /^(asante( sana)?|asanteni( sana)?|shukrani( sana)?|ahsante( sana)?|thanks( a lot)?|thank you( so much)?|thankyou|thx|cheers|much appreciated)$/],
  ["apology", /^(samahani( sana)?|nisamehe|pole( sana)?|sorry( about that)?|my apologies|i apologize)$/],
  ["goodbye", /^(kwaheri|tutaonana( baadaye)?|baadaye|bye( for now)?|goodbye|see you( later)?|see ya|take care)$/],
  ["praise", /^(hongera|vizuri sana|umesaidia|umefanya vizuri|you are great|you are helpful|well done|nice work|great job)$/],
  ["greeting", /^(mambo( vipi)?|vipi( mambo)?|poa( tu| kabisa)?|niaje|sasa|habari|hujambo|salama( sana)?|shikamoo|marahaba|hello|hi|hey|hey there|heya|yo|whats up|what s up)$/]
];

export function createSmallTalkResponder(getLanguage = () => "sw") {
  let turn = 0;

  return input => {
    const text = normalizeSwahiliQuery(input).replace(/\s+/g, " ").trim();
    if (!text) return null;

    const category = PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
    if (!category) return null;

    const language = getLanguage() === "en" ? "en" : "sw";
    const replies = REPLIES[language][category];
    const reply = replies[turn % replies.length];
    turn += 1;
    return reply;
  };
}
