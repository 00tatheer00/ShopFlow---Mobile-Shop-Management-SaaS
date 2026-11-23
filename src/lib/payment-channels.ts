// ShopFlow subscription payment details — single source of truth.
// Safe to import from both server and client components.
export const SHOPFLOW_PAYMENT_CHANNELS = {
  bankName: 'Meezan Bank Ltd',
  accountTitle: 'Syed Muhammad SAqlain',
  accountNumber: '03143176526',
  iban: 'PK49MEZN0002890108392101',
  walletNumber: '03143176526',
  easyPaisa: '03143176526 (Syed Muhammad SAqlain)',
  jazzCash: '03143176526 (Syed Muhammad SAqlain)',
  whatsapp: '03143176526',
  monthlyFee: 'Rs. 8,000 / month',
} as const;
