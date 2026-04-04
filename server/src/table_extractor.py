from typing import Dict, List
import fitz
import importlib.util

class TableExtractor:
    """
    Enhanced table extraction using PyMuPDF's built-in table detection
    """
    
    def __init__(self, context=None):
        self.context = context
        self.pandas_available = self._check_pandas_availability()
    
    def _check_pandas_availability(self) -> bool:
        """Check if pandas is available"""
        if importlib.util.find_spec("pandas") is not None:
            return True
        
        if self.context:
            message = "Pandas not available, some features will be limited"
            if hasattr(self.context, 'log'):
                self.context.log(message)
            else:
                print(f"LOG: {message}")
        return False
    
    def _log(self, message: str):
        """Log message with context if available"""
        if self.context:
            self.context.log(message)
        else:
            print(f"LOG: {message}")
    
    def _error(self, message: str):
        """Log error with context if available"""
        if self.context:
            self.context.error(message)
        else:
            print(f"ERROR: {message}")
    
    def scan_all_pages_for_tables(self, pdf_data: bytes) -> List[tuple]:
        """
        Scan all pages to find which ones contain tables
        Returns list of tuples: (page_number, table_count)
        """
        try:
            doc = fitz.open(stream=pdf_data, filetype="pdf")
            
            pages_with_tables = []
            
            for page_num in range(doc.page_count):
                page = doc[page_num]
                table_finder = page.find_tables()
                tables = list(table_finder)
                
                if tables:
                    pages_with_tables.append((page_num, len(tables)))
                    self._log(f"Page {page_num + 1}: {len(tables)} table(s)")
            
            doc.close()
            
            if pages_with_tables:
                self._log(f"Tables found on {len(pages_with_tables)} page(s)")
            else:
                self._log("No tables found in the entire document")
            
            return pages_with_tables
        
        except Exception as e:
            self._error(f"Error scanning pages: {e}")
            return []
    
    def extract_tables_from_pdf(self, pdf_data: bytes) -> List[Dict]:
        """
        Extract all tables from PDF using PyMuPDF's built-in table detection
        """
        extracted_tables = []
        
        try:
            doc = fitz.open(stream=pdf_data, filetype="pdf")
            
            for page_num in range(doc.page_count):
                page_tables = self._extract_tables_from_page(doc, page_num)
                extracted_tables.extend(page_tables)
            
            doc.close()
            self._log(f"Extracted {len(extracted_tables)} tables from PDF")
        
        except Exception as e:
            self._error(f"Error extracting tables from PDF: {str(e)}")
            # Return empty list instead of failing completely
        
        return extracted_tables
    
    def _extract_tables_from_page(self, doc, page_num: int) -> List[Dict]:
        """
        Extract tables from a specific page
        """
        extracted_tables = []
        
        try:
            page = doc[page_num]
            
            # Find tables using PyMuPDF's table finder
            table_finder = page.find_tables()
            tables = list(table_finder)
            
            if not tables:
                return extracted_tables
            
            self._log(f"Found {len(tables)} table(s) on page {page_num + 1}")
            
            for i, table in enumerate(tables):
                try:
                    # Extract table data
                    data_list = table.extract()
                    
                    if not data_list:
                        continue
                    
                    # Convert to pandas DataFrame if available
                    df = None
                    if self.pandas_available:
                        try:
                            df = table.to_pandas()
                        except Exception:
                            # Fallback: create DataFrame manually
                            try:
                                import pandas as pd
                                if data_list and len(data_list) > 1:
                                    df = pd.DataFrame(data_list[1:], columns=data_list[0])
                            except (ImportError, Exception):
                                pass
                    
                    # Generate markdown representation
                    md_text = self._generate_markdown_table(data_list)
                    
                    # Add to extracted tables
                    extracted_tables.append({
                        'page': page_num + 1,
                        'table_index': i + 1,
                        'title': f'Table {page_num + 1}-{i + 1}',
                        'parsed_data': data_list,
                        'raw_text': '\n'.join(['\t'.join(map(str, row)) for row in data_list]),
                        'rows': len(data_list),
                        'columns': len(data_list[0]) if data_list else 0,
                        'bbox': table.bbox,
                        'markdown': md_text,
                        'dataframe': df.to_dict() if df is not None else None
                    })
                    
                except Exception as e:
                    self._error(f"Error processing table {i + 1} on page {page_num + 1}: {str(e)}")
                    continue
        
        except Exception as e:
            self._error(f"Error extracting tables from page {page_num + 1}: {str(e)}")
        
        return extracted_tables
    
    def _generate_markdown_table(self, data_list: List[List[str]]) -> str:
        """Generate markdown table from data list"""
        if not data_list:
            return ""
        
        md_lines = []
        
        # Add header row if we have multiple rows
        if len(data_list) > 1:
            headers = data_list[0]
            rows = data_list[1:]
            
            md_lines.append("| " + " | ".join(headers) + " |")
            md_lines.append("|" + "---|" * len(headers))
            
            for row in rows[:10]:  # Limit to first 10 rows
                if len(row) == len(headers):
                    md_lines.append("| " + " | ".join([str(cell) for cell in row]) + " |")
        else:
            # Single row table
            row = data_list[0]
            md_lines.append("| " + " | ".join([str(cell) for cell in row]) + " |")
        
        return "\n".join(md_lines)
    
    def extract_tables_from_page_number(self, pdf_data: bytes, page_number: int) -> List[Dict]:
        """
        Extract tables from a specific page number
        """
        try:
            doc = fitz.open(stream=pdf_data, filetype="pdf")
            
            # Check if page number is valid
            if page_number >= doc.page_count:
                self._error(f"Page {page_number + 1} doesn't exist. PDF has {doc.page_count} pages.")
                doc.close()
                return []
            
            tables = self._extract_tables_from_page(doc, page_number)
            doc.close()
            return tables
        
        except Exception as e:
            self._error(f"Error processing page {page_number + 1}: {str(e)}")
            return []