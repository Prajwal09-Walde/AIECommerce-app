import json
import asyncio
import time
import re
import urllib.request
import random
import os
import statistics
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db.models import Sum, Count
from .models import Transaction, Product, Alert, GoalPlan, PriceHistory, AgentMessage
from google import genai
from google.genai import types

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
    seed_synthetic_data()
    speed = float(request.GET.get("speed", 0.5))
    
    async def event_stream():
        yield "event: start\ndata: {}\n\n"
        
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
            
        categories = ["Electronics", "Clothing", "Home", "Books"]
        payment_methods = ["Credit Card", "PayPal", "Bank Transfer", "Crypto"]
        
        products = [p async for p in Product.objects.all()]
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
        
        products = list(Product.objects.all().values())
        transactions = list(Transaction.objects.all().values())
        
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Context acquired: {len(products)} products and {len(transactions)} transactions.")
        
        retrieved_chunks = retrieve_guidelines(custom_guidelines, focus, 3)
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Context matching retrieved {len(retrieved_chunks)} guideline clauses.")
        
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
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] ERROR: GEMINI_API_KEY not set.")
            return JsonResponse({"success": False, "logs": logs, "error": "GEMINI_API_KEY not configured"}, status=500)
            
        client = genai.Client(api_key=api_key)
        result = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=system_prompt
        )
        response_text = result.text.strip()
        
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Generation completed successfully.")
        
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

    category_map = {}
    for t in transactions:
        cat = t["category"]
        if cat not in category_map:
            category_map[cat] = {"revenue": 0, "transactions": 0}
        category_map[cat]["revenue"] += t["final_price"]
        category_map[cat]["transactions"] += 1
    categories = [{"name": k, **v} for k, v in category_map.items()]

    payment_map = {}
    for t in transactions:
        pm = t["payment_method"]
        if pm not in payment_map:
            payment_map[pm] = {"revenue": 0, "transactions": 0}
        payment_map[pm]["revenue"] += t["final_price"]
        payment_map[pm]["transactions"] += 1
    payments = [{"name": k, **v} for k, v in payment_map.items()]

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


# ─────────────────────────────────────────────────────────────
# AI eCommerce Agent Views (Python Port)
# ─────────────────────────────────────────────────────────────

SYSTEM_INSTRUCTION = """You are an expert AI eCommerce Analytics Agent embedded in a store management dashboard. You have access to tools that let you query the store's database in real-time.

Your role:
- Answer business questions by querying actual store data
- Provide data-driven insights backed by real numbers
- When asked about trends, use get_revenue_metrics and calculate_statistics
- When asked about products, use query_products and get_inventory_status
- When asked about customers, use get_customer_segments
- When investigating issues, chain multiple tool calls to build a complete picture

Rules:
- ALWAYS use tools to fetch real data. Never fabricate numbers.
- After gathering data, synthesize a clear, actionable answer
- Use specific numbers and percentages from the data
- If data is insufficient, say so honestly
- Keep responses focused and professional
- Format responses with markdown for readability (bold key numbers, use bullet lists)
- Maximum 5 tool calls per question to keep responses fast"""

# ── 1. Analytics ReAct Agent chat endpoint ──

@csrf_exempt
def get_agent_history_api(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET request expected"}, status=405)
    session_id = request.GET.get("sessionId", "").strip()
    if not session_id:
        return JsonResponse({"success": False, "error": "Missing sessionId"}, status=400)
    
    messages = AgentMessage.objects.filter(
        session_id=session_id,
        agent_type="analytics",
        role__in=["user", "agent"]
    ).order_by("created_at")
    
    return JsonResponse([
        {
            "role": m.role,
            "content": m.content,
            "createdAt": m.created_at.isoformat()
        } for m in messages
    ], safe=False)

@csrf_exempt
def clear_agent_history_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
    try:
        data = json.loads(request.body)
        session_id = data.get("sessionId", "").strip()
    except:
        session_id = request.POST.get("sessionId", "").strip()
        
    if not session_id:
        return JsonResponse({"success": False, "error": "Missing sessionId"}, status=400)
        
    AgentMessage.objects.filter(session_id=session_id, agent_type="analytics").delete()
    return JsonResponse({"success": True})

@csrf_exempt
def run_analytics_agent_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
        
    try:
        data = json.loads(request.body)
        user_message = data.get("message", "").strip()
        session_id = data.get("sessionId", "").strip()
        
        if not user_message or not session_id:
            return JsonResponse({"success": False, "error": "Missing message or sessionId"}, status=400)
            
        logs = []
        tool_calls_executed = []
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Python Analytics Agent activated.")
        
        # Save user message
        AgentMessage.objects.create(
            session_id=session_id,
            role="user",
            content=user_message,
            agent_type="analytics"
        )
        
        # Load history
        history_msgs = AgentMessage.objects.filter(session_id=session_id, agent_type="analytics").order_by("created_at")[:20]
        
        # Build contents list
        contents = []
        for h in history_msgs:
            if h.role == "user":
                contents.append(types.Content(role="user", parts=[types.Part.from_text(text=h.content)]))
            elif h.role == "agent":
                contents.append(types.Content(role="model", parts=[types.Part.from_text(text=h.content)]))
                
        # Define local closures to capture logs and tool executions
        def query_products(category: str = None, search: str = None, minPrice: float = None, maxPrice: float = None, lowStockOnly: bool = False, limit: int = 20) -> str:
            """Search and filter products in the store inventory. Returns details including name, category, price, and stock level."""
            logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] 🛠️ query_products: category={category}, search={search}")
            qs = Product.objects.all()
            if category:
                qs = qs.filter(category__icontains=category)
            if search:
                qs = qs.filter(name__icontains=search)
            if minPrice is not None:
                qs = qs.filter(price__gte=minPrice)
            if maxPrice is not None:
                qs = qs.filter(price__lte=maxPrice)
            if lowStockOnly:
                qs = qs.filter(stock__lt=10)
            limit = min(limit or 20, 50)
            products = list(qs[:limit].values())
            res = json.dumps({
                "count": len(products),
                "products": [{"id": str(p["id"]), "name": p["name"], "category": p["category"], "price": p["price"], "stock": p["stock"]} for p in products]
            })
            tool_calls_executed.append({"tool": "query_products", "args": {"category": category, "search": search, "minPrice": minPrice, "maxPrice": maxPrice, "lowStockOnly": lowStockOnly, "limit": limit}, "result": json.loads(res)})
            return res

        def query_transactions(category: str = None, paymentMethod: str = None, daysBack: int = None, limit: int = 30) -> str:
            """Query raw transaction records from the store. Returns userId, productId, category, price, discount, finalPrice, and paymentMethod."""
            logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] 🛠️ query_transactions: category={category}, paymentMethod={paymentMethod}")
            qs = Transaction.objects.all().order_by("-purchase_date")
            if category:
                qs = qs.filter(category__icontains=category)
            if paymentMethod:
                qs = qs.filter(payment_method__icontains=paymentMethod)
            if daysBack:
                cutoff = timezone.now() - timezone.timedelta(days=daysBack)
                qs = qs.filter(purchase_date__gte=cutoff)
            limit = min(limit or 30, 100)
            txs = list(qs[:limit].values())
            res = json.dumps({
                "count": len(txs),
                "transactions": [{"userId": t["user_id"], "productId": t["product_id"], "category": t["category"], "price": t["price"], "discount": t["discount"], "finalPrice": t["final_price"], "paymentMethod": t["payment_method"], "purchaseDate": t["purchase_date"].isoformat()} for t in txs]
            })
            tool_calls_executed.append({"tool": "query_transactions", "args": {"category": category, "paymentMethod": paymentMethod, "daysBack": daysBack, "limit": limit}, "result": json.loads(res)})
            return res

        def get_revenue_metrics(daysBack: int = 30) -> str:
            """Get aggregate revenue metrics including total revenue, daily trends, category breakdown, and growth rates."""
            logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] 🛠️ get_revenue_metrics: daysBack={daysBack}")
            cutoff = timezone.now() - timezone.timedelta(days=daysBack)
            txs = Transaction.objects.filter(purchase_date__gte=cutoff).order_by("purchase_date")
            total_revenue = sum(t.final_price for t in txs)
            total_orders = len(txs)
            
            daily_trend_map = {}
            for t in txs:
                d_str = t.purchase_date.strftime("%Y-%m-%d")
                if d_str not in daily_trend_map:
                    daily_trend_map[d_str] = {"revenue": 0.0, "orders": 0}
                daily_trend_map[d_str]["revenue"] += t.final_price
                daily_trend_map[d_str]["orders"] += 1
            daily_trend = [{"date": k, "revenue": round(v["revenue"], 2), "orders": v["orders"]} for k, v in sorted(daily_trend_map.items())]
            
            midpoint = len(daily_trend) // 2
            first_half_rev = sum(d["revenue"] for d in daily_trend[:midpoint])
            second_half_rev = sum(d["revenue"] for d in daily_trend[midpoint:])
            growth_rate = ((second_half_rev - first_half_rev) / first_half_rev * 100) if first_half_rev > 0 else 0.0
            
            cat_map = {}
            for t in txs:
                if t.category not in cat_map:
                    cat_map[t.category] = {"revenue": 0.0, "count": 0}
                cat_map[t.category]["revenue"] += t.final_price
                cat_map[t.category]["count"] += 1
            category_breakdown = [{"category": k, "revenue": round(v["revenue"], 2), "transactionCount": v["count"]} for k, v in cat_map.items()]
            category_breakdown.sort(key=lambda x: x["revenue"], reverse=True)
            
            res = json.dumps({
                "totalRevenue": round(total_revenue, 2),
                "totalOrders": total_orders,
                "averageOrderValue": round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0,
                "periodDays": daysBack,
                "growthRate": round(growth_rate, 1),
                "dailyTrend": daily_trend,
                "categoryBreakdown": category_breakdown
            })
            tool_calls_executed.append({"tool": "get_revenue_metrics", "args": {"daysBack": daysBack}, "result": json.loads(res)})
            return res

        def get_inventory_status() -> str:
            """Get a comprehensive inventory status report including stock levels, low-stock counts, and total inventory value."""
            logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] 🛠️ get_inventory_status")
            products = list(Product.objects.all().values())
            low_stock_products = [p for p in products if p["stock"] < 10]
            total_value = sum(p["price"] * p["stock"] for p in products)
            
            cat_map = {}
            for p in products:
                cat = p["category"]
                if cat not in cat_map:
                    cat_map[cat] = {"count": 0, "value": 0.0}
                cat_map[cat]["count"] += 1
                cat_map[cat]["value"] += p["price"] * p["stock"]
            category_breakdown = [{"category": k, "productCount": v["count"], "totalValue": round(v["value"], 2)} for k, v in cat_map.items()]
            
            res = json.dumps({
                "totalProductTypes": len(products),
                "totalItemsInStock": sum(p["stock"] for p in products),
                "totalInventoryValue": round(total_value, 2),
                "lowStockAlertCount": len(low_stock_products),
                "lowStockItems": [{"id": str(p["id"]), "name": p["name"], "stock": p["stock"], "price": p["price"]} for p in low_stock_products],
                "categoryDistribution": category_breakdown
            })
            tool_calls_executed.append({"tool": "get_inventory_status", "args": {}, "result": json.loads(res)})
            return res

        def get_customer_segments(topN: int = 10) -> str:
            """Get customer segmentation data including top customers by spend and LTV-based segments."""
            logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] 🛠️ get_customer_segments: topN={topN}")
            txs = list(Transaction.objects.all().values())
            customer_spends = {}
            for t in txs:
                cust = t["user_id"]
                customer_spends[cust] = customer_spends.get(cust, 0.0) + t["final_price"]
            sorted_customers = sorted(customer_spends.items(), key=lambda x: x[1], reverse=True)
            top_customers = [{"customerId": k, "lifetimeValue": round(v, 2)} for k, v in sorted_customers[:topN]]
            
            high_value = sum(1 for c, v in customer_spends.items() if v >= 200)
            mid_value = sum(1 for c, v in customer_spends.items() if 50 <= v < 200)
            low_value = sum(1 for c, v in customer_spends.items() if v < 50)
            
            res = json.dumps({
                "totalCustomers": len(customer_spends),
                "topSpendCustomers": top_customers,
                "segments": {"highValue": high_value, "midValue": mid_value, "lowValue": low_value}
            })
            tool_calls_executed.append({"tool": "get_customer_segments", "args": {"topN": topN}, "result": json.loads(res)})
            return res

        def calculate_statistics(metric: str) -> str:
            """Compute statistical measures on a metric. Allowed metrics: 'daily_revenue', 'order_values', 'product_prices', 'discount_rates', 'stock_levels'."""
            logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] 🛠️ calculate_statistics: metric={metric}")
            numbers = []
            if metric == "daily_revenue":
                txs = Transaction.objects.all().order_by("purchase_date")
                daily_rev = {}
                for t in txs:
                    d_str = t.purchase_date.strftime("%Y-%m-%d")
                    daily_rev[d_str] = daily_rev.get(d_str, 0.0) + t.final_price
                numbers = list(daily_rev.values())
            elif metric == "order_values":
                numbers = [t.final_price for t in Transaction.objects.all()]
            elif metric == "product_prices":
                numbers = [p.price for p in Product.objects.all()]
            elif metric == "discount_rates":
                numbers = [t.discount for t in Transaction.objects.all()]
            elif metric == "stock_levels":
                numbers = [p.stock for p in Product.objects.all()]
                
            if not numbers:
                return json.dumps({"error": "No data found for metric"})
                
            mean = statistics.mean(numbers)
            median = statistics.median(numbers)
            std = statistics.stdev(numbers) if len(numbers) > 1 else 0.0
            min_v = min(numbers)
            max_v = max(numbers)
            
            res = json.dumps({
                "metric": metric,
                "count": len(numbers),
                "mean": round(mean, 2),
                "median": round(median, 2),
                "stdDev": round(std, 2),
                "min": round(min_v, 2),
                "max": round(max_v, 2)
            })
            tool_calls_executed.append({"tool": "calculate_statistics", "args": {"metric": metric}, "result": json.loads(res)})
            return res

        def update_product_price(productId: str, newPrice: float, reason: str) -> str:
            """Propose a price change for a product. This creates a pending price change alert that requires approval."""
            logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] 🛠️ update_product_price: product={productId}, newPrice={newPrice}")
            try:
                p = Product.objects.get(id=productId)
            except Product.DoesNotExist:
                p = Product.objects.get(product_id=productId)
            alert = Alert.objects.create(
                type="pricing",
                severity="info",
                title=f"Proposed Price Adjustment: {p.name}",
                description=f"Agent recommends adjusting price of \"{p.name}\" from ${p.price} to ${newPrice:.2f}. Reason: {reason}",
                source="analytics-agent",
                metadata={"type": "price_change", "productId": str(p.id), "productName": p.name, "oldPrice": p.price, "newPrice": newPrice, "reason": reason}
            )
            res = json.dumps({"success": True, "message": "Proposed price change alert generated.", "alertId": str(alert.id)})
            tool_calls_executed.append({"tool": "update_product_price", "args": {"productId": productId, "newPrice": newPrice, "reason": reason}, "result": json.loads(res)})
            return res

        def update_product_stock(productId: str, newStock: int, reason: str) -> str:
            """Propose a stock level adjustment for a product. This creates a pending stock change alert that requires approval."""
            logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] 🛠️ update_product_stock: product={productId}, newStock={newStock}")
            try:
                p = Product.objects.get(id=productId)
            except Product.DoesNotExist:
                p = Product.objects.get(product_id=productId)
            alert = Alert.objects.create(
                type="low_stock",
                severity="warning",
                title=f"Proposed Stock Adjustment: {p.name}",
                description=f"Agent recommends modifying stock level of \"{p.name}\" from {p.stock} to {newStock}. Reason: {reason}",
                source="analytics-agent",
                metadata={"type": "stock_change", "productId": str(p.id), "productName": p.name, "oldStock": p.stock, "newStock": newStock, "reason": reason}
            )
            res = json.dumps({"success": True, "message": "Proposed stock level adjustment alert generated.", "alertId": str(alert.id)})
            tool_calls_executed.append({"tool": "update_product_stock", "args": {"productId": productId, "newStock": newStock, "reason": reason}, "result": json.loads(res)})
            return res

        def create_alert(type: str, severity: str, title: str, description: str) -> str:
            """Create a new alert in the system. Use this to flag anomalies, low stock warnings, or pricing issues."""
            logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] 🛠️ create_alert: {title}")
            alert = Alert.objects.create(
                type=type, severity=severity, title=title, description=description,
                source="analytics-agent", metadata={"type": "agent_created"}
            )
            res = json.dumps({"success": True, "alertId": str(alert.id), "message": "Alert created successfully."})
            tool_calls_executed.append({"tool": "create_alert", "args": {"type": type, "severity": severity, "title": title, "description": description}, "result": json.loads(res)})
            return res

        tools_list = [
            query_products, query_transactions, get_revenue_metrics,
            get_inventory_status, get_customer_segments, calculate_statistics,
            update_product_price, update_product_stock, create_alert
        ]
        
        # Dispatch Gemini call
        api_key = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)
        
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Dispatching request to Gemini API (automatic tool use)...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=current_contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                tools=tools_list
            )
        )
        
        final_text = response.text or "No response text generated."
        logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] Response received.")
        
        # Save agent response
        AgentMessage.objects.create(
            session_id=session_id,
            role="agent",
            content=final_text,
            agent_type="analytics",
            tool_calls=tool_calls_executed,
            logs=logs
        )
        
        return JsonResponse({
            "success": True,
            "response": final_text,
            "toolCalls": tool_calls_executed,
            "logs": logs
        })
        
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


# ── 2. Pricing Agent views ──

@csrf_exempt
def run_pricing_analysis_api(request):
    logs = []
    logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] 💰 Pricing analysis initiated in Python...")
    
    try:
        products = list(Product.objects.all())
        if not products:
            return JsonResponse({"success": False, "recommendations": [], "logs": logs, "error": "No products found."})
            
        logs.append(f"Loaded {len(products)} products.")
        
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        
        # Calculate sales velocity for each product
        sales_map = {}
        txs_agg = Transaction.objects.filter(purchase_date__gte=thirty_days_ago)
        for t in txs_agg:
            p_id = t.product_id
            if p_id not in sales_map:
                sales_map[p_id] = {"units": 0, "rev": 0.0}
            sales_map[p_id]["units"] += 1
            sales_map[p_id]["rev"] += t.final_price
            
        product_analysis = []
        for p in products:
            sales = sales_map.get(p.product_id, {"units": 0, "rev": 0.0})
            daily_vel = sales["units"] / 30.0
            days_rem = (p.stock / daily_vel) if daily_vel > 0 else 999.0
            
            product_analysis.append({
                "id": str(p.id),
                "productId": p.product_id,
                "name": p.name,
                "category": p.category,
                "currentPrice": p.price,
                "stock": p.stock,
                "unitsSold30d": sales["units"],
                "revenue30d": round(sales["rev"], 2),
                "dailyVelocity": round(daily_vel, 2),
                "stockDaysRemaining": int(min(days_rem, 999))
            })
            
        logs.append(f"Sales velocity calculated. Dispatching prompt to Gemini...")
        
        prompt = f"""You are an AI Dynamic Pricing Engine for an eCommerce store. Analyze the following product data and recommend optimal price adjustments.
 
PRODUCT ANALYSIS DATA:
{json.dumps(product_analysis, indent=2)}
 
PRICING RULES:
1. Products with high sales velocity (>1 unit/day) and low stock (<15 units): Consider raising price 5-15% to maximize margin before stockout
2. Products with zero/very low sales and high stock (>30 units): Consider lowering price 10-20% to clear inventory
3. Products with moderate velocity and healthy stock: Keep price stable or minor adjustment ±5%
4. Never recommend a price below $5.00 or above 3x current price
5. Consider category-level pricing consistency
 
RESPOND WITH A JSON ARRAY ONLY (no markdown, no text before/after). Each element must have:
{{
  "productId": "string (the product_id, e.g. P-101)",
  "productName": "string",
  "category": "string",
  "currentPrice": number,
  "recommendedPrice": number (rounded to 2 decimal places),
  "changePercent": number (rounded to 1 decimal place, negative for decrease),
  "confidence": "high" | "medium" | "low",
  "reason": "string (1-2 sentence explanation)"
}}
 
Include ALL products, even those where you recommend no change (set changePercent to 0)."""
        
        api_key = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)
        result = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        response_text = result.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        recommendations = json.loads(response_text)
        
        # Enrich recommendations with velocity data
        enriched = []
        for rec in recommendations:
            analysis = next((pa for pa in product_analysis if pa["productId"] == rec["productId"] or pa["id"] == rec["productId"]), None)
            enriched.append({
                **rec,
                "productId": analysis["id"] if analysis else rec["productId"],  # Ensure MongoDB id compatibility
                "salesVelocity": analysis["dailyVelocity"] if analysis else 0.0,
                "stockDaysRemaining": analysis["stockDaysRemaining"] if analysis else 999
            })
            
        logs.append(f"✅ Generated {len(enriched)} pricing recommendations.")
        return JsonResponse({"success": True, "recommendations": enriched, "logs": logs})
        
    except Exception as e:
        logs.append(f"❌ ERROR: {str(e)}")
        return JsonResponse({"success": False, "recommendations": [], "logs": logs, "error": str(e)}, status=500)

@csrf_exempt
def apply_price_change_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
        
    try:
        data = json.loads(request.body)
        product_id = data.get("productId")
        new_price = float(data.get("newPrice", 0))
        reason = data.get("reason", "")
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            product = Product.objects.get(product_id=product_id)
            
        old_price = product.price
        
        # Record in PriceHistory
        PriceHistory.objects.create(
            product_id=str(product.id),
            product_name=product.name,
            old_price=old_price,
            new_price=new_price,
            reason=reason,
            applied_by="pricing-agent"
        )
        
        # Apply change
        product.price = new_price
        product.save()
        
        return JsonResponse({
            "success": True,
            "productName": product.name,
            "oldPrice": old_price,
            "newPrice": new_price
        })
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

@csrf_exempt
def apply_all_price_changes_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
        
    try:
        data = json.loads(request.body)
        changes = data.get("changes", [])
        
        applied = 0
        failed = 0
        
        for item in changes:
            try:
                prod_id = item.get("productId")
                new_price = float(item.get("newPrice", 0))
                reason = item.get("reason", "")
                
                try:
                    product = Product.objects.get(id=prod_id)
                except Product.DoesNotExist:
                    product = Product.objects.get(product_id=prod_id)
                    
                old_price = product.price
                
                PriceHistory.objects.create(
                    product_id=str(product.id),
                    product_name=product.name,
                    old_price=old_price,
                    new_price=new_price,
                    reason=reason,
                    applied_by="pricing-agent"
                )
                product.price = new_price
                product.save()
                applied += 1
            except Exception:
                failed += 1
                
        return JsonResponse({"success": True, "applied": applied, "failed": failed})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

def get_pricing_history_api(request):
    product_id = request.GET.get("productId")
    qs = PriceHistory.objects.all().order_by("-created_at")
    if product_id:
        qs = qs.filter(product_id=product_id)
        
    history = list(qs[:100].values())
    res_list = [{
        "id": str(h["id"]),
        "productId": h["product_id"],
        "productName": h["product_name"],
        "oldPrice": h["old_price"],
        "newPrice": h["new_price"],
        "reason": h["reason"],
        "approvedBy": h["applied_by"],
        "agentType": "pricing",
        "createdAt": h["created_at"].isoformat()
    } for h in history]
    
    return JsonResponse(res_list, safe=False)


# ── 3. Alert Agent views ──

@csrf_exempt
def run_alert_scan_api(request):
    logs = []
    new_alerts = []
    logs.append(f"[{timezone.now().strftime('%H:%M:%S')}] 🔍 Alert scan initiated in Python...")
    
    try:
        products = list(Product.objects.all())
        low_stock = [p for p in products if p.stock < 10]
        
        # 1. Stock Checks
        if low_stock:
            logs.append(f"Found {len(low_stock)} low-stock items.")
            for p in low_stock:
                severity = "critical" if p.stock < 3 else "warning"
                existing = Alert.objects.filter(type="low_stock", acknowledged=False, metadata__productId=str(p.id)).exists()
                if not existing:
                    alert = Alert.objects.create(
                        type="low_stock",
                        severity=severity,
                        title=f"Low Stock: {p.name}",
                        description=f"\"{p.name}\" ({p.category}) has only {p.stock} units remaining. Consider restocking.",
                        source="alert-agent",
                        metadata={"productId": str(p.id), "productName": p.name, "category": p.category, "stock": p.stock, "price": p.price}
                    )
                    new_alerts.append(alert)
                    
        # 2. Revenue Anomalies
        logs.append(f"Analyzing daily revenues...")
        txs = list(Transaction.objects.all().order_by("purchase_date"))
        daily_rev = {}
        for t in txs:
            d_str = t.purchase_date.strftime("%Y-%m-%d")
            daily_rev[d_str] = daily_rev.get(d_str, 0.0) + t.final_price
            
        daily_list = [{"date": k, "revenue": v} for k, v in sorted(daily_rev.items())]
        if len(daily_list) >= 3:
            recent = daily_list[-7:]
            latest = recent[-1]
            previous = recent[:-1]
            
            if previous:
                avg_rev = sum(d["revenue"] for d in previous) / len(previous)
                change = ((latest["revenue"] - avg_rev) / avg_rev * 100) if avg_rev > 0 else 0.0
                
                if change < -25:
                    logs.append(f"🚨 Revenue drop detected: {change:.1f}%")
                    existing = Alert.objects.filter(type="anomaly", acknowledged=False, metadata__type="revenue_drop").exists()
                    if not existing:
                        alert = Alert.objects.create(
                            type="anomaly",
                            severity="critical" if change < -50 else "warning",
                            title=f"Revenue Drop Detected ({change:.1f}%)",
                            description=f"Latest day revenue (${latest['revenue']:.2f}) is {abs(change):.1f}% below the 7-day average (${avg_rev:.2f}).",
                            source="alert-agent",
                            metadata={"type": "revenue_drop", "latestRevenue": latest["revenue"], "averageRevenue": avg_rev, "changePercent": round(change, 1), "date": latest["date"]}
                        )
                        new_alerts.append(alert)
                elif change > 50:
                    logs.append(f"📈 Revenue spike detected: +{change:.1f}%")
                    existing = Alert.objects.filter(type="anomaly", acknowledged=False, metadata__type="revenue_spike").exists()
                    if not existing:
                        alert = Alert.objects.create(
                            type="anomaly",
                            severity="info",
                            title=f"Revenue Spike Detected (+{change:.1f}%)",
                            description=f"Latest day revenue (${latest['revenue']:.2f}) is {change:.1f}% above the 7-day average (${avg_rev:.2f}).",
                            source="alert-agent",
                            metadata={"type": "revenue_spike", "latestRevenue": latest["revenue"], "averageRevenue": avg_rev, "changePercent": round(change, 1), "date": latest["date"]}
                        )
                        new_alerts.append(alert)

        # 3. Stale Inventory
        logs.append(f"Checking for stale inventory...")
        seven_days_ago = timezone.now() - timezone.timedelta(days=7)
        recently_ordered_ids = set(Transaction.objects.filter(purchase_date__gte=seven_days_ago).values_list("product_id", flat=True))
        
        stale_products = [p for p in products if p.product_id not in recently_ordered_ids and p.stock > 0]
        if stale_products and len(stale_products) <= len(products) * 0.5:
            existing = Alert.objects.filter(type="pricing", acknowledged=False, metadata__type="stale_inventory").exists()
            if not existing:
                stale_names = ", ".join(p.name for p in stale_products[:5])
                alert = Alert.objects.create(
                    type="pricing",
                    severity="warning",
                    title=f"{len(stale_products)} Products with No Recent Sales",
                    description=f"These products haven't had orders in the last 7 days: {stale_names}.",
                    source="alert-agent",
                    metadata={"type": "stale_inventory", "staleCount": len(stale_products), "products": [{"id": str(p.id), "name": p.name, "price": p.price, "stock": p.stock} for p in stale_products[:10]]}
                )
                new_alerts.append(alert)

        # 4. Generate AI summary
        if new_alerts:
            logs.append(f"Generating AI summary for {len(new_alerts)} new alerts...")
            summary_prompt = f"""You are an AI store monitoring agent. Summarize these {len(new_alerts)} new alerts in 2-3 concise sentences for a dashboard notification. Be specific with numbers.
 
Alerts:
{chr(10).join(f"{i+1}. [{a.severity.upper()}] {a.title}: {a.description}" for i, a in enumerate(new_alerts))}
 
Respond with ONLY the summary text, no formatting."""
            
            try:
                api_key = os.getenv("GEMINI_API_KEY")
                client = genai.Client(api_key=api_key)
                result = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=summary_prompt
                )
                summary = result.text.strip()
                Alert.objects.create(
                    type="system",
                    severity="info",
                    title=f"AI Scan Summary: {len(new_alerts)} Issue(s) Detected",
                    description=summary,
                    source="alert-agent",
                    metadata={"type": "scan_summary", "alertCount": len(new_alerts)}
                )
            except Exception as aiError:
                logs.append(f"AI summary skipped: {str(aiError)}")

        logs.append(f"Scan complete. {len(new_alerts)} new alerts created.")
        return JsonResponse({"success": True, "newAlertCount": len(new_alerts), "logs": logs})
        
    except Exception as e:
        logs.append(f"❌ ERROR: {str(e)}")
        return JsonResponse({"success": False, "newAlertCount": 0, "logs": logs, "error": str(e)}, status=500)

def alerts_api(request):
    if request.method == "GET":
        acknowledged = request.GET.get("acknowledged")
        qs = Alert.objects.all().order_by("-created_at")
        if acknowledged is not None:
            qs = qs.filter(acknowledged=(acknowledged.lower() == "true"))
            
        alerts = list(qs[:50].values())
        total_unack = Alert.objects.filter(acknowledged=False).count()
        
        return JsonResponse({
            "alerts": [{
                "id": str(a["id"]),
                "type": a["type"],
                "severity": a["severity"],
                "title": a["title"],
                "description": a["description"],
                "source": a["source"],
                "metadata": a["metadata"],
                "acknowledged": a["acknowledged"],
                "createdAt": a["created_at"].isoformat()
            } for a in alerts],
            "totalUnacknowledged": total_unack
        })
    return JsonResponse({"error": "GET request expected"}, status=405)

@csrf_exempt
def acknowledge_alert_api(request, alert_id):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
    try:
        Alert.objects.filter(id=alert_id).update(acknowledged=True)
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

@csrf_exempt
def dismiss_alert_api(request, alert_id):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
    try:
        Alert.objects.filter(id=alert_id).delete()
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

@csrf_exempt
def acknowledge_all_alerts_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
    try:
        Alert.objects.filter(acknowledged=False).update(acknowledged=True)
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


# ── 4. Store Manager Agent views ──

def gather_metrics():
    products = list(Product.objects.all())
    low_stock = sum(1 for p in products if p.stock < 10)
    txs = list(Transaction.objects.all())
    total_rev = sum(t.final_price for t in txs)
    total_orders = len(txs)
    
    return {
        "totalRevenue": total_rev,
        "totalOrders": total_orders,
        "averageOrderValue": (total_rev / total_orders) if total_orders > 0 else 0.0,
        "uniqueCustomers": len(set(t.user_id for t in txs)),
        "totalProducts": len(products),
        "lowStockAlerts": low_stock
    }

@csrf_exempt
def goals_api(request):
    if request.method == "GET":
        goals = list(GoalPlan.objects.all().order_by("-created_at").values())
        return JsonResponse([{
            "id": str(g["id"]),
            "description": g["description"],
            "status": g["status"],
            "actions": g["actions"],
            "progressMetrics": g["progress_metrics"],
            "agentNotes": g["agent_notes"],
            "createdAt": g["created_at"].isoformat()
        } for g in goals], safe=False)
        
    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            desc = data.get("description", "").strip()
            if not desc:
                return JsonResponse({"success": False, "error": "Description required"}, status=400)
                
            metrics = gather_metrics()
            goal = GoalPlan.objects.create(
                description=desc,
                status="active",
                actions=[],
                progress_metrics=[
                    {"metric": "totalRevenue", "baseline": metrics["totalRevenue"], "current": metrics["totalRevenue"], "target": metrics["totalRevenue"]},
                    {"metric": "totalOrders", "baseline": metrics["totalOrders"], "current": metrics["totalOrders"], "target": metrics["totalOrders"]},
                    {"metric": "averageOrderValue", "baseline": metrics["averageOrderValue"], "current": metrics["averageOrderValue"], "target": metrics["averageOrderValue"]}
                ]
            )
            return JsonResponse({"success": True, "goalId": str(goal.id), "baseline": metrics})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

@csrf_exempt
def goal_status_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
    try:
        data = json.loads(request.body)
        goal_id = data.get("goalId")
        status = data.get("status")
        GoalPlan.objects.filter(id=goal_id).update(status=status)
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

@csrf_exempt
def run_manager_cycle_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
        
    logs = []
    try:
        data = json.loads(request.body)
        goal_id = data.get("goalId")
        
        goal = GoalPlan.objects.get(id=goal_id)
        logs.append(f"🧠 Store Manager planning activated for goal: \"{goal.description}\"")
        
        metrics = gather_metrics()
        logs.append(f"Metrics gathered - Revenue: ${metrics['totalRevenue']:.2f}, Orders: {metrics['totalOrders']}")
        
        products = list(Product.objects.all())
        low_stock = [p for p in products if p.stock < 10]
        recent_alerts = list(Alert.objects.filter(acknowledged=False).order_by("-created_at")[:5].values())
        recent_price_changes = list(PriceHistory.objects.all().order_by("-created_at")[:5].values())
        
        logs.append(f"Context loaded: {len(products)} products, {len(low_stock)} low-stock, {len(recent_alerts)} active alerts.")
        logs.append(f"Generating action plan via Gemini...")
        
        prompt = f"""You are an AI Store Manager Agent for an eCommerce platform. You must create a strategic action plan to achieve the following business goal:
 
GOAL: "{goal.description}"
 
CURRENT METRICS:
- Total Revenue: ${metrics['totalRevenue']:.2f}
- Total Orders: {metrics['totalOrders']}
- Average Order Value: ${metrics['averageOrderValue']:.2f}
- Unique Customers: {metrics['uniqueCustomers']}
- Active Products: {metrics['totalProducts']}
 
INVENTORY STATUS:
- Low Stock Products (< 10 units): {len(low_stock)}
{chr(10).join(f"  • {p.name}: {p.stock} units at ${p.price}" for p in low_stock[:5])}
 
PRODUCT CATALOG (sample):
{chr(10).join(f"- {p.name} ({p.category}): ${p.price}, Stock: {p.stock}" for p in products[:10])}
 
ACTIVE ALERTS:
{chr(10).join(f"- [{a['severity'].upper()}] {a['title']}" for a in recent_alerts) if recent_alerts else "None"}
 
RECENT PRICE CHANGES:
{chr(10).join(f"- {p['product_name']}: ${p['old_price']} → ${p['new_price']} ({p['reason']})" for p in recent_price_changes) if recent_price_changes else "None"}
 
EXISTING PLAN ACTIONS (if any, do not duplicate):
{chr(10).join(f"- [{a.get('status')}] {a.get('description')}" for a in goal.actions) if goal.actions else "No existing actions"}
 
CREATE AN ACTION PLAN. Respond with a JSON object ONLY:
{{
  "analysis": "2-3 sentence assessment of current state vs the goal",
  "targetMetrics": {{
    "totalRevenue": <target number based on goal>,
    "totalOrders": <target number based on goal>,
    "averageOrderValue": <target number based on goal>
  }},
  "actions": [
    {{
      "id": "action-1",
      "description": "Specific action description",
      "type": "pricing" | "restock" | "alert" | "promotion" | "analysis",
      "params": {{
        "productId": "if applicable",
        "productName": "if applicable",
        "newPrice": <if pricing>,
        "newStock": <if restock>,
        "details": "additional context"
      }}
    }}
  ],
  "agentNotes": "Strategic notes about the approach and expected timeline"
}}
 
Rules:
- Create 3-6 specific, actionable items
- Each action must have a clear type and realistic params
- Use actual product names and prices from the data above
- For pricing actions, recommend specific new prices
- For restock, recommend specific quantities
- Be strategic and data-driven"""

        api_key = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)
        result = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        response_text = result.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        plan = json.loads(response_text)
        
        new_actions = [{**a, "status": "proposed"} for a in plan["actions"]]
        
        # Update goal progress metrics targets
        if "targetMetrics" in plan:
            goal.progress_metrics = [
                {"metric": "totalRevenue", "baseline": goal.progress_metrics[0].get("baseline", metrics["totalRevenue"]), "current": metrics["totalRevenue"], "target": plan["targetMetrics"].get("totalRevenue", metrics["totalRevenue"])},
                {"metric": "totalOrders", "baseline": goal.progress_metrics[1].get("baseline", metrics["totalOrders"]), "current": metrics["totalOrders"], "target": plan["targetMetrics"].get("totalOrders", metrics["totalOrders"])},
                {"metric": "averageOrderValue", "baseline": goal.progress_metrics[2].get("baseline", metrics["averageOrderValue"]), "current": metrics["averageOrderValue"], "target": plan["targetMetrics"].get("averageOrderValue", metrics["averageOrderValue"])}
            ]
            
        # Merge actions (avoid duplicate action IDs)
        existing_ids = {a.get("id") for a in goal.actions}
        for action in new_actions:
            if action.get("id") not in existing_ids:
                goal.actions.append(action)
                
        goal.agent_notes = plan.get("agentNotes", "")
        goal.save()
        
        logs.append(f"Plan generated successfully: {len(new_actions)} proposed actions.")
        return JsonResponse({
            "success": True,
            "analysis": plan.get("analysis", ""),
            "actionsCreated": len(new_actions),
            "logs": logs
        })
    except Exception as e:
        logs.append(f"❌ ERROR: {str(e)}")
        return JsonResponse({"success": False, "logs": logs, "error": str(e)}, status=500)

@csrf_exempt
def action_decision_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
    try:
        data = json.loads(request.body)
        goal_id = data.get("goalId")
        action_id = data.get("actionId")
        decision = data.get("decision")  # approve or reject
        
        goal = GoalPlan.objects.get(id=goal_id)
        for a in goal.actions:
            if a.get("id") == action_id:
                a["status"] = "approved" if decision == "approve" else "rejected"
                break
        goal.save()
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

@csrf_exempt
def execute_actions_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request expected"}, status=405)
        
    logs = []
    try:
        data = json.loads(request.body)
        goal_id = data.get("goalId")
        
        goal = GoalPlan.objects.get(id=goal_id)
        executed = 0
        failed = 0
        
        for action in goal.actions:
            if action.get("status") == "approved":
                try:
                    a_type = action.get("type")
                    params = action.get("params", {})
                    
                    if a_type == "pricing":
                        prod_id = params.get("productId")
                        new_price = float(params.get("newPrice", 0))
                        
                        try:
                            product = Product.objects.get(id=prod_id)
                        except Product.DoesNotExist:
                            product = Product.objects.get(product_id=prod_id)
                            
                        old_price = product.price
                        PriceHistory.objects.create(
                            product_id=str(product.id), product_name=product.name,
                            old_price=old_price, new_price=new_price, reason=action.get("description"),
                            applied_by="store-manager"
                        )
                        product.price = new_price
                        product.save()
                        action["result"] = {"oldPrice": old_price, "newPrice": new_price, "productName": product.name}
                        logs.append(f"Price updated: {product.name} ${old_price} -> ${new_price}")
                        
                    elif a_type == "restock":
                        prod_name = params.get("productName")
                        new_stock = int(params.get("newStock", 0))
                        
                        product = Product.objects.filter(name__icontains=prod_name).first()
                        if product:
                            old_stock = product.stock
                            product.stock = new_stock
                            product.save()
                            action["result"] = {"oldStock": old_stock, "newStock": new_stock, "productName": product.name}
                            logs.append(f"Stock updated: {product.name} {old_stock} -> {new_stock}")
                        else:
                            raise Exception("Product not found by name")
                            
                    elif a_type == "alert":
                        Alert.objects.create(
                            type="goal", severity="info", title=f"Store Manager: {action.get('description')}",
                            description=params.get("details") or action.get("description"), source="store-manager"
                        )
                        action["result"] = {"alertCreated": True}
                        logs.append(f"Alert created: {action.get('description')}")
                        
                    else:
                        action["result"] = {"noted": True}
                        logs.append(f"Action noted: {action.get('description')}")
                        
                    action["status"] = "executed"
                    action["executedAt"] = timezone.now().isoformat()
                    executed += 1
                except Exception as e:
                    action["status"] = "failed"
                    action["result"] = {"error": str(e)}
                    failed += 1
                    logs.append(f"Failed to execute action: {action.get('description')} - {str(e)}")
                    
        goal.save()
        return JsonResponse({"success": True, "executed": executed, "failed": failed, "logs": logs})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)