export interface AppVersionInfo {
  version: string;
  buildId: string;
  releaseDate: string;
  title: string;
  highlights: string[];
  urgent?: boolean;
}

// Current Production Release Version of ShopFlow
export const CURRENT_APP_VERSION: AppVersionInfo = {
  version: '1.2.0',
  buildId: '20261006-fbr-perf-v1',
  releaseDate: '2026-10-06',
  title: 'FBR POS Invoices, Universal CSV & High-Speed Performance',
  highlights: [
    'Official FBR POS Invoices with TaxAsaan QR Code verification',
    'Clutter-free Thermal Slip & A4 print layouts',
    'Instant Reports printing with high-contrast ledger styling',
    'Universal CSV Exports across all reports, inventory & khata',
    'Sub-second ultra-fast page transitions & query parallelization',
  ],
  urgent: false,
};
