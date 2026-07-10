from PIL import Image, ImageDraw, ImageFont

# Create a transparent background image
img = Image.new('RGBA', (512, 512), (255, 255, 255, 0))
d = ImageDraw.Draw(img)

# Draw a circle with Alstom blue
d.ellipse((32, 32, 480, 480), fill=(0, 20, 137, 255))

# We'll just draw a simple "A" for Alstom
# Using default font, we can scale it up, or just draw polygons.
d.polygon([(256, 100), (120, 380), (180, 380), (220, 280), (292, 280), (332, 380), (392, 380)], fill="white")
d.polygon([(256, 170), (235, 240), (277, 240)], fill=(0, 20, 137, 255))

# Save as PNG
img.save("alstom.png")
print("Saved alstom.png")
