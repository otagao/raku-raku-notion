#!/usr/bin/env node
/**
 * OAuthコールバックファイルをビルドディレクトリにコピーするスクリプト
 * クロスプラットフォーム対応（Windows/Mac/Linux）
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'assets');
const targetDirs = [
  path.join(__dirname, '..', 'build', 'chrome-mv3-dev'),
  path.join(__dirname, '..', 'build', 'chrome-mv3-prod')
];

const filesToCopy = ['oauth-callback.html', 'oauth-callback.js'];

targetDirs.forEach(targetDir => {
  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`Created directory: ${targetDir}`);
  }

  // ファイルをコピー
  filesToCopy.forEach(file => {
    const source = path.join(sourceDir, file);
    const target = path.join(targetDir, file);

    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      console.log(`Copied: ${file} -> ${path.relative(process.cwd(), target)}`);
    } else {
      console.warn(`Warning: Source file not found: ${source}`);
    }
  });
});

console.log('OAuth files copied successfully!');
