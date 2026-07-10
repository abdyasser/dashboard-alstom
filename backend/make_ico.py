from PIL import Image
import sys

def create_ico(png_path, ico_path):
    img = Image.open(png_path)
    img.save(ico_path, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])
    print(f"Created {ico_path}")

if __name__ == '__main__':
    create_ico('alstom.png', 'alstom.ico')
