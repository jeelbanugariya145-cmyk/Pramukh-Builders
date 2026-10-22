# Pramukh View — બાંધકામ મેનેજમેન્ટ સોફ્ટવેર

**Pramukh Builders & Shreeji Builders** માટેનું સોફ્ટવેર. ડિઝાઇન, કલર અને લોગો Pramukh View ના બ્રોશર પ્રમાણે છે.
દરેક વ્યક્તિ પોતાના મોબાઇલ નંબર + PIN થી લોગિન કરે છે, અને તેને ફક્ત તેના કામનું જ દેખાય છે.

## કોને શું દેખાય છે

| લોગિન | શું જોઈ / કરી શકે |
|---|---|
| **ભાગીદાર** | બધું. સ્ટાફ, કોન્ટ્રાક્ટરના લોગિન બનાવવા, બેકઅપ |
| **સ્ટાફ** | ભાગીદાર જે ટિક કરે તે જ: ફ્લેટ માલિકો · પ્લાન મંજૂરી (સિવિલ) · મટીરીયલ બિલ / ખર્ચ · મજૂર · દૈનિક મુલાકાતીઓ |
| **કોન્ટ્રાક્ટર** | ફક્ત **મંજૂર થયેલા પ્લાન ફેરફાર** અને ફ્લેટ ચાર્ટ (ગ્રાહકનું નામ કે નંબર નહીં) |
| **ફ્લેટ માલિક** | ફક્ત **પોતાનો ફ્લેટ**: વિગત, પ્લાન, ફેરફારની વિનંતી અને તેનો જવાબ. બીજા કોઈ ફ્લેટ કે ગ્રાહકની માહિતી નહીં |

## મુખ્ય ભાગ

- **📐 પ્લાન ફેરફાર:** ફ્લેટ માલિક પોતાના લોગિનમાંથી ફેરફાર દોરેલા પ્લાનનો ફોટો મોકલે → સિવિલ વિભાગ મંજૂર / નામંજૂર કરે (કારણ સાથે, જરૂર હોય તો ફાઇનલ પ્લાન મૂકે) → મંજૂર થયેલું કોન્ટ્રાક્ટરને દેખાય → કામ પૂરું થાય એટલે કોન્ટ્રાક્ટર "કામ પૂરું થયું" દબાવે.
  ફ્લેટ ચાર્ટ અને ફ્લેટ લિસ્ટમાં જે ફ્લેટમાં ફેરફાર મંજૂર થયો હોય તે **જાંબલી** કલરમાં દેખાય છે.
- **🧱 મટીરીયલ બિલ:** બિલનો ફોટો પાડો → સોફ્ટવેર સપ્લાયર, તારીખ, માલ અને રકમ જાતે વાંચે (Claude AI) → ચેક કરીને સેવ કરો.
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

### બધા પોતાના મોબાઇલથી વાપરી શકે તે માટે (ઓનલાઇન)

ફ્લેટ માલિકો અને કોન્ટ્રાક્ટર પોતાના ફોનથી લોગિન કરે તે માટે આ સોફ્ટવેર ઇન્ટરનેટ પરના સર્વર પર ચાલવું જોઈએ.
કોઈ પણ Node.js સર્વર (VPS, Render, Railway વગેરે) ચાલે:

- `npm install` પછી `npm start` ચલાવો. પોર્ટ `PORT` થી બદલી શકાય.
- બધો ડેટા અને અપલોડ થયેલા ફોટા `data/` ફોલ્ડરમાં રહે છે (અથવા `DATA_DIR`). આ ફોલ્ડર **કાયમી ડિસ્ક** પર હોવું જોઈએ, અને તેનો નિયમિત બેકઅપ લેવો.
- વેબસાઇટ **HTTPS** પર ચલાવો (ડોમેન સાથે), જેથી PIN સુરક્ષિત રીતે જાય.

---

## English

Role-based web app for Pramukh View (Pramukh Builders & Shreeji Builders): partners, staff with ticked permissions,
contractors and flat owners each log in with mobile number + PIN and see only what their role allows.

- **Plan changes:** owner uploads a marked-up plan → civil approver approves/rejects (optional final drawing) → contractor sees approved changes and marks them done. Flats with approved changes are highlighted in the chart and list.
- **Material bills:** photo → Claude (`claude-opus-5-5`, structured output) extracts supplier, bill no., date, items, GST and total for review; monthly per-supplier totals with paid ticks; bank statement CSV/PDF matched to pending bills by amount and supplier name.
- **Daily visitors**, labour and attendance, flat chart, quotations, project info from the brochure.

Run: `npm install && npm start` (Node 20+). Set `ANTHROPIC_API_KEY` to enable bill/statement reading. Data lives in `data/` (`DATA_DIR`).

### Code layout

- `server/server.js` – HTTP server, API routes, file uploads
- `server/auth.js` – mobile + PIN login (scrypt hashes), sessions, lockout after 5 wrong PINs
- `server/rules.js` – what each role may read and write (enforced on the server)
- `server/ai.js` – bill and bank statement reading with the Anthropic SDK
- `server/db.js` – JSON file storage; `server/demo.js` – Pramukh View flats and demo data
- `public/` – the web app (`js/app.js` core, `pages.js`, `changes.js`, `materials.js`, `entities.js`, `i18n.js`, `brand.js`)
