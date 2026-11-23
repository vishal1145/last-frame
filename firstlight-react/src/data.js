export const EMAIL = 'hi@algofolks.com'

// the highlighted word in the hero title cycles through these
export const heroWords = ['Demo Videos', 'Launch Films', 'Explainer Videos', 'App Trailers']

// Hero stage. `src` is the big "NOW PLAYING" film (desktop merge + phone stage); leave it empty to fall back to projects[0].
// ad-HEROCARD-FINAL is the TheRoughCut ad rendered as the card itself (1560×1060, dark, its own NOW PLAYING pill and
// scene captions baked in), so the card draws no pill/caption over it. Source render: ~/theroughcut-ad/public/video/.
export const heroVideo = {
  // since 2026-11-18: a free Mixkit clip (44119, product photographer on a yellow set; 1280×720, 9.8 s, no audio).
  // The TheRoughCut ad render is still in public/video/ad-HEROCARD-FINAL.mp4 — set src/poster back and selfCaptioned: true to restore it.
  src: '/video/hero/main.mp4',
  poster: '/video/hero/main.jpg',
  ratio: '16 / 9',             // the phone stage card takes this shape so nothing is cropped
  selfCaptioned: false,        // plain footage: the card draws its own NOW PLAYING pill and title
  title: 'The Product Shoot',
  label: 'SHOWREEL · 2026',
  bg: '/video/hero-bg.mp4',   // full-bleed hero background (muted loop). Stock placeholder from Pexels — replace with your own footage
  bgPoster: '/video/hero-bg.jpg',
}

// hclip/hposter = the hero merge cards' own clips (free Mixkit stock, 640px / 8 s / no audio in public/video/hero/)
const H = (n) => ({ hclip: `/video/hero/${n}.mp4`, hposter: `/video/hero/${n}.jpg` })
// clip/poster = muted preview loop (stock placeholders from Pexels — swap for your own). Add video: 'https://...' to open the real film on click
export const projects = [
  { no: 'PRJ 01', title: 'Noir Nº9', cat: 'Beauty & Cosmetics', kind: 'Product ad', meta: '2026 · 00:45', tc: '00:45',
    art: 'radial-gradient(circle at 30% 70%,#C98A3B,#2A1708 75%)',
    clip: '/video/perfume.mp4', poster: '/video/perfume.jpg' },
  { no: 'PRJ 02', title: 'First Sip', cat: 'Food & Beverage Films', kind: 'Commercial', meta: '2026 · 00:30', tc: '00:30',
    art: 'linear-gradient(165deg,#3A2B20 0 55%,#E8A013 55% 58%,#C96A2B 58%)',
    clip: '/video/coffee.mp4', poster: '/video/coffee.jpg', ...H('coffee') },
  { no: 'PRJ 03', title: 'Runway Zero', cat: 'Fashion & Lifestyle Ads', kind: 'Fashion film', meta: '2025 · 01:00', tc: '01:00',
    art: 'repeating-linear-gradient(90deg,#191A16 0 16px,#EFEDE2 16px 32px)',
    clip: '/video/runway.mp4', poster: '/video/runway.jpg', ...H('runway') },
  { no: 'PRJ 04', title: 'The Unboxing', cat: 'Product Commercials', kind: 'Launch film', meta: '2026 · 00:40', tc: '00:40',
    art: 'conic-gradient(from 210deg at 70% 20%,#1E3A8A,#7FA0E8 35%,#DCE6FA 60%,#1E3A8A 95%)',
    clip: '/video/unboxing.mp4', poster: '/video/unboxing.jpg', ...H('unboxing') },
  { no: 'PRJ 05', title: 'House of Ember', cat: 'Brand Films', kind: 'Brand story', meta: '2025 · 01:30', tc: '01:30',
    art: 'radial-gradient(circle at 30% 70%,#E8552F,#5A1210 75%)',
    clip: '/video/embers.mp4', poster: '/video/embers.jpg', ...H('ember') },
  { no: 'PRJ 06', title: 'Scroll Stopper', cat: 'Social Media Campaigns', kind: '9:16 reel', meta: '2026 · 00:15', tc: '00:15',
    art: 'linear-gradient(180deg,#A9C7E8 0 48%,#F2E3BC 48% 52%,#2E6B4F 52%)',
    clip: '/video/sneakers.mp4', poster: '/video/sneakers.jpg' },
]

// the Work reel shows the six films above plus three more (Hero + film-reel components keep using `projects` only).
// Its clips are its own: free Mixkit stock (mixkit.co licence) re-encoded to 1280px / 10 s / no audio in public/video/work/
const W = (n) => ({ clip: `/video/work/${n}.mp4`, poster: `/video/work/${n}.jpg` })
const WORK_CLIPS = ['perfume', 'coffee', 'runway', 'unboxing', 'ember', 'sneakers']
export const workFilms = [
  ...projects.map((p, i) => ({ ...p, ...W(WORK_CLIPS[i]) })),
  { no: 'PRJ 07', title: 'Behind the Lens', cat: 'Documentary & Interviews', kind: 'Interview film', meta: '2026 · 00:50', tc: '00:50',
    art: 'linear-gradient(165deg,#1b1b1f,#4a4a55)', ...W('interview') },
  { no: 'PRJ 08', title: 'The Edit Suite', cat: 'Making-of & Process Films', kind: 'Behind the scenes', meta: '2026 · 00:35', tc: '00:35',
    art: 'linear-gradient(165deg,#2a2622,#8a6a4a)', ...W('edit') },
  { no: 'PRJ 09', title: 'Studio Light', cat: 'Brand Teasers', kind: 'Teaser', meta: '2025 · 00:20', tc: '00:20',
    art: 'radial-gradient(circle at 35% 50%,#F2B34A,#120C07 70%)', ...W('studio2') },
]

// six visual tiles — title + tag only, the picture does the talking
export const services = [
  { t: 'Product ad films', clip: '/video/perfume.mp4', poster: '/video/perfume.jpg', tag: '15–60s', art: 'radial-gradient(circle at 30% 70%,#C98A3B,#2A1708 75%)' },
  { t: 'Brand films', clip: '/video/embers.mp4', poster: '/video/embers.jpg', tag: '60–120s', art: 'radial-gradient(circle at 30% 70%,#E8552F,#5A1210 75%)' },
  { t: 'Social reels', clip: '/video/sneakers.mp4', poster: '/video/sneakers.jpg', tag: '9:16', art: 'linear-gradient(180deg,#A9C7E8 0 48%,#F2E3BC 48% 52%,#2E6B4F 52%)' },
  { t: 'Explainers & demos', clip: '/video/unboxing.mp4', poster: '/video/unboxing.jpg', tag: '30–90s', art: 'linear-gradient(135deg,#2B3A6B,#7FA0E8,#DCE6FA)' },
  { t: 'Launch films', clip: '/video/runway.mp4', poster: '/video/runway.jpg', tag: 'Campaign', art: 'conic-gradient(from 210deg at 70% 20%,#1E3A8A,#7FA0E8 35%,#DCE6FA 60%,#1E3A8A 95%)' },
  { t: 'Testimonial films', clip: '/video/interview.mp4', poster: '/video/interview.jpg', tag: 'Interview', art: 'linear-gradient(160deg,#3A2B20,#E8A013 55%,#F2E3BC)' },
]

// No shoots: product videos for software / IT products are written, designed and animated remotely
export const steps = [
  { k: 'STEP 01', t: 'Brief', d: 'Your product, who it is for, and where the video will run. Share a demo login or screen recordings.' },
  { k: 'STEP 02', t: 'Script & storyboard', d: 'Script, voice-over draft and storyboard frames — you approve before anything is animated.' },
  { k: 'STEP 03', t: 'Design & animate', d: 'UI motion, 2D/3D animation, screen captures and voice-over. No camera, no crew, no shoot day.' },
  { k: 'STEP 04', t: 'Review & deliver', d: 'Two revision rounds, then final files in every ratio — ready for your site, ads and app store.' },
]

// PLACEHOLDER figures — replace with your real numbers before launch
export const stats = [
  { n: '120+', l: 'Ad films delivered' },
  { n: '60+', l: 'Brands served' },
  { n: '12', l: 'Industries covered' },
  { n: '8', l: 'Languages' },
]

// Clients: logo files live in public/logos/
export const clients = [
  { name: 'Padhai247', logo: '/logos/padhai247.png', url: 'https://staging.app.padhai247.com/', about: "An all-in-one learning platform for students, teachers and administrators, with AI classrooms, tests and video lectures." },
  { name: 'DoubtBuddy', logo: '/logos/doubtbuddy.png', url: 'https://doubtbuddy.ai/', about: "Custom AI agent systems built on governed company data, deployed on cloud or fully on-premise." },
  { name: 'Lyro', logo: '/logos/lyro.png', url: 'https://lyro.live/', about: "Voice-to-text typing for Windows, Linux and macOS: speak naturally and your words appear in any app." },
  { name: 'BrokerGully', logo: '/logos/brokergully.png', url: 'https://brokergully.com/', about: "A free network for property dealers in Agra to share enquiries and transfer leads to KYC-verified brokers." },
  { name: 'MITRO', logo: '/logos/mitro.png', url: 'https://mitro.live/', about: "A creator engagement and live streaming platform." },
  { name: 'ApnaMunshi', logo: '/logos/apnamunshi-icon.png', url: 'https://apnamunshi.store/', about: "A voice khata on WhatsApp: shopkeepers track udhaar and sales by simply speaking, with no app to download." },
  { name: 'Apex Chess Academy', logo: '/logos/apex-chess.png', url: 'https://apex-chess-academy.netlify.app/', about: "Personal chess coaching in Ahmedabad, with weekly assignments, game analysis and a members platform." },
  { name: 'FutureFunding', logo: '/logos/futurefunding.png', url: 'https://www.futurefunding.in/', about: "India's AI-native quantitative research lab and evaluation platform." },
  { name: 'SocialRipple', logo: '/logos/socialripple.png', url: 'https://www.socialripple.ai/', about: "An employee advocacy platform that helps B2B teams share approved content across social networks." },
]

export const tilesA = [
  { k: 'clip', t: 'Perfume film · the reveal', shape: 'desk', clip: '/video/sm/perfume.mp4', poster: '/video/sm/perfume.jpg' },
  { k: 'ken', t: 'Luxury watch · macro', art: 'linear-gradient(135deg,#2B3A6B,#7FA0E8,#DCE6FA)', shape: 'desk' },
  { k: 'type', t: 'Cosmetics campaign', w: 'Glow', shape: 'desk' },
  { k: 'clip', t: 'Coffee spot · the pour', shape: 'desk', clip: '/video/sm/coffee.mp4', poster: '/video/sm/coffee.jpg' },
  { k: 'scan', t: 'Sneaker drop · tracking', shape: 'desk' },
  { k: 'ken', t: 'F&B commercial · the pour', art: 'linear-gradient(160deg,#3A2B20,#E8A013 55%,#F2E3BC)', shape: 'desk' },
  { k: 'clip', t: 'Fashion film · runway', shape: 'desk', clip: '/video/sm/runway.mp4', poster: '/video/sm/runway.jpg' },
  { k: 'type', t: 'Food film · title sting', w: 'Crave', shape: 'desk' },
]

// second "Now Playing" strip — rolls the opposite way
export const tilesA2 = [
  { k: 'type', t: 'Sneaker drop · hype cut', w: 'Run', shape: 'desk' },
  { k: 'clip', t: 'Founder story · interview', shape: 'desk', clip: '/video/sm/interview.mp4', poster: '/video/sm/interview.jpg' },
  { k: 'wave', t: 'Tech launch · sound bed', shape: 'desk' },
  { k: 'clip', t: 'Unboxing · launch film', shape: 'desk', clip: '/video/sm/unboxing.mp4', poster: '/video/sm/unboxing.jpg' },
  { k: 'grade', t: 'Automotive · night grade', shape: 'desk' },
  { k: 'scan', t: 'Fashion · motion track', shape: 'desk' },
  { k: 'clip', t: 'Fireside · brand film', shape: 'desk', clip: '/video/sm/embers.mp4', poster: '/video/sm/embers.jpg' },
  { k: 'type', t: 'Streetwear · title card', w: 'Bold', shape: 'desk' },
]
