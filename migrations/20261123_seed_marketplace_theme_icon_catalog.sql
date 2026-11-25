-- Publish the existing built-in Marketplace themes and Android launcher icon designs
-- in the shared Marketplace asset catalog. This is real product catalog content,
-- not demo/sample data. Re-runnable without creating duplicate built-in entries.
begin;

insert into public.zune_theme_assets
  (owner_id,asset_kind,scope,status,title,description,config,layout,component_code,version,is_featured,published_at)
select
  null,'theme','official','published',v.title,v.description,
  jsonb_build_object('template_id',v.template_id,'source','zune-marketplace-built-in'),
  jsonb_build_object('template_id',v.template_id,'presentation','marketplace-theme'),
  jsonb_build_object('renderer','marketplace-template','template_id',v.template_id),
  1,v.is_featured,now()
from (values
 ('classic','ZUNE Classic','Muundo wa kawaida wenye sehemu zilizo wazi na bidhaa zinazoonekana haraka.',true),
 ('editorial','Editorial Grid','Muundo wa kisasa unaosisitiza picha kubwa na mpangilio wa magazeti.',false),
 ('hero','Mega Showcase','Banner kubwa ya utambulisho ikifuatiwa na makundi na bidhaa.',true),
 ('compact','Compact Shop','Muundo mfupi unaoonyesha bidhaa nyingi kwa nafasi ndogo.',false),
 ('boutique','Boutique','Muonekano wa duka la kipekee wenye nafasi na picha zinazovutia.',false),
 ('catalog','Catalog Pro','Makundi pembeni na eneo la bidhaa lililopangwa kama katalogi.',false),
 ('stories','Visual Stories','Makundi ya picha na sehemu za kugundua bidhaa kwa mtiririko.',false),
 ('minimal','Minimal','Muundo safi usio na vitu vingi, unaoweka bidhaa mbele.',false),
 ('deals','Deals Focus','Sehemu ya ofa na bidhaa zinazopendekezwa zinaonekana mapema.',false),
 ('showcase','Premium Showcase','Muundo wa maonyesho wenye sehemu kubwa na product grid rahisi.',true)
) as v(template_id,title,description,is_featured)
where not exists (
 select 1 from public.zune_theme_assets a
 where a.asset_kind='theme' and a.scope='official'
   and a.config->>'template_id'=v.template_id
);

insert into public.zune_theme_assets
  (owner_id,asset_kind,scope,status,title,description,config,layout,component_code,version,is_featured,published_at)
select
 null,'app_icon','official','published',v.title,'Built-in ZUNE Android launcher icon · Premium 3D style',
 jsonb_build_object('native_key',v.native_key,'background',v.background,'accent',v.accent,'is_builtin',true,'platform','android'),
 jsonb_build_object('presentation','3d-icon','platform','android'),
 jsonb_build_object('renderer','nativePreview','asset_key',v.native_key),
 1,v.is_featured,now()
from (values
 ('default','Ocean Blue','#082F49','#38BDF8',true),
 ('emerald','ZUNE Emerald','#064E3B','#34D399',true),
 ('sunset','Sunset','#F97316','#FED7AA',false),
 ('midnight','Midnight','#090F1F','#60A5FA',false),
 ('aurora','Aurora','#073B3A','#5EEAD4',false),
 ('royal','Royal','#4C1D95','#C4B5FD',false),
 ('rose','Rose Gold','#831843','#FBCFE8',false),
 ('graphite','Titanium Silver','#27272A','#D4D4D8',false),
 ('arctic','Arctic','#DCEFFB','#2563EB',false),
 ('amber','Amber','#78350F','#FBBF24',false),
 ('obsidian','Obsidian Black','#09090B','#22D3EE',false),
 ('crimson','Cosmic Galaxy','#312E81','#C4B5FD',false),
 ('sapphire','Diamond Crystal','#172554','#BFDBFE',false),
 ('jade','Forest Green','#064E3B','#86EFAC',false),
 ('solar','Solar Gold','#713F12','#FACC15',false),
 ('lavender','Lavender Mist','#4C1D95','#DDD6FE',false),
 ('coral','Coral Pop','#881337','#FB7185',false),
 ('glacier','Pearl White','#334155','#F8FAFC',false),
 ('copper','Copper Forge','#431407','#FB923C',false),
 ('neon','Neon Cyber','#111827','#22D3EE',false)
) as v(native_key,title,background,accent,is_featured)
where not exists (
 select 1 from public.zune_theme_assets a
 where a.asset_kind='app_icon' and a.scope='official'
   and a.config->>'native_key'=v.native_key
);

commit;
