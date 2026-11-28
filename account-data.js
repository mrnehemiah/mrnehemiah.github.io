import { supabase } from "./supabase.js";
const root=document.getElementById("account-data-root"),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let user=null,profile=null;
async function own(table,columns,filter){let rows=[],start=0;for(;;){let q=supabase.from(table).select(columns);if(filter)q=q.eq(filter[0],filter[1]);const {data,error}=await q.order("created_at",{ascending:true}).range(start,start+999);if(error)throw new Error(table+": "+error.message);const batch=data||[];rows.push(...batch);if(batch.length<1000)break;start+=1000;}return rows;}
async function exportData(){
 const button=document.getElementById("export-account-data"),status=document.getElementById("data-export-status");button.disabled=true;button.textContent="Inaandaa nakala...";
 try{
  const [p,orders,wishlist,addresses,walletLedger,payments,paymentTransactions,notifications,tickets]=await Promise.all([
   own("profiles","id,full_name,phone_number,email,role,is_verified,zune_id,created_at,account_status",["id",user.id]),
   own("orders","id,buyer_id,product_id,quantity,total_price,status,created_at,recipient_name,recipient_phone,delivery_address,payment_method,payment_status,order_number,public_order_id",["buyer_id",user.id]),
   own("wishlists","id,product_id,created_at",["user_id",user.id]),
   own("delivery_addresses","id,recipient_name,phone,country,region,district,ward,street,landmark,is_default,created_at,delivery_notes",["user_id",user.id]),
   own("wallet_ledger","id,amount,currency,entry_type,reference_type,reference_id,reason,created_at",["user_id",user.id]),
   own("payments","id,order_id,amount,payment_method,transaction_reference,payment_status,created_at",["buyer_id",user.id]),
   own("payment_transactions","id,purpose,network_code,amount,currency,reference_code,status,submitted_at,created_at",["user_id",user.id]),
   own("notifications","id,type,title_sw,title_en,body_sw,body_en,action_url,is_read,created_at,read_at",["user_id",user.id]),
   own("support_tickets","id,category,message,status,admin_reply,created_at,updated_at",["user_id",user.id])
  ]);
  const payload={product:"ZUNE Marketplace",exported_at:new Date().toISOString(),account:{...p[0],email:user.email},orders,wishlist,delivery_addresses:addresses,wallet_ledger:walletLedger,payments,payment_transactions:paymentTransactions,notifications,support_tickets:tickets};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="zune-account-data-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);status.textContent="Nakala ya data yako imeandaliwa na kupakuliwa.";
 }catch(error){console.error("ZUNE account data export:",error);status.textContent="Imeshindikana kuandaa nakala: "+error.message;}
 finally{button.disabled=false;button.textContent="Pakua data yangu (JSON)";}
}
async function requestDeactivation(){
 const message="Naomba timu ya ZUNE iwasiliane nami kuhusu kusitisha akaunti yangu. Tafadhali thibitisheni hatua na athari zake kabla ya kutekeleza ombi.";
 if(!confirm("Tuma ombi kwa Support kuhusu kusitisha akaunti? Akaunti haitafungwa moja kwa moja."))return;
 const button=document.getElementById("request-deactivation"),status=document.getElementById("deactivation-status");button.disabled=true;
 try{const {error}=await supabase.from("support_tickets").insert({user_id:user.id,customer_name:profile?.full_name||user.email||"ZUNE Customer",category:"account",message});if(error)throw error;status.textContent="Ombi limetumwa kwa Support. Akaunti yako bado iko hai hadi timu ya ZUNE ithibitishe na kutekeleza ombi."; }
 catch(error){console.error("ZUNE deactivation request:",error);status.textContent=error.message||"Imeshindikana kutuma ombi.";}
 finally{button.disabled=false;}
}
async function init(){const {data:{user:current},error}=await supabase.auth.getUser();if(error)throw error;if(!current){location.replace("./index.html");return;}user=current;const p=await supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle();if(p.error)throw p.error;profile=p.data||{};root.innerHTML='<section class="pro-panel"><span class="pro-eyebrow">YOUR DATA</span><h2>Nakala ya taarifa zako</h2><p class="pro-muted">Pakua nakala ya JSON yenye taarifa zako za wasifu, oda, wishlist, anwani, miamala, arifa na support tickets. Taarifa zinasomwa kwa akaunti uliyoingia tu.</p><button class="account-button full" id="export-account-data" type="button">Pakua data yangu (JSON)</button><p class="pro-form-message" id="data-export-status" role="status" aria-live="polite"></p></section><section class="pro-panel"><span class="pro-eyebrow">PRIVACY CONTROLS</span><h2>Mapendeleo ya faragha</h2><p class="pro-muted">Mipangilio ya sasa ya faragha inapatikana kwenye Settings. Baadhi ya chaguo huhifadhiwa kwenye kifaa hiki na udhibiti wa mwonekano wa wasifu haujaunganishwa kikamilifu na backend bado.</p><a class="account-button" href="./settings.html?section=privacy">Fungua mipangilio ya faragha</a></section><section class="pro-panel"><span class="pro-eyebrow">ACCOUNT CONTROL</span><h2>Ombi la kusitisha akaunti</h2><p class="pro-muted">Hili hutuma ombi kwa timu ya Support pekee. Akaunti haitafungwa wala kufutwa moja kwa moja; utapata maelezo na uthibitisho kabla ya hatua yoyote.</p><button class="account-button danger full" id="request-deactivation" type="button">Omba kusitisha akaunti</button><p class="pro-form-message" id="deactivation-status" role="status" aria-live="polite"></p></section><a class="pro-back-link" href="./account.html">← Rudi ZUNE Account Pro</a>';document.getElementById("export-account-data").addEventListener("click",exportData);document.getElementById("request-deactivation").addEventListener("click",requestDeactivation);}
init().catch(error=>{console.error("ZUNE Data Center:",error);root.innerHTML='<section class="pro-panel pro-error"><h2>Imeshindikana kupakia Data Center</h2><p>'+esc(error.message||"Jaribu tena.")+'</p></section>';});