import numpy as np
import cv2
import os

# --- CONFIGURATION ---
LEFT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.1:1.0-video-index0"
RIGHT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.2:1.0-video-index0"
PARAM_FILE = 'stereo_params.npz'
WIDTH = 640
HEIGHT = 480
FPS = 5

def run_clean_depth():
    if not os.path.exists(PARAM_FILE):
        print("Error: Run calibration first!")
        return
    
    # Load Calibration
    data = np.load(PARAM_FILE)
    mapL1, mapL2 = data['mapL1'], data['mapL2']
    mapR1, mapR2 = data['mapR1'], data['mapR2']
    Q = data['Q']

    # Setup Cameras
    capL = cv2.VideoCapture(LEFT_PATH)
    capR = cv2.VideoCapture(RIGHT_PATH)

    for cap in [capL, capR]:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
        cap.set(cv2.CAP_PROP_FPS, FPS)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    # --- TUNING FOR SMOOTHNESS ---
    # BlockSize 15 removes fine noise but makes objects look 'blobby'
    window_size = 15 
    min_disp = 0
    num_disp = 96 # Keep divisible by 16
    
    stereo = cv2.StereoSGBM_create(
        minDisparity=min_disp,
        numDisparities=num_disp,
        blockSize=window_size,
        P1=8 * 3 * window_size**2,
        P2=32 * 3 * window_size**2,
        disp12MaxDiff=1,
        uniquenessRatio=15,       # Higher = Less Noise, more empty gaps
        speckleWindowSize=200,    # Higher = Removes bigger chunks of noise
        speckleRange=2,
        mode=cv2.STEREO_SGBM_MODE_SGBM_3WAY
    )

    print("Running Clean Depth...")
    print(" controls:")
    print("  [x] -> Swap Left/Right Cameras (Try this if depth looks wrong!)")
    print("  [ESC] -> Exit")

    swap_cameras = False

    while True:
        retL, frameL = capL.read()
        retR, frameR = capR.read()

        if not retL or not retR:
            continue

        # Swap Logic
        if swap_cameras:
            imgL_raw, imgR_raw = frameR, frameL
        else:
            imgL_raw, imgR_raw = frameL, frameR

        # 1. Rectify
        # Use the maps to straighten the images
        # Note: If cameras are swapped physically, we swap the inputs to remap
        imgL = cv2.remap(imgL_raw, mapL1, mapL2, cv2.INTER_LINEAR)
        imgR = cv2.remap(imgR_raw, mapR1, mapR2, cv2.INTER_LINEAR)

        # 2. Compute Disparity
        disparity = stereo.compute(imgL, imgR).astype(np.float32) / 16.0

        # 3. Clean & Normalize
        # Mask out invalid values (<= 0) and extremely far values
        mask = (disparity > min_disp) & (disparity < num_disp)
        
        # Create a black canvas
        disp_vis = np.zeros_like(imgL, dtype=np.uint8)
        
        if mask.any():
            # Auto-scale the valid pixels to fill 0-255 range
            valid_disp = disparity[mask]
            min_val = valid_disp.min()
            max_val = valid_disp.max()
            
            # Stretch
            normalized = (valid_disp - min_val) / (max_val - min_val + 1e-5) * 255
            
            # Fill the canvas only where mask is True
            # We need to use one channel for grayscale
            disp_vis_gray = np.zeros((HEIGHT, WIDTH), dtype=np.uint8)
            disp_vis_gray[mask] = normalized.astype(np.uint8)
            
            # Apply Color Map
            # Median blur smoothens the colors
            disp_vis_gray = cv2.medianBlur(disp_vis_gray, 5)
            disp_vis = cv2.applyColorMap(disp_vis_gray, cv2.COLORMAP_JET)
            
            # Force background to black (optional cleaner look)
            disp_vis[~mask] = 0

        # 4. Combine (3 Views: Left | Right | Depth)
        # Shrink them slightly if it's too wide for your screen
        scale = 0.5
        viewL = cv2.resize(imgL, (0,0), fx=scale, fy=scale)
        viewR = cv2.resize(imgR, (0,0), fx=scale, fy=scale)
        viewD = cv2.resize(disp_vis, (0,0), fx=scale, fy=scale)
        
        combined = cv2.hconcat([viewL, viewR, viewD])
        cv2.imshow('Clean Stereo View', combined)

        key = cv2.waitKey(1)
        if key == 27: # ESC
            break
        elif key == ord('x'):
            swap_cameras = not swap_cameras
            print(f"Swapped Cameras: {swap_cameras}")

    capL.release()
    capR.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    run_clean_depth()
