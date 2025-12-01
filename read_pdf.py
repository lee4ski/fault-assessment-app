import pypdf
import sys

pdf_path = "project doc/accident_report_User_Stories.pdf"

try:
    reader = pypdf.PdfReader(pdf_path)
    print(f"Number of pages: {len(reader.pages)}")
    
    # Print text from the first page
    page = reader.pages[0]
    text = page.extract_text()
    print("--- First Page Content ---")
    print(text[:500]) # Print first 500 chars
    print("...")
except Exception as e:
    print(f"Error reading PDF: {e}")
