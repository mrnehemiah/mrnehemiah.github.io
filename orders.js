import { supabase } from "./supabase.js";

const app=document.getElementById("orders-app");
let currentFilter="all",orders=[],checkouts=[],deliveries=[],items=[],deliveryEvents=[],hasLoaded=false,refreshBusy=false;
const lang=localStorage.getItem("zune_language")==="en"?"en":"sw";
const sw={
 title:"Oda zangu",subtitle:"Orodha ya manunuzi yako na hali ya kila oda.",all:"Zote",pending:"Inasubiri",confirmed:"Imethibitishwa",completed:"Imekamilika",cancelled:"Imeghairiwa",empty:"Bado huna oda",emptyText:"Bidhaa utakazonunua zitaonekana hapa pamoja na taarifa za ufuatiliaji.",shop:"Endelea kununua",loading:"Inapakia oda zako...",error:"Imeshindikana kupakia oda zako.",retry:"Jaribu tena",order:"Oda",placed:"Tarehe ya oda",qty:"Idadi",total:"Jumla ya oda",payment:"Malipo",paymentStatus:"Hali ya malipo",delivery:"Usafirishaji",address:"Anwani ya kufikishiwa",recipient:"Mpokeaji",phone:"Simu",method:"Njia ya malipo",tracking:"Hali ya usafirishaji",details:"Taarifa zaidi",hide:"Ficha taarifa",noPayment:"Haijawekwa",notAvailable:"Bado hakuna taarifa",paid:"Imelipwa",failed:"Imeshindikana",shipped:"Imesafirishwa",delivered:"Imefikishwa",inTransit:"Inaendelea",notFound:"Hakuna oda katika kundi hili."
};
const en={title:"My orders",subtitle:"Your purchases and the latest status of each order.",all:"All",pending:"Pending",confirmed:"Confirmed",completed:"Completed",cancelled:"Cancelled",empty:"No orders yet",emptyText:"Products you purchase will appear here with their order and delivery details.",shop:"Continue shopping",loading:"Loading your orders...",error:"Unable to load your orders.",retry:"Try again",order:"Order",placed:"Order date",qty:"Quantity",total:"Order total",payment:"Payment",paymentStatus:"Payment status",delivery:"Delivery",address:"Delivery address",recipient:"Recipient",phone:"Phone",method:"Payment method",tracking:"Delivery status",details:"More details",hide:"Hide details",noPayment:"Not specified",notAvailable:"Not available yet",paid:"Paid",failed:"Failed",shipped:"Shipped",delivered:"Delivered",inTransit:"In progress",notFound:"No orders in this group."};
const t=k=>(lang==="en"?en:sw)[k]||k;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=v=>new Intl.NumberFormat(lang==="en"?"en-TZ":"sw-TZ").format(Number(v||0))+" TSh";
const date=v=>v?new Intl.DateTimeFormat(lang==="en"?"en-TZ":"sw-TZ",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"—";
function statusKey(s){const v=String(s||"pending").toLowerCase();return ["pending","confirmed","completed","cancelled"].includes(v)?v:"pending";}
function statusLabel(s){const v=statusKey(s);return t(v);}
function render(){
 const visible=orders.filter(o=>currentFilter==="all"||statusKey(o.status)===currentFilter);
 const filters=["all","pending","confirmed","completed","cancelled"];
 app.setAttribute("aria-busy","false");
 app.innerHTML='<div class="orders-heading"><div><span class="orders-kicker">ⓏⓊⓃⒺ MARKETPLACE</span><h1>'+t("title")+'</h1><p>'+t("subtitle")+'</p></div><span class="orders-count">'+orders.length+' '+(lang==="en"?"orders":"oda")+'</span></div><nav class="orders-filters" aria-label="Chuja oda">'+filters.map(k=>'<button type="button" class="orders-filter '+(currentFilter===k?"active":"")+'" data-filter="'+k+'">'+t(k)+'</button>').join("")+'</nav><section class="orders-list">'+(visible.length?visible.map(orderCard).join(""):'<div class="orders-empty"><div class="orders-empty-icon">🛍️</div><h2>'+ (orders.length?t("notFound"):t("empty"))+'</h2><p>'+(!orders.length?t("emptyText"):"")+'</p><a class="orders-primary" href="./index.html">'+t("shop")+'</a></div>')+'</section>';
 app.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{currentFilter=b.dataset.filter;render();}));
 app.querySelectorAll("[data-order-toggle]").forEach(b=>b.addEventListener("click",()=>{const panel=document.getElementById("details-"+b.dataset.orderToggle);const opening=panel.hidden;panel.hidden=!opening;b.textContent=opening?t("hide"):t("details");}));
 app.querySelectorAll("[data-confirm-delivery]").forEach(b=>b.addEventListener("click",async()=>{
  if(!window.confirm("Unathibitisha kuwa umepokea bidhaa? Hatua hii itakamilisha delivery."))return;
  b.disabled=true;
  const {error}=await supabase.rpc("zune_delivery_buyer_confirm_received",{p_delivery_id:b.dataset.confirmDelivery,p_note:"Mnunuzi amethibitisha kupokea bidhaa."});
  if(error){b.disabled=false;window.alert(error.message);return;}
  window.alert("Umethibitisha kupokea bidhaa. Delivery imekamilika.");await load();
 }));
}
function deliveryEventLabel(type){
 const map={driver_assigned:"Dereva amechaguliwa",seller_handover_confirmed:"Muuzaji amekabidhi mzigo",driver_pickup_confirmed:"Dereva amepokea mzigo",in_transit:"Mzigo uko njiani",driver_marked_delivered:"Dereva amefikisha mzigo",buyer_confirmed_received:"Mnunuzi amethibitisha kupokea",location_updated:"Eneo la dereva limesasishwa"};
 return map[type]||type;
}
function orderCard(o){
 const checkout=checkouts.find(c=>c.id===o.checkout_id)||{};
 const itemRows=items.filter(i=>i.order_id===o.id);
 const item=itemRows[0]||{};
 const delivery=deliveries.find(d=>d.checkout_id===o.checkout_id&&(!item.seller_id||d.vendor_id===item.seller_id))||{};
 const product=o.products||{};
 const name=item.product_name||product.title||"ZUNE Product"; const variantLabel=item.variant_label||o.variant_label||"";
 const image=product.image_url||"";
 const quantity=Number(item.quantity||o.quantity||1);
 const unitPrice=Number(item.price||((Number(o.total_price)||0)/Math.max(1,Number(o.quantity)||1)));
 const status=statusKey(o.status),payment=String(o.payment_status||"pending").toLowerCase();
 const address=[checkout.delivery_address||o.delivery_address,checkout.ward,checkout.district||o.delivery_district,checkout.region||o.delivery_region,checkout.country].filter(Boolean).join(", ");
 const recipient=checkout.recipient_name||o.recipient_name||"—";
 const phone=checkout.recipient_phone||o.recipient_phone||"—";
 const deliveryStatus=String(delivery.status||"").toLowerCase();
 const deliveryText=deliveryStatus==="completed"?"Mnunuzi amethibitisha kupokea":deliveryStatus==="delivered"?"Dereva amefikisha · thibitisha kupokea":deliveryStatus==="in_transit"?"Mzigo uko njiani":deliveryStatus==="picked_up"?"Dereva amepokea mzigo":deliveryStatus==="ready_for_pickup"?"Muuzaji amekabidhi mzigo":deliveryStatus==="assigned"?"Dereva amechaguliwa":deliveryStatus||t("notAvailable");
 const timeline=deliveryEvents.filter(e=>e.delivery_id===delivery.id).map(e=>'<div class="order-timeline">'+esc(deliveryEventLabel(e.event_type))+' · '+date(e.created_at)+'</div>').join("");
 const gps=delivery.last_latitude!=null&&delivery.last_longitude!=null?'<a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+Number(delivery.last_latitude)+'&mlon='+Number(delivery.last_longitude)+'#map=16/'+Number(delivery.last_latitude)+'/'+Number(delivery.last_longitude)+'">Angalia eneo la dereva kwenye ramani ↗</a>':'';
 const destinationMap=checkout.latitude!=null&&checkout.longitude!=null?'<a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+Number(checkout.latitude)+'&mlon='+Number(checkout.longitude)+'#map=16/'+Number(checkout.latitude)+'/'+Number(checkout.longitude)+'">Angalia anwani ya kufikishia kwenye ramani ↗</a>':'';
 const confirm=deliveryStatus==="delivered"?'<button class="orders-primary" type="button" data-confirm-delivery="'+esc(delivery.id)+'">Nimem pokea bidhaa · Thibitisha</button>':"";
 const liveTracking=delivery.id?'<p><a class="orders-live-track" href="https://mrnehemiah.github.io/Zune-delivery-/tracking.html?delivery_id='+encodeURIComponent(delivery.id)+'" target="_blank" rel="noopener">📍 Fuatilia Live kwenye ramani</a></p>':"";
 return '<article class="order-card"><header class="order-card-head"><div><div class="order-reference">'+t("order")+' #'+esc(o.public_order_id||o.order_number||o.id.slice(0,8).toUpperCase())+'</div><div class="order-date">'+date(o.created_at)+'</div></div><span class="order-status '+status+'">'+statusLabel(status)+'</span></header><div class="order-product">'+(image?'<img class="order-product-image" src="'+esc(image)+'" alt="" loading="lazy">':'<div class="order-product-image order-product-placeholder">📦</div>')+'<div class="order-product-info"><h3>'+esc(name)+'</h3><p>'+t("qty")+': '+quantity+' × '+money(unitPrice)+'</p>'+(variantLabel?'<p class="order-variant-label">Chaguo: '+esc(variantLabel)+'</p>':"")</div><div class="order-total"><small>'+t("total")+'</small><strong>'+money(o.total_price)+'</strong></div></div><footer class="order-card-foot"><span class="order-payment">'+t("payment")+': '+esc(o.payment_method||checkout.payment_method||t("noPayment"))+'</span><button class="order-details-toggle" type="button" data-order-toggle="'+esc(o.id)+'">'+t("details")+' ↓</button></footer><section class="order-details" id="details-'+esc(o.id)+'" hidden><div class="order-detail-grid"><div class="order-detail"><small>'+t("recipient")+'</small><strong>'+esc(recipient)+'</strong></div><div class="order-detail"><small>'+t("phone")+'</small><strong>'+esc(phone)+'</strong></div><div class="order-detail"><small>'+t("address")+'</small><strong>'+esc(address||"—")+'</strong></div><div class="order-detail"><small>'+t("paymentStatus")+'</small><strong>'+esc(payment==="paid"?t("paid"):payment==="failed"?t("failed"):payment)+'</strong></div><div class="order-detail"><small>'+t("tracking")+'</small><strong>'+esc(deliveryText)+'</strong></div><div class="order-detail"><small>Gharama ya delivery</small><strong>'+money(delivery.delivery_fee||0)+'</strong></div></div><div class="order-timeline">Ufuatiliaji wa mzigo · '+esc(deliveryText)+'</div>'+timeline+liveTracking+(gps?'<p>'+gps+'</p>':"")+(destinationMap?'<p>'+destinationMap+'</p>':"")+(confirm?'<p>'+confirm+'</p>':"")+'</section></article>';
}
async function load(){
 if(!hasLoaded)app.innerHTML='<div class="orders-loading"><span class="orders-spinner"></span><p>'+t("loading")+'</p></div>';
 const {data:{session},error:authError}=await supabase.auth.getSession();
 if(authError)throw authError;
 if(!session?.user){app.innerHTML='<div class="orders-empty"><h2>'+ (lang==="en"?"Sign in required":"Ingia kwanza")+'</h2><p>'+t("emptyText")+'</p><a class="orders-primary" href="./index.html">'+(lang==="en"?"Go to marketplace":"Rudi sokoni")+'</a></div>';return;}
 const uid=session.user.id;
 const {data:rows,error}=await supabase.from("orders").select("id,buyer_id,product_id,quantity,total_price,status,created_at,recipient_name,recipient_phone,delivery_address,delivery_region,delivery_district,payment_method,payment_status,payment_reference,delivery_method,delivery_time,checkout_id,order_number,public_order_id,products!orders_product_id_fkey(title,image_url)").eq("buyer_id",uid).order("created_at",{ascending:false});
 if(error)throw error;
 orders=rows||[];
 const checkoutIds=[...new Set(orders.map(o=>o.checkout_id).filter(Boolean))];
 const orderIds=orders.map(o=>o.id);
 const [checkoutResult,deliveryResult,itemResult]=await Promise.all([
  checkoutIds.length?supabase.from("order_checkouts").select("id,recipient_name,recipient_phone,recipient_email,country,region,district,ward,delivery_address,latitude,longitude,grand_total,payment_method,status,created_at").in("id",checkoutIds):Promise.resolve({data:[],error:null}),
  checkoutIds.length?supabase.from("order_deliveries").select("id,checkout_id,vendor_id,delivery_fee,currency,status,assigned_driver_id,seller_handover_confirmed_at,driver_pickup_confirmed_at,driver_delivered_at,buyer_confirmed_at,last_latitude,last_longitude,last_location_at,created_at").in("checkout_id",checkoutIds):Promise.resolve({data:[],error:null}),
  orderIds.length?supabase.from("order_items").select("id,order_id,product_name,price,quantity,seller_id,variant_id,variant_label,variant_attributes,variant_sku").in("order_id",orderIds):Promise.resolve({data:[],error:null})
 ]);
 if(checkoutResult.error)throw checkoutResult.error;
 if(deliveryResult.error)throw deliveryResult.error;
 if(itemResult.error)throw itemResult.error;
 checkouts=checkoutResult.data||[];deliveries=deliveryResult.data||[];items=itemResult.data||[];
 const deliveryIds=deliveries.map(d=>d.id);
 const eventResult=deliveryIds.length?await supabase.from("zune_delivery_events").select("id,delivery_id,event_type,note,latitude,longitude,created_at").in("delivery_id",deliveryIds).order("created_at",{ascending:true}):{data:[],error:null};
 if(eventResult.error)throw eventResult.error;
 deliveryEvents=eventResult.data||[];
 render();hasLoaded=true;
}
load().catch(error=>{console.error("ZUNE orders:",error);app.setAttribute("aria-busy","false");app.innerHTML='<div class="orders-error"><h2>'+t("error")+'</h2><p>'+esc(error.message||"")+'</p><button type="button" class="orders-primary" id="orders-retry">'+t("retry")+'</button></div>';document.getElementById("orders-retry")?.addEventListener("click",()=>load().catch(()=>{}));});

setInterval(()=>{if(!document.hidden&&!refreshBusy){refreshBusy=true;load().catch(error=>console.warn("Order status refresh:",error)).finally(()=>{refreshBusy=false;});}},30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!refreshBusy){refreshBusy=true;load().catch(error=>console.warn("Order status refresh:",error)).finally(()=>{refreshBusy=false;});}});
