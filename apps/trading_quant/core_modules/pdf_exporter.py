import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from datetime import datetime

class PDFExporter:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.output_dir = os.path.join(self.base_dir, "reports")
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_daily_report(self, stats: dict) -> str:
        date_str = datetime.now().strftime("%Y-%m-%d")
        filepath = os.path.join(self.output_dir, f"NeuralNexus_Report_{date_str}.pdf")
        
        doc = SimpleDocTemplate(filepath, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
        elements = []
        
        title_style = self.styles['Title']
        normal_style = self.styles['Normal']
        
        elements.append(Paragraph(f"Neural Nexus Autonoom Systeem - Dagelijks Rapport", title_style))
        elements.append(Spacer(1, 10*mm))
        
        elements.append(Paragraph(f"Datum: {date_str}", normal_style))
        elements.append(Spacer(1, 5*mm))
        
        # KPI Analytics (Phase 3.1 & 3.2 integrated)
        data = [
            ["KPI", "Waarde", "Status"],
            ["Solana Quant Bot Winst", f"${stats.get('profit', 0.00)}", "Actief" if stats.get('bot_active') else "Slapend"],
            ["Code Health Score", f"{stats.get('health', 100)}/100", "OK" if stats.get('health', 100) > 80 else "WARNING"],
            ["Aantal Super-Edges", str(stats.get('edges', 0)), "Normaal"],
            ["Systeem Uptime", f"{stats.get('uptime', 0)} uur", "Stabiel"]
        ]
        
        table = Table(data, colWidths=[60*mm, 50*mm, 40*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2c3e50')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#ecf0f1')),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 10*mm))
        elements.append(Paragraph("Dit rapport is autonoom gegenereerd door Neural Nexus Phase 3 Architectuur.", normal_style))
        
        doc.build(elements)
        return filepath

if __name__ == "__main__":
    exporter = PDFExporter()
    stats = {
        'profit': 125.50,
        'bot_active': True,
        'health': 100,
        'edges': 3,
        'uptime': 24
    }
    path = exporter.generate_daily_report(stats)
    print(f"[Fase 3.2] PDF Genereert succesvol op: {path}")
