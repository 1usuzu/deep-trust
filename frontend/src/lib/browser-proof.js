import * as snarkjs from 'snarkjs';
import { poseidon2 } from 'poseidon-lite/poseidon2';
import { poseidon3 } from 'poseidon-lite/poseidon3';

export class BrowserZKProof {
    constructor() {
        this.wasmPath = '/zkp/simple_proof.wasm';
        this.zkeyPath = '/zkp/simple_proof.zkey';
        this.initialized = false;
    }

    async init() {
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
        if (inputs.length === 2) {
            return poseidon2(inputs);
        }
        if (inputs.length === 3) {
            return poseidon3(inputs);
        }
        throw new Error(`Unsupported Poseidon input length: ${inputs.length}`);
    }

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

        try {
            const input = {
                commitment: commitment.toString(),
                nullifier: nullifier.toString(),
                imageHash: imageHashField.toString(),
                isReal: '1',
                oracleSecret: oracleSecretField.toString(),
                userSecret: userSecretField.toString()
            };

            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                this.wasmPath,
                this.zkeyPath
            );

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
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default BrowserZKProof;
