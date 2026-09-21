/** @type {import('next').NextConfig} */
const nextConfig = {
  // Zajisti, ze soubory katalogu jsou zabaleny do serverless funkce na Vercelu.
  outputFileTracingIncludes: {
    '/api/chat': ['./data/cards/**', './data/index.md', './data/manifest.json'],
  },
};

export default nextConfig;
