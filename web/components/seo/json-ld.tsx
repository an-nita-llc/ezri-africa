export function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Ezri Africa",
    "alternateName": "Ezri Africa Remittance",
    "url": "https://ezri-africa.com",
    "logo": "https://ezri-africa.com/icon.svg",
    "description": "Pan-African purpose-locked remittance platform. Collects foreign PayPal payments abroad and disburses local mobile money & bank wires across 15 African nations.",
    "foundingLocation": "Monrovia, Liberia",
    "parentOrganization": {
      "@type": "Organization",
      "name": "Annita LLC"
    },
    "areaServed": [
      "Liberia", "Ghana", "Nigeria", "Senegal", "Kenya",
      "South Africa", "Côte d'Ivoire", "Tanzania", "Uganda",
      "Rwanda", "Ethiopia", "Egypt", "Zimbabwe", "Sierra Leone", "Gambia"
    ],
    "sameAs": [
      "https://github.com/an-nita-llc/ezri-africa",
      "https://ezri-africa.com"
    ]
  };

  const financialProductSchema = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "name": "Ezri Purpose-Locked Escrow & Remittance",
    "provider": {
      "@type": "Organization",
      "name": "Ezri Africa"
    },
    "description": "Cross-border remittance payment service with AI purpose lock and prove-first receipt verification before local mobile money disburse.",
    "feesAndCommissionsSpecification": "2% flat platform fee on transfers",
    "currencyAccepted": "USD, LRD, GHS, NGN, XOF, KES, ZAR, TZS, UGX, RWF, ETB, EGP, ZIG, SLE, GMD",
    "areaServed": "Africa & Global Diaspora"
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Ezri Africa Web App",
    "operatingSystem": "iOS, Android, Windows, macOS, Web",
    "applicationCategory": "FinanceApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(financialProductSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
    </>
  );
}
