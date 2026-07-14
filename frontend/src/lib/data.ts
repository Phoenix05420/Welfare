export type Category =
  | "SC"
  | "ST"
  | "BC"
  | "MBC"
  | "General"
  | "Women"
  | "Students"
  | "Persons with Disabilities";

export type SchemeType = "scholarship" | "scheme";

export type Scheme = {
  id: string;
  type: SchemeType;
  name: { en: string; ta: string };
  shortDescription: { en: string; ta: string };
  description: { en: string; ta: string };
  categories: Category[];
  benefits: { en: string; ta: string }[];
  eligibility: { en: string; ta: string }[];
  requiredDocuments: string[]; // keys from DOCUMENT_KEYS
  process: { en: string; ta: string }[];
  deadline?: string;
  officialUrl: string;
  faqs: { q: { en: string; ta: string }; a: { en: string; ta: string } }[];
  tags?: string[];
};

export const DOCUMENT_KEYS = [
  "aadhaar",
  "nativity",
  "community",
  "income",
  "marksheet10",
  "marksheet12",
  "tc",
  "bonafide",
  "emis",
  "firstGraduate",
  "bankPassbook",
] as const;
export type DocKey = (typeof DOCUMENT_KEYS)[number];

export const DOCUMENT_LABELS: Record<DocKey, { en: string; ta: string }> = {
  aadhaar: { en: "Aadhaar Card", ta: "ஆதார் அட்டை" },
  nativity: { en: "Nativity Certificate", ta: "பூர்வீக சான்றிதழ்" },
  community: { en: "Community Certificate", ta: "சமூக சான்றிதழ்" },
  income: { en: "Income Certificate", ta: "வருமான சான்றிதழ்" },
  marksheet10: { en: "Class 10 Marksheet", ta: "10ம் வகுப்பு மதிப்பெண் சான்று" },
  marksheet12: { en: "Class 12 Marksheet", ta: "12ம் வகுப்பு மதிப்பெண் சான்று" },
  tc: { en: "Transfer Certificate (TC)", ta: "மாற்று சான்றிதழ்" },
  bonafide: { en: "Bonafide Student Certificate", ta: "மாணவர் உண்மைச் சான்று" },
  emis: { en: "School EMIS ID Number", ta: "பள்ளி EMIS எண்" },
  firstGraduate: { en: "First Graduate Certificate", ta: "முதல் பட்டதாரி சான்றிதழ்" },
  bankPassbook: { en: "Bank Passbook (Front Page)", ta: "வங்கி கணக்கு புத்தகம்" },
};

export const CATEGORIES: { id: Category; en: string; ta: string; icon: string }[] = [
  { id: "SC", en: "SC", ta: "ஆதி திராவிடர்", icon: "🛡️" },
  { id: "ST", en: "ST", ta: "பழங்குடி", icon: "🏔️" },
  { id: "BC", en: "BC", ta: "பிற்படுத்தப்பட்டோர்", icon: "🌿" },
  { id: "MBC", en: "MBC", ta: "மிகவும் பிற்படுத்தப்பட்டோர்", icon: "🌾" },
  { id: "General", en: "General", ta: "பொது", icon: "✨" },
  { id: "Women", en: "Women", ta: "பெண்கள்", icon: "👩" },
  { id: "Students", en: "Students", ta: "மாணவர்கள்", icon: "🎓" },
  {
    id: "Persons with Disabilities",
    en: "Persons with Disabilities",
    ta: "மாற்றுத் திறனாளிகள்",
    icon: "♿",
  },
];

export const SCHEMES: Scheme[] = [
  {
    id: "tn-post-matric-sc-st",
    type: "scholarship",
    name: {
      en: "Tamil Nadu Post-Matric Scholarship for SC/ST/SCC",
      ta: "தமிழ்நாடு மெட்ரிக்குப் பிந்தைய உதவித்தொகை (SC/ST/SCC)",
    },
    shortDescription: {
      en: "Financial support for SC/ST/SCC students pursuing post-matric studies.",
      ta: "மெட்ரிக்குப் பிந்தைய படிப்புகளுக்கான நிதி உதவி.",
    },
    description: {
      en: "A scholarship program that covers tuition, maintenance and exam fees for eligible SC/ST/SCC students continuing their education beyond Class 10.",
      ta: "10ம் வகுப்புக்கு பிறகான SC/ST/SCC மாணவர்களுக்கு கல்விக்கட்டணம், பராமரிப்பு கட்டணம் மற்றும் தேர்வு கட்டணம் வழங்கும் திட்டம்.",
    },
    categories: ["SC", "ST", "Students"],
    benefits: [
      { en: "Full tuition fee reimbursement", ta: "முழு கல்விக்கட்டண திரும்ப செலுத்துதல்" },
      { en: "Monthly maintenance allowance", ta: "மாதாந்திர பராமரிப்பு கொடுப்பனவு" },
      { en: "Exam fee waiver", ta: "தேர்வு கட்டண விலக்கு" },
    ],
    eligibility: [
      {
        en: "Belongs to SC/ST/SCC community in Tamil Nadu",
        ta: "தமிழ்நாட்டில் SC/ST/SCC பிரிவைச் சேர்ந்தவர்",
      },
      {
        en: "Family income below ₹2.5 lakh per annum",
        ta: "ஆண்டு குடும்ப வருமானம் ₹2.5 லட்சத்திற்கு குறைவாக",
      },
      {
        en: "Studying in a recognised institution post Class 10",
        ta: "10ம் வகுப்புக்கு பின் அங்கீகரிக்கப்பட்ட நிறுவனத்தில் படிக்கிறவர்",
      },
    ],
    requiredDocuments: [
      "aadhaar",
      "community",
      "income",
      "marksheet10",
      "bonafide",
      "bankPassbook",
    ],
    process: [
      { en: "Register on the TN ePASS portal", ta: "TN ePASS தளத்தில் பதிவு செய்யவும்" },
      { en: "Upload required documents", ta: "தேவையான ஆவணங்களை பதிவேற்றவும்" },
      {
        en: "Submit application via institution",
        ta: "நிறுவனம் வழியாக விண்ணப்பத்தை சமர்ப்பிக்கவும்",
      },
      { en: "Track approval status online", ta: "ஒப்புதல் நிலையை ஆன்லைனில் கண்காணிக்கவும்" },
    ],
    deadline: "2026-09-30",
    officialUrl: "https://www.tnepass.tn.gov.in/",
    faqs: [
      {
        q: { en: "When does the application open?", ta: "விண்ணப்பம் எப்போது திறக்கப்படும்?" },
        a: { en: "Typically July every year.", ta: "பொதுவாக ஒவ்வொரு ஆண்டும் ஜூலை மாதம்." },
      },
    ],
  },
  {
    id: "bc-mbc-dnc-post-matric",
    type: "scholarship",
    name: {
      en: "BC / MBC / DNC Post-Matric Scholarship",
      ta: "BC/MBC/DNC மெட்ரிக்குப் பிந்தைய உதவித்தொகை",
    },
    shortDescription: {
      en: "Post-matric scholarship for BC, MBC and DNC students.",
      ta: "BC, MBC மற்றும் DNC மாணவர்களுக்கான உதவித்தொகை.",
    },
    description: {
      en: "Supports BC, MBC and DNC students with tuition and maintenance for studies beyond Class 10.",
      ta: "10ம் வகுப்புக்கு பின்னான படிப்புகளுக்கு BC, MBC, DNC மாணவர்களுக்கு உதவி.",
    },
    categories: ["BC", "MBC", "Students"],
    benefits: [
      { en: "Tuition reimbursement", ta: "கல்விக்கட்டண திரும்ப செலுத்துதல்" },
      { en: "Maintenance allowance", ta: "பராமரிப்பு கொடுப்பனவு" },
    ],
    eligibility: [
      { en: "BC / MBC / DNC community", ta: "BC / MBC / DNC பிரிவு" },
      { en: "Annual income under ₹2 lakh", ta: "ஆண்டு வருமானம் ₹2 லட்சத்திற்கு குறைவாக" },
    ],
    requiredDocuments: [
      "aadhaar",
      "community",
      "income",
      "marksheet10",
      "bonafide",
      "bankPassbook",
    ],
    process: [
      { en: "Apply on TN ePASS portal", ta: "TN ePASS தளத்தில் விண்ணப்பிக்கவும்" },
      { en: "Verification by institution", ta: "நிறுவனத்தால் சரிபார்ப்பு" },
      { en: "Approval and disbursal", ta: "ஒப்புதல் மற்றும் வழங்கல்" },
    ],
    deadline: "2026-10-15",
    officialUrl: "https://www.tnepass.tn.gov.in/",
    faqs: [],
  },
  {
    id: "pudhumai-penn",
    type: "scheme",
    name: { en: "Pudhumai Penn Scheme", ta: "புதுமைப் பெண் திட்டம்" },
    shortDescription: {
      en: "₹1,000/month for girl students pursuing higher education after Class 12 in government schools.",
      ta: "அரசுப் பள்ளியில் 12ம் வகுப்பு படித்த பெண்களுக்கு உயர் கல்விக்கு மாதம் ₹1,000.",
    },
    description: {
      en: "Moovalur Ramamirtham Ammaiyar Higher Education Assurance Scheme — provides ₹1,000 monthly to girl students who completed Class 6 through 12 in government schools and now pursue higher education.",
      ta: "மூவலூர் ராமாமிர்தம் அம்மையார் உயர் கல்வி உறுதி திட்டம் — அரசுப் பள்ளியில் 6 முதல் 12ம் வகுப்பு படித்த பெண் மாணவிகளுக்கு உயர் கல்விக்கு மாதம் ₹1,000.",
    },
    categories: ["Women", "Students"],
    benefits: [
      { en: "₹1,000 per month till graduation", ta: "பட்டப்படிப்பு முடியும் வரை மாதம் ₹1,000" },
      {
        en: "Direct transfer to student's bank account",
        ta: "மாணவியின் வங்கி கணக்கிற்கு நேரடி மாற்றம்",
      },
    ],
    eligibility: [
      { en: "Female student", ta: "பெண் மாணவி" },
      {
        en: "Studied Class 6 to 12 in TN Government School",
        ta: "தமிழ்நாடு அரசு பள்ளியில் 6 முதல் 12ம் வகுப்பு படித்தவர்",
      },
      {
        en: "Pursuing higher education (UG/Diploma/ITI)",
        ta: "உயர் கல்வி படிக்கிறவர் (UG/Diploma/ITI)",
      },
    ],
    requiredDocuments: ["aadhaar", "marksheet12", "tc", "bonafide", "emis", "bankPassbook"],
    process: [
      {
        en: "Apply via your college / institution",
        ta: "உங்கள் கல்லூரி/நிறுவனம் வழியாக விண்ணப்பிக்கவும்",
      },
      { en: "EMIS verification of school history", ta: "EMIS மூலம் பள்ளி வரலாறு சரிபார்ப்பு" },
      { en: "Bank account validation", ta: "வங்கி கணக்கு சரிபார்ப்பு" },
      { en: "Monthly disbursal begins", ta: "மாதாந்திர வழங்கல் தொடங்கும்" },
    ],
    deadline: "2026-08-31",
    officialUrl: "https://penkalvi.tn.gov.in/",
    faqs: [
      {
        q: {
          en: "Can private school students apply?",
          ta: "தனியார் பள்ளி மாணவிகள் விண்ணப்பிக்கலாமா?",
        },
        a: {
          en: "No. Only girls who studied Classes 6–12 in TN Government schools are eligible.",
          ta: "இல்லை. தமிழ்நாடு அரசுப் பள்ளியில் 6–12 படித்தவர்கள் மட்டுமே.",
        },
      },
    ],
  },
  {
    id: "tamil-pudhalvan",
    type: "scheme",
    name: { en: "Tamil Pudhalvan Scheme", ta: "தமிழ்ப் புதல்வன் திட்டம்" },
    shortDescription: {
      en: "₹1,000/month for boy students from TN Government schools pursuing higher education.",
      ta: "அரசுப் பள்ளி ஆண் மாணவர்களுக்கு உயர் கல்விக்கு மாதம் ₹1,000.",
    },
    description: {
      en: "Higher Education Assurance Scheme providing ₹1,000 monthly to boys who studied Class 6 to 12 in TN Government schools and pursue higher education.",
      ta: "தமிழ்நாடு அரசுப் பள்ளியில் 6–12 படித்த ஆண் மாணவர்களுக்கு உயர் கல்விக்கு மாதம் ₹1,000.",
    },
    categories: ["Students", "General"],
    benefits: [
      { en: "₹1,000 per month till graduation", ta: "பட்டப்படிப்பு முடியும் வரை மாதம் ₹1,000" },
    ],
    eligibility: [
      { en: "Male student", ta: "ஆண் மாணவர்" },
      {
        en: "Studied Class 6 to 12 in TN Government School",
        ta: "தமிழ்நாடு அரசுப் பள்ளியில் 6–12 படித்தவர்",
      },
      { en: "Pursuing UG / Diploma / ITI", ta: "UG / Diploma / ITI படிக்கிறவர்" },
    ],
    requiredDocuments: ["aadhaar", "marksheet12", "tc", "bonafide", "emis", "bankPassbook"],
    process: [
      { en: "Apply via institution", ta: "நிறுவனம் வழியாக விண்ணப்பிக்கவும்" },
      { en: "EMIS school verification", ta: "EMIS பள்ளி சரிபார்ப்பு" },
      { en: "Disbursal to bank", ta: "வங்கிக்கு வழங்கல்" },
    ],
    deadline: "2026-08-31",
    officialUrl: "https://tamilpudhalvan.tn.gov.in/",
    faqs: [],
  },
  {
    id: "mbc-free-pro",
    type: "scholarship",
    name: {
      en: "MBC Free Education — Professional Courses (Private)",
      ta: "MBC இலவச கல்வி — தொழில்முறை படிப்புகள் (தனியார்)",
    },
    shortDescription: {
      en: "Full tuition waiver for MBC students in private professional courses.",
      ta: "தனியார் தொழில்முறை படிப்புகளில் MBC மாணவர்களுக்கு முழு கல்விக்கட்டண விலக்கு.",
    },
    description: {
      en: "MBC students admitted to private professional courses receive a full tuition fee waiver subject to community and income eligibility.",
      ta: "தனியார் தொழில்முறை படிப்புகளில் சேரும் MBC மாணவர்களுக்கு முழு கல்விக்கட்டண விலக்கு.",
    },
    categories: ["MBC", "Students"],
    benefits: [{ en: "100% tuition fee waiver", ta: "100% கல்விக்கட்டண விலக்கு" }],
    eligibility: [
      { en: "MBC community", ta: "MBC பிரிவு" },
      {
        en: "Admitted to private professional course",
        ta: "தனியார் தொழில்முறை படிப்பில் சேர்ந்தவர்",
      },
      { en: "Income below limit", ta: "வருமான வரம்பிற்கு கீழ்" },
    ],
    requiredDocuments: [
      "aadhaar",
      "community",
      "income",
      "marksheet12",
      "bonafide",
      "bankPassbook",
    ],
    process: [
      {
        en: "Apply through college via TN ePASS",
        ta: "கல்லூரி வழியாக TN ePASS-ல் விண்ணப்பிக்கவும்",
      },
      { en: "Verification & approval", ta: "சரிபார்ப்பு மற்றும் ஒப்புதல்" },
    ],
    deadline: "2026-11-30",
    officialUrl: "https://www.tnepass.tn.gov.in/",
    faqs: [],
  },
  {
    id: "bc-free-pro",
    type: "scholarship",
    name: {
      en: "BC Free Education — Professional Courses (Private)",
      ta: "BC இலவச கல்வி — தொழில்முறை படிப்புகள் (தனியார்)",
    },
    shortDescription: {
      en: "Tuition waiver for BC students in private professional courses.",
      ta: "தனியார் தொழில்முறை படிப்புகளில் BC மாணவர்களுக்கு கல்விக்கட்டண விலக்கு.",
    },
    description: {
      en: "Provides tuition fee concession to BC students admitted to private professional courses.",
      ta: "தனியார் தொழில்முறை படிப்பில் சேர்ந்த BC மாணவர்களுக்கு கல்விக்கட்டண சலுகை.",
    },
    categories: ["BC", "Students"],
    benefits: [{ en: "Tuition fee concession", ta: "கல்விக்கட்டண சலுகை" }],
    eligibility: [
      { en: "BC community", ta: "BC பிரிவு" },
      {
        en: "Admitted to private professional course",
        ta: "தனியார் தொழில்முறை படிப்பில் சேர்ந்தவர்",
      },
    ],
    requiredDocuments: [
      "aadhaar",
      "community",
      "income",
      "marksheet12",
      "bonafide",
      "bankPassbook",
    ],
    process: [
      {
        en: "Apply via TN ePASS through college",
        ta: "கல்லூரி வழியாக TN ePASS-ல் விண்ணப்பிக்கவும்",
      },
    ],
    officialUrl: "https://www.tnepass.tn.gov.in/",
    faqs: [],
  },
  {
    id: "sc-st-ug-concession",
    type: "scholarship",
    name: { en: "SC/ST/SCC Free Education — Under Graduate", ta: "SC/ST/SCC இலவச கல்வி — இளங்கலை" },
    shortDescription: {
      en: "Free UG education concession for SC/ST/SCC students.",
      ta: "SC/ST/SCC மாணவர்களுக்கான இளங்கலை இலவச கல்வி சலுகை.",
    },
    description: {
      en: "Free education benefits including tuition concession for SC/ST/SCC undergraduate students.",
      ta: "SC/ST/SCC இளங்கலை மாணவர்களுக்கான கல்விக்கட்டண விலக்கு.",
    },
    categories: ["SC", "ST", "Students"],
    benefits: [
      { en: "Tuition concession", ta: "கல்விக்கட்டண சலுகை" },
      { en: "Special grants", ta: "சிறப்பு உதவி" },
    ],
    eligibility: [
      { en: "SC/ST/SCC community", ta: "SC/ST/SCC பிரிவு" },
      { en: "Enrolled in UG program", ta: "இளங்கலை படிப்பில் சேர்ந்தவர்" },
    ],
    requiredDocuments: ["aadhaar", "community", "income", "marksheet12", "bonafide"],
    process: [{ en: "Apply via TN ePASS", ta: "TN ePASS வழியாக விண்ணப்பிக்கவும்" }],
    officialUrl: "https://www.tnepass.tn.gov.in/",
    faqs: [],
  },
  {
    id: "sc-st-pg-concession",
    type: "scholarship",
    name: { en: "SC/ST/SCC Free Education — Post Graduate", ta: "SC/ST/SCC இலவச கல்வி — முதுகலை" },
    shortDescription: {
      en: "PG free education concession for SC/ST/SCC students.",
      ta: "SC/ST/SCC மாணவர்களுக்கான முதுகலை இலவச கல்வி.",
    },
    description: {
      en: "Tuition fee concession for SC/ST/SCC students pursuing post graduate programs.",
      ta: "முதுகலை படிக்கும் SC/ST/SCC மாணவர்களுக்கான கல்விக்கட்டண விலக்கு.",
    },
    categories: ["SC", "ST", "Students"],
    benefits: [{ en: "Tuition fee waiver", ta: "கல்விக்கட்டண விலக்கு" }],
    eligibility: [{ en: "SC/ST/SCC PG students", ta: "SC/ST/SCC முதுகலை மாணவர்" }],
    requiredDocuments: ["aadhaar", "community", "income", "bonafide"],
    process: [{ en: "Apply via TN ePASS", ta: "TN ePASS வழியாக விண்ணப்பிக்கவும்" }],
    officialUrl: "https://www.tnepass.tn.gov.in/",
    faqs: [],
  },
  {
    id: "tn-eminorities",
    type: "scholarship",
    name: {
      en: "TN eScholarship for Economically Backward Minorities",
      ta: "பொருளாதார ரீதியில் பின்தங்கிய சிறுபான்மையினருக்கான உதவித்தொகை",
    },
    shortDescription: {
      en: "Scholarship for minority students (Muslims, Christians, Sikhs, Buddhists, Parsis).",
      ta: "சிறுபான்மை மாணவர்களுக்கான உதவித்தொகை.",
    },
    description: {
      en: "Online scholarship program for economically backward students from minority communities in Tamil Nadu.",
      ta: "தமிழ்நாட்டில் பொருளாதார ரீதியில் பின்தங்கிய சிறுபான்மை மாணவர்களுக்கான ஆன்லைன் உதவித்தொகை.",
    },
    categories: ["General", "Students"],
    benefits: [{ en: "Annual scholarship amount", ta: "ஆண்டு உதவித்தொகை" }],
    eligibility: [
      {
        en: "Belongs to notified minority community",
        ta: "அறிவிக்கப்பட்ட சிறுபான்மை பிரிவைச் சேர்ந்தவர்",
      },
      { en: "Economically backward", ta: "பொருளாதார ரீதியில் பின்தங்கியவர்" },
    ],
    requiredDocuments: ["aadhaar", "income", "marksheet10", "bonafide", "bankPassbook"],
    process: [
      {
        en: "Apply on TN minority welfare portal",
        ta: "தமிழ்நாடு சிறுபான்மை நல தளத்தில் விண்ணப்பிக்கவும்",
      },
    ],
    officialUrl: "https://tnminoritywelfare.tn.gov.in/",
    faqs: [],
  },
  {
    id: "naan-mudhalvan",
    type: "scheme",
    name: { en: "Naan Mudhalvan Scheme", ta: "நான் முதல்வன் திட்டம்" },
    shortDescription: {
      en: "Skill development and employment-linked upskilling for TN students.",
      ta: "தமிழ்நாடு மாணவர்களுக்கான திறன் மேம்பாடு மற்றும் வேலைவாய்ப்பு பயிற்சி.",
    },
    description: {
      en: "A dynamic online portal for student registration, upskilling, and employment-linked courses across industry-aligned domains.",
      ta: "மாணவர் பதிவு, திறன் மேம்பாடு மற்றும் வேலைவாய்ப்பு பயிற்சிகளுக்கான ஒரு ஆன்லைன் தளம்.",
    },
    categories: ["Students", "General"],
    benefits: [
      { en: "Free industry-aligned courses", ta: "இலவச தொழில் சார் பயிற்சி" },
      { en: "Certifications", ta: "சான்றிதழ்கள்" },
      { en: "Placement linkages", ta: "வேலைவாய்ப்பு இணைப்பு" },
    ],
    eligibility: [
      { en: "Student enrolled in TN institution", ta: "தமிழ்நாடு நிறுவனத்தில் சேர்ந்த மாணவர்" },
    ],
    requiredDocuments: ["aadhaar", "bonafide", "emis"],
    process: [
      { en: "Register on Naan Mudhalvan portal", ta: "நான் முதல்வன் தளத்தில் பதிவு செய்யவும்" },
      { en: "Pick a course track", ta: "ஒரு பயிற்சி தேர்ந்தெடுக்கவும்" },
      { en: "Complete training & assessment", ta: "பயிற்சி மற்றும் மதிப்பீட்டை முடிக்கவும்" },
    ],
    deadline: "2026-12-31",
    officialUrl: "https://naanmudhalvan.tn.gov.in/",
    faqs: [],
  },
  {
    id: "mbc-diploma",
    type: "scholarship",
    name: {
      en: "MBC Free Education — Diploma (Govt/Aided)",
      ta: "MBC இலவச கல்வி — டிப்ளமோ (அரசு/உதவி பெறும்)",
    },
    shortDescription: {
      en: "Free diploma education for MBC students in government and government-aided institutions.",
      ta: "அரசு/உதவிபெறும் நிறுவனங்களில் MBC மாணவர்களுக்கு இலவச டிப்ளமோ.",
    },
    description: {
      en: "Diploma-level free education for MBC students in government and government-aided polytechnic institutions.",
      ta: "அரசு/உதவிபெறும் பாலிடெக்னிக்கில் MBC மாணவர்களுக்கு இலவச டிப்ளமோ.",
    },
    categories: ["MBC", "Students"],
    benefits: [{ en: "Free tuition", ta: "இலவச கல்வி" }],
    eligibility: [{ en: "MBC community studying diploma", ta: "டிப்ளமோ படிக்கும் MBC மாணவர்" }],
    requiredDocuments: ["aadhaar", "community", "income", "marksheet10", "bonafide"],
    process: [{ en: "Apply via TN ePASS", ta: "TN ePASS வழியாக விண்ணப்பிக்கவும்" }],
    officialUrl: "https://www.tnepass.tn.gov.in/",
    faqs: [],
  },
];

export const FEATURES = [
  {
    icon: "🔍",
    title: { en: "Smart Scheme Discovery", ta: "சிறந்த திட்ட கண்டறிதல்" },
    desc: {
      en: "AI-curated schemes that match your profile.",
      ta: "உங்கள் சுயவிவரத்திற்கு பொருந்தும் திட்டங்கள்.",
    },
  },
  {
    icon: "🎓",
    title: { en: "Scholarship Finder", ta: "உதவித்தொகை கண்டறிதல்" },
    desc: {
      en: "Find scholarships tailored to your study path.",
      ta: "உங்கள் படிப்புக்கேற்ற உதவித்தொகை.",
    },
  },
  {
    icon: "✅",
    title: { en: "Eligibility Checker", ta: "தகுதி சரிபார்ப்பு" },
    desc: { en: "Instantly check if you qualify.", ta: "உடனடியாக உங்கள் தகுதியை சரிபார்க்கவும்." },
  },
  {
    icon: "⚡",
    title: { en: "Registration Automation", ta: "பதிவு தானியங்கி" },
    desc: {
      en: "Pre-fill forms with your stored documents.",
      ta: "சேமித்த ஆவணங்கள் கொண்டு படிவங்களை நிரப்பு.",
    },
  },
  {
    icon: "🤖",
    title: { en: "AI Assistant", ta: "AI உதவியாளர்" },
    desc: {
      en: "Ask anything — get scheme answers fast.",
      ta: "எதையும் கேளுங்கள் — விரைவு பதில்கள்.",
    },
  },
  {
    icon: "🌐",
    title: { en: "Multilingual Support", ta: "பல மொழி ஆதரவு" },
    desc: {
      en: "Switch between English & Tamil any time.",
      ta: "ஆங்கிலம் & தமிழ் இடையே மாறுங்கள்.",
    },
  },
];

export const BENEFITS = [
  { icon: "⏱️", title: { en: "Save Time", ta: "நேரம் சேமிக்கவும்" } },
  { icon: "🚀", title: { en: "Faster Applications", ta: "விரைவான விண்ணப்பங்கள்" } },
  { icon: "🎯", title: { en: "Personalized Recommendations", ta: "தனிப்பயன் பரிந்துரைகள்" } },
  { icon: "📚", title: { en: "Centralized Information", ta: "ஒருங்கிணைந்த தகவல்" } },
  { icon: "🏛️", title: { en: "Easy Access to Benefits", ta: "எளிதான அணுகல்" } },
];

// --- Scraped Data Types ---
export type ScrapedSchemeSource = "tndce_colleges" | "tndce_scholarships" | "govtschemes";

export type ScrapedScheme = {
  id: string;
  name: { en: string; ta: string };
  shortDescription: { en: string; ta: string };
  type: string;
  categories: string[];
  source: ScrapedSchemeSource;
  sourceUrl: string;
  pdfUrl?: string;
};

export const SOURCE_LABELS: Record<ScrapedSchemeSource, { en: string; ta: string; color: string }> =
  {
    tndce_colleges: {
      en: "DCE Colleges",
      ta: "DCE கல்லூரிகள்",
      color: "bg-blue-500/20 text-blue-400",
    },
    tndce_scholarships: {
      en: "DCE Scholarships",
      ta: "DCE உதவித்தொகைகள்",
      color: "bg-emerald-500/20 text-emerald-400",
    },
    govtschemes: {
      en: "Govt Schemes",
      ta: "அரசு திட்டங்கள்",
      color: "bg-amber-500/20 text-amber-400",
    },
  };
