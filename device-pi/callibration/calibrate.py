
import numpy as np
import cv2
import glob
import os

# --- Configuration ---
CALIBRATION_DIR = 'calibration_images'
OUTPUT_FILE = 'stereo_params.npz'

# 9x6 squares = (8, 5) internal corners
CHECKERBOARD_SIZE = (8, 5) 
SQUARE_SIZE_MM = 15.0     
# ---------------------

def calibrate_stereo_cameras():
    # 1. Prepare Object Points
    objp = np.zeros((CHECKERBOARD_SIZE[0] * CHECKERBOARD_SIZE[1], 3), np.float32)
    objp[:, :2] = np.mgrid[0:CHECKERBOARD_SIZE[0], 0:CHECKERBOARD_SIZE[1]].T.reshape(-1, 2) * SQUARE_SIZE_MM

    objpoints = []  # 3D points
    imgpoints_L = [] # 2D points (Left)
    imgpoints_R = [] # 2D points (Right)
    
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)

    # 2. Collect Image Paths
    images_L = sorted(glob.glob(os.path.join(CALIBRATION_DIR, 'left_*.png')))
    images_R = sorted(glob.glob(os.path.join(CALIBRATION_DIR, 'right_*.png')))

    print(f"Found {len(images_L)} stereo pairs. Starting detection...")

    image_shape = None
    for i in range(len(images_L)):
        imgL = cv2.imread(images_L[i])
        imgR = cv2.imread(images_R[i])
        
        if image_shape is None:
             image_shape = imgL.shape[:2][::-1] # (Width, Height)
        
        grayL = cv2.cvtColor(imgL, cv2.COLOR_BGR2GRAY)
        grayR = cv2.cvtColor(imgR, cv2.COLOR_BGR2GRAY)
        
        retL, cornersL = cv2.findChessboardCorners(grayL, CHECKERBOARD_SIZE, None)
        retR, cornersR = cv2.findChessboardCorners(grayR, CHECKERBOARD_SIZE, None)

        if retL and retR:
            cv2.cornerSubPix(grayL, cornersL, (11, 11), (-1, -1), criteria)
            cv2.cornerSubPix(grayR, cornersR, (11, 11), (-1, -1), criteria)

            objpoints.append(objp)
            imgpoints_L.append(cornersL)
            imgpoints_R.append(cornersR)
        else:
            print(f"Skipping pair {i} (Corners not found)")

    if not objpoints:
        print("Error: No corners found in any images!")
        return

    print("Running Monocular Calibration first (This improves accuracy)...")
    
    # 3. Monocular Calibration (The step that makes this script better)
    retL, mtxL, distL, rvecsL, tvecsL = cv2.calibrateCamera(objpoints, imgpoints_L, image_shape, None, None)
    retR, mtxR, distR, rvecsR, tvecsR = cv2.calibrateCamera(objpoints, imgpoints_R, image_shape, None, None)

    print(f"Left Error: {retL:.4f} | Right Error: {retR:.4f}")
    print("Running Stereo Calibration...")

    # 4. Stereo Calibration
    flags = cv2.CALIB_FIX_INTRINSIC
    retS, MLS, dLS, MRS, dRS, R, T, E, F = cv2.stereoCalibrate(
        objpoints, imgpoints_L, imgpoints_R,
        mtxL, distL, mtxR, distR, image_shape, criteria=criteria, flags=flags)

    print(f"\nStereo Reprojection Error: {retS:.4f}")
    
    # 5. Rectification
    R1, R2, P1, P2, Q, _, _ = cv2.stereoRectify(
        MLS, dLS, MRS, dRS, image_shape, R, T, alpha=-1)
    
    mapL1, mapL2 = cv2.initUndistortRectifyMap(MLS, dLS, R1, P1, image_shape, cv2.CV_16SC2)
    mapR1, mapR2 = cv2.initUndistortRectifyMap(MRS, dRS, R2, P2, image_shape, cv2.CV_16SC2)

    np.savez(OUTPUT_FILE, 
             mapL1=mapL1, mapL2=mapL2, mapR1=mapR1, mapR2=mapR2, 
             Q=Q, ML=MLS, MR=MRS, DL=dLS, DR=dRS)
    print(f"Parameters saved to {OUTPUT_FILE}")

if __name__ == '__main__':
    calibrate_stereo_cameras()
