/* Kỷ Niệm · Experience helpers
   Small, deterministic, offline-only utilities. No AI or network calls. */
(function(){
'use strict';
function dateOf(record){
 if(record?.eventDate&&/^\d{4}-\d{2}-\d{2}$/.test(record.eventDate)){
  const d=new Date(record.eventDate+'T12:00:00');
  if(Number.isFinite(d.getTime()))return d;
 }
 const raw=String(record?.date||'').trim(),vn=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(vn){const d=new Date(+vn[3],+vn[2]-1,+vn[1],12);if(d.getFullYear()===+vn[3]&&d.getMonth()===+vn[2]-1&&d.getDate()===+vn[1])return d}
 if(record?.createdAt){const d=new Date(record.createdAt);if(Number.isFinite(d.getTime()))return d}
 return null;
}
function localDay(d){
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function fileDate(file,now=new Date()){
 const time=Number(file?.lastModified);
 if(Number.isFinite(time)&&time>631152000000&&time<now.getTime()+86400000){
  const d=new Date(time);if(Number.isFinite(d.getTime()))return {day:localDay(d),source:'file-modified'};
 }
 return {day:localDay(now),source:'today'};
}
function pickMemory(memories,excluded,now=new Date()){
 const stop=new Set(Array.isArray(excluded)?excluded:[]);
 const eligible=(Array.isArray(memories)?memories:[]).filter(m=>m&&m.id&&!stop.has(m.id)).map(m=>{
  const date=dateOf(m);return {memory:m,date};
 }).filter(x=>x.date&&now.getTime()-x.date.getTime()>=21*86400000);
 if(!eligible.length)return null;
 const todayMonth=now.getMonth(),todayDate=now.getDate();
 const anniversaries=eligible.filter(x=>x.date.getMonth()===todayMonth&&x.date.getDate()===todayDate&&x.date.getFullYear()<now.getFullYear());
 const pool=anniversaries.length?anniversaries:eligible;
 // Stable daily rotation: no flicker during a visit, no random promises.
 const day=Math.floor(new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()/86400000);
 const index=((day%pool.length)+pool.length)%pool.length;
 const chosen=pool[index];
 return {memory:chosen.memory,date:chosen.date,anniversary:!!anniversaries.length,years:now.getFullYear()-chosen.date.getFullYear(),daysAgo:Math.floor((now.getTime()-chosen.date.getTime())/86400000)};
}
function dateLabel(d){
 if(!d)return '';
 return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
}
window.KyniemExperience={pickMemory,dateOf,dateLabel,fileDate,localDay};
})();