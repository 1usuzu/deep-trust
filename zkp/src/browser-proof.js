/**
 * Browser-compatible ZK Proof Generator
 * 
 * Dùng cho Frontend React
 */

import * as snarkjs from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';

// Poseidon hash constants (pre-computed for browser)
// Trong thực tế, cần import từ circomlibjs hoặc compute on-demand

export class BrowserZKProof {
    constructor() {
        this.wasmPath = '/zkp/simple_proof.wasm';
        this.zkeyPath = '/zkp/simple_proof.zkey';
        this.initialized = false;
        this.poseidon = null;
        this.field = null;
    }

    /**
     * Initialize - load WASM và zkey
     */
    async init() {
        // Preload files
        console.log('Loading ZK proving files...');
        if (!this.poseidon) {
            this.poseidon = await buildPoseidon();
            this.field = this.poseidon.F;
        }
        this.initialized = true;
    }

    toField(value) {
        if (typeof value === 'bigint') return value;
        if (typeof value === 'number') return BigInt(value);
        if (typeof value === 'string') {
            if (value.startsWith('0x')) return BigInt(value);
            return BigInt(value);
        }
        throw new Error('Unsupported field value type');
    }

    poseidonToBigInt(inputs) {
        const hashed = this.poseidon(inputs);
        return BigInt(this.field.toString(hashed));
    }

    /**
     * Generate ZK Proof
     * 
     * @param {Object} verificationResult - Kết quả từ AI API
     * @param {string} userSecret - User's secret (stored locally)
     */
    async generateProof(verificationResult, userSecret) {
        if (verificationResult.label !== 'REAL') {
            throw new Error('Chỉ có thể tạo proof cho ảnh REAL');
        }

        if (!this.initialized) {
            await this.init();
        }

        const imageHash = verificationResult.image_hash;
        const oracleSecretHex = verificationResult.oracle_secret;

        if (!imageHash || !oracleSecretHex) {
            throw new Error('Thiếu image_hash hoặc oracle_secret từ backend');
        }

        const imageHashField = this.toField(`0x${imageHash}`);
        const isRealField = 1n;
        const oracleSecretField = this.toField(`0x${oracleSecretHex}`);
        const userSecretField = this.toField(userSecret);

        const nullifier = this.poseidonToBigInt([imageHashField, userSecretField]);
        const oracleCheck = this.poseidonToBigInt([imageHashField, isRealField, oracleSecretField]);
        const commitment = this.poseidonToBigInt([oracleCheck, userSecretField, nullifier]);

        // Trong production, đây là nơi gọi snarkjs.groth16.fullProve
        // Cần WASM file và zkey file được serve từ server

        console.log('Generating ZK proof in browser...');

        try {
            // Circuit inputs
            const input = {
                commitment: commitment.toString(),
                nullifier: nullifier.toString(),
                imageHash: imageHashField.toString(),
                isReal: '1',
                oracleSecret: oracleSecretField.toString(),
                userSecret: userSecretField.toString()
            };

            // Generate proof
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                this.wasmPath,
                this.zkeyPath
            );

            // Format for Solidity
            const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);

            return {
                proof,
                publicSignals,
                calldata,
                commitment: `0x${commitment.toString(16)}`,
                nullifier: `0x${nullifier.toString(16)}`,
                success: true
            };
        } catch (error) {
            console.error('ZK Proof generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Parse calldata for contract call
     */
    parseCalldata(calldata) {
        // calldata format: ["0x...", "0x..."],[[...],[...]],["0x...","0x..."],["0x...","0x..."]
        const regex = /\["(0x[^"]+)","(0x[^"]+)"\],\[\["(0x[^"]+)","(0x[^"]+)"\],\["(0x[^"]+)","(0x[^"]+)"\]\],\["(0x[^"]+)","(0x[^"]+)"\],\["(0x[^"]+)","(0x[^"]+)"\]/;
        const match = calldata.match(regex);
        
        if (!match) {
            throw new Error('Invalid calldata format');
        }

        return {
            pA: [match[1], match[2]],
            pB: [[match[3], match[4]], [match[5], match[6]]],
            pC: [match[7], match[8]],
            pubSignals: [match[9], match[10]]
        };
    }
}

export default BrowserZKProof;
