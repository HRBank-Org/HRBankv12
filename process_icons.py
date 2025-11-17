import requests
from PIL import Image
from io import BytesIO
import os

def download_and_resize_icon(url, output_path, sizes):
    """Download image and create multiple sizes"""
    print(f"Downloading from: {url}")
    response = requests.get(url)
    img = Image.open(BytesIO(response.content))
    
    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    for size in sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        output_file = output_path.replace('.png', f'-{size}x{size}.png')
        resized.save(output_file, 'PNG', optimize=True)
        print(f"Created: {output_file}")
    
    return True

# Icon URLs
employer_url = "https://customer-assets.emergentagent.com/job_bankclone-debug/artifacts/44b0k6s6_HRB%20App%20Icon%20Employer.jpg"
workforce_url = "https://customer-assets.emergentagent.com/job_bankclone-debug/artifacts/pz2plcbj_HRB%20App%20Icon%20Workforce.jpg"
logo_url = "https://customer-assets.emergentagent.com/job_bankclone-debug/artifacts/1n61gdhe_HR%20Bank%20Logo.png"

# PWA icon sizes
pwa_sizes = [192, 512]
favicon_sizes = [32, 64]

print("Processing Employer Icon...")
download_and_resize_icon(
    employer_url, 
    '/app/frontend/public/icons/icon-employer.png',
    pwa_sizes
)

print("\nProcessing Workforce Icon...")
download_and_resize_icon(
    workforce_url,
    '/app/frontend/public/icons/icon-workforce.png',
    pwa_sizes
)

print("\nProcessing Favicon...")
download_and_resize_icon(
    logo_url,
    '/app/frontend/public/favicon.png',
    favicon_sizes
)

# Create a 16x16 favicon.ico
print("\nCreating favicon.ico...")
response = requests.get(logo_url)
img = Image.open(BytesIO(response.content))
if img.mode != 'RGBA':
    img = img.convert('RGBA')
favicon_16 = img.resize((16, 16), Image.Resampling.LANCZOS)
favicon_16.save('/app/frontend/public/favicon.ico', format='ICO')
print("Created: /app/frontend/public/favicon.ico")

print("\n✅ All icons processed successfully!")
