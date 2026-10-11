import { Hono } from "hono";

// Create Hono router
const app = new Hono();

// In-Memory Database Store for Instant Reliable Worker Serving
let seeded = false;

interface Product {
  id: string;
  vendor_id: string;
  category_id: string;
  title_fa: string;
  title_en: string;
  slug: string;
  description_fa: string;
  description_en: string;
  base_price_tomans: number;
  discount_percent: number;
  stock: number;
  rating: number;
  review_count: number;
  featured: number;
  is_3d_enabled: number;
  model_type: string;
  specifications: Record<string, string>;
  images: string[];
  tags: string[];
  created_at: number;
}

interface Vendor {
  id: string;
  user_id: string;
  store_name: string;
  store_slug: string;
  description_fa: string;
  description_en: string;
  banner_url: string;
  logo_url: string;
  rating: number;
  total_sales: number;
  is_verified: number;
  commission_rate: number;
  balance_tomans: number;
  badge: string;
  created_at: number;
}

interface Category {
  id: string;
  name_fa: string;
  name_en: string;
  slug: string;
  icon: string;
  parent_id: string | null;
}

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  verified_purchase: number;
  vendor_response?: string;
  images: string[];
  sentiment: string;
  created_at: number;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  total_tomans: number;
  status: string;
  payment_method: string;
  shipping_address: Record<string, string>;
  tracking_code: string;
  idempotency_key?: string;
  created_at: number;
  items: any[];
}

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  details: Record<string, any>;
  created_at: number;
}

interface B2BQuote {
  id: string;
  company_name: string;
  email: string;
  phone: string;
  product_id: string;
  product_title_fa: string;
  target_quantity: number;
  destination_country: string;
  notes: string;
  status: string;
  quoted_unit_price_tomans?: number;
  estimated_days?: number;
  vendor_note?: string;
  created_at: number;
}

let dbVendors: Vendor[] = [];
let dbCategories: Category[] = [];
let dbProducts: Product[] = [];
let dbReviews: Review[] = [];
let dbOrders: Order[] = [];
let dbAuditLogs: AuditLog[] = [];
let dbSettlements: any[] = [];
let dbB2bQuotes: B2BQuote[] = [];

function seedDatabase() {
  if (seeded) return;
  const now = Date.now();

  dbCategories = [
    { id: 'cat_elec', name_fa: 'دیجیتال و تکنولوژی', name_en: 'Electronics & Tech', slug: 'electronics', icon: 'Cpu', parent_id: null },
    { id: 'cat_rugs', name_fa: 'فرش و صنایع دستی', name_en: 'Persian Carpets & Arts', slug: 'carpets-art', icon: 'Sparkles', parent_id: null },
    { id: 'cat_fashion', name_fa: 'مد و ساعت لوکس', name_en: 'Fashion & Luxury', slug: 'fashion-watches', icon: 'Watch', parent_id: null },
    { id: 'cat_home', name_fa: 'خانه و آشپزخانه هوشمند', name_en: 'Smart Home & Living', slug: 'smart-home', icon: 'Home', parent_id: null },
    { id: 'cat_beauty', name_fa: 'عطر و زیبایی اصیل', name_en: 'Perfumes & Beauty', slug: 'beauty', icon: 'Gem', parent_id: null },
  ];

  dbVendors = [
    {
      id: 'vnd_1',
      user_id: 'usr_vendor1',
      store_name: 'آریا تکنولوژی - Arya Tech Premium',
      store_slug: 'arya-tech',
      description_fa: 'نمایندگی رسمی عرضه جدیدترین کالاهای دیجیتال و گجت‌های هوشمند هیبریدی در ایران',
      description_en: 'Official flagship store for premium hybrid gadgets, AI wearables, and audio in Iran.',
      banner_url: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1200&q=80',
      logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
      rating: 4.9,
      total_sales: 1420,
      is_verified: 1,
      commission_rate: 0.08,
      balance_tomans: 485000000,
      badge: 'Gold Diamond Vendor',
      created_at: now
    },
    {
      id: 'vnd_2',
      user_id: 'usr_vendor2',
      store_name: 'فرش و ابریشم پارس - Persia Silk & Rugs',
      store_slug: 'persia-silk',
      description_fa: 'تولیدکننده و صادرکننده اصیل‌ترین فرش‌های دستباف ابریشم قم و تبریز با شناسه اصالت',
      description_en: 'Master weaver & global exporter of hand-knotted authentic Silk Carpets from Qom & Tabriz.',
      banner_url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80',
      logo_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=200&q=80',
      rating: 5.0,
      total_sales: 680,
      is_verified: 1,
      commission_rate: 0.06,
      balance_tomans: 890000000,
      badge: 'Master Artisan',
      created_at: now
    },
    {
      id: 'vnd_3',
      user_id: 'usr_admin',
      store_name: 'ساعت‌های فاخر کوروش - Kourosh Luxury Timepieces',
      store_slug: 'kourosh-time',
      description_fa: 'گالری تخصصی ساعت‌های مکانیکی لوکس، نسخه محدود و طلا کوب',
      description_en: 'Specialized gallery of luxury tourbillon mechanical watches and limited edition timepieces.',
      banner_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
      logo_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=200&q=80',
      rating: 4.95,
      total_sales: 310,
      is_verified: 1,
      commission_rate: 0.10,
      balance_tomans: 320000000,
      badge: 'Official Brand',
      created_at: now
    }
  ];

  dbProducts = [
    {
      id: 'prd_1',
      vendor_id: 'vnd_1',
      category_id: 'cat_elec',
      title_fa: 'هدفون بی‌سیم نویز کنسلینگ هوشمند آریا برو Pro',
      title_en: 'Arya Pro Smart Spatial ANC Headphones',
      slug: 'arya-pro-anc-headphones',
      description_fa: 'هدفون پریمیوم با درایورهای تیتانیومی ۵۰ میلی‌متری، نویز کنسلینگ اکتیو ۵۵ دسی‌بل، کیفیت صوتی ۲۴ بیت LDAC و عمر باتری ۶۰ ساعته همراه با تراشه اختصاصی AI Audio.',
      description_en: 'Flagship wireless headphones featuring 50mm titanium drivers, 55dB active hybrid ANC, 24-bit Hi-Res audio playback, and 60h battery life powered by custom AI sound engine.',
      base_price_tomans: 18500000,
      discount_percent: 12,
      stock: 35,
      rating: 4.9,
      review_count: 84,
      featured: 1,
      is_3d_enabled: 1,
      model_type: 'headphones',
      specifications: {
        'پردازنده صوتی': 'Arya Neural Sound Chip v2',
        'عمر باتری': '۶۰ ساعت پخش مداوم',
        'اتصال': 'Bluetooth 5.4 + Dual 2.4G Dongle',
        'وزن': '۲۷۵ گرم',
        'ضمانت': '۲۴ ماه گارانتی طلایی آریا'
      },
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'
      ],
      tags: ['هدفون', 'نویز کنسلینگ', 'دیجیتال', 'گجت', 'Audio', 'Headphones'],
      created_at: now
    },
    {
      id: 'prd_2',
      vendor_id: 'vnd_3',
      category_id: 'cat_fashion',
      title_fa: 'ساعت توربیون مکانیکی شاهکار کوروش - نسخه طلا ۱۸ عیار',
      title_en: 'Shahkar Tourbillon Mechanical Watch - 18K Gold Edition',
      slug: 'shahkar-tourbillon-gold-watch',
      description_fa: 'ساعت مکانیکی اتوماتیک شاهکار با موتور توربیون سوئیسی، کریستال یاقوت کبود ضد خش، قاب طلا کوب و بند چرم طبیعی تمساح شاهی. تولید محدود ۱۰۰ عددی در جهان.',
      description_en: 'Exquisite Swiss-movement mechanical Tourbillon timepiece with anti-reflective Sapphire glass, 18K gold inlaid casing, and royal alligator leather strap. Limited to 100 pieces worldwide.',
      base_price_tomans: 145000000,
      discount_percent: 5,
      stock: 8,
      rating: 5.0,
      review_count: 29,
      featured: 1,
      is_3d_enabled: 1,
      model_type: 'watch',
      specifications: {
        'موتور': 'Swiss Automatic Tourbillon Caliber 88',
        'جنس بدنه': 'طلا ۱۸ عیار + استیل ۳۱۶L',
        'مقاومت در آب': '100 Meters / 10 ATM',
        'جنس شیشه': 'Sapphire Crystal anti-glare',
        'اصالت': 'گواهی ثبت بین‌المللی همراه شناسه NFT'
      },
      images: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80'
      ],
      tags: ['ساعت', 'لوکس', 'طلا', 'اکسسوری', 'Watch', 'Luxury'],
      created_at: now
    },
    {
      id: 'prd_3',
      vendor_id: 'vnd_2',
      category_id: 'cat_rugs',
      title_fa: 'فرش دستباف ابریشم ۱۰۰٪ قم طرح لچک ترنج اسلیمی (۶ متری)',
      title_en: 'Authentic 100% Qom Pure Silk Hand-Knotted Rug (6 Sqm)',
      slug: 'qom-pure-silk-rug-6m',
      description_fa: 'شاهکار بافندگی قم با تراکم ۱۲۰ رج، چله و پرز تمام ابریشم طبیعی، رنگ‌آمیزی گیاهی استادانه. همراه با شناسنامه معتبر فدراسیون فرش دستباف ایران.',
      description_en: 'Masterpiece pure silk Qom carpet woven at 120 Raj density with natural botanical dyes and verified Certificate of Authenticity.',
      base_price_tomans: 380000000,
      discount_percent: 8,
      stock: 4,
      rating: 5.0,
      review_count: 18,
      featured: 1,
      is_3d_enabled: 1,
      model_type: 'carpet',
      specifications: {
        'تراکم': '۱۲۰ رج واقعی',
        'جنس تار و پود': 'ابریشم ۱۰۰٪ طبیعی',
        'ابعاد': '۲۰۰ در ۳۰۰ سانتی‌متر (۶ متر)',
        'نوع رنگ': 'رنگرزی سنتی گیاهی (پوست گردو و روناس)',
        'شناسنامه': 'تاییدیه فدراسیون بین‌المللی فرش'
      },
      images: [
        'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80'
      ],
      tags: ['فرش', 'ابریشم', 'صنایع دستی', 'دکوراسیون', 'Rug', 'Silk'],
      created_at: now
    },
    {
      id: 'prd_4',
      vendor_id: 'vnd_1',
      category_id: 'cat_elec',
      title_fa: 'عینک هوشمند واقعیت افزوده آریا Vision AR Glass',
      title_en: 'Arya Vision Micro-OLED AR Smart Glasses',
      slug: 'arya-vision-ar-smart-glasses',
      description_fa: 'عینک واقعیت افزوده نسل جدید با دو نمایشگر Micro-OLED ۴K، زاویه دید ۵۰ درجه، اسپیکرهای فضایی directional و وزن سبک ۷۶ گرمی.',
      description_en: 'Next-gen spatial AR glasses equipped with dual 4K Micro-OLED panels, 50-degree FOV, directional spatial audio, and ultralight 76g titanium frame.',
      base_price_tomans: 42000000,
      discount_percent: 10,
      stock: 19,
      rating: 4.8,
      review_count: 42,
      featured: 1,
      is_3d_enabled: 1,
      model_type: 'glasses',
      specifications: {
        'کیفیت تصویر': 'Dual 4K Micro-OLED @ 120Hz',
        'روشنایی': 'up to 3000 nits',
        'پردازنده': 'Snapdragon XR2 Gen 2',
        'سازگاری': 'iOS / Android / Windows / macOS'
      },
      images: [
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80'
      ],
      tags: ['عینک هوشمند', 'واقعیت افزوده', 'AR', 'Micro-OLED'],
      created_at: now
    },
    {
      id: 'prd_5',
      vendor_id: 'vnd_1',
      category_id: 'cat_home',
      title_fa: 'اسپرسوساز هوشمند لمسی آریا Barista Touch AI',
      title_en: 'Arya Barista Touch AI Espresso Machine',
      slug: 'arya-barista-touch-espresso',
      description_fa: 'دستگاه اسپرسوساز حرفه‌ای ۱۹ بار با آسیاب مخروطی سرامیکی، سیستم عصاره‌گیری هوشمند AI، نازل بخار خودکار اتوماتیک و صفحه نمایش ۵ اینچ لمسی.',
      description_en: 'Professional 19-bar espresso machine with integrated ceramic conical grinder, AI extraction profiler, automatic micro-foam steam wand, and 5" color touch display.',
      base_price_tomans: 32500000,
      discount_percent: 15,
      stock: 22,
      rating: 4.9,
      review_count: 56,
      featured: 0,
      is_3d_enabled: 1,
      model_type: 'appliance',
      specifications: {
        'فشار پمپ': '19 Bar Italian Ulka Pump',
        'توان': '1650 Watt Dual Thermo-block',
        'مخزن آب': '۲.۴ لیتر معطر',
        'صفحه نمایش': '۵ اینچ OLED لمسی رنگی'
      },
      images: [
        'https://images.unsplash.com/photo-1517668808822-9a428a248530?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'
      ],
      tags: ['اسپرسو', 'قهوه ساز', 'آشپزخانه', 'قهوه', 'Espresso'],
      created_at: now
    },
    {
      id: 'prd_6',
      vendor_id: 'vnd_3',
      category_id: 'cat_beauty',
      title_fa: 'عطر نیش سلطنتی زعفران و عود شیراز (۵۰ میلی‌لیتر)',
      title_en: 'Royal Shiraz Saffron & Oud Extrait de Parfum (50ml)',
      slug: 'shiraz-saffron-oud-perfume',
      description_fa: 'عطر دست‌ساز غلیظ Extrait de Parfum ترکیبی از زعفران خالص قائنات، عود کهنسال کامبوج و رز سرخ محمدی قمصر کاشان. ماندگاری بیش از ۴۸ ساعت.',
      description_en: 'Handcrafted luxury Extrait de Parfum blending pure Ghaen saffron, aged Cambodian oud, and organic Kashan Damask rose.',
      base_price_tomans: 12800000,
      discount_percent: 0,
      stock: 45,
      rating: 4.95,
      review_count: 67,
      featured: 0,
      is_3d_enabled: 1,
      model_type: 'perfume',
      specifications: {
        'غلظت': 'Extrait de Parfum (35% Oil)',
        'حجم': '۵۰ میلی‌لیتر',
        'نت‌های اولیه': 'زعفران قائنات، هل سبز، ترنج',
        'نت‌های میانی': 'رز محمدی کاشان، بخور خوشبو',
        'نت‌های پایه': 'عود کهنه، عنبر شاهی، چرم'
      },
      images: [
        'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80'
      ],
      tags: ['عطر', 'ادکلن', 'زعفران', 'زیبایی', 'Perfume'],
      created_at: now
    },
    {
      id: 'prd_7',
      vendor_id: 'vnd_1',
      category_id: 'cat_elec',
      title_fa: 'آیفون ۱۶ پرو مکس نچرال تیتانیوم ۲۵۶ گیگابایت',
      title_en: 'iPhone 16 Pro Max Natural Titanium 256GB',
      slug: 'iphone-16-pro-max-natural-titanium',
      description_fa: 'پرچمدار اپل با پردازنده A18 Pro، بدنه تیتانیومی درجه ۵، سیستم دوربین ۴۸ مگاپیکسلی هوشمند و دکمه جدید Camera Control.',
      description_en: 'Apple flagship smartphone powered by A18 Pro chip, Grade 5 Titanium frame, 48MP fusion camera system and dedicated Camera Control button.',
      base_price_tomans: 98000000,
      discount_percent: 5,
      stock: 14,
      rating: 4.9,
      review_count: 112,
      featured: 1,
      is_3d_enabled: 1,
      model_type: 'watch',
      specifications: {
        'پردازنده': 'Apple A18 Pro 3nm',
        'حافظه داخلی': '۲۵۶ گیگابایت',
        'صفحه نمایش': '۶.۹ اینچ Super Retina XDR 120Hz',
        'گارانتی': '۱۸ ماه گارانتی شرکتی + کد رجیستری همتا'
      },
      images: [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'
      ],
      tags: ['آیفون', 'گوشی', 'موبایل', 'اپل', 'iPhone', 'Apple'],
      created_at: now
    },
    {
      id: 'prd_8',
      vendor_id: 'vnd_2',
      category_id: 'cat_rugs',
      title_fa: 'پک هدیه فاخر خاویار بلوگا امپریال و زعفران صادراتی قائنات',
      title_en: 'Imperial Beluga Caviar & Premium Saffron Luxury Gift Box',
      slug: 'beluga-caviar-saffron-luxury-box',
      description_fa: 'بسته‌بندی شاهانه شامل ۱۰۰ گرم خاویار اصل بلوگا امپریال دریای خزر و ۵۰ گرم زعفران نگین سوپر صادراتی قائنات در جعبه چوبی خاتم‌کاری اصفهان.',
      description_en: 'Royal gift box containing 100g Caspian Beluga Imperial Caviar and 50g Super Negin Saffron presented in handcrafted Khatam-kari wooden case.',
      base_price_tomans: 28000000,
      discount_percent: 10,
      stock: 12,
      rating: 5.0,
      review_count: 34,
      featured: 1,
      is_3d_enabled: 1,
      model_type: 'carpet',
      specifications: {
        'خاویار': '۱۰۰ گرم بلوگا امپریال پرورشی دریای خزر',
        'زعفران': '۵۰ گرم سوپر نگین قائنات',
        'جعبه': 'چوب طبیعی با خاتم‌کاری سنگ و استخوان',
        'ارسال': 'ارسال زنجیره سرد (Cold Chain Courier)'
      },
      images: [
        'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=800&q=80'
      ],
      tags: ['خاویار', 'زعفران', 'هدیه', 'لوکس', 'Caviar', 'Saffron'],
      created_at: now
    }
  ];

  dbReviews = [
    {
      id: 'rev_1',
      product_id: 'prd_1',
      user_id: 'usr_customer1',
      user_name: 'نوید رضایی',
      rating: 5,
      comment: 'کیفیت ساخت و طراحی فوق‌العاده است. پشتیبانی فروشنده هم بسیار محترمانه و سریع بود. تفکیک صدای این محصول در سطح محصولات استودیویی گران‌قیمت جهانی قرار داره.',
      verified_purchase: 1,
      vendor_response: 'با درود و احترام، از حسن اعتماد و دیدگاه ارزشمند شما صمیمانه سپاسگزاریم.',
      images: [],
      sentiment: 'positive',
      created_at: now - 86400000 * 2
    }
  ];

  dbOrders = [
    {
      id: 'ord_1001',
      order_number: 'SHK-982310',
      user_id: 'usr_customer1',
      total_tomans: 16280000,
      status: 'delivered',
      payment_method: 'درگاه پرداخت شتاب (زرین‌پال)',
      shipping_address: {
        province: 'تهران',
        city: 'تهران',
        address: 'خیابان ولیعصر، نرسیده به میدان ونک، برج نگار، طبقه ۱۲',
        postal_code: '1991811111',
        recipient_name: 'نوید رضایی',
        phone: '09124444444'
      },
      tracking_code: 'TPX-9831092482',
      created_at: now - 86400000 * 5,
      items: [
        {
          id: 'ori_1',
          vendor_id: 'vnd_1',
          product_id: 'prd_1',
          product_title: 'هدفون بی‌سیم نویز کنسلینگ هوشمند آریا برو Pro',
          quantity: 1,
          unit_price_tomans: 16280000
        }
      ]
    }
  ];

  dbB2bQuotes = [
    {
      id: 'b2b_101',
      company_name: 'بازرگانی آریا پارس دبی',
      email: 'import@aryapars.ae',
      phone: '+971501234567',
      product_id: 'prd_1',
      product_title_fa: 'هدفون بی‌سیم نویز کنسلینگ هوشمند آریا برو Pro',
      target_quantity: 250,
      destination_country: 'امارات متحده عربی (دبی)',
      notes: 'درخواست حک لوگوی تجاری سفارشی و بسته‌بندی صادراتی پلتفرم',
      status: 'pending',
      created_at: now - 86400000
    }
  ];

  dbSettlements = [
    {
      id: 'stl_1',
      vendor_id: 'vnd_1',
      amount_tomans: 50000000,
      iban: 'IR980120000000012345678901',
      status: 'completed',
      created_at: now - 86400000 * 3
    }
  ];

  dbAuditLogs = [
    {
      id: 'log_1',
      user_id: 'usr_admin',
      action: 'SYSTEM_INIT',
      resource: 'DATABASE',
      details: { message: 'Shahkar Global Marketplace Initialized Successfully' },
      created_at: now
    }
  ];

  seeded = true;
}

// Middleware to ensure database is ready
app.use('*', async (c, next) => {
  seedDatabase();
  await next();
});

// API Routes
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', engine: 'Shahkar Multi-Vendor Global Engine', timestamp: new Date().toISOString() });
});

app.get('/api/categories', (c) => {
  return c.json(dbCategories);
});

app.get('/api/vendors', (c) => {
  return c.json(dbVendors);
});

app.get('/api/vendors/:id', (c) => {
  const id = c.req.param('id');
  const vendor = dbVendors.find(v => v.id === id || v.store_slug === id);
  if (!vendor) return c.json({ error: 'Vendor not found' }, 404);
  const products = dbProducts.filter(p => p.vendor_id === vendor.id);
  return c.json({ ...vendor, products });
});

app.get('/api/products', (c) => {
  const q = c.req.query('q')?.toLowerCase().trim() || '';
  const category = c.req.query('category') || '';
  const vendorId = c.req.query('vendor') || '';

  let list = [...dbProducts];

  if (category) {
    list = list.filter(p => p.category_id === category);
  }

  if (vendorId) {
    list = list.filter(p => p.vendor_id === vendorId);
  }

  if (q) {
    list = list.filter(p => 
      p.title_fa.toLowerCase().includes(q) ||
      p.title_en.toLowerCase().includes(q) ||
      p.description_fa.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  const formatted = list.map(p => {
    const v = dbVendors.find(vend => vend.id === p.vendor_id);
    return {
      ...p,
      vendor_badge: v?.badge || 'فروشنده معتبر',
      store_name: v?.store_name || 'غرفه اصلی شاهکار',
      final_price_tomans: Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100)
    };
  });

  return c.json(formatted);
});

app.get('/api/products/:id', (c) => {
  const id = c.req.param('id');
  const p = dbProducts.find(prod => prod.id === id || prod.slug === id);
  if (!p) return c.json({ error: 'Product not found' }, 404);

  const v = dbVendors.find(vend => vend.id === p.vendor_id);
  const reviews = dbReviews.filter(r => r.product_id === p.id);

  const variants = [
    { id: `${p.id}_v1`, product_id: p.id, title_fa: 'رنگ استاندارد پریمیوم', title_en: 'Standard Edition', price_tomans: Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100), stock: p.stock },
    { id: `${p.id}_v2`, product_id: p.id, title_fa: 'نسخه خاص VIP', title_en: 'VIP Special Edition', price_tomans: Math.round((p.base_price_tomans * 1.08)), stock: 10 }
  ];

  return c.json({
    ...p,
    vendor_badge: v?.badge || 'فروشنده معتبر',
    store_name: v?.store_name || 'غرفه اصلی شاهکار',
    vendor_logo: v?.logo_url,
    vendor_rating: v?.rating,
    final_price_tomans: Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100),
    variants,
    reviews
  });
});

app.get('/api/search/autocomplete', (c) => {
  const q = c.req.query('q')?.toLowerCase().trim() || '';
  if (!q || q.length < 2) return c.json({ suggestions: [], products: [] });

  const matchedProducts = dbProducts.filter(p =>
    p.title_fa.toLowerCase().includes(q) ||
    p.title_en.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  ).slice(0, 5).map(p => ({
    ...p,
    final_price_tomans: Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100)
  }));

  const suggestions = ['دیجیتال', 'ساعت لوکس', 'فرش ابریشم', 'هوش مصنوعی', 'ارسال اکسپرس'].filter(s => s.includes(q) || q.includes(s));

  return c.json({
    suggestions: suggestions.length > 0 ? suggestions : ['کالای لوکس شاهکار', 'تخفیف ویژه'],
    products: matchedProducts
  });
});

app.get('/api/flash-deals', (c) => {
  const deals = dbProducts.filter(p => p.discount_percent >= 5).slice(0, 4).map((p, idx) => ({
    ...p,
    final_price_tomans: Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100),
    claimed_percent: 68 + (idx * 7),
    stock_remaining: Math.max(2, p.stock - 5)
  }));
  return c.json(deals);
});

// CART CALCULATION & COUPON VALIDATION ENDPOINT
app.post('/api/cart/calculate', async (c) => {
  try {
    const body = await c.req.json<any>();
    const { items = [], couponCode = '' } = body;

    let subtotalTomans = 0;
    let itemDiscountTomans = 0;

    for (const item of items) {
      const p = dbProducts.find(prod => prod.id === item.productId);
      if (!p) continue;

      let unitBasePrice = p.base_price_tomans;
      let unitFinalPrice = Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100);

      if (item.variantId && item.variantId.endsWith('_v2')) {
        unitBasePrice = Math.round(p.base_price_tomans * 1.08);
        unitFinalPrice = unitBasePrice;
      }

      const lineBase = unitBasePrice * item.quantity;
      const lineFinal = unitFinalPrice * item.quantity;

      subtotalTomans += lineBase;
      itemDiscountTomans += (lineBase - lineFinal);
    }

    let couponDiscountTomans = 0;
    let appliedCoupon = null;

    if (couponCode.toUpperCase() === 'SHAHKAR2026') {
      couponDiscountTomans = Math.min(2000000, Math.round((subtotalTomans - itemDiscountTomans) * 0.15));
      appliedCoupon = { code: 'SHAHKAR2026', discountPercent: 15, maxTomans: 2000000 };
    }

    const netProductTomans = subtotalTomans - itemDiscountTomans - couponDiscountTomans;
    const totalShippingTomans = items.length > 0 ? 65000 : 0;
    const vatTaxTomans = Math.round(netProductTomans * 0.10);
    const grandTotalTomans = netProductTomans + totalShippingTomans + vatTaxTomans;

    return c.json({
      subtotalTomans,
      itemDiscountTomans,
      couponDiscountTomans,
      appliedCoupon,
      totalShippingTomans,
      vatTaxTomans,
      grandTotalTomans
    });
  } catch (e: any) {
    return c.json({ error: e.message || 'Cart calculation error' }, 400);
  }
});

app.post('/api/checkout', async (c) => {
  try {
    const body = await c.req.json<any>();
    const { userId = 'usr_customer1', items = [], shippingAddress, paymentMethod = 'درگاه شتاب زرین‌پال', couponCode = '' } = body;

    if (items.length === 0) return c.json({ error: 'Cart is empty' }, 400);

    const orderId = `ord_${Date.now()}`;
    const orderNumber = `SHK-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingCode = `TPX-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const now = Date.now();

    let subtotalTomans = 0;
    let itemDiscountTomans = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const p = dbProducts.find(prod => prod.id === item.productId);
      if (!p) continue;

      let unitBasePrice = p.base_price_tomans;
      let unitPrice = Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100);

      if (item.variantId && item.variantId.endsWith('_v2')) {
        unitBasePrice = Math.round(p.base_price_tomans * 1.08);
        unitPrice = unitBasePrice;
      }

      const basePrice = unitBasePrice * item.quantity;
      const lineTotal = unitPrice * item.quantity;

      subtotalTomans += basePrice;
      itemDiscountTomans += (basePrice - lineTotal);

      // Deduct stock
      p.stock = Math.max(0, p.stock - item.quantity);

      orderItems.push({
        id: `ori_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        product_id: p.id,
        variant_id: item.variantId || `${p.id}_v1`,
        product_title: item.variantId && item.variantId.endsWith('_v2') ? `${p.title_fa} (نسخه VIP)` : p.title_fa,
        quantity: item.quantity,
        unit_price_tomans: unitPrice
      });
    }

    let couponDiscountTomans = 0;
    if (couponCode && couponCode.toUpperCase() === 'SHAHKAR2026') {
      couponDiscountTomans = Math.min(2000000, Math.round((subtotalTomans - itemDiscountTomans) * 0.15));
    }

    const netProductTomans = Math.max(0, subtotalTomans - itemDiscountTomans - couponDiscountTomans);
    const totalShippingTomans = items.length > 0 ? 65000 : 0;
    const vatTaxTomans = Math.round(netProductTomans * 0.10);
    const grandTotal = netProductTomans + totalShippingTomans + vatTaxTomans;

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      user_id: userId,
      total_tomans: grandTotal,
      status: 'paid',
      payment_method: paymentMethod,
      shipping_address: shippingAddress || {},
      tracking_code: trackingCode,
      created_at: now,
      items: orderItems
    };

    dbOrders.unshift(newOrder);

    dbAuditLogs.unshift({
      id: `log_${now}`,
      user_id: userId,
      action: 'CHECKOUT_SUCCESS',
      resource: orderId,
      details: { orderNumber, grandTotal },
      created_at: now
    });

    return c.json({
      success: true,
      order: newOrder
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || 'Checkout error' }, 400);
  }
});

app.get('/api/orders', (c) => {
  return c.json(dbOrders);
});

// LOGISTICS GPS TRACKING ENDPOINT
app.get('/api/logistics/track/:code', (c) => {
  const code = c.req.param('code');
  const now = Date.now();

  return c.json({
    trackingCode: code,
    carrier: 'تیپاکس اکسپرس بین‌المللی (Tipax Express Cold Chain)',
    status: 'in_transit',
    currentLocation: 'تهران - هاب هوشمند توزیع ونک',
    origin: 'تهران (انبار مرکزی شاهکار)',
    destination: 'تهران - برج نگار',
    estimatedDelivery: 'امروز - ساعت ۱۶:۳۰',
    timeline: [
      { step: 1, title_fa: 'ثبت و پردازش سفارش در انبار مرکزی', completed: true, current: false, time: '۰۹:۱۵' },
      { step: 2, title_fa: 'تایید کیفیت و صدور گواهی اصالت', completed: true, current: false, time: '۱۰:۳۰' },
      { step: 3, title_fa: 'تحویل به ناوگان حمل هوشمند تیپاکس', completed: true, current: false, time: '۱۱:۴۵' },
      { step: 4, title_fa: 'حمل در مسیر توزیع شهری (زنجیره سرد)', completed: true, current: true, time: 'در حال انجام' },
      { step: 5, title_fa: 'تحویل نهایی به خریدار', completed: false, current: false, time: 'تخمینی ۱۶:۳۰' }
    ]
  });
});

// B2B WHOLESALE QUOTES ENDPOINTS
app.post('/api/b2b/quote', async (c) => {
  try {
    const body = await c.req.json<any>();
    const { companyName, email, phone, productId, targetQuantity = 100, destinationCountry = 'ایران', notes = '' } = body;

    const p = dbProducts.find(prod => prod.id === productId);

    const newQuote: B2BQuote = {
      id: `b2b_${Date.now()}`,
      company_name: companyName,
      email,
      phone,
      product_id: productId,
      product_title_fa: p ? p.title_fa : 'کالای سفارشی B2B',
      target_quantity: targetQuantity,
      destination_country: destinationCountry,
      notes,
      status: 'pending',
      created_at: Date.now()
    };

    dbB2bQuotes.unshift(newQuote);

    return c.json({
      success: true,
      quoteId: newQuote.id,
      message_fa: 'استعلام قیمت عمده B2B شما ثبت شد. فروشنده تا کمتر از ۴ ساعت دیگر پروفرما را ارسال خواهد کرد.'
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || 'Error creating quote' }, 400);
  }
});

app.get('/api/b2b/quotes', (c) => {
  return c.json(dbB2bQuotes);
});

app.post('/api/b2b/quote/respond', async (c) => {
  try {
    const body = await c.req.json<any>();
    const { quoteId, quotedUnitPriceTomans, estimatedDays = 7, vendorNote = '' } = body;

    const quote = dbB2bQuotes.find(q => q.id === quoteId);
    if (!quote) return c.json({ error: 'Quote not found' }, 404);

    quote.status = 'quoted';
    quote.quoted_unit_price_tomans = quotedUnitPriceTomans;
    quote.estimated_days = estimatedDays;
    quote.vendor_note = vendorNote;

    return c.json({ success: true, message: 'پروفرمای B2B با موفقیت ثبت و برای خریدار ارسال گردید.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || 'Error responding to quote' }, 400);
  }
});

app.post('/api/reviews', async (c) => {
  const body = await c.req.json<any>();
  const { productId, rating = 5, comment = '' } = body;

  const revId = `rev_${Date.now()}`;
  const newRev: Review = {
    id: revId,
    product_id: productId,
    user_id: 'usr_customer1',
    user_name: 'کاربر همراه‌ شاهکار',
    rating,
    comment,
    verified_purchase: 1,
    images: [],
    sentiment: rating >= 4 ? 'positive' : 'neutral',
    created_at: Date.now()
  };

  dbReviews.unshift(newRev);

  // Update product review count
  const p = dbProducts.find(prod => prod.id === productId);
  if (p) {
    p.review_count += 1;
  }

  return c.json({ success: true, reviewId: revId });
});

// READDY AI STUDIO ENDPOINTS FOR DYNAMIC GENERATION & THEME ENGINE
app.post('/api/readdy/generate-product', async (c) => {
  try {
    const body = await c.req.json<any>();
    const prompt = (body.prompt || 'کالای لوکس هوشمند').trim();
    const vendorId = body.vendorId || 'vnd_1';
    const now = Date.now();

    // Readdy AI Synthesis Engine
    let modelType = 'watch';
    let categoryId = 'cat_elec';
    let basePriceTomans = 25000000;
    let titleFa = `کالای هوشمند Readdy AI: ${prompt}`;
    let titleEn = `Readdy AI Product: ${prompt}`;
    let img = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

    if (prompt.includes('هدفون') || prompt.includes('صدا') || prompt.includes('صوتی') || prompt.includes('audio')) {
      modelType = 'headphones';
      categoryId = 'cat_elec';
      basePriceTomans = 22000000;
      titleFa = `هدفون هوشمند AI شارژی ${prompt}`;
      titleEn = `Readdy AI Spatial Audio Headphones - ${prompt}`;
      img = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';
    } else if (prompt.includes('فرش') || prompt.includes('دستباف') || prompt.includes('ابریشم') || prompt.includes('carpet')) {
      modelType = 'carpet';
      categoryId = 'cat_rugs';
      basePriceTomans = 210000000;
      titleFa = `فرش دستباف ابریشم طراحی شده با Readdy AI - ${prompt}`;
      titleEn = `Readdy AI Silk Artisan Carpet - ${prompt}`;
      img = 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80';
    } else if (prompt.includes('عینک') || prompt.includes('واقعیت') || prompt.includes('glasses') || prompt.includes('ar')) {
      modelType = 'glasses';
      categoryId = 'cat_elec';
      basePriceTomans = 48000000;
      titleFa = `عینک واقعیت افزوده Readdy AR - ${prompt}`;
      titleEn = `Readdy Spatial AR Smart Glasses - ${prompt}`;
      img = 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80';
    } else if (prompt.includes('قهوه') || prompt.includes('اسپرسو') || prompt.includes('خانه')) {
      modelType = 'appliance';
      categoryId = 'cat_home';
      basePriceTomans = 34000000;
      titleFa = `اسپرسوساز هوشمند با هوش مصنوعی Readdy AI - ${prompt}`;
      titleEn = `Readdy AI Smart Espresso Craftsman - ${prompt}`;
      img = 'https://images.unsplash.com/photo-1517668808822-9a428a248530?auto=format&fit=crop&w=800&q=80';
    }

    const newProduct: Product = {
      id: `prd_readdy_${now}`,
      vendor_id: vendorId,
      category_id: categoryId,
      title_fa: titleFa,
      title_en: titleEn,
      slug: `readdy-ai-${now}`,
      description_fa: `این محصول به صورت اختصاصی با پرامپت «${prompt}» توسط موتور هوش مصنوعی Readdy AI طراحی و اعتبارسنجی گردید. دارای بدنه ارگونومیک، بالاترین استاندارد ساخت و پشتیبانی رسمی شاهکار.`,
      description_en: `Created dynamically using Readdy AI Prompt Engine for query "${prompt}". Manufactured with top-tier material specs and full Shahkar warranty.`,
      base_price_tomans: basePriceTomans,
      discount_percent: 10,
      stock: 25,
      rating: 5.0,
      review_count: 1,
      featured: 1,
      is_3d_enabled: 1,
      model_type: modelType,
      specifications: {
        'موتور هوش مصنوعی': 'Readdy AI Generative Engine v4',
        'کیفیت ساخت': 'پریمیوم درجه یک بین‌المللی',
        'گواهی اصالت': 'تایید شده با شناسه NFT در شاهکار'
      },
      images: [img],
      tags: ['Readdy AI', 'هوش مصنوعی', 'تولید هوشمند', 'شاهکار'],
      created_at: now
    };

    dbProducts.unshift(newProduct);

    return c.json({
      success: true,
      product: {
        ...newProduct,
        final_price_tomans: Math.round((newProduct.base_price_tomans * (100 - newProduct.discount_percent)) / 100)
      },
      message_fa: 'محصول شما با هوش مصنوعی Readdy AI تولید و به کاتالوگ شاهکار اضافه گردید!'
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || 'Readdy AI product generation error' }, 400);
  }
});

app.post('/api/readdy/generate-copy', async (c) => {
  const body = await c.req.json<any>();
  const productName = body.productName || 'محصول لوکس';

  return c.json({
    headline_fa: `تجربه‌ای فراتر از انتظار با ${productName} - طراحی شده برای سخت‌پسندان`,
    headline_en: `Elevate Your Lifestyle with ${productName} - Readdy AI Verified`,
    meta_description_fa: `خرید اینترنتی ${productName} با بهترین قیمت، ضمانت اصالت فیزیکی و ارسال سریع اکسپرس کشوری در بازار شاهکار.`,
    meta_description_en: `Shop authentic ${productName} with guaranteed quality, fast express delivery and multi-vendor support on Shahkar Marketplace.`,
    tags: [productName, 'Readdy AI', 'شاهکار', 'خرید آنلاین', 'لوکس']
  });
});

app.get('/api/readdy/theme-presets', (c) => {
  return c.json([
    { id: 'emerald-neon', name_fa: 'زمردی نئون (اصلی شاهکار)', name_en: 'Emerald Neon', primary: '#2dd4bf', bg: '#05070d', cardBg: 'rgba(20, 30, 50, 0.55)', glowColor: 'rgba(45, 212, 191, 0.35)' },
    { id: 'royal-gold', name_fa: 'طلای سلطنتی دارک', name_en: 'Royal Gold', primary: '#facc15', bg: '#0b0c10', cardBg: 'rgba(35, 30, 15, 0.65)', glowColor: 'rgba(250, 204, 21, 0.35)' },
    { id: 'cyber-violet', name_fa: 'وایولت سایبرپانک', name_en: 'Cyber Violet', primary: '#a855f7', bg: '#0d0714', cardBg: 'rgba(30, 20, 45, 0.6)', glowColor: 'rgba(168, 85, 247, 0.35)' },
    { id: 'slate-minimal', name_fa: 'مینی‌مالیست روز', name_en: 'Minimalist Day', primary: '#0d9488', bg: '#f8fafc', cardBg: '#ffffff', glowColor: 'rgba(13, 148, 136, 0.2)' }
  ]);
});

app.post('/api/ai/chat', async (c) => {
  const body = await c.req.json<any>();
  const msg = (body.message || '').toLowerCase();
  const lang = body.lang || 'fa';

  let replyFa = '';
  let replyEn = '';
  let matched = dbProducts.slice(0, 3);

  if (msg.includes('هدفون') || msg.includes('صدا') || msg.includes('headphone')) {
    matched = dbProducts.filter(p => p.id === 'prd_1');
    replyFa = 'پیشنهاد هوشمند شاهکار برای شما: **هدفون بی‌سیم نویز کنسلینگ هوشمند آریا برو Pro** است. دارای نویز کنسلینگ اکتیو ۵۵ دسی‌بل، درایورهای تیتانیومی و ۶۰ ساعت شارژدهی با تراشه صوتی هوش مصنوعی. قیمت با تخفیف ویژه: ۱۶,۲۸۰,۰۰۰ تومان.';
    replyEn = 'Shahkar AI Recommendation: **Arya Pro Smart Spatial ANC Headphones**. Featuring 55dB active noise canceling, 50mm titanium drivers, and 60h battery life.';
  } else if (msg.includes('ساعت') || msg.includes('طلا') || msg.includes('watch')) {
    matched = dbProducts.filter(p => p.id === 'prd_2');
    replyFa = 'برای علاقه‌مندان به ساعت‌های فاخر، **ساعت توربیون مکانیکی شاهکار کوروش** را پیشنهاد می‌کنم. نسخه محدود با موتور توربیون سوئیسی، کریستال یاقوت کبود و قاب طلا ۱۸ عیار. دارنده گواهی اصالت و NFT کد.';
    replyEn = 'For luxury timepiece enthusiasts, I recommend the **Shahkar Tourbillon Mechanical Watch**. Swiss tourbillon movement, 18K gold casing, and verified NFT authentication.';
  } else {
    replyFa = 'درود! من دستیار هوشمند خریدهای فاخر «شاهکار» هستم. با تحلیل دقیق گزینه‌های برتر بازار مانند هدفون‌های نویزکنسلینگ تیتانیومی، ساعت‌های توربیون طلای ۱۸ عیار، خاویار امپریال و فرش‌های ابریشم قم را برای شما معرفی می‌کنم. چطور می‌توانم راهنماییتان کنم؟';
    replyEn = 'Greetings! I am the Shahkar AI Shopping Advisor. I can assist you with real-time recommendations across all verified luxury marketplace stores.';
  }

  const formattedMatched = matched.map(p => ({
    ...p,
    final_price_tomans: Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100)
  }));

  return c.json({
    reply: lang === 'fa' ? replyFa : replyEn,
    suggestedProducts: formattedMatched
  });
});

app.get('/api/analytics', (c) => {
  return c.json({
    totalProducts: dbProducts.length,
    totalVendors: dbVendors.length,
    totalOrders: dbOrders.length,
    totalRevenueTomans: dbOrders.reduce((sum, o) => sum + o.total_tomans, 0),
    recentLogs: dbAuditLogs,
    fraudAlerts: []
  });
});

app.get('/api/vendor/dashboard', (c) => {
  const vendorId = c.req.query('vendorId') || 'vnd_1';
  const vendor = dbVendors.find(v => v.id === vendorId) || dbVendors[0];
  const products = dbProducts.filter(p => p.vendor_id === vendor.id);

  return c.json({
    vendor,
    productsCount: products.length,
    totalSalesCount: vendor.total_sales,
    balanceTomans: vendor.balance_tomans,
    products,
    settlements: dbSettlements.filter(s => s.vendor_id === vendor.id)
  });
});

app.post('/api/vendor/settlements', async (c) => {
  try {
    const body = await c.req.json<any>();
    const { vendorId = 'vnd_1', amountTomans, iban } = body;

    const vendor = dbVendors.find(v => v.id === vendorId);
    if (!vendor) return c.json({ error: 'Vendor not found' }, 404);

    if (amountTomans > vendor.balance_tomans) {
      return c.json({ error: 'Insufficient balance' }, 400);
    }

    vendor.balance_tomans -= amountTomans;

    const settlement = {
      id: `stl_${Date.now()}`,
      vendor_id: vendorId,
      amount_tomans: amountTomans,
      iban: iban || 'IR980120000000012345678901',
      status: 'completed',
      created_at: Date.now()
    };

    dbSettlements.unshift(settlement);

    return c.json({ success: true, settlement });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || 'Settlement error' }, 400);
  }
});

app.post('/api/vendor/products', async (c) => {
  const body = await c.req.json<any>();
  const { title_fa, title_en, description_fa, base_price_tomans, discount_percent = 0, stock = 20, model_type = 'watch' } = body;

  const newId = `prd_v_${Date.now()}`;
  const newProd: Product = {
    id: newId,
    vendor_id: 'vnd_1',
    category_id: 'cat_elec',
    title_fa: title_fa || 'محصول جدید فروشگاه',
    title_en: title_en || 'New Vendor Product',
    slug: `new-product-${Date.now()}`,
    description_fa: description_fa || 'توضیحات تکمیلی محصول',
    description_en: 'Vendor product description',
    base_price_tomans: Number(base_price_tomans) || 10000000,
    discount_percent: Number(discount_percent) || 0,
    stock: Number(stock) || 1,
    rating: 5.0,
    review_count: 0,
    featured: 0,
    is_3d_enabled: 1,
    model_type,
    specifications: { 'ضمانت': 'اصالت و گارانتی فروشنده' },
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'],
    tags: ['جدید'],
    created_at: Date.now()
  };

  dbProducts.unshift(newProd);
  return c.json({ success: true, productId: newId });
});

// Standard Worker Fetch Handler
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route /api/* requests to Hono with stripped path prefix
    if (url.pathname.includes("/api/")) {
      const apiPath = url.pathname.substring(url.pathname.indexOf("/api/"));
      const newUrl = new URL(apiPath + url.search, url.origin);
      const apiRequest = new Request(newUrl.toString(), request);
      return app.fetch(apiRequest, env, ctx);
    }

    // Serve static assets from public/ via env.ASSETS
    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) {
        return assetRes;
      }
    }

    return app.fetch(request, env, ctx);
  }
};
