import numpy as np
import cv2
import os
from collections import deque
import time

# --- CONFIGURATION ---
LEFT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.1:1.0-video-index0"
RIGHT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.2:1.0-video-index0"
PARAM_FILE = 'stereo_params.npz'
WIDTH = 640
HEIGHT = 480
FPS = 30

def compute_stereo_depth(imgL, imgR, stereo):
    """Compute depth map using SGBM"""
    disparity = stereo.compute(imgL, imgR).astype(np.float32) / 16.0
    return disparity

def visualize_depth(disparity, min_disp=0, num_disp=96):
    """Create depth visualization"""
    mask = (disparity > min_disp) & (disparity < num_disp)
    disp_vis = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
    
    if mask.any():
        valid_disp = disparity[mask]
        min_val = valid_disp.min()
        max_val = valid_disp.max()
        
        normalized = (valid_disp - min_val) / (max_val - min_val + 1e-5) * 255
        
        disp_vis_gray = np.zeros((HEIGHT, WIDTH), dtype=np.uint8)
        disp_vis_gray[mask] = normalized.astype(np.uint8)
        
        disp_vis_gray = cv2.medianBlur(disp_vis_gray, 5)
        disp_vis = cv2.applyColorMap(disp_vis_gray, cv2.COLORMAP_JET)
        disp_vis[~mask] = 0
    
    return disp_vis

def create_depth_overlay(original, depth_color, blend_strength=0.6):
    """Create blended depth overlay"""
    overlay = cv2.addWeighted(original, 1.0 - blend_strength, depth_color, blend_strength, 0)
    return overlay

def run_quad_view():
    """Run stereo depth with 4-view output"""
    
    if not os.path.exists(PARAM_FILE):
        print("Error: Calibration file not found!")
        print("Run calibration first: python calibration_script.py")
        return
    
    # Load calibration
    print("Loading calibration...")
    data = np.load(PARAM_FILE)
    mapL1, mapL2 = data['mapL1'], data['mapL2']
    mapR1, mapR2 = data['mapR1'], data['mapR2']
    print("✓ Calibration loaded")
    
    # Setup cameras
    print("Opening cameras...")
    capL = cv2.VideoCapture(LEFT_PATH)
    capR = cv2.VideoCapture(RIGHT_PATH)
    
    for cap in [capL, capR]:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
        cap.set(cv2.CAP_PROP_FPS, FPS)
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    
    if not capL.isOpened() or not capR.isOpened():
        print("❌ Error: Cannot open cameras!")
        return
    
    print("✓ Cameras opened")
    
    # Flush buffers
    for _ in range(10):
        capL.read()
        capR.read()
    
    # Configure stereo matcher
    window_size = 9  # Faster than 15
    min_disp = 0
    num_disp = 96
    
    stereo = cv2.StereoSGBM_create(
        minDisparity=min_disp,
        numDisparities=num_disp,
        blockSize=window_size,
        P1=8 * 3 * window_size**2,
        P2=32 * 3 * window_size**2,
        disp12MaxDiff=1,
        uniquenessRatio=10,
        speckleWindowSize=100,
        speckleRange=32,
        preFilterCap=63,
        mode=cv2.STEREO_SGBM_MODE_SGBM_3WAY
    )
    
    print("\n" + "="*70)
    print("STEREO DEPTH SYSTEM - QUAD VIEW")
    print("="*70)
    print("Display Layout:")
    print("  [Top Left]     Left Camera Feed")
    print("  [Top Right]    Right Camera Feed")
    print("  [Bottom Left]  Depth Map Visualization")
    print("  [Bottom Right] Depth-Enhanced View")
    print("\nControls:")
    print("  '+/-'  Adjust overlay blend strength")
    print("  's'    Save screenshot")
    print("  'x'    Swap left/right cameras")
    print("  ESC    Exit")
    print("="*70 + "\n")
    
    fps_times = deque(maxlen=30)
    blend_strength = 0.6
    swap_cameras = False
    
    while True:
        start_time = time.time()
        
        # Synchronized capture
        capL.grab()
        capR.grab()
        retL, frameL = capL.retrieve()
        retR, frameR = capR.retrieve()
        
        if not retL or not retR:
            continue
        
        # Swap if needed
        if swap_cameras:
            imgL_raw, imgR_raw = frameR, frameL
        else:
            imgL_raw, imgR_raw = frameL, frameR
        
        # Rectify
        imgL = cv2.remap(imgL_raw, mapL1, mapL2, cv2.INTER_LINEAR)
        imgR = cv2.remap(imgR_raw, mapR1, mapR2, cv2.INTER_LINEAR)
        
        # Compute depth
        disparity = compute_stereo_depth(imgL, imgR, stereo)
        
        # Create visualizations
        depth_color = visualize_depth(disparity, min_disp, num_disp)
        depth_overlay = create_depth_overlay(imgL, depth_color, blend_strength)
        
        # Calculate FPS
        fps_times.append(time.time() - start_time)
        avg_fps = 1.0 / (np.mean(fps_times) + 1e-6)
        
        # Add labels to each view
        fps_color = (0, 255, 0) if avg_fps > 10 else (0, 165, 255) if avg_fps > 5 else (0, 0, 255)
        
        # View 1: Left Camera
        view1 = imgL.copy()
        cv2.putText(view1, "Left Camera", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # View 2: Right Camera
        view2 = imgR.copy()
        cv2.putText(view2, "Right Camera", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # View 3: Depth Map
        view3 = depth_color.copy()
        cv2.putText(view3, "Depth Map", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(view3, f"FPS: {avg_fps:.1f}", (10, 460),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, fps_color, 2)
        
        # View 4: Depth-Enhanced View
        view4 = depth_overlay.copy()
        cv2.putText(view4, "Depth-Enhanced View", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(view4, f"Blend: {int(blend_strength*100)}%", (10, 460),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # Create 2x2 grid
        top_row = cv2.hconcat([view1, view2])
        bottom_row = cv2.hconcat([view3, view4])
        quad_view = cv2.vconcat([top_row, bottom_row])
        
        # Show
        cv2.imshow('Stereo Depth System', quad_view)
        
        # Handle keys
        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            break
        elif key == ord('s'):
            filename = f'stereo_quad_{int(time.time())}.jpg'
            cv2.imwrite(filename, quad_view)
            print(f"✓ Saved {filename}")
        elif key == ord('+') or key == ord('='):
            blend_strength = min(1.0, blend_strength + 0.05)
            print(f"Blend strength: {int(blend_strength*100)}%")
        elif key == ord('-') or key == ord('_'):
            blend_strength = max(0.0, blend_strength - 0.05)
            print(f"Blend strength: {int(blend_strength*100)}%")
        elif key == ord('x'):
            swap_cameras = not swap_cameras
            print(f"Camera swap: {'ON' if swap_cameras else 'OFF'}")
    
    print(f"\n✓ Average FPS: {avg_fps:.1f}")
    
    capL.release()
    capR.release()
    cv2.destroyAllWindows()


if __name__ == '__main__':
    run_quad_view()
