import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
    // Use IgnorePlugin to exclude test files and other non-production files
    const webpack = require("webpack");
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream\/test\//,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream\/.*\.(test|spec)\.(js|ts|mjs)$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream\/bench\.js$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream\/LICENSE$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream\/README\.md$/,
      })
    );

    return config;
  },
  // Exclude problematic packages from being processed
  serverExternalPackages: ['thread-stream'],
};

export default nextConfig;
