# src/markdown_generator.py
from typing import Dict, List, Any


class MarkdownGenerator:
    """Generates markdown from extracted content"""

    def __init__(self, context=None):
        self.context = context

    def _log(self, message: str):
        if self.context:
            self.context.log(message)

    def generate(
        self, extracted_data: Dict[str, Any], image_urls: List[Dict] = None
    ) -> str:
        """
        Generate Markdown from extracted content
        """
        markdown_parts = []

        # Add title
        markdown_parts.append("# Extracted PDF Content\n")

        # Add text content
        for text_block in extracted_data.get("text", []):
            if text_block["content"].strip():
                markdown_parts.append(f"## Page {text_block['page']}\n")

                # Clean up content - preserve paragraph breaks, clean up excessive whitespace
                content = text_block["content"].strip()
                # Normalize multiple newlines to double newlines (paragraph breaks)
                content = "\n\n".join(
                    [line.strip() for line in content.split("\n\n") if line.strip()]
                )
                # Replace sequences of 3+ newlines with double newlines
                while "\n\n\n" in content:
                    content = content.replace("\n\n\n", "\n\n")

                markdown_parts.append(content)
                markdown_parts.append("\n\n---\n")

        # Add tables
        if extracted_data.get("tables"):
            markdown_parts.append("## Extracted Tables\n")
            for i, table in enumerate(extracted_data["tables"]):
                markdown_parts.append(f"### {table.get('title', f'Table {i + 1}')}\n")
                markdown_parts.append(f"*From Page {table.get('page', 'N/A')}*\n")

                # Use the pre-generated markdown if available
                if table.get("markdown"):
                    markdown_parts.append(table["markdown"])
                    markdown_parts.append("\n")
                else:
                    # Fallback to basic table formatting
                    parsed_data = table.get("parsed_data", [])
                    if len(parsed_data) > 1:
                        headers = parsed_data[0]
                        data_rows = parsed_data[1:]

                        # Create properly formatted table
                        markdown_parts.append(
                            "| "
                            + " | ".join([str(header) for header in headers])
                            + " |"
                        )
                        markdown_parts.append(
                            "| " + " | ".join(["---"] * len(headers)) + " |"
                        )

                        for row in data_rows[:10]:  # Limit to first 10 rows
                            if len(row) == len(headers):
                                # Escape pipe characters in cell content and handle None values
                                escaped_row = []
                                for cell in row:
                                    cell_str = str(cell) if cell is not None else ""
                                    cell_str = cell_str.replace("|", "\\|").replace(
                                        "\n", " "
                                    )
                                    escaped_row.append(cell_str)
                                markdown_parts.append(
                                    "| " + " | ".join(escaped_row) + " |"
                                )

                        markdown_parts.append("\n")

                    else:
                        markdown_parts.append("*No tabular data could be parsed*\n")

                # Add raw text as code block if available (optional)
                if table.get("raw_text") and table["raw_text"].strip():
                    markdown_parts.append("## Raw Table Text\n")
                    markdown_parts.append("```text")
                    markdown_parts.append(table["raw_text"].strip())
                    markdown_parts.append("```\n")

        # Add images
        if extracted_data.get("images") and image_urls:
            markdown_parts.append("## Images\n")
            for i, image in enumerate(extracted_data["images"]):
                if i < len(image_urls):
                    url = image_urls[i]["url"]
                    caption = f"Image {i + 1} from Page {image['page']}"
                    alt_text = caption

                    markdown_parts.append(f"![{alt_text}]({url})")
                    markdown_parts.append(f"*{caption}*\n")

                    if image.get("ocr_text") and image["ocr_text"].strip():
                        markdown_parts.append("\n---\n")
                        markdown_parts.append("## OCR Text Extraction\n")
                        markdown_parts.append(image["ocr_text"].strip())
                        markdown_parts.append("\n\n---\n")

        # Join all parts and clean up final formatting
        result = "\n".join(markdown_parts)

        # Clean up excessive newlines at the end
        result = result.rstrip() + "\n"

        return result
