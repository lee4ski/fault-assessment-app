import pypdf
import sys

pdf_path = "project doc/accident_report_User_Stories.pdf"

try:
    reader = pypdf.PdfReader(pdf_path)
    print(f"Total pages: {len(reader.pages)}\n")
    
    # Extract all text
    full_text = ""
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        full_text += text + "\n"
    
    # Print full text
    print(full_text)
    
except Exception as e:
    print(f"Error reading PDF: {e}")
