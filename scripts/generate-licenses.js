/**
 * THIRD_PARTY_LICENSES.md 自動生成スクリプト
 *
 * license-checker-rseidelsohn を使用してライセンス情報を収集し、
 * Markdown形式で出力します。
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..')
const WORKERS_DIR = path.join(ROOT_DIR, 'workers')
const OUTPUT_FILE = path.join(ROOT_DIR, 'THIRD_PARTY_LICENSES.md')

/**
 * license-checker-rseidelsohn を実行してJSON形式でライセンス情報を取得
 */
function getLicenses(dir) {
  const args = ['npx', 'license-checker-rseidelsohn', '--json']

  try {
    const result = execSync(args.join(' '), {
      cwd: dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return JSON.parse(result)
  } catch (error) {
    console.error(`Error running license-checker in ${dir}:`, error.message)
    return {}
  }
}

/**
 * package.json から直接依存関係の名前を取得
 */
function getDirectDependencies(packageJsonPath) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  return {
    dependencies: Object.keys(pkg.dependencies || {}),
    devDependencies: Object.keys(pkg.devDependencies || {}),
  }
}

/**
 * ライセンス情報をフィルタリング（直接依存のみ、重複排除）
 * 同じパッケージ名の複数バージョンがある場合は最新バージョンのみを保持
 */
function filterDirectDependencies(licenses, directDeps) {
  const result = {}
  const seen = new Map() // パッケージ名 -> { fullName, version }

  for (const [fullName, info] of Object.entries(licenses)) {
    // パッケージ名からバージョンを除去 (例: "react@18.3.1" -> "react")
    const atIndex = fullName.lastIndexOf('@')
    const pkgName = atIndex > 0 ? fullName.substring(0, atIndex) : fullName
    const version = atIndex > 0 ? fullName.substring(atIndex + 1) : '0.0.0'

    if (directDeps.includes(pkgName)) {
      // 同じパッケージが既に存在する場合はバージョンを比較
      if (seen.has(pkgName)) {
        const existing = seen.get(pkgName)
        // 新しいバージョンの方が大きい場合は置き換え
        if (compareVersions(version, existing.version) > 0) {
          delete result[existing.fullName]
          seen.set(pkgName, { fullName, version })
          result[fullName] = info
        }
      } else {
        seen.set(pkgName, { fullName, version })
        result[fullName] = info
      }
    }
  }

  return result
}

/**
 * セマンティックバージョンを比較（簡易版）
 * @returns 正の数: v1 > v2, 負の数: v1 < v2, 0: v1 == v2
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(p => parseInt(p, 10) || 0)
  const parts2 = v2.split('.').map(p => parseInt(p, 10) || 0)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 !== p2) return p1 - p2
  }
  return 0
}

/**
 * パッケージ情報をMarkdown形式にフォーマット
 */
function formatPackage(fullName, info) {
  // パッケージ名とバージョンを分離
  const atIndex = fullName.lastIndexOf('@')
  const name = atIndex > 0 ? fullName.substring(0, atIndex) : fullName
  const version = atIndex > 0 ? fullName.substring(atIndex + 1) : 'unknown'

  let md = `### ${name} (${version})\n`
  md += `- License: ${info.licenses || 'Unknown'}\n`

  if (info.repository) {
    md += `- Repository: ${info.repository}\n`
  }

  if (info.publisher) {
    md += `- Copyright (c) ${info.publisher}\n`
  }

  return md
}

/**
 * セクションをMarkdown形式で生成
 */
function formatSection(title, packages) {
  if (Object.keys(packages).length === 0) {
    return ''
  }

  let md = `## ${title}\n\n`

  // パッケージ名でソート
  const sorted = Object.entries(packages).sort(([a], [b]) =>
    a.localeCompare(b)
  )

  for (const [fullName, info] of sorted) {
    md += formatPackage(fullName, info) + '\n'
  }

  return md
}

/**
 * ライセンステキストを生成
 */
function generateLicenseTexts() {
  return `## License Texts

### MIT License

\`\`\`
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
\`\`\`

### Apache License 2.0

\`\`\`
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
\`\`\`
`
}

/**
 * メイン処理
 */
function main() {
  console.log('Generating THIRD_PARTY_LICENSES.md...')

  // メインプロジェクトの直接依存を取得
  const mainPkgPath = path.join(ROOT_DIR, 'package.json')
  const mainDeps = getDirectDependencies(mainPkgPath)

  // メインプロジェクトのライセンス情報を取得
  console.log('Collecting main project licenses...')
  const mainLicenses = getLicenses(ROOT_DIR)

  // 本番依存と開発依存をフィルタリング
  const prodPackages = filterDirectDependencies(mainLicenses, mainDeps.dependencies)
  const devPackages = filterDirectDependencies(mainLicenses, mainDeps.devDependencies)

  // Workersの直接依存を取得（メインプロジェクトと重複するものは除外）
  let workersPackages = {}
  const workersPkgPath = path.join(WORKERS_DIR, 'package.json')

  if (fs.existsSync(workersPkgPath)) {
    console.log('Collecting workers licenses...')
    const workersDeps = getDirectDependencies(workersPkgPath)
    const workersLicenses = getLicenses(WORKERS_DIR)

    // メインプロジェクトに含まれないWorkers固有の依存のみ
    const mainAllDeps = [...mainDeps.dependencies, ...mainDeps.devDependencies]
    const workersOnlyDeps = [
      ...workersDeps.dependencies,
      ...workersDeps.devDependencies,
    ].filter(dep => !mainAllDeps.includes(dep))

    workersPackages = filterDirectDependencies(workersLicenses, workersOnlyDeps)
  }

  // Markdown生成
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  let md = `# Third Party Licenses

This document lists the licenses of third-party dependencies used in this project.

`

  md += formatSection('Direct Dependencies', prodPackages)
  md += formatSection('Development Dependencies', devPackages)
  md += formatSection('Workers Dependencies', workersPackages)
  md += '---\n\n'
  md += generateLicenseTexts()
  md += '\n---\n\n'
  md += `*This file was last updated: ${dateStr}*\n`

  // ファイル出力
  fs.writeFileSync(OUTPUT_FILE, md)
  console.log(`Generated: ${OUTPUT_FILE}`)
}

main()
