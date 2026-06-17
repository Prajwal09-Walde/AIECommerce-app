import json
import asyncio
import time
import re
import urllib.request
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Transaction, Product
from google import genai
import os

# Helper: local vector chunking
def retrieve_guidelines(guidelines_text, query, top_k=3):
    if not guidelines_text or not guidelines_text.strip():
        return []
    
    # Paragraph split
    paragraphs = [p.strip() for p in re.split(r'\n\n+', guidelines_text) if len(p.strip()) > 10]
    chunks = []
    for p in paragraphs:
        sentences = re.findall(r'[^.!?]+[.!?]+', p) or [p]
        for i in range(0, len(sentences), 2):
            chunk = " ".join(sentences[i:i+2]).strip()
            if len(chunk) > 10:
                chunks.append(chunk)
                
    if not chunks:
        return []
        
    query_tokens = [t.lower() for t in re.sub(r'[^\w\s]', '', query).split() if len(t) > 2]
    if not query_tokens:
        return chunks[:top_k]
        
    scored_chunks = []
    for chunk in chunks:
        chunk_lower = chunk.lower()
        score = 0
        for token in query_tokens:
            if token in chunk_lower:
                score += 1
                if re.search(r'\b' + re.escape(token) + r'\b', chunk_lower):
                    score += 1.5
        scored_chunks.append((chunk, score))
        
    scored_chunks = [sc for sc in scored_chunks if sc[1] > 0]
    scored_chunks.sort(key=lambda x: x[1], reverse=True)
    return [sc[0] for sc in scored_chunks][:top_k]

@csrf_exempt
def initialize_data(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
    
    try:
        data = json.loads(request.body)
        transactions_list = data.get("transactions", [])
        
        # Clear tables
        Transaction.objects.all().delete()
        Product.objects.all().delete()
        
        # Bulk Transaction creation
        new_transactions = []
        unique_products = {}
        
        for t in transactions_list:
            # Parse datetime
            p_date = t.get("purchaseDate", "")
            try:
                purchase_date = timezone.datetime.fromisoformat(p_date.replace("Z", "+00:00"))
            except Exception:
                purchase_date = timezone.now()
                
            new_transactions.append(Transaction(
                user_id=t.get("userId", ""),
                product_id=t.get("productId", ""),
                category=t.get("category", "General"),
                price=float(t.get("price", 0)),
                discount=float(t.get("discount", 0)),
                final_price=float(t.get("finalPrice", 0)),
                payment_method=t.get("paymentMethod", "Other"),
                purchase_date=purchase_date
            ))
            
            p_id = t.get("productId", "")
            if p_id not in unique_products:
                # Stock formula based on product ID character hash
                chars_hash = sum(ord(c) for c in p_id)
                stock = (chars_hash % 80) + 20
                unique_products[p_id] = {
                    "product_id": p_id,
                    "name": f"Product-{p_id}",
                    "category": t.get("category", "General"),
                    "price": float(t.get("price", 0)),
                    "stock": stock
                }
                
        # Bulk insert
        Transaction.objects.bulk_create(new_transactions)
        
        new_products = [Product(**p) for p in unique_products.values()]
        Product.objects.bulk_create(new_products)
        
        return JsonResponse({
            "message": "Data initialized successfully in SQLite database.",
            "transactions_count": len(new_transactions),
            "products_count": len(new_products)
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def reset_data(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
    
    Transaction.objects.all().delete()
    Product.objects.all().delete()
    return JsonResponse({"message": "SQLite database has been wiped clean."})

import random

def seed_synthetic_data():
    if Transaction.objects.count() > 0:
        return
        
    categories = ["Electronics", "Clothing", "Home", "Books"]
    payment_methods = ["Credit Card", "PayPal", "Bank Transfer", "Crypto"]
    
    # Fetch real e-commerce items from Fake Store API
    api_url = "https://fakestoreapi.com/products"
    fetched_products = []
    
    try:
        req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            fetched_products = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching real market data: {e}. Falling back to synthetic seeder.")
        fetched_products = []

    new_products = []
    
    if fetched_products:
        # Category mapper to align Fake Store API with our UI layout
        def map_category(api_cat):
            cat_lower = api_cat.lower()
            if "electronics" in cat_lower:
                return "Electronics"
            elif "clothing" in cat_lower:
                return "Clothing"
            elif "jewelery" in cat_lower:
                return "Home"
            else:
                return "Books"
                
        for item in fetched_products:
            p_id = f"P-{item.get('id', random.randint(100, 999))}"
            name = item.get("title", f"Product-{p_id}")
            price = float(item.get("price", 10.0))
            cat = map_category(item.get("category", "Books"))
            
            chars_hash = sum(ord(c) for c in p_id)
            stock = (chars_hash % 80) + 20
            
            new_products.append(Product(
                product_id=p_id,
                name=name,
                category=cat,
                price=price,
                stock=stock
            ))
            
        Product.objects.bulk_create(new_products)
        
        # Build products pool for transaction seeder
        products_by_category = {}
        for p in new_products:
            if p.category not in products_by_category:
                products_by_category[p.category] = []
            products_by_category[p.category].append(p)
            
        # Fallback if any category has no products
        for cat in categories:
            if cat not in products_by_category:
                products_by_category[cat] = [
                    Product.objects.create(
                        product_id=f"P-fallback-{random.randint(100, 999)}",
                        name=f"Fallback {cat} Product",
                        category=cat,
                        price=29.99,
                        stock=50
                    )
                ]
                
        # Generate 150 simulated transactions from real items
        new_tx = []
        start_date = timezone.now() - timezone.timedelta(days=15)
        
        for i in range(150):
            offset_hours = (i / 150) * 15 * 24
            p_date = start_date + timezone.timedelta(hours=offset_hours)
            
            cat = random.choice(categories)
            product = random.choice(products_by_category[cat])
            
            discount = random.choice([0, 10, 15, 20])
            final_price = product.price * (1 - discount/100)
            
            user_id = f"user_{random.randint(100, 250)}@example.com"
            pm = random.choice(payment_methods)
            
            new_tx.append(Transaction(
                user_id=user_id,
                product_id=product.product_id,
                category=cat,
                price=product.price,
                discount=discount,
                final_price=final_price,
                payment_method=pm,
                purchase_date=p_date
            ))
            
        Transaction.objects.bulk_create(new_tx)
        
    else:
        # Fallback to local mock data
        products_pool = {
            "Electronics": [("P-101", "Wireless Headphones", 199.99), ("P-102", "Mechanical Keyboard", 129.99), ("P-103", "Smart Watch Series 5", 299.99)],
            "Clothing": [("P-201", "Ergonomic Office Hoodie", 89.99), ("P-202", "Running Shoes", 119.99)],
            "Home": [("P-301", "Ergonomic Office Chair", 349.99), ("P-302", "Desk Lamp", 49.99)],
            "Books": [("P-401", "AI Engineering Guide", 59.99), ("P-402", "Design Systems Cookbook", 39.99)]
        }
        
        # Generate Products
        for cat, items in products_pool.items():
            for p_id, name, price in items:
                chars_hash = sum(ord(c) for c in p_id)
                stock = (chars_hash % 80) + 20
                new_products.append(Product(
                    product_id=p_id,
                    name=name,
                    category=cat,
                    price=price,
                    stock=stock
                ))
        Product.objects.bulk_create(new_products)
        
        # Generate Transactions
        new_tx = []
        start_date = timezone.now() - timezone.timedelta(days=15)
        
        for i in range(150):
            offset_hours = (i / 150) * 15 * 24
            p_date = start_date + timezone.timedelta(hours=offset_hours)
            
            cat = random.choice(categories)
            p_item = random.choice(products_pool[cat])
            p_id, p_name, price = p_item
            
            discount = random.choice([0, 10, 15, 20])
            final_price = price * (1 - discount/100)
            
            user_id = f"user_{random.randint(100, 250)}@example.com"
            pm = random.choice(payment_methods)
            
            new_tx.append(Transaction(
                user_id=user_id,
                product_id=p_id,
                category=cat,
                price=price,
                discount=discount,
                final_price=final_price,
                payment_method=pm,
                purchase_date=p_date
            ))
            
        Transaction.objects.bulk_create(new_tx)
def stream_transactions(request):
    """
    Server-Sent Events (SSE) live-ticking transaction stream.
    Queries the database and pushes transactions sequentially, then loops infinitely.
    """
    seed_synthetic_data()
    speed = float(request.GET.get("speed", 0.5))
    
    async def event_stream():
        yield "event: start\ndata: {}\n\n"
        
        # Stream historical transactions
        async for t in Transaction.objects.all().order_by("purchase_date"):
            payload = {
                "userId": t.user_id,
                "productId": t.product_id,
                "category": t.category,
                "price": t.price,
                "discount": t.discount,
                "finalPrice": t.final_price,
                "paymentMethod": t.payment_method,
                "purchaseDate": t.purchase_date.isoformat()
            }
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(speed)
            
        # Continue generating real-time transactions endlessly
        categories = ["Electronics", "Clothing", "Home", "Books"]
        payment_methods = ["Credit Card", "PayPal", "Bank Transfer", "Crypto"]
        
        # Load products asynchronously
        products = [p async for p in Product.objects.all()]
        
        # Group products by category
        products_by_category = {}
        for p in products:
            if p.category not in products_by_category:
                products_by_category[p.category] = []
            products_by_category[p.category].append(p)
            
        try:
            while True:
                cat = random.choice(categories)
                prod_list = products_by_category.get(cat, [])
                if not prod_list:
                    product = random.choice(products) if products else None
                else:
                    product = random.choice(prod_list)
                    
                if product:
                    discount = random.choice([0, 10, 15, 20])
                    final_price = product.price * (1 - discount/100)
                    user_id = f"user_{random.randint(100, 250)}@example.com"
                    pm = random.choice(payment_methods)
                    now = timezone.now()
                    
                    # Save newly created transaction to database asynchronously
                    t = await Transaction.objects.acreate(
                        user_id=user_id,
                        product_id=product.product_id,
                        category=product.category,
                        price=product.price,
                        discount=discount,
                        final_price=final_price,
                        payment_method=pm,
                        purchase_date=now
                    )
                    
                    payload = {
                        "userId": t.user_id,
                        "productId": t.product_id,
                        "category": t.category,
                        "price": t.price,
                        "discount": t.discount,
                        "finalPrice": t.final_price,
                        "paymentMethod": t.payment_method,
                        "purchaseDate": t.purchase_date.isoformat()
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
                
                await asyncio.sleep(speed)
        except asyncio.CancelledError:
            # Handle clean client disconnect
            pass

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


@csrf_exempt
def rag_analysis(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
        
    logs = []
    try:
        data = json.loads(request.body)
        focus = data.get("focus", "price optimization")
        custom_guidelines = data.get("guidelines", "")
        
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Python RAG analyst initialized.")
        
        # 1. Pull sqlite entries
        products = list(Product.objects.all().values())
        transactions = list(Transaction.objects.all().values())
        
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Context acquired: {len(products)} products and {len(transactions)} transactions.")
        
        # 2. Run in-memory TF-IDF context retrieval
        retrieved_chunks = retrieve_guidelines(custom_guidelines, focus, 3)
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Context matching retrieved {len(retrieved_chunks)} guideline clauses.")
        
        # 3. Calculate statistics for Gemini Context
        total_revenue = sum(t["final_price"] for t in transactions)
        avg_order = (total_revenue / len(transactions)) if transactions else 0
        low_stock = sum(1 for p in products if p["stock"] < 10)
        
        categories = {}
        for p in products:
            categories[p["category"]] = categories.get(p["category"], 0) + 1
            
        system_prompt = f"""You are a world-class AI eCommerce Data Analyst. Your job is to conduct a professional, data-driven synthesis of store database metrics combined with retrieved business objectives/guidelines.
        
Focus of this Analysis: "{focus}"

=== RETRIEVED BUSINESS/COMPETITOR GUIDELINES ===
{chr(10).join(f'[Chunk {i+1}]: {c}' for i, c in enumerate(retrieved_chunks)) if retrieved_chunks else "No specific guidelines provided."}

=== STORE DATABASE METRICS ===
- Total Store Revenue: ${total_revenue:.2f}
- Total Completed Orders: {len(transactions)}
- Average Order Value: ${avg_order:.2f}
- Unique Registered Customers: {len(set(t['user_id'] for t in transactions))}
- Products count in inventory: {len(products)}
- Low Stock Products Count (< 10 items): {low_stock}
- Category distribution: {json.dumps(categories)}

Products Inventory details:
{chr(10).join(f"- {p['name']} (Category: {p['category']}, Price: ${p['price']}, Stock: {p['stock']})" for p in products[:15])}

=== INSTRUCTIONS ===
Perform a deep analysis on the data with respect to the Focus of Analysis ("{focus}"). You must synthesize the Database Metrics alongside the Retrieved Business Guidelines.
Your final response MUST be a JSON object ONLY, valid for JSON.parse, using the exact structure specified below. Do not output anything before or after the JSON code block.

=== OUTPUT JSON FORMAT ===
{{
  "summary": "Provide a executive summary paragraph summarizing store health, focusing on the '{focus}' topic and combining SQLite metrics and retrieved guidelines.",
  "kpis": {{
    "totalRevenue": "${total_revenue:,.2f}",
    "totalOrders": {len(transactions)},
    "averageOrderValue": "${avg_order:,.2f}",
    "lowStockAlerts": {low_stock},
    "activeUsers": {len(set(t['user_id'] for t in transactions))}
  }},
  "sections": [
    {{
      "title": "Focus Analysis & Guidelines Synthesis",
      "content": "Deep analysis of '{focus}' integrating matching database facts and business guidelines."
    }},
    {{
      "title": "Inventory and Pricing Adjustments",
      "content": "Recommendations regarding product stocking, discounts, or risk mitigations."
    }}
  ],
  "swot": {{
    "strengths": ["Identify 2 strengths based on data"],
    "weaknesses": ["Identify 2 weaknesses based on data"],
    "opportunities": ["Identify 2 opportunities based on data & guidelines"],
    "threats": ["Identify 2 threats based on data & guidelines"]
  }},
  "actionableSteps": [
    {{
      "task": "Specific task name",
      "reason": "Clear explanation based on data/guidelines",
      "priority": "High"
    }},
    {{
      "task": "Specific task name",
      "reason": "Clear explanation",
      "priority": "Medium"
    }}
  ]
}}"""
        
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Packaging prompt. Dispatching request to Gemini API...")
        
        # Call Gemini in Python
        # Set api key from env
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] ERROR: GEMINI_API_KEY not set.")
        return JsonResponse({"success": False, "logs": logs, "error": "GEMINI_API_KEY not configured"}, status=500)
            
        # NEW (correct)
        client = genai.Client(api_key=api_key)
        result = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=system_prompt
        )
        response_text = result.text.strip()
        
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Generation completed successfully.")
        
        # Clean response
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        analysis = json.loads(response_text)
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Synthesis parsed successfully.")
        
        return JsonResponse({
            "success": True,
            "logs": logs,
            "retrievedChunks": retrieved_chunks,
            "analysis": analysis
        })
    except Exception as e:
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] ERROR: {str(e)}")
        return JsonResponse({
            "success": False,
            "logs": logs,
            "error": str(e)
        }, status=500)

def kaggle_stats(request):
    """Returns summary statistics for the Kaggle analytics dashboard."""
    if request.method != "GET":
        return JsonResponse({"error": "GET request expected"}, status=405)

    products = list(Product.objects.all().values())
    transactions = list(Transaction.objects.all().values())

    if not transactions:
        return JsonResponse({"hasData": False})

    total_revenue = sum(t["final_price"] for t in transactions)
    total_transactions = len(transactions)
    avg_discount = sum(t["discount"] for t in transactions) / total_transactions
    unique_users = len(set(t["user_id"] for t in transactions))
    unique_products = len(set(t["product_id"] for t in transactions))

    # Category breakdown
    category_map = {}
    for t in transactions:
        cat = t["category"]
        if cat not in category_map:
            category_map[cat] = {"revenue": 0, "transactions": 0}
        category_map[cat]["revenue"] += t["final_price"]
        category_map[cat]["transactions"] += 1
    categories = [{"name": k, **v} for k, v in category_map.items()]

    # Payment method breakdown
    payment_map = {}
    for t in transactions:
        pm = t["payment_method"]
        if pm not in payment_map:
            payment_map[pm] = {"revenue": 0, "transactions": 0}
        payment_map[pm]["revenue"] += t["final_price"]
        payment_map[pm]["transactions"] += 1
    payments = [{"name": k, **v} for k, v in payment_map.items()]

    # Daily revenue trend
    trend_map = {}
    for t in transactions:
        date_str = t["purchase_date"].strftime("%Y-%m-%d")
        if date_str not in trend_map:
            trend_map[date_str] = {"revenue": 0, "transactions": 0}
        trend_map[date_str]["revenue"] += t["final_price"]
        trend_map[date_str]["transactions"] += 1
    trends = [{"date": k, **v} for k, v in sorted(trend_map.items())]

    return JsonResponse({
        "hasData": True,
        "summary": {
            "totalRevenue": total_revenue,
            "totalTransactions": total_transactions,
            "averageDiscount": avg_discount,
            "uniqueUsers": unique_users,
            "uniqueProducts": unique_products,
        },
        "categories": categories,
        "payments": payments,
        "trends": trends,
    })


def kaggle_transactions(request):
    """Returns paginated, filtered transactions for the Kaggle explorer table."""
    if request.method != "GET":
        return JsonResponse({"error": "GET request expected"}, status=405)

    page = int(request.GET.get("page", 1))
    limit = int(request.GET.get("limit", 50))
    search = request.GET.get("search", "").strip()
    category = request.GET.get("category", "").strip()
    payment_method = request.GET.get("paymentMethod", "").strip()

    qs = Transaction.objects.all().order_by("-purchase_date")

    if search:
        qs = qs.filter(user_id__icontains=search) | qs.filter(product_id__icontains=search)
    if category:
        qs = qs.filter(category=category)
    if payment_method:
        qs = qs.filter(payment_method=payment_method)

    total = qs.count()
    total_pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit
    page_qs = qs[offset:offset + limit]

    transactions = []
    for t in page_qs:
        transactions.append({
            "userId": t.user_id,
            "productId": t.product_id,
            "category": t.category,
            "price": t.price,
            "discount": t.discount,
            "finalPrice": t.final_price,
            "paymentMethod": t.payment_method,
            "purchaseDate": t.purchase_date.isoformat(),
        })

    return JsonResponse({
        "transactions": transactions,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages,
        }
    })