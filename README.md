# Pramukh View — બાંધકામ મેનેજમેન્ટ સોફ્ટવેર

**Pramukh Builders & Shreeji Builders** માટેનું સોફ્ટવેર. ડિઝાઇન, કલર અને લોગો Pramukh View ના બ્રોશર પ્રમાણે છે.
દરેક વ્યક્તિ પોતાના મોબાઇલ નંબર + PIN થી લોગિન કરે છે, અને તેને ફક્ત તેના કામનું જ દેખાય છે.

## કોને શું દેખાય છે

| લોગિન | શું જોઈ / કરી શકે |
|---|---|
| **ભાગીદાર** | બધું. સ્ટાફ, કોન્ટ્રાક્ટરના લોગિન બનાવવા, બેકઅપ |
| **સ્ટાફ / સુપરવાઇઝર** | ભાગીદાર જે ટિક કરે તે જ: દૈનિક રિપોર્ટ લખવો · બધાના દૈનિક રિપોર્ટ જોવા · ફ્લેટ માલિકો · પ્લાન મંજૂરી (સિવિલ) · મજૂર · દૈનિક મુલાકાતીઓ |
| **કોન્ટ્રાક્ટર** | **મંજૂર થયેલા પ્લાન ફેરફાર** અને ફ્લેટ ચાર્ટ (ગ્રાહકનું નામ કે નંબર નહીં). ભાગીદાર ટિક કરે તો દૈનિક રિપોર્ટ અને મજૂર પણ |
| **ફ્લેટ માલિક** | ફક્ત **પોતાનો ફ્લેટ**: વિગત, પ્લાન, ફેરફારની વિનંતી અને તેનો જવાબ. બીજા કોઈ ફ્લેટ કે ગ્રાહકની માહિતી નહીં |

## મુખ્ય ભાગ

- **📋 દૈનિક કામ:** સુપરવાઇઝર રોજ "આજે શું કામ થયું" લખે, સાઇટના ફોટા મૂકે અને "આવતીકાલે શું કામ થશે" લખે.
  બીજા દિવસે એ લિસ્ટ **ચેકલિસ્ટ** બનીને આવે: દરેક કામ ✓ થયું / ✕ નથી થયું. બાકી રહેલું કામ એક ટચમાં ફરી આવતીકાલમાં ઉમેરાય.
  ભાગીદારો "બધાના રિપોર્ટ" માં દરેક સુપરવાઇઝરનું કામ, ફોટા અને ચેકલિસ્ટ જુએ.
- **📐 પ્લાન ફેરફાર:** ફ્લેટ માલિક પોતાના લોગિનમાંથી ફેરફાર દોરેલા પ્લાનનો ફોટો મોકલે → સિવિલ વિભાગ મંજૂર / નામંજૂર કરે (કારણ સાથે, જરૂર હોય તો ફાઇનલ પ્લાન મૂકે) → મંજૂર થયેલું કોન્ટ્રાક્ટરને દેખાય → કામ પૂરું થાય એટલે કોન્ટ્રાક્ટર "કામ પૂરું થયું" દબાવે.
  ફ્લેટ ચાર્ટ અને ફ્લેટ લિસ્ટમાં જે ફ્લેટમાં ફેરફાર મંજૂર થયો હોય તે **જાંબલી** કલરમાં દેખાય છે.
- **🧱 મટીરીયલ બિલ** (અત્યારે બંધ છે; સર્વર પર `MATERIALS=on` કરવાથી ચાલુ થાય): બિલનો ફોટો પાડો → સોફ્ટવેર સપ્લાયર, તારીખ, માલ અને રકમ જાતે વાંચે (Claude AI) → ચેક કરીને સેવ કરો.
  **મહિનાનો હિસાબ:** કયા સપ્લાયરનું કેટલું બિલ, કેટલું ચૂકવાયું, કેટલું બાકી. પેમેન્ટ થાય એટલે ☑ ટિક કરો.
  **બેંક સ્ટેટમેન્ટ:** CSV (કે PDF) અપલોડ કરો, સોફ્ટવેર બેંકમાંથી ગયેલી રકમને બાકી બિલ સાથે મેળવીને બતાવે કયા ચૂકવાઈ ગયા.
- **🚶 દૈનિક મુલાકાતીઓ:** સાઇટ / ઓફિસ પર આવતા લોકોની એન્ટ્રી, ફોલો-અપ તારીખ. ફક્ત જેને પરવાનગી હોય તેને જ દેખાય.
- **🏢 ફ્લેટ:** ફ્લેટ ચાર્ટ (બુકિંગ / પ્લાન ફેરફાર), ફ્લેટ માલિકો અને તેમના લોગિન, ક્વોટેશન પ્રિન્ટ.
- **👷 મજૂર**, **🏙️ પ્રોજેક્ટ માહિતી** (બ્રોશરની બધી વિગત), **ગુજરાતી / English**.

ગ્રાહકના પેમેન્ટનો હિસાબ આ સોફ્ટવેરમાં નથી રાખ્યો.

## કેવી રીતે ચલાવવું

કમ્પ્યુટર પર [Node.js](https://nodejs.org) (20 કે નવું) ઇન્સ્ટોલ કરો, પછી આ ફોલ્ડરમાં:

```bash
npm install
npm start
```

બ્રાઉઝરમાં **http://localhost:3000** ખોલો. પહેલી વાર ભાગીદારનું એકાઉન્ટ બનાવવાનું પૂછશે.
પછી **ડેશબોર્ડ → Pramukh View સેટઅપ કરો** દબાવો, એટલે 70 ફ્લેટ બની જશે.

### બિલનો ફોટો આપોઆપ વાંચવા માટે

[Claude Console](https://console.anthropic.com) માંથી API key લઈને સર્વર ચાલુ કરતી વખતે આપો:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm start
```

Key ન હોય તો પણ સોફ્ટવેર ચાલે છે. ફક્ત બિલની વિગત જાતે નાખવી પડશે (ફોટો સાથે રહેશે).
દરેક બિલ વાંચવાનો થોડો ખર્ચ Anthropic ના બિલમાં આવે છે.

### Render પર ઓનલાઇન મૂકવું (ફોનથી પણ થાય)

**ફ્રી ટ્રાયલ** (પેમેન્ટ વગર): `render.yaml` ફ્રી સર્વર અને ફ્રી Postgres ડેટાબેઝ બનાવે છે. ડેટા અને ફોટા ડેટાબેઝમાં સચવાય છે.

1. [render.com](https://render.com) પર GitHub થી સાઇન ઇન કરો.
2. **New → Blueprint** → આ repository પસંદ કરો → **Apply**.
3. 5–10 મિનિટમાં `https://pramukh-view-….onrender.com` લિંક મળશે. તે ખોલીને ભાગીદારનું એકાઉન્ટ બનાવો.

ફ્રી પ્લાનની મર્યાદા: 15 મિનિટ કોઈ ન વાપરે તો સર્વર સૂઈ જાય (પછી પહેલી વાર ખૂલતાં ~1 મિનિટ લાગે), અને ફ્રી ડેટાબેઝ **30 દિવસ** પછી બંધ થાય.
કાયમી ઉપયોગ માટે Render માં સર્વરને **Starter** અને ડેટાબેઝને **Basic** પ્લાન પર ફેરવો (આશરે $14 મહિને). ડેટા એ જ રહે છે.

### બીજે કોઈ પણ સર્વર પર

ફ્લેટ માલિકો અને કોન્ટ્રાક્ટર પોતાના ફોનથી લોગિન કરે તે માટે આ સોફ્ટવેર ઇન્ટરનેટ પરના સર્વર પર ચાલવું જોઈએ.
કોઈ પણ Node.js સર્વર (VPS, Render, Railway વગેરે) ચાલે:

- `npm install` પછી `npm start` ચલાવો. પોર્ટ `PORT` થી બદલી શકાય.
- `DATABASE_URL` આપો તો ડેટા અને ફોટા Postgres માં રહે છે. ન આપો તો `data/` ફોલ્ડરમાં (અથવા `DATA_DIR`). આ ફોલ્ડર **કાયમી ડિસ્ક** પર હોવું જોઈએ, અને તેનો નિયમિત બેકઅપ લેવો.
- વેબસાઇટ **HTTPS** પર ચલાવો (ડોમેન સાથે), જેથી PIN સુરક્ષિત રીતે જાય.

---

## English

Role-based web app for Pramukh View (Pramukh Builders & Shreeji Builders): partners, staff and supervisors with ticked permissions,
contractors and flat owners each log in with mobile number + PIN and see only what their role allows.

- **Plan changes:** owner uploads a marked-up plan → civil approver approves/rejects (optional final drawing) → contractor sees approved changes and marks them done. Flats with approved changes are highlighted in the chart and list.
- **Material bills:** photo → Claude (`claude-opus-5-5`, structured output) extracts supplier, bill no., date, items, GST and total for review; monthly per-supplier totals with paid ticks; bank statement CSV/PDF matched to pending bills by amount and supplier name.
- **Daily site reports:** supervisors log work done, photos and tomorrow's plan; the next day the plan becomes a done / not-done checklist. Partners see every supervisor's report per day.
- Material bills are switched off by default (`MATERIALS=on` enables them).
- **Daily visitors**, labour and attendance, flat chart, quotations, project info from the brochure.

Run: `npm install && npm start` (Node 20+). Storage: Postgres when `DATABASE_URL` is set (data as one JSONB document, uploads as BYTEA), otherwise a JSON file and uploads folder under `DATA_DIR`. Deploy on Render with the included `render.yaml` blueprint (free web service + free Postgres for trials). Set `ANTHROPIC_API_KEY` to enable bill/statement reading. Data lives in `data/` (`DATA_DIR`).

### Code layout

- `server/server.js` – HTTP server, API routes, file uploads
- `server/auth.js` – mobile + PIN login (scrypt hashes), sessions, lockout after 5 wrong PINs
- `server/rules.js` – what each role may read and write (enforced on the server)
- `server/ai.js` – bill and bank statement reading with the Anthropic SDK
- `server/db.js` – storage (Postgres or JSON file + uploads folder); `server/demo.js` – Pramukh View flats and demo data
- `public/` – the web app (`js/app.js` core, `pages.js`, `changes.js`, `materials.js`, `entities.js`, `i18n.js`, `brand.js`)
