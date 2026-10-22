# Pramukh View — બાંધકામ મેનેજમેન્ટ સોફ્ટવેર (ડેમો)

**Pramukh Builders & Shreeji Builders** માટેનું સોફ્ટવેર. ડિઝાઇન, કલર અને લોગો Pramukh View ના બ્રોશર પ્રમાણે છે. તેમાં પ્રોજેક્ટ, ફ્લેટ, ગ્રાહકોનાં બુકિંગ અને પેમેન્ટ, મટીરીયલ, ખર્ચ અને મજૂરીનો બધો હિસાબ એક જગ્યાએ રાખી શકાય છે.
ગુજરાતી અને અંગ્રેજી બંને ભાષામાં ચાલે છે, અને મોબાઇલ તથા કમ્પ્યુટર બંને પર વાપરી શકાય છે.

## કેવી રીતે ચલાવવું

1. આ ફોલ્ડરમાં `index.html` ફાઇલ પર ડબલ-ક્લિક કરો. તે બ્રાઉઝરમાં (Chrome / Edge) ખુલશે.
2. પહેલી વાર ખોલો ત્યારે **"Pramukh View સેટઅપ કરો"** દબાવો. એનાથી બધા 70 ફ્લેટ (વિંગ A: 28 × 4 BHK, વિંગ B: 42 × 3 BHK) આપોઆપ બની જશે.
   પછી **પ્રોજેક્ટ → સુધારો** માં 3 BHK અને 4 BHK ની કિંમત નાખો.
   ફક્ત જોવા માટે **"સેમ્પલ ડેટા લોડ કરો"** પણ દબાવી શકાય.
3. ઉપર **English / ગુજરાતી** બટનથી ભાષા બદલી શકાય છે.

ઇન્સ્ટોલ કરવાની કે ઇન્ટરનેટની જરૂર નથી.

## મોડ્યુલ (ભાગો)

| ભાગ | શું થાય છે |
|---|---|
| 🏙️ પ્રોજેક્ટ માહિતી | બ્રોશરની બધી વિગત: ફ્લેટ પ્લાન, રૂમ સાઇઝ, સુવિધાઓ, સ્પેસિફિકેશન, લોકેશન, કોલ / WhatsApp / નકશો |
| 📊 ડેશબોર્ડ | કુલ વેચાણ, મળેલ રકમ, બાકી રકમ, ખર્ચ અને પ્રોજેક્ટ પ્રમાણે નફો. સૌથી વધુ બાકી હોય તેવા ગ્રાહકોનું લિસ્ટ |
| 🏢 પ્રોજેક્ટ અને યુનિટ | **ફ્લેટ ચાર્ટ** (કયો ફ્લેટ ખાલી / બુક છે), દરેક ફ્લેટની વિગત અને **ક્વોટેશન પ્રિન્ટ** |
| 🤝 બુકિંગ અને પેમેન્ટ | ગ્રાહકનું બુકિંગ, દરેક હપ્તાની એન્ટ્રી, બાકી રકમ, **રસીદ પ્રિન્ટ** અને ગ્રાહકને **WhatsApp પર બાકી રકમનું રિમાઇન્ડર** |
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
- `js/brand.js` – Pramukh View details from the brochure (layout, rooms, amenities, specs, contact)
- `assets/` – logos, renders, plans and location map taken from the brochure
- `js/store.js` – localStorage data store
- `js/calc.js` – dues, wages, project summaries
- `js/entities.js` – form fields and table columns for each record type
- `js/sample.js` – sample data
- `js/app.js` – navigation, lists, forms, dashboard, attendance, settings
