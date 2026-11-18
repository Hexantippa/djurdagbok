import { Category, DiaryEvent, Pet } from '../types/models';

export const CAT_IDS = {
  VET: 'cat-veterinarvard',
  WEIGHT: 'cat-vikt',
  FOOD: 'cat-foder',
  SYMPTOM: 'cat-skador-symptom',
  TOILET: 'cat-urin-avforing',
  MEDS: 'cat-medicinering',
  HOMECARE: 'cat-hemvard',
  OTHER: 'cat-ovrig-handelse',
} as const;

export const DEXTER_PET_ID = 'pet-dexter-bengal';

export function buildSeedCategories(userId: string): Category[] {
  const now = new Date().toISOString();
  return [
    {
      id: CAT_IDS.VET,
      userId,
      name: 'Veterinärvård',
      icon: 'stethoscope',
      color: '#FBAE44',
      isSystem: true,
      order: 1,
      lastUsedAt: '2025-11-05T12:00:00.000Z',
      fields: [
        { id: 'vet-event', key: 'event', label: 'Händelse / sammanfattning', type: 'short_text', placeholder: 'T.ex. Årlig kontroll' },
        { id: 'vet-clinic', key: 'clinic', label: 'Klinik', type: 'short_text' },
        { id: 'vet-address', key: 'address', label: 'Adress', type: 'short_text' },
        { id: 'vet-phone', key: 'phone', label: 'Telefonnummer', type: 'short_text' },
        { id: 'vet-doctor', key: 'veterinarian', label: 'Veterinär', type: 'short_text' },
        { id: 'vet-reason', key: 'reason', label: 'Orsak/symptom', type: 'long_text' },
        { id: 'vet-diagnosis', key: 'diagnosis', label: 'Diagnos', type: 'long_text' },
        { id: 'vet-treatment', key: 'treatment', label: 'Behandling', type: 'long_text' },
        { id: 'vet-action', key: 'action', label: 'Åtgärd', type: 'long_text' },
        { id: 'vet-price', key: 'price', label: 'Pris (kr)', type: 'number' },
        { id: 'vet-notes', key: 'notes', label: 'Anteckning', type: 'long_text', placeholder: 'Lägg till anteckning…' },
        { id: 'vet-images', key: 'images', label: 'Bilder', type: 'image' },
        { id: 'vet-docs', key: 'documents', label: 'Dokument', type: 'document' },
      ],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: CAT_IDS.WEIGHT,
      userId,
      name: 'Vikt',
      icon: 'scale',
      color: '#45B87A',
      isSystem: true,
      order: 2,
      lastUsedAt: '2025-10-27T12:00:00.000Z',
      fields: [
        { id: 'w-val', key: 'weightValue', label: 'Viktvärde', type: 'number', required: true },
        { id: 'w-unit', key: 'weightUnit', label: 'Enhet', type: 'weight_unit', required: true },
        { id: 'w-notes', key: 'notes', label: 'Anteckning', type: 'long_text', placeholder: 'Lägg till anteckning…' },
      ],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: CAT_IDS.FOOD,
      userId,
      name: 'Foder',
      icon: 'utensils',
      color: '#6EC43F',
      isSystem: true,
      order: 3,
      lastUsedAt: '2025-09-07T12:00:00.000Z',
      fields: [
        { id: 'food-event', key: 'event', label: 'Händelse', type: 'short_text', required: true },
        { id: 'food-notes', key: 'notes', label: 'Anteckning', type: 'long_text', placeholder: 'Lägg till anteckning…' },
        { id: 'food-images', key: 'images', label: 'Bilder', type: 'image' },
        { id: 'food-docs', key: 'documents', label: 'Dokument', type: 'document' },
      ],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: CAT_IDS.SYMPTOM,
      userId,
      name: 'Skador/symptom',
      icon: 'bandage',
      color: '#E85D4A',
      isSystem: true,
      order: 4,
      lastUsedAt: '2025-11-09T12:00:00.000Z',
      fields: [
        { id: 'sym-event', key: 'event', label: 'Händelse', type: 'short_text', required: true },
        { id: 'sym-notes', key: 'notes', label: 'Anteckning', type: 'long_text', placeholder: 'Lägg till anteckning…' },
        { id: 'sym-images', key: 'images', label: 'Bilder', type: 'image' },
        { id: 'sym-docs', key: 'documents', label: 'Dokument', type: 'document' },
      ],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: CAT_IDS.TOILET,
      userId,
      name: 'Urin & avföring',
      icon: 'droplets',
      color: '#3D9BD6',
      isSystem: true,
      order: 5,
      lastUsedAt: '2025-10-18T12:00:00.000Z',
      fields: [
        { id: 'toi-event', key: 'event', label: 'Händelse', type: 'short_text', required: true },
        { id: 'toi-notes', key: 'notes', label: 'Anteckning', type: 'long_text', placeholder: 'Lägg till anteckning…' },
        { id: 'toi-images', key: 'images', label: 'Bilder', type: 'image' },
        { id: 'toi-docs', key: 'documents', label: 'Dokument', type: 'document' },
      ],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: CAT_IDS.MEDS,
      userId,
      name: 'Medicinering',
      icon: 'pill',
      color: '#A974E0',
      isSystem: true,
      order: 6,
      lastUsedAt: '2025-11-10T12:00:00.000Z',
      fields: [
        { id: 'med-name', key: 'medicationName', label: 'Läkemedelsnamn', type: 'short_text', required: true },
        { id: 'med-dose', key: 'dosage', label: 'Dosering', type: 'short_text' },
        { id: 'med-end', key: 'endDate', label: 'Slutdatum (valfritt)', type: 'date' },
        { id: 'med-comment', key: 'notes', label: 'Anteckning', type: 'long_text', placeholder: 'Lägg till anteckning…' },
        { id: 'med-images', key: 'images', label: 'Bilder', type: 'image' },
        { id: 'med-docs', key: 'documents', label: 'Dokument', type: 'document' },
      ],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: CAT_IDS.HOMECARE,
      userId,
      name: 'Hemvård',
      icon: 'scissors',
      color: '#D4A238',
      isSystem: true,
      order: 7,
      lastUsedAt: '2025-06-08T12:00:00.000Z',
      fields: [
        { id: 'hc-event', key: 'event', label: 'Händelse', type: 'short_text', required: true },
        { id: 'hc-notes', key: 'notes', label: 'Anteckning', type: 'long_text', placeholder: 'Lägg till anteckning…' },
        { id: 'hc-images', key: 'images', label: 'Bilder', type: 'image' },
        { id: 'hc-docs', key: 'documents', label: 'Dokument', type: 'document' },
      ],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: CAT_IDS.OTHER,
      userId,
      name: 'Övrig händelse',
      icon: 'sparkles',
      color: '#38A89D',
      isSystem: true,
      order: 8,
      lastUsedAt: '2025-10-13T12:00:00.000Z',
      fields: [
        { id: 'oth-event', key: 'event', label: 'Händelse', type: 'short_text', required: true },
        { id: 'oth-notes', key: 'notes', label: 'Anteckning', type: 'long_text', placeholder: 'Lägg till anteckning…' },
        { id: 'oth-images', key: 'images', label: 'Bilder', type: 'image' },
        { id: 'oth-docs', key: 'documents', label: 'Dokument', type: 'document' },
      ],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function buildDexterPet(userId: string): Pet {
  const now = new Date().toISOString();
  return {
    id: DEXTER_PET_ID,
    userId,
    name: 'Dexter',
    species: 'cat',
    avatarType: 'cat',
    archived: false,
    deletedAt: null,
    profileFields: {
      name: 'Dexter',
      birthDate: '2019-07-07',
      sex: 'Hane',
      breed: 'Bengal',
      colorPattern: '',
      microchipNumber: '',
      neutered: 'Ja (kastrerad)',
      insurance: 'Svedea, försäkringsnummer 4189147',
      insuranceCompany: 'Svedea',
      insuranceNumber: '4189147',
      website: '',
      veterinarian: '',
      allergies: '',
      diet: '',
      conditions: '',
      personalNotes: '',
      otherNotes: '',
      basicComment: '',
      healthNote: '',
      basicImageIds: [],
      basicDocumentIds: [],
      healthImageIds: [],
      healthDocumentIds: [],
    },
    sections: [],
    filterPrefs: {
      enabledCategoryIds: null,
      timePreset: 'all_time',
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function buildDexterEvents(userId: string): DiaryEvent[] {
  const now = new Date().toISOString();
  let seq = 1;
  const makeEvent = (
    categoryId: string,
    date: string,
    summary: string,
    fieldValues: Record<string, string | number | string[]>
  ): DiaryEvent => ({
    id: `dexter-2025-${String(seq++).padStart(3, '0')}`,
    userId,
    petId: DEXTER_PET_ID,
    categoryId,
    date,
    summary,
    fieldValues,
    archived: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const vetRows: [string, string][] = [
    ['2025-04-20', 'Hos vetten, frisk, bra hull'],
    ['2025-09-15', 'Bokat tid till vett'],
    ['2025-11-05', 'Vet, tagit ut 3 tänder'],
  ];

  const weightRows: [string, number][] = [
    ['2025-01-30', 5.02],
    ['2025-03-08', 4.82],
    ['2025-04-01', 4.6],
    ['2025-04-13', 4.38],
    ['2025-04-24', 4.23],
    ['2025-05-01', 4.12],
    ['2025-05-09', 4.22],
    ['2025-05-19', 4.14],
    ['2025-05-23', 4.2],
    ['2025-05-30', 4.3],
    ['2025-06-06', 4.37],
    ['2025-06-13', 4.3],
    ['2025-06-23', 4.28],
    ['2025-06-27', 4.3],
    ['2025-07-07', 4.33],
    ['2025-07-25', 4.34],
    ['2025-08-13', 4.44],
    ['2025-08-22', 4.42],
    ['2025-09-07', 4.5],
    ['2025-09-14', 4.48],
    ['2025-09-20', 4.47],
    ['2025-09-26', 4.45],
    ['2025-10-16', 4.58],
    ['2025-10-27', 4.5],
  ];

  const foodRows: [string, string][] = [
    ['2025-01-14', 'Fått flytande godis beef'],
    ['2025-04-17', 'Blötmat dagligen'],
    ['2025-04-27', 'Blötmat morgon/kväll'],
    ['2025-05-01', 'Äter på "fårskinnet"'],
    ['2025-09-07', 'Begränsa blötmat'],
  ];

  const symptomRows: [string, string][] = [
    ['2025-01-06', 'Småsår i nacken (fått godis med kyckling)'],
    ['2025-01-13', 'Alla sår läkta'],
    ['2025-06-25', 'Snuskar sig'],
    ['2025-06-26', 'Pormaskar på hakan'],
    ['2025-09-23', 'Såg orolig ut när han använde lådan'],
    ['2025-10-27', 'Orolig, jamig'],
    ['2025-11-06', 'Gosig och klängig, åt bra'],
    ['2025-11-07', 'Trött, och åt inget'],
    ['2025-11-08', 'Ont på (v?) sida i munnen'],
    ['2025-11-09', 'Åtit dåligt'],
  ];

  const toiletRows: [string, string][] = [
    ['2025-01-05', 'Första bajs i lådan'],
    ['2025-09-20', 'Kissat på dynor på balkongen'],
    ['2025-09-21', 'Kissat på dynor på balkongen, ställt låda där'],
    ['2025-09-22', 'Använt lådan på balkongen'],
    ['2025-09-23', 'Kissat på balkongen och använt lådan'],
    ['2025-10-07', 'Kissat i sängen, badrumsdörren igenputtad, Feliway'],
    ['2025-10-08', 'Feliway, låda i sovrummet, använt lådan i sovrummet'],
    ['2025-10-18', 'Bytt plats på lådorna'],
  ];

  const medRows: [string, string][] = [['2025-11-10', 'Metacam']];

  const homecareRows: [string, string][] = [
    ['2025-01-14', 'Klippt klor (samma dag: flytande godis beef)'],
    ['2025-02-16', 'Klippt klor'],
    ['2025-03-15', 'Klor'],
    ['2025-05-07', 'Klor'],
    ['2025-06-08', 'Klor'],
  ];

  const otherRows: [string, string][] = [
    ['2025-01-01', 'Flyttat in 🐈'],
    ['2025-01-16', 'Klättrat på gerbilerna'],
    ['2025-01-17', 'Jamat vid dörren'],
    ['2025-05-15', 'Djurvakt'],
    ['2025-05-16', 'Djurvakt'],
    ['2025-05-17', 'Djurvakt'],
    ['2025-06-12', 'Skenbetäckt filt och soffa'],
    ['2025-06-13', 'Skaftat ur'],
    ['2025-06-14', 'Skaftat ur'],
    ['2025-07-16', 'Djurvakt'],
    ['2025-07-17', 'Djurvakt'],
    ['2025-07-18', 'Djurvakt'],
    ['2025-07-19', 'Djurvakt/hem'],
    ['2025-10-12', 'Delar av katträd'],
    ['2025-10-13', 'Katträd'],
  ];

  return [
    ...vetRows.map(([date, text]) => makeEvent(CAT_IDS.VET, date, text, { event: text })),
    ...weightRows.map(([date, kg]) =>
      makeEvent(CAT_IDS.WEIGHT, date, `${String(kg).replace('.', ',')} kg`, {
        weightValue: kg,
        weightUnit: 'kg',
      })
    ),
    ...foodRows.map(([date, text]) => makeEvent(CAT_IDS.FOOD, date, text, { event: text })),
    ...symptomRows.map(([date, text]) => makeEvent(CAT_IDS.SYMPTOM, date, text, { event: text })),
    ...toiletRows.map(([date, text]) => makeEvent(CAT_IDS.TOILET, date, text, { event: text })),
    ...medRows.map(([date, medName]) =>
      makeEvent(CAT_IDS.MEDS, date, medName, { medicationName: medName })
    ),
    ...homecareRows.map(([date, text]) => makeEvent(CAT_IDS.HOMECARE, date, text, { event: text })),
    ...otherRows.map(([date, text]) => makeEvent(CAT_IDS.OTHER, date, text, { event: text })),
  ];
}
