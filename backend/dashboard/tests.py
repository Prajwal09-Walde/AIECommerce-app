import json
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
        Product.objects.create(product_id="P-test", name="Test Product", category="Books", price=10.0, stock=5)
        
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
