// ZUNE Smart Assistant — Swahili language pack.
// A practical, extensible lexicon and morphology helper; not a claim to contain every
// word, dialect, proper noun or technical term in the Kiswahili language.
const GROUPS = [
 ["nunua","kununua","ununuzi","mnunuzi","mnunue","nunulia","nimenunua","amenunua","wamenunua","nunua bidhaa","agiza","kuagiza","oda"],
 ["uza","kuuza","muuzaji","wauzaji","uuzaji","ameuza","wanauza","kuuzia","biashara"],
 ["tafuta","kutafuta","utafutaji","tafuta bidhaa","natafuta","kutafutiwa","search","find","lookup"],
 ["onyesha","onyesha","kuonyesha","nionyeshe","onyesha bidhaa","onyesha maduka","onyesha bei","display"],
 ["bei","gharama","thamani","kiasi","pesa","fedha","price","cost","gharama ya bidhaa"],
 ["punguzo","ofa","oferta","promosheni","promotion","discount","sale","akiba","bei pungufu"],
 ["duka","maduka","store","stores","shop","shops","stoo","kibanda","biashara"],
 ["bidhaa","bidhaa","product","products","item","items","vitu","mali","bidhaa mpya"],
 ["mteja","wateja","customer","customers","mnunuzi","buyer","wanunuzi"],
 ["muuzaji","wauzaji","seller","sellers","vendor","vendors","mfanyabiashara"],
 ["chapa","brand","brands","alama ya bidhaa","kampuni","mtengenezaji"],
 ["kikapu","cart","basket","shopping cart","kapu","weka kikapuni","add to cart"],
 ["oda","order","orders","agizo","maagizo","maombi ya ununuzi","orderi"],
 ["fuatilia","kufuatilia","fuatilia oda","tracking","track","angalia hali","hali ya oda","inafika lini"],
 ["usafirishaji","delivery","delivered","kusafirisha","fikisha","kufikisha","usafiri","usafirishaji wa bidhaa"],
 ["dereva","madereva","driver","drivers","msafirishaji","mwendesha gari"],
 ["lipa","kulipa","malipo","payment","payments","nimelipa","amelipa","lipia","lipeni","kulipia"],
 ["rejesha","kurejesha","refund","refunds","rudisha","kurudisha","marejesho","rudishiwa fedha"],
 ["ghairi","kughairi","cancel","cancellation","futa","kufuta","sitisha","kusitisha"],
 ["akaunti","account","accounts","wasifu","profile","profiles","mtumiaji","watumiaji"],
 ["ingia","kuingia","login","log in","sign in","jisajili","kuj register","register","registration","usajili"],
 ["nenosiri","password","nywila","passcode","siri ya akaunti"],
 ["msaada","help","support","huduma kwa wateja","msaada kwa wateja","wasiliana","mawasiliano"],
 ["uthibitisho","verification","verify","verified","uhakiki","thibitisha","kuthibitisha","hakiki","uhalali"],
 ["alama","badge","verified badge","alama ya uthibitisho","beji"],
 ["video","videos","reel","reels","video fupi","klipu","clip","clips"],
 ["picha","image","images","photo","photos","image","taswira","sura"],
 ["sauti","audio","sound","sounds","muziki","music","wimbo","nyimbo"],
 ["maoni","comment","comments","toa maoni","andika maoni","jibu maoni","commentary"],
 ["penda","like","likes","kupenda","nimependa","amependa","napenda","kupatia like"],
 ["shiriki","share","sharing","kushiriki","sambaza","kusambaza","tuma kwa rafiki"],
 ["hakiki","review","reviews","rating","ratings","tathmini","ukaguzi","nyota"],
 ["hifadhi","save","saved","wishlist","favorites","vipendwa","orodha ya vipendwa","wekea alama"],
 ["linganisha","compare","comparison","kulinganisha","tofautisha","tofauti","ulinganisho"],
 ["stock","idadi iliyopo","akiba ya bidhaa","hisa","inventory","mzigo","bidhaa zilizopo","upatikanaji"],
 ["variant","variants","aina","toleo","rangi","size","ukubwa","vipimo","chaguo la bidhaa"],
 ["kategoria","category","categories","kundi","makundi","aina ya bidhaa","sehemu ya bidhaa"],
 ["subira","subiri","kusubiri","pending","inangoja","inasubiri","bado"],
 ["imekubaliwa","approved","approve","idhinisha","idhini","imeidhinishwa","kukubali"],
 ["imekataliwa","rejected","reject","kataa","imekataa","imekataliwa","kukataa"],
 ["salio","balance","wallet","mkoba","pochi","fedha zilizopo","salio la fedha"],
 ["utoaji fedha","withdrawal","withdrawals","toa fedha","kutoa fedha","hamisha fedha","payout"],
 ["risiti","receipt","invoice","ankara","stakabadhi","uthibitisho wa malipo"],
 ["anwani","address","location","mahali","eneo","mtaa","kata","wilaya","mkoa"],
 ["haraka","fast","quick","upesi","mapema","mara moja"],
 ["polepole","slow","taratibu","kwa utaratibu","kasi ndogo"],
 ["nzuri","good","bora","safi","poa","vizuri","excellent","great"],
 ["mbaya","bad","tatizo","haribika","haifanyi kazi","wrong","poor"],
 ["msaada wa kiufundi","technical support","hitilafu","error","bug","kosa","tatizo la mfumo"],
 ["sasa","now","kwa sasa","wakati huu","leo","today"],
 ["kesho","tomorrow","kesho kutwa"],
 ["jana","yesterday","juzi"],
 ["nini","what","ni kitu gani","ni kitu gani hiki"],
 ["nani","who","mtu gani"],
 ["lini","when","muda gani","saa ngapi"],
 ["wapi","where","mahali gani","sehemu gani"],
 ["kwa nini","why","sababu gani","kwanini"],
 ["vipi","how","jinsi gani","namna gani"],
 ["gani","which","ipi","yupi","lipi"],
 ["ndiyo","yes","naam","sawa","ndio"],
 ["hapana","no","la","sio","si"],
 ["tafadhali","please","naomba","nakuomba"],
 ["asante","thanks","thank you","shukrani","ahsante"],
 ["karibu","welcome","hakuna shida"],
 ["samahani","sorry","pole","naomba radhi"],
 ["rafiki","friend","marafiki","jamaa"],
 ["familia","family","ndugu","jamaa"],
 ["simu","phone","mobile","smartphone","rununu","handset"],
 ["kompyuta","computer","laptop","pc","tarakilishi"],
 ["nguo","clothes","mavazi","vazi","shati","suruali"],
 ["kiatu","shoes","viatu","footwear","ndala","sandali"],
 ["chakula","food","vyakula","mlo","kula"],
 ["nyumba","house","home","makazi","jengo"],
 ["gari","car","vehicle","magari","chombo cha usafiri"],
 ["samani","furniture","meza","kiti","kitanda"],
 ["urembo","beauty","cosmetics","vipodozi","uzuri"],
 ["afya","health","dawa","tiba","hospitali"],
 ["bei nafuu","cheap","affordable","rahisi","gharama nafuu"],
 ["ghali","expensive","bei kubwa","gharama kubwa"],
 ["mpya","new","kipya","fresh","karibuni"],
 ["zamani","old","used","iliyotumika","second hand"],
 ["kubwa","big","large","kuu","pana"],
 ["ndogo","small","little","fupi","finyu"],
 ["nyingi","many","lots","mengi","kadhaa"],
 ["chache","few","kidogo","wachache"],
 ["yote","all","zote","kila kitu","kila moja"],
 ["hakuna","none","bila","hamna","sipo"],
 ["anza","start","begin","kuanza","mwanzo"],
 ["maliza","finish","complete","kukamilisha","mwisho","kamilisha"],
 ["fungua","open","kufungua","washa","anzisha"],
 ["funga","close","kufunga","zima"],
 ["badilisha","change","edit","update","rekebisha","kuhariri","kusasisha"],
 ["futa","delete","remove","ondoa","kufuta","kuondoa"],
 ["ongeza","add","kuongeza","ingiza","weka","kuweka"],
 ["punguza","reduce","decrease","kupunguza","shusha"],
 ["panda","increase","raise","ongeza","kuongeza"],
 ["soma","read","kusoma","angalia","view","tazama","kuangalia"],
 ["andika","write","kuandika","jibu","reply","respond"],
 ["eleza","explain","fafanua","maelezo","ufafanuzi","sema"],
 ["jifunze","learn","kujifunza","fundisha","teach","mafunzo"],
 ["elewa","understand","kuelewa","uelewa","fahamu","kufahamu"],
 ["kumbuka","remember","kukumbuka","sahau","forget"],
 ["uliza","ask","kuuliza","swali","maswali","question"],
 ["jibu","answer","majibu","response","reply"],
 ["tafuta msaada","help me","nisaidie","nisaidieni","nahitaji msaada"],
 ["enda","kwenda","kuenda","nenda","ameenda","wameenda","tumeenda","nimeenda","kwenda","go","went","going"],
 ["kuja","njoo","amekuja","wamekuja","tume kuja","come","came","coming"],
 ["fanya","kufanya","anafanya","nimefanya","wamefanya","tulifanya","fanya kazi","work","working","do","make"],
 ["jua","kujua","najua","anajua","fahamu","kufahamu","know","understand"],
 ["hitaji","kuhitaji","nahitaji","anahitaji","wanahitaji","need","require","requirement"],
 ["weza","kuweza","naweza","inawezekana","uwezo","can","could","possible"],
 ["pata","kupata","napata","amepata","wanapata","get","receive","obtain"],
 ["leta","kuleta","naleta","ameleta","bring","brought"],
 ["chagua","kuchagua","nachagua","amechagua","select","choose","selection"],
 ["tuma","kutuma","natuma","ametuma","send","sent","sending"],
 ["pokea","kupokea","napokea","amepokea","receive","received"],
 ["soko","market","marketplace","masoko","soko la mtandaoni","biashara mtandaoni"],
 ["mtandaoni","online","internet","kwenye mtandao","digital","kidijitali"],
 ["salama","safe","security","usalama","ulinzi","secure"],
 ["hatari","danger","risk","unsafe","tahadhari"],
 ["siri","private","privacy","faragha","binafsi"],
 ["arifa","notification","notifications","taarifa","ujumbe","notisi"],
 ["ujumbe","message","messages","sms","chat","mawasiliano"],
 ["ratiba","schedule","time","muda","wakati","tarehe"],
 ["wiki","week","juma","siku saba"],
 ["mwezi","month","miezi"],
 ["mwaka","year","miaka"],
 ["siku","day","days","leo","kesho"],
 ["asubuhi","morning","alfajiri"],
 ["mchana","afternoon","adhuhuri"],
 ["jioni","evening","usiku wa kuingia"],
 ["usiku","night"],
 ["rangi","color","colour","rangi za bidhaa"],
 ["nyeusi","black"],
 ["nyeupe","white"],
 ["nyekundu","red"],
 ["bluu","blue"],
 ["kijani","green"],
 ["njano","yellow"],
 ["waridi","pink"],
 ["kahawia","brown"],
 ["kijivu","grey","gray"],
 ["machungwa","orange"],
 ["moja","one","1"],
 ["mbili","two","2"],
 ["tatu","three","3"],
 ["nne","four","4"],
 ["tano","five","5"],
 ["kumi","ten","10"],
 ["mia","hundred","100"],
 ["elfu","thousand","1000"],
 ["milioni","million"],
 ["shilingi","tsh","tzs","tanzania shillings","pesa za kitanzania"]
];

const TYPO_MAP = {
 "naomba": "naomba", "naomb": "naomba", "naombaa":"naomba",
 "tafadhali":"tafadhali", "tafadhalii":"tafadhali",
 "bidha":"bidhaa", "bidhaa":"bidhaa", "maduk":"maduka",
 "muuzaj":"muuzaji", "wauzaj":"wauzaji", "nunua":"nunua",
 "kununua":"kununua", "nununua":"nunua", "nunuli":"nunulia",
 "malipo":"malipo", "kulipia":"kulipia", "delivery":"delivery",
 "delivary":"delivery", "delivary":"delivery", "delevry":"delivery",
 "whatsap":"whatsapp", "whatsapp":"whatsapp", "watsap":"whatsapp",
 "verfication":"verification", "verfy":"verify", "verfyed":"verified",
 "akaunt":"akaunti", "akount":"akaunti", "acount":"account",
 "akaunti":"akaunti", "nenosir":"nenosiri", "nenosiri":"nenosiri",
 "kategoria":"kategoria", "catagory":"category", "categoty":"category",
 "punguzo":"punguzo", "punguz":"punguzo", "ofaa":"ofa",
 "bidhaa":"bidhaa", "simu":"simu", "simuu":"simu",
 "bei":"bei", "bei?":"bei", "duka":"duka", "dukaa":"duka",
 "reel":"reel", "reels":"reels", "reelsi":"reels",
 "kuagiz":"kuagiza", "agiz":"agiza", "fuatilia":"fuatilia",
 "fuatili":"fuatilia", "nionyesh":"nionyeshe", "onyesha":"onyesha"
};

const STOP_WORDS = new Set([
 "na","ni","ya","wa","za","la","cha","vya","kwa","katika","kwenye","hii","hicho","hivi",
 "ile","hizo","hao","huyu","hawa","mimi","wewe","yeye","sisi","ninyi","wao","je","tu",
 "pia","au","lakini","ila","basi","sana","zaidi","kidogo","tu","ndiyo","ndio","sio","si",
 "the","a","an","is","are","to","of","on","in","at","for","and","or","please","my","me"
]);

const aliasToGroup = new Map();
for (const group of GROUPS) for (const word of group) {
 const normalized = word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
 if (normalized) aliasToGroup.set(normalized, group);
}

function clean(value) {
 return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .replace(/[’']/g,"").replace(/[^a-z0-9]+/g," ").trim();
}

function stemVerb(token) {
 const prefixes = ["nilikuwa","utakuwa","atakuwa","tutakuwa","mtakuwa","watakuwa","nime","tume","meme","wame","yame","kime","vime","lime","nili","tuli","mli","wali","nita","tuta","mta","wata","uta","ata","na","ni","u","a","tu","m","wa"];
 for (const prefix of prefixes.sort((a,b)=>b.length-a.length)) {
  if (!token.startsWith(prefix) || token.length-prefix.length < 4) continue;
  let rest=token.slice(prefix.length);
  rest=rest.replace(/^(?:kuwa|kwisha|weza|pata|leta|fanya|sema|ona|enda|ku|li|ta|me|na|ki|ka|nge|ngali)/,"");
  if (rest.length>=3) return rest;
 }
 if (token.startsWith("ku") && token.length>5) return token.slice(2);
 if (token.startsWith("kw") && token.length>5) return token.slice(2);
 return token;
}

export function expandSwahiliTokens(value) {
 const normalized=clean(value);
 if(!normalized) return [];
 const output=new Set();
 for (const raw of normalized.split(/\s+/)) {
  if(!raw || STOP_WORDS.has(raw)) continue;
  const token=TYPO_MAP[raw] || raw;
  output.add(token);
  const stem=stemVerb(token);
  if(stem && stem!==token) output.add(stem);
  const group=aliasToGroup.get(token) || aliasToGroup.get(stem);
  if(group) for(const alias of group) {
   const a=clean(alias);
   if(a && !a.includes(" ")) output.add(a);
  }
 }
 return [...output];
}

export function normalizeSwahiliQuery(value) {
 return clean(value).split(/\s+/).filter(Boolean).map(token=>TYPO_MAP[token]||token).join(" ");
}

export function getSwahiliSearchTokens(value) {
 return clean(value).split(/\s+/).filter(Boolean).map(token=>{
  const corrected=TYPO_MAP[token]||token;
  return stemVerb(corrected);
 });
}

export function getSwahiliLexiconStats() {
 return { synonymGroups: GROUPS.length, indexedForms: aliasToGroup.size, note:"Broad practical lexicon; not an exhaustive dictionary of every Kiswahili word or dialect." };
}
