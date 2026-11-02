/* The nine hormone families, the organs that make them, the axes that link them, and the twelve levers that move them. */

export type PhaseId = 'cut' | 'reverse' | 'bulk' | 'maintain';
/** A: meta-analyses or guidelines. B: controlled studies. C: small studies or mechanism. D: coaching practice. */
export type Ev = 'A' | 'B' | 'C' | 'D';

export type SysId = 'sex' | 'growth' | 'thyroid' | 'stress' | 'metabolic' | 'appetite' | 'sleep' | 'fluid' | 'bone';

export interface Sys { id: SysId; n: string; short: string; line: string }

/** In the order of the user's list: the 44 ticks of the ring follow it. */
export const SYSTEMS: Sys[] = [
  { id: 'sex', n: 'Hormoni sexuali și reproductivi', short: 'Sexuali', line: 'Forță, libido, dispoziție, fertilitate.' },
  { id: 'growth', n: 'Creștere și dezvoltare', short: 'Creștere', line: 'Reparare, masă musculară, compoziție corporală.' },
  { id: 'thyroid', n: 'Hormoni tiroidieni', short: 'Tiroidă', line: 'Viteza metabolismului și temperatura corpului.' },
  { id: 'stress', n: 'Stres și activare', short: 'Stres', line: 'Energie la cerere, focus, reacție rapidă.' },
  { id: 'metabolic', n: 'Metabolici și glicemie', short: 'Metabolic', line: 'Cum folosești și depozitezi combustibilul.' },
  { id: 'appetite', n: 'Apetit și sațietate', short: 'Apetit', line: 'Foame, sațietate, alertă.' },
  { id: 'sleep', n: 'Somn și funcție hipofizară', short: 'Somn', line: 'Ceasul intern și refacerea de noapte.' },
  { id: 'fluid', n: 'Hidratare și tensiune', short: 'Hidratare', line: 'Apă, sare, tensiune arterială.' },
  { id: 'bone', n: 'Sânge și oase', short: 'Sânge, oase', line: 'Oxigen, calciu, fosfor, schelet.' },
];

export type GlandId = 'hypothalamus' | 'pituitary' | 'pineal' | 'thyroid' | 'parathyroid' | 'heart' | 'liver' | 'stomach' | 'pancreas' | 'adrenal' | 'kidney' | 'gut' | 'fat' | 'gonads' | 'bone' | 'skin';

export interface Gland { id: GlandId; n: string; x: number; y: number; line: string }

/** Coordinates in the 600 × 900 body map. */
export const GLANDS: Gland[] = [
  { id: 'pineal', n: 'Epifiza', x: 300, y: 74, line: 'Transformă întunericul în semnalul de somn.' },
  { id: 'hypothalamus', n: 'Hipotalamus', x: 276, y: 112, line: 'Centrul de comandă: citește energia, stresul și lumina.' },
  { id: 'pituitary', n: 'Hipofiză', x: 324, y: 126, line: 'Traduce comenzile în semnale pentru celelalte glande.' },
  { id: 'thyroid', n: 'Tiroidă', x: 300, y: 232, line: 'Reglează viteza metabolismului.' },
  { id: 'parathyroid', n: 'Paratiroide', x: 330, y: 246, line: 'Țin calciul din sânge în limite înguste.' },
  { id: 'heart', n: 'Inimă', x: 322, y: 322, line: 'Eliberează ANP când vede prea mult volum de sânge.' },
  { id: 'liver', n: 'Ficat', x: 254, y: 402, line: 'Produce IGF-1 și angiotensinogen, stochează glicogen.' },
  { id: 'stomach', n: 'Stomac', x: 346, y: 400, line: 'Trimite foamea sub formă de grelină.' },
  { id: 'pancreas', n: 'Pancreas', x: 306, y: 440, line: 'Insulină, glucagon și amilină.' },
  { id: 'adrenal', n: 'Suprarenale', x: 232, y: 444, line: 'Cortizol, adrenalină, aldosteron, DHEA.' },
  { id: 'kidney', n: 'Rinichi', x: 372, y: 470, line: 'EPO, renină și vitamina D activă.' },
  { id: 'gut', n: 'Intestin', x: 300, y: 514, line: 'GLP-1, GIP, PYY și CCK.' },
  { id: 'fat', n: 'Țesut adipos', x: 212, y: 528, line: 'Leptină și adiponectină, plus estradiol.' },
  { id: 'gonads', n: 'Testicule / ovare', x: 300, y: 610, line: 'Testosteron, estradiol, progesteron, inhibină.' },
  { id: 'bone', n: 'Oase', x: 412, y: 640, line: 'FGF23 și depozitul de calciu.' },
  { id: 'skin', n: 'Piele', x: 148, y: 360, line: 'Produce vitamina D din soare.' },
];

export interface Axis { id: string; n: string; plain: string; path: GlandId[]; steps: string[]; breaks: string; fix: string; sys: SysId[] }

/** Feedback loops: the reason single hormones are never treated alone. */
export const AXES: Axis[] = [
  { id: 'hpa', n: 'Axa stresului (HPA)', plain: 'Creierul simte o cerere, suprarenalele răspund cu cortizol, iar cortizolul oprește singur circuitul.', path: ['hypothalamus', 'pituitary', 'adrenal'], steps: ['Hipotalamusul eliberează CRH.', 'Hipofiza răspunde cu ACTH.', 'Suprarenalele produc cortizol.', 'Cortizolul apasă frâna pe hipotalamus și hipofiză.'], breaks: 'Somn puțin, deficit mare, stres continuu, antrenament fără pauză.', fix: 'Lumină dimineața, somn regulat, 5 minute de respirație, deload la timp.', sys: ['stress'] },
  { id: 'hpg', n: 'Axa reproductivă (HPG)', plain: 'Creierul verifică dacă are destulă energie, apoi dă voie testiculelor sau ovarelor să producă hormoni.', path: ['hypothalamus', 'pituitary', 'gonads'], steps: ['Hipotalamusul trimite pulsuri de GnRH.', 'Hipofiza eliberează LH și FSH.', 'Testiculele sau ovarele produc testosteron, estradiol, spermatozoizi.', 'Testosteronul, estradiolul și inhibina frânează semnalul.'], breaks: 'Deficit caloric prelungit, grăsime corporală foarte mică sau prea mare, somn scurt, alcool.', fix: 'Energie suficientă, somn peste 7,5 ore, forță, grăsime corporală în zona sănătoasă.', sys: ['sex'] },
  { id: 'hpt', n: 'Axa tiroidiană (HPT)', plain: 'Creierul reglează turația metabolismului în funcție de câtă energie primește.', path: ['hypothalamus', 'pituitary', 'thyroid', 'liver'], steps: ['Hipotalamusul eliberează TRH.', 'Hipofiza eliberează TSH.', 'Tiroida produce mai ales T4.', 'Ficatul și alte țesuturi transformă T4 în T3, forma activă.'], breaks: 'Dietă lungă și agresivă, carbohidrați foarte puțini, lipsă de iod sau seleniu.', fix: 'Pauze de dietă, carbohidrați în jurul antrenamentului, iod și seleniu din alimente.', sys: ['thyroid'] },
  { id: 'gh', n: 'Axa de creștere (GH/IGF-1)', plain: 'Noaptea, în somnul profund, creierul pornește repararea. Ficatul transformă semnalul în IGF-1.', path: ['hypothalamus', 'pituitary', 'liver'], steps: ['GHRH pornește secreția, somatostatina o oprește.', 'Hipofiza eliberează GH în pulsuri, cel mai mare la începutul nopții.', 'Ficatul răspunde cu IGF-1, dacă are energie și proteine.'], breaks: 'Somn fragmentat, alcool seara, aport mic de proteine sau energie.', fix: 'Somn profund, antrenament intens, proteine suficiente.', sys: ['growth'] },
  { id: 'insulin', n: 'Axa intestin-pancreas', plain: 'Intestinul anunță pancreasul că vine mâncare, înainte ca glicemia să crească.', path: ['gut', 'pancreas', 'liver'], steps: ['Mâncarea eliberează GLP-1 și GIP din intestin.', 'Pancreasul eliberează insulină și amilină, frânează glucagonul.', 'Mușchii și ficatul preiau glucoza.', 'PYY și CCK închid masa și trimit sațietatea la creier.'], breaks: 'Sedentarism, somn puțin, mese foarte rapide, ultraprocesate.', fix: 'Mușchi mai mulți, plimbare după masă, fibre și proteine la început de masă.', sys: ['metabolic', 'appetite'] },
  { id: 'energy', n: 'Axa energiei (leptină, grelină)', plain: 'Grăsimea și stomacul îi spun creierului câtă energie ai. El decide foamea, tiroida și reproducerea.', path: ['fat', 'stomach', 'hypothalamus'], steps: ['Leptina raportează rezervele de grăsime.', 'Grelina raportează stomacul gol.', 'Hipotalamusul reglează foamea și consumul de energie.'], breaks: 'Dietă lungă, somn puțin, slăbit foarte rapid.', fix: 'Ritm de 0,5–0,7% pe săptămână, refeed-uri, somn lung.', sys: ['appetite', 'metabolic'] },
  { id: 'clock', n: 'Ceasul intern', plain: 'Lumina dimineții și întunericul serii sincronizează aproape toți hormonii.', path: ['pineal', 'hypothalamus', 'adrenal'], steps: ['Lumina dimineții oprește melatonina și ridică alerta.', 'Orexina ține creierul treaz peste zi.', 'Întunericul pornește melatonina seara.', 'Somnul profund aduce GH, somnul de dimineață aduce vârful de cortizol.'], breaks: 'Schimburi în rotație, lumină puternică înainte de somn, cafeină târzie.', fix: 'Ore fixe pe fiecare schimb, lumină la momentul potrivit, întuneric total la somn.', sys: ['sleep', 'stress'] },
  { id: 'raas', n: 'Axa apei și a sării (RAAS)', plain: 'Rinichii apără volumul de sânge și tensiunea, reținând apă și sare când lipsesc.', path: ['kidney', 'liver', 'adrenal', 'heart'], steps: ['Rinichiul eliberează renină când scade volumul.', 'Se formează angiotensina II, care strânge vasele.', 'Aldosteronul reține sodiu, vasopresina reține apă.', 'Inima eliberează ANP când volumul e prea mare.'], breaks: 'Deshidratare, sare foarte multă sau foarte puțină, alcool, potasiu puțin.', fix: 'Apă după sete și culoarea urinei, sare constantă, legume și fructe bogate în potasiu.', sys: ['fluid'] },
  { id: 'calcium', n: 'Axa calciului și oaselor', plain: 'Oasele, rinichii și glandele paratiroide împart calciul și fosforul.', path: ['skin', 'kidney', 'parathyroid', 'bone'], steps: ['Soarele produce vitamina D în piele.', 'Rinichiul o activează în calcitriol.', 'PTH crește când calciul scade.', 'FGF23 elimină fosforul în exces.'], breaks: 'Lipsă de soare, calciu puțin în dietele lungi, aditivi cu fosfați, deficit energetic.', fix: 'Sărituri și ridicări grele, calciu din alimente, vitamina D după analize.', sys: ['bone'] },
];

export type LeverId = 'sleep' | 'light' | 'energy' | 'protein' | 'fiber' | 'fat' | 'strength' | 'cardio' | 'calm' | 'water' | 'micro' | 'clean';

export interface Lever { id: LeverId; n: string; rule: string; gain: string; sys: SysId[] }

/** Twelve habits cover all 44 hormones. Nobody has to remember the hormones, only these. */
export const LEVERS: Lever[] = [
  { id: 'sleep', n: 'Somn', rule: '7,5–9 ore în 24 de ore, la orele fixe ale fiecărui schimb', gain: 'Cel mai puternic reglaj: testosteron, GH, insulină, foame, cortizol.', sys: ['sex', 'growth', 'stress', 'metabolic', 'appetite', 'sleep'] },
  { id: 'light', n: 'Lumină', rule: 'Lumină puternică la trezire și în prima parte a nopții, întuneric înainte de somn, ochelari de soare după schimbul 3', gain: 'Ceas intern corect, adormi mai ușor, energie dimineața.', sys: ['sleep', 'stress'] },
  { id: 'energy', n: 'Energie', rule: 'Din planul Beast Nutrition, cu disponibilitate energetică peste 30 kcal/kg FFM', gain: 'Protejează tiroida, testosteronul, leptina și masa musculară.', sys: ['sex', 'thyroid', 'growth', 'appetite', 'bone'] },
  { id: 'protein', n: 'Proteine', rule: 'Din planul Beast Nutrition, cu proteine la fiecare masă', gain: 'Mușchi, sațietate, IGF-1 corect.', sys: ['growth', 'appetite', 'metabolic'] },
  { id: 'fiber', n: 'Fibre și plante', rule: 'Din planul Beast Nutrition: legume la fiecare masă, ultraprocesate cât mai puțin', gain: 'Glicemie stabilă, GLP-1 și PYY mai bune, mai puțină foame.', sys: ['metabolic', 'appetite'] },
  { id: 'fat', n: 'Grăsimi bune', rule: 'Din planul Beast Nutrition, minimum 0,7 g/kg ca să nu scadă testosteronul', gain: 'Sprijină hormonii sexuali, adiponectina și absorbția vitaminelor.', sys: ['sex', 'metabolic'] },
  { id: 'strength', n: 'Forță', rule: 'Planul din Inner Beast, la ora potrivită schimbului', gain: 'Mușchi, sensibilitate la insulină, oase, testosteron bun pe termen lung.', sys: ['sex', 'growth', 'metabolic', 'bone'] },
  { id: 'cardio', n: 'Pași și zona 2', rule: '8.000–10.000 de pași, 10 minute după masa principală', gain: 'Glicemie, inimă, tensiune, adiponectină, recuperare.', sys: ['metabolic', 'fluid', 'stress'] },
  { id: 'calm', n: 'Reglarea stresului', rule: '5 minute de respirație zilnic, natură, deload la 4–8 săptămâni', gain: 'Coboară cortizolul și adrenalina când nu ai nevoie de ele.', sys: ['stress', 'sex', 'sleep'] },
  { id: 'water', n: 'Apă și minerale', rule: 'Urină galben-pal, sare constantă, potasiu din plante', gain: 'Volum de sânge, tensiune, performanță, mai puțină vasopresină.', sys: ['fluid'] },
  { id: 'micro', n: 'Micronutrienți', rule: 'Fier, vitamina D, zinc, magneziu, iod, seleniu, corectate doar după analize', gain: 'Scoți frânele ascunse pentru tiroidă, testosteron și sânge.', sys: ['thyroid', 'bone', 'sex'] },
  { id: 'clean', n: 'Curățenie', rule: 'Alcool rar, fără nicotină, cafeina oprită la ora din protocol', gain: 'Somn profund, testosteron, ficat, tensiune.', sys: ['sex', 'sleep', 'fluid', 'growth'] },
];
