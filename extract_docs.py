#!/usr/bin/env python3
import sys
from pathlib import Path
from pypdf import PdfReader
from docx import Document

def extract_pdf_text(pdf_path):
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error reading PDF: {e}"

def extract_docx_text(docx_path):
    try:
        doc = Document(docx_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        return f"Error reading DOCX: {e}"

if __name__ == "__main__":
    doc_folder = Path("project doc")
    
    # Extract from PDF
    pdf_path = doc_folder / "Product Owner Candidate Exercises - FINAL.pdf"
    if pdf_path.exists():
        print("=" * 80)
        print("PRODUCT OWNER EXERCISES PDF:")
        print("=" * 80)
        print(extract_pdf_text(pdf_path))
        print("\n")
    
    # Extract from DOCX
    docx_path = doc_folder / "Fault_Assessment_User_Stories.docx"
    if docx_path.exists():
        print("=" * 80)
        print("FAULT ASSESSMENT USER STORIES DOCX:")
        print("=" * 80)
        print(extract_docx_text(docx_path))
        print("\n")

