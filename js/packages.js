/**
 * Authoritative Package Catalogue & Pricing Engine
 * Brand: Asnat Khan Studio
 * 
 * Single source of truth for packages, add-ons, pricing, and validation.
 * Used by Services, Order Details, Checkout, and Server-side endpoints.
 */

export const PACKAGES = {
  basic: {
    id: 'basic',
    name: 'Basic',
    tier: 'STARTER TIER',
    price: 50,
    currency: 'USD',
    description: 'A complete basic business website.',
    pages: 'Up to 5 pages',
    hasPayment: false,
    hasEcommerce: false,
    includedProducts: 0,
    additionalProductPrice: 0,
    domainRule: 'You provide the domain name you want to use. Free hosting is included with your website package. We can help with domain setup and connection.',
    inclusions: [
      'Up to 5 pages',
      'Content',
      'Images',
      'Frontend development',
      'Backend development',
      'Speed optimization',
      'SEO',
      'Domain setup assistance',
      'Free hosting'
    ]
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    tier: 'RECOMMENDED CHOICE',
    isRecommended: true,
    price: 100,
    currency: 'USD',
    description: 'A business website that needs payment functionality.',
    pages: 'Up to 7 pages',
    hasPayment: true,
    hasEcommerce: false,
    includedProducts: 0,
    additionalProductPrice: 0,
    domainRule: 'You provide the domain name you want to use. Free hosting is included with your website package. We can help with domain setup and connection.',
    inclusions: [
      'Up to 7 pages',
      'Everything included in Basic',
      'Payment functionality',
      'Content & images',
      'Frontend & backend development',
      'Speed optimization & SEO',
      'Domain setup assistance',
      'Free hosting'
    ]
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce',
    tier: 'ONLINE STORE',
    price: 200,
    currency: 'USD',
    description: 'An e-commerce website for selling products online.',
    pages: 'Up to 8 pages',
    hasPayment: true,
    hasEcommerce: true,
    includedProducts: 10,
    additionalProductPrice: 1, // $1 per additional product
    domainRule: 'You provide the domain name you want to use. Free hosting is included with your website package. We can help with domain setup and connection.',
    inclusions: [
      'Up to 8 pages',
      'Everything included in Basic',
      'Payment functionality',
      '10 e-commerce products',
      'Content & images',
      'Speed optimization & SEO',
      'Domain setup assistance',
      'Free hosting'
    ]
  }
};

export const ADDITIONAL_SERVICES = {
  pitchdeck: {
    id: 'pitchdeck',
    name: 'Pitch Deck Design',
    price: 50,
    currency: 'USD',
    unit: 'project',
    unitLabel: 'Up to 20 pages/slides',
    description: 'A professionally designed pitch deck for presenting your business, idea or opportunity clearly and confidently.',
    inclusions: 'Up to 20 pages/slides'
  },
  writing: {
    id: 'writing',
    name: 'Article Writing',
    price: 10, // $10 per 1,000 words
    currency: 'USD',
    unit: '1000_words',
    unitWords: 1000,
    unitPrice: 10,
    unitLabel: 'per 1,000 words',
    description: 'Clear, useful written content designed to communicate ideas naturally and keep readers engaged.',
    inclusions: 'Polished editorial copy tailored to your audience'
  }
};

export const DOMAIN_HOSTING_NOTE = {
  title: 'Domain & Hosting',
  statement: 'You provide the domain name you want to use. Free hosting is included with your website package. We can help with domain setup and connection.',
  fullClarification: 'The client provides or purchases their own domain name. Free hosting is included with the website package. We can help with domain setup and connection.'
};

/**
 * Authoritative Server & Client Order Calculation Function
 * Computes verified line items, subtotal, and total amount.
 * 
 * @param {Object} params
 * @param {string} params.packageId - 'basic' | 'standard' | 'ecommerce' | 'pitchdeck' | 'writing'
 * @param {number} [params.additionalProducts=0] - Extra products count (E-Commerce only)
 * @param {Array<Object>} [params.additionalServices=[]] - [{ id: 'pitchdeck' }, { id: 'writing', units: 1, words: 1000 }]
 * @returns {Object} Verified pricing breakdown
 */
export function calculateOrderPricing({
  packageId = 'basic',
  additionalProducts = 0,
  additionalServices = []
}) {
  const lineItems = [];
  let subtotal = 0;
  const normalizedPkgId = (packageId || '').toLowerCase().trim();

  let selectedPackage = PACKAGES[normalizedPkgId];
  let isStandaloneAddon = false;

  // Handle case where user chooses standalone Pitch Deck or Writing as the primary package
  if (!selectedPackage && ADDITIONAL_SERVICES[normalizedPkgId]) {
    const standalone = ADDITIONAL_SERVICES[normalizedPkgId];
    isStandaloneAddon = true;
    selectedPackage = {
      id: standalone.id,
      name: standalone.name,
      tier: 'STANDALONE SERVICE',
      price: standalone.price,
      currency: 'USD',
      description: standalone.description,
      pages: standalone.inclusions,
      hasPayment: false,
      hasEcommerce: false,
      includedProducts: 0,
      additionalProductPrice: 0,
      domainRule: 'Domain and hosting are not required for standalone design/writing services.',
      inclusions: [standalone.inclusions]
    };
  }

  if (!selectedPackage) {
    // Default fallback to basic if unrecognized
    selectedPackage = PACKAGES.basic;
  }

  // 1. Primary Package line item
  lineItems.push({
    type: 'package',
    id: selectedPackage.id,
    name: selectedPackage.name,
    description: selectedPackage.description,
    unitPrice: selectedPackage.price,
    quantity: 1,
    amount: selectedPackage.price
  });
  subtotal += selectedPackage.price;

  // 2. E-Commerce Additional Products (only if package is ecommerce)
  let validAdditionalProducts = 0;
  let additionalProductsCost = 0;

  if (selectedPackage.id === 'ecommerce') {
    const qty = parseInt(additionalProducts, 10);
    if (!isNaN(qty) && qty > 0) {
      validAdditionalProducts = Math.max(0, Math.min(qty, 10000)); // sane max limit
      additionalProductsCost = validAdditionalProducts * 1; // $1 each
      if (additionalProductsCost > 0) {
        lineItems.push({
          type: 'addon_products',
          id: 'ecommerce_extra_products',
          name: 'Additional E-Commerce Products',
          description: `${validAdditionalProducts} additional products ($1.00 each, first 10 included)`,
          unitPrice: 1,
          quantity: validAdditionalProducts,
          amount: additionalProductsCost
        });
        subtotal += additionalProductsCost;
      }
    }
  }

  // 3. Additional Services (Pitch Deck, Article Writing)
  const normalizedServices = [];
  const processedServiceIds = new Set();

  if (Array.isArray(additionalServices)) {
    for (const service of additionalServices) {
      const sId = (typeof service === 'string' ? service : service?.id || '').toLowerCase().trim();
      if (!sId || processedServiceIds.has(sId) || sId === selectedPackage.id) {
        continue; // prevent accidental duplicates or re-adding primary package
      }

      if (sId === 'pitchdeck') {
        const item = ADDITIONAL_SERVICES.pitchdeck;
        processedServiceIds.add('pitchdeck');
        normalizedServices.push({
          id: 'pitchdeck',
          name: item.name,
          unitLabel: item.unitLabel,
          amount: item.price
        });
        lineItems.push({
          type: 'addon_service',
          id: 'pitchdeck',
          name: item.name,
          description: item.unitLabel,
          unitPrice: item.price,
          quantity: 1,
          amount: item.price
        });
        subtotal += item.price;
      } else if (sId === 'writing') {
        const item = ADDITIONAL_SERVICES.writing;
        processedServiceIds.add('writing');
        // Word count or units: 1 unit = 1,000 words = $10
        let units = 1;
        if (typeof service === 'object' && service !== null) {
          if (service.units && Number(service.units) > 0) {
            units = Math.max(1, Math.round(Number(service.units)));
          } else if (service.words && Number(service.words) > 0) {
            units = Math.max(1, Math.ceil(Number(service.words) / 1000));
          }
        }
        const writingCost = units * item.unitPrice;
        normalizedServices.push({
          id: 'writing',
          name: item.name,
          units: units,
          words: units * 1000,
          unitLabel: `${(units * 1000).toLocaleString()} words (${units} x 1,000-word units)`,
          amount: writingCost
        });
        lineItems.push({
          type: 'addon_service',
          id: 'writing',
          name: item.name,
          description: `${(units * 1000).toLocaleString()} words (${units} x 1,000 words at $10/unit)`,
          unitPrice: item.unitPrice,
          quantity: units,
          amount: writingCost
        });
        subtotal += writingCost;
      }
    }
  }

  // 4. Taxes & Fees
  // Per specification: Do not invent taxes, fees, or discounts.
  const taxAmount = 0;
  const totalAmount = subtotal + taxAmount;

  return {
    package: selectedPackage,
    isStandaloneAddon,
    additionalProducts: validAdditionalProducts,
    additionalProductsCost,
    additionalServices: normalizedServices,
    lineItems,
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    currency: 'USD',
    domainNote: DOMAIN_HOSTING_NOTE
  };
}

// Global browser script exposure
if (typeof window !== 'undefined') {
  window.ASNAT_CATALOGUE = {
    PACKAGES,
    ADDITIONAL_SERVICES,
    DOMAIN_HOSTING_NOTE,
    calculateOrderPricing
  };
}
