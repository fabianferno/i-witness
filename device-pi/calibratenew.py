import numpy as np
import cv2
import glob

# --- CONFIGURATION ---
CHECKERBOARD_SIZE = (8, 5) # 9x6 squares
SQUARE_SIZE_MM = 15.0
IMG_DIR = 'calibration_images'
OUTPUT_FILE = 'stereo_params.npz'

def run_calibration():
    # Prepare Object Points
    objp = np.zeros((CHECKERBOARD_SIZE[0] * CHECKERBOARD_SIZE[1], 3), np.float32)
    objp[:, :2] = np.mgrid[0:CHECKERBOARD_SIZE[0], 0:CHECKERBOARD_SIZE[1]].T.reshape(-1, 2) * SQUARE_SIZE_MM

    objpoints = []
    imgpointsL = []
    imgpointsR = []

    imagesL = sorted(glob.glob(f"{IMG_DIR}/left_*.png"))
    imagesR = sorted(glob.glob(f"{IMG_DIR}/right_*.png"))

    print(f"Found {len(imagesL)} pairs. Detecting corners...")

    img_shape = None

    for i in range(len(imagesL)):
        imgL = cv2.imread(imagesL[i])
        imgR = cv2.imread(imagesR[i])
        
        if img_shape is None:
            img_shape = imgL.shape[:2][::-1]

        grayL = cv2.cvtColor(imgL, cv2.COLOR_BGR2GRAY)
        grayR = cv2.cvtColor(imgR, cv2.COLOR_BGR2GRAY)

        retL, cornersL = cv2.findChessboardCorners(grayL, CHECKERBOARD_SIZE, None)
        retR, cornersR = cv2.findChessboardCorners(grayR, CHECKERBOARD_SIZE, None)

        if retL and retR:
            criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)
            cornersL = cv2.cornerSubPix(grayL, cornersL, (11, 11), (-1, -1), criteria)
            cornersR = cv2.cornerSubPix(grayR, cornersR, (11, 11), (-1, -1), criteria)
            objpoints.append(objp)
            imgpointsL.append(cornersL)
            imgpointsR.append(cornersR)
        else:
            print(f"Skipping pair {i}")

    print("Calibrating... (720p takes longer)")
    
    retS, MLS, dLS, MRS, dRS, R, T, E, F = cv2.stereoCalibrate(
        objpoints, imgpointsL, imgpointsR, None, None, None, None, img_shape,
        flags=cv2.CALIB_FIX_INTRINSIC, criteria=criteria
    )

    print(f"RMS Error: {retS:.4f}")

    R1, R2, P1, P2, Q, _, _ = cv2.stereoRectify(MLS, dLS, MRS, dRS, img_shape, R, T)
    mapL1, mapL2 = cv2.initUndistortRectifyMap(MLS, dLS, R1, P1, img_shape, cv2.CV_16SC2)
    mapR1, mapR2 = cv2.initUndistortRectifyMap(MRS, dRS, R2, P2, img_shape, cv2.CV_16SC2)

    np.savez(OUTPUT_FILE, mapL1=mapL1, mapL2=mapL2, mapR1=mapR1, mapR2=mapR2, Q=Q)
    print(f"Saved to {OUTPUT_FILE}")

if __name__ == '__main__':
    run_calibration()
