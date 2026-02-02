"""
Invoice Service - Generate and manage invoices for HR Bank
Supports PDF generation, email delivery, and tax calculations.
"""

from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from database import db
from auth.dependencies import get_current_user, require_role
import uuid
import os

router = APIRouter(prefix="/invoices", tags=["Invoices"])


# ============== Tax Rates by Province ==============

PROVINCIAL_TAX_RATES = {
    "AB": {"gst": 0.05, "pst": 0.00, "hst": 0.00, "name": "Alberta"},
    "BC": {"gst": 0.05, "pst": 0.07, "hst": 0.00, "name": "British Columbia"},
    "MB": {"gst": 0.05, "pst": 0.07, "hst": 0.00, "name": "Manitoba"},
    "NB": {"gst": 0.00, "pst": 0.00, "hst": 0.15, "name": "New Brunswick"},
    "NL": {"gst": 0.00, "pst": 0.00, "hst": 0.15, "name": "Newfoundland and Labrador"},
    "NS": {"gst": 0.00, "pst": 0.00, "hst": 0.15, "name": "Nova Scotia"},
    "NT": {"gst": 0.05, "pst": 0.00, "hst": 0.00, "name": "Northwest Territories"},
    "NU": {"gst": 0.05, "pst": 0.00, "hst": 0.00, "name": "Nunavut"},
    "ON": {"gst": 0.00, "pst": 0.00, "hst": 0.13, "name": "Ontario"},
    "PE": {"gst": 0.00, "pst": 0.00, "hst": 0.15, "name": "Prince Edward Island"},
    "QC": {"gst": 0.05, "pst": 0.09975, "hst": 0.00, "name": "Quebec"},
    "SK": {"gst": 0.05, "pst": 0.06, "hst": 0.00, "name": "Saskatchewan"},
    "YT": {"gst": 0.05, "pst": 0.00, "hst": 0.00, "name": "Yukon"},
}


# ============== Models ==============

class InvoiceLineItem(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float
    amount: float


class InvoiceCreate(BaseModel):
    """Create invoice manually (admin)"""
    customer_id: str
    customer_type: str  # workforce, employer, institution
    line_items: List[InvoiceLineItem]
    province: str = "ON"
    notes: Optional[str] = None
    due_days: int = 30


class Invoice(BaseModel):
    invoice_id: str
    invoice_number: str
    customer_id: str
    customer_type: str
    customer_name: str
    customer_email: str
    customer_address: Optional[str]
    line_items: List[dict]
    subtotal: float
    gst_amount: float
    pst_amount: float
    hst_amount: float
    total_tax: float
    total_amount: float
    province: str
    status: str  # draft, sent, paid, overdue, cancelled
    issue_date: str
    due_date: str
    paid_date: Optional[str]
    payment_method: Optional[str]
    stripe_payment_id: Optional[str]
    notes: Optional[str]
    created_date: str


# ============== Helper Functions ==============

def calculate_taxes(subtotal: float, province: str) -> dict:
    """Calculate GST, PST, HST based on province"""
    rates = PROVINCIAL_TAX_RATES.get(province.upper(), PROVINCIAL_TAX_RATES["ON"])
    
    gst_amount = round(subtotal * rates["gst"], 2)
    pst_amount = round(subtotal * rates["pst"], 2)
    hst_amount = round(subtotal * rates["hst"], 2)
    total_tax = round(gst_amount + pst_amount + hst_amount, 2)
    
    return {
        "gst_rate": rates["gst"],
        "pst_rate": rates["pst"],
        "hst_rate": rates["hst"],
        "gst_amount": gst_amount,
        "pst_amount": pst_amount,
        "hst_amount": hst_amount,
        "total_tax": total_tax,
        "province_name": rates["name"]
    }


async def generate_invoice_number() -> str:
    """Generate sequential invoice number"""
    # Get current year
    year = datetime.now().year
    
    # Get last invoice number for this year
    last_invoice = await db.invoices.find_one(
        {"invoice_number": {"$regex": f"^INV-{year}-"}},
        sort=[("invoice_number", -1)]
    )
    
    if last_invoice:
        last_num = int(last_invoice["invoice_number"].split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"INV-{year}-{new_num:05d}"


async def get_customer_info(customer_id: str, customer_type: str) -> dict:
    """Get customer details for invoice"""
    if customer_type == "workforce":
        profile = await db.workforce_profiles.find_one({"user_id": customer_id})
        if profile:
            return {
                "name": profile.get("full_name", ""),
                "email": profile.get("email", ""),
                "address": f"{profile.get('city', '')}, {profile.get('province', 'ON')}",
                "province": profile.get("province", "ON")
            }
    elif customer_type == "employer":
        profile = await db.employer_profiles.find_one({"user_id": customer_id})
        if profile:
            return {
                "name": profile.get("company_name", profile.get("business_name", "")),
                "email": profile.get("email", ""),
                "address": f"{profile.get('address', '')}, {profile.get('city', '')}, {profile.get('province', 'ON')}",
                "province": profile.get("province", "ON")
            }
    elif customer_type == "institution":
        profile = await db.institution_profiles.find_one({"user_id": customer_id})
        if profile:
            return {
                "name": profile.get("institution_name", ""),
                "email": profile.get("email", ""),
                "address": f"{profile.get('address', '')}, {profile.get('city', '')}, {profile.get('province', 'ON')}",
                "province": profile.get("province", "ON")
            }
    
    return {"name": "Unknown", "email": "", "address": "", "province": "ON"}


# ============== Invoice Generation ==============

async def create_invoice(
    customer_id: str,
    customer_type: str,
    line_items: List[dict],
    province: Optional[str] = None,
    notes: Optional[str] = None,
    due_days: int = 30,
    payment_id: Optional[str] = None,
    auto_paid: bool = False
) -> dict:
    """
    Create a new invoice.
    Called internally when credential is purchased or manually by admin.
    """
    # Get customer info
    customer = await get_customer_info(customer_id, customer_type)
    province = province or customer.get("province", "ON")
    
    # Calculate totals
    subtotal = sum(item.get("amount", item.get("unit_price", 0) * item.get("quantity", 1)) for item in line_items)
    taxes = calculate_taxes(subtotal, province)
    total_amount = round(subtotal + taxes["total_tax"], 2)
    
    # Generate invoice
    invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
    invoice_number = await generate_invoice_number()
    now = datetime.now(timezone.utc)
    due_date = now + timedelta(days=due_days)
    
    invoice = {
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "customer_id": customer_id,
        "customer_type": customer_type,
        "customer_name": customer["name"],
        "customer_email": customer["email"],
        "customer_address": customer["address"],
        "line_items": line_items,
        "subtotal": subtotal,
        "gst_rate": taxes["gst_rate"],
        "pst_rate": taxes["pst_rate"],
        "hst_rate": taxes["hst_rate"],
        "gst_amount": taxes["gst_amount"],
        "pst_amount": taxes["pst_amount"],
        "hst_amount": taxes["hst_amount"],
        "total_tax": taxes["total_tax"],
        "total_amount": total_amount,
        "province": province,
        "province_name": taxes["province_name"],
        "status": "paid" if auto_paid else "sent",
        "issue_date": now.isoformat(),
        "due_date": due_date.isoformat(),
        "paid_date": now.isoformat() if auto_paid else None,
        "payment_method": "stripe" if payment_id else None,
        "stripe_payment_id": payment_id,
        "notes": notes,
        "created_date": now.isoformat()
    }
    
    await db.invoices.insert_one(invoice)
    
    return invoice


# ============== PDF Generation ==============

def generate_invoice_pdf(invoice: dict) -> bytes:
    """Generate PDF invoice using reportlab"""
    from io import BytesIO
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Right', alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='Center', alignment=TA_CENTER))
    
    elements = []
    
    # Header
    elements.append(Paragraph("<b>HR BANK</b>", styles['Title']))
    elements.append(Paragraph("Workforce Management Platform", styles['Normal']))
    elements.append(Paragraph("Windsor-Essex, Ontario, Canada", styles['Normal']))
    elements.append(Paragraph("support@hrbank.ca | www.hrbank.ca", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Invoice title
    elements.append(Paragraph(f"<b>INVOICE #{invoice['invoice_number']}</b>", styles['Heading1']))
    elements.append(Spacer(1, 10))
    
    # Invoice details
    issue_date = datetime.fromisoformat(invoice['issue_date'].replace('Z', '+00:00')).strftime('%B %d, %Y')
    due_date = datetime.fromisoformat(invoice['due_date'].replace('Z', '+00:00')).strftime('%B %d, %Y')
    
    info_data = [
        ['Issue Date:', issue_date, 'Status:', invoice['status'].upper()],
        ['Due Date:', due_date, 'Invoice ID:', invoice['invoice_id']],
    ]
    info_table = Table(info_data, colWidths=[1.2*inch, 2*inch, 1.2*inch, 2*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Bill To
    elements.append(Paragraph("<b>Bill To:</b>", styles['Normal']))
    elements.append(Paragraph(invoice['customer_name'], styles['Normal']))
    elements.append(Paragraph(invoice.get('customer_email', ''), styles['Normal']))
    elements.append(Paragraph(invoice.get('customer_address', ''), styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Line items
    items_data = [['Description', 'Qty', 'Unit Price', 'Amount']]
    for item in invoice['line_items']:
        items_data.append([
            item['description'],
            str(item.get('quantity', 1)),
            f"${item.get('unit_price', item.get('amount', 0)):.2f}",
            f"${item.get('amount', 0):.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[3.5*inch, 0.8*inch, 1.2*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 10))
    
    # Totals
    totals_data = [
        ['Subtotal:', f"${invoice['subtotal']:.2f}"],
    ]
    
    if invoice.get('gst_amount', 0) > 0:
        totals_data.append([f"GST ({invoice['gst_rate']*100:.1f}%):", f"${invoice['gst_amount']:.2f}"])
    if invoice.get('pst_amount', 0) > 0:
        totals_data.append([f"PST ({invoice['pst_rate']*100:.2f}%):", f"${invoice['pst_amount']:.2f}"])
    if invoice.get('hst_amount', 0) > 0:
        totals_data.append([f"HST ({invoice['hst_rate']*100:.1f}%):", f"${invoice['hst_amount']:.2f}"])
    
    totals_data.append(['Total:', f"${invoice['total_amount']:.2f}"])
    
    totals_table = Table(totals_data, colWidths=[5.5*inch, 1.2*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 30))
    
    # Notes
    if invoice.get('notes'):
        elements.append(Paragraph("<b>Notes:</b>", styles['Normal']))
        elements.append(Paragraph(invoice['notes'], styles['Normal']))
        elements.append(Spacer(1, 20))
    
    # Footer
    elements.append(Paragraph("Thank you for your business!", styles['Center']))
    elements.append(Paragraph("Questions? Contact support@hrbank.ca", styles['Center']))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


# ============== API Endpoints ==============

@router.get("/my-invoices")
async def get_my_invoices(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all invoices for current user"""
    query = {"customer_id": current_user["user_id"]}
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_date", -1).to_list(100)
    
    # Calculate summary
    total_paid = sum(i["total_amount"] for i in invoices if i["status"] == "paid")
    total_pending = sum(i["total_amount"] for i in invoices if i["status"] in ["sent", "overdue"])
    
    return {
        "success": True,
        "data": {
            "invoices": invoices,
            "total": len(invoices),
            "summary": {
                "total_paid": total_paid,
                "total_pending": total_pending,
                "paid_count": len([i for i in invoices if i["status"] == "paid"]),
                "pending_count": len([i for i in invoices if i["status"] in ["sent", "overdue"]])
            }
        }
    }


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get invoice details"""
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Check access
    if invoice["customer_id"] != current_user["user_id"] and current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {"success": True, "data": invoice}


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download invoice as PDF"""
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Check access
    if invoice["customer_id"] != current_user["user_id"] and current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate PDF
    pdf_bytes = generate_invoice_pdf(invoice)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=HRBank_{invoice['invoice_number']}.pdf"
        }
    )


@router.get("/tax-rates/{province}")
async def get_tax_rates(province: str):
    """Get tax rates for a province"""
    rates = PROVINCIAL_TAX_RATES.get(province.upper())
    if not rates:
        raise HTTPException(status_code=404, detail="Province not found")
    
    return {
        "success": True,
        "data": {
            "province_code": province.upper(),
            "province_name": rates["name"],
            "gst_rate": rates["gst"],
            "pst_rate": rates["pst"],
            "hst_rate": rates["hst"],
            "total_rate": rates["gst"] + rates["pst"] + rates["hst"]
        }
    }


# ============== Admin Endpoints ==============

@router.post("/admin/create")
async def admin_create_invoice(
    invoice_data: InvoiceCreate,
    current_user: dict = Depends(require_role("admin"))
):
    """Create invoice manually (Admin only)"""
    line_items = [item.dict() for item in invoice_data.line_items]
    
    invoice = await create_invoice(
        customer_id=invoice_data.customer_id,
        customer_type=invoice_data.customer_type,
        line_items=line_items,
        province=invoice_data.province,
        notes=invoice_data.notes,
        due_days=invoice_data.due_days
    )
    
    return {
        "success": True,
        "data": {
            "invoice_id": invoice["invoice_id"],
            "invoice_number": invoice["invoice_number"],
            "total_amount": invoice["total_amount"]
        },
        "message": "Invoice created successfully"
    }


@router.get("/admin/all")
async def admin_list_invoices(
    status: Optional[str] = None,
    customer_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: dict = Depends(require_role("admin"))
):
    """List all invoices (Admin only)"""
    query = {}
    if status:
        query["status"] = status
    if customer_type:
        query["customer_type"] = customer_type
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_date", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.invoices.count_documents(query)
    
    # Summary stats
    all_invoices = await db.invoices.find({}, {"status": 1, "total_amount": 1}).to_list(10000)
    
    summary = {
        "total_revenue": sum(i["total_amount"] for i in all_invoices if i["status"] == "paid"),
        "pending_amount": sum(i["total_amount"] for i in all_invoices if i["status"] in ["sent", "overdue"]),
        "paid_count": len([i for i in all_invoices if i["status"] == "paid"]),
        "pending_count": len([i for i in all_invoices if i["status"] in ["sent", "overdue"]]),
        "overdue_count": len([i for i in all_invoices if i["status"] == "overdue"])
    }
    
    return {
        "success": True,
        "data": {
            "invoices": invoices,
            "total": total,
            "summary": summary
        }
    }


@router.patch("/admin/{invoice_id}/status")
async def admin_update_invoice_status(
    invoice_id: str,
    status: str,
    current_user: dict = Depends(require_role("admin"))
):
    """Update invoice status (Admin only)"""
    valid_statuses = ["draft", "sent", "paid", "overdue", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update = {"status": status, "updated_date": datetime.now(timezone.utc).isoformat()}
    if status == "paid":
        update["paid_date"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.invoices.update_one({"invoice_id": invoice_id}, {"$set": update})
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"success": True, "message": f"Invoice status updated to {status}"}


# ============== Integration with Credential Payments ==============

async def create_credential_invoice(
    user_id: str,
    credential_name: str,
    institution_name: str,
    price: float,
    province: str,
    stripe_payment_id: str
) -> dict:
    """
    Create invoice for credential purchase.
    Called from credential_payments.py after successful payment.
    """
    line_items = [{
        "description": f"Credential Verification: {credential_name} from {institution_name}",
        "quantity": 1,
        "unit_price": price,
        "amount": price
    }]
    
    invoice = await create_invoice(
        customer_id=user_id,
        customer_type="workforce",
        line_items=line_items,
        province=province,
        notes="Payment processed via Stripe",
        due_days=0,
        payment_id=stripe_payment_id,
        auto_paid=True
    )
    
    return invoice


# ============== Integration with Field Service Billing ==============

async def create_field_service_invoice(
    employer_id: str,
    transaction: dict
) -> dict:
    """
    Create invoice for field service route billing.
    Called from field_service_billing.py after successful payment.
    """
    is_bulk = transaction.get("is_bulk", False)
    
    if is_bulk:
        routes_count = transaction.get("routes_count", len(transaction.get("route_ids", [])))
        description = f"Field Service Routes ({routes_count} routes)"
    else:
        description = f"Field Service Route: {transaction.get('route_name', 'Route')} ({transaction.get('route_type', 'custom')})"
    
    line_items = [{
        "description": description,
        "quantity": transaction.get("routes_count", 1) if is_bulk else 1,
        "unit_price": transaction.get("subtotal_cad", 0),
        "amount": transaction.get("subtotal_cad", 0)
    }]
    
    # Add platform fee as separate line item
    if transaction.get("platform_fee_cad", 0) > 0:
        line_items.append({
            "description": "Platform Service Fee (15%)",
            "quantity": 1,
            "unit_price": transaction.get("platform_fee_cad", 0),
            "amount": transaction.get("platform_fee_cad", 0)
        })
    
    invoice = await create_invoice(
        customer_id=employer_id,
        customer_type="employer",
        line_items=line_items,
        province=transaction.get("province", "ON"),
        notes=f"Field Service Billing - Transaction ID: {transaction.get('transaction_id', '')}",
        due_days=0,
        payment_id=transaction.get("session_id"),
        auto_paid=True
    )
    
    return invoice

