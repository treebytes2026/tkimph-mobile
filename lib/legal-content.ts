// Shared legal copy for TKimph. Mirrors the web app at
// tkimph-admin/src/lib/legal-content.ts — keep both in sync when editing.
// This is placeholder copy and is not legal advice; replace before launch.

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalSlug = 'terms' | 'privacy' | 'cookies';

export type LegalDocument = {
  slug: LegalSlug;
  title: string;
  summary: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const LEGAL_SLUGS: LegalSlug[] = ['terms', 'privacy', 'cookies'];

const COMPANY = 'TKimph';
const LOCALE = 'Hinoba-an, Negros Occidental, Philippines';
const CONTACT_EMAIL = 'support@tkimph.com';
const LAST_UPDATED = 'May 30, 2026';

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  terms: {
    slug: 'terms',
    title: 'Terms & Conditions',
    summary: `The rules for using the ${COMPANY} food-delivery platform as a customer, partner restaurant, or rider.`,
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: '1. Acceptance of these terms',
        paragraphs: [
          `By creating an account, placing an order, or otherwise using the ${COMPANY} app or website, you agree to these Terms & Conditions. If you do not agree, please do not use the service.`,
          `${COMPANY} is a food-ordering and delivery platform operating in ${LOCALE}. We connect customers with partner restaurants and independent riders.`,
        ],
      },
      {
        heading: '2. Your account',
        paragraphs: [
          'You must provide accurate information when you register and keep your contact and address details up to date so orders can be delivered correctly.',
          'You are responsible for keeping your password secure and for all activity that happens under your account. Tell us right away if you suspect unauthorized use.',
        ],
      },
      {
        heading: '3. Orders and pricing',
        paragraphs: [
          'Menu items, prices, and availability are set by each partner restaurant and may change without notice. Delivery fees and applicable taxes are shown before you confirm an order.',
          'Once a restaurant accepts your order, it is being prepared and generally cannot be cancelled. If an item is unavailable, the restaurant or our support team may offer a substitution or refund.',
        ],
      },
      {
        heading: '4. Payments',
        paragraphs: [
          'You agree to pay the total shown at checkout, including item prices, delivery fees, and any service charges. Cash-on-delivery and supported online payment methods may be available depending on your area.',
          'Refunds, where applicable, are issued to your original payment method or as account credit, at our discretion.',
        ],
      },
      {
        heading: '5. Delivery',
        paragraphs: [
          'Estimated delivery times are approximate and may be affected by weather, traffic, restaurant preparation time, and rider availability.',
          'You must be reachable and provide accurate delivery instructions. If a rider cannot reach you after reasonable attempts, the order may be cancelled without a refund.',
        ],
      },
      {
        heading: '6. Partner and rider responsibilities',
        paragraphs: [
          'Partner restaurants are responsible for food quality, accuracy, packaging, and compliance with food-safety regulations.',
          'Riders are responsible for handling orders carefully and delivering them promptly. Partners and riders agree to additional onboarding terms when they register.',
        ],
      },
      {
        heading: '7. Acceptable use',
        paragraphs: [
          'You agree not to misuse the platform, including submitting false orders, abusing promotions, harassing partners or riders, or attempting to disrupt the service.',
          'We may suspend or close accounts that violate these terms.',
        ],
      },
      {
        heading: '8. Limitation of liability',
        paragraphs: [
          `${COMPANY} provides the platform "as is." To the extent permitted by law, we are not liable for indirect or incidental damages arising from your use of the service.`,
        ],
      },
      {
        heading: '9. Changes and contact',
        paragraphs: [
          'We may update these terms from time to time. Continued use of the service after changes take effect means you accept the updated terms.',
          `Questions? Contact us at ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary: `How ${COMPANY} collects, uses, and protects your personal information.`,
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: '1. Information we collect',
        paragraphs: [
          'Account details you give us, such as your name, email, phone number, and delivery address.',
          'Order information, including the items you buy, your order history, and payment status.',
          'Device and usage data, such as app version, approximate location for delivery, and basic analytics about how you use the service.',
        ],
      },
      {
        heading: '2. How we use your information',
        paragraphs: [
          'To process and deliver your orders, including sharing the necessary details with the partner restaurant and assigned rider.',
          'To provide customer support, send order updates, and keep your account secure.',
          'To improve the platform, prevent fraud, and comply with legal obligations.',
        ],
      },
      {
        heading: '3. Sharing your information',
        paragraphs: [
          'We share order details with partner restaurants and riders only as needed to fulfill your order.',
          'We may share information with payment and technology providers that help us operate the service, and with authorities when required by law.',
          'We do not sell your personal information.',
        ],
      },
      {
        heading: '4. Data retention',
        paragraphs: [
          'We keep your information for as long as your account is active or as needed to provide the service, resolve disputes, and meet legal requirements.',
        ],
      },
      {
        heading: '5. Your rights',
        paragraphs: [
          'You may access, correct, or update your profile information from your account settings at any time.',
          `You may request deletion of your account and associated personal data by contacting ${CONTACT_EMAIL}, subject to records we are required to keep.`,
        ],
      },
      {
        heading: '6. Security',
        paragraphs: [
          'We use reasonable technical and organizational measures to protect your information. No system is completely secure, so we cannot guarantee absolute security.',
        ],
      },
      {
        heading: '7. Contact',
        paragraphs: [
          `If you have questions about this Privacy Policy or your data, contact us at ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  cookies: {
    slug: 'cookies',
    title: 'Cookie Policy',
    summary: `How ${COMPANY} uses cookies and similar technologies on our website and app.`,
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: '1. What are cookies',
        paragraphs: [
          'Cookies are small text files stored on your device when you visit a website. We also use similar technologies such as local storage in our app to remember your session.',
        ],
      },
      {
        heading: '2. How we use them',
        paragraphs: [
          'Essential cookies keep you signed in, remember the items in your cart, and keep the service secure.',
          'Preference cookies remember choices such as your selected address or location.',
          'Analytics cookies help us understand how the platform is used so we can improve it.',
        ],
      },
      {
        heading: '3. Managing cookies',
        paragraphs: [
          'Most browsers let you block or delete cookies through their settings. Blocking essential cookies may stop parts of the service, such as signing in or checking out, from working correctly.',
        ],
      },
      {
        heading: '4. Changes and contact',
        paragraphs: [
          'We may update this Cookie Policy as our use of these technologies evolves.',
          `For questions, contact us at ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
};

export function getLegalDocument(slug?: string): LegalDocument | null {
  if (slug === 'terms' || slug === 'privacy' || slug === 'cookies') {
    return LEGAL_DOCUMENTS[slug];
  }
  return null;
}
