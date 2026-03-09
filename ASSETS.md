# 🎨 Assets & Branding

## ✅ What's Added

### 1. **Favicon** 
- `favicon.png` (64x64) - Shows in browser tab & desktop app
- Auto-generated with gradient + 🤖 emoji

### 2. **App Icon**
- `icon.png` (512x512) - Desktop app icon
- Shows in taskbar, dock, and alt-tab switcher

### 3. **Logo**
- `logo.png` (256x256) - App logo with "LC" text
- Can be used in header or about page

### 4. **Background Image**
- `background.jpg` (1920x1080) - Home screen background
- Gradient overlay for better text readability

---

## 🔧 How to Customize

### Replace with Your Own Images

1. **Design your images** (use Figma, Canva, or AI tools)
2. **Save with same filenames**:
   - `favicon.png` (64x64 minimum)
   - `icon.png` (512x512 recommended)
   - `logo.png` (256x256 recommended)
   - `background.jpg` (1920x1080 or higher)

3. **Reload app** to see changes

### Regenerate Default Icons

Run the icon generator:

```bash
cd frontend/assets
python generate_icons.py
```

**Customize colors** in `generate_icons.py`:
```python
color1=(102, 126, 234)  # Start color (RGB)
color2=(118, 75, 162)   # End color (RGB)
```

---

## 🎨 Design Tips

### Favicon
- Simple, recognizable at small sizes
- High contrast
- Use emoji or 1-2 letters

### App Icon
- 512x512 or larger
- PNG with transparency
- Centered, bold design
- Test at 16x16 to ensure it's readable

### Background
- High resolution (1920x1080+)
- Not too busy (gradient overlay will be applied)
- Match your brand colors

---

## 🌐 Free Resources

### Icon Generators
- **Favicon.io** - https://favicon.io/favicon-generator/
- **RealFaviconGenerator** - https://realfavicongenerator.net/

### Stock Photos
- **Unsplash** - https://unsplash.com/
- **Pexels** - https://www.pexels.com/

### AI Tools
- **Microsoft Designer** - https://designer.microsoft.com/
- **Canva AI** - https://www.canva.com/ai-image-generator/

---

## 📁 Current Assets

```
frontend/assets/
├── favicon.png          ✅ Browser/app favicon
├── icon.png            ✅ Desktop app icon (512x512)
├── logo.png            ✅ App logo (LC text)
├── background.jpg      ✅ Home screen background
├── generate_icons.py   🛠️ Icon generator script
└── README.md           📖 This file
```

---

**🎨 All assets are auto-generated but can be replaced with custom designs anytime!**
