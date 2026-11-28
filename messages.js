import { supabase } from "./supabase.js";
const root=document.getElementById("messages-root");
const lang=localStorage.getItem("zune_language")==="en"?"en":"sw";
const tr=(a,b)=>lang==="sw"?a:b;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let user=null,conversations=[],products={},stores={},profiles={},selected=null,poll=null,realtimeChannel=null,activeFilter="all",searchTerm="";
const date=v=>v?new Date(v).toLocaleString(lang==="sw"?"sw-TZ":"en-US",{dateStyle:"short",timeStyle:"short"}):"";
function empty(){root.innerHTML='<div class="messages-panel"><div class="messages-empty"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z"/></svg><b>'+tr("Bado huna mazungumzo","No conversations yet")+'</b><br>'+tr("Ukiwasiliana na muuzaji kupitia bidhaa, mazungumzo yataonekana hapa.","When you message a seller from a product, the conversation will appear here.")+'</div></div>';}
async function loadList(){
 const {data,error}=await supabase.from("chat_conversations").select("id,buyer_id,seller_id,product_id,created_at,updated_at").or("buyer_id.eq."+user.id+",seller_id.eq."+user.id).order("updated_at",{ascending:false});
 if(error)throw error;conversations=data||[];
 const pids=[...new Set(conversations.map(x=>x.product_id).filter(Boolean))],sids=[...new Set(conversations.map(x=>x.seller_id).filter(Boolean))],participantIds=[...new Set(conversations.flatMap(x=>[x.buyer_id,x.seller_id]).filter(Boolean))],cids=conversations.map(x=>x.id);
 products={};stores={};profiles={};
 if(pids.length){const q=await supabase.from("products").select("id,title,vendor_id").in("id",pids);if(q.error)throw q.error;(q.data||[]).forEach(x=>products[x.id]=x);}
 if(sids.length){const s=await supabase.from("stores").select("owner_id,store_name,logo_url").in("owner_id",sids);if(!s.error)(s.data||[]).forEach(x=>stores[x.owner_id]=x);}
 if(participantIds.length){const p=await supabase.from("profiles").select("id,full_name,avatar_url").in("id",participantIds);if(!p.error)(p.data||[]).forEach(x=>profiles[x.id]=x);}
 let latest={},unread={};
 if(cids.length){const q=await supabase.from("chat_messages").select("id,conversation_id,sender_id,message,is_read,created_at").in("conversation_id",cids).order("created_at",{ascending:false}).limit(Math.min(cids.length*30,500));if(q.error)throw q.error;for(const m of q.data||[]){if(!latest[m.conversation_id])latest[m.conversation_id]=m;if(m.sender_id!==user.id&&!m.is_read)unread[m.conversation_id]=(unread[m.conversation_id]||0)+1;}}
 renderList(latest,unread);
}
function renderList(latest,unread){
 document.getElementById("messages-title").textContent="ZUNE Chats";
 document.getElementById("messages-subtitle").textContent=tr("Mazungumzo yako na wanunuzi na wauzaji","Your buyer and seller conversations");
 if(!conversations.length){empty();return;}
 const unreadTotal=Object.values(unread).reduce((a,b)=>a+b,0);
 const filtered=conversations.filter(c=>{
  const isBuyer=c.buyer_id===user.id;
  const counterpartId=isBuyer?c.seller_id:c.buyer_id;
  const title=isBuyer?(stores[c.seller_id]?.store_name||profiles[counterpartId]?.full_name||tr("Muuzaji wa ZUNE","ZUNE Seller")):(profiles[counterpartId]?.full_name||tr("Mnunuzi wa ZUNE","ZUNE Buyer"));
  const matchesSearch=(title+" "+(products[c.product_id]?.title||"")).toLowerCase().includes(searchTerm.toLowerCase());
  const matchesFilter=activeFilter==="all"||(activeFilter==="unread"&&(unread[c.id]||0)>0)||(activeFilter==="buyers"&&!isBuyer)||(activeFilter==="sellers"&&isBuyer);
  return matchesSearch&&matchesFilter;
 });
 root.innerHTML='<section class="messages-panel"><div class="messages-toolbar"><label class="messages-search"><span>⌕</span><input id="messages-search" type="search" placeholder="'+tr("Tafuta mazungumzo...","Search conversations...")+'" value="'+esc(searchTerm)+'"></label><div class="messages-filters"><button type="button" data-chat-filter="all" class="'+(activeFilter==="all"?"active":"")+'">'+tr("Yote","All")+'</button><button type="button" data-chat-filter="unread" class="'+(activeFilter==="unread"?"active":"")+'">'+tr("Hayajasomwa","Unread")+(unreadTotal?' · '+unreadTotal:"")+'</button><button type="button" data-chat-filter="buyers" class="'+(activeFilter==="buyers"?"active":"")+'">'+tr("Wanunuzi","Buyers")+'</button><button type="button" data-chat-filter="sellers" class="'+(activeFilter==="sellers"?"active":"")+'">'+tr("Wauzaji","Sellers")+'</button></div></div><div class="messages-panel-head"><b>'+tr("Mazungumzo yako","Your conversations")+'</b><small>'+tr("Chagua mazungumzo ili kuendelea","Choose a conversation to continue")+'</small></div><div class="messages-list">'+(filtered.length?filtered.map(c=>{const isBuyer=c.buyer_id===user.id,store=stores[c.seller_id],counterpartId=isBuyer?c.seller_id:c.buyer_id,title=isBuyer?(store?.store_name||profiles[counterpartId]?.full_name||tr("Muuzaji wa ZUNE","ZUNE Seller")):(profiles[counterpartId]?.full_name||tr("Mnunuzi wa ZUNE","ZUNE Buyer")),product=products[c.product_id]?.title||tr("Mazungumzo ya ZUNE","ZUNE Chat"),m=latest[c.id],count=unread[c.id]||0,avatar=profiles[counterpartId]?.avatar_url||(isBuyer?store?.logo_url:"");return '<button class="message-row" type="button" data-conversation="'+esc(c.id)+'"><span class="message-avatar">'+(avatar?'<img src="'+esc(avatar)+'" alt="">':esc(title.trim().slice(0,1).toUpperCase()))+'</span><span class="message-row-copy"><strong>'+esc(title)+'</strong><p>'+(m?esc(m.message):esc(product))+'</p></span><span class="message-row-meta"><time>'+esc(date(m?.created_at||c.updated_at||c.created_at))+'</time>'+(count?'<span class="message-unread">'+count+'</span>':'')+'</span></button>';}).join(""):'<div class="messages-empty">'+tr("Hakuna mazungumzo kwenye kichujio hiki.","No conversations match this filter.")+'</div>')+'</div></section>';
 root.querySelector("#messages-search")?.addEventListener("input",e=>{searchTerm=e.target.value;renderList(latest,unread);const input=root.querySelector("#messages-search");input?.focus();input?.setSelectionRange(searchTerm.length,searchTerm.length);});
 root.querySelectorAll("[data-chat-filter]").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.chatFilter;renderList(latest,unread);}));
 root.querySelectorAll("[data-conversation]").forEach(b=>b.addEventListener("click",()=>openThread(b.dataset.conversation)));
}
async function openThread(id){
 selected=conversations.find(x=>x.id===id);if(!selected)return;
 const isBuyer=selected.buyer_id===user.id;const counterpartId=isBuyer?selected.seller_id:selected.buyer_id;const seller=isBuyer?(stores[selected.seller_id]?.store_name||profiles[counterpartId]?.full_name||tr("Muuzaji","Seller")):(profiles[counterpartId]?.full_name||tr("Mnunuzi","Buyer"));
 const product=products[selected.product_id]?.title||tr("Bidhaa","Product");
 root.innerHTML='<section class="messages-panel"><div class="thread-top"><button type="button" id="thread-back">‹ '+tr("Rudi","Back")+'</button><div><strong>'+esc(seller)+'</strong><small>'+esc(product)+'</small></div></div><div class="thread-history" id="thread-history"><div class="messages-loading">'+tr("Inapakia ujumbe...","Loading messages...")+'</div></div><form class="thread-form" id="thread-form"><button type="button" id="chat-attach" aria-label="'+tr("Ambatisha picha au video","Attach photo or video")+'">＋</button><input type="file" id="chat-media-file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" hidden><input name="message" maxlength="4000" autocomplete="off" placeholder="'+tr("Andika ujumbe...","Write a message...")+'" required><button type="submit">'+tr("Tuma","Send")+'</button></form></section>';
 document.getElementById("thread-back").onclick=async()=>{selected=null;await loadList();};
 await refreshThread();
 const mediaInput=document.getElementById("chat-media-file");
 document.getElementById("chat-attach")?.addEventListener("click",()=>mediaInput?.click());
 mediaInput?.addEventListener("change",async()=>{
  const file=mediaInput.files?.[0];mediaInput.value="";if(!file)return;
  const allowed=/^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/i.test(file.type);
  if(!allowed){alert(tr("Chagua picha au video inayoruhusiwa.","Choose a supported image or video."));return;}
  if(file.size>15*1024*1024){alert(tr("Faili lisizidi MB 15.","File must be 15 MB or smaller."));return;}
  const button=document.getElementById("chat-attach");if(button)button.disabled=true;
  let path="";
  try{
   const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,8)||"bin";
   path=id+"/"+user.id+"/"+crypto.randomUUID()+"."+ext;
   const uploaded=await supabase.storage.from("zune-chat-media").upload(path,file,{contentType:file.type,upsert:false});
   if(uploaded.error)throw uploaded.error;
   const saved=await supabase.from("chat_messages").insert({conversation_id:id,sender_id:user.id,message:"",image_url:path});
   if(saved.error)throw saved.error;
   await refreshThread();
  }catch(error){if(path)await supabase.storage.from("zune-chat-media").remove([path]).catch(()=>{});alert(error.message||tr("Faili halikutumwa.","Attachment could not be sent."));}
  finally{if(button)button.disabled=false;}
 });
 const form=document.getElementById("thread-form");form.addEventListener("submit",async e=>{e.preventDefault();const input=form.elements.message,msg=input.value.trim(),button=form.querySelector("button");if(!msg||button.disabled)return;button.disabled=true;try{const q=await supabase.from("chat_messages").insert({conversation_id:id,sender_id:user.id,message:msg});if(q.error)throw q.error;input.value="";await refreshThread();}catch(err){alert(err.message||tr("Ujumbe haukutumwa.","Message could not be sent."));}finally{button.disabled=false;input.focus();}});
}
async function refreshThread(){if(!selected)return;const id=selected.id;const q=await supabase.from("chat_messages").select("id,sender_id,message,image_url,is_read,created_at").eq("conversation_id",id).order("created_at",{ascending:true}).limit(200);if(q.error)throw q.error;const box=document.getElementById("thread-history");if(!box)return;const rows=await Promise.all((q.data||[]).map(async m=>{if(!m.image_url)return m;const signed=await supabase.storage.from("zune-chat-media").createSignedUrl(m.image_url,3600);return {...m,mediaUrl:signed.error?"":signed.data?.signedUrl||""};}));box.innerHTML=rows.length?rows.map(m=>{const path=m.image_url||"",isVideo=/\.(mp4|webm|mov)(\\?|$)/i.test(path),media=m.mediaUrl?(isVideo?'<video controls playsinline preload="metadata" src="'+esc(m.mediaUrl)+'"></video>':'<img loading="lazy" src="'+esc(m.mediaUrl)+'" alt="Chat attachment">'):"";return '<div class="thread-message '+(m.sender_id===user.id?"mine":"")+'">'+(m.message?'<div>'+esc(m.message)+'</div>':"")+media+'<small>'+esc(date(m.created_at))+(m.sender_id===user.id?(m.is_read?' · ✓✓':' · ✓'):'')+'</small></div>';}).join(""):'<div class="messages-empty">'+tr("Anza mazungumzo kwa kutuma ujumbe.","Start the conversation by sending a message.")+'</div>';box.scrollTop=box.scrollHeight;const upd=await supabase.from("chat_messages").update({is_read:true}).eq("conversation_id",id).neq("sender_id",user.id).eq("is_read",false);if(upd.error)console.warn("Could not mark messages as read:",upd.error.message);}
function subscribeToMessages(){
 if(realtimeChannel) supabase.removeChannel(realtimeChannel);
 realtimeChannel=supabase.channel("zune-buyer-messages-"+user.id)
  .on("postgres_changes",{event:"*",schema:"public",table:"chat_messages"},async payload=>{
   const conversationId=payload.new?.conversation_id||payload.old?.conversation_id;
   if(!conversationId||!conversations.some(c=>c.id===conversationId))return;
   try{
    if(selected?.id===conversationId)await refreshThread();
    await loadList();
   }catch(error){console.warn("Realtime message refresh:",error.message);}
  })
  .subscribe(status=>{if(status!=="SUBSCRIBED")console.info("ZUNE messages realtime:",status);});
}
async function init(){const s=await supabase.auth.getSession();if(s.error)throw s.error;if(!s.data.session?.user){root.innerHTML='<div class="messages-error">'+tr("Ingia kwanza ili kuona ujumbe wako.","Please sign in to view your messages.")+' <a href="./index.html">Login</a></div>';return;}user=s.data.session.user;await loadList();subscribeToMessages();const id=new URLSearchParams(location.search).get("conversation");if(id&&conversations.some(x=>x.id===id))await openThread(id);poll=setInterval(async()=>{try{if(selected)await refreshThread();else await loadList();}catch(e){console.warn("Message fallback refresh:",e.message);}},30000);}
init().catch(e=>{console.error("ZUNE Messages:",e);root.innerHTML='<div class="messages-error">'+esc(e.message||tr("Imeshindikana kupakia ujumbe.","Unable to load messages."))+'</div>';});
window.addEventListener("pagehide",()=>{if(poll)clearInterval(poll);if(realtimeChannel)supabase.removeChannel(realtimeChannel);});