# પ્રમુખ બિલ્ડર્સ — બાંધકામ મેનેજમેન્ટ સોફ્ટવેર (ડેમો)

બિલ્ડરો માટેનું સોફ્ટવેર. તેમાં પ્રોજેક્ટ, ફ્લેટ, ગ્રાહકોનાં બુકિંગ અને પેમેન્ટ, મટીરીયલ, ખર્ચ અને મજૂરીનો બધો હિસાબ એક જગ્યાએ રાખી શકાય છે.
ગુજરાતી અને અંગ્રેજી બંને ભાષામાં ચાલે છે, અને મોબાઇલ તથા કમ્પ્યુટર બંને પર વાપરી શકાય છે.

## કેવી રીતે ચલાવવું

1. આ ફોલ્ડરમાં `index.html` ફાઇલ પર ડબલ-ક્લિક કરો. તે બ્રાઉઝરમાં (Chrome / Edge) ખુલશે.
2. પહેલી વાર ખોલો ત્યારે **"સેમ્પલ ડેટા લોડ કરો"** દબાવો, જેથી સોફ્ટવેર કેવું દેખાય છે તે જોઈ શકો.
3. ઉપર **English / ગુજરાતી** બટનથી ભાષા બદલી શકાય છે.

ઇન્સ્ટોલ કરવાની કે ઇન્ટરનેટની જરૂર નથી.

## મોડ્યુલ (ભાગો)

| ભાગ | શું થાય છે |
|---|---|
| 📊 ડેશબોર્ડ | કુલ વેચાણ, મળેલ રકમ, બાકી રકમ, ખર્ચ અને પ્રોજેક્ટ પ્રમાણે નફો. સૌથી વધુ બાકી હોય તેવા ગ્રાહકોનું લિસ્ટ |
| 🏢 પ્રોજેક્ટ અને યુનિટ | પ્રોજેક્ટ અને દરેક ફ્લેટ / દુકાન / બંગલો / પ્લોટ. યુનિટની સ્થિતિ (ખાલી / બુક / વેચાયેલ) આપોઆપ દેખાય છે |
| 🤝 બુકિંગ અને પેમેન્ટ | ગ્રાહકનું બુકિંગ, દરેક હપ્તાની એન્ટ્રી, બાકી રકમ અને **રસીદ પ્રિન્ટ** |
| 🧱 મટીરીયલ અને ખર્ચ | સિમેન્ટ, સળિયા, રેતી વગેરેની ખરીદી, સપ્લાયરને આપવાના બાકી, અને અન્ય ખર્ચ (સરકારી ફી, ભાડું, લાઇટ બિલ વગેરે) |
| 👷 મજૂર અને કોન્ટ્રાક્ટર | રોજમદાર અને કોન્ટ્રાક્ટર, **દૈનિક હાજરી**, મજૂરીની આપોઆપ ગણતરી અને ચુકવણી |
| ⚙️ સેટિંગ્સ | ભાષા, બેકઅપ ડાઉનલોડ, બેકઅપ પાછો લાવવો, સેમ્પલ ડેટા |

## ⚠️ ડેમો વિશે મહત્વની વાત

આ ડેમો વર્ઝનમાં ડેટા **ફક્ત એ જ બ્રાઉઝરમાં** સેવ થાય છે.
બીજા કમ્પ્યુટર કે મોબાઇલમાં તે ડેટા દેખાશે નહીં. બ્રાઉઝરનો ડેટા (history/cache) ક્લિયર કરશો તો ડેટા જતો રહેશે.
એટલે **સેટિંગ્સ → બેકઅપ ડાઉનલોડ કરો** નિયમિત કરતા રહો.

પૂરા વર્ઝનમાં લોગિન, ઓનલાઇન ડેટાબેઝ અને ઘણા યુઝર્સ (ઓફિસ સ્ટાફ, સાઇટ સુપરવાઇઝર) ઉમેરી શકાશે.

---

## English

Construction management demo for builders: projects and units, customer bookings and payments (with printable receipts),
material purchases and expenses, labour and contractors with daily attendance. Gujarati and English UI.

Open `index.html` in a browser. No build step or server is needed. Data is stored in the browser's `localStorage`; use Settings → Download backup to keep a copy.

### Code layout

- `index.html` – page shell
- `css/style.css` – styles (responsive, light/dark, print receipt)
- `js/i18n.js` – Gujarati / English text
- `js/store.js` – localStorage data store
- `js/calc.js` – dues, wages, project summaries
- `js/entities.js` – form fields and table columns for each record type
- `js/sample.js` – sample data
- `js/app.js` – navigation, lists, forms, dashboard, attendance, settings
