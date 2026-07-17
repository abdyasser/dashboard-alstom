from PIL import Image
import sys

def create_ico(png_path, ico_path):
    img = Image.open(png_path).convert('RGBA')
    # Create a white background and composite the logo onto it
    white_bg = Image.new('RGBA', img.size, (255, 255, 255, 255))
    white_bg.paste(img, (0, 0), img)
    # Convert to RGB (no transparency) with white background
    final = white_bg.convert('RGB')
    final.save(ico_path, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])
    print(f"Created {ico_path}")

if __name__ == '__main__':
    create_ico('alstom.png', 'alstom.ico')
