from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))


def render_pdf(template_name: str, **context) -> bytes:
    template = env.get_template(template_name)
    html_str = template.render(**context)
    return HTML(string=html_str).write_pdf()
