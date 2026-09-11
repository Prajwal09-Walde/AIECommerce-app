import uuid
from django.db import models

def generate_product_id():
    return f"PROD-{uuid.uuid4().hex[:8].upper()}"

class Transaction(models.Model):
    user_id = models.CharField(max_length=255)
    product_id = models.CharField(max_length=255, blank=True, default=uuid.uuid4)
    category = models.CharField(max_length=255)
    price = models.FloatField()
    discount = models.FloatField()
    final_price = models.FloatField()
    payment_method = models.CharField(max_length=255)
    purchase_date = models.DateTimeField(db_index=True)

    def __str__(self):
        return f"Transaction {self.id} - {self.user_id}"

class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=255)
    price = models.FloatField()
    stock = models.IntegerField()

    def __str__(self):
        return f"{self.name} ({self.id})"

class Alert(models.Model):
    type = models.CharField(max_length=50)  # anomaly, low_stock, pricing, system, goal
    severity = models.CharField(max_length=20)  # critical, warning, info
    title = models.CharField(max_length=255)
    description = models.TextField()
    source = models.CharField(max_length=100)
    metadata = models.JSONField(default=dict, blank=True)
    acknowledged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title}"

class GoalPlan(models.Model):
    description = models.TextField()
    status = models.CharField(max_length=20, default="active")  # active, completed, archived
    actions = models.JSONField(default=list, blank=True)
    progress_metrics = models.JSONField(default=list, blank=True)
    agent_notes = models.TextField(default="", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Goal {self.id}: {self.description[:40]}"

class PriceHistory(models.Model):
    product_id = models.CharField(max_length=255)
    product_name = models.CharField(max_length=255)
    old_price = models.FloatField()
    new_price = models.FloatField()
    reason = models.TextField()
    applied_by = models.CharField(max_length=100)  # pricing-agent, analytics-agent, manager-agent, user
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product_name}: ${self.old_price} -> ${self.new_price}"

class AgentMessage(models.Model):
    session_id = models.CharField(max_length=255, db_index=True)
    role = models.CharField(max_length=20)  # user, agent, system
    content = models.TextField()
    agent_type = models.CharField(max_length=50)  # analytics, pricing, alerts, manager
    tool_calls = models.JSONField(default=list, blank=True)
    logs = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message in {self.session_id} by {self.role}"
