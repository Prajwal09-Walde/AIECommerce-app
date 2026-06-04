from django.db import models

class Transaction(models.Model):
    user_id = models.CharField(max_length=255, db_index=True)
    product_id = models.CharField(max_length=255, db_index=True)
    category = models.CharField(max_length=255, db_index=True)
    price = models.FloatField()
    discount = models.FloatField()
    final_price = models.FloatField()
    payment_method = models.CharField(max_length=255, db_index=True)
    purchase_date = models.DateTimeField(db_index=True)

    def __str__(self):
        return f"Transaction {self.id} - {self.user_id}"

class Product(models.Model):
    product_id = models.CharField(max_length=255, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=255)
    price = models.FloatField()
    stock = models.IntegerField()

    def __str__(self):
        return self.name
