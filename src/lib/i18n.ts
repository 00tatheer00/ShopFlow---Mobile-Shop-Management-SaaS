// ============================================
// ShopFlow — Bilingual labels (English + Urdu)
//
// Shopkeepers in Peshawar, Mardan and Kohat often read Urdu more easily than
// English, and many recognise common English shop words (Sale, Cash, Stock).
// Every important label is shown in BOTH, plus an icon and a colour.
// Keep Urdu short and spoken-style (what a shopkeeper would actually say).
// ============================================

export const UR = {
  // Navigation
  home: 'ہوم',
  newSale: 'نئی سیل',
  sales: 'سیل کا ریکارڈ',
  udhaar: 'ادھار کھاتہ',
  customers: 'گاہک',
  products: 'مال / اسٹاک',
  purchases: 'مال کی خریداری',
  suppliers: 'سپلائر / ڈیلر',
  expenses: 'دکان کے خرچے',
  reports: 'حساب کتاب',
  settings: 'سیٹنگ',
  more: 'مزید',
  logout: 'باہر نکلیں',

  // Dashboard
  todaySale: 'آج کی سیل',
  cashInGalla: 'گلے میں نقد',
  online: 'آن لائن رقم',
  totalUdhaar: 'کل ادھار',
  profit: 'منافع',
  netProfit: 'اصل بچت',
  cost: 'مال کی لاگت',
  expense: 'خرچہ',
  lowStock: 'مال ختم ہو رہا ہے',
  recentSales: 'حالیہ سیل',
  quickActions: 'جلدی کام',
  receivePayment: 'ادھار وصولی',
  stockIn: 'مال آیا',
  addExpense: 'خرچہ لکھیں',

  // POS
  search: 'تلاش کریں',
  bill: 'بل',
  cash: 'نقد',
  onlinePay: 'آن لائن',
  credit: 'ادھار',
  discount: 'رعایت',
  total: 'کل رقم',
  received: 'وصول رقم',
  change: 'واپسی',
  remaining: 'باقی ادھار',
  customer: 'گاہک',
  walkIn: 'عام گاہک',
  completeSale: 'سیل مکمل کریں',
  items: 'آئٹم',
  price: 'قیمت',
  quantity: 'تعداد',
  emptyBill: 'بل خالی ہے',
  chooseImei: 'فون کا IMEI چنیں',
  newCustomer: 'نیا گاہک',
} as const;

export type UrKey = keyof typeof UR;
