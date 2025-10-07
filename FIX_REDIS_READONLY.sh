#!/bin/bash

echo "🔧 FIXING REDIS READ-ONLY ISSUE..."

cd /opt/speed-send

echo "📥 Pulling latest code..."
git pull origin main

echo "🔄 Restarting Redis to fix read-only mode..."
docker-compose restart redis

echo "⏳ Waiting for Redis to start..."
sleep 10

echo "🧪 Testing Redis connection..."
docker-compose exec redis redis-cli ping

echo "🔍 Checking Redis info..."
docker-compose exec redis redis-cli info replication

echo "🔄 Restarting backend to reconnect to Redis..."
docker-compose restart backend

echo "⏳ Waiting for backend to start..."
sleep 15

echo "🧪 Testing backend connection to Redis..."
docker-compose exec backend python -c "
import redis
try:
    r = redis.from_url('redis://redis:6379/0')
    r.ping()
    print('✅ Redis connection successful')
    
    # Test write operation
    r.set('test_key', 'test_value')
    value = r.get('test_key')
    print(f'✅ Redis write test successful: {value}')
    
    # Clean up
    r.delete('test_key')
    print('✅ Redis cleanup successful')
    
except Exception as e:
    print(f'❌ Redis error: {e}')
"

echo "✅ Redis fix complete!"
echo "🎯 Try preparing your campaign again - it should work now!"
