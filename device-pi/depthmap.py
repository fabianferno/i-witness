import numpy as np
import cv2
import os
from collections import deque
import time
import json
import base64
import requests
from eth_account import Account
from eth_account.messages import encode_defunct
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


LEFT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.1:1.0-video-index0"
RIGHT_PATH = "/dev/v4l/by-path/platform-fd500000.pcie-pci-0000:01:00.0-usb-0:1.2:1.0-video-index0"
PARAM_FILE = 'stereo_params.npz'
WIDTH = 640
HEIGHT = 480
FPS = 15

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

def create_depth_overlay_blend(original, depth_color, blend_strength=0.6):
    """Blend depth map with original image"""
    overlay = cv2.addWeighted(original, 1.0 - blend_strength, depth_color, blend_strength, 0)
    return overlay

def fake_depth_effect(frame):
    """Visual effects depth for comparison"""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    dist = cv2.distanceTransform(255 - edges, cv2.DIST_L2, 5)
    dist = cv2.normalize(dist, None, 0, 255, cv2.NORM_MINMAX, cv2.CV_8U)
    dist = cv2.GaussianBlur(dist, (21, 21), 0)
    fake_depth = cv2.applyColorMap(dist, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(frame, 0.4, fake_depth, 0.6, 0)
    return overlay

def image_to_base64(image):
    """Convert OpenCV image to base64 string"""
    _, buffer = cv2.imencode('.jpg', image)
    return base64.b64encode(buffer).decode('utf-8')

def compress_depth_data(disparity):
    """Compress depth data for JSON storage"""
    valid_mask = disparity > 0
    
    depth_data = {
        'shape': list(disparity.shape),
        'dtype': str(disparity.dtype),
        'min': float(np.min(disparity)),
        'max': float(np.max(disparity)),
        'mean': float(np.mean(disparity)),
        'valid_pixels': int(np.sum(valid_mask))
    }
    
    # Store only non-zero values with their indices for efficiency
    if valid_mask.any():
        indices = np.where(valid_mask)
        values = disparity[valid_mask]
        
        # Convert to lists for JSON serialization
        depth_data['indices_y'] = indices[0].tolist()
        depth_data['indices_x'] = indices[1].tolist()
        depth_data['values'] = values.tolist()
    else:
        depth_data['indices_y'] = []
        depth_data['indices_x'] = []
        depth_data['values'] = []
    
    return depth_data

def sign_data_eip191(data_dict, private_key):
    """Sign data using EIP-191 signature"""
    # Convert data to deterministic JSON string
    data_str = json.dumps(data_dict, sort_keys=True, separators=(',', ':'))
    
    # Create Ethereum account from private key
    account = Account.from_key(private_key)
    
    # Encode message with EIP-191
    message = encode_defunct(text=data_str)
    
    # Sign
    signed_message = account.sign_message(message)
    
    return signed_message.signature.hex()

def save_depth_data(disparity, timestamp):
    """Save depth map data in compressed format"""
    
    # Create output dictionary
    depth_data = {
        'timestamp': timestamp,
        'shape': list(disparity.shape),
        'dtype': str(disparity.dtype),
        'min': float(np.min(disparity)),
        'max': float(np.max(disparity)),
        'mean': float(np.mean(disparity)),
        'std': float(np.std(disparity)),
        'valid_pixels': int(np.sum(disparity > 0))
    }
    
    # Compress depth data using numpy's compressed format
    depth_file = f'depth_data_{timestamp}.npz'
    np.savez_compressed(depth_file, disparity=disparity)
    
    # Print to console in condensed format
    print("\n" + "="*70)
    print(f"DEPTH DATA CAPTURED - Timestamp: {timestamp}")
    print("="*70)
    print(f"Shape:        {depth_data['shape']}")
    print(f"Data Type:    {depth_data['dtype']}")
    print(f"Value Range:  [{depth_data['min']:.2f}, {depth_data['max']:.2f}]")
    print(f"Mean Depth:   {depth_data['mean']:.2f}")
    print(f"Std Dev:      {depth_data['std']:.2f}")
    print(f"Valid Pixels: {depth_data['valid_pixels']} / {disparity.size} ({depth_data['valid_pixels']/disparity.size*100:.1f}%)")
    print(f"Saved to:     {depth_file}")
    print("="*70)
    
    # Also save metadata as JSON for easy reading
    json_file = f'depth_meta_{timestamp}.json'
    with open(json_file, 'w') as f:
        json.dump(depth_data, f, indent=2)
    
    print(f"Metadata:     {json_file}")
    print("\nTo recreate depth map:")
    print(f"  data = np.load('{depth_file}')")
    print(f"  disparity = data['disparity']")
    print("="*70 + "\n")
    
    return depth_file, json_file

def show_popup_message(display_frame, message, duration=3, color=(0, 255, 0)):
    """Display a popup message on the OpenCV window"""
    overlay = display_frame.copy()
    
    # Create semi-transparent overlay
    cv2.rectangle(overlay, (0, 0), (overlay.shape[1], overlay.shape[0]), (0, 0, 0), -1)
    overlay = cv2.addWeighted(overlay, 0.7, display_frame, 0.3, 0)
    
    # Calculate text size and position (centered)
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.7
    thickness = 2
    
    # Split message into lines and handle long CID strings
    lines = message.split('\n')
    # Break long lines (like CID) into multiple lines if needed
    max_chars_per_line = 50
    processed_lines = []
    for line in lines:
        if len(line) > max_chars_per_line:
            # Break long line into chunks
            for i in range(0, len(line), max_chars_per_line):
                processed_lines.append(line[i:i+max_chars_per_line])
        else:
            processed_lines.append(line)
    
    text_height = 35
    total_height = len(processed_lines) * text_height
    start_y = (overlay.shape[0] - total_height) // 2
    
    # Draw each line
    for i, line in enumerate(processed_lines):
        text_size = cv2.getTextSize(line, font, font_scale, thickness)[0]
        text_x = (overlay.shape[1] - text_size[0]) // 2
        text_y = start_y + (i + 1) * text_height
        
        # Draw text with shadow for better visibility
        cv2.putText(overlay, line, (text_x + 2, text_y + 2), font, font_scale, (0, 0, 0), thickness + 1)
        cv2.putText(overlay, line, (text_x, text_y), font, font_scale, color, thickness)
    
    cv2.imshow('Stereo Depth System - 5 View', overlay)
    cv2.waitKey(int(duration * 1000))

def create_signed_payload(imgL, other_views, disparity, timestamp):
    """Create signed payload using existing logic"""
    private_key = os.getenv('PRIVATE_KEY')
    
    if not private_key:
        print("⚠ WARNING: PRIVATE_KEY not found in environment!")
        print("  Capture will not be signed.")
        signature = "UNSIGNED_NO_PRIVATE_KEY"
    else:
        if not private_key.startswith('0x'):
            private_key = '0x' + private_key
    
    # Convert images to base64
    print("Encoding images to base64...")
    base_image_b64 = image_to_base64(imgL)
    depth_image_b64 = image_to_base64(other_views)
    
    # Compress depth data
    print("Compressing depth data...")
    depth_data = compress_depth_data(disparity)
    
    # Create data object
    data_obj = {
        'timestamp': timestamp,
        'baseImage': base_image_b64,
        'depthImage': depth_image_b64,
        'depthData': depth_data
    }
    
    # Sign the data
    if private_key:
        print("Signing data with EIP-191...")
        try:
            signature = sign_data_eip191(data_obj, private_key)
            signer_address = Account.from_key(private_key).address
            print(f"✓ Signed by: {signer_address}")
            print(f"✓ Signature: {signature[:20]}...{signature[-20:]}")
        except Exception as e:
            print(f"⚠ Signature failed: {e}")
            import traceback
            traceback.print_exc()
            signature = f"SIGNATURE_ERROR_{e}"
    else:
        signature = "UNSIGNED_NO_PRIVATE_KEY"
    
    # Create final JSON structure
    payload = {
        'data': data_obj,
        'signature': signature
    }
    
    return payload

def print_payload_summary(payload):
    """Print payload summary excluding huge depthData"""
    print("\n" + "="*70)
    print("PAYLOAD SUMMARY (before upload)")
    print("="*70)
    print(f"Signature: {payload.get('signature', 'N/A')}")
    if 'data' in payload:
        data = payload['data']
        print(f"Timestamp: {data.get('timestamp', 'N/A')}")
        print(f"Base Image: {len(data.get('baseImage', ''))} chars (base64)")
        print(f"Depth Image: {len(data.get('depthImage', ''))} chars (base64)")
        if 'depthData' in data:
            depth_data = data['depthData']
            print(f"Depth Data:")
            print(f"  - Shape: {depth_data.get('shape', 'N/A')}")
            print(f"  - Dtype: {depth_data.get('dtype', 'N/A')}")
            print(f"  - Min: {depth_data.get('min', 'N/A')}")
            print(f"  - Max: {depth_data.get('max', 'N/A')}")
            print(f"  - Mean: {depth_data.get('mean', 'N/A')}")
            print(f"  - Valid Pixels: {depth_data.get('valid_pixels', 'N/A')}")
            print(f"  - Values Count: {len(depth_data.get('values', []))}")
            print(f"  - (Full depthData object excluded from print - too large)")
    print("="*70 + "\n")

def upload_to_server(payload, server_url):
    """Upload witness data to the server"""
    try:
        # Print payload summary before sending
        print_payload_summary(payload)
        
        # Post to server
        upload_url = f"{server_url}/api/upload"
        print(f"📤 Uploading to: {upload_url}")
        response = requests.post(upload_url, json=payload, headers={'Content-Type': 'application/json'}, timeout=150)
        
        if response.status_code == 200:
            result = response.json()
            # Extract pieceCid - handle both object and string formats
            piece_cid_raw = result.get('data', {}).get('pieceCid', 'N/A')
            if piece_cid_raw and isinstance(piece_cid_raw, dict) and '/' in piece_cid_raw:
                piece_cid = piece_cid_raw['/']
            elif piece_cid_raw:
                piece_cid = str(piece_cid_raw)
            else:
                piece_cid = 'N/A'
            print(f"✅ Upload successful! PieceCID: {piece_cid}")
            return True, result, piece_cid
        else:
            print(f"❌ Upload failed with status {response.status_code}: {response.text}")
            return False, None, None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during upload: {e}")
        return False, None, None
    except Exception as e:
        print(f"❌ Error during upload: {e}")
        return False, None, None

def run_five_view():
    """Run stereo depth with 5-view output"""
    
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
    window_size = 9
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
    print("STEREO DEPTH SYSTEM - 5 VIEW DISPLAY")
    print("="*70)
    print("Display Layout:")
    print("  [Top Row]    Left Camera | Right Camera | Stereo Depth Map")
    print("  [Bottom Row] Depth-Enhanced | Depth Overlay Visualization")
    print("\nControls:")
    print("  SPACE  Capture images + depth data")
    print("  '+/-'  Adjust blend strength (depth-enhanced view)")
    print("  's'    Save full screenshot")
    print("  'x'    Swap left/right cameras")
    print("  ESC    Exit")
    print("="*70 + "\n")
    
    fps_times = deque(maxlen=30)
    blend_strength = 0.6
    swap_cameras = False
    capture_count = 0
    
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
        
        # Compute stereo depth
        disparity = compute_stereo_depth(imgL, imgR, stereo)
        
        # Create visualizations
        depth_color = visualize_depth(disparity, min_disp, num_disp)
        depth_enhanced = create_depth_overlay_blend(imgL, depth_color, blend_strength)
        depth_overlay = fake_depth_effect(imgL)
        
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
        
        # View 3: Stereo Depth Map
        view3 = depth_color.copy()
        cv2.putText(view3, "Stereo Depth Map", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(view3, f"FPS: {avg_fps:.1f}", (10, 460),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, fps_color, 2)
        
        # View 4: Depth-Enhanced View
        view4 = depth_enhanced.copy()
        cv2.putText(view4, "Depth-Enhanced View", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(view4, f"Blend: {int(blend_strength*100)}%", (10, 460),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # View 5: Depth Overlay Visualization
        view5 = depth_overlay.copy()
        cv2.putText(view5, "Depth Visualization", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Create layout: 3 views on top, 2 views on bottom
        # Top row: Left | Right | Depth Map
        top_row = cv2.hconcat([view1, view2, view3])
        
        # Bottom row: Depth-Enhanced | Depth Overlay (centered)
        padding = np.zeros((HEIGHT, WIDTH // 2, 3), dtype=np.uint8)
        bottom_row = cv2.hconcat([padding, view4, view5, padding])
        
        # Combine
        five_view = cv2.vconcat([top_row, bottom_row])
        
        # Show
        cv2.imshow('Stereo Depth System - 5 View', five_view)
        
        # Handle keys
        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            break
            
        elif key == ord(' '):  # SPACEBAR - Capture
            timestamp = int(time.time())
            
            # Save left image separately
            left_filename = f'capture_{timestamp}_left.jpg'
            cv2.imwrite(left_filename, imgL)
            print(f"\n✓ Saved left image: {left_filename}")
            
            # Save all other views combined
            # Create a composite without the left camera
            other_views_top = cv2.hconcat([view2, view3])
            other_views_bottom = cv2.hconcat([view4, view5])
            other_views = cv2.vconcat([other_views_top, other_views_bottom])
            
            other_filename = f'capture_{timestamp}_views.jpg'
            cv2.imwrite(other_filename, other_views)
            print(f"✓ Saved other views: {other_filename}")
            
            # Save depth data
            depth_file, json_file = save_depth_data(disparity, timestamp)
            
            # Show popup message
            server_url = os.getenv('SERVER_URL', 'http://localhost:3000')
            popup_message = "Witness image captured,\nsigning and sending it to\nFilecoinOnchain Cloud"
            show_popup_message(five_view, popup_message, duration=3)
            
            # Create signed payload using existing logic
            print(f"\n📤 Creating signed payload and uploading to server: {server_url}")
            payload = create_signed_payload(imgL, other_views, disparity, timestamp)
            
            # Upload to server
            success, result, piece_cid = upload_to_server(payload, server_url)
            
            if success and piece_cid:
                # Display success message with CID
                success_message = f"✅ Upload Successful!\n\nPieceCID:\n{piece_cid}"
                show_popup_message(five_view, success_message, duration=5, color=(0, 255, 0))
                print(f"✅ Upload complete!\n")
            else:
                # Display error message
                error_message = "❌ Upload Failed\n\nCheck console for details"
                show_popup_message(five_view, error_message, duration=3, color=(0, 0, 255))
                print(f"⚠️ Upload failed, but files saved locally.\n")
            
            capture_count += 1
            print(f"✓ Capture #{capture_count} complete!\n")
            
        elif key == ord('s'):  # Full screenshot
            filename = f'stereo_5view_{int(time.time())}.jpg'
            cv2.imwrite(filename, five_view)
            print(f"✓ Saved full screenshot: {filename}")
            
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
    print(f"✓ Total captures: {capture_count}")
    
    capL.release()
    capR.release()
    cv2.destroyAllWindows()


if __name__ == '__main__':
    run_five_view()
