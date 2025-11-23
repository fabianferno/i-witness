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
    
    if len(images_L) == 0:
        print("❌ ERROR: No calibration images found!")
        return
    
    print(f"Found {len(images_L)} stereo pairs. Starting detection...")
    
    image_shape = None
    valid_pairs = 0
    
    for i in range(len(images_L)):
        imgL = cv2.imread(images_L[i])
        imgR = cv2.imread(images_R[i])
        
        if imgL is None or imgR is None:
            print(f"⚠ Skipping pair {i} (Cannot load images)")
            continue
        
        if image_shape is None:
            image_shape = imgL.shape[:2][::-1]  # (Width, Height)
        
        grayL = cv2.cvtColor(imgL, cv2.COLOR_BGR2GRAY)
        grayR = cv2.cvtColor(imgR, cv2.COLOR_BGR2GRAY)
        
        # Find chessboard corners
        retL, cornersL = cv2.findChessboardCorners(grayL, CHECKERBOARD_SIZE, None)
        retR, cornersR = cv2.findChessboardCorners(grayR, CHECKERBOARD_SIZE, None)
        
        if retL and retR:
            # Refine to subpixel accuracy
            cornersL_refined = cv2.cornerSubPix(grayL, cornersL, (11, 11), (-1, -1), criteria)
            cornersR_refined = cv2.cornerSubPix(grayR, cornersR, (11, 11), (-1, -1), criteria)
            
            objpoints.append(objp)
            imgpoints_L.append(cornersL_refined)
            imgpoints_R.append(cornersR_refined)
            valid_pairs += 1
            print(f"  ✓ Pair {i}: Corners detected")
        else:
            print(f"  ✗ Pair {i}: Corners NOT found")
    
    print(f"\n✓ Valid pairs: {valid_pairs}/{len(images_L)}")
    
    if valid_pairs < 10:
        print("❌ ERROR: Need at least 10 valid pairs for reliable calibration!")
        print("   Capture more images with clear chessboard visibility.")
        return
    
    if valid_pairs < 20:
        print("⚠ WARNING: Less than 20 pairs - calibration may be suboptimal")
    
    # 3. Monocular Calibration
    print("\n" + "="*60)
    print("Running Monocular Calibration...")
    print("="*60)
    
    retL, mtxL, distL, rvecsL, tvecsL = cv2.calibrateCamera(
        objpoints, imgpoints_L, image_shape, None, None
    )
    retR, mtxR, distR, rvecsR, tvecsR = cv2.calibrateCamera(
        objpoints, imgpoints_R, image_shape, None, None
    )
    
    print(f"Left Camera RMS Error:  {retL:.4f} pixels")
    print(f"Right Camera RMS Error: {retR:.4f} pixels")
    
    if retL > 1.0 or retR > 1.0:
        print("⚠ WARNING: High monocular calibration error!")
        print("   Consider recapturing images or checking chessboard print quality")
    
    # 4. Stereo Calibration
    print("\n" + "="*60)
    print("Running Stereo Calibration...")
    print("="*60)
    
    # Use refined criteria for stereo calibration
    stereo_criteria = (cv2.TERM_CRITERIA_MAX_ITER + cv2.TERM_CRITERIA_EPS, 100, 1e-5)
    
    # CRITICAL FIX: Use CALIB_FIX_INTRINSIC to keep individual camera calibrations
    flags = cv2.CALIB_FIX_INTRINSIC
    
    retS, MLS, dLS, MRS, dRS, R, T, E, F = cv2.stereoCalibrate(
        objpoints, imgpoints_L, imgpoints_R,
        mtxL, distL, mtxR, distR, 
        image_shape, 
        criteria=stereo_criteria, 
        flags=flags
    )
    
    print(f"Stereo Calibration RMS Error: {retS:.4f} pixels")
    
    if retS > 1.0:
        print("⚠ WARNING: High stereo calibration error!")
    elif retS < 0.5:
        print("✓ Excellent calibration quality!")
    
    # Print baseline
    baseline_mm = np.linalg.norm(T)
    print(f"\nCamera Baseline: {baseline_mm:.2f} mm")
    
    # 5. Stereo Rectification
    print("\n" + "="*60)
    print("Computing Rectification...")
    print("="*60)
    
    # CRITICAL FIX: Use alpha=0 (crop to valid pixels) or alpha=1 (keep all)
    # alpha=0 gives best results but crops image
    # alpha=0.8 is a good compromise
    ALPHA = 0.0  # Change to 0.8 if you want less cropping
    
    R1, R2, P1, P2, Q, roi_left, roi_right = cv2.stereoRectify(
        MLS, dLS, MRS, dRS, 
        image_shape, R, T, 
        alpha=ALPHA,  # FIXED: Was -1, now 0
        newImageSize=image_shape
    )
    
    print(f"Left ROI:  {roi_left}")
    print(f"Right ROI: {roi_right}")
    
    # 6. Compute Rectification Maps
    mapL1, mapL2 = cv2.initUndistortRectifyMap(
        MLS, dLS, R1, P1, image_shape, cv2.CV_32FC1  # Use CV_32FC1 for better quality
    )
    mapR1, mapR2 = cv2.initUndistortRectifyMap(
        MRS, dRS, R2, P2, image_shape, cv2.CV_32FC1
    )
    
    # 7. Save Parameters
    np.savez(OUTPUT_FILE, 
             mapL1=mapL1, mapL2=mapL2, 
             mapR1=mapR1, mapR2=mapR2, 
             Q=Q, 
             ML=MLS, MR=MRS, 
             DL=dLS, DR=dRS,
             R=R, T=T,
             R1=R1, R2=R2,
             P1=P1, P2=P2,
             roi_left=roi_left, roi_right=roi_right)
    
    print(f"\n✓ Parameters saved to '{OUTPUT_FILE}'")
    
    # 8. QUALITY VERIFICATION
    print("\n" + "="*60)
    print("Verifying Rectification Quality...")
    print("="*60)
    
    # Load first image pair and rectify
    test_imgL = cv2.imread(images_L[0])
    test_imgR = cv2.imread(images_R[0])
    
    rectL = cv2.remap(test_imgL, mapL1, mapL2, cv2.INTER_LINEAR)
    rectR = cv2.remap(test_imgR, mapR1, mapR2, cv2.INTER_LINEAR)
    
    # Draw epipolar lines
    combined = np.hstack((rectL, rectR))
    for y in range(0, combined.shape[0], 30):
        cv2.line(combined, (0, y), (combined.shape[1], y), (0, 255, 0), 1)
    
    cv2.imwrite('rectification_verify.jpg', combined)
    print("✓ Saved 'rectification_verify.jpg'")
    print("  → Check that horizontal green lines align perfectly!")
    
    # Compute correlation check
    grayL_rect = cv2.cvtColor(rectL, cv2.COLOR_BGR2GRAY)
    grayR_rect = cv2.cvtColor(rectR, cv2.COLOR_BGR2GRAY)
    
    correlations = []
    for y in range(100, 400, 20):  # Sample middle rows
        if y < grayL_rect.shape[0]:
            corr = np.corrcoef(grayL_rect[y, :], grayR_rect[y, :])[0, 1]
            correlations.append(corr)
    
    avg_corr = np.mean(correlations)
    print(f"\nRow Correlation: {avg_corr:.3f}")
    
    if avg_corr > 0.7:
        print("✓ Excellent rectification!")
    elif avg_corr > 0.5:
        print("⚠ Moderate rectification - usable but could be better")
    else:
        print("❌ Poor rectification - recalibration recommended")
    
    # 9. Quick disparity test
    stereo_test = cv2.StereoSGBM_create(
        minDisparity=0,
        numDisparities=96,
        blockSize=9
    )
    
    disparity_test = stereo_test.compute(grayL_rect, grayR_rect).astype(np.float32) / 16.0
    valid_mask = disparity_test > 0
    valid_percent = (valid_mask.sum() / disparity_test.size) * 100
    
    print(f"Valid Disparities: {valid_percent:.1f}%")
    
    if valid_percent > 40:
        print("✓ Good disparity coverage")
    elif valid_percent > 20:
        print("⚠ Moderate disparity coverage")
    else:
        print("❌ Low disparity coverage - check scene texture")
    
    # Save test disparity
    disp_norm = cv2.normalize(disparity_test, None, 0, 255, cv2.NORM_MINMAX, cv2.CV_8U)
    disp_color = cv2.applyColorMap(disp_norm, cv2.COLORMAP_JET)
    cv2.imwrite('calibration_test_disparity.jpg', disp_color)
    print("✓ Saved 'calibration_test_disparity.jpg'")
    
    print("\n" + "="*60)
    print("CALIBRATION COMPLETE!")
    print("="*60)
    print("\nNext Steps:")
    print("1. Check 'rectification_verify.jpg' - lines must be horizontal")
    print("2. Check 'calibration_test_disparity.jpg' - should show depth")
    print("3. If correlation < 0.7, recapture images and recalibrate")
    print("4. Run your depth map tuner with the new calibration")

if __name__ == '__main__':
    calibrate_stereo_cameras()
