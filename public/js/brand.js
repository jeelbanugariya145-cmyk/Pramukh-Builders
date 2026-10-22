// Company and Pramukh View project details (from the official brochure)
const BRAND = {
  project: 'Pramukh View',
  groups: 'Pramukh Builders & Shreeji Builders',
  taglineGu: 'સરનામું... સુખ-સમૃદ્ધિનું...',
  phone: '9081919114',
  phoneDisplay: '9081 9191 14',
  address: '2nd 150 Ft. Ring Road, Speedwell Party Plot Haveli Road, Parsana Chowk, Nr. Tulsi Height, Mota Mava, Rajkot.',
  addressGu: '2nd 150 ફૂટ રિંગ રોડ, સ્પીડવેલ પાર્ટી પ્લોટ હવેલી રોડ, પારસાણા ચોક, તુલસી હાઇટ પાસે, મોટા મવા, રાજકોટ.',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('Pramukh View, Parsana Chowk, Mota Mava, Rajkot'),
  years: '18+',
  customers: '650+',
  pastProjects: ['Pramukh Exotica', 'Shreeji Heights', 'Shreeji Exotica', 'Pramukh Bliss', 'Shreeji Twins', 'Shreeji Prime'],

  // Building layout: used to create all flats automatically
  wings: [
    { wing: 'A', bhk: '4', area: 1775, parking: 2, floors: 14, perFloor: 2 },
    { wing: 'B', bhk: '3', area: 1350, parking: 1, floors: 14, perFloor: 3 }
  ],

  rooms: {
    4: [
      ['Living / Dining', 'લિવિંગ / ડાઇનિંગ', "23'0\" × 18'0\""],
      ['Bedroom 1', 'બેડરૂમ 1', "15'0\" × 11'0\""],
      ['Bedroom 2', 'બેડરૂમ 2', "15'0\" × 11'0\""],
      ['Bedroom 3', 'બેડરૂમ 3', "12'0\" × 11'0\""],
      ['Bedroom 4', 'બેડરૂમ 4', "10'0\" × 12'0\""],
      ['Kitchen', 'કિચન', "10'6\" × 13'0\""],
      ['Porch + F.B.', 'પોર્ચ + F.B.', "13'3\" × 5'6\""],
      ['Wash + F.B. + O.D.U.', 'વોશ એરિયા', "14'9\" × 6'0\""],
      ['Foyer', 'ફોયર', "7'0\" × 6'9\""],
      ['Puja', 'પૂજા રૂમ', "5'6\" × 6'9\""],
      ['Store', 'સ્ટોર', "4'0\" × 5'0\""],
      ['Toilets', 'ટોઇલેટ', '4']
    ],
    3: [
      ['Living', 'લિવિંગ', "12'0\" × 18'0\""],
      ['Dining', 'ડાઇનિંગ', "15'3\" × 9'6\""],
      ['Bedroom 1', 'બેડરૂમ 1', "11'0\" × 14'0\""],
      ['Bedroom 2', 'બેડરૂમ 2', "11'0\" × 13'0\""],
      ['Bedroom 3', 'બેડરૂમ 3', "11'0\" × 10'0\""],
      ['Kitchen', 'કિચન', "10'0\" × 13'0\""],
      ['Porch / F.B.', 'પોર્ચ / F.B.', "11'6\" × 5'0\""],
      ['Wash + F.B. + O.D.U.', 'વોશ એરિયા', "14'9\" × 5'6\""],
      ['Store', 'સ્ટોર', "5'0\" × 4'0\""],
      ['Puja / Shoe rack', 'પૂજા / શૂ રેક', '✓'],
      ['Toilets', 'ટોઇલેટ', '3']
    ]
  },

  amenities: [
    ['🏋️', 'Gym', 'જીમ'],
    ['🏛️', 'Multipurpose Hall', 'મલ્ટીપર્પઝ હોલ'],
    ['🛎️', 'Grand Reception Area', 'ગ્રાન્ડ રિસેપ્શન'],
    ['🌳', 'Green Landscaping', 'ગ્રીન લેન્ડસ્કેપિંગ'],
    ['🛝', 'Children Play Area', 'બાળકો માટે રમતનું મેદાન'],
    ['⛱️', 'Gazebo', 'ગઝેબો'],
    ['🧓', 'Senior Citizen Seating', 'સિનિયર સિટીઝન બેઠક'],
    ['🚗', '2 Car Parking for 4 BHK', '4 BHK માટે 2 કાર પાર્કિંગ'],
    ['🚙', '1 Car Parking for 3 BHK', '3 BHK માટે 1 કાર પાર્કિંગ'],
    ['🪑', 'Outdoor Sitting', 'આઉટડોર બેઠક'],
    ['📞', 'Intercom', 'ઇન્ટરકોમ'],
    ['📹', 'CCTV for Common Area', 'કોમન એરિયામાં CCTV'],
    ['🧯', 'Fire Safety System', 'ફાયર સેફ્ટી'],
    ['💂', 'Security Room', 'સિક્યોરિટી રૂમ'],
    ['🚧', 'Grand Entrance with Boom Barrier', 'બૂમ બેરિયર સાથે એન્ટ્રી ગેટ'],
    ['🚸', 'Children Pick-up / Drop-off Point', 'બાળકો માટે પિક-અપ / ડ્રોપ પોઇન્ટ'],
    ['🔋', 'Power Backup for Common Area', 'કોમન એરિયા માટે પાવર બેકઅપ'],
    ['🛗', 'Auto Door Lift', 'ઓટો ડોર લિફ્ટ'],
    ['☀️', 'Solar Water Heater', 'સોલર વોટર હીટર'],
    ['🔥', 'Gas Connection', 'ગેસ કનેક્શન']
  ],

  specs: [
    ['Kitchen', 'કિચન', 'Granite / colourful slab platform with glazed tiles, S.S. sink & wall tiles till slab level.', 'ગ્રેનાઇટ / કલરફુલ સ્લેબ પ્લેટફોર્મ, ગ્લેઝ્ડ ટાઇલ્સ, SS સિંક અને સ્લેબ સુધી વોલ ટાઇલ્સ.'],
    ['Water Storage', 'પાણીની ટાંકી', 'Underground and overhead water tank.', 'અંડરગ્રાઉન્ડ અને ઓવરહેડ પાણીની ટાંકી.'],
    ['Door / Window', 'દરવાજા / બારી', 'All windows with powder coated aluminium section without mosquito net. Doors and locks not provided by builder.', 'પાવડર કોટેડ એલ્યુમિનિયમ બારી (મચ્છર જાળી વગર). દરવાજા અને લોક બિલ્ડર તરફથી નથી.'],
    ['Electrification', 'ઇલેક્ટ્રિક', 'Modular switches of standard company.', 'સ્ટાન્ડર્ડ કંપનીની મોડ્યુલર સ્વિચ.'],
    ['Bathrooms', 'બાથરૂમ', 'Designer concept wall tiles.', 'ડિઝાઇનર વોલ ટાઇલ્સ.'],
    ['Flooring', 'ફ્લોરિંગ', 'Vitrified / GVT tiles of standard company.', 'સ્ટાન્ડર્ડ કંપનીની વિટ્રીફાઇડ / GVT ટાઇલ્સ.'],
    ['Lift', 'લિફ્ટ', 'Auto door standard company lift.', 'સ્ટાન્ડર્ડ કંપનીની ઓટો ડોર લિફ્ટ.'],
    ['Colour', 'કલર', 'Exterior acrylic paint and interior semi finish putty.', 'બહાર એક્રેલિક પેઇન્ટ અને અંદર સેમી ફિનિશ પુટ્ટી.'],
    ['Plumbing', 'પ્લમ્બિંગ', 'Concealed plumbing fitting of standard company.', 'સ્ટાન્ડર્ડ કંપનીનું કન્સીલ્ડ પ્લમ્બિંગ.']
  ],

  landmarks: ['Parsana Circle', 'Aadarsh Circle', 'Speedwell Circle', 'RK University', 'RV Sports Arena', 'Udaan School', 'Govt. Engineering College', 'Radhe Chowk']
};

// Pick the Gujarati or English entry of a [.., en, gu, ..] pair
const pick = (en, gu) => (LANG === 'gu' ? gu : en);
