/* ---------- Data ---------- */
export const CITIES = [
  ["Makkah", 21.4225, 39.8262, "Asia/Riyadh", "Makkah"],
  ["Madinah", 24.4686, 39.6142, "Asia/Riyadh", "Makkah"],
  ["Riyadh", 24.7136, 46.6753, "Asia/Riyadh", "Makkah"],
  ["Dubai", 25.2048, 55.2708, "Asia/Dubai", "Dubai"],
  ["Doha", 25.2854, 51.5310, "Asia/Qatar", "Makkah"],
  ["Cairo", 30.0444, 31.2357, "Africa/Cairo", "Egypt"],
  ["Istanbul", 41.0082, 28.9784, "Europe/Istanbul", "Turkey"],
  ["Casablanca", 33.5731, -7.5898, "Africa/Casablanca", "MWL"],
  ["Lagos", 6.5244, 3.3792, "Africa/Lagos", "MWL"],
  ["Nairobi", -1.2921, 36.8219, "Africa/Nairobi", "MWL"],
  ["Karachi", 24.8607, 67.0011, "Asia/Karachi", "Karachi"],
  ["Lahore", 31.5204, 74.3587, "Asia/Karachi", "Karachi"],
  ["Delhi", 28.6139, 77.2090, "Asia/Kolkata", "Karachi"],
  ["Dhaka", 23.8103, 90.4125, "Asia/Dhaka", "Karachi"],
  ["Kuala Lumpur", 3.1390, 101.6869, "Asia/Kuala_Lumpur", "Singapore"],
  ["Singapore", 1.3521, 103.8198, "Asia/Singapore", "Singapore"],
  ["Jakarta", -6.2088, 106.8456, "Asia/Jakarta", "Singapore"],
  ["London", 51.5074, -0.1278, "Europe/London", "MWL"],
  ["Birmingham", 52.4862, -1.8904, "Europe/London", "MWL"],
  ["Manchester", 53.4808, -2.2426, "Europe/London", "MWL"],
  ["Paris", 48.8566, 2.3522, "Europe/Paris", "MWL"],
  ["Berlin", 52.5200, 13.4050, "Europe/Berlin", "MWL"],
  ["Amsterdam", 52.3676, 4.9041, "Europe/Amsterdam", "MWL"],
  ["Toronto", 43.6532, -79.3832, "America/Toronto", "ISNA"],
  ["New York", 40.7128, -74.0060, "America/New_York", "ISNA"],
  ["Chicago", 41.8781, -87.6298, "America/Chicago", "ISNA"],
  ["Houston", 29.7604, -95.3698, "America/Chicago", "ISNA"],
  ["Los Angeles", 34.0522, -118.2437, "America/Los_Angeles", "ISNA"],
  ["Sydney", -33.8688, 151.2093, "Australia/Sydney", "MWL"],
];
export const PRAYERS = [
  { key: "fajr", name: "Fajr", ar: "الفجر", until: "sunrise", untilName: "sunrise" },
  { key: "dhuhr", name: "Dhuhr", ar: "الظهر", until: "asr", untilName: "Asr" },
  { key: "asr", name: "Asr", ar: "العصر", until: "maghrib", untilName: "Maghrib" },
  { key: "maghrib", name: "Maghrib", ar: "المغرب", until: "isha", untilName: "Isha" },
  { key: "isha", name: "Isha", ar: "العشاء", until: "nextFajr", untilName: "Fajr" },
];

const COMMON_ME = [
  { name: "Ayat al-Kursi", en: "Al-Baqarah 2:255. Recite once.", n: 1 },
  { name: "Al-Ikhlas, Al-Falaq, An-Nas", en: "Surahs 112, 113 and 114. Recite each three times.", n: 3 },
  { name: "Sayyid al-Istighfar", tr: "Allahumma anta Rabbi, la ilaha illa ant, khalaqtani wa ana ʿabduk…", en: "The master supplication for forgiveness.", n: 1 },
  { ar: "بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", tr: "Bismillahil-ladhi la yadurru maʿasmihi shayʾun fil-ardi wa la fis-samaʾ, wa huwas-samiʿul-ʿalim", en: "In the name of Allah, with whose name nothing on earth or in the heavens can cause harm. He is the All-Hearing, the All-Knowing.", n: 3 },
  { ar: "حَسْبِيَ اللهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ", tr: "Hasbiyallahu la ilaha illa huwa, ʿalayhi tawakkaltu wa huwa Rabbul-ʿarshil-ʿazim", en: "Allah is sufficient for me. There is no god but Him. In Him I trust, and He is Lord of the Mighty Throne.", n: 7 },
  { ar: "سُبْحَانَ اللهِ وَبِحَمْدِهِ", tr: "SubhanAllahi wa bihamdihi", en: "Glory be to Allah, and praise be to Him.", n: 100 },
];
export const ADHKAR = {
  after: [
    { ar: "أَسْتَغْفِرُ اللهَ", tr: "Astaghfirullah", en: "I seek Allah’s forgiveness.", n: 3 },
    { ar: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ", tr: "Allahumma antas-salam wa minkas-salam, tabarakta ya dhal-jalali wal-ikram", en: "O Allah, You are Peace and from You is peace. Blessed are You, Possessor of majesty and honour.", n: 1 },
    { ar: "سُبْحَانَ اللهِ", tr: "SubhanAllah", en: "Glory be to Allah.", n: 33 },
    { ar: "الْحَمْدُ لِلَّهِ", tr: "Alhamdulillah", en: "All praise is for Allah.", n: 33 },
    { ar: "اللهُ أَكْبَرُ", tr: "Allahu Akbar", en: "Allah is the Greatest.", n: 33 },
    { ar: "لَا إِلَٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", tr: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa ʿala kulli shayʾin qadir", en: "There is no god but Allah alone, without partner. His is the dominion and His is the praise, and He has power over all things. Completes the hundred.", n: 1 },
    { name: "Ayat al-Kursi", en: "Al-Baqarah 2:255. Recite once after each obligatory prayer.", n: 1 },
  ],
  morning: [
    { ar: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ", tr: "Asbahna wa asbahal-mulku lillah, wal-hamdu lillah", en: "We have reached the morning, and the dominion belongs to Allah. All praise is for Allah.", n: 1 },
    ...COMMON_ME,
  ],
  evening: [
    { ar: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ", tr: "Amsayna wa amsal-mulku lillah, wal-hamdu lillah", en: "We have reached the evening, and the dominion belongs to Allah. All praise is for Allah.", n: 1 },
    ...COMMON_ME,
  ],
};
export const SET_NAMES = { after: "After-salah adhkar", morning: "Morning adhkar", evening: "Evening adhkar" };

