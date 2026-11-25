import { answerZuneKnowledge } from "./zune-knowledge.js?v=20261125-knowledge-5";
import { normalizeSwahiliQuery, getSwahiliSearchTokens } from "./swahili-language.js?v=20261125-sw2";

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
  const response=await fetch(new URL("./smart-assistant.html",import.meta.url),{cache:"force-cache"});
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
 const chips=sw?["Natafuta simu","Maduka Dar es Salaam","Bidhaa zenye punguzo","Jinsi ya kufuatilia oda?","Njia za malipo"]:["Find phones","Stores in Dar es Salaam","Discounted products","Track my order","Payment methods"];
 const welcome=overlay.querySelector("[data-assistant-welcome]");
 if(welcome) welcome.textContent=sw?"Karibu ZUNE Market! Mimi ni ZUNE Smart Assistant. Uliza kuhusu bidhaa, maduka, chapa, Reels, ofa, oda, malipo, delivery au jinsi ya kutumia huduma za Marketplace.":"Welcome to ZUNE Market! I’m ZUNE Smart Assistant. Ask about products, stores, brands, Reels, deals, orders, payments, delivery or how to use Marketplace services.";
 const chipContainer=overlay.querySelector("[data-assistant-chips]");
 chips.forEach(label=>{const chip=document.createElement("button");chip.type="button";chip.className="z-assistant-chip";chip.textContent=label;chipContainer?.appendChild(chip);});

 document.body.appendChild(overlay);const close=()=>overlay.remove();
 overlay.addEventListener("click",e=>{if(e.target===overlay)close();});overlay.querySelector(".z-assistant-close").addEventListener("click",close);
 const box=overlay.querySelector("#z-assistant-messages"),field=overlay.querySelector("#z-assistant-input");
 let activeTyping=null;
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const say=(html,user=false)=>{
  const d=document.createElement("div");
  d.className="z-assistant-message"+(user?" user":"");
  if(user){d.innerHTML=html;box.appendChild(d);box.scrollTop=box.scrollHeight;return Promise.resolve(d);}
  if(activeTyping)activeTyping.cancelled=true;
  const stream={cancelled:false};activeTyping=stream;
  const content=document.createElement("div");
  content.innerHTML=html;
  const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT);
  const textNodes=[];let node;
  while((node=walker.nextNode())){textNodes.push({node,text:node.nodeValue||""});node.nodeValue="";}
  const typing=document.createElement("span");
  typing.className="z-assistant-typing";
  typing.setAttribute("aria-label",sw?"ZUNE inaandika":"ZUNE is typing");
  typing.innerHTML="<i></i><i></i><i></i>";
  const stop=document.createElement("button");
  stop.type="button";stop.className="z-assistant-stop";
  stop.textContent=sw?"Simamisha":"Stop";
  stop.addEventListener("click",()=>{stream.cancelled=true;});
  d.append(content,typing,stop);box.appendChild(d);box.scrollTop=box.scrollHeight;
  (async()=>{
   await pause(450);
   for(const part of textNodes){
    const tokens=part.text.match(/\s+|[^\s]+/g)||[];
    for(const token of tokens){
     if(stream.cancelled||!overlay.isConnected)break;
     part.node.nodeValue+=token;
     box.scrollTop=box.scrollHeight;
     if(/^\s+$/.test(token)){
      if(token.includes("\n"))await pause(190);
     }else{
      const sentenceEnd=/[.!?…]$/.test(token);
      const commaEnd=/[,;:]$/.test(token);
      await pause(sentenceEnd?280:commaEnd?165:82);
     }
    }
    if(stream.cancelled||!overlay.isConnected)break;
   }
   typing.remove();stop.remove();
   if(activeTyping===stream)activeTyping=null;
  })();
  return Promise.resolve(d);
 };
 const supportLinks=()=>`<div class="z-assistant-support-links"><a href="https://wa.me/255691067855?text=Habari%20ZUNE%20Market%20Support" target="_blank" rel="noopener noreferrer">WhatsApp Support · 0691067855</a><a href="https://whatsapp.com/channel/0029Vb98cx12v1J0skZQ5K36" target="_blank" rel="noopener noreferrer">ZUNE Market WhatsApp Channel</a></div>`;
  const remember=q=>{const key="zune_search_history:"+(homeState.user?.id||"guest");try{const old=JSON.parse(localStorage.getItem(key)||"[]");localStorage.setItem(key,JSON.stringify([q,...old.filter(x=>String(x).toLowerCase()!==q.toLowerCase())].slice(0,6)));}catch(_){}};
 let lastKnowledgeTopic=null;
 const ask=async raw=>{
  const q=String(raw||"").trim();if(!q)return;say(safe(q),true);field.value="";remember(q);
  const n=normalizeSwahiliQuery(q),has=(...a)=>a.some(x=>n.includes(x));
  const knowledge=answerZuneKnowledge(q,language(),lastKnowledgeTopic);
  if(knowledge){lastKnowledgeTopic=knowledge.topic;const needsSupport=["support","support-tickets","disputes"].includes(knowledge.topic);say(safe(knowledge.answer).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br>")+(needsSupport?"<br>"+supportLinks():""));return;}
  if(has("track","fuatilia","hali ya oda","order status")){say(sw?"Fungua Akaunti/Oda Zangu ili kuona hatua ya oda zako. Taarifa binafsi zinaonekana kwa akaunti husika tu.":"Open Account/My Orders to view your order status. Private order details are only available to the signed-in account.");return;}
  if(has("oda","order","nunua","buy","agiz","cart","kikapu")){say(sw?"Fungua bidhaa, chagua variant na idadi, kisha bonyeza Weka Kikapuni. Fungua Kikapu kuendelea na checkout.":"Open a product, choose a variant and quantity, then tap Add to Cart. Open your Cart to continue checkout.");return;}
  if(has("delivery","usafiri","dereva","driver","kusafir","fikisha")){say(sw?"Delivery hutegemea duka, bidhaa na eneo lako. Thibitisha upatikanaji, gharama na muda wa kufikishiwa na duka kabla ya kulipa.":"Delivery depends on the store, product and your location. Confirm availability, cost and timing with the store before payment.");return;}
  if(has("malipo","payment","lipa","kulipa","airtel","mpesa","tigopesa","mixx","visa","mastercard")){say(sw?"Njia halisi zinazopatikana kwa oda yako zitaonyeshwa kwenye checkout. Hakiki kiasi na mpokeaji kabla ya kuthibitisha.":"Payment methods available for your order are shown at checkout. Verify the amount and recipient before confirming.");return;}
  if(has("refund","rejesh","return","rudish","cancel","futa oda")){say(sw?"Kughairi oda, kurudisha bidhaa au kurejeshewa fedha hutegemea hatua ya oda na masharti ya duka. Kagua Oda Zangu au wasiliana na msaada rasmi wa ZUNE.":"Cancellations, returns and refunds depend on the order stage and store terms. Check My Orders or contact official ZUNE support.");return;}
  if(has("akaunti","account","login","ingia","jisajili","signup","password","nenosiri")){say(sw?"Tumia sehemu ya Akaunti kwenye menyu ya Marketplace kuingia, kujisajili na kusimamia taarifa zako. Usishiriki nenosiri au OTP.":"Use Account in Marketplace navigation to sign in, register and manage your details. Never share your password or OTP.");return;}
  if(has("help","msaada","support","wasilian","contact","huduma","whatsapp")){say((sw?"Kwa msaada wa ZUNE Market, wasiliana nasi kupitia WhatsApp au jiunge na Channel kwa matangazo. Usitume PIN, OTP au nenosiri.":"For ZUNE Market help, contact us on WhatsApp or join the Channel for announcements. Never share your PIN, OTP or password.")+"<br>"+supportLinks());return;}
  const wantsDeals=has("punguzo","discount","sale","oferta","deals");
  const stop=new Set(["nataka","tafuta","kutafuta","nunua","kununua","agiza","kuagiza","naomba","onyesha","nionyeshe","nipatie","tafadhali","bidhaa","duka","maduka","please","find","show","search","the","for","with","za","zaidi","ya","wa","wao","ni","na","je","gani","kwenye","marketplace","under","below","chini","above","over","bei","price","punguzo","discount","sale","oferta","deals","in"]);
  let query=getSwahiliSearchTokens(q).filter(x=>x.length>1&&!stop.has(x)).slice(0,6).join(" ").trim();
  if(!query&&wantsDeals)query="__deals__";
  if(query.length<2){say(sw?"Uliza kuhusu bidhaa, maduka, categories, chapa, ofa, oda, malipo au delivery.":"Ask about products, stores, categories, brands, deals, orders, payments or delivery.");return;}
  say(sw?"Natafuta kwenye Marketplace...":"Searching Marketplace...");
  try{
   const term=query==="__deals__"?"":query.replace(/[%_,().*]/g," ").replace(/\s+/g," ").trim(),pattern="%"+term+"%";
   const productQuery=supabase.from("products").select("*");
   if(term)productQuery.or("title.ilike."+pattern+",description.ilike."+pattern+",brand.ilike."+pattern+",category.ilike."+pattern);
   const [pRes,sRes,cRes]=await Promise.all([
    productQuery.limit(wantsDeals?60:20),
    wantsDeals?Promise.resolve({data:[],error:null}):supabase.from("stores").select("id,owner_id,store_name,verification_status,logo_url,description,region,district").eq("is_active",true).or("store_name.ilike."+pattern+",description.ilike."+pattern+",region.ilike."+pattern+",district.ilike."+pattern).limit(8),
    wantsDeals?Promise.resolve({data:[],error:null}):supabase.from("product_categories").select("id,name,parent_id").eq("is_active",true).ilike("name",pattern).limit(10)
   ]);
   const products=pRes.error?[]:(pRes.data||[]),stores=sRes.error?[]:(sRes.data||[]),categories=cRes.error?[]:(cRes.data||[]);
   const brands=[...new Set(products.map(p=>p.brand||p.brand_name).filter(Boolean))].slice(0,8);
   const deals=products.filter(p=>Number(p.discount_percentage||p.discount||0)>0||Number(p.compare_at_price||p.original_price||0)>Number(p.price||0)).slice(0,6);
   const sections=[];
   if(products.length)sections.push('<section><strong>'+(sw?"Bidhaa":"Products")+'</strong>'+products.slice(0,8).map(p=>'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px"><span><b>'+safe(p.title||"Bidhaa")+'</b><br><small>'+safe(money(p.price))+'</small></span><button type="button" data-assistant-product="'+safe(p.id)+'">'+(sw?"Angalia":"View")+'</button></div>').join("")+'</section>');
   if(stores.length)sections.push('<section style="margin-top:13px"><strong>'+(sw?"Maduka":"Stores")+'</strong>'+stores.map(st=>'<div style="margin-top:7px"><button type="button" data-assistant-store="'+safe(st.owner_id)+'">'+safe(st.store_name||"Store")+'</button><small> '+safe([st.district,st.region].filter(Boolean).join(", "))+'</small>'+(["verified","approved"].includes(String(st.verification_status||"").toLowerCase())?" ✓":"")+'</div>').join("")+'</section>');
   if(categories.length)sections.push('<section style="margin-top:13px"><strong>Categories</strong><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">'+categories.map(c=>'<button type="button" data-assistant-category="'+safe(c.name)+'">'+safe(c.name)+'</button>').join("")+'</div></section>');
   if(brands.length)sections.push('<section style="margin-top:13px"><strong>'+(sw?"Chapa":"Brands")+'</strong><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">'+brands.map(b=>'<button type="button" data-assistant-brand="'+safe(b)+'">'+safe(b)+'</button>').join("")+'</div></section>');
   if(deals.length)sections.push('<section style="margin-top:13px"><strong>'+(sw?"Bidhaa zenye punguzo":"Discounted products")+'</strong>'+deals.map(p=>'<div style="margin-top:6px"><button type="button" data-assistant-product="'+safe(p.id)+'">'+safe(p.title)+'</button></div>').join("")+'</section>');
   if(!sections.length){say((sw?"Sijapata taarifa inayolingana kwenye ZUNE Market kwa utafutaji huu. Jaribu jina fupi la bidhaa, duka, chapa au category. Ikiwa unahitaji msaada zaidi, wasiliana na timu yetu.":"I couldn’t find a matching result in ZUNE Market. Try a shorter product, store, brand or category name. If you need further help, contact our team.")+"<br>"+supportLinks());return;}
   say((sw?"Matokeo kutoka Marketplace:":"Marketplace results:")+"<br>"+sections.join(""));
   box.querySelectorAll("[data-assistant-product]").forEach(b=>b.onclick=()=>{const p=products.find(x=>String(x.id)===b.dataset.assistantProduct);if(p){close();openProductDetails(p);}});
   box.querySelectorAll("[data-assistant-store]").forEach(b=>b.onclick=()=>{close();openStoreDetails(b.dataset.assistantStore);});
   box.querySelectorAll("[data-assistant-category]").forEach(b=>b.onclick=()=>{close();homeState.search="";homeState.selectedCategory=b.dataset.assistantCategory;homeState.page=0;homeState.products=[];homeState.hasMore=true;renderMarketplacePage("explore");loadProducts(true);});
   box.querySelectorAll("[data-assistant-brand]").forEach(b=>b.onclick=()=>{close();homeState.search=b.dataset.assistantBrand;homeState.selectedCategory="";homeState.page=0;homeState.products=[];homeState.hasMore=true;renderMarketplacePage("explore");loadProducts(true);});
  }catch(e){console.error("ZUNE Universal Search assistant:",e);say((sw?"Utafutaji wa ZUNE Market haupatikani kwa sasa. Tafadhali jaribu tena au wasiliana na Support.":"ZUNE Market search is temporarily unavailable. Please try again or contact Support.")+"<br>"+supportLinks());}
 };
 overlay.querySelector("#z-assistant-form").onsubmit=e=>{e.preventDefault();ask(field.value);};
 overlay.querySelectorAll(".z-assistant-chip").forEach(b=>b.onclick=()=>ask(b.textContent));field.focus();

}
