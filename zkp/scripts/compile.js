/**
 * Script: Compile Circom circuits
 * 
 * Biên dịch circuit thành R1CS, WASM, và các file cần thiết
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CIRCUIT_NAME = 'simple_proof';  // Dùng circuit đơn giản trước
const CIRCUITS_DIR = path.join(__dirname, '..', 'circuits');
const BUILD_DIR = path.join(__dirname, '..', 'build');
const PROJECT_ROOT = path.join(__dirname, '..');

function commandExists(command) {
    try {
        execSync(`${command} --help`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function resolveCircomCommand() {
    if (process.env.CIRCOM_BIN) return process.env.CIRCOM_BIN;
    if (commandExists('circom')) return 'circom';
    if (commandExists('circom2')) return 'circom2';
    if (commandExists('npx circom2')) return 'npx circom2';
    return null;
}

async function compile() {
    console.log('🔧 Compiling Circom circuit...\n');
    
    // Tạo build directory
    if (!fs.existsSync(BUILD_DIR)) {
        fs.mkdirSync(BUILD_DIR, { recursive: true });
    }
    
    const circuitPath = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}.circom`);
    
    if (!fs.existsSync(circuitPath)) {
        console.error(`❌ Circuit not found: ${circuitPath}`);
        process.exit(1);
    }
    
    try {
        // Compile với circom
        console.log(`📄 Compiling ${CIRCUIT_NAME}.circom...`);

        const circomCommand = resolveCircomCommand();
        if (!circomCommand) {
            throw new Error('Circom compiler not found');
        }
        console.log(`🧩 Using compiler: ${circomCommand}`);
        
        const circuitRelativePath = path.join('circuits', `${CIRCUIT_NAME}.circom`);
        const outputRelativePath = 'build';
        const cmd = `${circomCommand} "${circuitRelativePath}" --r1cs --wasm --sym -o "${outputRelativePath}"`;
        console.log(`> ${cmd}\n`);
        
        execSync(cmd, { stdio: 'inherit', cwd: PROJECT_ROOT });
        
        console.log('\n✅ Compilation successful!');
        console.log('\nGenerated files:');
        console.log(`  - ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs (constraints)`);
        console.log(`  - ${BUILD_DIR}/${CIRCUIT_NAME}_js/ (WASM for JS)`);
        console.log(`  - ${BUILD_DIR}/${CIRCUIT_NAME}.sym (debug symbols)`);
        
    } catch (error) {
        console.error('❌ Compilation failed:', error.message);
        console.log('\n💡 Make sure circom is installed (one of these):');
        console.log('   npm install -g circom2');
        console.log('   Or: cargo install --git https://github.com/iden3/circom.git');
        process.exit(1);
    }
}

compile();
