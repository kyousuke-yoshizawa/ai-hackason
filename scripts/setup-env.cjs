#!/usr/bin/env node

/**
 * 環境変数自動セットアップスクリプト
 *
 * 以下を自動で実行します：
 * 1. .env.example から .env をコピー
 * 2. LINK_TOKEN_SECRET / CRON_SECRET をランダム生成
 * 3. デフォルト値を設定
 * 4. Vercel環境の場合、APP_BASE_URL と CORS_ALLOWED_ORIGINS を自動検出
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ENV_EXAMPLE = path.join(__dirname, '..', '.env.example')
const ENV_FILE = path.join(__dirname, '..', '.env')

function generateSecureSecret() {
  return crypto.randomBytes(32).toString('hex')
}

function readEnvExample() {
  if (!fs.existsSync(ENV_EXAMPLE)) {
    throw new Error(`.env.example が見つかりません: ${ENV_EXAMPLE}`)
  }
  return fs.readFileSync(ENV_EXAMPLE, 'utf-8')
}

function parseEnvFile(content) {
  const env = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^([A-Z_]+)=(.*)$/)
    if (match) {
      env[match[1]] = match[2]
    }
  }

  return env
}

function formatEnvFile(env) {
  let content = ''

  for (const [key, value] of Object.entries(env)) {
    content += `${key}=${value}\n`
  }

  return content
}

function main() {
  console.log('🔧 環境変数セットアップを開始します...\n')

  // .env ファイルが既に存在する場合は警告
  if (fs.existsSync(ENV_FILE)) {
    console.warn(
      '⚠️  .env ファイルが既に存在します。このスクリプトはスキップします。',
    )
    console.warn(`   既存のファイル: ${ENV_FILE}\n`)
    process.exit(0)
  }

  try {
    // 1. .env.example を読み込み
    console.log('📋 .env.example から設定をロード...')
    const exampleContent = readEnvExample()
    const envVars = parseEnvFile(exampleContent)

    // 2. シークレット生成
    console.log('🔐 セキュアなシークレットを生成...')
    const linkTokenSecret = generateSecureSecret()
    const cronSecret = generateSecureSecret()

    envVars.LINK_TOKEN_SECRET = linkTokenSecret
    envVars.CRON_SECRET = cronSecret

    console.log(`   ✅ LINK_TOKEN_SECRET: ${linkTokenSecret.substring(0, 16)}...`)
    console.log(`   ✅ CRON_SECRET: ${cronSecret.substring(0, 16)}...\n`)

    // 3. デフォルト値を設定
    console.log('⚙️  デフォルト値を設定...')

    // ローカル開発用のデフォルト
    if (!envVars.PORT || envVars.PORT === '') {
      envVars.PORT = '3000'
      console.log('   ✅ PORT: 3000')
    }

    if (!envVars.VITE_API_URL || envVars.VITE_API_URL === '') {
      envVars.VITE_API_URL = 'http://localhost:3000'
      console.log('   ✅ VITE_API_URL: http://localhost:3000')
    }

    if (!envVars.EMAIL_FROM_ADDRESS || envVars.EMAIL_FROM_ADDRESS === '') {
      envVars.EMAIL_FROM_ADDRESS = 'notify@ai-hackason.example'
      console.log('   ✅ EMAIL_FROM_ADDRESS: notify@ai-hackason.example')
    }

    if (!envVars.EMAIL_FROM_NAME || envVars.EMAIL_FROM_NAME === '') {
      envVars.EMAIL_FROM_NAME = 'AI Hackathon 混雑通知'
      console.log('   ✅ EMAIL_FROM_NAME: AI Hackathon 混雑通知')
    }

    // 4. Vercel環境の場合、APP_BASE_URL と CORS_ALLOWED_ORIGINS を自動検出
    if (process.env.VERCEL_URL) {
      console.log('\n🚀 Vercel 環境を検出\n')
      const vercelUrl = `https://${process.env.VERCEL_URL}`
      envVars.APP_BASE_URL = vercelUrl
      envVars.CORS_ALLOWED_ORIGINS = vercelUrl
      console.log(`   ✅ APP_BASE_URL: ${vercelUrl}`)
      console.log(`   ✅ CORS_ALLOWED_ORIGINS: ${vercelUrl}`)
    } else {
      // ローカル開発のデフォルト
      if (!envVars.APP_BASE_URL || envVars.APP_BASE_URL === '') {
        envVars.APP_BASE_URL = 'http://localhost:5173'
        console.log(
          '   ✅ APP_BASE_URL: http://localhost:5173 (ローカル開発)',
        )
      }

      if (!envVars.CORS_ALLOWED_ORIGINS || envVars.CORS_ALLOWED_ORIGINS === '') {
        envVars.CORS_ALLOWED_ORIGINS = 'http://localhost:5173'
        console.log(
          '   ✅ CORS_ALLOWED_ORIGINS: http://localhost:5173 (ローカル開発)',
        )
      }
    }

    // 5. .env ファイルに書き込み
    console.log('\n💾 .env ファイルに書き込み...')
    const envContent = formatEnvFile(envVars)
    fs.writeFileSync(ENV_FILE, envContent)
    console.log(`   ✅ ${ENV_FILE} を作成しました\n`)

    // 6. 手動設定が必要な項目を表示
    console.log('📝 以下の項目を手動で設定してください：\n')
    console.log(
      '1. SENDGRID_API_KEY:   https://app.sendgrid.com/settings/api_keys',
    )
    console.log(
      '2. ANTHROPIC_API_KEY:  https://console.anthropic.com/settings/keys',
    )
    console.log('\n✨ セットアップが完了しました！')
    console.log(`   ${ENV_FILE} を編集して上記のキーを追加してください。\n`)
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message)
    process.exit(1)
  }
}

main()
