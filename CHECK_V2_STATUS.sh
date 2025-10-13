#!/bin/bash
# V2 Diagnostic Script - Check why Prepare is stuck

echo "======================================================================"
echo "🔍 V2 PowerMTA Diagnostic Report"
echo "======================================================================"
echo ""

cd /opt/speed-send

echo "1️⃣ Backend Logs (last 50 lines, looking for V2/PREPARE errors):"
echo "----------------------------------------------------------------"
docker-compose logs backend --tail=50 | grep -A 5 -B 5 -E "(V2|PREPARE|prepare_campaign|ERROR|Traceback|Failed)" || echo "No V2 preparation logs found"
echo ""

echo "2️⃣ Celery Worker Logs (last 50 lines, looking for task execution):"
echo "----------------------------------------------------------------"
docker-compose logs celery_worker --tail=50 | grep -A 5 -B 5 -E "(V2|prepare_campaign|ERROR|Traceback|Task.*received)" || echo "No celery task logs found"
echo ""

echo "3️⃣ Redis Check (campaign tasks in queue):"
echo "----------------------------------------------------------------"
docker exec gmail_saas_redis redis-cli KEYS "campaign:*" || echo "Redis error"
echo ""

echo "4️⃣ Check if V2 tasks module is loaded:"
echo "----------------------------------------------------------------"
docker exec gmail_saas_celery_worker celery -A app.celery_app inspect registered | grep -E "(prepare_campaign|resume_campaign|v2)" || echo "V2 tasks not found!"
echo ""

echo "5️⃣ Database: Check campaign status:"
echo "----------------------------------------------------------------"
docker exec gmail_saas_db psql -U gmailsaas -d gmail_saas -c "SELECT id, name, status, prepared_at FROM campaigns ORDER BY id DESC LIMIT 5;" || echo "DB query failed"
echo ""

echo "6️⃣ Check Python imports in backend:"
echo "----------------------------------------------------------------"
docker exec gmail_saas_backend python -c "from app.tasks_v2 import prepare_campaign_redis; print('✅ V2 tasks module loaded successfully')" 2>&1
echo ""

echo "======================================================================"
echo "📋 Quick Diagnosis:"
echo "======================================================================"
echo "If you see:"
echo "  ❌ 'ModuleNotFoundError' or 'ImportError' → V2 tasks not in container"
echo "  ❌ 'V2 tasks not found' → Celery not loading new tasks"
echo "  ❌ No campaign preparation logs → Task not executing"
echo "  ✅ Campaign status 'ready' in DB → Preparation worked!"
echo ""
echo "💡 Solution: Rebuild backend/worker containers to include V2 code"
echo ""

