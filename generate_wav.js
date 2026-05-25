const fs = require('fs');

function createSilentWav(filename, seconds = 1, sampleRate = 44100) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const numFrames = seconds * sampleRate;
    const dataSize = numFrames * blockAlign;
    
    const buffer = Buffer.alloc(44 + dataSize);
    
    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    
    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    
    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Data is already zeroed out (silence) by Buffer.alloc
    
    fs.writeFileSync(filename, buffer);
}

createSilentWav('silent.wav');
console.log('silent.wav generated.');
