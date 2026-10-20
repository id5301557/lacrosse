"""Remove container metadata and NovelAI alpha payloads, preserving RGB pixels."""
from pathlib import Path
from io import BytesIO
from hashlib import sha256
from PIL import Image
import json
import struct

ROOT = Path(__file__).resolve().parents[1]
WEBP_IMAGE_CHUNKS = {b'VP8X', b'VP8 ', b'VP8L', b'ALPH', b'ANIM', b'ANMF'}
PNG_IMAGE_CHUNKS = {b'IHDR', b'PLTE', b'IDAT', b'IEND', b'tRNS', b'acTL', b'fcTL', b'fdAT'}

def strip_metadata(data):
    removed = []
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        chunks, offset = [], 12
        while offset < len(data):
            kind = data[offset:offset + 4]
            size = struct.unpack_from('<I', data, offset + 4)[0]
            end = offset + 8 + size + (size % 2)
            assert end <= len(data)
            payload = data[offset + 8:offset + 8 + size]
            if kind in WEBP_IMAGE_CHUNKS:
                if kind == b'VP8X':
                    # Clear ICC, EXIF and XMP feature bits, retaining alpha/animation.
                    payload = bytes([payload[0] & ~0x2C]) + payload[1:]
                chunks.append(kind + struct.pack('<I', len(payload)) + payload + (b'\0' if len(payload) % 2 else b''))
            else:
                removed.append(kind.decode('ascii'))
            offset = end
        body = b'WEBP' + b''.join(chunks)
        return b'RIFF' + struct.pack('<I', len(body)) + body, removed
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    chunks, offset = [], 8
    while offset < len(data):
        size = struct.unpack_from('>I', data, offset)[0]
        kind = data[offset + 4:offset + 8]
        end = offset + 12 + size
        assert end <= len(data)
        if kind in PNG_IMAGE_CHUNKS:
            chunks.append(data[offset:end])
        else:
            removed.append(kind.decode('ascii'))
        offset = end
    return data[:8] + b''.join(chunks), removed

def decoded_frames(data):
    with Image.open(BytesIO(data)) as image:
        frames = []
        for frame in range(getattr(image, 'n_frames', 1)):
            image.seek(frame)
            frames.append((image.size, image.info.get('duration'), sha256(image.convert('RGB').tobytes()).hexdigest()))
        return frames

def alpha_signature(image):
    if 'A' not in image.getbands():
        return b''
    # NovelAI's official reader traverses the alpha channel in column order.
    alpha = image.getchannel('A')
    bits = [alpha.getpixel((index // image.height, index % image.height)) & 1 for index in range(120)]
    return bytes(sum(bits[index + bit] << (7 - bit) for bit in range(8)) for index in range(0, 120, 8))

files = sorted((ROOT / '_development/source-assets/headshots').glob('*')) + sorted((ROOT / 'assets').glob('*-portrait.webp'))
assert len(files) == 16
report = []
for file in files:
    before = file.read_bytes()
    after, removed = strip_metadata(before)
    stealth_removed = False
    with Image.open(BytesIO(after)) as image:
        if alpha_signature(image).startswith((b'stealth_pngcomp', b'stealth_pnginfo')):
            assert getattr(image, 'n_frames', 1) == 1
            # These portraits only use 254/255 alpha for the hidden payload.
            # Remove that payload entirely rather than only disabling its header.
            assert image.getchannel('A').getextrema()[0] >= 254
            output = BytesIO()
            rgb = image.convert('RGB')
            rgb.info.clear()
            if image.format == 'WEBP':
                rgb.save(output, format='WEBP', lossless=True, quality=100, method=6, exact=True)
            else:
                rgb.save(output, format='PNG')
            after = output.getvalue()
            stealth_removed = True
    assert decoded_frames(before) == decoded_frames(after), file.name
    assert strip_metadata(after)[1] == [], file.name
    with Image.open(BytesIO(after)) as image:
        assert len(image.getexif()) == 0
        assert not any(key in image.info for key in ['exif', 'xmp', 'icc_profile', 'comment'])
        assert not alpha_signature(image).startswith((b'stealth_pngcomp', b'stealth_pnginfo'))
    if before != after:
        file.write_bytes(after)
    report.append({'file': file.relative_to(ROOT).as_posix(), 'removedChunks': removed, 'stealthAlphaRemoved': stealth_removed, 'rgbPixelsAndDimensionsIdentical': True, 'containerAndStealthMetadataAbsent': True})
(ROOT / '_development/portrait-metadata-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'PASS: {len(files)} portraits verified; {sum(r["stealthAlphaRemoved"] for r in report)} hidden alpha payloads removed; RGB pixels and dimensions preserved.')
