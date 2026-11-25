import { answerZuneKnowledge } from "./zune-knowledge.js?v=20261125-knowledge-7";
import { normalizeSwahiliQuery, getSwahiliSearchTokens } from "./swahili-language.js?v=20261125-sw2";
import { initializePremiumAssistant } from "./smart-assistant-premium.js?v=20261125-composer-cache-3";

/**
 * Opens the Marketplace assistant from the existing Search Bar.
 * Marketplace state and services are injected by home.js so this module
 * stays independent without duplicating Supabase or product navigation logic.
 */
export async function openZuneAssistant({
 language,
 safe,
 money,
 homeState,
 supabase,
 openProductDetails,
 openStoreDetails,
 renderMarketplacePage,
 loadProducts
}) {
 const sw=language()==="sw";document.getElementById("zune-assistant-overlay")?.remove();
 const overlay=document.createElement("div");
 overlay.id="zune-assistant-overlay";
 overlay.className="z-assistant-overlay";
 try {
  const response=await fetch(new URL("./smart-assistant.html?v=20261125-composer-cache-3",import.meta.url),{cache:"no-cache"});
  if(!response.ok) throw new Error("Assistant template request failed: "+response.status);
  const markup=await response.text();
  const templateDocument=new DOMParser().parseFromString(markup,"text/html");
  const template=templateDocument.querySelector("#zune-smart-assistant-template");
  if(!template) throw new Error("Assistant template is missing.");
  overlay.appendChild(document.importNode(template.content,true));
 } catch(error) {
  console.error("ZUNE Smart Assistant template:",error);
  return;
 }
 const chips=sw?["Natafuta simu","Maduka Dar es Salaam","Bidhaa zenye punguzo","Oda zangu","Mapendekezo","Tafuta kwa picha","Reels","Fungua Support Ticket"]:["Find phones","Stores in Dar es Salaam","Discounted products","My orders","Recommendations","Search by image","Reels","Open Support Ticket"];
 const welcome=overlay.querySelector("[data-assistant-welcome]");
 if(welcome) welcome.textContent=sw?"Karibu ZUNE Market! Mimi ni ZUNE Smart Assistant. Uliza kuhusu bidhaa, maduka, chapa, Reels, ofa, oda, malipo, delivery au jinsi ya kutumia huduma za Marketplace.":"Welcome to ZUNE Market! I’m ZUNE Smart Assistant. Ask about products, stores, brands, Reels, deals, orders, payments, delivery or how to use Marketplace services.";
 const chipContainer=overlay.querySelector("[data-assistant-chips]");
 chips.forEach(label=>{const chip=document.createElement("button");chip.type="button";chip.className="z-assistant-chip";chip.textContent=label;chipContainer?.appendChild(chip);});

 document.body.appendChild(overlay);
 const box=overlay.querySelector("#z-assistant-messages"),field=overlay.querySelector("#z-assistant-input");
 const speechStatus=overlay.querySelector("[data-assistant-voice-status]");
 const speechToggle=overlay.querySelector("[data-assistant-speech-toggle]");
 const micButton=overlay.querySelector("[data-assistant-mic]");
 const speechSupported=typeof window!=="undefined"&&!!window.speechSynthesis&&typeof window.SpeechSynthesisUtterance==="function";
 let speechEnabled=!!speechSupported;
 let voiceList=[];
 let speechQueueToken=0,speechQueue=[],speechPlaying=false;
 let recognition=null,recognitionActive=false,recognitionText="";
 const setVoiceStatus=message=>{if(speechStatus)speechStatus.textContent=message||"";};
 const loadVoices=()=>{if(!speechSupported)return[];voiceList=window.speechSynthesis.getVoices()||[];return voiceList;};
 if(speechSupported){loadVoices();window.speechSynthesis.addEventListener?.("voiceschanged",loadVoices);}
 const stopSpeaking=()=>{
  speechQueueToken++;speechQueue.length=0;speechPlaying=false;
  if(speechSupported){try{window.speechSynthesis.cancel();window.speechSynthesis.resume();}catch(_){}}
 };
 const pickVoice=lang=>{
  const voices=loadVoices(),prefix=lang.slice(0,2).toLowerCase();
  const matching=voices.filter(v=>String(v.lang||"").toLowerCase().startsWith(prefix));
  if(!matching.length)return null;
  if(prefix==="sw")return matching.find(v=>String(v.lang||"").toLowerCase()==="sw-tz")||matching[0];
  const preferred=/female|woman|zira|samantha|victoria|karen|susan|ava|aria|jenny/i;
  return matching.find(v=>preferred.test(v.name))||matching[0]||null;
 };
 const playSpeechQueue=token=>{
  if(!speechEnabled||!speechSupported||token!==speechQueueToken||speechPlaying)return;
  const part=speechQueue.shift();
  if(!part){setVoiceStatus("");return;}
  speechPlaying=true;
  const lang=sw?"sw-TZ":"en-US",utterance=new window.SpeechSynthesisUtterance(part);
  const voice=pickVoice(lang);
  utterance.lang=voice?.lang||lang;
  if(voice)utterance.voice=voice;
  utterance.rate=sw?.90:.96;utterance.pitch=1;utterance.volume=1;
  utterance.onstart=()=>setVoiceStatus(sw?"ZUNE inazungumza...":"ZUNE is speaking...");
  utterance.onend=()=>{speechPlaying=false;if(token===speechQueueToken)playSpeechQueue(token);};
  utterance.onerror=event=>{
   speechPlaying=false;
   console.warn("ZUNE speech playback:",event.error);
   if(token===speechQueueToken){
    setVoiceStatus(sw?"Sauti imeshindwa kuchezwa. Angalia mipangilio ya Text-to-Speech kwenye simu.":"Voice playback failed. Check your device Text-to-Speech settings.");
    playSpeechQueue(token);
   }
  };
  try{window.speechSynthesis.resume();window.speechSynthesis.speak(utterance);}
  catch(error){speechPlaying=false;console.error("ZUNE speech playback:",error);setVoiceStatus(sw?"Sauti haipatikani kwenye kifaa hiki.":"Voice is unavailable on this device.");}
 };
 const enqueueSpeech=(text,token)=>{
  if(!speechEnabled||!speechSupported||token!==speechQueueToken||!text)return;
  const clean=String(text).replace(/<[^>]*>/g," ").replace(/https?:\/\/\S+/g,"").replace(/\s+/g," ").trim();
  if(clean.length<2)return;
  speechQueue.push(clean);playSpeechQueue(token);
 };
 const updateSpeechToggle=()=>{
  if(!speechToggle)return;
  speechToggle.textContent=speechEnabled?"🔊 Sauti ON":"🔇 Sauti OFF";
  speechToggle.setAttribute("aria-pressed",String(speechEnabled));
  speechToggle.setAttribute("aria-label",speechEnabled?(sw?"Zima majibu ya sauti":"Turn voice replies off"):(sw?"Washa majibu ya sauti":"Turn voice replies on"));
  speechToggle.title=speechToggle.getAttribute("aria-label");
 };
 updateSpeechToggle();
 if(!speechSupported){speechEnabled=false;updateSpeechToggle();setVoiceStatus(sw?"Usomaji wa sauti hautumiki kwenye browser hii.":"Speech output is not supported by this browser.");}
 speechToggle?.addEventListener("click",()=>{
  speechEnabled=!speechEnabled;
  if(!speechEnabled){stopSpeaking();setVoiceStatus(sw?"Majibu ya sauti yamezimwa.":"Voice replies are off.");}
  else{
   setVoiceStatus(sw?"Sauti imewashwa. Majibu yatasomwa kadiri yanavyoandikwa.":"Voice is on. Replies will be spoken as they appear.");
   const token=speechQueueToken;
   enqueueSpeech(sw?"Sauti ya ZUNE imewashwa.":"ZUNE voice is now on.",token);
  }
  updateSpeechToggle();
 });
 const unlockSpeech=()=>{if(speechEnabled&&speechSupported){try{window.speechSynthesis.resume();}catch(_){}}};
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(SpeechRecognition){
  recognition=new SpeechRecognition();
  recognition.lang=sw?"sw-TZ":"en-US";
  recognition.interimResults=true;recognition.continuous=false;
  recognition.onstart=()=>{recognitionActive=true;recognitionText="";micButton?.classList.add("is-listening");micButton?.setAttribute("aria-pressed","true");setVoiceStatus(sw?"Ninakusikiliza...":"Listening...");};
  recognition.onresult=event=>{
   recognitionText=Array.from(event.results).map(result=>result[0]?.transcript||"").join(" ").trim();
   if(field&&recognitionText)field.value=recognitionText;
  };
  recognition.onerror=event=>{
   const message=event.error==="not-allowed"?(sw?"Ruhusu matumizi ya kipaza sauti kwenye browser.":"Allow microphone access in your browser."):(sw?"Sauti haikutambulika. Jaribu tena.":"Could not recognize speech. Please try again.");
   setVoiceStatus(message);
  };
  recognition.onend=()=>{
   recognitionActive=false;micButton?.classList.remove("is-listening");micButton?.setAttribute("aria-pressed","false");
   const transcript=recognitionText.trim();recognitionText="";
   if(transcript){setVoiceStatus(sw?"Swali limepokelewa.":"Voice question received.");ask(transcript);}
   else if(!speechStatus?.textContent)setVoiceStatus("");
  };
  micButton?.addEventListener("click",()=>{
   if(recognitionActive){recognition.stop();return;}
   try{stopSpeaking();recognition.start();}catch(error){setVoiceStatus(sw?"Kipaza sauti hakiwezi kuanzishwa sasa.":"Microphone cannot start right now.");}
  });
 }else{
  micButton?.setAttribute("disabled","true");micButton?.setAttribute("title",sw?"Voice input haitumiki kwenye browser hii":"Voice input is not supported by this browser");
  setVoiceStatus(sw?"Kifaa au browser hii hakitumii maswali ya sauti.":"Voice input is not supported by this browser.");
 }
 const close=()=>{try{recognition?.stop();}catch(_){}stopSpeaking();overlay.remove();};
 overlay.addEventListener("click",e=>{if(e.target===overlay)close();});overlay.querySelector(".z-assistant-close").addEventListener("click",close);
 let activeTyping=null;
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const say=(html,user=false)=>{
  const d=document.createElement("div");
  d.className="z-assistant-message"+(user?" user":"");
  if(user){d.innerHTML=html;box.appendChild(d);box.scrollTop=box.scrollHeight;return Promise.resolve(d);}
  if(activeTyping)activeTyping.cancelled=true;
  stopSpeaking();
  const stream={cancelled:false,speechToken:speechQueueToken,speechBuffer:""};activeTyping=stream;
  const content=document.createElement("div");
  content.innerHTML=html;
  const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT);
  const textNodes=[];let node;
  while((node=walker.nextNode())){
   if(node.parentElement?.closest("button,a,input,textarea,select,script,style"))continue;
   textNodes.push({node,text:node.nodeValue||""});node.nodeValue="";
  }
  const typing=document.createElement("span");
  typing.className="z-assistant-typing";
  typing.setAttribute("aria-label",sw?"ZUNE inaandika":"ZUNE is typing");
  typing.innerHTML="<i></i><i></i><i></i>";
  const stop=document.createElement("button");
  stop.type="button";stop.className="z-assistant-stop";
  stop.textContent=sw?"Simamisha":"Stop";
  stop.addEventListener("click",()=>{stream.cancelled=true;stopSpeaking();});
  d.append(content,typing,stop);box.appendChild(d);box.scrollTop=box.scrollHeight;
  (async()=>{
   await pause(650);
   for(const part of textNodes){
    const tokens=part.text.match(/\s+|[^\s]+/g)||[];
    for(const token of tokens){
     if(stream.cancelled||!overlay.isConnected)break;
     part.node.nodeValue+=token;
     if(speechEnabled)stream.speechBuffer+=token;
     box.scrollTop=box.scrollHeight;
     if(/^\s+$/.test(token)){
      if(token.includes("\n"))await pause(320);
     }else{
      const sentenceEnd=/[.!?…]$/.test(token);
      const commaEnd=/[,;:]$/.test(token);
      if(sentenceEnd&&stream.speechBuffer.trim()){
       enqueueSpeech(stream.speechBuffer,stream.speechToken);
       stream.speechBuffer="";
      }
      await pause(sentenceEnd?520:commaEnd?320:190);
     }
    }
    if(stream.cancelled||!overlay.isConnected)break;
   }
   if(stream.speechBuffer.trim())enqueueSpeech(stream.speechBuffer,stream.speechToken);
   typing.remove();stop.remove();
   if(activeTyping===stream)activeTyping=null;
  })();
  return Promise.resolve(d);
 };
 const supportLinks=()=>`<div class="z-assistant-support-links"><a href="https://wa.me/255691067855?text=Habari%20ZUNE%20Market%20Support" target="_blank" rel="noopener noreferrer">Chat na Support kupitia WhatsApp</a><a href="https://whatsapp.com/channel/0029Vb98cx12v1J0skZQ5K36" target="_blank" rel="noopener noreferrer">ZUNE Market WhatsApp Channel</a></div>`;

 let assistantStats={queries:0,productsShown:0,ordersLookups:0,ticketsCreated:0};
 const openAssistantPage=page=>{close();renderMarketplacePage(page);};
 const bindActionCards=root=>root?.querySelectorAll("[data-assistant-action]")?.forEach(button=>button.addEventListener("click",()=>{
  const action=button.dataset.assistantAction;
  if(action==="orders"){close();renderMarketplacePage("me").then(()=>document.querySelector("[data-account-orders]")?.click());return;}
  const page={explore:"explore",cart:"cart",saved:"saved",account:"me",features:"features",reels:"reels",live:"live"}[action];
  if(page)openAssistantPage(page);
 }));
 const showActionCards=()=>{
  const labels=sw?[["explore","Tafuta bidhaa"],["cart","Kikapu"],["saved","Wishlist"],["orders","Oda zangu"],["features","Shopping Tools"],["reels","ZUNE Reels"],["account","Akaunti"],["live","Live"]]:[["explore","Explore products"],["cart","Cart"],["saved","Wishlist"],["orders","My orders"],["features","Shopping Tools"],["reels","ZUNE Reels"],["account","Account"],["live","Live"]];
  const node=say((sw?"Chagua hatua unayotaka:":"Choose an action:")+'<div class="z-assistant-action-grid">'+labels.map(([key,label])=>'<button type="button" data-assistant-action="'+key+'">'+safe(label)+' <span>›</span></button>').join("")+'</div>');
  Promise.resolve(node).then(bindActionCards);
 };
 const openImageSearch=()=>{
  close();
  if(homeState.activeTab!=="home"&&homeState.activeTab!=="explore")renderMarketplacePage("home").then(()=>setTimeout(()=>document.getElementById("z-search-image")?.click(),250));
  else document.getElementById("z-search-image")?.click();
 };
 const showSupportTicketForm=()=>{
  if(!homeState.user?.id){say(sw?"Ingia kwenye akaunti kwanza ili kufungua Support Ticket.":"Sign in first to create a Support Ticket.");return;}
  const form=document.createElement("form");form.className="z-assistant-ticket-form";
  const heading=document.createElement("strong");heading.textContent=sw?"Fungua ombi la msaada":"Create a support ticket";
  const category=document.createElement("select");category.required=true;
  [["Order","Oda"],["Account","Akaunti"],["Payment","Malipo"],["Delivery","Delivery"],["Product","Bidhaa"],["Technical","Tatizo la mfumo"],["Other","Nyingine"]].forEach(([en,swLabel])=>{const o=document.createElement("option");o.value=en;o.textContent=sw?swLabel:en;category.appendChild(o);});
  const message=document.createElement("textarea");message.required=true;message.maxLength=1500;message.rows=4;message.placeholder=sw?"Eleza tatizo lako kwa ufupi (usiweke PIN, OTP au nenosiri).":"Describe the issue briefly (never include PIN, OTP or password).";
  const submit=document.createElement("button");submit.type="submit";submit.textContent=sw?"Tuma ombi":"Submit ticket";
  const note=document.createElement("small");note.textContent=sw?"Usijumuishe taarifa za siri.":"Do not include passwords, PINs or OTPs.";
  form.append(heading,category,message,submit,note);box.appendChild(form);box.scrollTop=box.scrollHeight;
  form.addEventListener("submit",async event=>{
   event.preventDefault();if(!message.value.trim())return;submit.disabled=true;submit.textContent=sw?"Inatuma...":"Submitting...";
   const payload={user_id:homeState.user.id,customer_name:String(homeState.accountProfile?.full_name||homeState.user.user_metadata?.full_name||"").slice(0,120),category:category.value,message:message.value.trim().slice(0,1500),status:"open"};
   let result;try{result=await supabase.from("support_tickets").insert(payload).select("id").single();}catch(error){result={error};}
   if(result.error){submit.disabled=false;submit.textContent=sw?"Jaribu tena":"Try again";say(sw?"Ombi halikutumwa. Jaribu tena au tumia WhatsApp Support.":"Ticket submission failed. Try again or contact WhatsApp Support.");return;}
   assistantStats.ticketsCreated++;form.remove();say((sw?"Ombi limepokelewa. Namba ya tiketi: ":"Ticket created. Ticket ID: ")+safe(String(result.data?.id||"").slice(0,8))+"…");
  });
 };
 const showAssistantReport=()=>say((sw?"Ripoti ya kipindi hiki":"This-session assistant report")+':<div class="z-assistant-report-grid"><div><b>'+assistantStats.queries+'</b><small>'+(sw?"Maswali":"Questions")+'</small></div><div><b>'+assistantStats.productsShown+'</b><small>'+(sw?"Bidhaa":"Products shown")+'</small></div><div><b>'+assistantStats.ordersLookups+'</b><small>'+(sw?"Ukaguzi wa oda":"Order lookups")+'</small></div><div><b>'+assistantStats.ticketsCreated+'</b><small>'+(sw?"Tiketi":"Tickets created")+'</small></div></div><small>'+(sw?"Takwimu ni za session hii tu; hazitumwi kama analytics.":"Session-only counters; not sent as analytics.")+'</small>');
 const showMarketplaceIntelligence=async()=>{
  say(sw?"Ninakagua taarifa za Marketplace...":"Checking Marketplace data...");
  const [p,s,c,r]=await Promise.all([
   supabase.from("products").select("id",{count:"exact",head:true}).is("removed_at",null).is("seller_archived_at",null),
   supabase.from("stores").select("id",{count:"exact",head:true}).eq("is_active",true),
   supabase.from("product_categories").select("id",{count:"exact",head:true}).eq("is_active",true),
   supabase.from("zune_reels").select("id",{count:"exact",head:true}).eq("status","published")
  ]);
  const fmt=x=>x.error?"—":String(x.count??0);
  say((sw?"Muhtasari wa Marketplace:":"Marketplace overview:")+'<div class="z-assistant-report-grid"><div><b>'+fmt(p)+'</b><small>Products</small></div><div><b>'+fmt(s)+'</b><small>Stores</small></div><div><b>'+fmt(c)+'</b><small>Categories</small></div><div><b>'+fmt(r)+'</b><small>Published Reels</small></div></div><small>'+(sw?"— inaonyesha sehemu ambayo data haikupatikana. Brand haihesabiwi kwa sababu products haina safu ya brand.":"— means data was unavailable. Brand is not counted because products has no brand column.")+'</small>');
 };
 const showRecommendations=async()=>{
  const tokens=getSwahiliSearchTokens(lastContextQuery||homeState.search||"").filter(x=>x.length>2);
  const result=await supabase.from("products").select("*").is("removed_at",null).is("seller_archived_at",null).order("created_at",{ascending:false}).limit(40);
  if(result.error){say(sw?"Mapendekezo hayapatikani kwa sasa.":"Recommendations are unavailable right now.");return;}
  const rows=(result.data||[]).map(p=>{const text=normalizeSwahiliQuery([p.title,p.description,p.category].filter(Boolean).join(" "));const score=tokens.reduce((sum,t)=>sum+(text.includes(t)?1:0),0)+(Number(p.stock_quantity)>0?.25:0);return{p,score};}).sort((a,b)=>b.score-a.score);
  const selected=rows.slice(0,6).map(x=>x.p);
  if(!selected.length){say(sw?"Hakuna bidhaa za kupendekeza kwa sasa.":"No products are currently available to recommend.");return;}
  assistantStats.productsShown+=selected.length;
  const node=say((sw?"Mapendekezo kutoka bidhaa zilizopo":"Recommendations from listed Marketplace products")+'<div class="z-assistant-recommendations">'+selected.map(p=>'<div><b>'+safe(p.title||"Product")+'</b><small>'+safe(money(Number(p.price||0)))+' · '+(Number(p.stock_quantity)>0?(sw?"Inapatikana":"In stock"):(sw?"Stock haijathibitishwa":"Stock not confirmed"))+'</small><button type="button" data-assistant-product="'+safe(p.id)+'">'+(sw?"Angalia bidhaa":"View product")+'</button></div>').join("")+'</div><small>'+(sw?"Yamepangwa kwa ulinganifu wa mada na stock inayoonekana.":"Ranked by topic overlap and visible stock.")+'</small>');
  Promise.resolve(node).then(root=>root.querySelectorAll("[data-assistant-product]").forEach(button=>button.addEventListener("click",()=>{const p=selected.find(x=>String(x.id)===button.dataset.assistantProduct);if(p){close();openProductDetails(p);}})));
 };

  const remember=q=>{if(!memoryUserId||memoryConsent!=="granted"||sensitiveMemoryQuery(q))return;const key="zune_search_history:"+memoryUserId;try{const old=JSON.parse(localStorage.getItem(key)||"[]");localStorage.setItem(key,JSON.stringify([q,...old.filter(x=>String(x).toLowerCase()!==q.toLowerCase())].slice(0,6)));}catch(_){}};
 const memoryRoot=overlay.querySelector("[data-assistant-memory]");
 const memoryPrompt=overlay.querySelector("[data-assistant-memory-prompt]");
 const memoryStatus=overlay.querySelector("[data-assistant-memory-status]");
 const memoryTitle=overlay.querySelector("[data-assistant-memory-title]");
 const memoryCopy=overlay.querySelector("[data-assistant-memory-copy]");
 const memoryLabel=overlay.querySelector("[data-assistant-memory-label]");
 const memoryUserId=homeState.user?.id?String(homeState.user.id):"";
 const memoryConsentKey=memoryUserId?"zune_assistant_memory_consent:"+memoryUserId:"";
 const memoryDataKey=memoryUserId?"zune_assistant_context_memory:"+memoryUserId:"";
 const readMemory=()=>{try{const value=JSON.parse(localStorage.getItem(memoryDataKey)||"[]");return Array.isArray(value)?value.filter(x=>x&&typeof x.query==="string").slice(0,6):[];}catch(_){return[];}};
 let memoryConsent="session";try{memoryConsent=memoryUserId?(localStorage.getItem(memoryConsentKey)||"unset"):"session";}catch(_){memoryConsent=memoryUserId?"unset":"session";}
 let contextMemory=memoryConsent==="granted"?readMemory():[];
 let lastContextQuery=contextMemory[0]?.query||"";
 let lastKnowledgeTopic=contextMemory[0]?.topic||null;
 const sensitiveMemoryQuery=q=>/(\b(pin|otp|password|nenosiri|nywila|passcode|verification code|card number|cvv|security code)\b|\b(?:\+?255|0)\d{9}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|medical|diagnos|dawa zangu|ugonjwa|hospitali|bank account)/i.test(q);
 const renderMemoryState=()=>{
  if(!memoryRoot)return;
  const granted=memoryConsent==="granted"&&!!memoryUserId;
  if(memoryPrompt)memoryPrompt.hidden=granted||memoryConsent==="denied";
  if(memoryStatus)memoryStatus.hidden=!granted&&memoryConsent!=="denied";
  if(!memoryUserId){
   if(memoryTitle)memoryTitle.textContent=sw?"Kumbukumbu za muda mrefu":"Long-term memory";
   if(memoryCopy)memoryCopy.textContent=sw?"Ingia kwenye akaunti yako ili uweze kuwasha kumbukumbu. Bila ruhusa, mazungumzo yatabaki kwenye kipindi hiki tu.":"Sign in to enable memory. Without consent, conversation context stays in this session only.";
   memoryRoot.querySelector("[data-assistant-memory-allow]")?.setAttribute("hidden","true");
   memoryRoot.querySelector("[data-assistant-memory-decline]")?.setAttribute("hidden","true");
  }else if(!granted&&memoryConsent!=="denied"){
   if(memoryTitle)memoryTitle.textContent=sw?"Ruhusu kumbukumbu?":"Allow memory?";
   if(memoryCopy)memoryCopy.textContent=sw?"ZUNE inaweza kukumbuka mada za mazungumzo ili kuelewa maswali ya ufuatiliaji. Kumbukumbu huhifadhiwa kwenye kifaa hiki tu, chini ya akaunti yako. Unaweza kuziona au kuzifuta wakati wowote. Usiweke PIN, OTP, nywila au taarifa za malipo hapa.":"ZUNE can remember conversation topics to understand follow-up questions. Memory stays on this device, scoped to your account. You can review or erase it anytime. Do not enter PINs, OTPs, passwords or payment details here.";
   const allow=memoryRoot.querySelector("[data-assistant-memory-allow]");
   if(allow)allow.textContent=sw?"Ruhusu kumbukumbu":"Allow memory";
   const decline=memoryRoot.querySelector("[data-assistant-memory-decline]");
   if(decline)decline.textContent=sw?"Sio sasa":"Not now";
  }else if(memoryLabel){
   memoryLabel.textContent=granted?(sw?"Kumbukumbu imewashwa · "+contextMemory.length+" mada":"Memory on · "+contextMemory.length+" topics"):(sw?"Kumbukumbu zimezimwa · kipindi hiki tu":"Memory off · session only");
   const viewButton=memoryRoot.querySelector("[data-assistant-memory-view]");
   const disableButton=memoryRoot.querySelector("[data-assistant-memory-disable]");
   if(viewButton){viewButton.textContent=granted?(sw?"Angalia kumbukumbu":"Review memory"):(sw?"Washa kumbukumbu":"Enable memory");viewButton.hidden=!granted&&memoryConsent!=="denied";}
   if(disableButton){disableButton.textContent=sw?"Zima na futa":"Turn off & erase";disableButton.hidden=!granted;}
  }
 };
 const saveContextMemory=q=>{
  const clean=String(q||"").trim().slice(0,180);
  if(!clean||sensitiveMemoryQuery(clean))return;
  lastContextQuery=clean;
  if(memoryConsent!=="granted"||!memoryUserId)return;
  contextMemory=[{query:clean,topic:lastKnowledgeTopic,at:Date.now()},...contextMemory.filter(x=>x.query.toLowerCase()!==clean.toLowerCase())].slice(0,6);
  try{localStorage.setItem(memoryDataKey,JSON.stringify(contextMemory));}catch(_){setVoiceStatus(sw?"Kumbukumbu hazikuweza kuhifadhiwa kwenye kifaa hiki.":"Memory could not be saved on this device.");}
  renderMemoryState();
 };
 memoryRoot?.querySelector("[data-assistant-memory-allow]")?.addEventListener("click",()=>{
  if(!memoryUserId)return;
  memoryConsent="granted";
  try{localStorage.setItem(memoryConsentKey,"granted");}catch(_){}
  renderMemoryState();
  setVoiceStatus(sw?"Kumbukumbu zimewashwa. Unaweza kuzifuta wakati wowote.":"Memory is on. You can erase it anytime.");
 });
 memoryRoot?.querySelector("[data-assistant-memory-decline]")?.addEventListener("click",()=>{
  memoryConsent="denied";
  try{localStorage.removeItem(memoryDataKey);localStorage.setItem(memoryConsentKey,"denied");}catch(_){}
  renderMemoryState();
  setVoiceStatus(sw?"Sawa. Mazungumzo yatakumbukwa kwenye kipindi hiki tu.":"Okay. Context will stay in this session only.");
 });
 memoryRoot?.querySelector("[data-assistant-memory-view]")?.addEventListener("click",()=>{
  if(memoryConsent!=="granted"){memoryConsent="granted";try{localStorage.setItem(memoryConsentKey,"granted");}catch(_){}renderMemoryState();setVoiceStatus(sw?"Kumbukumbu zimewashwa.":"Memory is on.");return;}
  const items=contextMemory.map((item,index)=>(index+1)+". "+safe(item.query)).join("<br>");
  say(items?(sw?"Mada zilizohifadhiwa:<br>":"Saved topics:<br>")+items:(sw?"Bado hakuna mada zilizohifadhiwa.":"No topics have been saved yet."));
 });
 memoryRoot?.querySelector("[data-assistant-memory-disable]")?.addEventListener("click",()=>{
  memoryConsent="denied";contextMemory=[];lastContextQuery="";lastKnowledgeTopic=null;
  try{localStorage.removeItem(memoryDataKey);localStorage.setItem(memoryConsentKey,"denied");}catch(_){}
  renderMemoryState();
  setVoiceStatus(sw?"Kumbukumbu zimezimwa na kufutwa kwenye kifaa hiki.":"Memory is off and has been erased from this device.");
 });
 renderMemoryState();
 let smallTalkTurn=0;
 const smallTalkReply=input=>{
  const text=normalizeSwahiliQuery(input).trim();
  const replies=sw?{
   greeting:["Poa kabisa! 😄 Wewe vipi? Nikusaidie nini leo?","Salama kabisa! 😊 Karibu ZUNE Market. Kuna jambo nikusaidie?","Niko fresh! 😃 Tuambie, leo tunatafuta nini?"],
   wellbeing:["Niko vizuri, asante kwa kuuliza! 😊 Wewe unaendeleaje?","Niko tayari kukusaidia muda wowote! 😄 Habari zako?"],
   morning:["Habari za asubuhi! ☀️ Nakutakia siku njema. Nikusaidie nini leo?"],
   evening:["Habari za jioni! 🌆 Karibu, nikusaidie nini?"],
   night:["Usiku mwema! 🌙 Kama una swali lolote, niko hapa kukusaidia."],
   thanks:["Karibu sana! 😊 Nimefurahi kusaidia.","Usijali kabisa! ❤️ Ukiwa na swali lingine niambie."],
   apology:["Hakuna shida kabisa. 😊 Tuendelee, ungependa nikusaidie nini?"],
   goodbye:["Kwaheri! 👋 Asante kwa kutumia ZUNE Market. Karibu tena!","Tutaonana tena! 😊 Nakutakia siku njema."],
   praise:["Asante sana! 🥰 Tunajitahidi kufanya ZUNE Market iwe rahisi na bora zaidi."]
  }:{
   greeting:["Doing great! 😄 How are you? What can I help you with today?","All good here! 😊 Welcome to ZUNE Market. What can I help you find?"],
   wellbeing:["I’m doing well, thanks for asking! 😊 How are you?","Ready to help! 😃 What would you like to do today?"],
   morning:["Good morning! ☀️ Hope you have a great day. How can I help?"],
   evening:["Good evening! 🌆 Welcome. What can I help you with?"],
   night:["Good night! 🌙 I’m here if you need help with anything."],
   thanks:["You’re very welcome! 😊 Happy to help.","Anytime! ❤️ Let me know if you need anything else."],
   apology:["No worries at all. 😊 What would you like help with?"],
   goodbye:["Goodbye! 👋 Thanks for using ZUNE Market. See you again!","Take care! 😊 You’re always welcome back."],
   praise:["Thank you! 🥰 We’re working to make ZUNE Market better and easier to use."]
  };
  const pick=key=>{const list=replies[key];return list[smallTalkTurn++%list.length];};
  if(/^(mambo|vipi|poa|niaje|sasa|habari|hujambo|salama|shikamoo|marahaba|hello|hi|hey|heya|yo)( kabisa)?$/.test(text))return pick("greeting");
  if(/^(ukoje|unaendeleaje|habari yako|habari za kwako|how are you|how are you doing|how do you do|are you okay|are you good)$/.test(text))return pick("wellbeing");
  if(/^(habari za asubuhi|asubuhi njema|good morning)$/.test(text))return pick("morning");
  if(/^(habari za jioni|jioni njema|good evening)$/.test(text))return pick("evening");
  if(/^(habari za usiku|usiku mwema|good night|goodnight)$/.test(text))return pick("night");
  if(/^(asante|asanteni|shukrani|ahsante|thanks|thank you|thankyou|thx|cheers)$/.test(text))return pick("thanks");
  if(/^(samahani|nisamehe|pole|sorry|my apologies)$/.test(text))return pick("apology");
  if(/^(kwaheri|tutaonana|baadaye|bye|goodbye|see you|see you later|see ya)$/.test(text))return pick("goodbye");
  if(/^(hongera|vizuri sana|umesaidia|you are great|you are helpful|well done|nice work)$/.test(text))return pick("praise");
  return null;
 };
 const ask=async raw=>{
  const q=String(raw||"").trim();if(!q)return;
  if(activeTyping)activeTyping.cancelled=true;
  stopSpeaking();
  const previousContextQuery=lastContextQuery;
  say(safe(q),true);field.value="";
  const n=normalizeSwahiliQuery(q),has=(...a)=>a.some(x=>n.includes(x));
  const followUp=/^(?:bei yake|bei gani|na nyingine|na hii|hiyo|hiyo je|its price|how much is it|and this|that one|another one|more like this)(?:\s|$)/i.test(n);
  const activeSearchText=followUp&&previousContextQuery?previousContextQuery:q;
  const chatReply=smallTalkReply(q);
  if(chatReply){say(chatReply);return;}
  assistantStats.queries++;
  remember(q);
  if(/(?:support ticket|ticket ya msaada|fungua tiketi|fungua ticket|create ticket)/i.test(n)){showSupportTicketForm();return;}
  if(/(?:ripoti ya assistant|assistant report|usage report|ripoti ya matumizi)/i.test(n)){showAssistantReport();return;}
  if(/(?:search by image|visual search|tafuta kwa picha|kutafuta kwa picha|picha ya bidhaa)/i.test(n)){openImageSearch();return;}
  if(/(?:recommend|mapendekezo|nipendekezee|pendekeza bidhaa)/i.test(n)){showRecommendations();return;}
  if(/(?:marketplace overview|marketplace intelligence|muhtasari wa marketplace|takwimu za marketplace|hali ya marketplace)/i.test(n)){showMarketplaceIntelligence();return;}
  if(/(?:show actions|action cards|quick actions|vitendo vya haraka|menu ya assistant)/i.test(n)){showActionCards();return;}
  if(/(?:^reels?$|open reels|zune reels|angalia reels|video fupi)/i.test(n)){openAssistantPage("reels");return;}
  if(has("track","fuatilia","hali ya oda","order status","oda zangu","my orders")){
   if(!homeState.user?.id){say(sw?"Ingia kwenye akaunti yako ili kuona oda zako binafsi.":"Sign in to view your private orders.");return;}
   assistantStats.ordersLookups++;
   const result=await supabase.from("orders").select("id,order_number,public_order_id,status,payment_status,created_at,total_price").eq("buyer_id",homeState.user.id).order("created_at",{ascending:false}).limit(6);
   if(result.error){say(sw?"Sijaweza kusoma oda zako kwa sasa. Fungua Akaunti kisha Oda Zangu au wasiliana na Support.":"I could not read your orders right now. Open Account → My Orders or contact Support.");return;}
   const orders=result.data||[];
   if(!orders.length){say(sw?"Sijaona oda kwenye akaunti hii bado.":"No orders were found for this account yet.");return;}
   const cards=orders.map(o=>'<div class="z-assistant-order"><b>'+(sw?"Oda ":"Order ")+safe(o.order_number||o.public_order_id||String(o.id).slice(0,8))+'</b><small>'+safe(String(o.status||"unknown"))+' · '+safe(String(o.payment_status||"payment status not listed"))+' · '+safe(money(Number(o.total_price||0)))+'</small><small>'+safe(o.created_at?new Date(o.created_at).toLocaleDateString(sw?"sw-TZ":"en-US"):"")+'</small></div>').join("");
   const orderMessage=say((sw?"Oda zako za hivi karibuni (akaunti yako tu):":"Your recent orders (your account only):")+cards+'<button type="button" data-assistant-action="orders">'+(sw?"Fungua Oda Zangu":"Open My Orders")+'</button>');Promise.resolve(orderMessage).then(bindActionCards);return;
  }
  const knowledge=answerZuneKnowledge(q,language(),lastKnowledgeTopic);
  if(knowledge){lastKnowledgeTopic=knowledge.topic;saveContextMemory(q);if(memoryConsent==="granted"&&contextMemory[0]){contextMemory[0].topic=knowledge.topic;try{localStorage.setItem(memoryDataKey,JSON.stringify(contextMemory));}catch(_){}}const needsSupport=["support","support-tickets","disputes"].includes(knowledge.topic);say(safe(knowledge.answer).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>")+(needsSupport?"<br>"+supportLinks():""));return;}
  saveContextMemory(followUp&&previousContextQuery?previousContextQuery:q);

  if(has("oda","order","nunua","buy","agiz","cart","kikapu")){say(sw?"Fungua bidhaa, chagua variant na idadi, kisha bonyeza Weka Kikapuni. Fungua Kikapu kuendelea na checkout.":"Open a product, choose a variant and quantity, then tap Add to Cart. Open your Cart to continue checkout.");return;}
  if(has("delivery","usafiri","dereva","driver","kusafir","fikisha")){say(sw?"Delivery hutegemea duka, bidhaa na eneo lako. Thibitisha upatikanaji, gharama na muda wa kufikishiwa na duka kabla ya kulipa.":"Delivery depends on the store, product and your location. Confirm availability, cost and timing with the store before payment.");return;}
  if(has("malipo","payment","lipa","kulipa","airtel","mpesa","tigopesa","mixx","visa","mastercard")){say(sw?"Njia halisi zinazopatikana kwa oda yako zitaonyeshwa kwenye checkout. Hakiki kiasi na mpokeaji kabla ya kuthibitisha.":"Payment methods available for your order are shown at checkout. Verify the amount and recipient before confirming.");return;}
  if(has("refund","rejesh","return","rudish","cancel","futa oda")){say(sw?"Kughairi oda, kurudisha bidhaa au kurejeshewa fedha hutegemea hatua ya oda na masharti ya duka. Kagua Oda Zangu au wasiliana na msaada rasmi wa ZUNE.":"Cancellations, returns and refunds depend on the order stage and store terms. Check My Orders or contact official ZUNE support.");return;}
  if(has("akaunti","account","login","ingia","jisajili","signup","password","nenosiri")){say(sw?"Tumia sehemu ya Akaunti kwenye menyu ya Marketplace kuingia, kujisajili na kusimamia taarifa zako. Usishiriki nenosiri au OTP.":"Use Account in Marketplace navigation to sign in, register and manage your details. Never share your password or OTP.");return;}
  if(has("help","msaada","support","wasilian","contact","huduma","whatsapp")){say((sw?"Kwa msaada wa ZUNE Market, wasiliana nasi kupitia WhatsApp au jiunge na Channel kwa matangazo. Usitume PIN, OTP au nenosiri.":"For ZUNE Market help, contact us on WhatsApp or join the Channel for announcements. Never share your PIN, OTP or password.")+"<br>"+supportLinks());return;}
  const wantsComparison=/(linganisha|compare|comparison|tofauti kati ya|\bversus\b|\bvs\b)/i.test(n);
  const comparisonTerms=wantsComparison?String(q).split(/\s+(?:na|and|vs|versus)\s+/i).map(x=>x.replace(/linganisha|compare|comparison|tofauti kati ya/gi," ").replace(/[?!,.;]+/g," ").trim()).filter(x=>x.length>1).slice(0,4):[];
  const wantsDeals=has("punguzo","discount","sale","oferta","deals");
  const inStockOnly=has("stock iliyopo","zilizopo","in stock","available now","bidhaa zilizopo","bado zipo");
  const sortMode=has("bei nafuu","cheap","cheapest","lowest price","bei ndogo")?"price_low":has("ghali zaidi","most expensive","highest price","bei kubwa")?"price_high":"recent";
  const parseBudgetValue=(raw,suffix)=>{
   const value=Number(String(raw||"").replace(/,/g,""));
   if(!Number.isFinite(value)||value<=0)return null;
   return value*(String(suffix||"").toLowerCase()==="k"?1000:String(suffix||"").toLowerCase()==="m"?1000000:1);
  };
  let searchText=activeSearchText;
  let minBudget=null,maxBudget=null;
  const maxBudgetMatch=searchText.match(/(?:chini ya|isizidi|hadi|under|below|less than|max(?:imum)?|budget(?: ya)?|at most)\s*(?:tsh|tzs)?\s*([\d,]+(?:\.\d+)?)\s*([km])?/i);
  const minBudgetMatch=searchText.match(/(?:kuanzia|zaidi ya|kuvuka|above|over|from|at least)\s*(?:tsh|tzs)?\s*([\d,]+(?:\.\d+)?)\s*([km])?/i);
  if(maxBudgetMatch){maxBudget=parseBudgetValue(maxBudgetMatch[1],maxBudgetMatch[2]);searchText=searchText.replace(maxBudgetMatch[0]," ");}
  if(minBudgetMatch){minBudget=parseBudgetValue(minBudgetMatch[1],minBudgetMatch[2]);searchText=searchText.replace(minBudgetMatch[0]," ");}
  searchText=searchText.replace(/\b(?:tsh|tzs|shilingi|shs|bei nafuu|cheap|cheapest|lowest price|bei ndogo|ghali zaidi|most expensive|highest price|bei kubwa|zilizopo|in stock|available now|bidhaa zilizopo|bado zipo|punguzo|discount|sale|oferta|deals|nataka|tafuta|kutafuta|nunua|kununua|agiza|kuagiza|naomba|onyesha|nionyeshe|nipatie|tafadhali|bidhaa|please|find|show|search|the|for|with|za|zaidi|ya|wa|wao|ni|na|je|gani|kwenye|marketplace|chini|hadi|under|below|above|over|price|bei)\b/gi," ").replace(/\s+/g," ").trim();
  const stop=new Set(["nataka","tafuta","kutafuta","nunua","kununua","agiza","kuagiza","naomba","onyesha","nionyeshe","nipatie","tafadhali","bidhaa","duka","maduka","please","find","show","search","the","for","with","za","zaidi","ya","wa","wao","ni","na","je","gani","kwenye","marketplace","under","below","chini","above","over","bei","price","punguzo","discount","sale","oferta","deals","in","stock","tsh","tzs","shilingi"]);
  let query=getSwahiliSearchTokens(searchText).filter(x=>x.length>1&&!stop.has(x)).slice(0,6).join(" ").trim();
  if(!query&&wantsDeals)query="__deals__";
  if(!query&&!maxBudget&&!minBudget&&!inStockOnly){say(sw?"Taja jina au aina ya bidhaa unayotafuta, au eleza bajeti yako.":"Tell me the product or category you want, or describe your budget.");return;}
  say(sw?"Natafuta bidhaa zinazolingana kwenye ZUNE Market...":"Finding matching products in ZUNE Market...");
  try{
   const term=query==="__deals__"?"":query.replace(/[%_,().*]/g," ").replace(/\s+/g," ").trim(),pattern="%"+term+"%";
   let productQuery=supabase.from("products").select("*").is("removed_at",null).is("seller_archived_at",null);
   if(term)productQuery=productQuery.or("title.ilike."+pattern+",description.ilike."+pattern+",category.ilike."+pattern);
   if(maxBudget)productQuery=productQuery.lte("price",maxBudget);
   if(minBudget)productQuery=productQuery.gte("price",minBudget);
   if(inStockOnly)productQuery=productQuery.gt("stock_quantity",0);
   productQuery=sortMode==="recent"?productQuery.order("created_at",{ascending:false}):productQuery.order("price",{ascending:sortMode==="price_low"});
   const [pRes,sRes,cRes,comparisonRes]=await Promise.all([
    productQuery.limit(wantsDeals?60:20),
    (!term||wantsDeals||wantsComparison)?Promise.resolve({data:[],error:null}):supabase.from("stores").select("id,owner_id,store_name,verification_status,logo_url,description,region,district").eq("is_active",true).or("store_name.ilike."+pattern+",description.ilike."+pattern+",region.ilike."+pattern+",district.ilike."+pattern).limit(8),
    (!term||wantsDeals||wantsComparison)?Promise.resolve({data:[],error:null}):supabase.from("product_categories").select("id,name,parent_id").eq("is_active",true).ilike("name",pattern).limit(10),
    wantsComparison?Promise.all(comparisonTerms.map(name=>{const safeTerm=name.replace(/[%_,().*]/g," ").replace(/\s+/g," ").trim();const like="%"+safeTerm+"%";return supabase.from("products").select("*").is("removed_at",null).is("seller_archived_at",null).or("title.ilike."+like+",description.ilike."+like+",category.ilike."+like).limit(5);})):Promise.resolve([])
   ]);
   const comparisonProducts=wantsComparison?Array.from(new Map(comparisonRes.flatMap(r=>r.error?[]:(r.data||[])).map(p=>[String(p.id),p])).values()):[];
   const products=pRes.error?[]:(pRes.data||[]),stores=sRes.error?[]:(sRes.data||[]),categories=cRes.error?[]:(cRes.data||[]);
   assistantStats.productsShown+=products.length;
   const brands=[];
   const deals=products.filter(p=>Number(p.discount_percent||p.discount_percentage||p.discount||0)>0||Number(p.compare_at_price||p.original_price||0)>Number(p.price||0)).slice(0,6);
   if(wantsComparison){
    const chosen=comparisonProducts.slice(0,4);
    if(chosen.length<2){say(sw?"Nimepata bidhaa chache kwa ulinganisho. Taja majina mawili ya bidhaa tofauti, kwa mfano: Linganisha iPhone 15 na Samsung S24.":"I found too few products to compare. Name two different products, for example: Compare iPhone 15 and Samsung S24.");return;}
    const value=(p,keys)=>{for(const key of keys){const v=p?.[key];if(v!==undefined&&v!==null&&v!==""&&typeof v!=="object")return String(v);}return "";};
    const rows=[
     {label:sw?"Chapa":"Brand",keys:["brand","brand_name"]},
     {label:sw?"Bei":"Price",keys:["price"],format:v=>money(Number(v))},
     {label:sw?"Bei ya awali":"Original price",keys:["compare_at_price","original_price"],format:v=>money(Number(v))},
     {label:sw?"Stock":"Stock",keys:["stock_quantity"],format:v=>Number(v)>0?(sw?"Inapatikana ("+v+")":"In stock ("+v+")"):(sw?"Haipo/haijatajwa":"Unavailable/not listed")},
     {label:sw?"Category":"Category",keys:["category","category_name"]},
     {label:sw?"Hali":"Condition",keys:["condition"]},
     {label:sw?"Warranty":"Warranty",keys:["warranty","warranty_period"]},
     {label:sw?"Maelezo":"Description",keys:["description"]}
    ];
    const table='<div style="overflow-x:auto;margin-top:10px"><table style="width:100%;border-collapse:collapse;min-width:440px;font-size:12px"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #ccd8d0">'+(sw?"Kipengele":"Feature")+'</th>'+chosen.map(p=>'<th style="text-align:left;padding:8px;border-bottom:1px solid #ccd8d0">'+safe(p.title||"Product")+'</th>').join("")+'</tr></thead><tbody>'+rows.map(row=>'<tr><th style="text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #e1e8e3">'+row.label+'</th>'+chosen.map(p=>{const v=value(p,row.keys);return '<td style="vertical-align:top;padding:8px;border-bottom:1px solid #e1e8e3">'+(v?safe(row.format?row.format(v):v):'<span style="opacity:.65">'+(sw?"Haijawekwa":"Not listed")+'</span>')+'</td>';}).join("")+'</tr>').join("")+'</tbody></table></div>';
    const available=chosen.filter(p=>Number(p.stock_quantity)>0);
    const priced=available.filter(p=>Number(p.price)>0).sort((a,b)=>Number(a.price)-Number(b.price));
    const recommendation=priced.length?'<p style="margin-top:10px"><strong>'+ (sw?"Pendekezo la bei":"Price pick") +':</strong> '+safe(priced[0].title)+' — '+safe(money(Number(priced[0].price)))+(sw?", ina stock.":"; in stock.")+'</p>':(sw?"<p>Stock au bei hazijatosha kutoa pendekezo la moja kwa moja. Hakiki taarifa kwenye ukurasa wa bidhaa.</p>":"<p>There is not enough stock or price data for a confident pick. Verify details on each product page.</p>");
    const actions=chosen.map(p=>'<button type="button" data-assistant-product="'+safe(p.id)+'" style="margin:5px 5px 0 0">'+(sw?"Angalia ":"View ")+safe(p.title||"Product")+'</button>').join("");
    say((sw?"Ulinganisho wa bidhaa (taarifa zilizopo kwenye Marketplace):":"Product comparison (available Marketplace data):")+table+recommendation+'<p style="margin-top:10px">'+actions+'</p><small>'+(sw?"Sehemu zisizo na taarifa zimeachwa wazi; hakiki variant, bei na stock kabla ya kununua.":"Missing fields are marked as not listed; verify variant, price and stock before buying.")+'</small>');
    box.querySelectorAll("[data-assistant-product]").forEach(b=>b.onclick=()=>{const p=chosen.find(x=>String(x.id)===b.dataset.assistantProduct);if(p){close();openProductDetails(p);}});
    return;
   }
   const sections=[];
   if(products.length)sections.push('<section><strong>'+(sw?"Bidhaa zinazolingana":"Matching products")+'</strong>'+products.slice(0,8).map(p=>{const oldPrice=Number(p.compare_at_price||p.original_price||0),price=Number(p.price||0),stock=p.stock_quantity==null?null:Number(p.stock_quantity),discount=Number(p.discount_percent||p.discount_percentage||p.discount||0);return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;padding:8px;border:1px solid #e1ebe4;border-radius:10px"><span style="min-width:0"><b>'+safe(p.title||"Bidhaa")+'</b><br><small>'+safe(money(price))+(oldPrice>price?' · <s>'+safe(money(oldPrice))+'</s>':"")+'</small><br><small>'+(stock===null?(sw?"Stock haijatajwa":"Stock not listed"):stock>0?(sw?"Inapatikana: ":"In stock: ")+stock:(sw?"Imeisha":"Out of stock"))+(discount>0?' · '+discount+'% OFF':"")+'</small></span><button type="button" data-assistant-product="'+safe(p.id)+'">'+(sw?"Angalia":"View")+'</button></div>';}).join("")+'</section>');
   if(stores.length)sections.push('<section style="margin-top:13px"><strong>'+(sw?"Maduka":"Stores")+'</strong>'+stores.map(st=>'<div style="margin-top:7px"><button type="button" data-assistant-store="'+safe(st.owner_id)+'">'+safe(st.store_name||"Store")+'</button><small> '+safe([st.district,st.region].filter(Boolean).join(", "))+'</small>'+(["verified","approved"].includes(String(st.verification_status||"").toLowerCase())?" ✓":"")+'</div>').join("")+'</section>');
   if(categories.length)sections.push('<section style="margin-top:13px"><strong>Categories</strong><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">'+categories.map(c=>'<button type="button" data-assistant-category="'+safe(c.name)+'">'+safe(c.name)+'</button>').join("")+'</div></section>');
   if(brands.length)sections.push('<section style="margin-top:13px"><strong>'+(sw?"Chapa":"Brands")+'</strong><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">'+brands.map(b=>'<button type="button" data-assistant-brand="'+safe(b)+'">'+safe(b)+'</button>').join("")+'</div></section>');
   if(deals.length)sections.push('<section style="margin-top:13px"><strong>'+(sw?"Bidhaa zenye punguzo":"Discounted products")+'</strong>'+deals.map(p=>'<div style="margin-top:6px"><button type="button" data-assistant-product="'+safe(p.id)+'">'+safe(p.title)+'</button></div>').join("")+'</section>');
   if(!sections.length){say((sw?"Sijapata bidhaa inayolingana na vigezo hivi kwenye ZUNE Market. Jaribu kuongeza bajeti, kuondoa kichujio cha stock au kutumia jina jingine.":"No products matched these filters in ZUNE Market. Try increasing the budget, removing the stock filter or using another product name.")+"<br>"+supportLinks());return;}
   const criteria=[maxBudget?(sw?"Bajeti hadi "+money(maxBudget):"Budget up to "+money(maxBudget)):null,minBudget?(sw?"Kuanzia "+money(minBudget):"From "+money(minBudget)):null,inStockOnly?(sw?"Zilizo stock":"In stock only"):null,sortMode==="price_low"?(sw?"Bei ndogo kwanza":"Lowest price first"):sortMode==="price_high"?(sw?"Bei kubwa kwanza":"Highest price first"):null].filter(Boolean);
   say((sw?"Matokeo ya Marketplace:":"Marketplace matches:")+(products.length?"<br>"+(sw?"Bidhaa: ":"Products: ")+products.length:"")+(stores.length?" · "+(sw?"Maduka: ":"Stores: ")+stores.length:"")+(criteria.length?"<br><small>"+criteria.map(safe).join(" · ")+"</small>":"")+"<br>"+sections.join(""));
   box.querySelectorAll("[data-assistant-product]").forEach(b=>b.onclick=()=>{const p=products.find(x=>String(x.id)===b.dataset.assistantProduct);if(p){close();openProductDetails(p);}});
   box.querySelectorAll("[data-assistant-store]").forEach(b=>b.onclick=()=>{close();openStoreDetails(b.dataset.assistantStore);});
   box.querySelectorAll("[data-assistant-category]").forEach(b=>b.onclick=()=>{close();homeState.search="";homeState.selectedCategory=b.dataset.assistantCategory;homeState.page=0;homeState.products=[];homeState.hasMore=true;renderMarketplacePage("explore");loadProducts(true);});
   box.querySelectorAll("[data-assistant-brand]").forEach(b=>b.onclick=()=>{close();homeState.search=b.dataset.assistantBrand;homeState.selectedCategory="";homeState.page=0;homeState.products=[];homeState.hasMore=true;renderMarketplacePage("explore");loadProducts(true);});
  }catch(e){console.error("ZUNE Universal Search assistant:",e);say((sw?"Utafutaji wa ZUNE Market haupatikani kwa sasa. Tafadhali jaribu tena au wasiliana na Support.":"ZUNE Market search is temporarily unavailable. Please try again or contact Support.")+"<br>"+supportLinks());}
 };
 overlay.querySelector("#z-assistant-form").onsubmit=e=>{e.preventDefault();unlockSpeech();ask(field.value);};
 overlay.querySelectorAll(".z-assistant-chip").forEach(b=>b.onclick=()=>{unlockSpeech();ask(b.textContent);});
 initializePremiumAssistant({overlay,sw,ask,close,stopSpeaking,setVoiceStatus,speechToggle,micButton,field,box,homeState});
 field.focus();

}
