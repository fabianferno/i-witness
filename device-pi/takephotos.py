import cv2
import time
import os

# --- CONFIGURATION ---
# Your STABLE USB Paths
LEFT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.1.2:1.0-video-index0"
RIGHT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.1.3:1.0-video-index0"

# Standard VGA Resolution (Best compatibility)
WIDTH = 640
HEIGHT = 480
FPS = 5  # CRITICAL: Low FPS prevents USB crashes

OUTPUT_DIR = 'calibration_images'
# ---------------------

def capture():
    capL = cv2.VideoCapture(LEFT_PATH)
    capR = cv2.VideoCapture(RIGHT_PATH)

    # Force Camera Settings
    for cap in [capL, capR]:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
        cap.set(cv2.CAP_PROP_FPS, FPS)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1) # Minimize lag

    if not capL.isOpened() or not capR.isOpened():
        print("Error opening cameras.")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("Cameras Open. Press 's' to save, 'ESC' to exit.")

    count = 0
    while True:
        retL, frameL = capL.read()
        retR, frameR = capR.read()

        if not retL or not retR:
            print("Dropped frame (Select Timeout protection active)")
            continue

        # Show side-by-side
        combined = cv2.hconcat([frameL, frameR])
        cv2.imshow('Capture - Press S to Save', combined)

        key = cv2.waitKey(1)
        if key == 27: # ESC
            break
        elif key == ord('s'):
            cv2.imwrite(f"{OUTPUT_DIR}/left_{count:02d}.png", frameL)
            cv2.imwrite(f"{OUTPUT_DIR}/right_{count:02d}.png", frameR)
            print(f"Saved Pair {count}")
            count += 1

    capL.release()
    capR.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    capture()
