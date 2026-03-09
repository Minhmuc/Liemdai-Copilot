"""
Quick Icon Generator for Liemdai Copilot
Generates favicon, app icon, and logo from text/emoji

Requirements: pip install pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_gradient_background(size, color1=(102, 126, 234), color2=(118, 75, 162)):
    """Create gradient background"""
    img = Image.new('RGB', size)
    draw = ImageDraw.Draw(img)
    
    for y in range(size[1]):
        r = int(color1[0] + (color2[0] - color1[0]) * y / size[1])
        g = int(color1[1] + (color2[1] - color1[1]) * y / size[1])
        b = int(color1[2] + (color2[2] - color1[2]) * y / size[1])
        draw.line([(0, y), (size[0], y)], fill=(r, g, b))
    
    return img

def create_icon_with_emoji(emoji, size, filename):
    """Create icon with emoji"""
    img = create_gradient_background((size, size))
    draw = ImageDraw.Draw(img)
    
    # Try to use emoji (may not work on all systems)
    try:
        # For Windows, you might need to adjust font path
        font = ImageFont.truetype("seguiemj.ttf", size // 2)
    except:
        font = ImageFont.load_default()
    
    # Draw emoji in center
    bbox = draw.textbbox((0, 0), emoji, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    position = ((size - text_width) // 2, (size - text_height) // 2)
    draw.text(position, emoji, font=font, fill='white')
    
    img.save(filename)
    print(f"✓ Created: {filename}")

def create_simple_icon(text, size, filename):
    """Create simple text-based icon"""
    img = create_gradient_background((size, size))
    draw = ImageDraw.Draw(img)
    
    # Draw text
    try:
        font = ImageFont.truetype("arial.ttf", size // 3)
    except:
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    position = ((size - text_width) // 2, (size - text_height) // 2)
    draw.text(position, text, font=font, fill='white')
    
    img.save(filename)
    print(f"✓ Created: {filename}")

if __name__ == "__main__":
    print("🎨 Generating icons for Liemdai Copilot...\n")
    
    # Create icons
    create_icon_with_emoji("🤖", 512, "icon.png")
    create_icon_with_emoji("🤖", 64, "favicon.png")
    create_simple_icon("LC", 256, "logo.png")
    
    # Create background gradient
    bg = create_gradient_background((1920, 1080))
    bg.save("background.jpg", quality=95)
    print("✓ Created: background.jpg")
    
    print("\n✅ All icons generated!")
    print("\nFiles created:")
    print("  - icon.png (512x512) - Desktop app icon")
    print("  - favicon.png (64x64) - Browser favicon")
    print("  - logo.png (256x256) - App logo")
    print("  - background.jpg (1920x1080) - Background image")
