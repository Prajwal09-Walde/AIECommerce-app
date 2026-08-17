from django.urls import path
from . import views

urlpatterns = [
    path('initialize/', views.initialize_data, name='initialize_data'),
    path('reset/', views.reset_data, name='reset_data'),
    path('stream/', views.stream_transactions, name='stream_transactions'),
    path('analyze/', views.rag_analysis, name='rag_analysis'),
    path('kaggle-transactions/stats', views.kaggle_stats, name='kaggle_stats'),        
    path('kaggle-transactions', views.kaggle_transactions, name='kaggle_transactions'), 
    
    # AI Agent API paths
    path('agent/analytics', views.run_analytics_agent_api, name='run_analytics_agent_api'),
    path('agent/analytics/history', views.get_agent_history_api, name='get_agent_history_api'),
    path('agent/analytics/clear', views.clear_agent_history_api, name='clear_agent_history_api'),
    path('agent/pricing/analyze', views.run_pricing_analysis_api, name='run_pricing_analysis_api'),
    path('agent/pricing/apply', views.apply_price_change_api, name='apply_price_change_api'),
    path('agent/pricing/apply-all', views.apply_all_price_changes_api, name='apply_all_price_changes_api'),
    path('agent/pricing/history', views.get_pricing_history_api, name='get_pricing_history_api'),
    path('agent/alerts/scan', views.run_alert_scan_api, name='run_alert_scan_api'),
    path('agent/alerts', views.alerts_api, name='alerts_api'),
    path('agent/alerts/acknowledge-all', views.acknowledge_all_alerts_api, name='acknowledge_all_alerts_api'),
    path('agent/alerts/<int:alert_id>/acknowledge', views.acknowledge_alert_api, name='acknowledge_alert_api'),
    path('agent/alerts/<int:alert_id>/dismiss', views.dismiss_alert_api, name='dismiss_alert_api'),
    path('agent/goals', views.goals_api, name='goals_api'),
    path('agent/goals/status', views.goal_status_api, name='goal_status_api'),
    path('agent/goals/cycle', views.run_manager_cycle_api, name='run_manager_cycle_api'),
    path('agent/goals/action', views.action_decision_api, name='action_decision_api'),
    path('agent/goals/execute', views.execute_actions_api, name='execute_actions_api'),
]
