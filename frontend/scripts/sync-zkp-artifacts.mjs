import fs from 'node:fs';
import path from 'node:path';

const frontendRoot = process.cwd();
const projectRoot = path.resolve(frontendRoot, '..');

const sourceWasm = path.join(projectRoot, 'zkp', 'build', 'simple_proof_js', 'simple_proof.wasm');
const sourceZkey = path.join(projectRoot, 'zkp', 'keys', 'simple_proof.zkey');
const targetDir = path.join(frontendRoot, 'public', 'zkp');

function formatMissing(filePath) {
  return `- Missing: ${path.relative(projectRoot, filePath)}`;
}

function ensureTargetDir() {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

function copyArtifact(sourcePath) {
  const filename = path.basename(sourcePath);
  const targetPath = path.join(targetDir, filename);
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

function main() {
  const missing = [];

  if (!fs.existsSync(sourceWasm)) {
    missing.push(sourceWasm);
  }

  if (!fs.existsSync(sourceZkey)) {
    missing.push(sourceZkey);
  }

  if (missing.length > 0) {
    console.error('❌ Không thể sync ZKP artifacts vì thiếu file:');
    for (const filePath of missing) {
      console.error(formatMissing(filePath));
    }

    console.error('\n👉 Chạy trước các bước sau trong thư mục zkp:');
    console.error('1) npm run compile');
    console.error('2) npm run setup');
    process.exit(1);
  }

  ensureTargetDir();

  const copiedWasm = copyArtifact(sourceWasm);
  const copiedZkey = copyArtifact(sourceZkey);

  console.log('✅ ZKP artifacts đã được sync thành công:');
  console.log(`- ${path.relative(frontendRoot, copiedWasm)}`);
  console.log(`- ${path.relative(frontendRoot, copiedZkey)}`);
}

main();
