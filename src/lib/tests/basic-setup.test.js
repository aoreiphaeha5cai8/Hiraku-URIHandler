import { describe, it, expect, vi } from 'vitest';

// Basic test to verify our test setup is working
describe('Basic Test Setup', () => {
  it('should have vitest globals available', () => {
    expect(vi).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });
  
  it('should have mocked AudioContext available', () => {
    expect(AudioContext).toBeDefined();
    
    const audioContext = new AudioContext();
    expect(audioContext.createAnalyser).toBeDefined();
    expect(audioContext.createMediaElementSource).toBeDefined();
    expect(audioContext.createDynamicsCompressor).toBeDefined();
  });
  
  it('should create audio nodes successfully', () => {
    const audioContext = new AudioContext();
    
    const analyser = audioContext.createAnalyser();
    const compressor = audioContext.createDynamicsCompressor();
    const source = audioContext.createMediaElementSource();
    
    expect(analyser.connect).toBeDefined();
    expect(compressor.connect).toBeDefined();
    expect(source.connect).toBeDefined();
    
    // Test connection
    source.connect(compressor);
    compressor.connect(analyser);
    
    expect(source.connect).toHaveBeenCalledWith(compressor);
    expect(compressor.connect).toHaveBeenCalledWith(analyser);
  });
  
  it('should have mock helpers available', () => {
    expect(global.createMockAudioElement).toBeDefined();
    expect(global.createMockCanvas).toBeDefined();
    expect(global.createMockFrequencyData).toBeDefined();
    
    const audioElement = global.createMockAudioElement();
    expect(audioElement.play).toBeDefined();
    expect(audioElement.pause).toBeDefined();
    
    const canvas = global.createMockCanvas();
    expect(canvas.getContext).toBeDefined();
    
    const frequencyData = global.createMockFrequencyData(1024);
    expect(frequencyData.length).toBe(1024);
    expect(frequencyData).toBeInstanceOf(Uint8Array);
  });
  
  it('should support compressor parameter testing', () => {
    const audioContext = new AudioContext();
    const compressor = audioContext.createDynamicsCompressor();
    
    // Test parameter setting
    compressor.threshold.value = -20;
    compressor.ratio.value = 8;
    
    expect(compressor.threshold.value).toBe(-20);
    expect(compressor.ratio.value).toBe(8);
    expect(compressor.threshold.setValueAtTime).toBeDefined();
  });
});
