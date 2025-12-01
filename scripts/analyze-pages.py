#!/usr/bin/env python3
"""
Extract and analyze pages 20-21 from PDF file
"""
import sys
import os
from pathlib import Path

try:
    import pypdf
except ImportError:
    try:
        import PyPDF2 as pypdf
    except ImportError:
        print("Error: pypdf or PyPDF2 is required. Install with: pip install pypdf")
        sys.exit(1)

def extract_pages(pdf_path, page_numbers):
    """Extract text from specific pages of a PDF"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = pypdf.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            
            print(f"Total pages in PDF: {total_pages}")
            print(f"Extracting pages: {page_numbers}\n")
            
            extracted_text = {}
            for page_num in page_numbers:
                if page_num < 1 or page_num > total_pages:
                    print(f"Warning: Page {page_num} is out of range (1-{total_pages})")
                    continue
                
                page = pdf_reader.pages[page_num - 1]  # 0-indexed
                text = page.extract_text()
                extracted_text[page_num] = text
                
                print(f"=== Page {page_num} ===")
                print(text[:500] + "..." if len(text) > 500 else text)
                print(f"\nTotal characters: {len(text)}\n")
            
            return extracted_text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return None

def main():
    # Find PDF file
    project_doc_dir = Path(__file__).parent.parent / "project doc"
    pdf_files = list(project_doc_dir.glob("*.pdf"))
    
    if not pdf_files:
        print("No PDF files found in project doc directory")
        sys.exit(1)
    
    # Use the first PDF found (or HanreiTimesSamplePages.pdf if available)
    pdf_path = None
    for pdf in pdf_files:
        if "HanreiTimes" in pdf.name:
            pdf_path = pdf
            break
    
    if not pdf_path:
        pdf_path = pdf_files[0]
    
    print(f"Analyzing PDF: {pdf_path.name}\n")
    
    # Extract pages 20 and 21
    pages = extract_pages(pdf_path, [20, 21])
    
    if pages:
        # Save extracted text
        output_file = Path(__file__).parent.parent / "extracted_pages_20_21.txt"
        with open(output_file, 'w', encoding='utf-8') as f:
            for page_num in sorted(pages.keys()):
                f.write(f"=== PAGE {page_num} ===\n\n")
                f.write(pages[page_num])
                f.write("\n\n" + "="*80 + "\n\n")
        
        print(f"\nExtracted text saved to: {output_file}")
        return pages
    
    return None

if __name__ == "__main__":
    main()

