import subprocess
import tempfile
import os

class OCRService:
    def __init__(self):
        self.node_script = os.path.abspath('ocr.js')
        self.lang = 'deu+eng'

    async def extract_text_from_image(self, image_data: bytes) -> str:
        # Save image to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            tmp.write(image_data)
            tmp_path = tmp.name

        try:
            # Call the Node.js script
            result = subprocess.run(
                ['node', self.node_script, tmp_path, self.lang],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=60
            )
            if result.returncode != 0:
                raise Exception(f"OCR failed: {result.stderr.strip()}")
            return result.stdout.strip()
        finally:
            os.remove(tmp_path)