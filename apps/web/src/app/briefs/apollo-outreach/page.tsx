"use client";

import { useState } from "react";

const SECTIONS = ["overview","verticals","decision-makers","value-prop","companies","apollo-process"];

const COLORS: Record<string, {bg: string; text: string; border: string}> = {
 purple:{bg:"#EEEDFE",text:"#534AB7",border:"#AFA9EC"},
 teal:{bg:"#E1F5EE",text:"#0F6E56",border:"#5DCAA5"},
 blue:{bg:"#E6F1FB",text:"#185FA5",border:"#85B7EB"},
 amber:{bg:"#FAEEDA",text:"#854F0B",border:"#EF9F27"},
 coral:{bg:"#FAECE7",text:"#993C1D",border:"#F0997B"},
};

const Tag = ({label, color="purple"}: {label: string; color?: string}) => (
 <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:COLORS[color].bg,color:COLORS[color].text,border:`0.5px solid ${COLORS[color].border}`,fontWeight:500,whiteSpace:"nowrap"}}>{label}</span>
);

const Card = ({children, style={}}: {children: React.ReactNode; style?: React.CSSProperties}) => (
 <div style={{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"14px 16px",marginBottom:10,...style}} className="dark:bg-gray-800 dark:border-gray-700">
 {children}
 </div>
);

const SectionHead = ({title,sub}: {title: string; sub?: string}) => (
 <div style={{marginBottom:14}}>
 <div style={{fontSize:16,fontWeight:500,marginBottom:3}}>{title}</div>
 {sub && <div style={{fontSize:13,color:"#737373"}}>{sub}</div>}
 </div>
);

const VERTICALS = [
 {
 id:"prediction",color:"purple",label:"Prediction markets",
 desc:"Fastest growing segment in 2025–26. Kalshi, Polymarket, DraftKings Predict, FanDuel Predicts, Robinhood — all expanding. Trading volume on sports event contracts is exploding. These companies are fighting hard for user mindshare and need off-platform brand presence.",
 goals:["Brand awareness in sports-adjacent spaces","New user acquisition (18+ broad demo)","Physical world presence to complement digital"],
 opportunity:"Prediction markets are federally regulated and available in all 50 states. They're newer brands with less established physical presence — prime opportunity for activations at bars during sporting events.",
 },
 {
 id:"sportsbet",color:"teal",label:"Sports betting operators",
 desc:"DraftKings, FanDuel, BetMGM, Caesars, Hard Rock Bet, PointsBet, Fanatics Sportsbook. Mature segment, highly competitive, heavy on digital/TV spend. Looking for differentiated ways to acquire customers and retain high-value players.",
 goals:["Customer acquisition at point of decision (bars during live games)","VIP player identification and retention","Brand differentiation in saturated ad market"],
 opportunity:"Bars showing live sports are the literal point of acquisition — fans are already engaged, drinks in hand, phones out. An activation here is contextually perfect for sports betting sign-ups.",
 },
 {
 id:"igaming",color:"blue",label:"iGaming / online casino",
 desc:"BetMGM Casino, Hard Rock Digital, DraftKings Casino, FanDuel Casino, Borgata Online, Golden Nugget Online. Strong in states like NJ, MI, PA, WV. Focused on player acquisition and retention.",
 goals:["New depositing player acquisition","VIP player hospitality and retention events","Brand presence outside of digital channels"],
 opportunity:"Casino brands are accustomed to high-touch VIP experiences — events and activations map directly to their existing VIP playbook, just in new physical environments.",
 },
 {
 id:"casino",color:"amber",label:"Land-based casino groups",
 desc:"Caesars, MGM Resorts, Hard Rock, Penn Entertainment, Bally's. Operate both physical casinos and digital arms. VIP programs are central to their entire business model.",
 goals:["VIP acquisition and events","Brand activation in new markets/cities","Player development outside casino walls"],
 opportunity:"Land-based casinos have large VIP budgets and understand event ROI. Our bar network gives them presence in markets where they don't have a physical casino.",
 },
];

const DECISION_MAKERS = [
 {
 title:"VP / Director of Marketing",color:"purple",
 owns:"Overall brand and performance marketing budget. Controls sponsorship and activation spend.",
 pain:"Saturated digital channels, rising CAC, pressure to show brand differentiation. Digital-only strategies are hitting diminishing returns.",
 pitch:"We curate tentpole event activations — tailgates, fight nights, championship watches — that put their brand inside high-intent sporting moments, not just adjacent to them.",
 reach:"LinkedIn · industry events (SBC Summit, G2E, iGB Live)",
 },
 {
 title:"Head of VIP / VIP Manager",color:"teal",
 owns:"High-value player retention. Hosts events, manages personal relationships with whales.",
 pain:"Needs curated, exclusive experiences to retain top players. Standard digital rewards aren't enough for true VIPs.",
 pitch:"We build the venue network and event infrastructure so they can host VIP nights at premium bars — without building it themselves.",
 reach:"LinkedIn · referrals from gaming ops contacts",
 },
 {
 title:"Head of Customer Acquisition / Growth",color:"blue",
 owns:"New depositing user targets. Owns CAC, conversion rate, channel mix.",
 pain:"Looking for channels that convert at point of intent — sports bars during games are exactly that moment.",
 pitch:"Our ambassadors are on-site during live sporting events with branded activations, capturing sign-ups at peak intent.",
 reach:"LinkedIn · performance marketing communities",
 },
 {
 title:"Director of Brand / Partnerships",color:"amber",
 owns:"Brand partnerships, sponsorships, co-marketing. Budget for experiential.",
 pain:"Needs activations that feel authentic to sports culture, not just logo placement.",
 pitch:"We place their brand inside the live sports viewing experience — not adjacent to it.",
 reach:"LinkedIn · sports business events",
 },
 {
 title:"CMO / VP of Growth (startups / prediction markets)",color:"coral",
 owns:"Everything. At fast-growing prediction market platforms, one person owns brand + growth.",
 pain:"Building brand from scratch with limited physical presence. Needs reach in real-world sports environments fast.",
 pitch:"Turnkey activation network across multiple cities — no need to build internal field team.",
 reach:"LinkedIn · crypto/fintech/gaming crossover communities",
 },
];

const VALUE_PROPS = [
 {bucket:"Brand awareness",color:"purple",
 props:[
 "Curated tentpole event activations — tailgates, fight nights, game watches, championship matches",
 "Branded ambassador presence at the events that matter most to their target demo",
 "Multi-city activation reach without the client needing an internal field team",
 "Post-event photo/video content and recap for social proof and internal reporting",
 ]},
 {bucket:"VIP enhancement",color:"teal",
 props:[
 "Suite and club ticket experiences at major events — World Cup, PFL fights, championship games",
 "Full-service VIP event curation: venue, hospitality, guest management, branded experience",
 "Private event management end-to-end — client brings their high-value players, we handle everything else",
 "Access to our existing relationships with venues and event properties for exclusive inventory",
 ]},
 {bucket:"Customer acquisition",color:"blue",
 props:[
 "Ambassadors capture sign-ups and deposits at point of peak intent (live sporting events)",
 "Gift card incentives drive immediate on-site conversion",
 "Trackable results: sign-ups per event, per market, per ambassador",
 "Scalable activation model — add markets and events without linear cost increase",
 ]},
];

const TARGET_COMPANIES = [
 {name:"Kalshi",type:"Prediction market",tier:"A",note:"Fastest growing, sports event contracts in all 50 states, heavy acquisition mode"},
 {name:"Polymarket",type:"Prediction market",tier:"A",note:"Crypto-native, younger demo, brand awareness play"},
 {name:"DraftKings",type:"Sports betting + prediction",tier:"A",note:"DraftKings Predict expanding — new vertical needing activation"},
 {name:"FanDuel",type:"Sports betting + prediction",tier:"A",note:"FanDuel Predicts launched, massive marketing budget"},
 {name:"Fanatics Sportsbook",type:"Sports betting",tier:"B",note:"Newer entrant, growth mode, need differentiated acquisition"},
 {name:"Hard Rock Bet / Digital",type:"Sports betting + iGaming",tier:"B",note:"10 states, VIP culture built-in, events align with brand DNA"},
 {name:"BetMGM",type:"Sports betting + iGaming",tier:"A",note:"Large VIP program, brand activation budget, multi-state"},
 {name:"Caesars Sportsbook",type:"Sports betting + iGaming",tier:"A",note:"Rewards program is core — VIP events are natural extension"},
 {name:"Robinhood",type:"Prediction market",tier:"B",note:"Just launched prediction markets, brand-building phase"},
 {name:"Underdog Fantasy",type:"Prediction market",tier:"B",note:"Sports-adjacent, younger demo, activation-friendly brand"},
 {name:"PointsBet / Fanatics",type:"Sports betting",tier:"C",note:"Smaller footprint but open to differentiated growth channels"},
 {name:"Golden Nugget Online",type:"iGaming",tier:"B",note:"Casino brand with strong player loyalty focus"},
];

const APOLLO_STEPS = [
 {n:1,title:"Set up target lists in Apollo",
 desc:"Create separate lists for each vertical: Prediction Markets, Sports Betting, iGaming/Casino. Filter by: Company type, US-only, company size (50–5,000 employees), department = Marketing / Growth / VIP.",
 owner:"Pinky",tools:["Apollo"]},
 {n:2,title:"Title-based search per vertical",
 desc:"Search for decision maker titles within each list. Priority titles: VP Marketing, Director of Marketing, Head of Brand, Head of VIP, Director of Partnerships, Head of Customer Acquisition, CMO, VP Growth. Use Boolean filters to exclude irrelevant roles.",
 owner:"Pinky",tools:["Apollo"]},
 {n:3,title:"Qualify contacts against target company list",
 desc:"Cross-reference with Tier A and B companies first. Confirm the contact is US-based and actively at the company (check LinkedIn if needed). Add verified contacts to outreach sequence.",
 owner:"Pinky",tools:["Apollo","LinkedIn"]},
 {n:4,title:"Build outreach sequence (3-touch)",
 desc:"Touch 1 (Day 1): Cold email — hook on their specific goal (acquisition, VIP, brand). Touch 2 (Day 4): Follow-up — add one proof point or case study. Touch 3 (Day 8): Final — soft CTA, offer a 15-min call. Personalize with company name and vertical.",
 owner:"Pinky",tools:["Apollo"]},
 {n:5,title:"Log all activity in Asana",
 desc:"Every contact added to sequence → logged in Partnerships Asana board. Status updated as sequence progresses. Positive replies moved to Zaire/Anna for follow-up call.",
 owner:"Pinky",tools:["Asana"]},
 {n:6,title:"Weekly cadence review",
 desc:"Weekly: review open rates, reply rates, and bounces. Adjust subject lines and messaging based on what's working. Report to Zaire on pipeline status.",
 owner:"Pinky",tools:["Apollo","Asana"]},
];

export default function ApolloOutreachBrief() {
 const [tab, setTab] = useState("overview");

 const tabs = [
 {id:"overview",label:"Overview"},
 {id:"verticals",label:"Target verticals"},
 {id:"decision-makers",label:"Decision makers"},
 {id:"value-prop",label:"Value props"},
 {id:"companies",label:"Target companies"},
 {id:"apollo-process",label:"Apollo process"},
 ];

 return (
 <div className="max-w-4xl mx-auto p-6">
 <div style={{marginBottom:16}}>
 <div style={{fontSize:24,fontWeight:600,marginBottom:4}}>Apollo Outreach Brief — iGaming & Betting</div>
 <div style={{fontSize:14,color:"#737373"}}>Partnerships · Owner: Pinky · Status: Draft</div>
 </div>

 <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
 {tabs.map(t=>(
 <button key={t.id} onClick={()=>setTab(t.id)}
 style={{fontSize:12,padding:"5px 12px",borderRadius:20,cursor:"pointer",border: tab===t.id ? "1px solid #185FA5" : "0.5px solid #e5e5e5",background: tab===t.id ? "#E6F1FB" : "#fff",color: tab===t.id ? "#185FA5" : "#737373",fontWeight: tab===t.id ? 500 : 400}}>
 {t.label}
 </button>
 ))}
 </div>

 {tab === "overview" && (
 <div>
 <Card>
 <div style={{fontSize:13,fontWeight:500,marginBottom:8}}>Mission</div>
 <div style={{fontSize:13,color:"#525252",lineHeight:1.7}}>
 Pinky uses Apollo to identify and reach decision makers at prediction market, sports betting, iGaming, and casino companies in the US. The goal is to pitch our event activation and ambassador services as a solution for their brand awareness, VIP management, and customer acquisition needs.
 </div>
 </Card>
 <Card>
 <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Three value buckets we sell</div>
 {[["Brand awareness","purple","Branded presence at bars during live games across multiple cities"],["VIP enhancement","teal","Curated private events for high-value player retention"],["Customer acquisition","blue","On-site sign-ups at peak intent moments — live sporting events"]].map(([b,c,d])=>(
 <div key={b as string} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
 <span style={{width:10,height:10,borderRadius:"50%",background:COLORS[c as string].text,flexShrink:0,marginTop:4}}/>
 <div><div style={{fontSize:13,fontWeight:500}}>{b}</div><div style={{fontSize:12,color:"#737373"}}>{d}</div></div>
 </div>
 ))}
 </Card>
 <Card>
 <div style={{fontSize:13,fontWeight:500,marginBottom:8}}>Market context (2025–26)</div>
 <div style={{fontSize:13,color:"#525252",lineHeight:1.7}}>
 The global sports betting market hit $102B in 2024. Prediction markets exploded in 2025 — Kalshi's trading volume was 87% sports event contracts. DraftKings Predict launched event contracts in 38 states. FanDuel Predicts, Robinhood, and Underdog all entered the space. These companies are in aggressive acquisition mode and need physical-world brand presence to complement saturated digital spend.
 </div>
 </Card>
 </div>
 )}

 {tab === "verticals" && (
 <div>
 <SectionHead title="Target verticals" sub="Four distinct buckets — each has different goals and different decision makers"/>
 {VERTICALS.map(v=>(
 <Card key={v.id}>
 <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
 <Tag label={v.label} color={v.color}/>
 </div>
 <div style={{fontSize:13,color:"#525252",lineHeight:1.6,marginBottom:10}}>{v.desc}</div>
 <div style={{fontSize:12,fontWeight:500,marginBottom:6}}>Their goals</div>
 <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
 {v.goals.map(g=><span key={g} style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#f5f5f5",color:"#525252",border:"0.5px solid #e5e5e5"}}>{g}</span>)}
 </div>
 <div style={{background:COLORS[v.color].bg,borderRadius:8,padding:"8px 12px",fontSize:12,color:COLORS[v.color].text,borderLeft:`3px solid ${COLORS[v.color].border}`}}>
 <span style={{fontWeight:500}}>Our opportunity: </span>{v.opportunity}
 </div>
 </Card>
 ))}
 </div>
 )}

 {tab === "decision-makers" && (
 <div>
 <SectionHead title="Decision makers" sub="Who Pinky is looking for in Apollo — by title, what they own, and how to reach them"/>
 {DECISION_MAKERS.map(d=>(
 <Card key={d.title}>
 <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
 <Tag label={d.title} color={d.color}/>
 </div>
 <div style={{display:"grid",gap:8}}>
 <div><div style={{fontSize:11,color:"#a3a3a3",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.5px"}}>They own</div><div style={{fontSize:13,color:"#525252"}}>{d.owns}</div></div>
 <div><div style={{fontSize:11,color:"#a3a3a3",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.5px"}}>Their pain</div><div style={{fontSize:13,color:"#525252"}}>{d.pain}</div></div>
 <div style={{background:COLORS[d.color].bg,borderRadius:8,padding:"8px 12px",borderLeft:`3px solid ${COLORS[d.color].border}`}}>
 <div style={{fontSize:11,color:COLORS[d.color].text,fontWeight:500,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.5px"}}>Our pitch angle</div>
 <div style={{fontSize:13,color:COLORS[d.color].text}}>{d.pitch}</div>
 </div>
 <div><div style={{fontSize:11,color:"#a3a3a3",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.5px"}}>Where to find them</div><div style={{fontSize:13,color:"#525252"}}>{d.reach}</div></div>
 </div>
 </Card>
 ))}
 </div>
 )}

 {tab === "value-prop" && (
 <div>
 <SectionHead title="Value propositions by bucket" sub="What we actually offer — mapped to each client goal"/>
 {VALUE_PROPS.map(v=>(
 <Card key={v.bucket}>
 <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
 <Tag label={v.bucket} color={v.color}/>
 </div>
 {v.props.map((p,i)=>(
 <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
 <div style={{width:20,height:20,borderRadius:"50%",background:COLORS[v.color].bg,color:COLORS[v.color].text,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,flexShrink:0}}>{i+1}</div>
 <div style={{fontSize:13,color:"#525252",lineHeight:1.6,paddingTop:1}}>{p}</div>
 </div>
 ))}
 </Card>
 ))}
 </div>
 )}

 {tab === "companies" && (
 <div>
 <SectionHead title="Target company list" sub="Prioritized A/B/C tiers — start with Tier A, layer in B after first 30 days"/>
 <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
 {[["A","Start here","#3B6D11","#EAF3DE"],["B","Layer in month 2","#854F0B","#FAEEDA"],["C","Long tail","#5F5E5A","#F1EFE8"]].map(([tier,lbl,tc,bg])=>(
 <div key={tier as string} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#525252"}}>
 <span style={{width:18,height:18,borderRadius:4,background:bg as string,color:tc as string,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600}}>{tier}</span>
 {lbl}
 </div>
 ))}
 </div>
 {TARGET_COMPANIES.map(c=>{
 const tierColors: Record<string, [string, string]> = {A:["#EAF3DE","#3B6D11"],B:["#FAEEDA","#854F0B"],C:["#F1EFE8","#5F5E5A"]};
 const [tbg,tc] = tierColors[c.tier];
 return (
 <Card key={c.name} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
 <span style={{width:22,height:22,borderRadius:6,background:tbg,color:tc,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,flexShrink:0,marginTop:1}}>{c.tier}</span>
 <div style={{flex:1}}>
 <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
 <span style={{fontSize:14,fontWeight:500}}>{c.name}</span>
 <span style={{fontSize:11,padding:"1px 7px",borderRadius:20,background:"#f5f5f5",color:"#525252",border:"0.5px solid #e5e5e5"}}>{c.type}</span>
 </div>
 <div style={{fontSize:12,color:"#737373"}}>{c.note}</div>
 </div>
 </Card>
 );
 })}
 </div>
 )}

 {tab === "apollo-process" && (
 <div>
 <SectionHead title="Apollo outreach process" sub="Pinky's step-by-step workflow — from list building to Asana logging"/>
 {APOLLO_STEPS.map((s,i)=>{
 const isLast = i === APOLLO_STEPS.length-1;
 return (
 <div key={s.n} style={{display:"flex",gap:14,alignItems:"flex-start"}}>
 <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
 <div style={{width:28,height:28,borderRadius:"50%",background:"#E6F1FB",color:"#185FA5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,flexShrink:0,marginTop:2}}>{s.n}</div>
 {!isLast && <div style={{width:2,flex:1,minHeight:20,background:"#e5e5e5"}}/>}
 </div>
 <Card style={{flex:1,marginBottom:10}}>
 <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>{s.title}</div>
 <div style={{fontSize:12,color:"#525252",lineHeight:1.6,marginBottom:8}}>{s.desc}</div>
 <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
 <span style={{fontSize:11,padding:"2px 6px",borderRadius:20,background:"#E6F1FB",color:"#185FA5"}}>Pinky</span>
 {s.tools.map(t=><span key={t} style={{fontSize:11,padding:"2px 6px",borderRadius:20,background:"#f5f5f5",color:"#525252",border:"0.5px solid #e5e5e5"}}>{t}</span>)}
 </div>
 </Card>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}
