#!/usr/bin/env node

/**
 * 環境変数チェックスクリプト
 * ビルド前に必須の環境変数が設定されているか確認
 */

const fs = require('fs');
const path = require('path');

// 必須の環境変数
// 注: CLIENT_SECRETは削除（Cloudflare Workersで管理）
const REQUIRED_ENV_VARS = [
  'PLASMO_PUBLIC_NOTION_CLIENT_ID',
  'PLASMO_PUBLIC_OAUTH_REDIRECT_URI'
];

// .envファイルのパス
const envPath = path.join(__dirname, '..', '.env');

// .envファイルの存在確認
if (!fs.existsSync(envPath)) {
  console.error('\n❌ ERROR: .env file not found!');
  console.error('   Please create a .env file based on .env.example\n');
  process.exit(1);
}

// .envファイルを読み込む
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

// 環境変数をパース
const envVars = {};
envLines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// 必須環境変数のチェック
let hasError = false;
console.log('\n🔍 Checking required environment variables...\n');

REQUIRED_ENV_VARS.forEach(varName => {
  const value = envVars[varName];
  if (!value || value === '') {
    console.error(`   ❌ ${varName}: MISSING`);
    hasError = true;
  } else {
    // 値の一部のみを表示（セキュリティのため）
    const displayValue = value.length > 20
      ? `${value.substring(0, 15)}...`
      : value;
    console.log(`   ✅ ${varName}: ${displayValue}`);
  }
});

console.log('');

if (hasError) {
  console.error('❌ Build aborted: Missing required environment variables\n');
  console.error('   Please check your .env file and ensure all required variables are set.\n');
  process.exit(1);
}

console.log('✅ All required environment variables are set!\n');
process.exit(0);
