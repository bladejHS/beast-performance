# Beast Performance

A treia aplicație din familie: Inner Beast aduce disciplina, Beast Nutrition combustibilul, Beast Performance le leagă. Protocol zilnic pentru hormoni, analize, recuperare și performanță maximă, după faza în care ești: cut, reverse diet, lean bulk, menținere.

Live: https://bladejhs.github.io/beast-performance/

- **Health Overview**: inelul celor 44 de hormoni, prioritățile zilei, echilibrul dintre încărcare și recuperare.
- **Protocolul de azi**: calorii, macronutrienți și ziua oră cu oră, după fază. Cifrele vin din Beast Nutrition dacă ai un plan acolo.
- **Performance Protocols**: definire, forță, masă, condiționare, viteză, recuperare, sănătate, mobilitate, focus. Fiecare are doză de progres, doză de menținere și teste. Testele arată veriga slabă.
- **Hormone Database**: toți cei 44 de hormoni, explicați simplu, cu direcția bună, beneficiile și protocolul.
- **Bloodwork & Biomarkers**: 60+ markeri, lipire text de la laborator, grafice bullet, corecție pentru fiecare valoare care nu e bună și pragul la care mergi la medic.
- **Endocrine Systems**: harta glandelor și cele nouă axe hormonale.
- **Symptoms & Health Tracking**: check-in zilnic și simptome, fiecare cu ce faci și când mergi la medic.
- **Recovery & Physiological Data**: disponibilitate din somn, HRV și puls, încărcare session-RPE, tendințe.
- **AI Health Intelligence**: reguli locale, fără internet, plus Claude opțional, cu cheia ta.

Datele stau doar în browser. Aplicația citește `beast:v1`, `beast:plan:v1` și `beast-nutrition:v2` de pe același domeniu și nu scrie niciodată în ele.

## Cercetare

Fiecare afirmație cu cifră vine din rezumatul studiului citat. Linkurile PubMed au fost rezolvate prin API-ul NCBI, iar ghidurile au fost verificate manual. Lista completă e în `src/data/refs.gen.ts` și în ecranul Surse. Fiecare pas are un nivel de dovezi: A (meta-analize, ghiduri), B (studii controlate), C (studii mici, mecanism), D (practică de antrenor). Testele din `src/logic/logic.test.ts` refuză o citare care nu există.

Reperele de sprint, sărituri, 5 km și tracțiuni sunt repere de antrenor, nu norme publicate. Benzile „optim” din analize sunt practică sportivă acolo unde nu există un ghid.

## Design

Emblema e fuziunea exactă a celor doi lupi: jumătatea roșie din Inner Beast, jumătatea albastră din Beast Nutrition. Roșu înseamnă încărcare, albastru refacere. Tot restul graficii e desenat din cod (`scripts/art.mjs`), în același limbaj de fațete.

Reguli urmate: bullet graph pentru analize (Stephen Few), raport mare date-cerneală (Tufte), statusul nu e transmis doar prin culoare (WCAG 1.4.1), detaliile se deschid la cerere, suprafețe mai deschise pentru elevație pe temă întunecată. Animația de deschidere respectă `prefers-reduced-motion`.

## Dezvoltare

```sh
npm install
npm test        # logica și integritatea datelor
npm run build   # tsc + vite + service worker
npm run art     # redesenează arta SVG
```

Publicată pe GitHub Pages la fiecare push pe `main`. Fonturi: Saira și Barlow (SIL OFL 1.1).

Aplicația e educațională. Nu pune diagnostice și nu înlocuiește medicul.
