/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Metodiky se nahrávají jako PDF přes server akci, a ta má ve výchozím
    // nastavení limit 1 MB. Zvedáme ho, aby prošly i větší soubory.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
