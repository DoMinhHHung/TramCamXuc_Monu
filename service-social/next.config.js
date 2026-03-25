/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['amqplib', 'minio'],
};

module.exports = nextConfig;
