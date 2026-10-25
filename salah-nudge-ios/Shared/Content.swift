import Foundation

struct City: Identifiable, Hashable {
    let name: String
    let latitude: Double
    let longitude: Double
    let timeZoneID: String
    let method: CalcMethod
    var id: String { name }

    static let all: [City] = [
        City(name: "Makkah", latitude: 21.4225, longitude: 39.8262, timeZoneID: "Asia/Riyadh", method: .makkah),
        City(name: "Madinah", latitude: 24.4686, longitude: 39.6142, timeZoneID: "Asia/Riyadh", method: .makkah),
        City(name: "Riyadh", latitude: 24.7136, longitude: 46.6753, timeZoneID: "Asia/Riyadh", method: .makkah),
        City(name: "Dubai", latitude: 25.2048, longitude: 55.2708, timeZoneID: "Asia/Dubai", method: .dubai),
        City(name: "Doha", latitude: 25.2854, longitude: 51.5310, timeZoneID: "Asia/Qatar", method: .makkah),
        City(name: "Cairo", latitude: 30.0444, longitude: 31.2357, timeZoneID: "Africa/Cairo", method: .egypt),
        City(name: "Istanbul", latitude: 41.0082, longitude: 28.9784, timeZoneID: "Europe/Istanbul", method: .turkey),
        City(name: "Casablanca", latitude: 33.5731, longitude: -7.5898, timeZoneID: "Africa/Casablanca", method: .mwl),
        City(name: "Lagos", latitude: 6.5244, longitude: 3.3792, timeZoneID: "Africa/Lagos", method: .mwl),
        City(name: "Nairobi", latitude: -1.2921, longitude: 36.8219, timeZoneID: "Africa/Nairobi", method: .mwl),
        City(name: "Karachi", latitude: 24.8607, longitude: 67.0011, timeZoneID: "Asia/Karachi", method: .karachi),
        City(name: "Lahore", latitude: 31.5204, longitude: 74.3587, timeZoneID: "Asia/Karachi", method: .karachi),
        City(name: "Delhi", latitude: 28.6139, longitude: 77.2090, timeZoneID: "Asia/Kolkata", method: .karachi),
        City(name: "Dhaka", latitude: 23.8103, longitude: 90.4125, timeZoneID: "Asia/Dhaka", method: .karachi),
        City(name: "Kuala Lumpur", latitude: 3.1390, longitude: 101.6869, timeZoneID: "Asia/Kuala_Lumpur", method: .singapore),
        City(name: "Singapore", latitude: 1.3521, longitude: 103.8198, timeZoneID: "Asia/Singapore", method: .singapore),
        City(name: "Jakarta", latitude: -6.2088, longitude: 106.8456, timeZoneID: "Asia/Jakarta", method: .singapore),
        City(name: "London", latitude: 51.5074, longitude: -0.1278, timeZoneID: "Europe/London", method: .mwl),
        City(name: "Birmingham", latitude: 52.4862, longitude: -1.8904, timeZoneID: "Europe/London", method: .mwl),
        City(name: "Manchester", latitude: 53.4808, longitude: -2.2426, timeZoneID: "Europe/London", method: .mwl),
        City(name: "Paris", latitude: 48.8566, longitude: 2.3522, timeZoneID: "Europe/Paris", method: .mwl),
        City(name: "Berlin", latitude: 52.5200, longitude: 13.4050, timeZoneID: "Europe/Berlin", method: .mwl),
        City(name: "Amsterdam", latitude: 52.3676, longitude: 4.9041, timeZoneID: "Europe/Amsterdam", method: .mwl),
        City(name: "Toronto", latitude: 43.6532, longitude: -79.3832, timeZoneID: "America/Toronto", method: .isna),
        City(name: "New York", latitude: 40.7128, longitude: -74.0060, timeZoneID: "America/New_York", method: .isna),
        City(name: "Chicago", latitude: 41.8781, longitude: -87.6298, timeZoneID: "America/Chicago", method: .isna),
        City(name: "Houston", latitude: 29.7604, longitude: -95.3698, timeZoneID: "America/Chicago", method: .isna),
        City(name: "Los Angeles", latitude: 34.0522, longitude: -118.2437, timeZoneID: "America/Los_Angeles", method: .isna),
        City(name: "Sydney", latitude: -33.8688, longitude: 151.2093, timeZoneID: "Australia/Sydney", method: .mwl),
    ]
}

enum PrayerKey: String, CaseIterable, Codable, Identifiable {
    case fajr, dhuhr, asr, maghrib, isha
    var id: String { rawValue }

    var name: String { rawValue.prefix(1).uppercased() + rawValue.dropFirst() }

    var arabic: String {
        switch self {
        case .fajr: "الفجر"
        case .dhuhr: "الظهر"
        case .asr: "العصر"
        case .maghrib: "المغرب"
        case .isha: "العشاء"
        }
    }

    var startsAt: TimeKey {
        switch self {
        case .fajr: .fajr
        case .dhuhr: .dhuhr
        case .asr: .asr
        case .maghrib: .maghrib
        case .isha: .isha
        }
    }

    /// The time this prayer's window closes. Isha runs until the next day's Fajr.
    var endsAt: TimeKey? {
        switch self {
        case .fajr: .sunrise
        case .dhuhr: .asr
        case .asr: .maghrib
        case .maghrib: .isha
        case .isha: nil
        }
    }

    var endsAtName: String {
        switch self {
        case .fajr: "sunrise"
        case .dhuhr: "Asr"
        case .asr: "Maghrib"
        case .maghrib: "Isha"
        case .isha: "Fajr"
        }
    }
}

struct Dhikr: Hashable {
    var arabic: String? = nil
    var title: String? = nil
    var transliteration: String? = nil
    var meaning: String
    var count: Int
}

enum AdhkarSet: String, CaseIterable, Codable, Identifiable {
    case after, morning, evening
    var id: String { rawValue }

    var title: String {
        switch self {
        case .after: "After-salah adhkar"
        case .morning: "Morning adhkar"
        case .evening: "Evening adhkar"
        }
    }

    var shortTitle: String {
        switch self {
        case .after: "After salah"
        case .morning: "Morning"
        case .evening: "Evening"
        }
    }

    var items: [Dhikr] {
        switch self {
        case .after: Self.afterSalah
        case .morning: [Dhikr(arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ", transliteration: "Asbahna wa asbahal-mulku lillah, wal-hamdu lillah", meaning: "We have reached the morning, and the dominion belongs to Allah. All praise is for Allah.", count: 1)] + Self.morningEvening
        case .evening: [Dhikr(arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ", transliteration: "Amsayna wa amsal-mulku lillah, wal-hamdu lillah", meaning: "We have reached the evening, and the dominion belongs to Allah. All praise is for Allah.", count: 1)] + Self.morningEvening
        }
    }

    private static let afterSalah: [Dhikr] = [
        Dhikr(arabic: "أَسْتَغْفِرُ اللهَ", transliteration: "Astaghfirullah", meaning: "I seek Allah’s forgiveness.", count: 3),
        Dhikr(arabic: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ", transliteration: "Allahumma antas-salam wa minkas-salam, tabarakta ya dhal-jalali wal-ikram", meaning: "O Allah, You are Peace and from You is peace. Blessed are You, Possessor of majesty and honour.", count: 1),
        Dhikr(arabic: "سُبْحَانَ اللهِ", transliteration: "SubhanAllah", meaning: "Glory be to Allah.", count: 33),
        Dhikr(arabic: "الْحَمْدُ لِلَّهِ", transliteration: "Alhamdulillah", meaning: "All praise is for Allah.", count: 33),
        Dhikr(arabic: "اللهُ أَكْبَرُ", transliteration: "Allahu Akbar", meaning: "Allah is the Greatest.", count: 33),
        Dhikr(arabic: "لَا إِلَٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa ʿala kulli shayʾin qadir", meaning: "There is no god but Allah alone, without partner. His is the dominion and His is the praise, and He has power over all things. Completes the hundred.", count: 1),
        Dhikr(title: "Ayat al-Kursi", meaning: "Al-Baqarah 2:255. Recite once after each obligatory prayer.", count: 1),
    ]

    private static let morningEvening: [Dhikr] = [
        Dhikr(title: "Ayat al-Kursi", meaning: "Al-Baqarah 2:255. Recite once.", count: 1),
        Dhikr(title: "Al-Ikhlas, Al-Falaq, An-Nas", meaning: "Surahs 112, 113 and 114. Recite each three times.", count: 3),
        Dhikr(title: "Sayyid al-Istighfar", transliteration: "Allahumma anta Rabbi, la ilaha illa ant, khalaqtani wa ana ʿabduk…", meaning: "The master supplication for forgiveness.", count: 1),
        Dhikr(arabic: "بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", transliteration: "Bismillahil-ladhi la yadurru maʿasmihi shayʾun fil-ardi wa la fis-samaʾ, wa huwas-samiʿul-ʿalim", meaning: "In the name of Allah, with whose name nothing on earth or in the heavens can cause harm. He is the All-Hearing, the All-Knowing.", count: 3),
        Dhikr(arabic: "حَسْبِيَ اللهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ", transliteration: "Hasbiyallahu la ilaha illa huwa, ʿalayhi tawakkaltu wa huwa Rabbul-ʿarshil-ʿazim", meaning: "Allah is sufficient for me. There is no god but Him. In Him I trust, and He is Lord of the Mighty Throne.", count: 7),
        Dhikr(arabic: "سُبْحَانَ اللهِ وَبِحَمْدِهِ", transliteration: "SubhanAllahi wa bihamdihi", meaning: "Glory be to Allah, and praise be to Him.", count: 100),
    ]
}
