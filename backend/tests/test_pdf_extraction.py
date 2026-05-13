import fitz

from services.data_ingestion.pdf import extract_pdf_text


def test_extract_pdf_text() -> None:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "Hantavirus annual report")
    pdf_bytes = document.tobytes()
    document.close()

    text = extract_pdf_text(pdf_bytes)

    assert "Hantavirus annual report" in text
