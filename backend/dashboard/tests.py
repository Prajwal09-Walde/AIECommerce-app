import json
import uuid
from django.test import TestCase
from django.urls import reverse
from dashboard.models import Product, Transaction

class DashboardTests(TestCase):
    def test_health_check(self):
        """Verify the health check endpoint returns 200 OK."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_reset_data(self):
        """Verify the reset endpoint deletes all transactions and products."""
        # Create mock data
        Product.objects.create(name="Test Product", category="Books", price=10.0, stock=5)
        
        response = self.client.post(reverse('reset_data'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(Transaction.objects.count(), 0)

    def test_initialize_and_stats(self):
        """Verify data initialization and statistic summarization."""
        payload = {
            "transactions": [
                {
                    "userId": "user_test@example.com",
                    "productId": "P-101",
                    "category": "Electronics",
                    "price": 100.0,
                    "discount": 10.0,
                    "finalPrice": 90.0,
                    "paymentMethod": "PayPal",
                    "purchaseDate": "2026-07-04T12:00:00Z"
                }
            ]
        }
        
        # Test Initialize Endpoint
        init_response = self.client.post(
            reverse('initialize_data'), 
            data=json.dumps(payload), 
            content_type="application/json"
        )
        self.assertEqual(init_response.status_code, 200)
        self.assertEqual(init_response.json()["transactions_count"], 1)
        self.assertEqual(init_response.json()["products_count"], 1)
        
        # Verify database state
        self.assertEqual(Product.objects.count(), 1)
        self.assertEqual(Transaction.objects.count(), 1)
        
        # Test Stats Endpoint
        stats_response = self.client.get(reverse('kaggle_stats'))
        self.assertEqual(stats_response.status_code, 200)
        data = stats_response.json()
        
        self.assertTrue(data["hasData"])
        self.assertEqual(data["summary"]["totalRevenue"], 90.0)
        self.assertEqual(data["summary"]["totalTransactions"], 1)
        self.assertEqual(data["categories"][0]["name"], "Electronics")
        self.assertEqual(data["payments"][0]["name"], "PayPal")

    def test_auto_generate_product_uuid(self):
        """Verify that Product uses UUIDField primary key and product_id is eliminated."""
        import uuid
        product = Product.objects.create(name="Auto Product", category="Gadgets", price=19.99, stock=20)
        self.assertIsInstance(product.id, uuid.UUID)

        # Transaction
        tx = Transaction.objects.create(
            user_id="user_auto@example.com",
            product_id=str(product.id),
            category="Gadgets",
            price=19.99,
            discount=0.0,
            final_price=19.99,
            payment_method="Credit Card",
            purchase_date="2026-09-10T10:00:00Z"
        )
        self.assertEqual(tx.product_id, str(product.id))

    def test_find_product_lookup(self):
        """Verify find_product helper resolves by UUID and string representation."""
        from dashboard.views import find_product
        product = Product.objects.create(name="Lookup Test", category="Home", price=35.0, stock=15)
        
        # Look up by UUID
        found_by_pk = find_product(product.id)
        self.assertIsNotNone(found_by_pk)
        self.assertEqual(found_by_pk.id, product.id)
        
        # Look up by string UUID
        found_by_pk_str = find_product(str(product.id))
        self.assertIsNotNone(found_by_pk_str)
        self.assertEqual(found_by_pk_str.id, product.id)
        
        # Non-existent
        self.assertIsNone(find_product(None))

    def test_products_api_crud(self):
        """Test GET, POST, PATCH, DELETE on products REST API."""
        # 1. POST product
        post_res = self.client.post(
            reverse('products_api'),
            data=json.dumps({"name": "Headphones Pro", "category": "Electronics", "price": 199.99, "stock": 50}),
            content_type="application/json"
        )
        self.assertEqual(post_res.status_code, 201)
        prod_data = post_res.json()["product"]
        prod_id = prod_data["id"]
        self.assertEqual(prod_data["name"], "Headphones Pro")
        
        # 2. GET products list
        get_res = self.client.get(reverse('products_api') + "?search=Headphones")
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["total"], 1)
        
        # 3. GET product detail
        detail_res = self.client.get(reverse('product_detail_api', kwargs={'product_id': prod_id}))
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.json()["price"], 199.99)
        
        # 4. PATCH product detail
        patch_res = self.client.patch(
            reverse('product_detail_api', kwargs={'product_id': prod_id}),
            data=json.dumps({"price": 179.99, "stock": 60}),
            content_type="application/json"
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()["product"]["price"], 179.99)
        
        # 5. DELETE product
        del_res = self.client.delete(reverse('product_detail_api', kwargs={'product_id': prod_id}))
        self.assertEqual(del_res.status_code, 200)
        self.assertEqual(Product.objects.filter(name="Headphones Pro").count(), 0)

    def test_customers_and_orders_api(self):
        """Test customers intelligence and orders list REST endpoints."""
        # Create transactions
        Transaction.objects.create(
            user_id="vip@example.com", product_id=str(uuid.uuid4()), category="Electronics",
            price=250.0, discount=0.0, final_price=250.0, payment_method="Credit Card",
            purchase_date="2026-09-01T12:00:00Z"
        )
        Transaction.objects.create(
            user_id="occasional@example.com", product_id=str(uuid.uuid4()), category="Books",
            price=30.0, discount=0.0, final_price=30.0, payment_method="PayPal",
            purchase_date="2026-09-02T12:00:00Z"
        )
        
        # Test Customers API
        cust_res = self.client.get(reverse('customers_api'))
        self.assertEqual(cust_res.status_code, 200)
        c_data = cust_res.json()
        self.assertTrue(c_data["hasData"])
        self.assertEqual(c_data["totalCustomers"], 2)
        # Verify LTV segmentation
        high_val_seg = next(s for s in c_data["segmentData"] if "High Value" in s["name"])
        self.assertEqual(high_val_seg["value"], 1)
        
        # Test Orders API GET
        ord_res = self.client.get(reverse('orders_api') + "?search=vip")
        self.assertEqual(ord_res.status_code, 200)
        o_data = ord_res.json()
        self.assertEqual(len(o_data["orders"]), 1)
        self.assertEqual(o_data["orders"][0]["customer"], "vip@example.com")
        self.assertEqual(o_data["orders"][0]["amount"], 250.0)
        
        # Test Orders API POST
        create_ord_res = self.client.post(
            reverse('orders_api'),
            data=json.dumps({
                "customer": "new_order@example.com",
                "price": 99.0,
                "discount": 10.0,
                "finalPrice": 89.0,
                "category": "Apparel",
                "paymentMethod": "PayPal"
            }),
            content_type="application/json"
        )
        self.assertEqual(create_ord_res.status_code, 201)
        self.assertEqual(create_ord_res.json()["order"]["customer"], "new_order@example.com")


