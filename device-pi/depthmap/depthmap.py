import numpy as np
import cv2
import os

# --- CONFIGURATION ---
LEFT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.1.2:1.0-video-index0"
RIGHT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.1.3:1.0-video-index0"
PARAM_FILE = 'stereo_params.npz'
WIDTH = 640
HEIGHT = 480
FPS = 5
# ---------------------

def nothing(x): pass

def run():
    if not os.path.exists(PARAM_FILE):
        print("Run calibration first!")
        return
        
    data = np.load(PARAM_FILE)
    mapL1, mapL2 = data['mapL1'], data['mapL2']
    mapR1, mapR2 = data['mapR1'], data['mapR2']

    capL = cv2.VideoCapture(LEFT_PATH)
    capR = cv2.VideoCapture(RIGHT_PATH)

    for cap in [capL, capR]:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
        cap.set(cv2.CAP_PROP_FPS, FPS)

    cv2.namedWindow('Depth Map Tuner', cv2.WINDOW_NORMAL)
    cv2.resizeWindow('Depth Map Tuner', 800, 600)

    # Create Sliders
    cv2.createTrackbar('Num Disparities', 'Depth Map Tuner', 6, 12, nothing) # x16
    cv2.createTrackbar('Block Size', 'Depth Map Tuner', 15, 51, nothing)
    cv2.createTrackbar('Uniqueness', 'Depth Map Tuner', 10, 50, nothing)
    cv2.createTrackbar('Texture Thresh', 'Depth Map Tuner', 10, 100, nothing)

    stereo = cv2.StereoBM_create()

    while True:
        retL, frameL = capL.read()
        retR, frameR = capR.read()

        if not retL or not retR: continue

        # Rectify
        imgL = cv2.remap(frameL, mapL1, mapL2, cv2.INTER_LINEAR)
        imgR = cv2.remap(frameR, mapR1, mapR2, cv2.INTER_LINEAR)
        
        grayL = cv2.cvtColor(imgL, cv2.COLOR_BGR2GRAY)
        grayR = cv2.cvtColor(imgR, cv2.COLOR_BGR2GRAY)

        # Update Settings
        num_disp = max(16, cv2.getTrackbarPos('Num Disparities', 'Depth Map Tuner') * 16)
        block = cv2.getTrackbarPos('Block Size', 'Depth Map Tuner')
        if block % 2 == 0: block += 1
        block = max(5, block)
        
        stereo.setNumDisparities(num_disp)
        stereo.setBlockSize(block)
        stereo.setUniquenessRatio(cv2.getTrackbarPos('Uniqueness', 'Depth Map Tuner'))
        stereo.setTextureThreshold(cv2.getTrackbarPos('Texture Thresh', 'Depth Map Tuner'))

        # Compute
        disparity = stereo.compute(grayL, grayR)
        
        # Visualize
        norm_disp = cv2.normalize(disparity, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        norm_disp = cv2.medianBlur(norm_disp, 5)
        color_depth = cv2.applyColorMap(norm_disp, cv2.COLORMAP_JET)

        cv2.imshow('Depth Map Tuner', color_depth)

        if cv2.waitKey(1) == 27: break

    capL.release()
    capR.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    run()
