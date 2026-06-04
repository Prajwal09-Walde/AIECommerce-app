from django.urls import path
from . import views

urlpatterns = [
    path('initialize/', views.initialize_data, name='initialize_data'),
    path('reset/', views.reset_data, name='reset_data'),
    path('stream/', views.stream_transactions, name='stream_transactions'),
    path('analyze/', views.rag_analysis, name='rag_analysis'),
]
