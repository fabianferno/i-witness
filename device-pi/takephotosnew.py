
import cv2
import os
import time

# --- CONFIGURATION ---
LEFT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.1.2:1.0-video-index0"
RIGHT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.1.3:1.0-video-index0"

WIDTH = 1280
HEIGHT = 720
FPS = 5 # Low FPS is still needed for sync
OUTPUT_DIR = 'calibration_images'

def run_capture():
    capL = cv2.VideoCapture(LEFT_PATH)
    capR = cv2.VideoCapture(RIGHT_PATH)

    # Force MJPEG Compression (Crucial for 720p on Pi)
    fourcc = cv2.VideoWriter_fourcc(*'MJPG')
    capL.set(cv2.CAP_PROP_FOURCC, fourcc)
    capR.set(cv2.CAP_PROP_FOURCC, fourcc)

    for cap in [capL, capR]:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
        cap.set(cv2.CAP_PROP_FPS, FPS)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not capL.isOpened() or not capR.isOpened():
        print("Cameras failed to open.")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Capture 720p Started. Press 's' to save, 'ESC' to quit.")

    count = 0
    while True:
        retL, frameL = capL.read()
        retR, frameR = capR.read()

        if not retL or not retR:
            print("Frame dropped...")
            continue

        # Resize for display only (so it fits on your screen)
        dispL = cv2.resize(frameL, (640, 360))
        dispR = cv2.resize(frameR, (640, 360))
        combined = cv2.hconcat([dispL, dispR])
        
        cv2.imshow('720p Capture (Display resized)', combined)

        key = cv2.waitKey(1)
        if key == 27: break
        elif key == ord('s'):
            # Save full resolution
            cv2.imwrite(f"{OUTPUT_DIR}/left_{count:02d}.png", frameL)
            cv2.imwrite(f"{OUTPUT_DIR}/right_{count:02d}.png", frameR)
            print(f"Saved 720p Pair {count}")
            count += 1

    capL.release()
    capR.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    run_capture()
