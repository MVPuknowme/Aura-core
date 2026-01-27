import numpy as np
import matplotlib.pyplot as plt
from collections import deque

# Set parameters
SAMPLE_RATE = 56888  # Hz
DURATION = 5  # seconds
TARGET_FREQ_MIN = 510  # Hz
TARGET_FREQ_MAX = 520  # Hz
THRESHOLD = 20
BLOCKSIZE = 1024

# Generate synthetic test signals
def generate_audio(duration, sample_rate, frequencies):
    """Generate audio with specified frequencies"""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    signal = np.zeros_like(t)
    
    for freq in frequencies:
        signal += 0.5 * np.sin(2 * np.pi * freq * t)
    
    return signal

def detect_frequency(audio_data, sample_rate, freq_min, freq_max, threshold):
    """Detect if target frequency band exceeds threshold"""
    fft_data = np.abs(np.fft.rfft(audio_data))
    freqs = np.fft.rfftfreq(len(audio_data), 1 / sample_rate)
    
    band_indices = np.where((freqs >= freq_min) & (freqs <= freq_max))[0]
    
    if len(band_indices) > 0:
        band_power = np.mean(fft_data[band_indices])
        return band_power, band_power > threshold
    
    return 0, False

# Main execution
print("Frequency Detection (Synthetic Infrastructure)")
print(f"Target: {TARGET_FREQ_MIN}–{TARGET_FREQ_MAX} Hz")
print(f"Sample Rate: {SAMPLE_RATE} Hz")
print("-" * 50)

# Test Case 1: Signal with target frequency
print("\n[Test 1] Generating signal WITH 515 Hz...")
signal_with_target = generate_audio(DURATION, SAMPLE_RATE, [515])  # In target range

# Test Case 2: Signal without target frequency
print("[Test 2] Generating signal WITHOUT target frequency...")
signal_without_target = generate_audio(DURATION, SAMPLE_RATE, [100, 1000])  # Outside range

# Process in blocks
detection_count = 0
for i in range(0, len(signal_with_target), BLOCKSIZE):
    block = signal_with_target[i:i+BLOCKSIZE]
    power, detected = detect_frequency(block, SAMPLE_RATE, TARGET_FREQ_MIN, TARGET_FREQ_MAX, THRESHOLD)
    
    if detected:
        detection_count += 1
        print(f"[!] 510–520 Hz DETECTED! Power = {power:.2f}")
    else:
        print(f"Block {i//BLOCKSIZE}: Power = {power:.2f} (below threshold)")

print(f"\nTotal detections in signal WITH target: {detection_count}")

# Verify non-detection
print("\nVerifying non-detection in signal WITHOUT target...")
detection_count_2 = 0
for i in range(0, len(signal_without_target), BLOCKSIZE):
    block = signal_without_target[i:i+BLOCKSIZE]
    power, detected = detect_frequency(block, SAMPLE_RATE, TARGET_FREQ_MIN, TARGET_FREQ_MAX, THRESHOLD)
    
    if detected:
        detection_count_2 += 1

print(f"Total detections in signal WITHOUT target: {detection_count_2}")

print("\n✓ Frequency detection complete (no hardware required)")