/* Performance in everything at once: definition, strength, muscle, conditioning, speed, recovery, health, mobility, focus.
   Nobody peaks in all of them on the same day, so the system works in blocks: one or two domains get the progress dose,
   the rest get the maintenance dose, and the benchmarks decide which one is next. */
import type { Ev, PhaseId } from './systems.ts';
import type { Step } from './hormones.ts';

export type DomainId = 'definition' | 'strength' | 'muscle' | 'conditioning' | 'speed' | 'recovery' | 'health' | 'mobility' | 'focus';

export interface Domain {
  id: DomainId; n: string; line: string; target: string; dose: string; keep: string;
  steps: Step[]; phase: Partial<Record<PhaseId, string>>; mistakes: string[]; tests: string[];
}

export const DOMAINS: Domain[] = [
  { id: 'definition', n: 'Definire', line: 'Cât de vizibil e mușchiul pe care îl ai.',
    target: 'Talia sub 45% din înălțime. Pentru bărbați, 8–12% grăsime tot anul; pentru femei, 18–22%. Nivelul de scenă e temporar și scump hormonal.',
    dose: 'Ritmul și caloriile sunt în Beast Nutrition. Aici contează somnul, pașii și să păstrezi kilogramele pe bară.',
    keep: 'Menținere cu greutate stabilă, talie măsurată lunar.',
    steps: [
      { t: 'Păstrează kilogramele pe bară: un deficit de circa 500 kcal pe zi poate opri câștigul de masă, nu și forța. Antrenamentul greu e semnalul care păstrează mușchiul.', ev: 'B', refs: ['murphy2022'] },
      { t: 'Alege cardio după preferință: HIIT și cardio moderat scad grăsimea la fel; HIIT doar economisește circa 40% din timp.', ev: 'A', refs: ['wewege2017'] },
      { t: 'Dormi 8–9 ore în cut: cu 5,5 ore în loc de 8,5, din aceeași dietă s-a pierdut cu 55% mai puțină grăsime și cu 60% mai multă masă slabă.', ev: 'B', refs: ['nedeltcheva2010'] },
      { t: 'Fără deshidratare înainte de poze sau competiții: e periculoasă și poate să nu îmbunătățească aspectul.', ev: 'B', refs: ['helms2014'] },
    ],
    phase: { cut: 'Domeniul principal.', reverse: 'Păstrezi câștigul: talia nu crește peste 1 cm.', bulk: 'Crește lent: talia cu maximum 1 cm pe lună.', maintain: 'Păstrezi nivelul.' },
    mistakes: ['Slăbitul localizat nu există.', 'Deficit mare plus cardio mare plus somn puțin.', 'Sub 8% grăsime ca stare permanentă.'], tests: ['bf', 'whr'] },
  { id: 'strength', n: 'Forță', line: 'Cât poți mișca o singură dată.',
    target: 'Genuflexiune 2 × greutatea corporală, împins 1,4 ×, îndreptări 2,5 ×, 15+ tracțiuni.',
    dose: 'Fiecare ridicare de bază de 2–3 ori pe săptămână, 5–10 serii grele, 3–6 repetări la 80–90% din maxim, 3 minute pauză.',
    keep: 'O sesiune grea pe săptămână, 1/3 din volum, aceeași greutate.',
    steps: [
      { t: 'Folosește greutăți mari: forța maximă crește mai mult cu încărcături mari, chiar dacă masa crește la fel.', ev: 'A', refs: ['schoenfeld2017l'] },
      { t: 'Mai multe serii aduc mai multă forță: 5+ serii pe exercițiu pe săptămână au dat câștiguri mai mari decât sub 5.', ev: 'A', refs: ['ralston2017'] },
      { t: 'Frecvența ajută mai ales prin volumul adăugat: distribuie seriile în 2–3 zile.', ev: 'A', refs: ['grgic2018'] },
      { t: 'Odihnește 2–5 minute între serii și lasă 1–2 repetări în rezervă la exercițiile mari.', ev: 'B', refs: ['suchomel2018', 'schoenfeld2016'] },
    ],
    phase: { cut: 'Ținta e să păstrezi greutățile. Scade seriile cu 20–30% dacă recuperarea cade.', reverse: 'Revii treptat la volum. Forța revine prima.', bulk: 'Cel mai bun moment pentru recorduri.', maintain: 'Progres mic și constant.' },
    mistakes: ['Eșec muscular la genuflexiuni în fiecare serie.', 'Schimbarea programului la fiecare 2 săptămâni.'], tests: ['squat', 'bench', 'deadlift', 'pullups', 'grip'] },
  { id: 'muscle', n: 'Masă musculară', line: 'Cât mușchi ai, pe fiecare grupă.',
    target: 'Masă slabă în creștere de la un bloc la altul, fără a depăși 15–18% grăsime la bărbați.',
    dose: '10–20 de serii pe grupă pe săptămână, de 2 ori pe grupă, aproape de eșec.',
    keep: 'Circa 1/3 din volum menține masa la tineri.',
    steps: [
      { t: 'Ajunge la 10+ serii pe grupă pe săptămână: câștigul crește cu volumul.', ev: 'A', refs: ['schoenfeld2017'] },
      { t: 'Antrenează fiecare grupă de 2 ori pe săptămână, nu o dată.', ev: 'A', refs: ['schoenfeld2016f'] },
      { t: 'Orice zonă de repetări funcționează, dacă seria e aproape de eșec: masa crește similar cu încărcături mari sau mici.', ev: 'A', refs: ['schoenfeld2017l'] },
      { t: 'Nu trebuie să mergi până la eșec: avantajul e foarte mic. Oprește-te la 0–2 repetări în rezervă.', ev: 'A', refs: ['refalo2023'] },
      { t: 'Când nu e blocul de masă, ajunge circa 1/3 din volum: la tineri a păstrat hipertrofia câștigată.', ev: 'B', refs: ['bickel2011'] },
      { t: 'Fără alcool după sesiunile importante: a scăzut sinteza proteică cu 24%, chiar cu proteine.', ev: 'B', refs: ['parr2014'] },
    ],
    phase: { bulk: 'Domeniul principal.', cut: 'Doze mici, ținta e să nu pierzi.', reverse: 'Crești volumul cu 1–2 serii pe grupă pe săptămână.', maintain: 'Recompoziție lentă, dacă ești începător.' },
    mistakes: ['Pauze scurte pentru pompă: au dat rezultate mai slabe.', 'Sesiuni grele după o noapte de lucru.'], tests: ['ffmi'] },
  { id: 'conditioning', n: 'Condiționare', line: 'Motorul: cât oxigen folosești și cât de mult ții ritmul.',
    target: 'VO2max peste 50 ml/kg/min. Fiecare MET în plus se asociază cu un risc de deces cu circa 13% mai mic.',
    dose: 'Aproximativ 80% din cardio ușor, 20% intens: 1–2 sesiuni de intervale și 2–3 sesiuni în zona 2.',
    keep: 'O sesiune de intervale pe săptămână, plus pașii zilnici.',
    steps: [
      { t: 'Fă 4 × 4 minute la 90–95% din pulsul maxim, cu 3 minute ușor între ele: VO2max a crescut cu 7,2% în 8 săptămâni, de trei ori pe săptămână, la bărbați moderat antrenați.', ev: 'B', refs: ['helgerud2007'] },
      { t: 'Distribuie intensitatea polarizat: multe minute ușoare și puține foarte grele. A crescut VO2peak cu 11,7% în 9 săptămâni la sportivi antrenați.', ev: 'B', refs: ['stoggl2014', 'seiler2010'] },
      { t: 'HIIT și cardio continuu cresc amândouă VO2max. Combină-le: intervalele aduc un plus în timp mai puțin.', ev: 'A', refs: ['milanovic2015'] },
      { t: 'Păstrează forța grea: îmbunătățește economia de alergare și performanța pe distanță.', ev: 'A', refs: ['balsalobre2016', 'ronnestad2014'] },
      { t: 'Cardio și forța merg împreună fără să strice masa sau forța maximă. Doar explozivitatea are de suferit, mai ales în aceeași sesiune. Separă-le cu 3+ ore.', ev: 'A', refs: ['schumann2022'] },
    ],
    phase: { cut: 'Maximum o sesiune de intervale. Restul pași și zona 2.', reverse: 'Scade cardio cu 20–30%, apoi îl reconstruiești.', bulk: 'O sesiune de intervale și o zonă 2, ca să păstrezi inima și sensibilitatea la insulină.', maintain: 'Cel mai bun moment pentru a crește VO2max: ai energie pentru calitate.' },
    mistakes: ['Toate sesiunile „semi-grele”: prea grele pentru refacere, prea ușoare pentru progres.', 'Cardio intens imediat înainte de forță.'], tests: ['vo2', 'run5k', 'rhr'] },
  { id: 'speed', n: 'Viteză și putere', line: 'Cât de repede produci forță.',
    target: 'Sărituri și sprinturi mai bune de la un test la altul.',
    dose: '1–2 sesiuni pe săptămână, proaspăt: 6–8 sprinturi de 20–40 m cu pauză completă, 40–80 de contacte de plyo, ridicări rapide la 30–60% din maxim.',
    keep: 'O sesiune scurtă pe săptămână, 4–5 sprinturi.',
    steps: [
      { t: 'Sprintează aproape de maxim și cu pauză completă, ca fiecare repetare să fie la fel de rapidă. Oprește când viteza scade.', ev: 'B', refs: ['haugen2019'] },
      { t: 'Lasă minimum 48 de ore între sesiunile intense de sprint și lucrează în blocuri de 2–3 săptămâni grele, una ușoară.', ev: 'D', refs: ['haugen2019'] },
      { t: 'Devino mai puternic: creșterea forței la genuflexiuni se transferă direct în sprint.', ev: 'A', refs: ['seitz2014'] },
      { t: 'Plyometrie regulată: săritura cu contramișcare a crescut în medie cu 8,7%.', ev: 'A', refs: ['markovic2007'] },
      { t: 'Alege încărcătura după exercițiu: fără greutate sau ușor la sărituri, 30–70% la genuflexiuni, peste 70% la smulgeri.', ev: 'A', refs: ['soriano2015'] },
      { t: 'Dacă nu ești puternic încă, prioritizează forța. Lucrul pe putere plătește mai mult după ce ai bază.', ev: 'B', refs: ['suchomel2018'] },
    ],
    phase: { cut: 'Sprinturile scad grăsimea și țin nervii treji, dar sunt riscante obosit. Volum mic.', reverse: 'Reintrodu progresiv: tendoanele au nevoie de timp.', bulk: 'Sesiune scurtă, ca să nu devii lent.', maintain: 'Blocul ideal, cu greutate stabilă.' },
    mistakes: ['Sprinturi după picioare grele.', 'Sprinturi cu pauză scurtă: asta e condiționare, nu viteză.', 'Încălzire doar cu stretching static lung.'], tests: ['sprint30', 'cmj', 'broad'] },
  { id: 'recovery', n: 'Recuperare', line: 'Cât de repede poți face din nou treabă bună.',
    target: 'Somn peste 7,5 ore în 24 de ore pe fiecare schimb, puls de repaus și HRV stabile, performanță constantă.',
    dose: 'Zilnic: somn, mâncare, stres. Deload la 4–8 săptămâni.',
    keep: 'Nu are menținere: e fiecare zi.',
    steps: [
      { t: 'Dormi mai mult înaintea blocurilor grele: extinderea somnului la sportivi a îmbunătățit sprintul, precizia și timpul de reacție.', ev: 'B', refs: ['mah2011'] },
      { t: 'Măsoară HRV dimineața și folosește media pe 7 zile, nu valoarea unei zile.', ev: 'B', refs: ['plews2013', 'kiviniemi2007', 'manresa2021'] },
      { t: 'Masajul reduce cel mai bine febra musculară și oboseala percepută. Compresia și apa ajută la oboseală.', ev: 'A', refs: ['dupuy2018'] },
      { t: 'Planifică deload-ul înainte să ai nevoie de el: scazi volumul, păstrezi puțină intensitate.', ev: 'D', refs: ['bell2023'] },
      { t: 'Nu te teme de antrenamentul de seară: nu strică somnul dacă se termină cu mai mult de o oră înainte de culcare și nu e extrem. Temperatura corpului la culcare contează.', ev: 'A', refs: ['stutz2019'] },
      { t: 'Dormi într-o cameră răcoroasă: căldura scade somnul profund și crește trezirile.', ev: 'B', refs: ['okamoto2012'] },
      { t: 'Sauna are date promițătoare, dar slabe. Dacă vrei copii, limiteaz-o: 3 luni de saună au scăzut temporar spermatozoizii.', ev: 'C', refs: ['hussain2018', 'garolla2013'] },
      { t: 'După o noapte proastă nu anula antrenamentul din principiu: efortul a menținut sinteza proteică în restricție de somn.', ev: 'B', refs: ['saner2020'] },
      { t: 'Înainte de un test, redu volumul cu 41–60% timp de 2 săptămâni, fără să scazi intensitatea.', ev: 'A', refs: ['bosquet2007'] },
    ],
    phase: { cut: 'Dormi cu 30–60 de minute mai mult decât normal, chiar dacă înseamnă un somn scurt în plus.', reverse: 'Faza de vindecare.', bulk: 'Mai multă mâncare, dar și mai mult volum: deload la timp.', maintain: 'Refă-ți rezervele.' },
    mistakes: ['Baie rece imediat după forță, când vrei masă.', 'Mai multe suplimente în loc de mai mult somn.'], tests: ['sleepavg', 'readiness'] },
  { id: 'health', n: 'Sănătate', line: 'Parametrii care contează peste 40 de ani.',
    target: 'Analize în zona optimă, tensiune sub 120/80, VO2max și forță în treimea de sus pentru vârstă.',
    dose: 'Analize de 2 ori pe an, control dentar, 8.000+ pași, 30–60 de minute de forță pe săptămână ca minim.',
    keep: 'Toată viața.',
    steps: [
      { t: 'Condiția cardiorespiratorie e un predictor major de longevitate: cei din categoria de elită au avut un risc de deces de 5 ori mai mic decât cei slab pregătiți.', ev: 'A', refs: ['mandsager2018', 'kodama2009'] },
      { t: 'Forța: chiar și 30–60 de minute pe săptămână se asociază cu un risc mai mic de 10–17% de deces și boli majore.', ev: 'A', refs: ['momma2022'] },
      { t: 'Pași: peste 7.000 pe zi scad clar mortalitatea față de sub 4.000.', ev: 'A', refs: ['paluch2022'] },
      { t: 'Măsoară tensiunea acasă: sub 120/80 e nivelul fără risc crescut.', ev: 'A', refs: ['mcevoy2024'] },
      { t: 'Fă ApoB și o dată în viață Lp(a).', ev: 'A', refs: ['sniderman2019', 'kronenberg2022'] },
      { t: 'Ține talia sub jumătate din înălțime.', ev: 'A', refs: ['nice-ng246'] },
    ],
    phase: { cut: 'Analize cu 4 săptămâni înainte de start, nu la sfârșit.', bulk: 'Verifică ApoB, tensiunea și glicemia pe parcurs.', maintain: 'Faza pentru analize reale.' },
    mistakes: ['Sacrificarea analizelor pentru estetică.', 'Fără control medical pentru că „te simți bine”.'], tests: ['bp', 'labs', 'whr'] },
  { id: 'mobility', n: 'Mobilitate și anti-accidentări', line: 'Ca să poți continua să te antrenezi.',
    target: 'Genuflexiune adâncă cu spatele drept, brațe sus fără arcuire, atingi vârful picioarelor.',
    dose: '2–3 sesiuni de 10 minute, plus exerciții cu amplitudine completă.',
    keep: 'Încălzire dinamică la fiecare sesiune.',
    steps: [
      { t: 'Forța este cea mai bună protecție: antrenamentul de forță a redus accidentările sportive la circa o treime; stretching-ul nu a avut efect.', ev: 'A', refs: ['lauersen2014'] },
      { t: 'Forța pe amplitudine completă crește mobilitatea la fel ca stretching-ul.', ev: 'B', refs: ['afonso2021'] },
      { t: 'Înainte de efort, încălzire dinamică. Stretching-ul scurt e în regulă dacă e urmat de mișcări dinamice.', ev: 'A', refs: ['behm2016'] },
    ],
    phase: { cut: 'Riscul de accidentare crește când ești obosit. Nu ignora durerile.', reverse: 'Crești volumul treptat.' },
    mistakes: ['Antrenament prin durere articulară.', 'Salturi bruște de volum.'], tests: ['toe'] },
  { id: 'focus', n: 'Focus și minte', line: 'Cât de clar gândești sub presiune.',
    target: 'Energie stabilă de dimineața până seara, fără cafea după ora limită.',
    dose: 'Zilnic: lumină, respirație, cafeină la timp.',
    keep: 'Zilnic.',
    steps: [
      { t: 'Lumină la trezire și ore fixe pentru fiecare schimb: regularitatea somnului a prezis mortalitatea mai bine decât durata.', ev: 'B', refs: ['windred2024', 'wright2013'] },
      { t: 'Cafeină înainte de sesiunile cheie: îmbunătățește atenția și vigilența. Maximum 400 mg pe zi.', ev: 'A', refs: ['guest2021', 'efsa-caffeine'] },
      { t: 'Somn scurt de 20–30 de minute când noaptea a fost slabă: îmbunătățește performanța și atenția.', ev: 'B', refs: ['souabni2021'] },
      { t: '5 minute de respirație cu expirație lungă. Sau rutina din Inner Beast.', ev: 'B', refs: ['balban2023', 'zaccaro2018'] },
    ],
    phase: { cut: 'Mic dejun cu proteine, cafeina după masă, nu pe stomacul gol.' }, mistakes: ['Cafeină pentru a compensa somnul zile la rând.'], tests: ['energyavg'] },
];

export const DOMAIN = Object.fromEntries(DOMAINS.map((d) => [d.id, d])) as Record<DomainId, Domain>;

/** A benchmark has four levels; `kind` says where the number comes from. */
export interface Bench {
  id: string; n: string; unit: string; domain: DomainId; better: 'high' | 'low'; ev: Ev;
  /** Base, good, excellent, elite. */
  m?: [number, number, number, number]; f?: [number, number, number, number];
  how: string; from?: 'perkg' | 'auto'; refs?: string[];
}

export const BENCHES: Bench[] = [
  { id: 'bf', n: 'Grăsime corporală', unit: '%', domain: 'definition', better: 'low', ev: 'D', m: [20, 15, 12, 9], f: [30, 25, 22, 18], how: 'Aceeași metodă de fiecare dată: DEXA sau pliometru. Sub nivelul de elită nu e mai bine.', refs: ['fagerberg2018'] },
  { id: 'whr', n: 'Talie / înălțime', unit: 'raport', domain: 'definition', better: 'low', ev: 'A', m: [0.5, 0.47, 0.45, 0.43], f: [0.5, 0.46, 0.44, 0.42], how: 'Talia măsurată la nivelul buricului, dimineața, împărțită la înălțime. Calculat automat din jurnal.', from: 'auto', refs: ['nice-ng246'] },
  { id: 'squat', n: 'Genuflexiune 1RM', unit: '× greutatea', domain: 'strength', better: 'high', ev: 'B', m: [1, 1.5, 2, 2.5], f: [0.75, 1.25, 1.6, 2], how: 'Maxim real sau estimat: greutate × (1 + repetări / 30), din 3–5 repetări. Scrii kilogramele, aplicația împarte la greutate.', from: 'perkg', refs: ['vandenhoek2024'] },
  { id: 'bench', n: 'Împins la bancă 1RM', unit: '× greutatea', domain: 'strength', better: 'high', ev: 'B', m: [0.75, 1, 1.4, 1.75], f: [0.5, 0.75, 1, 1.25], how: 'Maxim real sau estimat din 3–5 repetări.', from: 'perkg', refs: ['vandenhoek2024'] },
  { id: 'deadlift', n: 'Îndreptări 1RM', unit: '× greutatea', domain: 'strength', better: 'high', ev: 'B', m: [1.25, 2, 2.5, 3], f: [1, 1.5, 2, 2.4], how: 'Maxim real sau estimat din 3–5 repetări.', from: 'perkg', refs: ['vandenhoek2024'] },
  { id: 'pullups', n: 'Tracțiuni stricte', unit: 'repetări', domain: 'strength', better: 'high', ev: 'D', m: [5, 12, 18, 25], f: [1, 5, 10, 15], how: 'Din atârnare completă, bărbia peste bară, fără balans.' },
  { id: 'grip', n: 'Forța de strângere', unit: 'kg', domain: 'strength', better: 'high', ev: 'B', m: [45, 51, 58, 65], f: [27, 31, 35, 42], how: 'Dinamometru, cea mai bună din 3 încercări. Mediana adulților tineri e circa 51 kg la bărbați și 31 kg la femei.', refs: ['dodds2014'] },
  { id: 'ffmi', n: 'Indice de masă slabă', unit: 'kg/m²', domain: 'muscle', better: 'high', ev: 'D', m: [18, 20, 22, 24], f: [14, 16, 17.5, 19], how: 'Calculat din greutate, înălțime și grăsime corporală.', from: 'auto' },
  { id: 'vo2', n: 'VO2max', unit: 'ml/kg/min', domain: 'conditioning', better: 'high', ev: 'B', m: [40, 46, 52, 60], f: [32, 38, 44, 52], how: 'Test de laborator sau estimarea ceasului, aceeași metodă de fiecare dată. Valorile sunt pentru 30 de ani; aplicația le ajustează cu vârsta.', refs: ['mandsager2018', 'kodama2009'] },
  { id: 'run5k', n: '5 km alergare', unit: 'min', domain: 'conditioning', better: 'low', ev: 'D', m: [30, 25, 21, 18], f: [35, 29, 25, 21], how: 'Pe teren plat, cronometrat. Scrie minutele cu zecimale: 22,5 înseamnă 22:30.' },
  { id: 'rhr', n: 'Puls de repaus', unit: 'bpm', domain: 'conditioning', better: 'low', ev: 'D', m: [72, 62, 54, 48], f: [76, 66, 58, 52], how: 'Dimineața, în pat. Calculat automat din jurnal, media pe 14 zile.', from: 'auto' },
  { id: 'sprint30', n: 'Sprint 30 m', unit: 's', domain: 'speed', better: 'low', ev: 'D', m: [5.2, 4.7, 4.35, 4.1], f: [6, 5.4, 5, 4.7], how: 'Start din picioare, cronometrat cu celule foto sau cu aplicație video. Compară-te mai ales cu tine.' },
  { id: 'cmj', n: 'Săritură cu contramișcare', unit: 'cm', domain: 'speed', better: 'high', ev: 'D', m: [30, 40, 50, 60], f: [20, 28, 36, 44], how: 'Cele mai bune din 3 încercări, cu mâinile pe șolduri sau cu aplicație video.' },
  { id: 'broad', n: 'Săritură în lungime', unit: 'cm', domain: 'speed', better: 'high', ev: 'D', m: [190, 230, 260, 290], f: [150, 180, 205, 230], how: 'De pe loc, cea mai bună din 3.' },
  { id: 'sleepavg', n: 'Somn mediu', unit: 'ore', domain: 'recovery', better: 'high', ev: 'A', m: [6.5, 7, 7.75, 8.5], f: [6.5, 7, 7.75, 8.5], how: 'Calculat din jurnal, media pe 14 zile, cu somnul scurt inclus.', from: 'auto', refs: ['watson2015'] },
  { id: 'readiness', n: 'Disponibilitate medie', unit: '/100', domain: 'recovery', better: 'high', ev: 'D', m: [45, 60, 72, 85], f: [45, 60, 72, 85], how: 'Calculat din jurnal, media pe 14 zile.', from: 'auto' },
  { id: 'bp', n: 'Tensiune sistolică', unit: 'mmHg', domain: 'health', better: 'low', ev: 'A', m: [139, 129, 119, 112], f: [139, 129, 119, 110], how: 'Acasă, după 5 minute de stat jos, media a 3 zile. Calculat din jurnal.', from: 'auto', refs: ['mcevoy2024'] },
  { id: 'labs', n: 'Analize în zona bună', unit: '%', domain: 'health', better: 'high', ev: 'D', m: [50, 70, 85, 95], f: [50, 70, 85, 95], how: 'Calculat din ultimele analize.', from: 'auto' },
  { id: 'toe', n: 'Atingerea vârfurilor', unit: 'cm', domain: 'mobility', better: 'high', ev: 'D', m: [-5, 0, 8, 15], f: [0, 5, 12, 18], how: 'Din șezut, picioare întinse. 0 înseamnă că atingi vârfurile, un număr pozitiv că treci de ele.' },
  { id: 'energyavg', n: 'Energie medie', unit: '/5', domain: 'focus', better: 'high', ev: 'D', m: [2.5, 3.2, 3.8, 4.4], f: [2.5, 3.2, 3.8, 4.4], how: 'Calculat din jurnal, media pe 14 zile.', from: 'auto' },
];

export const BENCH = Object.fromEntries(BENCHES.map((b) => [b.id, b])) as Record<string, Bench>;

export interface Supp { id: string; n: string; tier: 'base' | 'perf' | 'lab' | 'sleep' | 'caution'; dose: string; when: string; why: string; ev: Ev; refs: string[]; care: string }

export const SUPPS: Supp[] = [
  { id: 'creatine', n: 'Creatină monohidrat', tier: 'base', dose: '3–5 g pe zi', when: 'Oricând, zilnic, cu o masă', why: 'Forță, putere, masă. Cel mai bine studiat supliment.', ev: 'A', refs: ['kreider2017', 'maughan2018', 'antonio2021'], care: 'Crește creatinina din analize, fără să însemne boală. Boală renală: doar cu medicul.' },
  { id: 'protein', n: 'Proteină din zer sau cazeină', tier: 'base', dose: 'Cât lipsește din ținta zilnică', when: 'Când nu ajungi cu mâncare', why: 'Suplimentarea peste 1,62 g/kg nu a adus câștiguri în plus. E doar comoditate.', ev: 'A', refs: ['morton2018'], care: 'Mâncarea rămâne prima.' },
  { id: 'omega3', n: 'Omega-3', tier: 'base', dose: '1–2 g EPA + DHA pe zi', when: 'Cu masa. Sari peste dacă mănânci pește gras de 2–3 ori pe săptămână', why: 'Adiponectină, trigliceride, aport de EPA și DHA.', ev: 'B', refs: ['wu2013', 'efsa-ul'], care: 'Anticoagulante: întreabă medicul.' },
  { id: 'caffeine', n: 'Cafeină', tier: 'perf', dose: 'Până la 200 mg o dată, 400 mg pe zi', when: '45–60 de minute înainte, oprești la ora din protocol', why: 'Performanță la forță și rezistență, atenție.', ev: 'A', refs: ['guest2021', 'maughan2018', 'efsa-caffeine', 'drake2013'], care: 'Studiile folosesc 3–6 mg/kg, dar limita EFSA pe doză e 200 mg.' },
  { id: 'betaalanine', n: 'Beta-alanină', tier: 'perf', dose: '3–6 g pe zi, în doze mici', when: '4 săptămâni sau mai mult', why: 'Eforturi intense de 0,5–10 minute. Efect mic.', ev: 'B', refs: ['saunders2017', 'maughan2018'], care: 'Furnicături trecătoare.' },
  { id: 'nitrate', n: 'Nitrați (suc de sfeclă)', tier: 'perf', dose: 'Porție concentrată', when: '2–3 ore înainte de efort', why: 'Efect mic la oameni activi, și mai mic la cei foarte antrenați.', ev: 'B', refs: ['senefeld2020', 'maughan2018'], care: 'Testează în antrenament.' },
  { id: 'bicarb', n: 'Bicarbonat de sodiu', tier: 'perf', dose: '0,2–0,3 g/kg', when: '60–180 de minute înainte, doar la teste și competiții', why: 'Efort intens repetat, 1–7 minute.', ev: 'B', refs: ['grgic2021b', 'maughan2018'], care: 'Poate da probleme digestive. Mult sodiu: nu la hipertensiune.' },
  { id: 'vitd', n: 'Vitamina D', tier: 'lab', dose: '1.000–2.000 UI pe zi dacă e sub 30 ng/mL', when: 'Cu masa, mai ales între octombrie și martie', why: 'Corectează un deficit.', ev: 'B', refs: ['demay2024', 'efsa-ul'], care: 'Maximum 4.000 UI pe zi fără medic.' },
  { id: 'magnesium', n: 'Magneziu', tier: 'lab', dose: '200–250 mg pe zi', when: 'Seara, dacă aportul e mic', why: 'Corectează un aport scăzut. Datele pe somn și testosteron sunt slabe.', ev: 'C', refs: ['arab2023', 'cinar2011', 'efsa-ul'], care: 'Maximum 250 mg din suplimente. Diaree la doze mari.' },
  { id: 'zinc', n: 'Zinc', tier: 'lab', dose: '15–25 mg pe zi, 8–12 săptămâni', when: 'Doar dacă analiza e mică', why: 'Fără deficit, ZMA nu a crescut testosteronul.', ev: 'B', refs: ['prasad1996', 'koehler2009', 'efsa-ul'], care: 'Maximum 25 mg pe zi. În exces scade cuprul.' },
  { id: 'iron', n: 'Fier', tier: 'lab', dose: 'După medic', when: 'Dimineața, în zile alternative, departe de cafea și de efort', why: 'Doar cu feritină mică, după ce i s-a găsit cauza.', ev: 'B', refs: ['stoffel2017', 'peeling2009'], care: 'Nu lua fier fără analize.' },
  { id: 'glycine', n: 'Glicină', tier: 'sleep', dose: '3 g', when: 'Cu o oră înainte de somn', why: 'A redus oboseala de zi în restricție de somn.', ev: 'C', refs: ['bannai2012'], care: 'Date puține.' },
  { id: 'cherry', n: 'Suc de vișine acre', tier: 'sleep', dose: 'Concentrat, 2 porții pe zi', when: 'Dimineața și seara', why: 'Melatonina a crescut, somnul a fost mai lung într-un studiu mic.', ev: 'C', refs: ['howatson2012'], care: 'Are zahăr.' },
  { id: 'melatonin', n: 'Melatonină', tier: 'sleep', dose: 'Doză mică, pe termen scurt', when: 'Înainte de somnul de după noapte, cu acordul medicului', why: 'După schimbul de noapte a adăugat circa 24 de minute de somn de zi, dovezi slabe.', ev: 'B', refs: ['liira2014', 'fatemeh2022', 'erland2017'], care: 'Conținutul real poate fi foarte diferit de etichetă.' },
  { id: 'ashwagandha', n: 'Ashwagandha', tier: 'caution', dose: 'Opțional, 300–600 mg extract de rădăcină, maximum 8–12 săptămâni', when: 'Doar în perioade clare de stres', why: 'Scade cortizolul în studii. Efectul pe testosteron e mic și incert.', ev: 'B', refs: ['ashwa2026', 'lopresti2019', 'wankhede2015', 'bjornsson2020', 'eu-ashwa'], care: 'Risc rar de afectare hepatică. Evită la boli tiroidiene sau hepatice, sarcină, medicamente pentru tiroidă sau imunitate. Interzisă în Danemarca, restricționată în alte țări UE.' },
];

export const AVOID: { n: string; why: string; refs?: string[] }[] = [
  { n: 'Boostere de testosteron', why: '90% promit o creștere, dar 61,5% din ingrediente nu au date, iar 10% au date de scădere. D-aspartatul, 6 g pe zi, a scăzut testosteronul la bărbați antrenați.', refs: ['clemesha2020', 'melville2015'] },
  { n: 'Anabolizanți, SARMs, prohormoni', why: 'Opresc producția proprie, strică lipidele și ficatul, sunt interzise în sport.', refs: ['wada-list'] },
  { n: 'Peptide și secretagogi de GH, BPC-157', why: 'Fără date de siguranță la oameni sănătoși. Interzise de WADA.', refs: ['wada-list'] },
  { n: 'EPO, T3, clenbuterol, DNP', why: 'Pot fi mortale.', refs: ['wada-list'] },
  { n: 'DHEA', why: 'Beneficii neclare, interzis în sport.', refs: ['rutkowski2014', 'wada-list'] },
  { n: 'Biotină înainte de analize', why: 'Falsifică testele hormonale.', refs: ['li2017', 'fda-biotin'] },
];
