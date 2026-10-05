# ShopFlow — Phase 3 Future Notes & Post-MVP Roadmap

This document catalogs non-MVP and extended feature candidates identified during the Phase 3 UI/UX Design System audit and implementation. As per project constraints, these features are explicitly deferred to subsequent phases to maintain architectural integrity, avoid scope bloat, and prioritize core shopkeeper usability.

---

## 1. Hardware & Scanner Integration (Phase 4+)
- **Integrated Camera Barcode/QR Scanner**: Browser-based camera scanner (HTML5 / WebRTC `BarcodeDetector` API) for instant SKU and IMEI scanning without requiring dedicated USB/Bluetooth hardware.
- **USB / Bluetooth POS Handheld Scanner Auto-focus**: Background keypress listener that captures raw 1D/2D HID barcode inputs and auto-injects them into the POS cart without requiring the search input to be focused.
- **ESC/POS Direct Thermal Printing**: Direct network (LAN/WiFi/Bluetooth) thermal printer integration via raw ESC/POS commands bypassing OS print dialogs for high-volume retail checkout counters.

---

## 2. Customer Engagement & Communication
- **WhatsApp Cloud API Integration**: Automated transactional WhatsApp messages (official Meta Cloud API) for digital e-receipt delivery, udhaar recovery reminders with payment link, and warranty registration.
- **Automated SMS Gateway (Pakistani Telcos)**: Integration with local SMS aggregators (e.g., Jazz, Telenor, Zong, BrandSMS) for SMS receipts and one-time verification passwords.

---

## 3. Financial & Payment Gateways
- **Online Payment QR Integration**: Real-time Raast / 1Link dynamic QR generation for contactless instant bank transfer settlement at POS counters.
- **Automated Digital Wallet Webhooks**: Direct JazzCash Merchant and EasyPaisa Open API webhook verification for real-time payment confirmation without manual cash drawer reconciliation.

---

## 4. Multi-Branch & Advanced Operations
- **Multi-Branch Inventory Transfers (B2B)**: Inter-branch stock transfer requests, in-transit state management, and multi-location IMEI assignment for multi-outlet retailers across Peshawar, Mardan, and Rawalpindi.
- **Staff Shift & Cash Drawer Reconciliation**: Shift opening and closing balances, cash drop management, and cashier variance reports.
- **Payroll & Commission Tracking**: Sales staff commission tiers per handset sold and monthly salary deduction/advance tracking.

---

## 5. Security & Mobile Offline Mode
- **Progressive Web App (PWA) Offline POS Queue**: Local IndexedDB offline cart with background sync upon internet reconnectivity for areas with unstable internet connectivity.
- **Biometric WebAuthn Login**: Fingerprint / Face ID authentication on mobile browser sessions for quick cashier switching.
