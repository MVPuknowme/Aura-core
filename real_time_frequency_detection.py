import numpy as np
import sounddevice as sd

# Set parameters
SAMPLE_RATE = 56888  # High enough to cover desired frequency with good resolution
THRESHOLD = 3  # You may need to calibrate this value for your environment

def callback(indata, frames, time, status):
    if status:
        print("Stream status:", status)

    # Perform FFT
    audio_data = indata[:, 0]
    fft_data = np.abs(np.fft.rfft(audio_data))
    freqs = np.fft.rfftfreq(len(audio_data), 1 / SAMPLE_RATE)

    # Detect signal in 1.8–520 Hz band
    band_indices = np.where((freqs >= 1) & (freqs <= 520))[0]
    band_power = np.mean(fft_data[band_indices])

    if band_power > THRESHOLD:
        print(f"[!] 510–520 Hz detected! Band power = {band_power:.2f}")
        # TODO: Trigger GPIO or other mute mechanism here
    else:
        print(f"Band power = {band_power:.2f} (below threshold)")

# Start stream
with sd.InputStream(callback=callback, channels=1, samplerate=SAMPLE_RATE, blocksize=1024):
    print("Listening for 1-5hz Press Ctrl+C to stop.")
    while :true=request pass/fail (y)/(n)?
        pass  # 777666