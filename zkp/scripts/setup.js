/**
 * Script: Trusted Setup (Powers of Tau + Phase 2)
 * 
 * Tạo proving key và verification key
 * CHÚ Ý: Trong production, cần ceremony với nhiều participants!
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CIRCUIT_NAME = 'simple_proof';
const BUILD_DIR = path.join(__dirname, '..', 'build');
const KEYS_DIR = path.join(__dirname, '..', 'keys');

async function setup() {
    console.log('🔐 Starting Trusted Setup...\n');
    
    // Tạo keys directory
    if (!fs.existsSync(KEYS_DIR)) {
        fs.mkdirSync(KEYS_DIR, { recursive: true });
    }
    
    const r1csPath = path.join(BUILD_DIR, `${CIRCUIT_NAME}.r1cs`);
    
    if (!fs.existsSync(r1csPath)) {
        console.error('❌ R1CS file not found. Run compile first!');
        console.log('   npm run compile');
        process.exit(1);
    }
    
    try {
        // ===== PHASE 1: Powers of Tau =====
        console.log('📜 Phase 1: Powers of Tau ceremony...');
        
        const ptauPath = path.join(KEYS_DIR, 'pot12_final.ptau');
        
        // Kiểm tra nếu đã có ptau file (có thể download sẵn)
        if (!fs.existsSync(ptauPath)) {
            console.log('   Generating new Powers of Tau (this may take a while)...');
            const pot0000 = path.join(KEYS_DIR, 'pot12_0000.ptau');
            const pot0001 = path.join(KEYS_DIR, 'pot12_0001.ptau');
            
            execSync(`npx snarkjs powersoftau new bn128 12 "${pot0000}" -v`, { stdio: 'inherit' });
            
            execSync(
                `npx snarkjs powersoftau contribute "${pot0000}" "${pot0001}" --name="First contribution" -v -e="random-entropy-${Date.now()}"`,
                { stdio: 'inherit' }
            );
            
            execSync(`npx snarkjs powersoftau prepare phase2 "${pot0001}" "${ptauPath}" -v`, { stdio: 'inherit' });
            
            // Cleanup intermediate files
            if (fs.existsSync(pot0000)) fs.unlinkSync(pot0000);
            if (fs.existsSync(pot0001)) fs.unlinkSync(pot0001);
            
            console.log('   ✅ Powers of Tau completed\n');
        } else {
            console.log('   ✅ Using existing Powers of Tau file\n');
        }
        
        // ===== PHASE 2: Circuit-specific setup =====
        console.log('📜 Phase 2: Circuit-specific setup...');
        
        const zkeyPath = path.join(KEYS_DIR, `${CIRCUIT_NAME}.zkey`);
        const vkeyPath = path.join(KEYS_DIR, `${CIRCUIT_NAME}_verification_key.json`);
        const zkey0000 = path.join(KEYS_DIR, `${CIRCUIT_NAME}_0000.zkey`);
        
        execSync(`npx snarkjs groth16 setup "${r1csPath}" "${ptauPath}" "${zkey0000}"`, { stdio: 'inherit' });
        
        execSync(
            `npx snarkjs zkey contribute "${zkey0000}" "${zkeyPath}" --name="Deepfake Verification Contribution" -v -e="entropy-${Math.random().toString(36)}"`,
            { stdio: 'inherit' }
        );
        
        // Cleanup
        if (fs.existsSync(zkey0000)) fs.unlinkSync(zkey0000);
        
        console.log('   ✅ Proving key generated\n');
        
        // Export verification key
        console.log('📤 Exporting verification key...');
        execSync(`npx snarkjs zkey export verificationkey "${zkeyPath}" "${vkeyPath}"`, { stdio: 'inherit' });
        
        console.log('\n✅ Trusted Setup completed!');
        console.log('\nGenerated files:');
        console.log(`  - ${zkeyPath} (proving key - KEEP SECRET)`);
        console.log(`  - ${vkeyPath} (verification key - PUBLIC)`);
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

setup();
