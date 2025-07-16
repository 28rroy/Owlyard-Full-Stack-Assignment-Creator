import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_GATEWAY_URL: 'https://056a739mb1.execute-api.us-east-2.amazonaws.com/Prod'
  }
}

export default nextConfig