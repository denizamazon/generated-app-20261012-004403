import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";

export class App extends DurableObject {
  private app = new Hono();

  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env);
    this.setupRoutes();
  }

  private initDatabase() {
    // Create SQL tables
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        avatar TEXT,
        phone TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        store_name TEXT NOT NULL,
        store_slug TEXT UNIQUE NOT NULL,
        description_fa TEXT,
        description_en TEXT,
        banner_url TEXT,
        logo_url TEXT,
        rating REAL DEFAULT 4.8,
        total_sales INTEGER DEFAULT 0,
        is_verified INTEGER DEFAULT 1,
        commission_rate REAL DEFAULT 0.08,
        balance_tomans INTEGER DEFAULT 0,
        badge TEXT DEFAULT 'Gold Verified Vendor',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name_fa TEXT NOT NULL,
        name_en TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        icon TEXT NOT NULL,
        parent_id TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        title_fa TEXT NOT NULL,
        title_en TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description_fa TEXT,
        description_en TEXT,
        base_price_tomans INTEGER NOT NULL,
        discount_percent INTEGER DEFAULT 0,
        stock INTEGER DEFAULT 50,
        rating REAL DEFAULT 4.9,
        review_count INTEGER DEFAULT 0,
        featured INTEGER DEFAULT 0,
        is_3d_enabled INTEGER DEFAULT 1,
        model_type TEXT DEFAULT 'watch',
        specifications_json TEXT,
        images_json TEXT,
        tags_json TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        title_fa TEXT NOT NULL,
        title_en TEXT NOT NULL,
        sku TEXT NOT NULL,
        price_tomans INTEGER NOT NULL,
        stock INTEGER NOT NULL,
        attributes_json TEXT
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        verified_purchase INTEGER DEFAULT 1,
        vendor_response TEXT,
        images_json TEXT,
        sentiment TEXT DEFAULT 'positive',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        total_tomans INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'paid',
        payment_method TEXT NOT NULL,
        shipping_address_json TEXT NOT NULL,
        tracking_code TEXT NOT NULL,
        idempotency_key TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        vendor_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        variant_id TEXT,
        product_title TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price_tomans INTEGER NOT NULL,
        commission_tomans INTEGER NOT NULL,
        vendor_payout_tomans INTEGER NOT NULL,
        status TEXT DEFAULT 'processing'
      );

      CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        amount_tomans INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        iban TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        details_json TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS fraud_alerts (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        user_id TEXT,
        risk_score INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'flagged',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS coupons (
        code TEXT PRIMARY KEY,
        discount_percent INTEGER NOT NULL,
        max_discount_tomans INTEGER NOT NULL,
        min_order_tomans INTEGER NOT NULL,
        uses_left INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS b2b_quotes (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        product_id TEXT NOT NULL,
        target_quantity INTEGER NOT NULL,
        destination_country TEXT NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vip_memberships (
        user_id TEXT PRIMARY KEY,
        plan_name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        expires_at INTEGER NOT NULL
      );
    `);

    // Check if seeded
    const count = this.ctx.storage.sql.exec(`SELECT COUNT(*) as c FROM products`).one().c as number;
    if (count === 0) {
      this.seedData();
    }
  }

  private seedData() {
    const now = Date.now();

    // Coupons
    this.ctx.storage.sql.exec(`
      INSERT INTO coupons (code, discount_percent, max_discount_tomans, min_order_tomans, uses_left)
      VALUES 
        ('SHAHKAR2026', 15, 5000000, 10000000, 1000),
        ('WELCOME10', 10, 2000000, 5000000, 5000),
        ('NOROOZ', 20, 10000000, 15000000, 250);
    `);

    // Users
    this.ctx.storage.sql.exec(`
      INSERT INTO users (id, name, email, role, avatar, phone, created_at)
      VALUES 
        ('usr_admin', 'Soroush Alavi', 'admin@shahkar.ir', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', '+989121111111', ${now}),
        ('usr_vendor1', 'Kourosh Hakhamanesh', 'kourosh@aryatech.ir', 'vendor', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', '+989122222222', ${now}),
        ('usr_vendor2', 'Fatemeh Tabrizi', 'fatemeh@persiasilk.ir', 'vendor', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', '+989123333333', ${now}),
        ('usr_customer1', 'Navid Rezaei', 'navid@gmail.com', 'customer', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', '+989124444444', ${now});
    `);

    // Vendors
    this.ctx.storage.sql.exec(`
      INSERT INTO vendors (id, user_id, store_name, store_slug, description_fa, description_en, banner_url, logo_url, rating, total_sales, is_verified, commission_rate, balance_tomans, badge, created_at)
      VALUES 
        ('vnd_1', 'usr_vendor1', 'آریا تکنولوژی - Arya Tech Premium', 'arya-tech', 'نمایندگی رسمی عرضه جدیدترین کالاهای دیجیتال و گجت‌های هوشمند هیبریدی در ایران', 'Official flagship store for premium hybrid gadgets, AI wearables, and audio in Iran.', 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80', 4.9, 1420, 1, 0.08, 485000000, 'Gold Diamond Vendor', ${now}),
        ('vnd_2', 'usr_vendor2', 'فرش و ابریشم پارس - Persia Silk & Rugs', 'persia-silk', 'تولیدکننده و صادرکننده اصیل‌ترین فرش‌های دستباف ابریشم قم و تبریز با شناسه اصالت اصالت سنجی بلاک‌چین', 'Master weaver & global exporter of hand-knotted authentic Silk Carpets from Qom & Tabriz.', 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=200&q=80', 5.0, 680, 1, 0.06, 890000000, 'Master Artisan', ${now}),
        ('vnd_3', 'usr_admin', 'ساعت‌های فاخر کوروش - Kourosh Luxury Timepieces', 'kourosh-time', 'گالری تخصصی ساعت‌های مکانیکی لوکس، نسخه محدود و طلا کوب', 'Specialized gallery of luxury tourbillon mechanical watches and limited edition timepieces.', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=200&q=80', 4.95, 310, 1, 0.10, 320000000, 'Official Brand', ${now});
    `);

    // Categories
    this.ctx.storage.sql.exec(`
      INSERT INTO categories (id, name_fa, name_en, slug, icon, parent_id)
      VALUES 
        ('cat_elec', 'دیجیتال و تکنولوژی', 'Electronics & Tech', 'electronics', 'Cpu', NULL),
        ('cat_rugs', 'فرش و صنایع دستی', 'Persian Carpets & Arts', 'carpets-art', 'Sparkles', NULL),
        ('cat_fashion', 'مد و ساعت لوکس', 'Fashion & Luxury', 'fashion-watches', 'Watch', NULL),
        ('cat_home', 'خانه و آشپزخانه هوشمند', 'Smart Home & Living', 'smart-home', 'Home', NULL),
        ('cat_beauty', 'عطر و زیبایی اصیل', 'Perfumes & Beauty', 'beauty', 'Gem', NULL);
    `);

    // Products
    const products = [
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
        specifications_json: JSON.stringify({
          'پردازنده صوتی': 'Arya Neural Sound Chip v2',
          'عمر باتری': '۶۰ ساعت پخش مداوم',
          'اتصال': 'Bluetooth 5.4 + Dual 2.4G Dongle',
          'وزن': '۲۷۵ گرم',
          'ضمانت': '۲۴ ماه گارانتی طلایی آریا'
        }),
        images_json: JSON.stringify([
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'
        ]),
        tags_json: JSON.stringify(['هدفون', 'نویز کنسلینگ', 'دیجیتال', 'گجت', 'Audio', 'Headphones'])
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
        specifications_json: JSON.stringify({
          'موتور': 'Swiss Automatic Tourbillon Caliber 88',
          'جنس بدنه': 'طلا ۱۸ عیار + استیل ۳۱۶L',
          'مقاومت در آب': '100 Meters / 10 ATM',
          'جنس شیشه': 'Sapphire Crystal anti-glare',
          'اصالت': 'گواهی ثبت بین‌المللی همراه شناسه NFT'
        }),
        images_json: JSON.stringify([
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80'
        ]),
        tags_json: JSON.stringify(['ساعت', 'لوکس', 'طلا', 'اکسسوری', 'Watch', 'Luxury'])
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
        specifications_json: JSON.stringify({
          'تراکم': '۱۲۰ رج واقعی',
          'جنس تار و پود': 'ابریشم ۱۰۰٪ طبیعی',
          'ابعاد': '۲۰۰ در ۳۰۰ سانتی‌متر (۶ متر)',
          'نوع رنگ': 'رنگرزی سنتی گیاهی (پوست گردو و روناس)',
          'شناسنامه': 'تاییدیه فدراسیون بین‌المللی فرش'
        }),
        images_json: JSON.stringify([
          'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80'
        ]),
        tags_json: JSON.stringify(['فرش', 'ابریشم', 'صنایع دستی', 'دکوراسیون', 'Rug', 'Silk'])
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
        specifications_json: JSON.stringify({
          'کیفیت تصویر': 'Dual 4K Micro-OLED @ 120Hz',
          'روشنایی': 'up to 3000 nits',
          'پردازنده': 'Snapdragon XR2 Gen 2',
          'سازگاری': 'iOS / Android / Windows / macOS'
        }),
        images_json: JSON.stringify([
          'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80'
        ]),
        tags_json: JSON.stringify(['عینک هوشمند', 'واقعیت افزوده', 'AR', 'Micro-OLED'])
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
        specifications_json: JSON.stringify({
          'فشار پمپ': '19 Bar Italian Ulka Pump',
          'توان': '1650 Watt Dual Thermo-block',
          'مخزن آب': '۲.۴ لیتر معطر',
          'صفحه نمایش': '۵ اینچ OLED لمسی رنگی'
        }),
        images_json: JSON.stringify([
          'https://images.unsplash.com/photo-1517668808822-9a428a248530?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'
        ]),
        tags_json: JSON.stringify(['اسپرسو', 'قهوه ساز', 'آشپزخانه', 'قهوه', 'Espresso'])
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
        specifications_json: JSON.stringify({
          'غلظت': 'Extrait de Parfum (35% Oil)',
          'حجم': '۵۰ میلی‌لیتر',
          'نت‌های اولیه': 'زعفران قائنات، هل سبز، ترنج',
          'نت‌های میانی': 'رز محمدی کاشان، بخور خوشبو',
          'نت‌های پایه': 'عود کهنه، عنبر شاهی، چرم'
        }),
        images_json: JSON.stringify([
          'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80'
        ]),
        tags_json: JSON.stringify(['عطر', 'ادکلن', 'زعفران', 'زیبایی', 'Perfume'])
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
        specifications_json: JSON.stringify({
          'پردازنده': 'Apple A18 Pro 3nm',
          'حافظه داخلی': '۲۵۶ گیگابایت',
          'صفحه نمایش': '۶.۹ اینچ Super Retina XDR 120Hz',
          'گارانتی': '۱۸ ماه گارانتی شرکتی + کد رجیستری همتا'
        }),
        images_json: JSON.stringify([
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'
        ]),
        tags_json: JSON.stringify(['آیفون', 'گوشی', 'موبایل', 'اپل', 'iPhone', 'Apple'])
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
        specifications_json: JSON.stringify({
          'خاویار': '۱۰۰ گرم بلوگا امپریال پرورشی دریای خزر',
          'زعفران': '۵۰ گرم سوپر نگین قائنات',
          'جعبه': 'چوب طبیعی با خاتم‌کاری سنگ و استخوان',
          'ارسال': 'ارسال زنجیره سرد (Cold Chain Courier)'
        }),
        images_json: JSON.stringify([
          'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=800&q=80'
        ]),
        tags_json: JSON.stringify(['خاویار', 'زعفران', 'هدیه', 'لوکس', 'Caviar', 'Saffron'])
      }
    ];

    for (const p of products) {
      this.ctx.storage.sql.exec(`
        INSERT INTO products (id, vendor_id, category_id, title_fa, title_en, slug, description_fa, description_en, base_price_tomans, discount_percent, stock, rating, review_count, featured, is_3d_enabled, model_type, specifications_json, images_json, tags_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, p.id, p.vendor_id, p.category_id, p.title_fa, p.title_en, p.slug, p.description_fa, p.description_en, p.base_price_tomans, p.discount_percent, p.stock, p.rating, p.review_count, p.featured, p.is_3d_enabled, p.model_type, p.specifications_json, p.images_json, p.tags_json, now);

      // Product Variants
      this.ctx.storage.sql.exec(`
        INSERT INTO product_variants (id, product_id, title_fa, title_en, sku, price_tomans, stock, attributes_json)
        VALUES 
          ('${p.id}_v1', '${p.id}', 'مشکی مات / Titanium Black', 'Matte Black / Titanium', 'SKU-${p.id}-BLK', ${p.base_price_tomans}, 20, '{"color":"Black","code":"#18181b"}'),
          ('${p.id}_v2', '${p.id}', 'طلایی رز / Rose Gold', 'Rose Gold Limited', 'SKU-${p.id}-RGLD', ${Math.round(p.base_price_tomans * 1.05)}, 15, '{"color":"Rose Gold","code":"#e2e8f0"}');
      `);

      // Initial Reviews
      this.ctx.storage.sql.exec(`
        INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment, verified_purchase, vendor_response, images_json, sentiment, created_at)
        VALUES 
          ('rev_${p.id}_1', '${p.id}', 'usr_customer1', 'نوید رضایی', 5, 'کیفیت ساخت و طراحی فوق‌العاده است. پشتیبانی فروشنده هم بسیار محترمانه و سریع بود. تفکیک صدای این محصول در سطح محصولات استودیویی گران‌قیمت جهانی قرار داره.', 1, 'با درود و احترام، از حسن اعتماد و دیدگاه ارزشمند شما صمیمانه سپاسگزاریم.', '[]', 'positive', ${now - 86400000 * 3}),
          ('rev_${p.id}_2', '${p.id}', 'usr_admin', 'سروش علوی', 5, 'بسته‌بندی فاخر، تحویل اکسپرس در کمتر از ۴ ساعت در تهران. کاملا با مشخصات درج شده مطابقت داشت.', 1, NULL, '[]', 'positive', ${now - 86400000 * 7});
      `);
    }

    // Initial Orders
    this.ctx.storage.sql.exec(`
      INSERT INTO orders (id, order_number, user_id, total_tomans, status, payment_method, shipping_address_json, tracking_code, idempotency_key, created_at)
      VALUES 
        ('ord_1001', 'SHK-982310', 'usr_customer1', 16280000, 'delivered', 'درگاه پرداخت شتاب (زرین‌پال)', '{"city":"تهران","address":"خیابان ولیعصر، نرسیده به میدان ونک، برج نگار، طبقه ۱۲","postal_code":"1991811111","recipient_name":"نوید رضایی","phone":"09124444444"}', 'TPX-9831092482', 'idemp_982310', ${now - 86400000 * 5});

      INSERT INTO order_items (id, order_id, vendor_id, product_id, variant_id, product_title, quantity, unit_price_tomans, commission_tomans, vendor_payout_tomans, status)
      VALUES 
        ('ori_1', 'ord_1001', 'vnd_1', 'prd_1', 'prd_1_v1', 'هدفون بی‌سیم نویز کنسلینگ هوشمند آریا برو Pro', 1, 16280000, 1302400, 14977600, 'delivered');
    `);

    // Audit logs
    this.ctx.storage.sql.exec(`
      INSERT INTO audit_logs (id, user_id, action, resource, details_json, created_at)
      VALUES 
        ('log_1', 'usr_admin', 'SYSTEM_INIT', 'DATABASE', '{"message":"Shahkar Global Marketplace Database initialized successfully"}', ${now}),
        ('log_2', 'usr_vendor1', 'PRODUCT_CREATE', 'prd_1', '{"title":"هدفون بی‌سیم نویز کنسلینگ هوشمند آریا برو Pro"}', ${now});
    `);
  }

  private setupRoutes() {
    this.app.use("*", async (c, next) => {
      this.initDatabase();
      await next();
    });

    // Helper to log audit
    const logAudit = (userId: string | null, action: string, resource: string, details: object) => {
      try {
        this.ctx.storage.sql.exec(
          `INSERT INTO audit_logs (id, user_id, action, resource, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId,
          action,
          resource,
          JSON.stringify(details),
          Date.now()
        );
      } catch (e) {
        console.error("Audit log error:", e);
      }
    };

    // Health / Status
    this.app.get("/api/health", (c) => {
      return c.json({ status: "ok", system: "Shahkar Commerce Engine", timestamp: new Date().toISOString() });
    });

    this.app.get("/favicon.ico", (c) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="25" fill="#0d9488"/><text x="50" y="65" font-size="55" font-weight="bold" fill="#facc15" text-anchor="middle" font-family="sans-serif">شـ</text></svg>`;
      return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
    });

    // Reset Seed
    this.app.post("/api/seed/reset", (c) => {
      this.ctx.storage.sql.exec(`
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS vendors;
        DROP TABLE IF EXISTS categories;
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS product_variants;
        DROP TABLE IF EXISTS reviews;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS settlements;
        DROP TABLE IF EXISTS audit_logs;
        DROP TABLE IF EXISTS fraud_alerts;
        DROP TABLE IF EXISTS coupons;
      `);
      this.initDatabase();
      return c.json({ success: true, message: "Database re-seeded successfully." });
    });

    // Categories API
    this.app.get("/api/categories", (c) => {
      const rows = this.ctx.storage.sql.exec(`SELECT * FROM categories`).toArray();
      return c.json(rows);
    });

    // Vendors list & detail
    this.app.get("/api/vendors", (c) => {
      const rows = this.ctx.storage.sql.exec(`SELECT * FROM vendors ORDER BY rating DESC`).toArray();
      return c.json(rows);
    });

    this.app.get("/api/vendors/:id", (c) => {
      const id = c.req.param("id");
      const vendorRows = this.ctx.storage.sql.exec(`SELECT * FROM vendors WHERE id = ? OR store_slug = ?`, id, id).toArray();
      if (vendorRows.length === 0) return c.json({ error: "Vendor not found" }, 404);

      const vendor = vendorRows[0];
      const products = this.ctx.storage.sql.exec(`SELECT * FROM products WHERE vendor_id = ?`, vendor.id).toArray();
      return c.json({ ...vendor, products });
    });

    // Products list, filter, search
    this.app.get("/api/products", (c) => {
      const q = c.req.query("q")?.toLowerCase().trim() || "";
      const category = c.req.query("category") || "";
      const vendorId = c.req.query("vendor") || "";
      const featured = c.req.query("featured") === "true";
      const minPrice = parseInt(c.req.query("minPrice") || "0", 10);
      const maxPrice = parseInt(c.req.query("maxPrice") || "9999999999", 10);
      const sort = c.req.query("sort") || "featured"; // featured, price_asc, price_desc, rating, newest

      let sql = `SELECT p.*, v.store_name, v.badge as vendor_badge, c.name_fa as category_name_fa, c.name_en as category_name_en 
                 FROM products p 
                 JOIN vendors v ON p.vendor_id = v.id 
                 JOIN categories c ON p.category_id = c.id 
                 WHERE 1=1`;
      const params: any[] = [];

      if (category) {
        sql += ` AND (p.category_id = ? OR c.slug = ?)`;
        params.push(category, category);
      }

      if (vendorId) {
        sql += ` AND p.vendor_id = ?`;
        params.push(vendorId);
      }

      if (featured) {
        sql += ` AND p.featured = 1`;
      }

      if (minPrice > 0) {
        sql += ` AND (p.base_price_tomans * (100 - p.discount_percent) / 100) >= ?`;
        params.push(minPrice);
      }

      if (maxPrice < 9999999999) {
        sql += ` AND (p.base_price_tomans * (100 - p.discount_percent) / 100) <= ?`;
        params.push(maxPrice);
      }

      if (q) {
        sql += ` AND (LOWER(p.title_fa) LIKE ? OR LOWER(p.title_en) LIKE ? OR LOWER(p.description_fa) LIKE ? OR LOWER(p.tags_json) LIKE ?)`;
        const pattern = `%${q}%`;
        params.push(pattern, pattern, pattern, pattern);
      }

      if (sort === "price_asc") {
        sql += ` ORDER BY (p.base_price_tomans * (100 - p.discount_percent) / 100) ASC`;
      } else if (sort === "price_desc") {
        sql += ` ORDER BY (p.base_price_tomans * (100 - p.discount_percent) / 100) DESC`;
      } else if (sort === "rating") {
        sql += ` ORDER BY p.rating DESC, p.review_count DESC`;
      } else if (sort === "newest") {
        sql += ` ORDER BY p.created_at DESC`;
      } else {
        sql += ` ORDER BY p.featured DESC, p.rating DESC`;
      }

      const rows = this.ctx.storage.sql.exec(sql, ...params).toArray();

      // Format JSON fields
      const formatted = rows.map((r: any) => ({
        ...r,
        specifications: JSON.parse(r.specifications_json || "{}"),
        images: JSON.parse(r.images_json || "[]"),
        tags: JSON.parse(r.tags_json || "[]"),
        final_price_tomans: Math.round((r.base_price_tomans * (100 - r.discount_percent)) / 100)
      }));

      return c.json(formatted);
    });

    // Product detail with variants & reviews
    this.app.get("/api/products/:id", (c) => {
      const id = c.req.param("id");
      const pRows = this.ctx.storage.sql.exec(`
        SELECT p.*, v.store_name, v.store_slug, v.badge as vendor_badge, v.logo_url as vendor_logo, v.rating as vendor_rating,
               c.name_fa as category_name_fa, c.name_en as category_name_en
        FROM products p
        JOIN vendors v ON p.vendor_id = v.id
        JOIN categories c ON p.category_id = c.id
        WHERE p.id = ? OR p.slug = ?
      `, id, id).toArray();

      if (pRows.length === 0) return c.json({ error: "Product not found" }, 404);

      const product: any = pRows[0];
      const variants = this.ctx.storage.sql.exec(`SELECT * FROM product_variants WHERE product_id = ?`, product.id).toArray();
      const reviews = this.ctx.storage.sql.exec(`SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC`, product.id).toArray();

      const formattedVariants = variants.map((v: any) => ({
        ...v,
        attributes: JSON.parse(v.attributes_json || "{}")
      }));

      const formattedReviews = reviews.map((r: any) => ({
        ...r,
        images: JSON.parse(r.images_json || "[]")
      }));

      return c.json({
        ...product,
        specifications: JSON.parse(product.specifications_json || "{}"),
        images: JSON.parse(product.images_json || "[]"),
        tags: JSON.parse(product.tags_json || "[]"),
        final_price_tomans: Math.round((product.base_price_tomans * (100 - product.discount_percent)) / 100),
        variants: formattedVariants,
        reviews: formattedReviews
      });
    });

    // Autocomplete & Fuzzy Search
    this.app.get("/api/search/autocomplete", (c) => {
      const q = c.req.query("q")?.toLowerCase().trim() || "";
      if (!q || q.length < 2) return c.json({ suggestions: [], products: [] });

      // Match products
      const products = this.ctx.storage.sql.exec(`
        SELECT id, title_fa, title_en, base_price_tomans, discount_percent, images_json, slug
        FROM products
        WHERE LOWER(title_fa) LIKE ? OR LOWER(title_en) LIKE ? OR LOWER(tags_json) LIKE ?
        LIMIT 6
      `, `%${q}%`, `%${q}%`, `%${q}%`).toArray().map((p: any) => ({
        ...p,
        images: JSON.parse(p.images_json || "[]"),
        final_price_tomans: Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100)
      }));

      // Synonym mapping
      const synonyms: Record<string, string[]> = {
        'موبایل': ['گوشی', 'ایفون', 'سامسونگ', 'Mobile', 'Phone'],
        'هدفون': ['هندزفری', 'ایرباد', 'Headphones', 'Audio'],
        'ساعت': ['مچ‌بند', 'توربیون', 'Watch'],
        'فرش': ['قالی', 'دستباف', 'ابریشم', 'Carpet', 'Rug']
      };

      let relatedKeywords: string[] = [];
      Object.entries(synonyms).forEach(([key, list]) => {
        if (key.includes(q) || q.includes(key) || list.some(item => item.toLowerCase().includes(q))) {
          relatedKeywords.push(key, ...list);
        }
      });

      return c.json({
        query: q,
        suggestions: Array.from(new Set(relatedKeywords)).slice(0, 5),
        products
      });
    });

    // Cart Calculate Endpoint
    this.app.post("/api/cart/calculate", async (c) => {
      const body = await c.req.json<{ items: { productId: string; variantId?: string; quantity: number }[]; couponCode?: string }>();
      const { items = [], couponCode } = body;

      let subtotalTomans = 0;
      let totalDiscountTomans = 0;
      const vendorGroups: Record<string, { vendorName: string; items: any[]; vendorShippingTomans: number }> = {};

      for (const item of items) {
        const pRows = this.ctx.storage.sql.exec(`
          SELECT p.*, v.store_name
          FROM products p
          JOIN vendors v ON p.vendor_id = v.id
          WHERE p.id = ?
        `, item.productId).toArray();

        if (pRows.length === 0) continue;
        const p: any = pRows[0];

        let itemPrice = Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100);
        let variantName = "";

        if (item.variantId) {
          const vRows = this.ctx.storage.sql.exec(`SELECT * FROM product_variants WHERE id = ?`, item.variantId).toArray();
          if (vRows.length > 0) {
            itemPrice = (vRows[0] as any).price_tomans;
            variantName = (vRows[0] as any).title_fa;
          }
        }

        const lineTotal = itemPrice * item.quantity;
        const originalTotal = p.base_price_tomans * item.quantity;

        subtotalTomans += originalTotal;
        totalDiscountTomans += (originalTotal - lineTotal);

        if (!vendorGroups[p.vendor_id]) {
          vendorGroups[p.vendor_id] = {
            vendorName: p.store_name,
            items: [],
            vendorShippingTomans: 65000 // Standard Tipax/IranPost per vendor
          };
        }

        vendorGroups[p.vendor_id].items.push({
          productId: p.id,
          title_fa: p.title_fa,
          title_en: p.title_en,
          image: JSON.parse(p.images_json || "[]")[0] || "",
          quantity: item.quantity,
          unitPriceTomans: itemPrice,
          lineTotalTomans: lineTotal,
          variantName
        });
      }

      let totalShippingTomans = Object.keys(vendorGroups).length * 65000;
      let couponDiscountTomans = 0;
      let appliedCoupon: any = null;

      if (couponCode) {
        const cRows = this.ctx.storage.sql.exec(`SELECT * FROM coupons WHERE code = ?`, couponCode.toUpperCase().trim()).toArray();
        if (cRows.length > 0) {
          const coup: any = cRows[0];
          const currentTotal = subtotalTomans - totalDiscountTomans;
          if (currentTotal >= coup.min_order_tomans && coup.uses_left > 0) {
            couponDiscountTomans = Math.min(Math.round((currentTotal * coup.discount_percent) / 100), coup.max_discount_tomans);
            appliedCoupon = coup;
          }
        }
      }

      const netSubtotal = subtotalTomans - totalDiscountTomans;
      const vatTaxTomans = Math.round(netSubtotal * 0.10); // 10% regional VAT
      const grandTotalTomans = Math.max(0, netSubtotal - couponDiscountTomans + totalShippingTomans + vatTaxTomans);

      return c.json({
        subtotalTomans,
        itemDiscountTomans: totalDiscountTomans,
        couponDiscountTomans,
        appliedCoupon,
        totalShippingTomans,
        vatTaxTomans,
        grandTotalTomans,
        vendorGroups
      });
    });

    // Checkout Endpoint with Idempotency and Stock Lock
    this.app.post("/api/checkout", async (c) => {
      try {
        const idempotencyKey = c.req.header("X-Idempotency-Key") || `idemp_${Date.now()}`;

        // Check existing order with same idempotency key
        const existing = this.ctx.storage.sql.exec(`SELECT * FROM orders WHERE idempotency_key = ?`, idempotencyKey).toArray();
        if (existing.length > 0) {
          return c.json({ success: true, duplicated: true, order: existing[0] });
        }

        const body = await c.req.json<{
          userId: string;
          items: { productId: string; variantId?: string; quantity: number }[];
          paymentMethod: string;
          shippingAddress: { city: string; address: string; postal_code: string; recipient_name: string; phone: string };
          couponCode?: string;
        }>();

        const { userId = 'usr_customer1', items = [], paymentMethod = 'Zarinpal Shetab Gateway', shippingAddress, couponCode } = body;

        if (items.length === 0) return c.json({ error: "Cart is empty" }, 400);

        const orderId = `ord_${Date.now()}`;
        const orderNumber = `SHK-${Math.floor(100000 + Math.random() * 900000)}`;
        const trackingCode = `TPX-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        const now = Date.now();

        let orderTotal = 0;
        const createdItems: any[] = [];

        // Process items and check/deduct inventory atomically
        this.ctx.storage.transactionSync(() => {
          for (const item of items) {
            const pRows = this.ctx.storage.sql.exec(`SELECT * FROM products WHERE id = ?`, item.productId).toArray();
            if (pRows.length === 0) continue;
            const p: any = pRows[0];

            if (p.stock < item.quantity) {
              throw new Error(`Stock unavailable for product ${p.title_fa}`);
            }

            let unitPrice = Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100);
            if (item.variantId) {
              const vRows = this.ctx.storage.sql.exec(`SELECT * FROM product_variants WHERE id = ?`, item.variantId).toArray();
              if (vRows.length > 0) unitPrice = (vRows[0] as any).price_tomans;
            }

            const lineTotal = unitPrice * item.quantity;
            const commissionRate = 0.08;
            const commission = Math.round(lineTotal * commissionRate);
            const vendorPayout = lineTotal - commission;

            orderTotal += lineTotal;

            // Deduct stock
            this.ctx.storage.sql.exec(`UPDATE products SET stock = stock - ? WHERE id = ?`, item.quantity, p.id);
            this.ctx.storage.sql.exec(`UPDATE vendors SET total_sales = total_sales + 1, balance_tomans = balance_tomans + ? WHERE id = ?`, vendorPayout, p.vendor_id);

            const itemId = `ori_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
            this.ctx.storage.sql.exec(`
              INSERT INTO order_items (id, order_id, vendor_id, product_id, variant_id, product_title, quantity, unit_price_tomans, commission_tomans, vendor_payout_tomans, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')
            `, itemId, orderId, p.vendor_id, p.id, item.variantId || null, p.title_fa, item.quantity, unitPrice, commission, vendorPayout);

            createdItems.push({ id: itemId, product_title: p.title_fa, quantity: item.quantity, unitPrice });
          }

          // Add 10% tax + shipping flat 65000
          const grandTotal = Math.round(orderTotal * 1.10) + 65000;

          // Insert Order
          this.ctx.storage.sql.exec(`
            INSERT INTO orders (id, order_number, user_id, total_tomans, status, payment_method, shipping_address_json, tracking_code, idempotency_key, created_at)
            VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?)
          `, orderId, orderNumber, userId, grandTotal, paymentMethod, JSON.stringify(shippingAddress), trackingCode, idempotencyKey, now);

          // Fraud anomaly check: high velocity or large amount trigger alert
          if (grandTotal > 200000000) {
            this.ctx.storage.sql.exec(`
              INSERT INTO fraud_alerts (id, order_id, user_id, risk_score, reason, status, created_at)
              VALUES (?, ?, ?, 85, 'High value transaction exceeding threshold requiring manual verification', 'flagged', ?)
            `, `frd_${now}`, orderId, userId, now);
          }
        });

        logAudit(userId, "CHECKOUT_SUCCESS", orderId, { orderNumber, total: orderTotal, paymentMethod });

        return c.json({
          success: true,
          order: {
            id: orderId,
            orderNumber,
            trackingCode,
            totalTomans: orderTotal,
            status: "paid",
            items: createdItems,
            created_at: now
          }
        });
      } catch (err: any) {
        console.error("Checkout error:", err);
        return c.json({ success: false, error: err.message || "Checkout failed" }, 400);
      }
    });

    // Orders History & Tracking
    this.app.get("/api/orders", (c) => {
      const userId = c.req.query("userId") || "usr_customer1";
      const rows = this.ctx.storage.sql.exec(`
        SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
      `, userId).toArray();

      const formatted = rows.map((o: any) => {
        const items = this.ctx.storage.sql.exec(`SELECT * FROM order_items WHERE order_id = ?`, o.id).toArray();
        return {
          ...o,
          shipping_address: JSON.parse(o.shipping_address_json || "{}"),
          items
        };
      });

      return c.json(formatted);
    });

    this.app.get("/api/orders/:id", (c) => {
      const id = c.req.param("id");
      const rows = this.ctx.storage.sql.exec(`SELECT * FROM orders WHERE id = ? OR order_number = ?`, id, id).toArray();
      if (rows.length === 0) return c.json({ error: "Order not found" }, 404);

      const order: any = rows[0];
      const items = this.ctx.storage.sql.exec(`SELECT * FROM order_items WHERE order_id = ?`, order.id).toArray();

      return c.json({
        ...order,
        shipping_address: JSON.parse(order.shipping_address_json || "{}"),
        items
      });
    });

    // Submit Review
    this.app.post("/api/reviews", async (c) => {
      const body = await c.req.json<{
        productId: string;
        userId: string;
        userName: string;
        rating: number;
        comment: string;
      }>();

      const { productId, userId = 'usr_customer1', userName = 'کاربر همراه‌', rating, comment } = body;
      const reviewId = `rev_${Date.now()}`;
      const now = Date.now();

      // Simple sentiment classifier
      const positiveWords = ['عالی', 'فوق العاده', 'رضایت', 'خوب', 'پریمیوم', 'عالیه', 'اصیل'];
      let isPositive = positiveWords.some(w => comment.includes(w)) || rating >= 4;

      this.ctx.storage.sql.exec(`
        INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment, verified_purchase, images_json, sentiment, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, '[]', ?, ?)
      `, reviewId, productId, userId, userName, rating, comment, isPositive ? 'positive' : 'neutral', now);

      // Recalculate Product Rating
      const stats = this.ctx.storage.sql.exec(`
        SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE product_id = ?
      `, productId).one() as any;

      this.ctx.storage.sql.exec(`
        UPDATE products SET rating = ?, review_count = ? WHERE id = ?
      `, Math.round((stats.avg_rating || 5) * 10) / 10, stats.cnt || 1, productId);

      return c.json({ success: true, reviewId });
    });

    // Vendor Dashboard Endpoint
    this.app.get("/api/vendor/dashboard", (c) => {
      const vendorId = c.req.query("vendorId") || "vnd_1";
      const vendorRows = this.ctx.storage.sql.exec(`SELECT * FROM vendors WHERE id = ?`, vendorId).toArray();
      if (vendorRows.length === 0) return c.json({ error: "Vendor not found" }, 404);

      const vendor: any = vendorRows[0];
      const products = this.ctx.storage.sql.exec(`SELECT * FROM products WHERE vendor_id = ?`, vendorId).toArray();
      const orderItems = this.ctx.storage.sql.exec(`SELECT * FROM order_items WHERE vendor_id = ? ORDER BY id DESC`, vendorId).toArray();
      const settlements = this.ctx.storage.sql.exec(`SELECT * FROM settlements WHERE vendor_id = ? ORDER BY created_at DESC`, vendorId).toArray();

      return c.json({
        vendor,
        productsCount: products.length,
        totalSalesCount: vendor.total_sales,
        balanceTomans: vendor.balance_tomans,
        recentOrderItems: orderItems,
        products: products.map((p: any) => ({
          ...p,
          specifications: JSON.parse(p.specifications_json || "{}"),
          images: JSON.parse(p.images_json || "[]")
        })),
        settlements
      });
    });

    // Vendor Product Create/Update
    this.app.post("/api/vendor/products", async (c) => {
      const body = await c.req.json<any>();
      const {
        id,
        vendor_id = 'vnd_1',
        category_id = 'cat_elec',
        title_fa,
        title_en,
        description_fa,
        description_en,
        base_price_tomans,
        discount_percent = 0,
        stock = 25,
        model_type = 'watch',
        specifications = {},
        images = []
      } = body;

      const now = Date.now();
      const prodId = id || `prd_v_${Date.now()}`;
      const slug = `${(title_en || 'product').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

      if (id) {
        this.ctx.storage.sql.exec(`
          UPDATE products SET 
            title_fa = ?, title_en = ?, description_fa = ?, description_en = ?,
            base_price_tomans = ?, discount_percent = ?, stock = ?, specifications_json = ?, images_json = ?
          WHERE id = ?
        `, title_fa, title_en, description_fa, description_en, base_price_tomans, discount_percent, stock, JSON.stringify(specifications), JSON.stringify(images), id);
      } else {
        this.ctx.storage.sql.exec(`
          INSERT INTO products (id, vendor_id, category_id, title_fa, title_en, slug, description_fa, description_en, base_price_tomans, discount_percent, stock, rating, review_count, featured, is_3d_enabled, model_type, specifications_json, images_json, tags_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 0, 0, 1, ?, ?, ?, '["کالای جدید"]', ?)
        `, prodId, vendor_id, category_id, title_fa, title_en, slug, description_fa, description_en, base_price_tomans, discount_percent, stock, model_type, JSON.stringify(specifications), JSON.stringify(images), now);
      }

      logAudit("usr_vendor1", id ? "PRODUCT_UPDATE" : "PRODUCT_CREATE", prodId, { title_fa });

      return c.json({ success: true, productId: prodId });
    });

    // Vendor Settlement Request
    this.app.post("/api/vendor/settlements", async (c) => {
      const body = await c.req.json<{ vendorId: string; amountTomans: number; iban: string }>();
      const { vendorId = 'vnd_1', amountTomans, iban } = body;

      const vRows = this.ctx.storage.sql.exec(`SELECT balance_tomans FROM vendors WHERE id = ?`, vendorId).toArray();
      if (vRows.length === 0) return c.json({ error: "Vendor not found" }, 404);

      const currentBalance = (vRows[0] as any).balance_tomans;
      if (amountTomans > currentBalance) {
        return c.json({ error: "Insufficient balance" }, 400);
      }

      const settlementId = `stl_${Date.now()}`;
      const now = Date.now();

      this.ctx.storage.sql.exec(`
        INSERT INTO settlements (id, vendor_id, amount_tomans, status, iban, created_at)
        VALUES (?, ?, ?, 'completed', ?, ?)
      `, settlementId, vendorId, amountTomans, iban, now);

      this.ctx.storage.sql.exec(`
        UPDATE vendors SET balance_tomans = balance_tomans - ? WHERE id = ?
      `, amountTomans, vendorId);

      return c.json({ success: true, settlementId, remainingBalance: currentBalance - amountTomans });
    });

    // AI Conversational Assistant Endpoint
    this.app.post("/api/ai/chat", async (c) => {
      const body = await c.req.json<{ message: string; lang?: string }>();
      const message = body.message.toLowerCase();
      const lang = body.lang || 'fa';

      // Query products for context
      const products = this.ctx.storage.sql.exec(`SELECT p.*, v.store_name FROM products p JOIN vendors v ON p.vendor_id = v.id LIMIT 10`).toArray().map((p: any) => ({
        ...p,
        images: JSON.parse(p.images_json || "[]"),
        final_price_tomans: Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100)
      }));

      let replyFa = "";
      let replyEn = "";
      let matchedProducts: any[] = [];

      if (message.includes("هدفون") || message.includes("headphone") || message.includes("صدا") || message.includes("audio")) {
        matchedProducts = products.filter((p: any) => p.category_id === 'cat_elec' || p.id === 'prd_1');
        replyFa = `پیشنهاد هوشمند شاهکار برای شما: **هدفون بی‌سیم نویز کنسلینگ هوشمند آریا برو Pro** است. دارای نویز کنسلینگ اکتیو ۵۵ دسی‌بل، درایورهای تیتانیومی و ۶۰ ساعت شارژدهی با تراشه صوتی هوش مصنوعی. قیمت با تخفیف ویژه: ۱۶,۲۸۰,۰۰۰ تومان.`;
        replyEn = `Shahkar AI Recommendation: **Arya Pro Smart Spatial ANC Headphones**. Featuring 55dB active noise canceling, 50mm titanium drivers, and 60h battery life. Special discounted price: 16,280,000 Tomans.`;
      } else if (message.includes("ساعت") || message.includes("watch") || message.includes("طلا") || message.includes("لوکس")) {
        matchedProducts = products.filter((p: any) => p.category_id === 'cat_fashion' || p.id === 'prd_2');
        replyFa = `برای علاقه‌مندان به ساعت‌های فاخر، **ساعت توربیون مکانیکی شاهکار کوروش** را پیشنهاد می‌کنم. نسخه محدود با موتور توربیون سوئیسی، کریستال یاقوت کبود و قاب طلا ۱۸ عیار. دارنده گواهی اصالت و NFT کد.`;
        replyEn = `For luxury timepiece enthusiasts, I recommend the **Shahkar Tourbillon Mechanical Watch**. Swiss tourbillon movement, 18K gold casing, sapphire crystal, and verified NFT authentication certificate.`;
      } else if (message.includes("فرش") || message.includes("carpet") || message.includes("rug") || message.includes("ابریشم")) {
        matchedProducts = products.filter((p: any) => p.category_id === 'cat_rugs' || p.id === 'prd_3');
        replyFa = `اصیل‌ترین اثر پیشنهادی ما: **فرش دستباف ابریشم ۱۰۰٪ قم طرح لچک ترنج**. تراکم ۱۲۰ رج واقعی با رنگرزی سنتی گیاهی و شناسه اصالت رسمی فدراسیون فرش ایران.`;
        replyEn = `Our authentic Iranian heritage choice: **100% Qom Pure Silk Hand-Knotted Rug**. 120 Raj knot density with natural botanical dyes and official certificate.`;
      } else if (message.includes("خاویار") || message.includes("زعفران") || message.includes("هدیه")) {
        matchedProducts = products.filter((p: any) => p.id === 'prd_8' || p.id === 'prd_6');
        replyFa = `پیشنهاد شاهانه ما برای هدیه: **پک هدیه فاخر خاویار بلوگا امپریال و زعفران صادراتی قائنات**. شامل ۱۰۰ گرم خاویار اصل بلوگا و ۵۰ گرم زعفران نگین در جعبه چوبی خاتم‌کاری اصفهان.`;
        replyEn = `Our royal gift suggestion: **Imperial Beluga Caviar & Premium Saffron Luxury Gift Box**. Handcrafted Khatam-kari wooden case with cold-chain express delivery.`;
      } else {
        matchedProducts = products.slice(0, 3);
        replyFa = `درود! من دستیار هوشمند خریدهای فاخر «شاهکار» هستم. با تحلیل ده‌ها هزار ثبت سفارش و تاییدیه اصالت، گزینه‌های برتر بازار مانند هدفون‌های نویزکنسلینگ تیتانیومی، ساعت‌های توربیون طلای ۱۸ عیار، خاویار امپریال و فرش‌های ابریشم قم را برای شما معرفی می‌کنم. چطور می‌توانم راهنماییتان کنم؟`;
        replyEn = `Greetings! I am the Shahkar AI Shopping Advisor. I can assist you with real-time price comparisons, authenticity verifications, and tailored luxury product discovery across all verified vendors.`;
      }

      return c.json({
        reply: lang === 'fa' ? replyFa : replyEn,
        suggestedProducts: matchedProducts,
        intent: "product_recommendation"
      });
    });

    // AI Recommendations API
    this.app.get("/api/ai/recommendations", (c) => {
      const rows = this.ctx.storage.sql.exec(`
        SELECT p.*, v.store_name 
        FROM products p 
        JOIN vendors v ON p.vendor_id = v.id 
        ORDER BY p.rating DESC, p.review_count DESC 
        LIMIT 4
      `).toArray().map((p: any) => ({
        ...p,
        images: JSON.parse(p.images_json || "[]"),
        final_price_tomans: Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100)
      }));

      return c.json(rows);
    });

    // System Analytics & Fraud Monitoring
    this.app.get("/api/analytics", (c) => {
      const totalProducts = this.ctx.storage.sql.exec(`SELECT COUNT(*) as c FROM products`).one().c;
      const totalVendors = this.ctx.storage.sql.exec(`SELECT COUNT(*) as c FROM vendors`).one().c;
      const totalOrders = this.ctx.storage.sql.exec(`SELECT COUNT(*) as c FROM orders`).one().c;
      const totalRevenueTomans = this.ctx.storage.sql.exec(`SELECT SUM(total_tomans) as s FROM orders`).one().s || 0;

      const recentLogs = this.ctx.storage.sql.exec(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10`).toArray();
      const fraudAlerts = this.ctx.storage.sql.exec(`SELECT * FROM fraud_alerts ORDER BY created_at DESC LIMIT 5`).toArray();

      return c.json({
        totalProducts,
        totalVendors,
        totalOrders,
        totalRevenueTomans,
        recentLogs: recentLogs.map((l: any) => ({ ...l, details: JSON.parse(l.details_json || "{}") })),
        fraudAlerts
      });
    });

    // Amazon Lightning Flash Deals API
    this.app.get("/api/flash-deals", (c) => {
      const deals = this.ctx.storage.sql.exec(`
        SELECT p.*, v.store_name, v.badge as vendor_badge
        FROM products p
        JOIN vendors v ON p.vendor_id = v.id
        WHERE p.discount_percent >= 10
        ORDER BY p.discount_percent DESC
        LIMIT 4
      `).toArray().map((p: any, idx: number) => ({
        ...p,
        images: JSON.parse(p.images_json || "[]"),
        final_price_tomans: Math.round((p.base_price_tomans * (100 - p.discount_percent)) / 100),
        claimed_percent: 65 + (idx * 8), // Dynamic claimed bar like Amazon Lightning Deals
        stock_remaining: Math.max(2, p.stock - 10),
        ends_in_seconds: 14400 + (idx * 3600) // 4 hours countdown
      }));

      return c.json(deals);
    });

    // Alibaba B2B Wholesale Request for Quote (RFQ)
    this.app.get("/api/b2b/quotes", (c) => {
      const rows = this.ctx.storage.sql.exec(`
        SELECT b.*, p.title_fa as product_title_fa, p.title_en as product_title_en, p.base_price_tomans
        FROM b2b_quotes b
        LEFT JOIN products p ON b.product_id = p.id
        ORDER BY b.created_at DESC
      `).toArray();
      return c.json(rows);
    });

    this.app.post("/api/b2b/quote", async (c) => {
      const body = await c.req.json<{
        companyName: string;
        email: string;
        phone: string;
        productId: string;
        targetQuantity: number;
        destinationCountry: string;
        notes?: string;
      }>();

      const { companyName, email, phone, productId, targetQuantity, destinationCountry, notes } = body;
      const quoteId = `rfq_${Date.now()}`;
      const now = Date.now();

      this.ctx.storage.sql.exec(`
        INSERT INTO b2b_quotes (id, company_name, email, phone, product_id, target_quantity, destination_country, notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `, quoteId, companyName, email, phone, productId, targetQuantity, destinationCountry, notes || '', now);

      logAudit('usr_customer1', 'B2B_RFQ_SUBMITTED', quoteId, { companyName, targetQuantity, destinationCountry });

      return c.json({
        success: true,
        quoteId,
        message_fa: 'استعلام قیمت عمده B2B با موفقیت ثبت شد. تیم بازرگانی بین‌المللی شاهکار ظرف ۲۴ ساعت پیشنهاد قیمتی را صادر خواهد کرد.',
        message_en: 'B2B Wholesale Request for Quote submitted successfully. International trade team will issue quote within 24 hours.'
      });
    });

    this.app.post("/api/b2b/quote/respond", async (c) => {
      const body = await c.req.json<{
        quoteId: string;
        quotedUnitPriceTomans: number;
        estimatedDays: number;
        vendorNote: string;
      }>();

      const { quoteId, quotedUnitPriceTomans, estimatedDays, vendorNote } = body;

      this.ctx.storage.sql.exec(`
        UPDATE b2b_quotes 
        SET status = 'quoted', 
            notes = COALESCE(notes, '') || ' | پاسخ فروشنده: ' || ? || ' (قیمت هر واحد: ' || ? || ' تومان، زمان تحویل: ' || ? || ' روز)'
        WHERE id = ?
      `, vendorNote, quotedUnitPriceTomans, estimatedDays, quoteId);

      logAudit('usr_vendor1', 'B2B_RFQ_QUOTED', quoteId, { quotedUnitPriceTomans, estimatedDays });

      return c.json({ success: true, message: 'پیشنهاد قیمت با موفقیت برای خریدار عمده ارسال گردید.' });
    });

    // Shahkar VIP / Plus Membership API
    this.app.get("/api/vip/status", (c) => {
      const userId = c.req.query("userId") || "usr_customer1";
      const rows = this.ctx.storage.sql.exec(`SELECT * FROM vip_memberships WHERE user_id = ?`, userId).toArray();
      const isVip = rows.length > 0 && (rows[0] as any).is_active === 1;

      return c.json({
        isVip,
        planName: isVip ? (rows[0] as any).plan_name : "Shahkar Plus VIP Free Trial Available",
        expiresAt: isVip ? (rows[0] as any).expires_at : null,
        perks: [
          "ارسال رایگان و بدون محدودیت روی کلیه سفارش‌ها",
          "دسترسی اختصاصی ۳۰ دقیقه زودتر به حراج‌های لحظه‌ای (Flash Deals)",
          "بازگشت ۵٪ از مبلغ خرید به صورت کیف پول نقدی (Cashback)",
          "دستیار VIP هوش مصنوعی با اولویت پاسخگویی اختصاصی"
        ]
      });
    });

    this.app.post("/api/vip/activate", async (c) => {
      const body = await c.req.json<{ userId: string }>();
      const userId = body.userId || "usr_customer1";
      const expiresAt = Date.now() + (365 * 86400000);

      this.ctx.storage.sql.exec(`
        INSERT OR REPLACE INTO vip_memberships (user_id, plan_name, is_active, expires_at)
        VALUES (?, 'Shahkar VIP Gold Membership', 1, ?)
      `, userId, expiresAt);

      logAudit(userId, 'VIP_ACTIVATED', 'SHAHKAR_PLUS', { plan: 'VIP Gold' });

      return c.json({ success: true, isVip: true, planName: 'Shahkar VIP Gold Membership', expiresAt });
    });

    // Real-time Logistics Tracker & Map Nodes
    this.app.get("/api/logistics/track/:code", (c) => {
      const code = c.req.param("code");
      const now = Date.now();

      return c.json({
        trackingCode: code,
        carrier: "Shahkar Express Cold-Chain Logistics",
        estimatedDelivery: new Date(now + 86400000).toLocaleDateString('fa-IR'),
        origin: "مرکز لجستیک فرودگاهی امام خمینی (ره)",
        destination: "تهران - برج نگار ونک",
        currentStatus: "in_transit",
        statusText_fa: "مرسوله در خودروی یخچالی توزیع منطقه‌ای قرار دارد و تا ۳ ساعت دیگر تحویل می‌گردد.",
        statusText_en: "Shipment in climate-controlled delivery vehicle, ETA 3 hours.",
        coordinates: { lat: 35.7575, lng: 51.4099 }, // Vanak Square, Tehran
        timeline: [
          { status: "placed", title_fa: "ثبت سفارش و پرداخت موفق", title_en: "Order Placed", time: "۱۰:۱۵ - دیروز", completed: true },
          { status: "confirmed", title_fa: "بسته‌بندی و صدور بارنامه شاهکار", title_en: "Vendor Packaged & Sealed", time: "۱۴:۳۰ - دیروز", completed: true },
          { status: "in_transit", title_fa: "ورود به مرکز توزیع مکانیزه و حرکت پیک", title_en: "In Express Transit", time: "۰۸:۴۵ - امروز", completed: true, current: true },
          { status: "delivered", title_fa: "تحویل به گیرنده نهایی", title_en: "Final Delivery", time: "تخمین: ۱۶:۰۰ - امروز", completed: false }
        ]
      });
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/favicon.ico") || url.pathname.endsWith("/favicon.svg")) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="25" fill="#0d9488"/><text x="50" y="65" font-size="55" font-weight="bold" fill="#facc15" text-anchor="middle" font-family="sans-serif">شـ</text></svg>`;
      return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
    }
    const apiIndex = url.pathname.indexOf("/api/");
    if (apiIndex !== -1) {
      url.pathname = url.pathname.substring(apiIndex);
      return this.app.fetch(new Request(url.toString(), request));
    }
    if (this.env && (this.env as any).ASSETS) {
      return (this.env as any).ASSETS.fetch(request);
    }
    return this.app.fetch(request);
  }
}


