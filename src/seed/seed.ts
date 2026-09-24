import { Types } from 'mongoose'
import { Channel } from '../models/channel.model'
import { Playlist } from '../models/playlist.model'
import { User } from '../models/user.model'

export const seedDatabaseIfEmpty = async () => {
  try {
    const playlistCount = await Playlist.countDocuments()
    if (playlistCount > 0) return

    console.log('🌱 [Seed] Baza bo\'sh, boshlang\'ich demo kanallar va playlistlar yuklanmoqda...')

    // 1. Demo Kanallar va ularning mualliflari
    const demoChannelsData = [
      {
        phone: '+998900000001',
        name: 'CodeCraft Uz',
        title: 'CodeCraft Uz',
        username: 'codecraft_uz',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop',
        description: 'Zamonaviy JavaScript, TypeScript va Full-Stack dasturlash darslari hamda amaliy loyihalar.',
        subscribersCount: 68000,
        videosCount: 10,
      },
      {
        phone: '+998900000002',
        name: 'Samandar Dasturchi',
        title: 'Samandar Dasturchi',
        username: 'samandar_dev',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
        description: "HTML, CSS, Tailwind va zamonaviy Frontend texnologiyalari bo'yicha eng yaxshi qo'llanmalar.",
        subscribersCount: 42000,
        videosCount: 6,
      },
      {
        phone: '+998900000003',
        name: 'Pythonic Uz',
        title: 'Pythonic Uz',
        username: 'pythonic_uz',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
        description: 'Python, Django, FastAPI va mustahkam Backend arxitekturasi bo\'yicha to\'liq amaliy kurslar.',
        subscribersCount: 51000,
        videosCount: 5,
      },
      {
        phone: '+998900000004',
        name: 'Dizayn Akademiya',
        title: 'Dizayn Akademiya',
        username: 'dizayn_akademiyasi',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
        description: 'UI/UX dizayn, Figma, mobil ilovalar va veb-saytlar uchun zamonaviy interfeyslar yaratish.',
        subscribersCount: 35000,
        videosCount: 5,
      },
    ]

    const createdChannels: Record<string, any> = {}

    for (const cData of demoChannelsData) {
      let author = await User.findOne({ phone: cData.phone })
      if (!author) {
        author = await User.create({
          fullName: cData.name,
          phone: cData.phone,
          password: 'demo_password_hash_123',
          isPhoneVerified: true,
          role: 'user',
        })
      }

      let ch = await Channel.findOne({ username: cData.username })
      if (!ch) {
        ch = await Channel.create({
          userId: author._id,
          title: cData.title,
          username: cData.username,
          avatar: cData.avatar,
          description: cData.description,
          subscribersCount: cData.subscribersCount,
          videosCount: cData.videosCount,
        })
      }
      createdChannels[cData.username] = ch
    }

    // 2. Demo Playlistlar va Videolar
    const demoPlaylistsData = [
      {
        channel: createdChannels['codecraft_uz'],
        title: "JavaScript To'liq Amaliy Kurs (Noldan Professionalgacha)",
        thumbnail: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?q=80&w=1200&auto=format&fit=crop',
        rawPrice: 100000,
        price: "100 000 so'm",
        description: "JavaScript asoslari, DOM manipulyatsiyasi, asinxron dasturlash va zamonaviy ES6+ xususiyatlari.",
        videos: [
          {
            id: 'js-1',
            title: "JavaScript 1-dars: Kirish va O'zgaruvchilar (let, const, var)",
            price: "25 000 so'm",
            duration: "14:20",
            isFree: true,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Javascript ga kirish 1-darsimiz. Unda foydalanilgan texnologiyalar VS Code va Node.js.",
          },
          {
            id: 'js-2',
            title: "JavaScript 2-dars: Ma'lumot turlari (Data Types) va Operatorlar",
            price: "25 000 so'm",
            duration: "18:45",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Primitive va Reference turlar, typeof operatori.",
          },
          {
            id: 'js-3',
            title: "JavaScript 3-dars: Funksiyalar va Scope (Function Declarations vs Arrow)",
            price: "25 000 so'm",
            duration: "22:10",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Funksiyalar turlari va lexical scope.",
          },
          {
            id: 'js-4',
            title: "JavaScript 4-dars: Massivlar (Arrays) va Objectlar bilan chuqur ishlash",
            price: "25 000 so'm",
            duration: "31:05",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Map, filter, reduce va destructuring usullari.",
          },
        ],
      },
      {
        channel: createdChannels['samandar_dev'],
        title: "HTML & CSS To'liq Amaliy Kurs: Noldan Veb Dasturchi Bo'ling",
        thumbnail: 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?q=80&w=1200&auto=format&fit=crop',
        rawPrice: 90000,
        price: "90 000 so'm",
        description: "Veb sahifalar tuzilishi, semantik teglar, CSS uslublari, Flexbox va Grid.",
        videos: [
          {
            id: 'html-1',
            title: "HTML & CSS 1-dars: Veb qanday ishlaydi va HTML teglari",
            price: "22 500 so'm",
            duration: "15:00",
            isFree: true,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "HTML asosiy teglari va matn bilan ishlash.",
          },
          {
            id: 'html-2',
            title: "HTML & CSS 2-dars: CSS Selektorlar, ranglar va matnlar",
            price: "22 500 so'm",
            duration: "20:10",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "CSS selektorlari, ranglar palitrasi va shriftlar.",
          },
          {
            id: 'html-3',
            title: "HTML & CSS 3-dars: Box Model (Margin, Padding, Border)",
            price: "22 500 so'm",
            duration: "18:40",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Box model va elementlar joylashuvi.",
          },
          {
            id: 'html-4',
            title: "HTML & CSS 4-dars: Flexbox va Responsive Layout yaratish sirlari",
            price: "22 500 so'm",
            duration: "32:15",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Flexbox xususiyatlari va mobil moslashuvchanlik.",
          },
        ],
      },
      {
        channel: createdChannels['pythonic_uz'],
        title: "Python Dasturlash Asoslari va Algoritmlar",
        thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=1200&auto=format&fit=crop',
        rawPrice: 120000,
        price: "120 000 so'm",
        description: "Python sintaksisi, ma'lumotlar tuzilmalari, fayllar bilan ishlash va OOP.",
        videos: [
          {
            id: 'py-1',
            title: "Python 1-dars: Kirish, o'rnatish va birinchi dastur",
            price: "30 000 so'm",
            duration: "16:40",
            isFree: true,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Python muhiti va birinchi Hello World dasturi.",
          },
          {
            id: 'py-2',
            title: "Python 2-dars: Shart operatorlari (if, elif, else)",
            price: "30 000 so'm",
            duration: "21:15",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Mantiqiy ifodalar va shartli tarmoqlanish.",
          },
          {
            id: 'py-3',
            title: "Python 3-dars: Sikllar (for va while) bilan ishlash",
            price: "30 000 so'm",
            duration: "25:30",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Takrorlanish jarayonlari va range funksiyasi.",
          },
          {
            id: 'py-4',
            title: "Python 4-dars: Funksiyalar va Modullar",
            price: "30 000 so'm",
            duration: "28:10",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Kodni modullashtirish va qayta ishlatish.",
          },
        ],
      },
      {
        channel: createdChannels['dizayn_akademiyasi'],
        title: "Figma va Zamonaviy UI/UX Dizayn Kursi",
        thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1200&auto=format&fit=crop',
        rawPrice: 110000,
        price: "110 000 so'm",
        description: "Figma dasturi, komponentlar, auto-layout va mobil ilovalar dizayni.",
        videos: [
          {
            id: 'figma-1',
            title: "Dizayn 1-dars: Kompozitsiya va Ranglar nazariyasi",
            price: "27 500 so'm",
            duration: "19:00",
            isFree: true,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Ranglar psixologiyasi va kompozitsiya qoidalari.",
          },
          {
            id: 'figma-2',
            title: "Dizayn 2-dars: Figma asoslari: Auto-layout va Components",
            price: "27 500 so'm",
            duration: "30:15",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Figma asosiy panellari va auto-layout.",
          },
          {
            id: 'figma-3',
            title: "Dizayn 3-dars: Mobil ilova interfeysi prototipi (Prototyping)",
            price: "27 500 so'm",
            duration: "34:00",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Interaktiv prototiplar va animatsiyalar.",
          },
          {
            id: 'figma-4',
            title: "Dizayn 4-dars: Dizayn tizimi (Design System) yaratish",
            price: "27 500 so'm",
            duration: "41:20",
            isFree: false,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            description: "Tokens, typography va qayta ishlatiluvchi komponentlar.",
          },
        ],
      },
    ]

    for (const p of demoPlaylistsData) {
      if (p.channel) {
        await Playlist.create({
          channelId: p.channel._id,
          userId: p.channel.userId,
          title: p.title,
          thumbnail: p.thumbnail,
          rawPrice: p.rawPrice,
          price: p.price,
          description: p.description,
          rating: 4.9,
          videos: p.videos,
        })
      }
    }

    console.log('✅ [Seed] Demo kanallar va playlistlar muvaffaqiyatli bazaga kiritildi!')
  } catch (error) {
    console.error('❌ [Seed] Xatolik:', error)
  }
}
